/**
 * 高级汇编器主类
 * 整合所有组件，提供完整的汇编功能
 */

import { Parser } from './parser/parser';
import { Encoder } from './codegen/encoder';
import { Formatter, OutputFormat } from './output/formatter';
import { 
  AssemblyResult, 
  MemoryImage, 
  AssemblyStatistics
} from './core/types';

// 汇编器配置
export interface AssemblerConfig {
  outputFormat: OutputFormat;
  generateReport: boolean;
  generateDisassembly: boolean;
  optimizeCode: boolean;
  verbose: boolean;
}

// 默认配置
const DEFAULT_CONFIG: AssemblerConfig = {
  outputFormat: OutputFormat.COE,
  generateReport: true,
  generateDisassembly: false,
  optimizeCode: false,
  verbose: false
};

// 高级汇编器类
export class AdvancedAssembler {
  private config: AssemblerConfig;
  private parser: Parser;
  private encoder: Encoder | null = null;
  private formatter: Formatter | null = null;

  constructor(config: Partial<AssemblerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.parser = new Parser();
  }

  /**
   * 汇编源代码
   */
  public assemble(source: string): AssemblyResult {
    const startTime = Date.now();
    
    try {
      // 1. 解析阶段
      if (this.config.verbose) {
        console.log('Parsing source code...');
      }
      
      const context = this.parser.parse(source);
      
      if (context.errors.length > 0) {
        return {
          success: false,
          errors: context.errors,
          warnings: context.warnings,
          memoryImage: this.createEmptyMemoryImage(),
          symbolTable: context.globalLabels,
          statistics: this.createEmptyStatistics()
        };
      }

      // 2. 编码阶段
      if (this.config.verbose) {
        console.log('Encoding instructions...');
      }
      
      this.encoder = new Encoder(context);
      const { memoryImage, errors: encodingErrors, statistics } = this.encoder.encode();
      
      if (encodingErrors.length > 0) {
        return {
          success: false,
          errors: [...context.errors, ...encodingErrors],
          warnings: context.warnings,
          memoryImage,
          symbolTable: context.globalLabels,
          statistics
        };
      }

      // 3. 格式化阶段
      if (this.config.verbose) {
        console.log('Formatting output...');
      }
      
      this.formatter = new Formatter(memoryImage);

      const endTime = Date.now();
      const finalStatistics: AssemblyStatistics = {
        ...statistics,
        processingTime: endTime - startTime
      };

      return {
        success: true,
        errors: [],
        warnings: context.warnings,
        memoryImage,
        symbolTable: context.globalLabels,
        statistics: finalStatistics
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        errors: [{
          type: 'RUNTIME',
          message: `Assembly failed: ${errorMessage}`,
          lineNumber: 0,
          sourceLine: ''
        }],
        warnings: [],
        memoryImage: this.createEmptyMemoryImage(),
        symbolTable: new Map(),
        statistics: this.createEmptyStatistics()
      };
    }
  }

  /**
   * 生成输出文件
   */
  public generateOutput(result: AssemblyResult, outputDir: string): void {
    if (!result.success || !this.formatter) {
      throw new Error('Cannot generate output for failed assembly');
    }

    const fs = require('fs');
    const path = require('path');

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成指令内存COE文件
    const instructionCOE = this.formatter.toCOE();
    fs.writeFileSync(path.join(outputDir, 'prgmip32.coe'), instructionCOE);

    // 生成数据内存COE文件
    const dataCOE = this.formatter.toDataCOE();
    fs.writeFileSync(path.join(outputDir, 'dmem32.coe'), dataCOE);

    // 生成十六进制文件
    const hexOutput = this.formatter.toHex();
    fs.writeFileSync(path.join(outputDir, 'program.hex'), hexOutput);

    // 生成JSON文件
    const jsonOutput = this.formatter.toJSON();
    fs.writeFileSync(path.join(outputDir, 'program.json'), jsonOutput);

    // 生成汇编报告
    if (this.config.generateReport) {
      const report = this.formatter.generateReport();
      fs.writeFileSync(path.join(outputDir, 'assembly_report.txt'), report);
    }

    // 生成反汇编代码
    if (this.config.generateDisassembly) {
      const disassembly = this.formatter.disassemble();
      fs.writeFileSync(path.join(outputDir, 'disassembly.asm'), disassembly);
    }

    // 生成符号表
    const symbolTable = this.generateSymbolTable(result.symbolTable);
    fs.writeFileSync(path.join(outputDir, 'symbol_table.txt'), symbolTable);
  }

  /**
   * 生成符号表
   */
  private generateSymbolTable(symbolTable: Map<string, any>): string {
    const lines: string[] = [];
    
    lines.push('=== Symbol Table ===');
    lines.push('');
    
    const sortedSymbols = Array.from(symbolTable.entries()).sort((a, b) => a[1].address - b[1].address);
    
    for (const [name, symbol] of sortedSymbols) {
      lines.push(`${name}: 0x${symbol.address.toString(16).toUpperCase().padStart(8, '0')} (line ${symbol.lineNumber})`);
    }
    
    return lines.join('\n');
  }

  /**
   * 创建空的内存映像
   */
  private createEmptyMemoryImage(): MemoryImage {
    return {
      instructionMemory: [],
      dataMemory: [],
      instructionCount: 0,
      dataSize: 0,
      entryPoint: 0
    };
  }

  /**
   * 创建空的统计信息
   */
  private createEmptyStatistics(): AssemblyStatistics {
    return {
      totalInstructions: 0,
      totalDataBytes: 0,
      totalLabels: 0,
      processingTime: 0,
      memoryUsage: 0
    };
  }

  /**
   * 设置配置
   */
  public setConfig(config: Partial<AssemblerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  public getConfig(): AssemblerConfig {
    return { ...this.config };
  }

  /**
   * 验证汇编器状态
   */
  public validate(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查配置
    if (!Object.values(OutputFormat).includes(this.config.outputFormat)) {
      issues.push('Invalid output format');
    }

    // 检查组件
    if (!this.parser) {
      issues.push('Parser not initialized');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 获取版本信息
   */
  public getVersion(): string {
    return '2.0.0';
  }

  /**
   * 获取支持的输出格式
   */
  public getSupportedFormats(): OutputFormat[] {
    return Object.values(OutputFormat);
  }
}
