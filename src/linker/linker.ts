/**
 * 链接器模块
 * 实现BIOS、用户程序、中断处理程序的链接功能
 */

import * as fs from 'fs';
import * as path from 'path';
import { Parser } from '../parser/parser';
import { PseudoExpander } from '../expander/pseudo-expander';
import { AssemblyContext } from '../core/types';

// 内存布局常量
const BIOS_START = 0x00000000;
const BIOS_END = 0x00000499; // 1280字节 = 320条指令
const BIOS_MAX_INSTRUCTIONS = 320;

const USER_APP_START = 0x00000500;
const USER_APP_END = 0x00005499; // 20480字节 = 5120条指令
const USER_APP_MAX_INSTRUCTIONS = 5120;
const USER_APP_OFFSET = 0x500; // 1280字节

const MIDDLE_EMPTY_START = 0x00005500;
const MIDDLE_EMPTY_END = 0x0000EFFF;
const MIDDLE_EMPTY_INSTRUCTIONS = 39680 / 4; // 9920条指令

const INT_ENTRY_START = 0x0000F000;
const INT_ENTRY_END = 0x0000F499; // 1280字节 = 320条指令
const INT_ENTRY_MAX_INSTRUCTIONS = 320;

const INT_HANDLER_START = 0x0000F500;
const INT_HANDLER_END = 0x0000FFFF; // 2816字节 = 704条指令
const INT_HANDLER_MAX_INSTRUCTIONS = 704;

const TOTAL_MEMORY_SIZE = 0x0000FFFF + 1; // 64KB

/**
 * 计算汇编代码中的指令数量（考虑伪指令展开）
 */
export function countInstructions(asmCode: string): number {
  try {
    // 创建解析器
    const parser = new Parser();
    
    // 解析汇编代码
    const context = parser.parse(asmCode);

    if (context.errors.length > 0) {
      throw new Error(`Parse errors: ${context.errors.join(', ')}`);
    }

    // 获取代码段
    const textSegment = context.segments.get('text');
    if (!textSegment) {
      return 0;
    }

    // 展开伪指令并计算指令数
    const expander = new PseudoExpander();
    let instructionCount = 0;

    for (const instruction of textSegment.instructions) {
      const expanded = expander.expandPseudoInstruction(instruction);
      instructionCount += expanded.length;
    }

    return instructionCount;
  } catch (error) {
    // 如果解析失败，使用简单的方法：计算非空非标签行数
    const lines = asmCode
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('.'));

    // 简单估算：每行一条指令（不考虑宏展开）
    return lines.filter(line => !line.endsWith(':')).length;
  }
}

/**
 * 链接所有部分，返回链接后的完整内存汇编代码
 * @param biosASM BIOS汇编代码
 * @param userASM 用户程序汇编代码
 * @param intEntryASM 中断入口汇编代码
 * @param intHandlerASM 中断处理程序汇编代码
 */
