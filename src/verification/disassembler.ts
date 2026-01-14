/**
 * 基于硬件译码规则的反汇编器
 * 根据硬件项目中的public.v和id.v定义的译码规则，将机器码翻译回汇编代码
 */

import * as fs from 'fs';
import * as path from 'path';

// 指令操作码定义（来自public.v）
const OP_RTYPE = 0x00; // 6'b000000
const OP_ADDI = 0x08; // 6'b001000
const OP_ADDIU = 0x09; // 6'b001001
const OP_ANDI = 0x0c; // 6'b001100
const OP_ORI = 0x0d; // 6'b001101
const OP_XORI = 0x0e; // 6'b001110
const OP_LUI = 0x0f; // 6'b001111
const OP_BEQ = 0x04; // 6'b000100
const OP_BNE = 0x05; // 6'b000101
const OP_BGTZ = 0x07; // 6'b000111
const OP_BLEZ = 0x06; // 6'b000110
const OP_BGEZ = 0x01; // 6'b000001 (rt字段区分)
const OP_BLTZ = 0x01; // 6'b000001 (rt字段区分)
const OP_BGEZAL = 0x01; // 6'b000001 (rt字段区分)
const OP_BLTZAL = 0x01; // 6'b000001 (rt字段区分)
const OP_SLTI = 0x0a; // 6'b001010
const OP_SLTIU = 0x0b; // 6'b001011
const OP_LB = 0x20; // 6'b100000
const OP_LBU = 0x24; // 6'b100100
const OP_LH = 0x21; // 6'b100001
const OP_LHU = 0x25; // 6'b100101
const OP_SB = 0x28; // 6'b101000
const OP_SH = 0x29; // 6'b101001
const OP_LW = 0x23; // 6'b100011
const OP_SW = 0x2b; // 6'b101011
const OP_J = 0x02; // 6'b000010
const OP_JAL = 0x03; // 6'b000011
const OP_CP0 = 0x10; // 6'b010000

// R型指令功能码定义（来自public.v）
const FUNC_ADD = 0x20; // 6'b100000
const FUNC_ADDU = 0x21; // 6'b100001
const FUNC_SUB = 0x22; // 6'b100010
const FUNC_SUBU = 0x23; // 6'b100011
const FUNC_AND = 0x24; // 6'b100100
const FUNC_OR = 0x25; // 6'b100101
const FUNC_XOR = 0x26; // 6'b100110
const FUNC_NOR = 0x27; // 6'b100111
const FUNC_SLT = 0x2a; // 6'b101010
const FUNC_SLTU = 0x2b; // 6'b101011
const FUNC_SLL = 0x00; // 6'b000000
const FUNC_SRL = 0x02; // 6'b000010
const FUNC_SRA = 0x03; // 6'b000011
const FUNC_SLLV = 0x04; // 6'b000100
const FUNC_SRLV = 0x06; // 6'b000110
const FUNC_SRAV = 0x07; // 6'b000111
const FUNC_MULT = 0x18; // 6'b011000
const FUNC_MULTU = 0x19; // 6'b011001
const FUNC_DIV = 0x1a; // 6'b011010
const FUNC_DIVU = 0x1b; // 6'b011011
const FUNC_MFHI = 0x10; // 6'b010000
const FUNC_MFLO = 0x12; // 6'b010010
const FUNC_MTHI = 0x11; // 6'b010001
const FUNC_MTLO = 0x13; // 6'b010011
const FUNC_JR = 0x08; // 6'b001000
const FUNC_JALR = 0x09; // 6'b001001
const FUNC_SYSCALL = 0x0c; // 6'b001100
const FUNC_BREAK = 0x0d; // 6'b001101
const FUNC_ERET = 0x18; // 6'b011000 (在CP0中)

// 寄存器名称
const REGISTER_NAMES = [
  '$zero', '$at', '$v0', '$v1', '$a0', '$a1', '$a2', '$a3',
  '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7',
  '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7',
  '$t8', '$t9', '$k0', '$k1', '$gp', '$sp', '$fp', '$ra'
];

/**
 * 解析32位指令字
 */
