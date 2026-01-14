/**
 * 高级汇编器入口文件
 * 提供命令行接口和程序化API
 */

import { Command } from 'commander';
import { AdvancedAssembler, AssemblerConfig } from './assembler';
import { OutputFormat } from './output/formatter';
import { linkAll, loadSystemFiles } from './linker/linker';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// 命令行程序
const program = new Command();

program
  .name('advanced-minisys-assembler')
  .description('Advanced Minisys-1A Assembler with Modern Architecture')
  .version('2.0.0');

program
  .argument('<input>', 'Input assembly file')
  .option('-o, --output <dir>', 'Output directory', './output')
  .option('-f, --format <format>', 'Output format (coe, hex, bin, elf, json)', 'coe')
  .option('--uart', 'Generate files for UART programming (bin and elf)', false)
  .option('-l, --link', 'Link with BIOS and interrupt handlers', false)
  .option('-i, --interrupt-files', 'Look for custom interrupt files (minisys-interrupt-entry.asm and minisys-interrupt-handler.asm) in input file directory', true)
  .option('-r, --report', 'Generate assembly report', true)
  .option('-d, --disassembly', 'Generate disassembly', false)
  .option('-v, --verbose', 'Verbose output', false)
  .option('--no-report', 'Disable assembly report')
  .action(async (input: string, options: any) => {
    try {
      // 检查输入文件
      if (!fs.existsSync(input)) {
        console.error(chalk.red(`错误：未找到输入文件 '${input}'`));
        process.exit(1);
      }

      // 读取源代码
      let source = fs.readFileSync(input, 'utf8');
      
      // 如果启用链接功能
      if (options.link) {
        if (options.verbose) {
          console.log(chalk.blue('已启用链接模式'));
          console.log('  正在加载BIOS和中断处理程序...');
        }

        try {
          // 确定中断文件的路径
          let customIntEntryPath: string | undefined;
          let customIntHandlerPath: string | undefined;
          
          // 检查是否启用自定义中断文件查找（默认为 true）
          // 如果用户未指定 -i，options.interruptFiles 为 undefined，我们将其视为 true
          // 如果用户指定了 -i，options.interruptFiles 为 true
          // 如果用户指定了 --no-interrupt-files，options.interruptFiles 为 false
          const useCustomInterruptFiles = options.interruptFiles !== false;
          
          if (useCustomInterruptFiles) {
            const inputDir = path.dirname(path.resolve(input));
            const customIntEntry = path.join(inputDir, 'minisys-interrupt-entry.asm');
            const customIntHandler = path.join(inputDir, 'minisys-interrupt-handler.asm');
            
            // 检查自定义文件是否存在
            if (fs.existsSync(customIntEntry) && fs.existsSync(customIntHandler)) {
              customIntEntryPath = customIntEntry;
              customIntHandlerPath = customIntHandler;
              if (options.verbose) {
                console.log(chalk.green(`  使用自定义中断文件，来源：${inputDir}`));
                console.log(`    - ${path.basename(customIntEntry)}`);
                console.log(`    - ${path.basename(customIntHandler)}`);
              }
            } else {
              if (options.verbose) {
                console.log(chalk.yellow(`  在以下位置未找到自定义中断文件：${inputDir}`));
                console.log('  使用默认中断文件');
              }
            }
          } else {
            if (options.verbose) {
              console.log('  已禁用自定义中断文件，使用默认文件');
            }
          }
          
          // 加载系统文件
          const snippetDir = path.join(__dirname, '../snippet');
          const systemFiles = loadSystemFiles(snippetDir, customIntEntryPath, customIntHandlerPath);

          // 提取用户程序的数据段和代码段
          const userLines = source.replace(/\r\n/g, '\n').trim().split('\n');
          const dataSegStartLine = userLines.findIndex(v => v.match(/\.data/));
          const textSegStartLine = userLines.findIndex(v => v.match(/\.text/));

          if (dataSegStartLine === -1) {
            throw new Error('未找到数据段开始');
          }
          if (textSegStartLine === -1) {
            throw new Error('未找到代码段开始');
          }
          if (dataSegStartLine >= textSegStartLine) {
            throw new Error('数据段不能位于代码段之后');
          }

          // 提取数据段和代码段
          const dataSegment = userLines.slice(dataSegStartLine, textSegStartLine).join('\n');
          const textSegment = userLines.slice(textSegStartLine + 1).join('\n');

          // 链接所有部分
          const linkedTextSegment = linkAll(
            systemFiles.bios,
            textSegment,
            systemFiles.intEntry,
            systemFiles.intHandler
          );

          // 组合完整的程序（数据段 + 链接后的代码段）
          source = dataSegment + '\n.text\n' + linkedTextSegment;

          // 保存链接后的汇编文件
          const linkedAsmPath = path.join(options.output, 'linked.asm');
          if (!fs.existsSync(options.output)) {
            fs.mkdirSync(options.output, { recursive: true });
          }
          fs.writeFileSync(linkedAsmPath, source, 'utf8');

          // 设置用户程序偏移（用于标签地址计算）
          // 在链接模式下，用户程序从0x500开始，标签地址需要加上这个偏移
          // 注意：这个偏移需要在解析阶段使用，但我们现在在链接阶段
          // 实际上，链接后的代码已经包含了正确的地址布局，所以不需要额外偏移

          if (options.verbose) {
            console.log(chalk.green('  链接完成'));
            console.log(`  链接后的汇编文件已保存至：${linkedAsmPath}`);
          }
        } catch (error) {
          console.error(chalk.red(`链接错误：${error instanceof Error ? error.message : '未知错误'}`));
          process.exit(1);
        }
      }
      
      // 验证输出格式
      let format = options.format.toLowerCase();
      
      // 如果指定了--uart选项，生成bin和elf文件
      if (options.uart) {
        format = 'uart'; // 特殊标记
      } else if (!Object.values(OutputFormat).includes(format as OutputFormat)) {
        console.error(chalk.red(`错误：无效的输出格式 '${format}'`));
        console.error(chalk.yellow(`支持的格式：${Object.values(OutputFormat).join(', ')}`));
        process.exit(1);
      }

      // 创建汇编器配置
      const config: AssemblerConfig = {
        outputFormat: (format === 'uart' ? OutputFormat.COE : format) as OutputFormat,
        generateReport: options.report,
        generateDisassembly: options.disassembly,
        optimizeCode: false,
        verbose: options.verbose,
        generateUartFiles: options.uart || false
      };

      // 创建汇编器
      const assembler = new AdvancedAssembler(config);

      if (options.verbose) {
        console.log(chalk.blue('Advanced Minisys-1A Assembler v2.0.0'));
        console.log(chalk.blue('====================================='));
        console.log(`输入文件：${input}`);
        console.log(`输出目录：${options.output}`);
        console.log(`输出格式：${format}`);
        console.log('');
      }

      // 执行汇编
      const result = assembler.assemble(source);

      if (result.success) {
        // 生成输出文件
        assembler.generateOutput(result, options.output);

        if (options.verbose) {
          console.log(chalk.green('汇编完成！'));
          console.log('');
          console.log(chalk.cyan('统计信息：'));
          console.log(`  指令数：${result.statistics.totalInstructions}`);
          console.log(`  数据字节数：${result.statistics.totalDataBytes}`);
          console.log(`  标签数：${result.statistics.totalLabels}`);
          console.log(`  处理时间：${result.statistics.processingTime}ms`);
          console.log(`  内存使用：${result.statistics.memoryUsage} bytes`);
          console.log('');
          console.log(chalk.cyan('生成的文件：'));
          if (config.outputFormat === OutputFormat.COE || config.generateUartFiles) {
            console.log(`  ${path.join(options.output, 'prgmip32.coe')} - 指令内存`);
            console.log(`  ${path.join(options.output, 'dmem32.coe')} - 数据内存`);
          }
          if (config.outputFormat === OutputFormat.HEX) {
            console.log(`  ${path.join(options.output, 'program.hex')} - 十六进制格式`);
          }
          if (config.outputFormat === OutputFormat.BIN || config.generateUartFiles) {
            console.log(`  ${path.join(options.output, 'program.bin')} - 二进制格式 (UART)`);
          }
          if (config.outputFormat === OutputFormat.ELF || config.generateUartFiles) {
            console.log(`  ${path.join(options.output, 'program.elf')} - ELF格式 (UART)`);
          }
          if (config.outputFormat === OutputFormat.JSON) {
            console.log(`  ${path.join(options.output, 'program.json')} - JSON格式`);
          }
          
          if (config.generateReport) {
            console.log(`  ${path.join(options.output, 'assembly_report.txt')} - 汇编报告`);
          }
          
          if (config.generateDisassembly) {
            console.log(`  ${path.join(options.output, 'disassembly.asm')} - 反汇编`);
          }
          
          console.log(`  ${path.join(options.output, 'symbol_table.txt')} - 符号表`);
        } else {
          console.log(chalk.green('汇编完成！'));
        }
      } else {
        console.error(chalk.red('汇编失败！'));
        console.error('');
        
        if (result.errors.length > 0) {
          console.error(chalk.red('错误：'));
          result.errors.forEach(error => {
            console.error(chalk.red(`  Line ${error.lineNumber}: ${error.message}`));
            if (error.sourceLine) {
              console.error(chalk.gray(`    ${error.sourceLine}`));
            }
          });
        }
        
        if (result.warnings.length > 0) {
          console.error('');
          console.error(chalk.yellow('警告：'));
          result.warnings.forEach(warning => {
            console.error(chalk.yellow(`  Line ${warning.lineNumber}: ${warning.message}`));
            if (warning.sourceLine) {
              console.error(chalk.gray(`    ${warning.sourceLine}`));
            }
          });
        }
        
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red(`致命错误：${error instanceof Error ? error.message : '未知错误'}`));
      process.exit(1);
    }
  });

// 程序化API
export { AdvancedAssembler, AssemblerConfig, OutputFormat };
export * from './core/types';
export * from './parser/lexer';
export * from './parser/parser';
export * from './codegen/encoder';
export * from './output/formatter';

// 如果直接运行此文件，启动命令行程序
if (require.main === module) {
  program.parse();
}