export function linkAll(
  biosASM: string,
  userASM: string,
  intEntryASM: string,
  intHandlerASM: string
): string {
  // 计算各部分指令数
  const biosInsCount = countInstructions(biosASM);
  const userInsCount = countInstructions(userASM);
  const intEntryInsCount = countInstructions(intEntryASM);
  const intHandlerInsCount = countInstructions(intHandlerASM);

  // 验证各部分大小
  if (biosInsCount > BIOS_MAX_INSTRUCTIONS) {
    throw new Error(`BIOS程序段过长：${biosInsCount}条指令，最多${BIOS_MAX_INSTRUCTIONS}条`);
  }
  if (userInsCount > USER_APP_MAX_INSTRUCTIONS) {
    throw new Error(`用户程序段过长：${userInsCount}条指令，最多${USER_APP_MAX_INSTRUCTIONS}条`);
  }
  if (intEntryInsCount > INT_ENTRY_MAX_INSTRUCTIONS) {
    throw new Error(`中断处理程序入口过长：${intEntryInsCount}条指令，最多${INT_ENTRY_MAX_INSTRUCTIONS}条`);
  }
  if (intHandlerInsCount > INT_HANDLER_MAX_INSTRUCTIONS) {
    throw new Error(`中断处理程序过长：${intHandlerInsCount}条指令，最多${INT_HANDLER_MAX_INSTRUCTIONS}条`);
  }

  // 计算填充的nop指令数
  const biosNopPadding = BIOS_MAX_INSTRUCTIONS - biosInsCount;
  const userNopPadding = USER_APP_MAX_INSTRUCTIONS - userInsCount;
  const middleEmptyNopPadding = MIDDLE_EMPTY_INSTRUCTIONS;
  const intEntryNopPadding = INT_ENTRY_MAX_INSTRUCTIONS - intEntryInsCount;
  const intHandlerNopPadding = INT_HANDLER_MAX_INSTRUCTIONS - intHandlerInsCount;

  // 验证总长度
  const totalLength =
    biosInsCount +
    biosNopPadding +
    userInsCount +
    userNopPadding +
    middleEmptyNopPadding +
    intEntryInsCount +
    intEntryNopPadding +
    intHandlerInsCount +
    intHandlerNopPadding;

  if (totalLength * 4 !== TOTAL_MEMORY_SIZE) {
    throw new Error(`IMEM布局总长度不正确：有 ${totalLength * 4} Bytes，应为 ${TOTAL_MEMORY_SIZE} Bytes`);
  }

  // 构建链接后的完整程序
  let allProgram = '';

  // BIOS段
  allProgram += '# ====== BIOS START ======\n';
  allProgram += `# BIOS Length = ${biosInsCount}\n`;
  allProgram += biosASM + '\n';
  if (biosNopPadding > 0) {
    allProgram += `# BIOS Padding = ${biosNopPadding}\n`;
    allProgram += 'nop\n'.repeat(biosNopPadding);
  }
  allProgram += '# ====== BIOS END ======\n\n';

  // 用户程序段
  allProgram += '# ====== User Application START ======\n';
  allProgram += `# User Application Length = ${userInsCount}\n`;
  allProgram += userASM + '\n';
  if (userNopPadding > 0) {
    allProgram += `# User Application Padding = ${userNopPadding}\n`;
    allProgram += 'nop\n'.repeat(userNopPadding);
  }
  allProgram += '# ====== User Application END ======\n\n';

  // 中间空区域
  allProgram += '# ====== Empty Region START ======\n';
  allProgram += `# Empty Region Length = ${middleEmptyNopPadding}\n`;
  allProgram += 'nop\n'.repeat(middleEmptyNopPadding);
  allProgram += '# ====== Empty Region END ======\n\n';

  // 中断入口段
  allProgram += '# ====== Interrupt Entry START ======\n';
  allProgram += `# Interrupt Entry Length = ${intEntryInsCount}\n`;
  allProgram += intEntryASM + '\n';
  if (intEntryNopPadding > 0) {
    allProgram += `# Interrupt Entry Padding = ${intEntryNopPadding}\n`;
    allProgram += 'nop\n'.repeat(intEntryNopPadding);
  }
  allProgram += '# ====== Interrupt Entry END ======\n\n';

  // 中断处理程序段
  allProgram += '# ====== Interrupt Handler START ======\n';
  allProgram += `# Interrupt Handler Length = ${intHandlerInsCount}\n`;
  allProgram += intHandlerASM + '\n';
  if (intHandlerNopPadding > 0) {
    allProgram += `# Interrupt Handler Padding = ${intHandlerNopPadding}\n`;
    allProgram += 'nop\n'.repeat(intHandlerNopPadding);
  }
  allProgram += '# ====== Interrupt Handler END ======\n';

  return allProgram;
}

/**
 * 从文件读取BIOS、中断处理程序等系统文件
 */
export function loadSystemFiles(snippetDir?: string): {
  bios: string;
  intEntry: string;
  intHandler: string;
} {
  // 如果snippetDir未提供，尝试从多个可能的位置查找
  let defaultSnippetDir = snippetDir;
  if (!defaultSnippetDir) {
    // 尝试从编译后的位置查找
    const possiblePaths = [
      path.join(__dirname, '../snippet'), // 编译后的位置
      path.join(__dirname, '../../src/snippet'), // 如果__dirname在dist/linker下
      path.join(process.cwd(), 'src/snippet'), // 从项目根目录
      path.join(process.cwd(), 'advanced-minisys-assembler/src/snippet') // 从工作区根目录
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(path.join(possiblePath, 'minisys-bios.asm'))) {
        defaultSnippetDir = possiblePath;
        break;
      }
    }
    
    if (!defaultSnippetDir) {
      // 如果都找不到，使用默认路径
      defaultSnippetDir = path.join(__dirname, '../snippet');
    }
  }
  
  const biosPath = path.join(defaultSnippetDir, 'minisys-bios.asm');
  const intEntryPath = path.join(defaultSnippetDir, 'minisys-interrupt-entry.asm');
  const intHandlerPath = path.join(defaultSnippetDir, 'minisys-interrupt-handler.asm');

  if (!fs.existsSync(biosPath)) {
    throw new Error(`BIOS文件不存在: ${biosPath}`);
  }
  if (!fs.existsSync(intEntryPath)) {
    throw new Error(`中断入口文件不存在: ${intEntryPath}`);
  }
  if (!fs.existsSync(intHandlerPath)) {
    throw new Error(`中断处理程序文件不存在: ${intHandlerPath}`);
  }

  return {
    bios: fs.readFileSync(biosPath, 'utf-8'),
    intEntry: fs.readFileSync(intEntryPath, 'utf-8'),
    intHandler: fs.readFileSync(intHandlerPath, 'utf-8')
  };
}
