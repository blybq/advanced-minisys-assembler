/**
 * 伪指令展开器
 * 将伪指令展开为真实指令
 */

import { Instruction, Operand, OperandType, AssemblyContext } from '../core/types';
import { PSEUDO_INSTRUCTION_LOOKUP, INSTRUCTION_LOOKUP } from '../core/instruction-set';

export class PseudoExpander {
  private context?: AssemblyContext;

  constructor(context?: AssemblyContext) {
    this.context = context;
  }

  /**
   * 展开伪指令
   */
  public expandPseudoInstruction(instruction: Instruction): Instruction[] {
    const pseudoDef = PSEUDO_INSTRUCTION_LOOKUP.get(instruction.mnemonic);
    if (!pseudoDef) {
      return [instruction]; // 不是伪指令，直接返回
    }

    const expandedInstructions: Instruction[] = [];
    
    // 特殊处理li指令（需要优化：16位内用addi，否则用lui+ori）
    if (instruction.mnemonic === 'li' && instruction.operands.length >= 2) {
      const targetReg = instruction.operands[0];
      const immediate = instruction.operands[1];
      
      if (immediate.type === OperandType.IMMEDIATE && immediate.immediate !== undefined) {
        const value = immediate.immediate;
        
        // 如果立即数在16位范围内，使用addi
        if (value >= -32768 && value <= 32767) {
          expandedInstructions.push({
            mnemonic: 'addi',
            operands: [targetReg, { type: OperandType.REGISTER, value: '$zero', register: 0 }, immediate],
            type: 'I_TYPE' as any,
            opcode: 0x08,
            lineNumber: instruction.lineNumber,
            sourceLine: `addi ${targetReg.value}, $zero, ${value}`
          });
          return expandedInstructions;
        }
        // 否则继续使用统一的占位符替换机制处理
      }
    }
    
    // 特殊处理push/pop指令（需要特殊的内存地址格式）
    if (instruction.mnemonic === 'push' && instruction.operands.length >= 1) {
      // 处理push指令
      const reg = instruction.operands[0];
      expandedInstructions.push({
        mnemonic: 'addiu',
        operands: [
          { type: OperandType.REGISTER, value: '$sp', register: 29 },
          { type: OperandType.REGISTER, value: '$sp', register: 29 },
          { type: OperandType.IMMEDIATE, value: '-4', immediate: -4 }
        ],
        type: 'I_TYPE' as any,
        opcode: 0x09,
        lineNumber: instruction.lineNumber,
        sourceLine: `addiu $sp, $sp, -4`
      });
      expandedInstructions.push({
        mnemonic: 'sw',
        operands: [
          reg,
          { type: OperandType.ADDRESS, value: '0($sp)', offset: 0, register: 29 }
        ],
        type: 'I_TYPE' as any,
        opcode: 0x2B,
        lineNumber: instruction.lineNumber,
        sourceLine: `sw ${reg.value}, 0($sp)`
      });
    } else if (instruction.mnemonic === 'pop' && instruction.operands.length >= 1) {
      // 处理pop指令
      const reg = instruction.operands[0];
      expandedInstructions.push({
        mnemonic: 'lw',
        operands: [
          reg,
          { type: OperandType.ADDRESS, value: '0($sp)', offset: 0, register: 29 }
        ],
        type: 'I_TYPE' as any,
        opcode: 0x23,
        lineNumber: instruction.lineNumber,
        sourceLine: `lw ${reg.value}, 0($sp)`
      });
      expandedInstructions.push({
        mnemonic: 'addiu',
        operands: [
          { type: OperandType.REGISTER, value: '$sp', register: 29 },
          { type: OperandType.REGISTER, value: '$sp', register: 29 },
          { type: OperandType.IMMEDIATE, value: '4', immediate: 4 }
        ],
        type: 'I_TYPE' as any,
        opcode: 0x09,
        lineNumber: instruction.lineNumber,
        sourceLine: `addiu $sp, $sp, 4`
      });
    } else if (instruction.mnemonic === 'jg' && instruction.operands.length >= 3) {
      // 处理jg指令: jg $2, $3, label -> slt $at, $3, $2; bne $at, $zero, label
      const reg1 = instruction.operands[0];
      const reg2 = instruction.operands[1];
      const label = instruction.operands[2];
      
      expandedInstructions.push({
        mnemonic: 'slt',
        operands: [
          { type: OperandType.REGISTER, value: '$at', register: 1 },
          reg2,
          reg1
        ],
        type: 'R_TYPE' as any,
        opcode: 0x00,
        lineNumber: instruction.lineNumber,
        sourceLine: `slt $at, ${reg2.value}, ${reg1.value}`
      });
      
      expandedInstructions.push({
        mnemonic: 'bne',
        operands: [
          { type: OperandType.REGISTER, value: '$at', register: 1 },
          { type: OperandType.REGISTER, value: '$zero', register: 0 },
          label
        ],
        type: 'I_TYPE' as any,
        opcode: 0x05,
        lineNumber: instruction.lineNumber,
        sourceLine: `bne $at, $zero, ${label.value}`
      });
    } else if (instruction.mnemonic === 'jle' && instruction.operands.length >= 3) {
      // 处理jle指令: jle $2, $3, label -> slt $at, $2, $3; beq $at, $zero, label
      const reg1 = instruction.operands[0];
      const reg2 = instruction.operands[1];
      const label = instruction.operands[2];
      
      expandedInstructions.push({
        mnemonic: 'slt',
        operands: [
          { type: OperandType.REGISTER, value: '$at', register: 1 },
          reg1,
          reg2
        ],
        type: 'R_TYPE' as any,
        opcode: 0x00,
        lineNumber: instruction.lineNumber,
        sourceLine: `slt $at, ${reg1.value}, ${reg2.value}`
      });
      
      expandedInstructions.push({
        mnemonic: 'beq',
        operands: [
          { type: OperandType.REGISTER, value: '$at', register: 1 },
          { type: OperandType.REGISTER, value: '$zero', register: 0 },
          label
        ],
        type: 'I_TYPE' as any,
        opcode: 0x04,
        lineNumber: instruction.lineNumber,
        sourceLine: `beq $at, $zero, ${label.value}`
      });
    } else {
      // 其他伪指令的常规处理
      for (const expansion of pseudoDef.expansion) {
        const expandedInstruction = this.parseExpansion(expansion, instruction);
        if (expandedInstruction) {
          expandedInstructions.push(expandedInstruction);
        }
      }
    }

    return expandedInstructions;
  }

