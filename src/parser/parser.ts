/**
 * 语法分析器
 * 将标记流解析为抽象语法树
 */

import { Token, TokenType, Lexer } from './lexer';
import { 
  Instruction, 
  Operand, 
  OperandType, 
  DataDefinition, 
  Label, 
  Segment, 
  AssemblyContext,
  AssemblyError,
  REGISTER_NAMES
} from '../core/types';
import { INSTRUCTION_LOOKUP } from '../core/instruction-set';

// 解析器类
export class Parser {
  private tokens: Token[] = [];
  private position: number = 0;
  private context: AssemblyContext;
  private errors: AssemblyError[] = [];
  private sourceLines: string[] = [];

  constructor() {
    this.context = {
      segments: new Map(),
      globalLabels: new Map(),
      currentSegment: 'text',
      programCounter: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * 解析汇编源代码
   */
  public parse(source: string): AssemblyContext {
    const lexer = new Lexer(source);
    const { tokens, errors } = lexer.tokenize();
    
    this.tokens = tokens;
    this.position = 0;
    this.sourceLines = source.split(/\r?\n/);
    this.errors = [...errors];
    this.context.errors = [...errors];
    
    // 初始化默认段
    this.initializeDefaultSegments();
    
    // 解析程序
    this.parseProgram();
    
    this.context.errors = [...this.context.errors, ...this.errors];
    return this.context;
  }

  /**
   * 初始化默认段
   */
  private initializeDefaultSegments(): void {
    const textSegment: Segment = {
      name: 'text',
      startAddress: 0x00000000,
      size: 0,
      instructions: [],
      data: [],
      labels: new Map()
    };
    
    const dataSegment: Segment = {
      name: 'data',
      startAddress: 0x00010000,
      size: 0,
      instructions: [],
      data: [],
      labels: new Map()
    };
    
    this.context.segments.set('text', textSegment);
    this.context.segments.set('data', dataSegment);
  }

  /**
   * 解析程序
   */
  private parseProgram(): void {
    while (!this.isAtEnd()) {
      if (this.match(TokenType.DATA)) {
        this.parseDataSegment();
      } else if (this.match(TokenType.TEXT)) {
        this.parseTextSegment();
      } else if (this.match(TokenType.IDENTIFIER)) {
        this.parseLabelOrInstruction();
      } else if (this.match(TokenType.COMMENT)) {
        this.advance(); // 跳过注释
      } else if (this.match(TokenType.NEWLINE)) {
        this.advance(); // 跳过空行
      } else {
        this.addError(`Unexpected token: ${this.peek().value}`);
        this.advance();
      }
    }
  }

  /**
   * 解析数据段
   */
  private parseDataSegment(): void {
    this.context.currentSegment = 'data';
    // 切换到data段时，使用data段的起始地址作为programCounter
    const dataSegment = this.context.segments.get('data')!;
    this.context.programCounter = dataSegment.startAddress;
    this.advance(); // 跳过 .data
    
    // 解析可选的起始地址
    if (this.match(TokenType.HEX_NUMBER)) {
      const addressToken = this.advance();
      const address = this.parseHexNumber(addressToken.value);
      dataSegment.startAddress = address;
      this.context.programCounter = address; // 更新programCounter
    }
    
    this.consume(TokenType.NEWLINE, 'Expected newline after .data directive');
    
    // 解析数据定义
    while (!this.isAtEnd() && !this.match(TokenType.TEXT)) {
      if (this.match(TokenType.IDENTIFIER)) {
        this.parseDataDefinition();
      } else if (this.match(TokenType.DOT_BYTE) || this.match(TokenType.DOT_WORD) || 
                 this.match(TokenType.DOT_HALF) || this.match(TokenType.DOT_ASCII) || 
                 this.match(TokenType.DOT_SPACE)) {
        this.parseDataDefinitionWithoutLabel();
      } else if (this.match(TokenType.COMMENT)) {
        this.advance();
      } else if (this.match(TokenType.NEWLINE)) {
        this.advance();
      } else {
        this.addError(`Unexpected token in data segment: ${this.peek().value}`);
        this.advance();
      }
    }
  }

  /**
   * 解析文本段
   */
  private parseTextSegment(): void {
    this.context.currentSegment = 'text';
    // 切换到text段时，重置programCounter为text段的起始地址（通常是0）
    // 这样.data段的数据定义不会影响.text段的标签地址
    const textSegment = this.context.segments.get('text')!;
    this.context.programCounter = textSegment.startAddress;
    this.advance(); // 跳过 .text
    this.consume(TokenType.NEWLINE, 'Expected newline after .text directive');
    
    // 解析指令和标签
    while (!this.isAtEnd()) {
      if (this.match(TokenType.IDENTIFIER)) {
        this.parseLabelOrInstruction();
      } else if (this.match(TokenType.COMMENT)) {
        this.advance();
      } else if (this.match(TokenType.NEWLINE)) {
        this.advance();
      } else {
        this.addError(`Unexpected token in text segment: ${this.peek().value}`);
        this.advance();
      }
    }
  }

  /**
   * 解析标签或指令
   */
  private parseLabelOrInstruction(): void {
    const identifier = this.advance();
    
    if (this.match(TokenType.COLON)) {
      // 这是一个标签
      this.advance(); // 跳过冒号
      this.parseLabel(identifier.value);
    } else {
      // 这是一个指令
      this.parseInstruction(identifier.value);
    }
  }

  /**
   * 解析标签
   */
  private parseLabel(name: string): void {
    const label: Label = {
      name,
      address: this.context.programCounter,
      lineNumber: this.peek().line,
      isGlobal: false
    };
    
    const currentSegment = this.context.segments.get(this.context.currentSegment)!;
    currentSegment.labels.set(name, label);
    this.context.globalLabels.set(name, label);
  }

  /**
   * 解析指令
   */
  private parseInstruction(mnemonic: string): void {
    const operands: Operand[] = [];
    
    // 特殊处理内存访问指令
    if (this.isMemoryAccessInstruction(mnemonic)) {
      this.parseMemoryAccessInstruction(mnemonic, operands);
    } else {
      // 解析操作数
      while (!this.match(TokenType.NEWLINE) && !this.match(TokenType.COMMENT) && !this.isAtEnd()) {
        if (this.match(TokenType.COMMA)) {
          this.advance(); // 跳过逗号
          continue;
        }
        
        const operand = this.parseOperand();
        if (operand) {
          operands.push(operand);
        }
      }
    }
    
    // 创建指令
    const instruction: Instruction = {
      mnemonic,
      operands,
      type: this.getInstructionType(mnemonic),
      opcode: 0,
      lineNumber: this.peek().line,
      sourceLine: this.getCurrentLine(),
      address: this.context.programCounter // 设置指令地址
    };
    
    // 添加到当前段
    const currentSegment = this.context.segments.get(this.context.currentSegment)!;
    currentSegment.instructions.push(instruction);
    
    // 更新程序计数器
    this.context.programCounter += 4;
    
    // 跳过换行符
    if (this.match(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  /**
   * 检查是否为内存访问指令
   */
  private isMemoryAccessInstruction(mnemonic: string): boolean {
    const memoryInstructions = ['lw', 'sw', 'lb', 'sb', 'lh', 'sh', 'lbu', 'lhu'];
    return memoryInstructions.includes(mnemonic);
  }

  /**
   * 解析内存访问指令
   */
  private parseMemoryAccessInstruction(mnemonic: string, operands: Operand[]): void {
    // 内存访问指令格式: rt, offset(rs)
    // 解析第一个操作数 (rt)
    if (this.match(TokenType.DOLLAR)) {
      const rt = this.parseRegister();
      operands.push(rt);
    } else {
      this.addError(`Expected register for ${mnemonic} instruction`);
      return;
    }
    
    // 跳过逗号
    if (this.match(TokenType.COMMA)) {
      this.advance();
    }
    
    // 解析第二个操作数 (offset(rs))
    const address = this.parseMemoryAddress();
    if (address) {
      operands.push(address);
    }
  }

  /**
   * 解析操作数
   */
  private parseOperand(): Operand | null {
    if (this.match(TokenType.DOLLAR)) {
      return this.parseRegister();
    } else if (this.match(TokenType.NUMBER) || this.match(TokenType.HEX_NUMBER)) {
      return this.parseImmediate();
    } else if (this.match(TokenType.IDENTIFIER)) {
      return this.parseLabelReference();
    } else if (this.match(TokenType.LPAREN)) {
      return this.parseMemoryAddress();
    }
    
    this.addError(`Unexpected operand: ${this.peek().value}`);
    return null;
  }

  /**
   * 解析寄存器
   */
  private parseRegister(): Operand {
    this.advance(); // 跳过 $
    
    if (this.match(TokenType.REGISTER)) {
      const registerToken = this.advance();
      const registerIndex = this.getRegisterIndex(registerToken.value);
      
      return {
        type: OperandType.REGISTER,
        value: registerToken.value,
        register: registerIndex
      };
    } else if (this.match(TokenType.NUMBER)) {
      const numberToken = this.advance();
      const registerIndex = parseInt(numberToken.value);
      
      return {
        type: OperandType.REGISTER,
        value: `$${registerIndex}`,
        register: registerIndex
      };
    }
    
    this.addError(`Invalid register: ${this.peek().value}`);
    return {
      type: OperandType.REGISTER,
      value: '$0',
      register: 0
    };
  }

  /**
   * 解析立即数
   */
  private parseImmediate(): Operand {
    const token = this.advance();
    let value: number;
    
    if (token.type === TokenType.HEX_NUMBER) {
      value = this.parseHexNumber(token.value);
    } else {
      value = parseInt(token.value);
    }
    
    return {
      type: OperandType.IMMEDIATE,
      value: token.value,
      immediate: value
    };
  }

  /**
   * 解析标签引用
   */
  private parseLabelReference(): Operand {
    const token = this.advance();
    
    return {
      type: OperandType.LABEL,
      value: token.value,
      label: token.value
    };
  }

  /**
   * 解析内存地址
   */
  private parseMemoryAddress(): Operand {
    // 解析offset (可以是数字或标签)
    let offset = 0;
    let offsetValue = '0';
    
    if (this.match(TokenType.NUMBER) || this.match(TokenType.HEX_NUMBER)) {
      const offsetToken = this.advance();
      offsetValue = offsetToken.value;
      if (offsetToken.type === TokenType.HEX_NUMBER) {
        offset = this.parseHexNumber(offsetToken.value);
      } else {
        offset = parseInt(offsetToken.value);
      }
    } else if (this.match(TokenType.IDENTIFIER)) {
      // 标签作为offset
      const labelToken = this.advance();
      offsetValue = labelToken.value;
      // 对于标签，offset将在链接阶段解析
      offset = 0; // 临时值
    }
    
    // 跳过左括号
    this.consume(TokenType.LPAREN, 'Expected ( after offset');
    
    // 解析寄存器
    this.consume(TokenType.DOLLAR, 'Expected $ before register');
    const registerToken = this.advance();
    const registerIndex = this.getRegisterIndex(registerToken.value);
    
    // 跳过右括号
    this.consume(TokenType.RPAREN, 'Expected ) after register');
    
    return {
      type: OperandType.ADDRESS,
      value: `${offsetValue}($${registerToken.value})`,
      register: registerIndex,
      offset: offset,
      label: offsetValue // 如果是标签，保存标签名
    };
  }

  /**
   * 解析没有标签的数据定义
   */
  private parseDataDefinitionWithoutLabel(): void {
    // 解析数据类型
    let dataType: 'byte' | 'word' | 'half' | 'ascii' | 'space';
    
    if (this.match(TokenType.DOT_BYTE)) {
      dataType = 'byte';
    } else if (this.match(TokenType.DOT_WORD)) {
      dataType = 'word';
    } else if (this.match(TokenType.DOT_HALF)) {
      dataType = 'half';
    } else if (this.match(TokenType.DOT_ASCII)) {
      dataType = 'ascii';
    } else if (this.match(TokenType.DOT_SPACE)) {
      dataType = 'space';
    } else {
      this.addError(`Expected data type directive`);
      return;
    }
    
    this.advance(); // 跳过数据类型
    
    // 解析数据值
    const values: (number | string)[] = [];
    
    while (!this.match(TokenType.NEWLINE) && !this.match(TokenType.COMMENT) && !this.isAtEnd()) {
      if (this.match(TokenType.COMMA)) {
        this.advance();
        continue;
      }
      
      if (this.match(TokenType.STRING)) {
        const stringToken = this.advance();
        values.push(stringToken.value);
      } else if (this.match(TokenType.IDENTIFIER)) {
        // 处理字符串字面量（没有引号的）
        const identifierToken = this.advance();
        values.push(identifierToken.value);
      } else if (this.match(TokenType.NUMBER) || this.match(TokenType.HEX_NUMBER)) {
        const numberToken = this.advance();
        if (numberToken.type === TokenType.HEX_NUMBER) {
          values.push(this.parseHexNumber(numberToken.value));
        } else {
          values.push(parseInt(numberToken.value));
        }
      } else {
        this.addError(`Unexpected data value: ${this.peek().value}`);
        this.advance();
      }
    }
    
    // 创建数据定义
    const dataDefinition: DataDefinition = {
      type: dataType,
      values,
      address: this.context.programCounter,
      size: this.calculateDataSize(dataType, values)
    };
    
    // 添加到数据段
    const dataSegment = this.context.segments.get('data')!;
    dataSegment.data.push(dataDefinition);
    
    // 更新程序计数器
    this.context.programCounter += dataDefinition.size;
    
    // 跳过换行符
    if (this.match(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  /**
   * 解析数据定义
   */
  private parseDataDefinition(): void {
    const nameToken = this.advance();
    this.consume(TokenType.COLON, 'Expected : after label name');
    
    // 解析数据类型
    let dataType: 'byte' | 'word' | 'half' | 'ascii' | 'space';
    
    if (this.match(TokenType.DOT_BYTE)) {
      dataType = 'byte';
    } else if (this.match(TokenType.DOT_WORD)) {
      dataType = 'word';
    } else if (this.match(TokenType.DOT_HALF)) {
      dataType = 'half';
    } else if (this.match(TokenType.DOT_ASCII)) {
      dataType = 'ascii';
    } else if (this.match(TokenType.DOT_SPACE)) {
      dataType = 'space';
    } else {
      this.addError(`Expected data type directive`);
      return;
    }
    
    this.advance(); // 跳过数据类型
    
    // 解析数据值
    const values: (number | string)[] = [];
    
    while (!this.match(TokenType.NEWLINE) && !this.match(TokenType.COMMENT) && !this.isAtEnd()) {
      if (this.match(TokenType.COMMA)) {
        this.advance();
        continue;
      }
      
      if (this.match(TokenType.STRING)) {
        const stringToken = this.advance();
        values.push(stringToken.value);
      } else if (this.match(TokenType.IDENTIFIER)) {
        // 处理字符串字面量（没有引号的）
        const identifierToken = this.advance();
        values.push(identifierToken.value);
      } else if (this.match(TokenType.NUMBER) || this.match(TokenType.HEX_NUMBER)) {
        const numberToken = this.advance();
        if (numberToken.type === TokenType.HEX_NUMBER) {
          values.push(this.parseHexNumber(numberToken.value));
        } else {
          values.push(parseInt(numberToken.value));
        }
      } else {
        this.addError(`Unexpected data value: ${this.peek().value}`);
        this.advance();
      }
    }
    
    // 创建数据定义
    const dataDefinition: DataDefinition = {
      type: dataType,
      values,
      address: this.context.programCounter,
      size: this.calculateDataSize(dataType, values)
    };
    
    // 创建标签
    const label: Label = {
      name: nameToken.value,
      address: this.context.programCounter,
      lineNumber: nameToken.line,
      isGlobal: true
    };
    
    // 添加到数据段
    const dataSegment = this.context.segments.get('data')!;
    dataSegment.data.push(dataDefinition);
    dataSegment.labels.set(nameToken.value, label);
    
    // 添加到全局标签表
    this.context.globalLabels.set(nameToken.value, label);
    
    // 更新程序计数器
    this.context.programCounter += dataDefinition.size;
    
    // 跳过换行符
    if (this.match(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  /**
   * 计算数据大小
   */
  private calculateDataSize(type: string, values: (number | string)[]): number {
    switch (type) {
      case 'byte':
        return values.length;
      case 'half':
        return values.length * 2;
      case 'word':
        return values.length * 4;
      case 'ascii':
        let totalSize = 0;
        for (const value of values) {
          const str = (value as string) || '';
          totalSize += str.length;
        }
        return totalSize;
      case 'space':
        return values.length > 0 ? (values[0] as number) : 0;
      default:
        return 0;
    }
  }

  /**
   * 获取指令类型
   */
  private getInstructionType(mnemonic: string): any {
    const instruction = INSTRUCTION_LOOKUP.get(mnemonic);
    return instruction ? instruction.type : 'UNKNOWN';
  }

  /**
   * 获取寄存器索引
   */
  private getRegisterIndex(registerName: string): number {
    const name = registerName.toLowerCase();
    for (const [index, regName] of REGISTER_NAMES.entries()) {
      if (regName === name) {
        return index;
      }
    }
    return 0; // 默认返回 $zero
  }

  /**
   * 解析十六进制数字
   */
  private parseHexNumber(hexString: string): number {
    return parseInt(hexString, 16);
  }

  /**
   * 获取当前行内容
   */
  private getCurrentLine(): string {
    const lineNumber = this.peek().line;
    if (lineNumber <= 0 || lineNumber > this.sourceLines.length) {
      return '';
    }
    return this.sourceLines[lineNumber - 1] ?? '';
  }

  /**
   * 检查是否到达末尾
   */
  private isAtEnd(): boolean {
    return this.position >= this.tokens.length || this.peek().type === TokenType.EOF;
  }

  /**
   * 查看当前标记
   */
  private peek(): Token {
    const token = this.tokens[this.position];
    return token || { type: TokenType.EOF, value: '', line: 0, column: 0, position: 0 };
  }

  /**
   * 前进并返回当前标记
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.position++;
    }
    return this.tokens[this.position - 1];
  }

  /**
   * 检查当前标记是否匹配指定类型
   */
  private match(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  /**
   * 消费指定类型的标记
   */
  private consume(type: TokenType, message: string): Token {
    if (this.match(type)) {
      return this.advance();
    }
    this.addError(message);
    const token = this.peek();
    return token || { type: TokenType.EOF, value: '', line: 0, column: 0, position: 0 };
  }

  /**
   * 添加错误
   */
  private addError(message: string): void {
    this.errors.push({
      type: 'SYNTAX',
      message,
      lineNumber: this.peek().line,
      column: this.peek().column,
      sourceLine: this.getCurrentLine()
    });
  }
}
