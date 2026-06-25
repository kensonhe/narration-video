# 解说视频生成器

**[English](README.md) | [中文](README_CN.md)**

> 将任意文章 URL 转化为专业解说视频，内置 AI 中文配音，基于 [Remotion](https://remotion.dev) + [MiniMax TTS](https://platform.minimax.io) 构建。

[![Remotion](https://img.shields.io/badge/Remotion-4.x-black)](https://remotion.dev)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 功能介绍

解说视频生成器是一个 [Claude Code](https://claude.ai/claude-code) 技能，自动化完整的视频制作流程：

```
文章 URL → 解说文案 → 语音合成 → 动画场景 → MP4 视频
```

**输入**：任意文章 URL（博客、微信公众号、新闻等）
**输出**：H.264 MP4 视频（1920×1080 横屏或 1080×1920 竖屏），带同步中文解说和字幕。

## 核心特性

- **全流程自动化** — 抓取文章、撰写文案、生成配音、构建动画场景、渲染视频，一次对话完成
- **4 套视觉主题** — 深色霓虹（科技感）、简约亮色（高级感）、暖色衬线（人文感）、活力渐变（年轻化）
- **5 种 AI 配音** — 温暖男声、商务男声、温暖女声、新闻女主播、纪录片解说
- **灵活时长** — 从 1 分钟速览到 5 分钟深度解读
- **横竖屏支持** — 横屏（1920×1080）适合 YouTube/桌面端，竖屏（1080×1920）适合抖音/小红书/快手
- **自动字幕** — 基于 TTS 音频自动生成句子级字幕同步
- **主题感知组件** — 所有视觉组件自适应所选主题，无硬编码颜色
- **丰富动画** — 粒子背景、渐变网格、文字揭示、弹性动画、进度条等

## 快速开始

### 前置要求

- 已安装 [Node.js](https://nodejs.org) 18+
- 拥有 [MiniMax API Key](https://platform.minimax.io)（用于语音合成）
- 已安装 [Claude Code](https://claude.ai/claude-code) 并加载此技能

### 使用方法

直接在 Claude Code 中输入：

```
帮我把这篇文章做成解说视频：https://example.com/article
```

或直接使用技能名称：

```
/narration-video
```

技能会引导你完成快速设置：

1. **API Key** — 输入 MiniMax API Key
2. **视频方向** — 横屏或竖屏
3. **视觉主题** — 从 4 种风格中选择
4. **配音声音** — 从 5 种中文配音中选择
5. **视频时长** — 速览、标准、深度、或自动

然后流程会自动运行 6 个阶段。

## 工作流程

| 阶段 | 说明 |
|------|------|
| **0. 收集需求** | 交互式设置 — 方向、主题、声音、时长 |
| **1. 抓取分析** | 下载并解析文章内容 |
| **2. 撰写文案** | 生成中文逐场景解说脚本 |
| **3. 搭建项目** | 初始化 Remotion 项目，配置模板和组件 |
| **4. 生成音频** | 调用 MiniMax TTS API 生成每个场景的 MP3 音频 + 自动字幕 |
| **5. 渲染视频** | 构建 React 动画场景并通过 Remotion 渲染为 MP4 |
| **6. 交付视频** | 报告输出、打开视频、提供调整选项 |

## 视觉主题

| 主题 | 模式 | 风格 | 适用场景 |
|------|------|------|----------|
| **Bold Signal** | 深色 | 霓虹橙光效、玻璃卡片 | 科技、硬核内容 |
| **Clean Light** | 亮色 | 简约蓝色点缀、实心卡片 | 知识、金融、高端 |
| **Editorial** | 亮色 | 暖色衬线体、纸质卡片 | 人文、故事、深度 |
| **Vivid Gradient** | 鲜艳 | 紫粉渐变、玻璃卡片 | 抖音、小红书、年轻用户 |

## 配音声音

| 声音 ID | 描述 |
|---------|------|
| `audiobook_male_1` | 温暖男声解说（默认） |
| `male-qn-jingying` | 商务权威男声 |
| `audiobook_female_1` | 温暖女声解说 |
| `Chinese (Mandarin)_News_Anchor` | 新闻女主播 |
| `doc_commentary` | 纪录片解说 |

## 时长预设

| 预设 | 场景数 | 字数 | 时长 |
|------|--------|------|------|
| **速览** | 4–5 | 400–600 | ~1 分钟 |
| **标准** | 8–10 | 900–1200 | ~3 分钟 |
| **深度** | 12–15 | 1500–2000 | ~5 分钟 |
| **自动** | 不定 | 不定 | 根据文章长度 |

## 项目结构

技能搭建视频项目后，目录结构如下：

```
<项目目录>/
├── video.config.json          # 单一配置源（方向、主题、声音、时长）
├── narration.json             # 场景文案 + 音频时长 + 字幕时间轴
├── public/audio/              # 每个场景生成的 MP3 文件
├── scripts/
│   └── generate-audio.ts      # MiniMax TTS 生成脚本
├── src/
│   ├── index.ts               # Remotion 入口
│   ├── index.css              # CSS 重置
│   ├── Root.tsx               # 组合根（读取配置的方向和主题）
│   ├── Video.tsx              # 场景编排器，带 ThemeProvider
│   ├── components/
│   │   ├── SharedComponents.tsx  # 主题感知的 UI 组件
│   │   └── themes.ts            # 4 套视觉模板定义
│   └── scenes/                # 每个场景一个 React 组件
└── out/
    └── narration-video.mp4    # 最终渲染的视频
```

## 场景开发

每个场景是 `src/scenes/` 中的 React 组件，接收以下 props：

```typescript
interface SceneProps {
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
  sceneIndex: number;
  totalScenes: number;
}
```

**规则：**
- 所有颜色通过 `useTheme()` hook 获取 — 禁止硬编码颜色
- 动画使用 `spring()` 控制位置/缩放，使用 `interpolate()` 控制透明度
- 横屏：双栏布局、水平网格
- 竖屏：垂直堆叠，每场景最多 ~3 个元素，更大字号，内容集中在中央 ~900px 宽度内

**可用组件：**
`Background`（背景）、`BoldCard`（强调卡片）、`GlassCard`（玻璃卡片）、`TextReveal`（文字揭示）、`AnimatedText`（动画文字）、`AnimatedCounter`（数字动画）、`FlowArrow`（流程箭头）、`ProgressBar`（进度条）、`Subtitles`（字幕）、`SceneTransition`（场景过渡）、`SlideNumber`（场景编号）、`TopNav`（顶部导航）等。

## 配置说明

### video.config.json

整个流程的单一配置源：

```json
{
  "orientation": "landscape",
  "template": "bold-signal",
  "voice": {
    "voiceId": "audiobook_male_1",
    "speed": 1.0,
    "pitch": 0
  },
  "duration": "standard"
}
```

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `MINIMAX_API_KEY` | 是 | 你的 MiniMax API Key |
| `MINIMAX_API_BASE` | 否 | API 端点（默认 `https://api.minimax.io/v1`；中国用户请使用 `https://api.minimaxi.com/v1`） |

## 渲染视频

在 Remotion Studio 中预览：

```bash
npm run dev
# 打开 http://localhost:3000
```

渲染为 MP4：

```bash
npx remotion render src/index.ts NarrationVideo out/narration-video.mp4 --codec=h264 --crf=18
```

内存不足时：

```bash
npx remotion render src/index.ts NarrationVideo out/narration-video.mp4 --codec=h264 --crf=18 --concurrency=2
```

## 技术细节

- **帧率**：30 FPS
- **音频延迟**：语音开始前 1.5 秒（视觉引入），语音结束后 0.8 秒（视觉保持）
- **TTS 模型**：MiniMax `speech-2.8-hd`（最高质量）
- **字幕生成**：自动 — 按中文标点分句，将片段均匀分布在音频时长内
- **字体加载**：通过 `@remotion/google-fonts` 加载 Google Fonts（ArchivoBlack、NotoSansSC、NotoSerifSC、SpaceGrotesk）

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| WebFetch 无法抓取 URL | 技能会自动回退到 Playwright 浏览器 |
| Remotion Studio 中音频 404 | 先运行 TTS 脚本生成 MP3 文件 |
| 渲染时内存不足 | 使用 `--concurrency=2` 降低并发 |
| MiniMax API 报错 | 检查 API Key 和账户余额 |
| 中文显示为方块 | 字体未加载 — 检查字体子集是否包含 `chinese-simplified` |
| 字幕不同步 | 手动调整 `narration.json` 中的 `startFrame`/`endFrame` |
| 字幕不显示 | 先运行 `generate-audio.ts` 生成字幕时间轴 |

## 依赖项

| 包名 | 用途 |
|------|------|
| [Remotion](https://remotion.dev) | 使用 React 程序化创建视频 |
| [@remotion/google-fonts](https://www.remotion.dev/docs/google-fonts) | 中文字体加载 |
| [@remotion/media](https://www.remotion.dev/docs/media) | 场景中的音频播放 |
| [MiniMax TTS](https://platform.minimax.io) | 高质量中文语音合成 |

## 许可证

MIT