  /**
   * 解析展开字符串
   */
  private parseExpansion(expansion: string, originalInstruction: Instruction): Instruction | null {
    // 移除注释
    let cleanExpansion = expansion.split('#')[0].trim();
    
    // 统一替换所有占位符
    cleanExpansion = this.replacePlaceholders(cleanExpansion, originalInstruction);
    
    // 解析指令和操作数
    const parts = cleanExpansion.split(/\s+/);
    if (parts.length === 0) {
      return null;
    }

    const mnemonic = parts[0];
    const operands: Operand[] = [];

    // 解析操作数
    for (let i = 1; i < parts.length; i++) {
      const operandStr = parts[i].replace(',', '').trim();
      if (operandStr) {
        const operand = this.parseOperand(operandStr, originalInstruction);
        if (operand) {
          operands.push(operand);
        }
      }
    }

    return {
      mnemonic,
      operands,
      type: this.getInstructionType(mnemonic) as any,
      opcode: 0,
      lineNumber: originalInstruction.lineNumber,
      sourceLine: cleanExpansion
    };
  }

  /**
   * 统一替换占位符
   * 处理所有类型的占位符：$1/$2/$3, %hi/%lo, immediate_high/immediate_low, label等
   */
  private replacePlaceholders(expansion: string, originalInstruction: Instruction): string {
    let result = expansion;

    // 1. 替换 %hi(address) 和 %lo(address) - 用于la指令
    // 这些占位符需要从context中获取标签地址并分解
    if (result.includes('%hi') || result.includes('%lo')) {
      // 查找标签操作数（通常是la指令的第二个操作数）
      const labelOperand = originalInstruction.operands.find(op => 
        op.type === OperandType.LABEL && op.label
      );
      
      if (labelOperand && labelOperand.label && this.context) {
        const labelInfo = this.context.globalLabels.get(labelOperand.label);
        if (labelInfo) {
          const address = labelInfo.address;
          const high = (address >>> 16) & 0xFFFF;
          const low = address & 0xFFFF;
          
          // 先替换模板中的 "address" 为实际标签名
          result = result.replace(/address/g, labelOperand.label);
          
          // 然后替换 %hi(label) 为地址的高16位
          result = result.replace(/%hi\((\w+)\)/g, (match, label) => {
            const info = this.context!.globalLabels.get(label);
            if (info) {
              return ((info.address >>> 16) & 0xFFFF).toString();
            }
            return match;
          });
          
          // 替换 %lo(label) 为地址的低16位
          result = result.replace(/%lo\((\w+)\)/g, (match, label) => {
            const info = this.context!.globalLabels.get(label);
            if (info) {
              return (info.address & 0xFFFF).toString();
            }
            return match;
          });
        }
      }
    }

    // 2. 替换 immediate_high 和 immediate_low - 用于li指令
    if (result.includes('immediate_high') || result.includes('immediate_low')) {
      const immediateOperand = originalInstruction.operands.find(op => 
        op.type === OperandType.IMMEDIATE && op.immediate !== undefined
      );
      if (immediateOperand && immediateOperand.immediate !== undefined) {
        const value = immediateOperand.immediate;
        const high = (value >>> 16) & 0xFFFF;
        const low = value & 0xFFFF;
        result = result.replace(/immediate_high/g, high.toString());
        result = result.replace(/immediate_low/g, low.toString());
      }
    }

    // 3. 替换 label 占位符 - 用于分支和跳转指令（b, bal, beqz, bnez, bgt, bge, blt, ble等）
    if (result.includes('label')) {
      const labelOperand = originalInstruction.operands.find(op => 
        op.type === OperandType.LABEL && op.label
      );
      if (labelOperand && labelOperand.label) {
        result = result.replace(/label/g, labelOperand.label);
      }
    }

    // 4. 替换 address 占位符 - 用于la指令（如果没有%hi/%lo，直接使用地址值）
    if (result.includes('address') && !result.includes('%hi') && !result.includes('%lo')) {
      const addressOperand = originalInstruction.operands.find(op => 
        op.type === OperandType.LABEL && op.label
      );
      if (addressOperand && addressOperand.label && this.context) {
        const labelInfo = this.context.globalLabels.get(addressOperand.label);
        if (labelInfo) {
          result = result.replace(/address/g, labelInfo.address.toString());
        }
      }
    }

    return result;
  }

