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
 * 合并用户自定义的中断入口文件与默认的 syscall 部分
 * 用户只能定义中断号 0-4，syscall（中断号5）是固定的
 */
function mergeInterruptEntry(
  userEntryContent: string,
  syscallEntryLine: string
): string {
  const lines = userEntryContent.split('\n');
  const resultLines: string[] = [];
  
  // 提取用户定义的中断向量（最多 5 个：0-4）
  // 只提取 j 指令或 nop 指令，忽略注释和其他内容
  let userVectorCount = 0;
  let hasStartedVectors = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // 如果是注释或空行，在向量定义之前保留
    if (!trimmed || trimmed.startsWith('#')) {
      if (!hasStartedVectors) {
        resultLines.push(line);
      }
      continue;
    }
    
    // 检查是否是中断向量（j 指令或 nop）
    if (trimmed.startsWith('j ') || trimmed === 'nop' || trimmed.startsWith('nop ')) {
      hasStartedVectors = true;
      if (userVectorCount < 5) {
        resultLines.push(line);
        userVectorCount++;
      }
    } else {
      // 其他行（如标签）在向量定义之前保留
      if (!hasStartedVectors) {
        resultLines.push(line);
      }
    }
  }
  
  // 如果用户没有定义满 5 个中断向量，用 nop 填充
  while (userVectorCount < 5) {
    resultLines.push('nop');
    userVectorCount++;
  }
  
  // 追加 syscall 的中断向量（中断号5）
  resultLines.push(syscallEntryLine);
  
  return resultLines.join('\n');
}

/**
 * 合并用户自定义的中断处理程序与默认的 syscall 处理程序
 * 用户只能定义 interruptServer0-interruptServer4，_syscall 是固定的
 */
function mergeInterruptHandler(
  userHandlerContent: string,
  defaultHandlerContent: string
): string {
  // 提取默认的 _syscall 部分
  const defaultLines = defaultHandlerContent.split('\n');
  let syscallStartIndex = -1;
  
  for (let i = 0; i < defaultLines.length; i++) {
    const line = defaultLines[i].trim();
    if (line === '_syscall:' || line.startsWith('_syscall:')) {
      syscallStartIndex = i;
      break;
    }
  }
  
  // 提取 _syscall 部分的完整内容（从 _syscall: 标签到文件末尾）
  const syscallPart = syscallStartIndex !== -1 
    ? defaultLines.slice(syscallStartIndex).join('\n').trim()
    : '';
  
  // 合并用户处理程序和 syscall 处理程序
  // 移除用户文件中可能存在的 _syscall 标签和处理程序
  const userLines = userHandlerContent.split('\n');
  const cleanedUserLines: string[] = [];
  let inSyscallSection = false;
  
  for (const line of userLines) {
    const trimmed = line.trim();
    
    // 如果遇到 _syscall 标签，开始跳过
    if (trimmed === '_syscall:' || trimmed.startsWith('_syscall:')) {
      inSyscallSection = true;
      continue; // 跳过用户定义的 _syscall 标签
    }
    
    // 如果遇到下一个标签（但不是 _syscall），结束 _syscall 部分
    if (inSyscallSection && trimmed && !trimmed.startsWith('#') && trimmed.endsWith(':')) {
      if (!trimmed.startsWith('_syscall')) {
        inSyscallSection = false;
        cleanedUserLines.push(line); // 保留下一个标签
      }
      continue;
    }
    
    // 如果不在 _syscall 部分，保留该行
    if (!inSyscallSection) {
      cleanedUserLines.push(line);
    }
  }
  
  // 组合结果：用户定义的处理程序 + 默认的 _syscall 部分
  let result = cleanedUserLines.join('\n').trim();
  if (syscallPart) {
    // 确保结果以换行结尾，然后添加 _syscall 部分
    if (result && !result.endsWith('\n')) {
      result += '\n';
    }
    result += '\n' + syscallPart;
  }
  
  return result;
}

/**
 * 从文件读取BIOS、中断处理程序等系统文件
 * @param snippetDir 默认的snippet目录（用于BIOS和默认的中断文件）
 * @param customIntEntryPath 自定义的中断入口文件路径（可选）
 * @param customIntHandlerPath 自定义的中断处理程序文件路径（可选）
 */
export function loadSystemFiles(
  snippetDir?: string,
  customIntEntryPath?: string,
  customIntHandlerPath?: string
): {
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
  
  // 确定中断入口和处理程序文件的路径
  // 如果提供了自定义路径且文件存在，使用自定义路径；否则使用默认路径
  let intEntryPath: string;
  let intHandlerPath: string;
  
  if (customIntEntryPath && fs.existsSync(customIntEntryPath)) {
    intEntryPath = customIntEntryPath;
  } else {
    intEntryPath = path.join(defaultSnippetDir, 'minisys-interrupt-entry.asm');
  }
  
  if (customIntHandlerPath && fs.existsSync(customIntHandlerPath)) {
    intHandlerPath = customIntHandlerPath;
  } else {
    intHandlerPath = path.join(defaultSnippetDir, 'minisys-interrupt-handler.asm');
  }

  if (!fs.existsSync(biosPath)) {
    throw new Error(`BIOS文件不存在: ${biosPath}`);
  }
  
  // 读取默认的中断文件（用于提取 syscall 部分）
  const defaultIntEntryPath = path.join(defaultSnippetDir, 'minisys-interrupt-entry.asm');
  const defaultIntHandlerPath = path.join(defaultSnippetDir, 'minisys-interrupt-handler.asm');
  
  if (!fs.existsSync(defaultIntEntryPath)) {
    throw new Error(`默认中断入口文件不存在: ${defaultIntEntryPath}`);
  }
  if (!fs.existsSync(defaultIntHandlerPath)) {
    throw new Error(`默认中断处理程序文件不存在: ${defaultIntHandlerPath}`);
  }
  
  const defaultIntEntry = fs.readFileSync(defaultIntEntryPath, 'utf-8');
  const defaultIntHandler = fs.readFileSync(defaultIntHandlerPath, 'utf-8');
  
  // 提取默认的 syscall 中断向量（中断号5）
  const defaultEntryLines = defaultIntEntry.split('\n');
  let syscallEntryLine = 'j _syscall            # 中断号5：syscall（作为异常处理）（0xF000 + 5*4 = 0xF014）';
  for (const line of defaultEntryLines) {
    if (line.includes('_syscall') && line.trim().startsWith('j')) {
      syscallEntryLine = line.trim();
      break;
    }
  }
  
  let finalIntEntry: string;
  let finalIntHandler: string;
  
  // 如果提供了自定义文件，需要合并
  if (customIntEntryPath && customIntHandlerPath && 
      fs.existsSync(customIntEntryPath) && fs.existsSync(customIntHandlerPath)) {
    const userIntEntry = fs.readFileSync(customIntEntryPath, 'utf-8');
    const userIntHandler = fs.readFileSync(customIntHandlerPath, 'utf-8');
    
    // 合并中断入口文件（用户定义的 0-4 + 默认的 syscall）
    finalIntEntry = mergeInterruptEntry(userIntEntry, syscallEntryLine);
    
    // 合并中断处理程序文件（用户定义的 + 默认的 _syscall）
    finalIntHandler = mergeInterruptHandler(userIntHandler, defaultIntHandler);
  } else {
    // 使用默认文件
    finalIntEntry = defaultIntEntry;
    finalIntHandler = defaultIntHandler;
  }

  return {
    bios: fs.readFileSync(biosPath, 'utf-8'),
    intEntry: finalIntEntry,
    intHandler: finalIntHandler
  };
}