function parseInstruction(instruction: number): {
  op: number;
  rs: number;
  rt: number;
  rd: number;
  shamt: number;
  funct: number;
  immediate: number;
  offset: number;
  address: number;
} {
  return {
    op: (instruction >>> 26) & 0x3f,
    rs: (instruction >>> 21) & 0x1f,
    rt: (instruction >>> 16) & 0x1f,
    rd: (instruction >>> 11) & 0x1f,
    shamt: (instruction >>> 6) & 0x1f,
    funct: instruction & 0x3f,
    immediate: instruction & 0xffff,
    offset: instruction & 0xffff,
    address: instruction & 0x3ffffff
  };
}

/**
 * 符号扩展16位立即数
 */
function signExtend16(value: number): number {
  return (value & 0x8000) ? (value | 0xffff0000) : value;
}

/**
 * 将数字转换为十六进制字符串（带符号）
 */
function toHex(value: number, bits: number = 32): string {
  if (bits === 16) {
    const signed = signExtend16(value);
    if (signed < 0) {
      return `-0x${Math.abs(signed).toString(16)}`;
    }
    return `0x${value.toString(16)}`;
  }
  if (value < 0) {
    return `-0x${Math.abs(value).toString(16)}`;
  }
  return `0x${value.toString(16)}`;
}

/**
 * 反汇编单条指令
 */
