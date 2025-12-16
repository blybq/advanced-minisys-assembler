/**
 * 输出格式化器
 * 将机器码格式化为各种输出格式
 */

import { MemoryImage, Byte, REGISTER_NAMES } from '../core/types';

// 输出格式枚举
export enum OutputFormat {
  COE = 'coe',
  HEX = 'hex',
  BIN = 'bin',
  JSON = 'json'
}

// 格式化器类
export class Formatter {
  private memoryImage: MemoryImage;

  constructor(memoryImage: MemoryImage) {
    this.memoryImage = memoryImage;
  }

  /**
   * 格式化为COE格式
   */
  public toCOE(): string {
    const lines: string[] = [];
    
    // 指令内存COE文件
    lines.push('memory_initialization_radix = 16;');
    lines.push('memory_initialization_vector =');
    
    const instructionWords = this.bytesToWords(this.memoryImage.instructionMemory);
    const instructionHex = instructionWords.map(word => this.wordToHex(word));
    
    // 填充到16384个32位字 (64KB)
    const totalWords = 16384;
    const paddedHex = [...instructionHex];
    while (paddedHex.length < totalWords) {
      paddedHex.push('00000000');
    }
    
    // 每行1个数据（与原项目格式一致）
    for (let i = 0; i < paddedHex.length; i++) {
      const line = paddedHex[i];
      lines.push(line + (i < paddedHex.length - 1 ? ',' : ';'));
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * 格式化为数据内存COE文件
   */
  public toDataCOE(): string {
    const lines: string[] = [];
    
    lines.push('memory_initialization_radix = 16;');
    lines.push('memory_initialization_vector =');
    
    const dataWords = this.bytesToWords(this.memoryImage.dataMemory);
    const dataHex = dataWords.map(word => this.wordToHex(word));
    
    // 填充到16384个32位字 (64KB)
    const totalWords = 16384;
    const paddedHex = [...dataHex];
    while (paddedHex.length < totalWords) {
      paddedHex.push('00000000');
    }
    
    // 每行1个数据（与原项目格式一致）
    for (let i = 0; i < paddedHex.length; i++) {
      const line = paddedHex[i];
      lines.push(line + (i < paddedHex.length - 1 ? ',' : ';'));
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * 格式化为十六进制格式
   */
  public toHex(): string {
    const lines: string[] = [];
    
    // 指令内存
    lines.push('; Instruction Memory');
    const instructionWords = this.bytesToWords(this.memoryImage.instructionMemory);
    
    for (let i = 0; i < instructionWords.length; i++) {
      const address = i * 4;
      const word = instructionWords[i] || 0;
      lines.push(`${this.wordToHex(address)}: ${this.wordToHex(word)}`);
    }
    
    // 数据内存
    if (this.memoryImage.dataMemory.length > 0) {
      lines.push('\n; Data Memory');
      const dataWords = this.bytesToWords(this.memoryImage.dataMemory);
      
      for (let i = 0; i < dataWords.length; i++) {
        const address = 0x10000 + i * 4; // 数据段起始地址
        const word = dataWords[i] || 0;
        lines.push(`${this.wordToHex(address)}: ${this.wordToHex(word)}`);
      }
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * 格式化为二进制格式
   */
  public toBinary(): string {
    const lines: string[] = [];
    
    // 指令内存
    lines.push('; Instruction Memory (Binary)');
    const instructionWords = this.bytesToWords(this.memoryImage.instructionMemory);
    
    for (let i = 0; i < instructionWords.length; i++) {
      const address = i * 4;
      const word = instructionWords[i] || 0;
      lines.push(`${this.wordToHex(address)}: ${this.wordToBinary(word)}`);
    }
    
    // 数据内存
    if (this.memoryImage.dataMemory.length > 0) {
      lines.push('\n; Data Memory (Binary)');
      const dataWords = this.bytesToWords(this.memoryImage.dataMemory);
      
      for (let i = 0; i < dataWords.length; i++) {
        const address = 0x10000 + i * 4;
        const word = dataWords[i] || 0;
        lines.push(`${this.wordToHex(address)}: ${this.wordToBinary(word)}`);
      }
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * 格式化为JSON格式
   */
  public toJSON(): string {
    const output = {
      metadata: {
        instructionCount: this.memoryImage.instructionCount,
        dataSize: this.memoryImage.dataSize,
        entryPoint: this.memoryImage.entryPoint,
        totalSize: this.memoryImage.instructionMemory.length + this.memoryImage.dataMemory.length
      },
      instructionMemory: {
        size: this.memoryImage.instructionMemory.length,
        data: this.memoryImage.instructionMemory
      },
      dataMemory: {
        size: this.memoryImage.dataMemory.length,
        data: this.memoryImage.dataMemory
      },
      instructionWords: this.bytesToWords(this.memoryImage.instructionMemory),
      dataWords: this.bytesToWords(this.memoryImage.dataMemory)
    };
    
    return JSON.stringify(output, null, 2);
  }

  /**
   * 生成汇编报告
   */
  public generateReport(): string {
    const lines: string[] = [];
    
    lines.push('=== Assembly Report ===');
    lines.push(`Instruction Count: ${this.memoryImage.instructionCount}`);
    lines.push(`Data Size: ${this.memoryImage.dataSize} bytes`);
    lines.push(`Total Memory Usage: ${this.memoryImage.instructionMemory.length + this.memoryImage.dataMemory.length} bytes`);
    lines.push(`Entry Point: 0x${this.memoryImage.entryPoint.toString(16).toUpperCase()}`);
    lines.push('');
    
    // 指令内存统计
    lines.push('Instruction Memory:');
    lines.push(`  Size: ${this.memoryImage.instructionMemory.length} bytes`);
    lines.push(`  Words: ${this.memoryImage.instructionCount}`);
    lines.push('');
    
    // 数据内存统计
    if (this.memoryImage.dataMemory.length > 0) {
      lines.push('Data Memory:');
      lines.push(`  Size: ${this.memoryImage.dataMemory.length} bytes`);
      lines.push(`  Words: ${Math.ceil(this.memoryImage.dataMemory.length / 4)}`);
      lines.push('');
    }
    
    // 内存布局
    lines.push('Memory Layout:');
    lines.push(`  0x00000000 - 0x${(0x00000000 + this.memoryImage.instructionMemory.length - 1).toString(16).toUpperCase()}: Instruction Memory`);
    if (this.memoryImage.dataMemory.length > 0) {
      lines.push(`  0x00010000 - 0x${(0x00010000 + this.memoryImage.dataMemory.length - 1).toString(16).toUpperCase()}: Data Memory`);
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * 生成反汇编代码
   */
  public disassemble(): string {
    const lines: string[] = [];
    
    lines.push('; Disassembled Code');
    lines.push('');
    
    const instructionWords = this.bytesToWords(this.memoryImage.instructionMemory);
    
    for (let i = 0; i < instructionWords.length; i++) {
      const address = i * 4;
      const word = instructionWords[i] || 0;
      const instruction = this.disassembleInstruction(word, address);
      
      lines.push(`${this.wordToHex(address)}: ${this.wordToHex(word)}  ; ${instruction}`);
    }
    
    return lines.join('\n') + '\n';
  }

  /**
   * 反汇编单个指令
   */
  private disassembleInstruction(word: number, address: number): string {
    if (word === 0) {
      return 'nop';
    }

    const opcode = (word >>> 26) & 0x3F;
    const rs = (word >>> 21) & 0x1F;
    const rt = (word >>> 16) & 0x1F;
    const rd = (word >>> 11) & 0x1F;
    const shamt = (word >>> 6) & 0x1F;
    const funct = word & 0x3F;
    const immediate = word & 0xFFFF;
    const target = word & 0x3FFFFFF;

    const rsName = REGISTER_NAMES[rs];
    const rtName = REGISTER_NAMES[rt];
    const rdName = REGISTER_NAMES[rd];

    const signExtend16 = (value: number): number => (value & 0x8000) ? (value | 0xFFFF0000) : value;
    const immediateHex = `0x${(immediate >>> 0).toString(16)}`;

    if (opcode === 0x00) {
      switch (funct) {
        case 0x20: return `add ${rdName}, ${rsName}, ${rtName}`;
        case 0x21: return `addu ${rdName}, ${rsName}, ${rtName}`;
        case 0x22: return `sub ${rdName}, ${rsName}, ${rtName}`;
        case 0x23: return `subu ${rdName}, ${rsName}, ${rtName}`;
        case 0x24: return `and ${rdName}, ${rsName}, ${rtName}`;
        case 0x25: return `or ${rdName}, ${rsName}, ${rtName}`;
        case 0x26: return `xor ${rdName}, ${rsName}, ${rtName}`;
        case 0x27: return `nor ${rdName}, ${rsName}, ${rtName}`;
        case 0x2A: return `slt ${rdName}, ${rsName}, ${rtName}`;
        case 0x2B: return `sltu ${rdName}, ${rsName}, ${rtName}`;
        case 0x00: return shamt === 0 && rd === 0 && rt === 0 ? 'nop' : `sll ${rdName}, ${rtName}, ${shamt}`;
        case 0x02: return `srl ${rdName}, ${rtName}, ${shamt}`;
        case 0x03: return `sra ${rdName}, ${rtName}, ${shamt}`;
        case 0x04: return `sllv ${rdName}, ${rtName}, ${rsName}`;
        case 0x06: return `srlv ${rdName}, ${rtName}, ${rsName}`;
        case 0x07: return `srav ${rdName}, ${rtName}, ${rsName}`;
        case 0x08: return `jr ${rsName}`;
        case 0x09: return `jalr ${rdName}, ${rsName}`;
        case 0x18: return `mult ${rsName}, ${rtName}`;
        case 0x19: return `multu ${rsName}, ${rtName}`;
        case 0x1A: return `div ${rsName}, ${rtName}`;
        case 0x1B: return `divu ${rsName}, ${rtName}`;
        case 0x10: return `mfhi ${rdName}`;
        case 0x12: return `mflo ${rdName}`;
        case 0x11: return `mthi ${rsName}`;
        case 0x13: return `mtlo ${rsName}`;
        case 0x0C: return 'syscall';
        case 0x0D: return 'break';
        default:
          return `unknown_r_type (funct=0x${funct.toString(16)})`;
      }
    }

    if (opcode === 0x02) {
      const jumpTarget = ((address >>> 28) << 28) | (target << 2);
      return `j 0x${jumpTarget.toString(16)}`;
    }

    if (opcode === 0x03) {
      const jumpTarget = ((address >>> 28) << 28) | (target << 2);
      return `jal 0x${jumpTarget.toString(16)}`;
    }

    if (opcode === 0x10) {
      if (word === 0x42000018) {
        return 'eret';
      }
      if (rs === 0x00) {
        return `mfc0 ${rtName}, $${rd}`;
      }
      if (rs === 0x04) {
        return `mtc0 ${rtName}, $${rd}`;
      }
      return `cp0 0x${word.toString(16)}`;
    }

    switch (opcode) {
      case 0x08: return `addi ${rtName}, ${rsName}, ${signExtend16(immediate)}`;
      case 0x09: return `addiu ${rtName}, ${rsName}, ${signExtend16(immediate)}`;
      case 0x0C: return `andi ${rtName}, ${rsName}, ${immediateHex}`;
      case 0x0D: return `ori ${rtName}, ${rsName}, ${immediateHex}`;
      case 0x0E: return `xori ${rtName}, ${rsName}, ${immediateHex}`;
      case 0x0F: return `lui ${rtName}, ${immediateHex}`;
      case 0x0A: return `slti ${rtName}, ${rsName}, ${signExtend16(immediate)}`;
      case 0x0B: return `sltiu ${rtName}, ${rsName}, ${signExtend16(immediate)}`;
      case 0x04: {
        const branchTarget = address + 4 + (signExtend16(immediate) << 2);
        return `beq ${rsName}, ${rtName}, 0x${branchTarget.toString(16)}`;
      }
      case 0x05: {
        const branchTarget = address + 4 + (signExtend16(immediate) << 2);
        return `bne ${rsName}, ${rtName}, 0x${branchTarget.toString(16)}`;
      }
      case 0x06: {
        const branchTarget = address + 4 + (signExtend16(immediate) << 2);
        return `blez ${rsName}, 0x${branchTarget.toString(16)}`;
      }
      case 0x07: {
        const branchTarget = address + 4 + (signExtend16(immediate) << 2);
        return `bgtz ${rsName}, 0x${branchTarget.toString(16)}`;
      }
      case 0x01: {
        const branchTarget = address + 4 + (signExtend16(immediate) << 2);
        if (rt === 0x00) {
          return `bltz ${rsName}, 0x${branchTarget.toString(16)}`;
        } else if (rt === 0x01) {
          return `bgez ${rsName}, 0x${branchTarget.toString(16)}`;
        } else if (rt === 0x10) {
          return `bltzal ${rsName}, 0x${branchTarget.toString(16)}`;
        } else if (rt === 0x11) {
          return `bgezal ${rsName}, 0x${branchTarget.toString(16)}`;
        }
        break;
      }
      case 0x20: return `lb ${rtName}, ${signExtend16(immediate)}(${rsName})`;
      case 0x24: return `lbu ${rtName}, ${signExtend16(immediate)}(${rsName})`;
      case 0x21: return `lh ${rtName}, ${signExtend16(immediate)}(${rsName})`;
      case 0x25: return `lhu ${rtName}, ${signExtend16(immediate)}(${rsName})`;
      case 0x28: return `sb ${rtName}, ${signExtend16(immediate)}(${rsName})`;
      case 0x29: return `sh ${rtName}, ${signExtend16(immediate)}(${rsName})`;
      case 0x23: return `lw ${rtName}, ${signExtend16(immediate)}(${rsName})`;
      case 0x2B: return `sw ${rtName}, ${signExtend16(immediate)}(${rsName})`;
      default:
        return `unknown (opcode=0x${opcode.toString(16)})`;
    }
  }

  /**
   * 将字节数组转换为字数组
   */
  private bytesToWords(bytes: Byte[]): number[] {
    const words: number[] = [];
    
    for (let i = 0; i < bytes.length; i += 4) {
      let word = 0;
      word |= (bytes[i] || 0) << 24;
      word |= (bytes[i + 1] || 0) << 16;
      word |= (bytes[i + 2] || 0) << 8;
      word |= (bytes[i + 3] || 0);
      words.push(word);
    }
    
    return words;
  }

  /**
   * 将32位字转换为十六进制字符串
   */
  private wordToHex(word: number): string {
    // 确保word是32位无符号整数
    const unsignedWord = word >>> 0;
    return unsignedWord.toString(16).toUpperCase().padStart(8, '0');
  }

  /**
   * 将32位字转换为二进制字符串
   */
  private wordToBinary(word: number): string {
    return word.toString(2).padStart(32, '0');
  }
}
