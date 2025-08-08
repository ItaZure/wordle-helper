# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Custom AI Development Team

This project has specialized AI agents configured for optimal development. Use `/ai` to engage the team.

### Available Specialists

1. **chrome-extension-architect** (model: sonnet)
   - Chrome Extension Manifest V3 architecture
   - Cross-context messaging and Chrome APIs
   - Performance optimization

2. **ocr-recognition-specialist** (model: opus)
   - Tesseract.js OCR implementation
   - Image preprocessing algorithms
   - Multi-website color scheme detection

3. **wordle-algorithm-expert** (model: opus)
   - Information entropy calculations
   - Constraint-based filtering
   - Optimal word recommendations

4. **react-ui-developer** (model: sonnet)
   - React 18 + TypeScript components
   - Tailwind CSS styling
   - Radix UI integration

5. **zustand-state-manager** (model: sonnet)
   - Zustand store architecture
   - Chrome storage persistence
   - Cross-context state sync

6. **extension-testing-specialist** (model: sonnet)
   - Jest test suites
   - OCR accuracy benchmarks
   - E2E extension testing

### Usage Examples
```bash
/ai "improve OCR accuracy for thin letters"     # Engages ocr-recognition-specialist
/ai "optimize entropy calculation performance"   # Engages wordle-algorithm-expert
/ai "add dark mode to popup interface"          # Engages react-ui-developer
```

## 项目概述

这是一个Chrome浏览器扩展，用于辅助Wordle游戏。通过截图识别游戏状态，使用信息熵算法推荐最优猜词。

技术栈：React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Chrome Extension Manifest V3

## 常用开发命令

```bash
# 开发
npm run dev          # 启动开发服务器（支持热重载）

# 构建
npm run build        # 构建生产版本到dist目录

# 测试
npm run test         # 运行所有测试
npm run test:watch   # 监听模式运行测试
npm run test:coverage # 生成测试覆盖率报告

# 代码质量
npm run lint         # ESLint检查
npm run format       # Prettier格式化
npm run typecheck    # TypeScript类型检查
```

## 架构设计

### 核心模块结构
```
src/
├── popup/              # 扩展弹出界面入口
├── content/            # 内容脚本（截图功能）
├── background/         # 后台服务（图像处理）
├── components/         # React组件
├── services/           # 核心业务逻辑
│   ├── imageRecognition.ts      # 截图识别
│   ├── recommendationEngine.ts   # 信息熵推荐算法
│   ├── wordlistService.ts        # 词库管理
│   └── dictionaryService.ts      # 词典API集成
├── stores/             # Zustand状态管理
└── types/              # TypeScript类型定义
```

### 关键技术实现

1. **图像识别流程**：
   - Canvas分析游戏格子颜色状态
   - Tesseract.js OCR识别字母
   - 解析为游戏状态数据结构

2. **推荐算法**：
   - 基于信息熵最大化原理
   - 计算每个候选词的期望信息增益
   - 返回熵值最高的推荐词

3. **状态管理**：
   - 使用Zustand管理全局状态
   - 支持游戏状态持久化到Chrome Storage

## 开发规范

1. **测试驱动**：新功能必须有对应测试，测试通过后才能继续开发
2. **模块化设计**：保持高内聚低耦合，功能相关代码放在一起
3. **DRY原则**：通过抽象避免代码重复
4. **类型安全**：充分利用TypeScript，避免any类型

## 注意事项

- 测试文件统一放在 `src/**/__tests__/` 目录下，不要在根目录创建新的测试文件
- 图标文件通过 `assets/create-icons.html` 生成，不要手动编辑
- 词库文件位于 `public/wordlists/`，支持3-11字母长度
- Chrome扩展相关API已有完整的Mock配置在 `__mocks__/chrome.ts`