function disassembleInstruction(instruction: number, address: number): string {
  if (instruction === 0) {
    return 'nop';
  }

  const { op, rs, rt, rd, shamt, funct, immediate, offset, address: addr } = parseInstruction(instruction);
  const rsName = REGISTER_NAMES[rs];
  const rtName = REGISTER_NAMES[rt];
  const rdName = REGISTER_NAMES[rd];

  // R型指令
  if (op === OP_RTYPE) {
    switch (funct) {
      case FUNC_ADD:
        return `add ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_ADDU:
        return `addu ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_SUB:
        return `sub ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_SUBU:
        return `subu ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_AND:
        return `and ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_OR:
        return `or ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_XOR:
        return `xor ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_NOR:
        return `nor ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_SLT:
        return `slt ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_SLTU:
        return `sltu ${rdName}, ${rsName}, ${rtName}`;
      case FUNC_SLL:
        if (rs === 0 && rt === 0 && rd === 0 && shamt === 0) {
          return 'nop';
        }
        return `sll ${rdName}, ${rtName}, ${shamt}`;
      case FUNC_SRL:
        return `srl ${rdName}, ${rtName}, ${shamt}`;
      case FUNC_SRA:
        return `sra ${rdName}, ${rtName}, ${shamt}`;
      case FUNC_SLLV:
        return `sllv ${rdName}, ${rtName}, ${rsName}`;
      case FUNC_SRLV:
        return `srlv ${rdName}, ${rtName}, ${rsName}`;
      case FUNC_SRAV:
        return `srav ${rdName}, ${rtName}, ${rsName}`;
      case FUNC_MULT:
        return `mult ${rsName}, ${rtName}`;
      case FUNC_MULTU:
        return `multu ${rsName}, ${rtName}`;
      case FUNC_DIV:
        return `div ${rsName}, ${rtName}`;
      case FUNC_DIVU:
        return `divu ${rsName}, ${rtName}`;
      case FUNC_MFHI:
        return `mfhi ${rdName}`;
      case FUNC_MFLO:
        return `mflo ${rdName}`;
      case FUNC_MTHI:
        return `mthi ${rsName}`;
      case FUNC_MTLO:
        return `mtlo ${rsName}`;
      case FUNC_JR:
        return `jr ${rsName}`;
      case FUNC_JALR:
        return `jalr ${rdName}, ${rsName}`;
      case FUNC_SYSCALL:
        return 'syscall';
      case FUNC_BREAK:
        return 'break';
      default:
        return `.word 0x${instruction.toString(16).padStart(8, '0')}`;
    }
  }

  // I型指令
  const imm = signExtend16(immediate);
  const immHex = toHex(immediate, 16);

  switch (op) {
    case OP_ADDI:
      return `addi ${rtName}, ${rsName}, ${immHex}`;
    case OP_ADDIU:
      return `addiu ${rtName}, ${rsName}, ${immHex}`;
    case OP_ANDI:
      return `andi ${rtName}, ${rsName}, ${immHex}`;
    case OP_ORI:
      return `ori ${rtName}, ${rsName}, ${immHex}`;
    case OP_XORI:
      return `xori ${rtName}, ${rsName}, ${immHex}`;
    case OP_LUI:
      return `lui ${rtName}, ${immHex}`;
    case OP_SLTI:
      return `slti ${rtName}, ${rsName}, ${immHex}`;
    case OP_SLTIU:
      return `sltiu ${rtName}, ${rsName}, ${immHex}`;
    case OP_BEQ:
      // 计算分支目标地址: PC + 4 + (offset << 2)
      // 注意：原项目使用非标准格式 beq rt, rs, label（与标准MIPS相反）
      const beqTarget = address + 4 + (signExtend16(offset) << 2);
      return `beq ${rtName}, ${rsName}, 0x${beqTarget.toString(16)}`;
    case OP_BNE:
      // 注意：原项目使用非标准格式 bne rt, rs, label（与标准MIPS相反）
      const bneTarget = address + 4 + (signExtend16(offset) << 2);
      return `bne ${rtName}, ${rsName}, 0x${bneTarget.toString(16)}`;
    case OP_BGTZ:
      const bgtzTarget = address + 4 + (signExtend16(offset) << 2);
      return `bgtz ${rsName}, 0x${bgtzTarget.toString(16)}`;
    case OP_BLEZ:
      const blezTarget = address + 4 + (signExtend16(offset) << 2);
      return `blez ${rsName}, 0x${blezTarget.toString(16)}`;
    case OP_BGEZ:
      // 根据rt字段区分bgez, bltz, bgezal, bltzal
      if (rt === 0x01) {
        // bgez
        const bgezTarget = address + 4 + (signExtend16(offset) << 2);
        return `bgez ${rsName}, 0x${bgezTarget.toString(16)}`;
      } else if (rt === 0x00) {
        // bltz
        const bltzTarget = address + 4 + (signExtend16(offset) << 2);
        return `bltz ${rsName}, 0x${bltzTarget.toString(16)}`;
      } else if (rt === 0x11) {
        // bgezal
        const bgezalTarget = address + 4 + (signExtend16(offset) << 2);
        return `bgezal ${rsName}, 0x${bgezalTarget.toString(16)}`;
      } else if (rt === 0x10) {
        // bltzal
        const bltzalTarget = address + 4 + (signExtend16(offset) << 2);
        return `bltzal ${rsName}, 0x${bltzalTarget.toString(16)}`;
      }
      break;
    case OP_LB:
      return `lb ${rtName}, ${immHex}(${rsName})`;
    case OP_LBU:
      return `lbu ${rtName}, ${immHex}(${rsName})`;
    case OP_LH:
      return `lh ${rtName}, ${immHex}(${rsName})`;
    case OP_LHU:
      return `lhu ${rtName}, ${immHex}(${rsName})`;
    case OP_SB:
      return `sb ${rtName}, ${immHex}(${rsName})`;
    case OP_SH:
      return `sh ${rtName}, ${immHex}(${rsName})`;
    case OP_LW:
      return `lw ${rtName}, ${immHex}(${rsName})`;
    case OP_SW:
      return `sw ${rtName}, ${immHex}(${rsName})`;
    case OP_J:
      // J型指令：PC[31:28] || address[25:0] || 00
      const jTarget = ((address >>> 28) << 28) | (addr << 2);
      return `j 0x${jTarget.toString(16)}`;
    case OP_JAL:
      const jalTarget = ((address >>> 28) << 28) | (addr << 2);
      return `jal 0x${jalTarget.toString(16)}`;
    case OP_CP0:
      // CP0指令：根据硬件译码规则，先检查eret，再检查mfc0/mtc0
      // eret指令: ins[25:0] == 26'b10000000000000000000011000 = 0x2000018
      const low26Bits = instruction & 0x3FFFFFF;
      if (low26Bits === 0x2000018) {
        // eret指令的特殊编码
        return 'eret';
      } else if (rs === 0x00) {
        // mfc0: rt = CP0[rd]
        // 格式: mfc0 rt, rd 或 mfc0 rt, rd, sel
        const sel = instruction & 0x7;
        if (sel === 0) {
          return `mfc0 ${rtName}, $${rd}`;
        } else {
          return `mfc0 ${rtName}, $${rd}, ${sel}`;
        }
      } else if (rs === 0x04) {
        // mtc0: CP0[rd] = rt
        // 格式: mtc0 rt, rd 或 mtc0 rt, rd, sel
        const sel = instruction & 0x7;
        if (sel === 0) {
          return `mtc0 ${rtName}, $${rd}`;
        } else {
          return `mtc0 ${rtName}, $${rd}, ${sel}`;
        }
      }
      break;
    default:
      return `.word 0x${instruction.toString(16).padStart(8, '0')}`;
  }

  return `.word 0x${instruction.toString(16).padStart(8, '0')}`;
}

/**
 * 从COE文件读取指令并反汇编
 * 支持跳过大量空指令后继续处理后续的非空指令（用于处理链接后的程序）
 */
export function disassembleCOE(coeFilePath: string, outputFilePath?: string): string[] {
  const content = fs.readFileSync(coeFilePath, 'utf-8');
  const lines = content.split('\n');
  
  const instructions: string[] = [];
  let address = 0;
  
  // 先收集所有指令
  const instructionList: { instruction: number; address: number }[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // 跳过注释和空行
    if (!trimmed || trimmed.startsWith('memory_initialization') || trimmed.startsWith(';')) {
      continue;
    }

    // 提取十六进制指令
    const hexMatch = trimmed.match(/^([0-9a-fA-F]{8})[,;]?$/);
    if (hexMatch) {
      const instruction = parseInt(hexMatch[1], 16);
      instructionList.push({ instruction, address });
      address += 4;
    }
  }
  
  // 智能处理：跳过大量连续空指令，但保留后续的非空指令区域
  // 使用滑动窗口检测连续空指令块，但继续处理后续的非空区域
  let i = 0;
  const MAX_CONSECUTIVE_NOP = 100; // 连续NOP的最大数量，超过这个数量才开始压缩显示
  
  while (i < instructionList.length) {
    const current = instructionList[i];
    
    // 检查是否有大量连续的空指令
    if (current.instruction === 0) {
      let nopCount = 0;
      let j = i;
      
      // 统计连续的空指令数量
      while (j < instructionList.length && instructionList[j].instruction === 0) {
        nopCount++;
        j++;
      }
      
      // 如果连续空指令超过阈值，且后续还有非空指令，则压缩显示
      if (nopCount > MAX_CONSECUTIVE_NOP) {
        // 检查后续是否还有非空指令
        let hasNonZeroAfter = false;
        for (let k = j; k < instructionList.length && k < j + 100; k++) {
          if (instructionList[k].instruction !== 0) {
            hasNonZeroAfter = true;
            break;
          }
        }
        
        if (hasNonZeroAfter) {
          // 压缩显示：只显示前几个和最后一个空指令，并添加注释
          const startAddr = current.address;
          const endAddr = instructionList[j - 1].address;
          instructions.push(`0x${startAddr.toString(16).padStart(8, '0')}: nop  # ... ${nopCount - 2} nops skipped ...`);
          instructions.push(`0x${endAddr.toString(16).padStart(8, '0')}: nop`);
          i = j;
          continue;
        } else {
          // 如果后续都是空指令，则停止
          break;
        }
      }
    }
    
    // 正常处理指令
    const asm = disassembleInstruction(current.instruction, current.address);
    instructions.push(`0x${current.address.toString(16).padStart(8, '0')}: ${asm}`);
    i++;
  }

  // 如果指定了输出文件，写入文件
  if (outputFilePath) {
    fs.writeFileSync(outputFilePath, instructions.join('\n') + '\n', 'utf-8');
  }

  return instructions;
}

/**
 * 主函数：反汇编COE文件
 */
export function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法：disassembler <coe_file> [output_file]');
    process.exit(1);
  }

  const coeFile = args[0];
  const outputFile = args[1] || coeFile.replace('.coe', '_disassembled.txt');

  console.log(`正在反汇编 ${coeFile}...`);
  const instructions = disassembleCOE(coeFile, outputFile);
  console.log(`已反汇编 ${instructions.length} 条指令`);
  console.log(`输出已写入 ${outputFile}`);
}

if (require.main === module) {
  main();
}
