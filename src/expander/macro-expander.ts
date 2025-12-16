/**
 * 宏指令展开器
 * 处理宏指令的展开
 */

import { AssemblyContext } from '../core/types';

export interface MacroDefinition {
  name: string;
  parameters: string[];
  body: string[];
}

export class MacroExpander {
  private macros: Map<string, MacroDefinition> = new Map();

  /**
   * 定义宏
   */
  public defineMacro(name: string, parameters: string[], body: string[]): void {
    this.macros.set(name, {
      name,
      parameters,
      body
    });
  }

  /**
   * 展开宏调用
   */
  public expandMacro(macroName: string, args: string[]): string[] {
    const macro = this.macros.get(macroName);
    if (!macro) {
      return []; // 宏未定义
    }

    if (args.length !== macro.parameters.length) {
      return []; // 参数数量不匹配
    }

    const expandedLines: string[] = [];
    
    for (const line of macro.body) {
      let expandedLine = line;
      
      // 替换参数
      for (let i = 0; i < macro.parameters.length; i++) {
        const param = macro.parameters[i];
        const arg = args[i];
        const regex = new RegExp(`\\b${param}\\b`, 'g');
        expandedLine = expandedLine.replace(regex, arg);
      }
      
      expandedLines.push(expandedLine);
    }

    return expandedLines;
  }

  /**
   * 检查是否为宏调用
   */
  public isMacroCall(line: string): boolean {
    const trimmed = line.trim();
    const firstWord = trimmed.split(/\s+/)[0];
    return this.macros.has(firstWord);
  }

  /**
   * 解析宏调用
   */
  public parseMacroCall(line: string): { name: string; args: string[] } | null {
    const trimmed = line.trim();
    if (!trimmed) {
      return null;
    }

    const nameMatch = trimmed.match(/^([^\s(]+)/);
    if (!nameMatch) {
      return null;
    }
    const name = nameMatch[1];
    const remainder = trimmed.slice(name.length).trim();
    const args: string[] = [];

    let argsSource = remainder;
    if (argsSource.startsWith('(') && argsSource.endsWith(')')) {
      argsSource = argsSource.slice(1, -1).trim();
    }

    if (argsSource.length > 0) {
      let current = '';
      let depth = 0;

      for (let i = 0; i < argsSource.length; i++) {
        const char = argsSource[i];
        if (char === '(') {
          depth++;
          current += char;
          continue;
        }
        if (char === ')') {
          depth = Math.max(0, depth - 1);
          current += char;
          continue;
        }
        if (char === ',' && depth === 0) {
          if (current.trim()) {
            args.push(current.trim());
          }
          current = '';
          continue;
        }
        current += char;
      }

      if (current.trim()) {
        args.push(current.trim());
      }
    }

    return { name, args };
  }

  /**
   * 预定义一些常用宏
   */
  public initializeDefaultMacros(): void {
    // 延时宏
    this.defineMacro('delay', ['count'], [
      'addi $t0, $zero, count',
      'delay_loop:',
      'addi $t0, $t0, -1',
      'bne $t0, $zero, delay_loop'
    ]);

    // 保存寄存器宏
    this.defineMacro('save_regs', ['regs'], [
      'addiu $sp, $sp, -regs*4',
      'sw $ra, 0($sp)',
      'sw $s0, 4($sp)',
      'sw $s1, 8($sp)',
      'sw $s2, 12($sp)',
      'sw $s3, 16($sp)',
      'sw $s4, 20($sp)',
      'sw $s5, 24($sp)',
      'sw $s6, 28($sp)',
      'sw $s7, 32($sp)'
    ]);

    // 恢复寄存器宏
    this.defineMacro('restore_regs', ['regs'], [
      'lw $ra, 0($sp)',
      'lw $s0, 4($sp)',
      'lw $s1, 8($sp)',
      'lw $s2, 12($sp)',
      'lw $s3, 16($sp)',
      'lw $s4, 20($sp)',
      'lw $s5, 24($sp)',
      'lw $s6, 28($sp)',
      'lw $s7, 32($sp)',
      'addiu $sp, $sp, regs*4'
    ]);

    // 函数调用宏
    this.defineMacro('call', ['func'], [
      'jal func',
      'nop'
    ]);

    // 返回宏
    this.defineMacro('return', [], [
      'jr $ra',
      'nop'
    ]);
  }
}
