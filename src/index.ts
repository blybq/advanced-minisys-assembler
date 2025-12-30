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
  .option('-r, --report', 'Generate assembly report', true)
  .option('-d, --disassembly', 'Generate disassembly', false)
  .option('-v, --verbose', 'Verbose output', false)
  .option('--no-report', 'Disable assembly report')
  .action(async (input: string, options: any) => {
    try {
      // 检查输入文件
      if (!fs.existsSync(input)) {
        console.error(chalk.red(`Error: Input file '${input}' not found`));
        process.exit(1);
      }

      // 读取源代码
      let source = fs.readFileSync(input, 'utf8');
      
      // 如果启用链接功能
      if (options.link) {
        if (options.verbose) {
          console.log(chalk.blue('Linking mode enabled'));
          console.log('  Loading BIOS and interrupt handlers...');
        }

        try {
          // 加载系统文件
          const snippetDir = path.join(__dirname, '../snippet');
          const systemFiles = loadSystemFiles(snippetDir);

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
            console.log(chalk.green('  Linking completed'));
            console.log(`  Linked assembly saved to: ${linkedAsmPath}`);
          }
        } catch (error) {
          console.error(chalk.red(`Link error: ${error instanceof Error ? error.message : 'Unknown error'}`));
          process.exit(1);
        }
      }
      
      // 验证输出格式
      let format = options.format.toLowerCase();
      
      // 如果指定了--uart选项，生成bin和elf文件
      if (options.uart) {
        format = 'uart'; // 特殊标记
      } else if (!Object.values(OutputFormat).includes(format as OutputFormat)) {
        console.error(chalk.red(`Error: Invalid output format '${format}'`));
        console.error(chalk.yellow(`Supported formats: ${Object.values(OutputFormat).join(', ')}`));
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
        console.log(`Input file: ${input}`);
        console.log(`Output directory: ${options.output}`);
        console.log(`Output format: ${format}`);
        console.log('');
      }

      // 执行汇编
      const result = assembler.assemble(source);

      if (result.success) {
        // 生成输出文件
        assembler.generateOutput(result, options.output);

        if (options.verbose) {
          console.log(chalk.green('Assembly completed successfully!'));
          console.log('');
          console.log(chalk.cyan('Statistics:'));
          console.log(`  Instructions: ${result.statistics.totalInstructions}`);
          console.log(`  Data bytes: ${result.statistics.totalDataBytes}`);
          console.log(`  Labels: ${result.statistics.totalLabels}`);
          console.log(`  Processing time: ${result.statistics.processingTime}ms`);
          console.log(`  Memory usage: ${result.statistics.memoryUsage} bytes`);
          console.log('');
          console.log(chalk.cyan('Generated files:'));
          if (config.outputFormat === OutputFormat.COE || config.generateUartFiles) {
            console.log(`  ${path.join(options.output, 'prgmip32.coe')} - Instruction memory`);
            console.log(`  ${path.join(options.output, 'dmem32.coe')} - Data memory`);
          }
          if (config.outputFormat === OutputFormat.HEX) {
            console.log(`  ${path.join(options.output, 'program.hex')} - Hexadecimal format`);
          }
          if (config.outputFormat === OutputFormat.BIN || config.generateUartFiles) {
            console.log(`  ${path.join(options.output, 'program.bin')} - Binary format (UART)`);
          }
          if (config.outputFormat === OutputFormat.ELF || config.generateUartFiles) {
            console.log(`  ${path.join(options.output, 'program.elf')} - ELF format (UART)`);
          }
          if (config.outputFormat === OutputFormat.JSON) {
            console.log(`  ${path.join(options.output, 'program.json')} - JSON format`);
          }
          
          if (config.generateReport) {
            console.log(`  ${path.join(options.output, 'assembly_report.txt')} - Assembly report`);
          }
          
          if (config.generateDisassembly) {
            console.log(`  ${path.join(options.output, 'disassembly.asm')} - Disassembly`);
          }
          
          console.log(`  ${path.join(options.output, 'symbol_table.txt')} - Symbol table`);
        } else {
          console.log(chalk.green('Assembly completed successfully!'));
        }
      } else {
        console.error(chalk.red('Assembly failed!'));
        console.error('');
        
        if (result.errors.length > 0) {
          console.error(chalk.red('Errors:'));
          result.errors.forEach(error => {
            console.error(chalk.red(`  Line ${error.lineNumber}: ${error.message}`));
            if (error.sourceLine) {
              console.error(chalk.gray(`    ${error.sourceLine}`));
            }
          });
        }
        
        if (result.warnings.length > 0) {
          console.error('');
          console.error(chalk.yellow('Warnings:'));
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
      console.error(chalk.red(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`));
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
