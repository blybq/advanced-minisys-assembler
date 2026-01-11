/**
 * 指令集定义
 * 定义Minisys-1A处理器的完整指令集
 */

import { InstructionType, OperandType } from './types';

// 指令定义接口
export interface InstructionDefinition {
  mnemonic: string;
  type: InstructionType;
  opcode: number;
  funct?: number;
  operands: OperandDefinition[];
  description: string;
  encoding: string;
}

// 操作数定义接口
export interface OperandDefinition {
  type: OperandType;
  name: string;
  bits: number;
  position: number;
  required: boolean;
}

// 指令集定义
export const INSTRUCTION_SET: InstructionDefinition[] = [
  // R型指令
  {
    mnemonic: 'add',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x20,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Add registers',
    encoding: 'R'
  },
  {
    mnemonic: 'addu',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x21,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Add registers unsigned',
    encoding: 'R'
  },
  {
    mnemonic: 'sub',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x22,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Subtract registers',
    encoding: 'R'
  },
  {
    mnemonic: 'subu',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x23,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Subtract registers unsigned',
    encoding: 'R'
  },
  {
    mnemonic: 'and',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x24,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Bitwise AND',
    encoding: 'R'
  },
  {
    mnemonic: 'or',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x25,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Bitwise OR',
    encoding: 'R'
  },
  {
    mnemonic: 'slt',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x2A,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Set less than',
    encoding: 'R'
  },
  {
    mnemonic: 'sltu',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x2B,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Set less than unsigned',
    encoding: 'R'
  },
  {
    mnemonic: 'jr',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x08,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Jump register',
    encoding: 'R'
  },
  {
    mnemonic: 'jalr',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x09,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Jump and link register',
    encoding: 'R'
  },
  {
    mnemonic: 'mult',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x18,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Multiply',
    encoding: 'R'
  },
  {
    mnemonic: 'multu',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x19,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Multiply unsigned',
    encoding: 'R'
  },
  {
    mnemonic: 'div',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x1A,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Divide',
    encoding: 'R'
  },
  {
    mnemonic: 'divu',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x1B,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Divide unsigned',
    encoding: 'R'
  },
  {
    mnemonic: 'mfhi',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x10,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true }
    ],
    description: 'Move from HI',
    encoding: 'R'
  },
  {
    mnemonic: 'mflo',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x12,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true }
    ],
    description: 'Move from LO',
    encoding: 'R'
  },
  {
    mnemonic: 'mthi',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x11,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Move to HI',
    encoding: 'R'
  },
  {
    mnemonic: 'mtlo',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x13,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Move to LO',
    encoding: 'R'
  },

  // I型指令
  {
    mnemonic: 'addi',
    type: InstructionType.I_TYPE,
    opcode: 0x08,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.IMMEDIATE, name: 'immediate', bits: 16, position: 0, required: true }
    ],
    description: 'Add immediate',
    encoding: 'I'
  },
  {
    mnemonic: 'addiu',
    type: InstructionType.I_TYPE,
    opcode: 0x09,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.IMMEDIATE, name: 'immediate', bits: 16, position: 0, required: true }
    ],
    description: 'Add immediate unsigned',
    encoding: 'I'
  },
  {
    mnemonic: 'andi',
    type: InstructionType.I_TYPE,
    opcode: 0x0C,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.IMMEDIATE, name: 'immediate', bits: 16, position: 0, required: true }
    ],
    description: 'AND immediate',
    encoding: 'I'
  },
  {
    mnemonic: 'ori',
    type: InstructionType.I_TYPE,
    opcode: 0x0D,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.IMMEDIATE, name: 'immediate', bits: 16, position: 0, required: true }
    ],
    description: 'OR immediate',
    encoding: 'I'
  },
  {
    mnemonic: 'lui',
    type: InstructionType.I_TYPE,
    opcode: 0x0F,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.IMMEDIATE, name: 'immediate', bits: 16, position: 0, required: true }
    ],
    description: 'Load upper immediate',
    encoding: 'I'
  },
  {
    mnemonic: 'lw',
    type: InstructionType.I_TYPE,
    opcode: 0x23,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.OFFSET, name: 'offset', bits: 16, position: 0, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Load word',
    encoding: 'I'
  },
  {
    mnemonic: 'sw',
    type: InstructionType.I_TYPE,
    opcode: 0x2B,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.OFFSET, name: 'offset', bits: 16, position: 0, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Store word',
    encoding: 'I'
  },
  {
    mnemonic: 'beq',
    type: InstructionType.I_TYPE,
    opcode: 0x04,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.LABEL, name: 'label', bits: 16, position: 0, required: true }
    ],
    description: 'Branch if equal',
    encoding: 'I'
  },
  {
    mnemonic: 'bne',
    type: InstructionType.I_TYPE,
    opcode: 0x05,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.LABEL, name: 'label', bits: 16, position: 0, required: true }
    ],
    description: 'Branch if not equal',
    encoding: 'I'
  },

  // J型指令
  {
    mnemonic: 'j',
    type: InstructionType.J_TYPE,
    opcode: 0x02,
    operands: [
      { type: OperandType.LABEL, name: 'label', bits: 26, position: 0, required: true }
    ],
    description: 'Jump',
    encoding: 'J'
  },
  {
    mnemonic: 'jal',
    type: InstructionType.J_TYPE,
    opcode: 0x03,
    operands: [
      { type: OperandType.LABEL, name: 'label', bits: 26, position: 0, required: true }
    ],
    description: 'Jump and link',
    encoding: 'J'
  },

  // 特殊指令
  {
    mnemonic: 'nop',
    type: InstructionType.SPECIAL,
    opcode: 0,
    funct: 0,
    operands: [],
    description: 'No operation',
    encoding: 'R'
  },
  {
    mnemonic: 'syscall',
    type: InstructionType.SPECIAL,
    opcode: 0,
    funct: 0x0C,
    operands: [],
    description: 'System call',
    encoding: 'R'
  },
  {
    mnemonic: 'break',
    type: InstructionType.SPECIAL,
    opcode: 0,
    funct: 0x0D,
    operands: [],
    description: 'Breakpoint',
    encoding: 'R'
  },
  // CP0指令
  {
    mnemonic: 'mfc0',
    type: InstructionType.I_TYPE,
    opcode: 0x10, // OP_CP0
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.IMMEDIATE, name: 'sel', bits: 3, position: 0, required: false }
    ],
    description: 'Move from CP0',
    encoding: 'CP0'
  },
  {
    mnemonic: 'mtc0',
    type: InstructionType.I_TYPE,
    opcode: 0x10, // OP_CP0
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.IMMEDIATE, name: 'sel', bits: 3, position: 0, required: false }
    ],
    description: 'Move to CP0',
    encoding: 'CP0'
  },
  {
    mnemonic: 'eret',
    type: InstructionType.SPECIAL,
    opcode: 0x10, // OP_CP0
    operands: [],
    description: 'Exception return',
    encoding: 'CP0'
  },
  // 更多R型指令
  {
    mnemonic: 'xor',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x26,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Bitwise XOR',
    encoding: 'R'
  },
  {
    mnemonic: 'nor',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x27,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true }
    ],
    description: 'Bitwise NOR',
    encoding: 'R'
  },
  {
    mnemonic: 'sll',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x00,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.IMMEDIATE, name: 'shamt', bits: 5, position: 6, required: true }
    ],
    description: 'Shift left logical',
    encoding: 'R'
  },
  {
    mnemonic: 'srl',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x02,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.IMMEDIATE, name: 'shamt', bits: 5, position: 6, required: true }
    ],
    description: 'Shift right logical',
    encoding: 'R'
  },
  {
    mnemonic: 'sra',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x03,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.IMMEDIATE, name: 'shamt', bits: 5, position: 6, required: true }
    ],
    description: 'Shift right arithmetic',
    encoding: 'R'
  },
  {
    mnemonic: 'sllv',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x04,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Shift left logical variable',
    encoding: 'R'
  },
  {
    mnemonic: 'srlv',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x06,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Shift right logical variable',
    encoding: 'R'
  },
  {
    mnemonic: 'srav',
    type: InstructionType.R_TYPE,
    opcode: 0,
    funct: 0x07,
    operands: [
      { type: OperandType.REGISTER, name: 'rd', bits: 5, position: 11, required: true },
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Shift right arithmetic variable',
    encoding: 'R'
  },
  // 更多I型指令
  {
    mnemonic: 'slti',
    type: InstructionType.I_TYPE,
    opcode: 0x0A,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.IMMEDIATE, name: 'immediate', bits: 16, position: 0, required: true }
    ],
    description: 'Set less than immediate',
    encoding: 'I'
  },
  {
    mnemonic: 'lb',
    type: InstructionType.I_TYPE,
    opcode: 0x20,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.OFFSET, name: 'offset', bits: 16, position: 0, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Load byte',
    encoding: 'I'
  },
  {
    mnemonic: 'sb',
    type: InstructionType.I_TYPE,
    opcode: 0x28,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.OFFSET, name: 'offset', bits: 16, position: 0, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Store byte',
    encoding: 'I'
  },
  {
    mnemonic: 'lh',
    type: InstructionType.I_TYPE,
    opcode: 0x21,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.OFFSET, name: 'offset', bits: 16, position: 0, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Load halfword',
    encoding: 'I'
  },
  {
    mnemonic: 'sh',
    type: InstructionType.I_TYPE,
    opcode: 0x29,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.OFFSET, name: 'offset', bits: 16, position: 0, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Store halfword',
    encoding: 'I'
  },
  {
    mnemonic: 'lbu',
    type: InstructionType.I_TYPE,
    opcode: 0x24,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.OFFSET, name: 'offset', bits: 16, position: 0, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Load byte unsigned',
    encoding: 'I'
  },
  {
    mnemonic: 'lhu',
    type: InstructionType.I_TYPE,
    opcode: 0x25,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.OFFSET, name: 'offset', bits: 16, position: 0, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true }
    ],
    description: 'Load halfword unsigned',
    encoding: 'I'
  },
  {
    mnemonic: 'xori',
    type: InstructionType.I_TYPE,
    opcode: 0x0E,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.IMMEDIATE, name: 'immediate', bits: 16, position: 0, required: true }
    ],
    description: 'XOR immediate',
    encoding: 'I'
  },
  {
    mnemonic: 'sltiu',
    type: InstructionType.I_TYPE,
    opcode: 0x0B,
    operands: [
      { type: OperandType.REGISTER, name: 'rt', bits: 5, position: 16, required: true },
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.IMMEDIATE, name: 'immediate', bits: 16, position: 0, required: true }
    ],
    description: 'Set less than immediate unsigned',
    encoding: 'I'
  },
  // 分支指令
  {
    mnemonic: 'blez',
    type: InstructionType.I_TYPE,
    opcode: 0x06,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.LABEL, name: 'label', bits: 16, position: 0, required: true }
    ],
    description: 'Branch if less than or equal to zero',
    encoding: 'I'
  },
  {
    mnemonic: 'bgtz',
    type: InstructionType.I_TYPE,
    opcode: 0x07,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.LABEL, name: 'label', bits: 16, position: 0, required: true }
    ],
    description: 'Branch if greater than zero',
    encoding: 'I'
  },
  {
    mnemonic: 'bltz',
    type: InstructionType.I_TYPE,
    opcode: 0x01,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.LABEL, name: 'label', bits: 16, position: 0, required: true }
    ],
    description: 'Branch if less than zero',
    encoding: 'I'
  },
  {
    mnemonic: 'bgez',
    type: InstructionType.I_TYPE,
    opcode: 0x01,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.LABEL, name: 'label', bits: 16, position: 0, required: true }
    ],
    description: 'Branch if greater than or equal to zero',
    encoding: 'I'
  },
  {
    mnemonic: 'bgezal',
    type: InstructionType.I_TYPE,
    opcode: 0x01,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.LABEL, name: 'label', bits: 16, position: 0, required: true }
    ],
    description: 'Branch if greater than or equal to zero and link',
    encoding: 'I'
  },
  {
    mnemonic: 'bltzal',
    type: InstructionType.I_TYPE,
    opcode: 0x01,
    operands: [
      { type: OperandType.REGISTER, name: 'rs', bits: 5, position: 21, required: true },
      { type: OperandType.LABEL, name: 'label', bits: 16, position: 0, required: true }
    ],
    description: 'Branch if less than zero and link',
    encoding: 'I'
  }
];