  /**
   * 解析操作数
   */
  private parseOperand(operandStr: string, originalInstruction: Instruction): Operand | null {
    // 处理占位符
    if (operandStr.startsWith('$1')) {
      return this.getOperandByIndex(originalInstruction, 0);
    } else if (operandStr.startsWith('$2')) {
      return this.getOperandByIndex(originalInstruction, 1);
    } else if (operandStr.startsWith('$3')) {
      return this.getOperandByIndex(originalInstruction, 2);
    } else if (operandStr.startsWith('$at')) {
      return {
        type: OperandType.REGISTER,
        value: '$at',
        register: 1
      };
    } else if (operandStr.startsWith('$zero')) {
      return {
        type: OperandType.REGISTER,
        value: '$zero',
        register: 0
      };
    } else if (operandStr.startsWith('$sp')) {
      return {
        type: OperandType.REGISTER,
        value: '$sp',
        register: 29
      };
    } else if (operandStr.startsWith('$')) {
      // 寄存器
      const regName = operandStr.substring(1);
      const regIndex = this.getRegisterIndex(regName);
      return {
        type: OperandType.REGISTER,
        value: operandStr,
        register: regIndex
      };
    } else if (operandStr.match(/^-?\d+$/)) {
      // 立即数
      const value = parseInt(operandStr);
      return {
        type: OperandType.IMMEDIATE,
        value: operandStr,
        immediate: value
      };
    } else if (operandStr.match(/^0x[0-9a-fA-F]+$/)) {
      // 十六进制立即数
      const value = parseInt(operandStr, 16);
      return {
        type: OperandType.IMMEDIATE,
        value: operandStr,
        immediate: value
      };
    } else if (operandStr.includes('(') && operandStr.includes(')')) {
      // 内存地址
      return this.parseMemoryAddress(operandStr);
    } else {
      // 标签
      return {
        type: OperandType.LABEL,
        value: operandStr,
        label: operandStr
      };
    }
  }

  /**
   * 根据索引获取操作数
   */
  private getOperandByIndex(instruction: Instruction, index: number): Operand | null {
    if (index < instruction.operands.length) {
      return instruction.operands[index];
    }
    return null;
  }

  /**
   * 解析内存地址
   */
  private parseMemoryAddress(operandStr: string): Operand | null {
    const match = operandStr.match(/^(-?\d+)\((\$\w+)\)$/);
    if (match) {
      const offset = parseInt(match[1]);
      const regName = match[2];
      const regIndex = this.getRegisterIndex(regName.substring(1));
      
      return {
        type: OperandType.ADDRESS,
        value: operandStr,
        register: regIndex,
        offset: offset
      };
    }
    return null;
  }

  /**
   * 获取寄存器索引
   */
  private getRegisterIndex(regName: string): number {
    const registerMap: { [key: string]: number } = {
      'zero': 0, 'at': 1,
      'v0': 2, 'v1': 3,
      'a0': 4, 'a1': 5, 'a2': 6, 'a3': 7,
      't0': 8, 't1': 9, 't2': 10, 't3': 11, 't4': 12, 't5': 13, 't6': 14, 't7': 15,
      's0': 16, 's1': 17, 's2': 18, 's3': 19, 's4': 20, 's5': 21, 's6': 22, 's7': 23,
      't8': 24, 't9': 25,
      'k0': 26, 'k1': 27,
      'gp': 28, 'sp': 29, 'fp': 30, 'ra': 31
    };
    
    return registerMap[regName.toLowerCase()] || 0;
  }

  /**
   * 获取指令类型
   */
  private getInstructionType(mnemonic: string): any {
    const definition = INSTRUCTION_LOOKUP.get(mnemonic);
    if (definition) {
      return definition.type;
    }
    return 'SPECIAL';
  }
}
