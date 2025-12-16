/**
 * 核心类型定义
 * 定义汇编器的基础数据类型和接口
 */

// 基础类型定义
export type Byte = number;
export type Word = number;
export type Address = number;
export type RegisterIndex = number;

// 指令类型枚举
export enum InstructionType {
  R_TYPE = 'R_TYPE',
  I_TYPE = 'I_TYPE', 
  J_TYPE = 'J_TYPE',
  SPECIAL = 'SPECIAL'
}

// 操作数类型
export enum OperandType {
  REGISTER = 'REGISTER',
  IMMEDIATE = 'IMMEDIATE',
  LABEL = 'LABEL',
  ADDRESS = 'ADDRESS',
  OFFSET = 'OFFSET'
}

// 操作数接口
export interface Operand {
  type: OperandType;
  value: string | number;
  register?: RegisterIndex;
  immediate?: number;
  label?: string;
  address?: Address;
  offset?: number;
}

// 指令接口
export interface Instruction {
  mnemonic: string;
  operands: Operand[];
  type: InstructionType;
  opcode: number;
  funct?: number;
  shamt?: number;
  address?: Address;
  lineNumber: number;
  sourceLine: string;
}

// 标签定义
export interface Label {
  name: string;
  address: Address;
  lineNumber: number;
  isGlobal: boolean;
}

// 数据定义
export interface DataDefinition {
  type: 'byte' | 'word' | 'half' | 'ascii' | 'space';
  values: (number | string)[];
  address: Address;
  size: number;
}

// 段定义
export interface Segment {
  name: string;
  startAddress: Address;
  size: number;
  instructions: Instruction[];
  data: DataDefinition[];
  labels: Map<string, Label>;
}

// 汇编上下文
export interface AssemblyContext {
  segments: Map<string, Segment>;
  globalLabels: Map<string, Label>;
  currentSegment: string;
  programCounter: Address;
  userAppOffset?: Address; // 用户程序地址偏移（链接模式下使用）
  errors: AssemblyError[];
  warnings: AssemblyWarning[];
}

// 错误类型
export interface AssemblyError {
  type: 'SYNTAX' | 'SEMANTIC' | 'LINKING' | 'RUNTIME';
  message: string;
  lineNumber: number;
  column?: number;
  sourceLine?: string;
}

// 警告类型
export interface AssemblyWarning {
  type: 'OPTIMIZATION' | 'COMPATIBILITY' | 'STYLE';
  message: string;
  lineNumber: number;
  column?: number;
  sourceLine?: string;
}

// 汇编结果
export interface AssemblyResult {
  success: boolean;
  errors: AssemblyError[];
  warnings: AssemblyWarning[];
  memoryImage: MemoryImage;
  symbolTable: Map<string, Label>;
  statistics: AssemblyStatistics;
}

// 内存映像
export interface MemoryImage {
  instructionMemory: Byte[];
  dataMemory: Byte[];
  instructionCount: number;
  dataSize: number;
  entryPoint: Address;
}

// 汇编统计
export interface AssemblyStatistics {
  totalInstructions: number;
  totalDataBytes: number;
  totalLabels: number;
  processingTime: number;
  memoryUsage: number;
}

// 寄存器定义
export const REGISTERS = {
  ZERO: 0, AT: 1,
  V0: 2, V1: 3,
  A0: 4, A1: 5, A2: 6, A3: 7,
  T0: 8, T1: 9, T2: 10, T3: 11, T4: 12, T5: 13, T6: 14, T7: 15,
  S0: 16, S1: 17, S2: 18, S3: 19, S4: 20, S5: 21, S6: 22, S7: 23,
  T8: 24, T9: 25,
  K0: 26, K1: 27,
  GP: 28, SP: 29, FP: 30, RA: 31
} as const;

// 寄存器名称映射
export const REGISTER_NAMES = new Map<number, string>([
  [0, 'zero'], [1, 'at'],
  [2, 'v0'], [3, 'v1'],
  [4, 'a0'], [5, 'a1'], [6, 'a2'], [7, 'a3'],
  [8, 't0'], [9, 't1'], [10, 't2'], [11, 't3'], [12, 't4'], [13, 't5'], [14, 't6'], [15, 't7'],
  [16, 's0'], [17, 's1'], [18, 's2'], [19, 's3'], [20, 's4'], [21, 's5'], [22, 's6'], [23, 's7'],
  [24, 't8'], [25, 't9'],
  [26, 'k0'], [27, 'k1'],
  [28, 'gp'], [29, 'sp'], [30, 'fp'], [31, 'ra']
]);

// 内存布局常量
export const MEMORY_LAYOUT = {
  INSTRUCTION_START: 0x00000000,
  INSTRUCTION_SIZE: 0x00010000,
  DATA_START: 0x00010000,
  DATA_SIZE: 0x00010000,
  STACK_START: 0x7FFFFFFF,
  HEAP_START: 0x10000000
} as const;