// 指令查找表
export const INSTRUCTION_LOOKUP = new Map<string, InstructionDefinition>();

// 初始化指令查找表
INSTRUCTION_SET.forEach(instruction => {
  INSTRUCTION_LOOKUP.set(instruction.mnemonic, instruction);
});

// 伪指令定义
export interface PseudoInstruction {
  mnemonic: string;
  expansion: string[];
  description: string;
}

export const PSEUDO_INSTRUCTIONS: PseudoInstruction[] = [
  {
    mnemonic: 'move',
    expansion: ['add $1, $2, $zero'],
    description: 'Move register'
  },
  {
    mnemonic: 'li',
    expansion: ['lui $1, immediate_high', 'ori $1, $1, immediate_low'],
    description: 'Load immediate'
  },
  {
    mnemonic: 'la',
    expansion: ['lui $1, %hi(address)', 'ori $1, $1, %lo(address)'],
    description: 'Load address'
  },
  {
    mnemonic: 'push',
    expansion: ['addiu $sp, $sp, -4', 'sw $1, 0($sp)'],
    description: 'Push to stack'
  },
  {
    mnemonic: 'pop',
    expansion: ['lw $1, 0($sp)', 'addiu $sp, $sp, 4'],
    description: 'Pop from stack'
  },
  {
    mnemonic: 'not',
    expansion: ['nor $1, $2, $zero'],
    description: 'Bitwise NOT'
  },
  {
    mnemonic: 'neg',
    expansion: ['sub $1, $zero, $2'],
    description: 'Negate'
  },
  {
    mnemonic: 'abs',
    expansion: ['slt $at, $2, $zero', 'sub $1, $zero, $2', 'movn $1, $2, $at'],
    description: 'Absolute value'
  },
  {
    mnemonic: 'b',
    expansion: ['j label'],
    description: 'Unconditional branch'
  },
  {
    mnemonic: 'bal',
    expansion: ['jal label'],
    description: 'Branch and link'
  },
  {
    mnemonic: 'beqz',
    expansion: ['beq $1, $zero, label'],
    description: 'Branch if equal to zero'
  },
  {
    mnemonic: 'bnez',
    expansion: ['bne $1, $zero, label'],
    description: 'Branch if not equal to zero'
  },
  {
    mnemonic: 'bgt',
    expansion: ['slt $at, $3, $2', 'bne $at, $zero, label'],
    description: 'Branch if greater than'
  },
  {
    mnemonic: 'bge',
    expansion: ['slt $at, $2, $3', 'beq $at, $zero, label'],
    description: 'Branch if greater than or equal'
  },
  {
    mnemonic: 'blt',
    expansion: ['slt $at, $2, $3', 'bne $at, $zero, label'],
    description: 'Branch if less than'
  },
  {
    mnemonic: 'ble',
    expansion: ['slt $at, $3, $2', 'beq $at, $zero, label'],
    description: 'Branch if less than or equal'
  },
  {
    mnemonic: 'jg',
    expansion: ['slt $at, $3, $2', 'bne $at, $zero, label'],
    description: 'Jump if greater than'
  },
  {
    mnemonic: 'jle',
    expansion: ['slt $at, $2, $3', 'beq $at, $zero, label'],
    description: 'Jump if less than or equal'
  }
];

// 伪指令查找表
export const PSEUDO_INSTRUCTION_LOOKUP = new Map<string, PseudoInstruction>();

PSEUDO_INSTRUCTIONS.forEach(pseudo => {
  PSEUDO_INSTRUCTION_LOOKUP.set(pseudo.mnemonic, pseudo);
});
