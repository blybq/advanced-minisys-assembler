/**
 * 代码生成器
 * 将抽象语法树转换为机器码
 */

import { 
  Instruction, 
  Operand, 
  OperandType, 
  AssemblyContext, 
  MemoryImage, 
  Byte, 
  AssemblyError,
  AssemblyStatistics
} from '../core/types';
import { INSTRUCTION_LOOKUP, PSEUDO_INSTRUCTION_LOOKUP } from '../core/instruction-set';
import { PseudoExpander } from '../expander/pseudo-expander';

interface LabelFixup {
  instructionIndex: number;
  label: string;
  type: 'J' | 'BRANCH';
}

// 编码器类
export class Encoder {
  private context: AssemblyContext;
  private instructionMemory: Byte[] = [];
  private dataMemory: Byte[] = [];
  private errors: AssemblyError[] = [];
  private pseudoExpander: PseudoExpander;
  private currentInstructionIndex: number = 0;
  private labelFixups: LabelFixup[] = [];
  private static readonly BRANCH_MNEMONICS = new Set([
    'beq', 'bne', 'blez', 'bgtz', 'bgez', 'bltz', 'bgezal', 'bltzal'
  ]);

  constructor(context: AssemblyContext) {
    this.context = context;
    this.pseudoExpander = new PseudoExpander();
  }

  /**
   * 生成机器码
   */
  public encode(): { memoryImage: MemoryImage; errors: AssemblyError[]; statistics: AssemblyStatistics } {
    this.instructionMemory = [];
    this.dataMemory = [];
    this.errors = [];
    this.currentInstructionIndex = 0; // 重置指令索引

    const startTime = Date.now();

    this.labelFixups = [];

    // 编码指令
    this.encodeInstructions();
    
    // 编码数据
    this.encodeData();
    
    // 解析标签引用
    this.resolveLabels();
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    const memoryImage: MemoryImage = {
      instructionMemory: this.instructionMemory,
      dataMemory: this.dataMemory,
      instructionCount: this.instructionMemory.length / 4,
      dataSize: this.dataMemory.length,
      entryPoint: 0
    };

    const statistics: AssemblyStatistics = {
      totalInstructions: memoryImage.instructionCount,
      totalDataBytes: memoryImage.dataSize,
      totalLabels: this.context.globalLabels.size,
      processingTime,
      memoryUsage: this.instructionMemory.length + this.dataMemory.length
    };

    return {
      memoryImage,
      errors: this.errors,
      statistics
    };
  }

  /**
   * 编码指令
   */
  private encodeInstructions(): void {
    const textSegment = this.context.segments.get('text');
    if (!textSegment) {
      this.addError('Text segment not found');
      return;
    }

    for (const instruction of textSegment.instructions) {
      try {
        // 检查是否为伪指令
        const expandedInstructions = this.pseudoExpander.expandPseudoInstruction(instruction);
        
        for (const expandedInstruction of expandedInstructions) {
          const encoded = this.encodeInstruction(expandedInstruction);
          this.instructionMemory.push(...encoded);
          this.currentInstructionIndex++;
        }
      } catch (error) {
        this.addError(`Failed to encode instruction: ${instruction.mnemonic} - ${error.message}`, instruction.lineNumber);
      }
    }
  }

  /**
   * 当前正在编码的指令（用于计算分支偏移量）
   */
  private currentInstruction: Instruction | null = null;

  /**
   * 编码单个指令
   */
  private encodeInstruction(_instruction: Instruction): Byte[] {
    this.currentInstruction = _instruction;
    const definition = INSTRUCTION_LOOKUP.get(_instruction.mnemonic);
    
    if (!definition) {
      // 检查是否是伪指令
      const pseudoInstruction = PSEUDO_INSTRUCTION_LOOKUP.get(_instruction.mnemonic);
      if (pseudoInstruction) {
        return this.encodePseudoInstruction(_instruction);
      }
      
      throw new Error(`Unknown instruction: ${_instruction.mnemonic}`);
    }

    switch (definition.type) {
      case 'R_TYPE':
        return this.encodeRTypeInstruction(_instruction, definition);
      case 'I_TYPE':
        // 检查是否是CP0指令
        if (definition.encoding === 'CP0' && _instruction.mnemonic !== 'eret') {
          return this.encodeCP0Instruction(_instruction, definition);
        }
        return this.encodeITypeInstruction(_instruction, definition);
      case 'J_TYPE':
        return this.encodeJTypeInstruction(_instruction, definition);
      case 'SPECIAL':
        // 检查是否是CP0的eret指令
        if (definition.encoding === 'CP0' && _instruction.mnemonic === 'eret') {
          return this.encodeERETInstruction(_instruction, definition);
        }
        return this.encodeSpecialInstruction(_instruction, definition);
      default:
        throw new Error(`Unsupported instruction type: ${definition.type}`);
    }
  }

