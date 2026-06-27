# Narration Video

**[English](README.md) | [中文](README_CN.md)**

> Turn any article URL into a professional narrated explainer video with AI-generated Chinese voiceover, built with [Remotion](https://remotion.dev) + [MiniMax TTS](https://platform.minimax.io).

[![Remotion](https://img.shields.io/badge/Remotion-4.x-black)](https://remotion.dev)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

---

## What It Does

Narration Video is a [Claude Code](https://claude.ai/claude-code) skill that automates the full pipeline of creating narrated explainer videos from web articles:

```
Article URL → Narration Script → TTS Audio → Animated Scenes → MP4 Video
```

**Input**: Any article URL (blog post, WeChat article, news story, etc.)
**Output**: An H.264 MP4 video (1920×1080 landscape or 1080×1920 portrait) with synchronized Chinese narration and subtitles.

## Features

- **Full Pipeline** — Fetch article, write narration, generate voiceover, build animated scenes, render MP4, all in one conversation
- **Article Image Extraction** — Automatically extracts and downloads images from the source article for use in video scenes
- **Cover Generation** — Renders a professional 1920×1080 thumbnail image alongside the video, with themed styling and article hero image support
- **6 Visual Themes** — Clean Light (minimal), Editorial (warm serif), Aurora Night (dark tech), Neubrutalist (bold Gen Z), Zen Garden (natural calm), Retro Sunset (vaporwave vibes)
- **5 AI Voices** — Warm male, authoritative male, warm female, news anchor, documentary narrator
- **Flexible Duration** — From 1-minute quick glances to 5-minute deep dives
- **Orientation Support** — Landscape (1920×1080) for YouTube/desktop or portrait (1080×1920) for TikTok/Xiaohongshu/Reels
- **Auto Subtitles** — Subtitle timing is automatically generated from the TTS audio with sentence-level sync
- **Theme-Aware Components** — All visual components adapt to the selected template; no hardcoded colors
- **Animated Elements** — Particle fields, gradient meshes, text reveals, spring animations, progress bars, and more

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) 18+ installed
- A [MiniMax API key](https://platform.minimax.io) for TTS generation
- [Claude Code](https://claude.ai/claude-code) with this skill installed

### Usage

Simply ask Claude Code:

```
Create a narration video from this article: https://example.com/article
```

Or use the skill name directly:

```
/narration-video
```

The skill will guide you through a quick setup:

1. **API Key** — Your MiniMax API key
2. **Orientation** — Landscape or portrait
3. **Visual Theme** — Pick from 6 styles
4. **Voice** — Pick from 5 Chinese narrator voices
5. **Duration** — Quick glance, standard, deep dive, or auto

Then the pipeline runs automatically through 6 phases.

## Pipeline

| Phase | Description |
|-------|-------------|
| **0. Gather Requirements** | Interactive setup — orientation, theme, voice, duration |
| **1. Fetch & Analyze** | Download and parse the article content, extract images |
| **2. Write Narration** | Generate scene-by-scene narration scripts in Chinese, map article images to scenes |
| **3. Set Up Project** | Initialize a Remotion project with templates and components, download images |
| **4. Generate Audio** | Call MiniMax TTS API to produce MP3 audio per scene + auto subtitles |
| **5. Render Video** | Build animated React scenes, render to MP4, and generate cover thumbnail |
| **6. Deliver** | Report output, open video, offer adjustments |

## Visual Themes

| Theme | Mode | Style | Best For |
|-------|------|-------|----------|
| **Clean Light** | Light | Minimal blue accents, solid cards | Knowledge, finance, premium |
| **Editorial** | Light | Warm serif, paper cards | Humanities, storytelling |
| **Aurora Night** | Dark | Cyan-purple aurora glow, glass cards | Tech, science, futuristic |
| **Neubrutalist** | Vibrant | Bold hard shadows, bright yellow/red | Gen Z, viral, trendy |
| **Zen Garden** | Light | Sage green, organic natural feel | Lifestyle, wellness, culture |
| **Retro Sunset** | Dark | Vaporwave sunset gradient, glass cards | Creative, nostalgia, music |

## Voices

| Voice ID | Description |
|----------|-------------|
| `audiobook_male_1` | Warm male narrator (default) |
| `male-qn-jingying` | Authoritative business male |
| `audiobook_female_1` | Warm female narrator |
| `Chinese (Mandarin)_News_Anchor` | Formal news female |
| `doc_commentary` | Documentary narration |

## Duration Presets

| Preset | Scenes | Characters | Duration |
|--------|--------|------------|----------|
| **Glance** (速览) | 4–5 | 400–600 | ~1 min |
| **Standard** (标准) | 8–10 | 900–1200 | ~3 min |
| **Deep** (深度) | 12–15 | 1500–2000 | ~5 min |
| **Auto** | Varies | Varies | Based on article |

## Project Structure

After the skill sets up a video project, the directory looks like:

```
<project-dir>/
├── video.config.json          # Single source of truth (orientation, theme, voice, duration)
├── narration.json             # Scene narration text + audio durations + subtitle timing + image paths
├── public/
│   ├── audio/                 # Generated MP3 files per scene
│   └── images/                # Downloaded article images
├── scripts/
│   ├── generate-audio.ts      # MiniMax TTS generation script
│   └── download-images.ts     # Article image download script
├── src/
│   ├── index.ts               # Remotion entry point
│   ├── index.css              # CSS reset
│   ├── Root.tsx               # Composition root (reads config for orientation + theme)
│   ├── Video.tsx              # Scene orchestrator with ThemeProvider
│   ├── Cover.tsx              # Cover/thumbnail composition (single frame)
│   ├── components/
│   │   ├── SharedComponents.tsx  # Theme-aware UI components
│   │   └── themes.ts            # 6 visual template definitions
│   └── scenes/                # One React component per scene
└── out/
    ├── narration-video.mp4    # Final rendered video
    └── cover.png              # Cover/thumbnail image
```

## Scene Authoring

Each scene is a React component in `src/scenes/`. Scenes receive these props:

```typescript
interface SceneProps {
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
  sceneIndex: number;
  totalScenes: number;
}
```

**Rules:**
- All colors come from the `useTheme()` hook — never hardcode colors
- Animations use `spring()` for position/scale and `interpolate()` for opacity
- Landscape: two-column layouts, horizontal grids
- Portrait: stack vertically, max ~3 items per scene, larger text, content within central ~900px

**Available components:**
`Background`, `BoldCard`, `GlassCard`, `SceneImage`, `TextReveal`, `AnimatedText`, `AnimatedCounter`, `FlowArrow`, `ProgressBar`, `Subtitles`, `SceneTransition`, `SlideNumber`, `TopNav`, and more.

## Configuration

### video.config.json

The single source of truth for the entire pipeline:

```json
{
  "orientation": "landscape",
  "template": "clean-light",
  "voice": {
    "voiceId": "audiobook_male_1",
    "speed": 1.0,
    "pitch": 0
  },
  "duration": "standard"
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MINIMAX_API_KEY` | Yes | Your MiniMax API key |
| `MINIMAX_API_BASE` | No | API endpoint (default: `https://api.minimax.io/v1`; use `https://api.minimaxi.com/v1` for China) |

## Rendering

Preview in Remotion Studio:

```bash
npm run dev
# Opens http://localhost:3000
```

Render to MP4:

```bash
npx remotion render src/index.ts NarrationVideo out/narration-video.mp4 --codec=h264 --crf=18
```

Render the cover image:

```bash
npx remotion still src/index.ts Cover out/cover.png
```

If you run out of memory:

```bash
npx remotion render src/index.ts NarrationVideo out/narration-video.mp4 --codec=h264 --crf=18 --concurrency=2
```

## Technical Details

- **FPS**: 30
- **Audio padding**: 1.5s before speech starts (visual intro), 0.8s after speech ends (visual hold)
- **TTS model**: MiniMax `speech-2.8-hd` (highest quality)
- **Subtitle generation**: Automatic — splits text by Chinese punctuation, distributes segments evenly across audio duration
- **Font loading**: Google Fonts via `@remotion/google-fonts` (ArchivoBlack, NotoSansSC, NotoSerifSC, SpaceGrotesk, PlayfairDisplay, BebasNeue, RussoOne, JetBrainsMono)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| WebFetch fails on URL | The skill automatically falls back to Playwright browser |
| Audio 404 in Remotion Studio | Run the TTS script first to generate MP3 files |
| Render out of memory | Reduce concurrency with `--concurrency=2` |
| MiniMax API error | Verify API key and account credits |
| Chinese text shows as squares | Font not loaded — check font subsets include `chinese-simplified` |
| Subtitles out of sync | Adjust `startFrame`/`endFrame` in `narration.json` manually |
| No subtitles appearing | Run `generate-audio.ts` first to populate subtitle timing |

## Dependencies

| Package | Purpose |
|---------|---------|
| [Remotion](https://remotion.dev) | Programmatic video creation with React |
| [@remotion/google-fonts](https://www.remotion.dev/docs/google-fonts) | Chinese font loading |
| [@remotion/media](https://www.remotion.dev/docs/media) | Audio playback in scenes |
| [MiniMax TTS](https://platform.minimax.io) | High-quality Chinese text-to-speech |

## License

Apache-2.0
