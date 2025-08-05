# Wordle Helper Chrome Extension

一个智能的 Chrome 扩展，通过截图识别 Wordle 游戏状态并使用信息熵算法推荐最优猜词。

## 功能特点

- 📸 **智能截图识别**：一键截取游戏区域，自动识别游戏状态
- 🎯 **信息熵推荐算法**：基于信息论的最优策略，最大化每次猜测的信息增益
- 📚 **多长度支持**：支持 3-11 字母的 Wordle 变体游戏
- 🌐 **词义查询**：集成词典 API，提供单词释义（中文翻译）
- 📊 **统计分析**：实时显示剩余可能答案数和字母使用频率

## 安装方法

### 开发环境安装

1. 克隆项目
```bash
git clone <repository-url>
cd wordle_extension
```

2. 安装依赖
```bash
npm install
```

3. 生成插件图标
- 在浏览器中打开 `assets/create-icons.html`
- 图标会自动下载，将其放入 `assets` 目录

4. 构建项目
```bash
npm run build
```

5. 在 Chrome 中加载扩展
- 打开 Chrome 扩展管理页面 (chrome://extensions/)
- 开启"开发者模式"
- 点击"加载已解压的扩展程序"
- 选择项目的 `dist` 目录

## 使用方法

1. **开始游戏**：打开 Wordle 游戏网站
2. **截图识别**：点击扩展图标，然后点击"开始截图识别"
3. **框选区域**：使用鼠标框选 Wordle 游戏区域
4. **查看推荐**：扩展会自动识别游戏状态并显示推荐词
5. **查看词义**：点击推荐词可查看详细释义

## 技术架构

### 前端技术栈
- React 18 + TypeScript
- Tailwind CSS + Radix UI
- Zustand 状态管理
- Vite 构建工具

### 核心技术
- **图像识别**：Canvas 颜色分析 + Tesseract.js OCR
- **推荐算法**：信息熵最大化策略
- **Chrome Extension**：Manifest V3

### 项目结构
```
src/
├── popup/          # 插件弹出界面
├── content/        # 内容脚本（截图功能）
├── background/     # 后台服务（图像处理）
├── components/     # React 组件
├── services/       # 核心服务
│   ├── imageRecognition.ts    # 图像识别
│   ├── recommendationEngine.ts # 推荐算法
│   ├── wordlistService.ts     # 词库管理
│   └── dictionaryService.ts   # 词典查询
├── stores/         # 状态管理
└── types/          # TypeScript 类型定义
```

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 格式化代码
npm run format

# 类型检查
npm run typecheck
```

## 算法说明

### 信息熵推荐算法

插件使用信息熵最大化策略来推荐最优猜词：

1. **约束提取**：从游戏状态中提取已知信息（正确位置、存在但位置错误、不存在的字母）
2. **候选过滤**：根据约束条件过滤出所有可能的答案
3. **熵值计算**：对每个候选词，计算其可能产生的反馈模式分布，计算信息熵
4. **推荐排序**：按信息熵降序排列，推荐能最大程度缩小答案空间的词

### 图像识别流程

1. **网格检测**：使用边缘检测算法识别游戏网格结构
2. **颜色识别**：分析每个格子的平均颜色，判断字母状态
3. **字母识别**：使用 Tesseract.js 进行 OCR 识别
4. **状态合成**：组合所有信息生成完整的游戏状态

## 注意事项

- 插件仅用于辅助游戏，请遵守 Wordle 游戏规则
- 截图数据仅在本地处理，不会上传到服务器
- 词库可能不完整，持续优化中

## 待优化项

- [ ] 增加更完整的词库
- [ ] 优化 OCR 识别准确率
- [ ] 添加中文词义翻译 API
- [ ] 支持更多 Wordle 变体游戏
- [ ] 添加深色模式支持

## License

MIT