  /**
   * 编码R型指令
   */
  private encodeRTypeInstruction(instruction: Instruction, definition: any): Byte[] {
    let word = 0;
    
    // 设置操作码
    word |= (definition.opcode & 0x3F) << 26;
    
    // 设置功能码
    if (definition.funct !== undefined) {
      word |= definition.funct & 0x3F;
    }
    
    // 设置操作数
    for (let i = 0; i < definition.operands.length; i++) {
      const operandDef = definition.operands[i];
      const operand = instruction.operands[i];
      
      if (!operand) {
        throw new Error(`Missing operand ${i + 1} for instruction ${instruction.mnemonic}`);
      }
      
      const value = this.getOperandValue(operand, operandDef);
      word |= (value & ((1 << operandDef.bits) - 1)) << operandDef.position;
    }
    
    return this.wordToBytes(word);
  }

  /**
   * 编码I型指令
   */
  private encodeITypeInstruction(instruction: Instruction, definition: any): Byte[] {
    let word = 0;
    
    // 设置操作码
    word |= (definition.opcode & 0x3F) << 26;
    
    // 特殊处理内存访问指令 (lw, sw, lb, sb, lh, sh, lbu, lhu)
    if (this.isMemoryAccessInstruction(instruction.mnemonic)) {
      return this.encodeMemoryAccessInstruction(instruction, definition, word);
    }
    
    const isBranchInstruction = Encoder.BRANCH_MNEMONICS.has(instruction.mnemonic);
    let pendingLabel: string | null = null;

    // 设置操作数
    for (let i = 0; i < definition.operands.length; i++) {
      const operandDef = definition.operands[i];
      const operand = instruction.operands[i];
      
      if (!operand) {
        throw new Error(`Missing operand ${i + 1} for instruction ${instruction.mnemonic}`);
      }
      
      if (operand.type === OperandType.LABEL) {
        if (operandDef.name === 'label' && operand.label) {
          pendingLabel = operand.label;
          continue;
        }

        const labelInfo = operand.label ? this.context.globalLabels.get(operand.label) : undefined;
        if (!labelInfo) {
          throw new Error(`Undefined label: ${operand.label}`);
        }

        const resolvedValue = labelInfo.address;
        word |= (resolvedValue & ((1 << operandDef.bits) - 1)) << operandDef.position;
        continue;
      }

      const value = this.getOperandValue(operand, operandDef);
      word |= (value & ((1 << operandDef.bits) - 1)) << operandDef.position;
    }

    if (isBranchInstruction && pendingLabel) {
      this.labelFixups.push({
        instructionIndex: this.currentInstructionIndex,
        label: pendingLabel,
        type: 'BRANCH'
      });
    }
    
    return this.wordToBytes(word);
  }

  /**
   * 编码J型指令
   */
  private encodeJTypeInstruction(instruction: Instruction, definition: any): Byte[] {
    let word = 0;
    
    // 设置操作码
    word |= (definition.opcode & 0x3F) << 26;
    
    // 设置跳转地址
    const operand = instruction.operands[0];
    if (operand && operand.type === OperandType.LABEL && operand.label) {
      this.labelFixups.push({
        instructionIndex: this.currentInstructionIndex,
        label: operand.label,
        type: 'J'
      });
    } else if (operand && operand.type === OperandType.IMMEDIATE && typeof operand.immediate === 'number') {
      word |= (operand.immediate >>> 0) & 0x3FFFFFF;
    }
    
    return this.wordToBytes(word);
  }

  /**
   * 编码特殊指令
   */
  private encodeSpecialInstruction(instruction: Instruction, definition: any): Byte[] {
    let word = 0;
    
    // 设置操作码
    word |= (definition.opcode & 0x3F) << 26;
    
    // 设置功能码
    if (definition.funct !== undefined) {
      word |= definition.funct & 0x3F;
    }
    
    return this.wordToBytes(word);
  }

