/**
 * 词法分析器
 * 将汇编源代码分解为标记流
 */

import { AssemblyError } from '../core/types';

// 标记类型
export enum TokenType {
  // 关键字
  DATA = 'DATA',
  TEXT = 'TEXT',
  
  // 指令
  INSTRUCTION = 'INSTRUCTION',
  
  // 操作数
  REGISTER = 'REGISTER',
  IMMEDIATE = 'IMMEDIATE',
  LABEL = 'LABEL',
  
  // 分隔符
  COMMA = 'COMMA',
  COLON = 'COLON',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  DOLLAR = 'DOLLAR',
  
  // 数据定义
  DOT_BYTE = 'DOT_BYTE',
  DOT_WORD = 'DOT_WORD',
  DOT_HALF = 'DOT_HALF',
  DOT_ASCII = 'DOT_ASCII',
  DOT_SPACE = 'DOT_SPACE',
  
  // 字面量
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  HEX_NUMBER = 'HEX_NUMBER',
  
  // 其他
  IDENTIFIER = 'IDENTIFIER',
  COMMENT = 'COMMENT',
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  UNKNOWN = 'UNKNOWN'
}

// 标记接口
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  position: number;
}

// 词法分析器类
export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private errors: AssemblyError[] = [];

  constructor(source: string) {
    this.source = source;
  }

  /**
   * 执行词法分析
   */
  public tokenize(): { tokens: Token[]; errors: AssemblyError[] } {
    this.tokens = [];
    this.errors = [];
    this.position = 0;
    this.line = 1;
    this.column = 1;

    while (this.position < this.source.length) {
      const char = this.source[this.position];
      
      if (this.isWhitespace(char)) {
        this.advance();
      } else if (char === '#') {
        this.scanComment();
      } else if (char === '\n') {
        this.addToken(TokenType.NEWLINE, '\n');
        this.advance();
      } else if (char === ',') {
        this.addToken(TokenType.COMMA, ',');
        this.advance();
      } else if (char === ':') {
        this.addToken(TokenType.COLON, ':');
        this.advance();
      } else if (char === '(') {
        this.addToken(TokenType.LPAREN, '(');
        this.advance();
      } else if (char === ')') {
        this.addToken(TokenType.RPAREN, ')');
        this.advance();
      } else if (char === '$') {
        this.addToken(TokenType.DOLLAR, '$');
        this.advance();
      } else if (char === '"') {
        this.scanString();
      } else if (char === '.') {
        this.scanDirective();
      } else if (this.isDigit(char) || (char === '-' && this.position + 1 < this.source.length && this.isDigit(this.source[this.position + 1]))) {
        this.scanNumber();
      } else if (this.isAlpha(char)) {
        this.scanIdentifier();
      } else {
        this.addError(`Unexpected character: ${char}`);
        this.advance();
      }
    }

    this.addToken(TokenType.EOF, '');
    return { tokens: this.tokens, errors: this.errors };
  }

  /**
   * 扫描注释
   */
  private scanComment(): void {
    const start = this.position;
    while (this.position < this.source.length && (this.source[this.position] || '') !== '\n') {
      this.advance();
    }
    const value = this.source.substring(start, this.position);
    this.addToken(TokenType.COMMENT, value);
  }

  /**
   * 扫描字符串
   */
  private scanString(): void {
    const start = this.position;
    this.advance(); // 跳过开始的引号
    
    while (this.position < this.source.length && (this.source[this.position] || '') !== '"') {
      if ((this.source[this.position] || '') === '\\') {
        this.advance(); // 跳过转义字符
      }
      this.advance();
    }
    
    if (this.position >= this.source.length) {
      this.addError('Unterminated string literal');
      return;
    }
    
    this.advance(); // 跳过结束的引号
    const value = this.source.substring(start + 1, this.position - 1);
    this.addToken(TokenType.STRING, value);
  }

  /**
   * 扫描指令
   */
  private scanDirective(): void {
    const start = this.position;
    this.advance(); // 跳过点号
    
    while (this.position < this.source.length && this.isAlphaNumeric(this.source[this.position] || '')) {
      this.advance();
    }
    
    const value = this.source.substring(start, this.position);
    
    switch (value.toLowerCase()) {
      case '.data':
        this.addToken(TokenType.DATA, value);
        break;
      case '.text':
        this.addToken(TokenType.TEXT, value);
        break;
      case '.byte':
        this.addToken(TokenType.DOT_BYTE, value);
        break;
      case '.word':
        this.addToken(TokenType.DOT_WORD, value);
        break;
      case '.half':
        this.addToken(TokenType.DOT_HALF, value);
        break;
      case '.ascii':
        this.addToken(TokenType.DOT_ASCII, value);
        break;
      case '.space':
        this.addToken(TokenType.DOT_SPACE, value);
        break;
      default:
        this.addToken(TokenType.IDENTIFIER, value);
    }
  }

  /**
   * 扫描数字
   */
  private scanNumber(): void {
    const start = this.position;
    let isNegative = false;
    
    // 检查是否为负数
    if ((this.source[this.position] || '') === '-') {
      isNegative = true;
      this.advance();
    }
    
    if ((this.source[this.position] || '') === '0' && 
        this.position + 1 < this.source.length && 
        (this.source[this.position + 1] || '').toLowerCase() === 'x') {
      // 十六进制数字
      this.advance(); // 跳过 '0'
      this.advance(); // 跳过 'x'
      
      while (this.position < this.source.length && this.isHexDigit(this.source[this.position] || '')) {
        this.advance();
      }
      
      let value = this.source.substring(start + (isNegative ? 1 : 0), this.position);
      if (isNegative) {
        value = '-' + value;
      }
      this.addToken(TokenType.HEX_NUMBER, value);
    } else {
      // 十进制数字
      while (this.position < this.source.length && this.isDigit(this.source[this.position] || '')) {
        this.advance();
      }
      
      let value = this.source.substring(start, this.position);
      this.addToken(TokenType.NUMBER, value);
    }
  }

  /**
   * 扫描标识符
   */
  private scanIdentifier(): void {
    const start = this.position;
    
    while (this.position < this.source.length && this.isAlphaNumeric(this.source[this.position] || '')) {
      this.advance();
    }
    
    const value = this.source.substring(start, this.position);
    
    // 检查是否是寄存器
    if (this.isRegister(value)) {
      this.addToken(TokenType.REGISTER, value);
    } else {
      this.addToken(TokenType.IDENTIFIER, value);
    }
  }

  /**
   * 添加标记
   */
  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column,
      position: this.position
    });
  }

  /**
   * 添加错误
   */
  private addError(message: string): void {
    this.errors.push({
      type: 'SYNTAX',
      message,
      lineNumber: this.line,
      column: this.column,
      sourceLine: this.getCurrentLine() || ''
    });
  }

  /**
   * 前进一个字符
   */
  private advance(): void {
    if (this.position < this.source.length) {
      if (this.source[this.position] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }

  /**
   * 获取当前行内容
   */
  private getCurrentLine(): string | undefined {
    const lines = this.source.split('\n');
    return lines[this.line - 1];
  }

  /**
   * 检查字符是否为空白字符
   */
  private isWhitespace(char: string): boolean {
    return (char || '') === ' ' || (char || '') === '\t' || (char || '') === '\r';
  }

  /**
   * 检查字符是否为字母
   */
  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char || '');
  }

  /**
   * 检查字符是否为数字
   */
  private isDigit(char: string): boolean {
    return /[0-9]/.test(char || '');
  }

  /**
   * 检查字符是否为十六进制数字
   */
  private isHexDigit(char: string): boolean {
    return /[0-9a-fA-F]/.test(char || '');
  }

  /**
   * 检查字符是否为字母数字
   */
  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char || '') || this.isDigit(char || '');
  }

  /**
   * 检查标识符是否为寄存器
   */
  private isRegister(identifier: string): boolean {
    const registerNames = [
      'zero', 'at', 'v0', 'v1', 'a0', 'a1', 'a2', 'a3',
      't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7',
      's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7',
      't8', 't9', 'k0', 'k1', 'gp', 'sp', 'fp', 'ra'
    ];
    return registerNames.includes(identifier.toLowerCase());
  }
}
