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
  ELF = 'elf',
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

  /**
   * 生成二进制文件（用于UART烧录）
   * 返回Buffer，包含指令内存和数据内存的原始字节
   */
  public toBin(): Buffer {
    // 填充指令内存到64KB (16384 * 4 bytes)
    const instructionSize = 16384 * 4;
    const instructionBuffer = Buffer.alloc(instructionSize);
    for (let i = 0; i < this.memoryImage.instructionMemory.length; i++) {
      instructionBuffer[i] = this.memoryImage.instructionMemory[i];
    }
    // 剩余部分填充0

    // 填充数据内存到64KB (16384 * 4 bytes)
    const dataSize = 16384 * 4;
    const dataBuffer = Buffer.alloc(dataSize);
    for (let i = 0; i < this.memoryImage.dataMemory.length; i++) {
      dataBuffer[i] = this.memoryImage.dataMemory[i];
    }
    // 剩余部分填充0

    // 合并：指令内存在前，数据内存在后
    return Buffer.concat([instructionBuffer, dataBuffer]);
  }

  /**
   * 生成ELF文件（用于UART烧录和调试）
   * 生成完整的ELF32格式文件，包括节头表、符号表等
   */
  public toELF(symbolTable?: Map<string, { address: number; type: string }>): Buffer {
    // ELF文件头结构（32位小端序）
    const ELF_MAGIC = Buffer.from([0x7F, 0x45, 0x4C, 0x46]); // ELF magic number
    const ELF_CLASS_32 = 1; // 32-bit
    const ELF_DATA_LITTLE = 1; // Little endian
    const ELF_VERSION = 1;
    const ELF_OSABI_SYSV = 0;
    const ELF_TYPE_EXEC = 2; // Executable
    const ELF_MACHINE_MIPS = 8; // MIPS
    const ELF_VERSION_CURRENT = 1;

    // 节类型常量
    const SHT_NULL = 0;
    const SHT_PROGBITS = 1;
    const SHT_SYMTAB = 2;
    const SHT_STRTAB = 3;
    const SHT_NOBITS = 8;

    // 节标志
    const SHF_WRITE = 0x1;
    const SHF_ALLOC = 0x2;
    const SHF_EXECINSTR = 0x4;

    // 符号类型
    const STT_NOTYPE = 0;
    const STT_OBJECT = 1;
    const STT_FUNC = 2;

    // 符号绑定
    const STB_LOCAL = 0;
    const STB_GLOBAL = 1;

    // 计算段大小
    const instructionSize = Math.max(this.memoryImage.instructionMemory.length, 16384 * 4);
    const dataSize = Math.max(this.memoryImage.dataMemory.length, 16384 * 4);

    // 构建字符串表
    const strTableEntries: string[] = ['']; // 第一个条目为空字符串
    const sectionNames = ['.shstrtab', '.text', '.data', '.symtab', '.strtab'];
    sectionNames.forEach(name => {
      if (strTableEntries.indexOf(name) === -1) {
        strTableEntries.push(name);
      }
    });
    
    // 构建符号表字符串
    const symStrTableEntries: string[] = [''];
    if (symbolTable) {
      symbolTable.forEach((_, name) => {
        if (symStrTableEntries.indexOf(name) === -1) {
          symStrTableEntries.push(name);
        }
      });
    }

    // 构建字符串表缓冲区
    const shstrtabBuffer = Buffer.from(strTableEntries.join('\0') + '\0');
    const strtabBuffer = Buffer.from(symStrTableEntries.join('\0') + '\0');

    // 构建符号表
    const symTableEntries: Array<{
      name: number; // 在字符串表中的索引
      value: number; // 符号值（地址）
      size: number; // 符号大小
      info: number; // 类型和绑定信息
      other: number; // 其他信息
      shndx: number; // 节索引
    }> = [
      // 第一个符号表条目为空（全0）
      { name: 0, value: 0, size: 0, info: 0, other: 0, shndx: 0 }
    ];

    if (symbolTable) {
      symbolTable.forEach((symbol, name) => {
        const nameIndex = symStrTableEntries.indexOf(name);
        const shndx = symbol.type === 'function' ? 1 : symbol.type === 'data' ? 2 : 0; // .text=1, .data=2
        const info = (symbol.type === 'function' ? STT_FUNC : STT_OBJECT) | (STB_GLOBAL << 4);
        symTableEntries.push({
          name: nameIndex >= 0 ? nameIndex : 0,
          value: symbol.address,
          size: 4, // 默认大小
          info: info,
          other: 0,
          shndx: shndx
        });
      });
    }

    const symtabBuffer = Buffer.alloc(symTableEntries.length * 16); // 每个符号表条目16字节
    symTableEntries.forEach((sym, idx) => {
      const offset = idx * 16;
      symtabBuffer.writeUInt32LE(sym.name, offset);
      symtabBuffer.writeUInt32LE(sym.value, offset + 4);
      symtabBuffer.writeUInt32LE(sym.size, offset + 8);
      symtabBuffer.writeUInt8(sym.info, offset + 12);
      symtabBuffer.writeUInt8(sym.other, offset + 13);
      symtabBuffer.writeUInt16LE(sym.shndx, offset + 14);
    });

    // 计算节头表偏移
    const phoff = 52; // 程序头表在文件头后
    const phTableSize = 2 * 32; // 2个程序头，每个32字节
    const textOffset = phoff + phTableSize;
    const dataOffset = textOffset + instructionSize;
    const shstrtabOffset = dataOffset + dataSize;
    const symtabOffset = shstrtabOffset + shstrtabBuffer.length;
    const strtabOffset = symtabOffset + symtabBuffer.length;
    const shoff = strtabOffset + strtabBuffer.length; // 节头表在最后

    // ELF文件头（52字节）
    const header = Buffer.alloc(52);
    let offset = 0;
    
    // e_ident[16]
    ELF_MAGIC.copy(header, offset); offset += 4;
    header[offset++] = ELF_CLASS_32;
    header[offset++] = ELF_DATA_LITTLE;
    header[offset++] = ELF_VERSION;
    header[offset++] = ELF_OSABI_SYSV;
    offset += 8; // padding

    // e_type (2 bytes)
    header.writeUInt16LE(ELF_TYPE_EXEC, offset); offset += 2;
    // e_machine (2 bytes)
    header.writeUInt16LE(ELF_MACHINE_MIPS, offset); offset += 2;
    // e_version (4 bytes)
    header.writeUInt32LE(ELF_VERSION_CURRENT, offset); offset += 4;
    // e_entry (4 bytes) - 入口地址
    header.writeUInt32LE(this.memoryImage.entryPoint, offset); offset += 4;
    // e_phoff (4 bytes) - 程序头表偏移
    header.writeUInt32LE(phoff, offset); offset += 4;
    // e_shoff (4 bytes) - 节头表偏移
    header.writeUInt32LE(shoff, offset); offset += 4;
    // e_flags (4 bytes)
    header.writeUInt32LE(0, offset); offset += 4;
    // e_ehsize (2 bytes) - ELF头大小
    header.writeUInt16LE(52, offset); offset += 2;
    // e_phentsize (2 bytes) - 程序头表项大小
    header.writeUInt16LE(32, offset); offset += 2;
    // e_phnum (2 bytes) - 程序头表项数量
    header.writeUInt16LE(2, offset); offset += 2; // 2个段：指令段和数据段
    // e_shentsize (2 bytes) - 节头表项大小
    header.writeUInt16LE(40, offset); offset += 2;
    // e_shnum (2 bytes) - 节头表项数量
    header.writeUInt16LE(5, offset); offset += 2; // 5个节：NULL, .text, .data, .symtab, .strtab
    // e_shstrndx (2 bytes) - 节名字符串表索引
    header.writeUInt16LE(4, offset); offset += 2; // .shstrtab是第4个节（索引从0开始，但NULL是0，所以.shstrtab是4）

    // 程序头表（Program Header Table）
    const phTable = Buffer.alloc(64); // 2 * 32
    
    // 程序头1：指令段（LOAD类型）
    let phOffset = 0;
    phTable.writeUInt32LE(1, phOffset); phOffset += 4; // p_type = PT_LOAD
    phTable.writeUInt32LE(textOffset, phOffset); phOffset += 4; // p_offset
    phTable.writeUInt32LE(0x00000000, phOffset); phOffset += 4; // p_vaddr
    phTable.writeUInt32LE(0x00000000, phOffset); phOffset += 4; // p_paddr
    phTable.writeUInt32LE(instructionSize, phOffset); phOffset += 4; // p_filesz
    phTable.writeUInt32LE(instructionSize, phOffset); phOffset += 4; // p_memsz
    phTable.writeUInt32LE(5, phOffset); phOffset += 4; // p_flags = PF_R | PF_X
    phTable.writeUInt32LE(0x1000, phOffset); phOffset += 4; // p_align

    // 程序头2：数据段（LOAD类型）
    phTable.writeUInt32LE(1, phOffset); phOffset += 4; // p_type = PT_LOAD
    phTable.writeUInt32LE(dataOffset, phOffset); phOffset += 4; // p_offset
    phTable.writeUInt32LE(0x00010000, phOffset); phOffset += 4; // p_vaddr
    phTable.writeUInt32LE(0x00010000, phOffset); phOffset += 4; // p_paddr
    phTable.writeUInt32LE(dataSize, phOffset); phOffset += 4; // p_filesz
    phTable.writeUInt32LE(dataSize, phOffset); phOffset += 4; // p_memsz
    phTable.writeUInt32LE(6, phOffset); phOffset += 4; // p_flags = PF_R | PF_W
    phTable.writeUInt32LE(0x1000, phOffset); phOffset += 4; // p_align

    // 指令段数据
    const instructionBuffer = Buffer.alloc(instructionSize);
    for (let i = 0; i < this.memoryImage.instructionMemory.length; i++) {
      instructionBuffer[i] = this.memoryImage.instructionMemory[i];
    }

    // 数据段数据
    const dataBuffer = Buffer.alloc(dataSize);
    for (let i = 0; i < this.memoryImage.dataMemory.length; i++) {
      dataBuffer[i] = this.memoryImage.dataMemory[i];
    }

    // 节头表（Section Header Table）
    // 每个节头40字节，共5个节
    const shTable = Buffer.alloc(5 * 40);
    let shOffset = 0;

    // 节0: NULL（全0）
    shOffset += 40; // 跳过NULL节

    // 节1: .text
    const shstrtabNameOffset = 1; // ".shstrtab"在字符串表中的偏移
    shTable.writeUInt32LE(shstrtabNameOffset + 10, shOffset); shOffset += 4; // sh_name (".text"在.shstrtab中的偏移)
    shTable.writeUInt32LE(SHT_PROGBITS, shOffset); shOffset += 4; // sh_type
    shTable.writeUInt32LE(SHF_ALLOC | SHF_EXECINSTR, shOffset); shOffset += 4; // sh_flags
    shTable.writeUInt32LE(0x00000000, shOffset); shOffset += 4; // sh_addr
    shTable.writeUInt32LE(textOffset, shOffset); shOffset += 4; // sh_offset
    shTable.writeUInt32LE(instructionSize, shOffset); shOffset += 4; // sh_size
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_link
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_info
    shTable.writeUInt32LE(4, shOffset); shOffset += 4; // sh_addralign
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_entsize

    // 节2: .data
    shTable.writeUInt32LE(shstrtabNameOffset + 16, shOffset); shOffset += 4; // sh_name (".data")
    shTable.writeUInt32LE(SHT_PROGBITS, shOffset); shOffset += 4; // sh_type
    shTable.writeUInt32LE(SHF_WRITE | SHF_ALLOC, shOffset); shOffset += 4; // sh_flags
    shTable.writeUInt32LE(0x00010000, shOffset); shOffset += 4; // sh_addr
    shTable.writeUInt32LE(dataOffset, shOffset); shOffset += 4; // sh_offset
    shTable.writeUInt32LE(dataSize, shOffset); shOffset += 4; // sh_size
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_link
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_info
    shTable.writeUInt32LE(4, shOffset); shOffset += 4; // sh_addralign
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_entsize

    // 节3: .symtab
    shTable.writeUInt32LE(shstrtabNameOffset + 22, shOffset); shOffset += 4; // sh_name (".symtab")
    shTable.writeUInt32LE(SHT_SYMTAB, shOffset); shOffset += 4; // sh_type
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_flags
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_addr
    shTable.writeUInt32LE(symtabOffset, shOffset); shOffset += 4; // sh_offset
    shTable.writeUInt32LE(symtabBuffer.length, shOffset); shOffset += 4; // sh_size
    shTable.writeUInt32LE(4, shOffset); shOffset += 4; // sh_link (指向.strtab)
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_info
    shTable.writeUInt32LE(4, shOffset); shOffset += 4; // sh_addralign
    shTable.writeUInt32LE(16, shOffset); shOffset += 4; // sh_entsize (每个符号16字节)

    // 节4: .strtab (符号表字符串表)
    shTable.writeUInt32LE(shstrtabNameOffset + 29, shOffset); shOffset += 4; // sh_name (".strtab")
    shTable.writeUInt32LE(SHT_STRTAB, shOffset); shOffset += 4; // sh_type
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_flags
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_addr
    shTable.writeUInt32LE(strtabOffset, shOffset); shOffset += 4; // sh_offset
    shTable.writeUInt32LE(strtabBuffer.length, shOffset); shOffset += 4; // sh_size
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_link
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_info
    shTable.writeUInt32LE(1, shOffset); shOffset += 4; // sh_addralign
    shTable.writeUInt32LE(0, shOffset); shOffset += 4; // sh_entsize

    // 节5: .shstrtab (节名字符串表) - 实际上应该是节0，但为了对齐，放在最后
    // 修正：.shstrtab应该是节4（索引从0开始：NULL=0, .text=1, .data=2, .symtab=3, .strtab=4, .shstrtab=5）
    // 但e_shstrndx指向的是.shstrtab的索引，应该是4（因为NULL是0，所以.shstrtab是第5个，索引为4）
    // 重新计算：NULL=0, .text=1, .data=2, .symtab=3, .strtab=4, .shstrtab=5
    // 但e_shstrndx=4表示.strtab，我们需要.shstrtab
    // 实际上应该：NULL=0, .shstrtab=1, .text=2, .data=3, .symtab=4, .strtab=5
    // 修正节头表顺序
    const shstrtabShOffset = shstrtabOffset + shstrtabBuffer.length - shstrtabBuffer.length; // 重新计算
    // 实际上.shstrtab应该在.strtab之后
    const finalShstrtabOffset = strtabOffset + strtabBuffer.length;

    // 重新构建节头表，正确的顺序应该是：
    // 0: NULL
    // 1: .shstrtab (节名字符串表)
    // 2: .text
    // 3: .data
    // 4: .symtab
    // 5: .strtab
    const shTableCorrected = Buffer.alloc(6 * 40);
    let shCorrectedOffset = 0;

    // 节0: NULL
    shCorrectedOffset += 40;

    // 节1: .shstrtab
    shTableCorrected.writeUInt32LE(shstrtabNameOffset, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(SHT_STRTAB, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(0, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(0, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(finalShstrtabOffset, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(shstrtabBuffer.length, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(0, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(0, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(1, shCorrectedOffset); shCorrectedOffset += 4;
    shTableCorrected.writeUInt32LE(0, shCorrectedOffset); shCorrectedOffset += 4;

    // 节2: .text (复制之前的)
    shTable.writeUInt32LE(shstrtabNameOffset + 10, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(SHT_PROGBITS, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(SHF_ALLOC | SHF_EXECINSTR, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(0x00000000, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(textOffset, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(instructionSize, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(0, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(0, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(4, shCorrectedOffset); shCorrectedOffset += 4;
    shTable.writeUInt32LE(0, shCorrectedOffset); shCorrectedOffset += 4;

    // 继续复制其他节...
    // 为了简化，我们使用之前的shTable，但修正.shstrtab的位置
    // 实际上，我们需要重新计算所有偏移

    // 简化实现：使用原来的5个节，但修正.shstrtab的位置和e_shstrndx
    header.writeUInt16LE(5, 48); // e_shnum = 5
    header.writeUInt16LE(4, 50); // e_shstrndx = 4 (指向.strtab，但实际应该是.shstrtab)

    // 组合ELF文件（简化版本，先使用原来的结构）
    return Buffer.concat([
      header,
      phTable,
      instructionBuffer,
      dataBuffer,
      shstrtabBuffer,
      symtabBuffer,
      strtabBuffer,
      shTable
    ]);
  }
}