  /**
   * 编码CP0指令 (mfc0, mtc0)
   */
  private encodeCP0Instruction(instruction: Instruction, definition: any): Byte[] {
    let word = 0;
    
    // 设置操作码 OP_CP0 = 0x10
    word |= (definition.opcode & 0x3F) << 26;
    
    // 根据指令类型设置rs字段
    let rsValue = 0;
    if (instruction.mnemonic === 'mfc0') {
      rsValue = 0x00; // mfc0使用rs=0x00
    } else if (instruction.mnemonic === 'mtc0') {
      rsValue = 0x04; // mtc0使用rs=0x04
    }
    word |= (rsValue & 0x1F) << 21;
    
    // 设置操作数
    // mfc0/mtc0格式: mfc0 rt, rd 或 mfc0 rt, rd, sel
    // 操作数顺序: [rt, rd, sel(可选)]
    if (instruction.operands.length >= 1) {
      const rt = instruction.operands[0];
      if (rt && rt.type === OperandType.REGISTER) {
        word |= ((rt.register || 0) & 0x1F) << 16;
      }
    }
    
    if (instruction.operands.length >= 2) {
      const rd = instruction.operands[1];
      if (rd && rd.type === OperandType.REGISTER) {
        word |= ((rd.register || 0) & 0x1F) << 11;
      }
    }
    
    // 设置sel字段（可选，默认0）
    if (instruction.operands.length >= 3) {
      const sel = instruction.operands[2];
      if (sel && sel.type === OperandType.IMMEDIATE) {
        word |= (sel.immediate || 0) & 0x07;
      }
    }
    
    return this.wordToBytes(word);
  }

  /**
   * 编码ERET指令
   * eret指令编码: op=0x10, ins[25:0]=0x2000018 (26'b10000000000000000000011000)
   * 26位二进制: 10000000000000000000011000 = 0x2000018
   */
  private encodeERETInstruction(instruction: Instruction, definition: any): Byte[] {
    let word = 0;
    
    // 设置操作码 OP_CP0 = 0x10
    word |= (definition.opcode & 0x3F) << 26;
    
    // eret指令的特殊编码: 低26位必须是0x2000018
    // 即 ins[25:0] = 26'b10000000000000000000011000 = 0x2000018
    word |= 0x2000018;
    
    return this.wordToBytes(word);
  }

  /**
   * 编码伪指令
   */
  private encodePseudoInstruction(_instruction: Instruction): Byte[] {
    const expanded = this.pseudoExpander.expandPseudoInstruction(_instruction);
    if (expanded.length === 0) {
      throw new Error(`Unable to expand pseudo instruction: ${_instruction.mnemonic}`);
    }

    const result: Byte[] = [];
    for (const inst of expanded) {
      result.push(...this.encodeInstruction(inst));
    }
    return result;
  }

  /**
   * 检查是否为内存访问指令
   */
  private isMemoryAccessInstruction(mnemonic: string): boolean {
    const memoryInstructions = ['lw', 'sw', 'lb', 'sb', 'lh', 'sh', 'lbu', 'lhu'];
    return memoryInstructions.includes(mnemonic);
  }

  /**
   * 编码内存访问指令
   */
  private encodeMemoryAccessInstruction(instruction: Instruction, definition: any, word: number): Byte[] {
    // 内存访问指令格式: rt, offset(rs)
    // 操作数: [rt, offset(rs)]
    const rt = instruction.operands[0]; // 第一个操作数是rt
    const address = instruction.operands[1]; // 第二个操作数是offset(rs)
    
    if (!rt || !address) {
      throw new Error(`Missing operands for memory access instruction: ${instruction.mnemonic}`);
    }
    
    if (address.type !== OperandType.ADDRESS) {
      throw new Error(`Second operand must be memory address for ${instruction.mnemonic}, got ${address.type}`);
    }
    
    // 设置rt (位置16-20)
    word |= ((rt.register || 0) & 0x1F) << 16;
    
    // 设置rs (位置21-25)
    word |= ((address.register || 0) & 0x1F) << 21;
    
    // 设置offset (位置0-15)
    let offset = address.offset || 0;
    
    // 如果offset是标签，需要解析标签地址
    if (address.label && address.offset === 0 && !/^\d+$/.test(address.label)) {
      const label = this.context.globalLabels.get(address.label);
      if (label) {
        offset = label.address;
      } else {
        throw new Error(`Undefined label: ${address.label}`);
      }
    }
    
    word |= (offset & 0xFFFF);
    
    return this.wordToBytes(word);
  }

  /**
   * 获取当前指令的地址
   */
  private getCurrentInstructionAddress(): number {
    // 计算当前指令在内存中的地址
    // 假设指令从地址0开始，每个指令4字节
    return this.currentInstructionIndex * 4;
  }

