# Advanced Minisys-1A Assembler

一个现代化的Minisys-1A汇编器，采用TypeScript开发，具有全新的架构设计和丰富的功能特性。

## 特性

- 🚀 **现代化架构**: 采用模块化设计，易于扩展和维护
- 📝 **完整指令集**: 支持Minisys-1A处理器的完整指令集
- 🔧 **多种输出格式**: 支持COE、HEX、BIN、JSON等多种输出格式
- 📊 **详细报告**: 生成汇编报告、符号表、反汇编代码
- ⚡ **高性能**: 优化的解析和编码算法
- 🛠️ **易于使用**: 提供命令行接口和程序化API

## 架构设计

### 核心组件

1. **词法分析器 (Lexer)**: 将源代码分解为标记流
2. **语法分析器 (Parser)**: 构建抽象语法树
3. **代码生成器 (Encoder)**: 将AST转换为机器码
4. **输出格式化器 (Formatter)**: 生成各种格式的输出文件

### 设计原则

- **单一职责**: 每个组件专注于特定功能
- **开闭原则**: 易于扩展新功能
- **依赖注入**: 组件间松耦合
- **类型安全**: 完整的TypeScript类型系统

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

## 使用方法

### 命令行接口

```bash
# 基本用法
node dist/index.js input.asm

# 指定输出目录
node dist/index.js input.asm -o ./output

# 指定输出格式
node dist/index.js input.asm -f hex

# 生成详细报告
node dist/index.js input.asm -r -d -v
```

### 程序化API

```typescript
import { AdvancedAssembler, OutputFormat } from './src/index';

const assembler = new AdvancedAssembler({
  outputFormat: OutputFormat.COE,
  generateReport: true,
  verbose: true
});

const result = assembler.assemble(sourceCode);

if (result.success) {
  assembler.generateOutput(result, './output');
  console.log('Assembly completed successfully!');
} else {
  console.error('Assembly failed:', result.errors);
}
```

## 支持的指令

### R型指令
- `add`, `sub`, `and`, `or`, `slt`
- `jr`, `mult`, `div`, `mfhi`, `mflo`

### I型指令
- `addi`, `addiu`, `andi`, `ori`, `lui`
- `lw`, `sw`, `beq`, `bne`

### J型指令
- `j`, `jal`

### 伪指令
- `move`, `li`, `la`, `push`, `pop`

## 输出格式

### COE格式
Xilinx FPGA内存初始化文件格式，用于指令和数据内存。

### HEX格式
十六进制格式，便于调试和验证。

### JSON格式
结构化数据格式，便于程序处理。

### 二进制格式
原始二进制格式，用于直接加载到内存。

## 项目结构

```
src/
├── core/           # 核心类型定义
├── parser/         # 词法分析和语法分析
├── codegen/        # 代码生成
├── output/         # 输出格式化
├── assembler.ts    # 主汇编器类
└── index.ts        # 入口文件
```

## 开发

### 运行测试

```bash
npm test
```

### 开发模式

```bash
npm run dev
```

### 代码检查

```bash
npm run lint
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 更新日志

### v2.0.0
- 全新的架构设计
- 完整的TypeScript类型系统
- 多种输出格式支持
- 详细的汇编报告
- 命令行和程序化API