  /**
   * 获取操作数值
   */
  private getOperandValue(operand: Operand, operandDef: any): number {
    switch (operand.type) {
      case OperandType.REGISTER:
        return operand.register || 0;
      case OperandType.IMMEDIATE:
        return operand.immediate || 0;
      case OperandType.LABEL:
        // 计算标签偏移量
        if (operand.label) {
          const label = this.context.globalLabels.get(operand.label);
          if (label) {
            // 计算偏移量：(目标地址 - (指令地址 + 4)) >> 2
            // 使用当前指令的实际地址（解析时设置的）
            const instructionAddress = this.currentInstruction?.address || this.getCurrentInstructionAddress();
            const nextInstructionAddress = instructionAddress + 4;
            const offset = (label.address - nextInstructionAddress) >> 2;
            return offset & 0xFFFF; // 限制在16位范围内
          } else {
            throw new Error(`Undefined label: ${operand.label}`);
          }
        }
        return 0;
      case OperandType.ADDRESS:
        // 对于内存地址，根据操作数定义返回不同的值
        if (operandDef.name === 'offset') {
          return operand.offset || 0;
        } else if (operandDef.name === 'rs') {
          return operand.register || 0;
        }
        return operand.offset || 0;
      default:
        return 0;
    }
  }

  /**
   * 编码数据
   */
  private encodeData(): void {
    const dataSegment = this.context.segments.get('data');
    if (!dataSegment) {
      return;
    }

    for (const dataDef of dataSegment.data) {
      this.encodeDataDefinition(dataDef);
    }
  }

  /**
   * 编码数据定义
   */
  private encodeDataDefinition(dataDef: any): void {
    switch (dataDef.type) {
      case 'byte':
        for (const value of dataDef.values) {
          this.dataMemory.push((value as number) & 0xFF);
        }
        break;
      case 'half':
        for (const value of dataDef.values) {
          const bytes = this.wordToBytes((value as number) || 0);
          this.dataMemory.push(bytes[2], bytes[3]); // 只取低16位
        }
        break;
      case 'word':
        for (const value of dataDef.values) {
          this.dataMemory.push(...this.wordToBytes((value as number) || 0));
        }
        break;
      case 'ascii':
        for (const value of dataDef.values) {
          const str = value as string;
          for (let i = 0; i < str.length; i++) {
            this.dataMemory.push(str.charCodeAt(i) & 0xFF);
          }
        }
        break;
      case 'space':
        const size = (dataDef.values[0] as number) || 0;
        for (let i = 0; i < size; i++) {
          this.dataMemory.push(0);
        }
        break;
    }
  }

  /**
   * 解析标签引用
   */
  private resolveLabels(): void {
    if (this.labelFixups.length === 0) {
      return;
    }

    for (const fixup of this.labelFixups) {
      const labelInfo = this.context.globalLabels.get(fixup.label);
      if (!labelInfo) {
        this.addError(`Undefined label: ${fixup.label}`);
        continue;
      }

      const currentWord = this.readWordAtInstructionIndex(fixup.instructionIndex);
      let patchedWord = currentWord;

      if (fixup.type === 'J') {
        const target = (labelInfo.address >>> 2) & 0x3FFFFFF;
        patchedWord = (currentWord & 0xFC000000) | target;
      } else if (fixup.type === 'BRANCH') {
        const branchAddress = fixup.instructionIndex * 4;
        const offset = ((labelInfo.address - (branchAddress + 4)) >> 2) & 0xFFFF;
        patchedWord = (currentWord & 0xFFFF0000) | (offset & 0xFFFF);
      }

      this.writeWordAtInstructionIndex(fixup.instructionIndex, patchedWord);
    }

    this.labelFixups = [];
  }

  /**
   * 将32位字转换为字节数组
   */
  private wordToBytes(word: number): Byte[] {
    return [
      (word >>> 24) & 0xFF,
      (word >>> 16) & 0xFF,
      (word >>> 8) & 0xFF,
      word & 0xFF
    ];
  }

  /**
   * 添加错误
   */
  private addError(message: string, lineNumber?: number): void {
    this.errors.push({
      type: 'SEMANTIC',
      message,
      lineNumber: lineNumber || 0,
      sourceLine: ''
    });
  }

  private readWordAtInstructionIndex(index: number): number {
    const offset = index * 4;
    const b0 = this.instructionMemory[offset] ?? 0;
    const b1 = this.instructionMemory[offset + 1] ?? 0;
    const b2 = this.instructionMemory[offset + 2] ?? 0;
    const b3 = this.instructionMemory[offset + 3] ?? 0;
    return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
  }

  private writeWordAtInstructionIndex(index: number, word: number): void {
    const offset = index * 4;
    this.instructionMemory[offset] = (word >>> 24) & 0xFF;
    this.instructionMemory[offset + 1] = (word >>> 16) & 0xFF;
    this.instructionMemory[offset + 2] = (word >>> 8) & 0xFF;
    this.instructionMemory[offset + 3] = word & 0xFF;
  }
}
