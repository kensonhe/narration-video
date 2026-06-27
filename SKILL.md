---
name: narration-video
description: >
  Generate narrated explainer videos from any article URL using Remotion + MiniMax TTS.
  Use this skill whenever the user wants to create a video, explainer video, narration video,
  video summary, or 解说视频 from a URL or article. Also trigger when the user mentions
  "turn this article into a video", "make a video from this link", "generate a narrated video",
  or provides a URL and asks for video content. This is a full pipeline: fetch article →
  write narration → generate TTS audio → build Remotion scenes → render MP4.
---

# Narration Video Generator

Turn any article URL into a professional narrated video with Chinese voiceover.

**Input**: A URL (article, blog post, WeChat article, etc.)
**Output**: An MP4 video file (1920×1080, H.264) with AI narration

## Workflow Overview

```
URL → Fetch Content → Analyze → Write Narration → TTS Audio → Remotion Video → MP4
```

The pipeline has 6 phases. Each must complete before the next begins.

---

## Phase 0: Gather Requirements

Before starting, ask the user these questions in a **single AskUserQuestion call** (5 questions),
then write the answers into a `video.config.json` file (created in Phase 3).

1. **API Key** — Do they have a MiniMax API key? (from platform.minimax.io)
   - If yes, ask them to provide it
   - If no, guide them: visit https://platform.minimax.io, sign up, create API key
2. **Orientation** — 横屏 or 竖屏?
   - `landscape` — 横屏 1920×1080 (default, for B站/YouTube/桌面)
   - `portrait` — 竖屏 1080×1920 (for 抖音/小红书/手机)
3. **Template** — Which visual style?
   - `clean-light` — 极简浅色 (知识/财经/高级感, default)
   - `editorial` — 杂志风暖纸 (人文/深度/故事)
   - `aurora-night` — 极光暗夜 (科技/科学/未来感)
   - `neubrutalist` — 新粗暴主义 (Gen Z/潮流/病毒式)
   - `zen-garden` — 禅意花园 (生活/健康/文化)
   - `retro-sunset` — 复古日落 (创意/怀旧/音乐)
4. **Voice** — Which narrator voice?
   - `audiobook_male_1` — 有声书男声 (default, warm narration)
   - `male-qn-jingying` — 精英青年男声 (authoritative/business)
   - `audiobook_female_1` — 有声书女声 (warm female)
   - `Chinese (Mandarin)_News_Anchor` — 新闻女声 (formal)
   - `doc_commentary` — 纪录片解说 (documentary)
5. **Duration** — How long, roughly?

   | Preset | Scenes | Total narration chars | ~Length |
   |--------|--------|------------------------|---------|
   | `glance` (速览) | 4–5 | 400–600 | ~1 min |
   | `standard` (标准) | 8–10 | 900–1200 | ~3 min (default) |
   | `deep` (深度) | 12–15 | 1500–2000 | ~5 min |
   | `auto` | by article length | — | — |

Store the answers — they become `video.config.json`:

```json
{
  "orientation": "landscape",
  "template": "clean-light",
  "voice": { "voiceId": "audiobook_male_1", "speed": 1.0, "pitch": 0 },
  "duration": "standard"
}
```

The setup script (Phase 3) copies a default `video.config.json`; **overwrite it with the user's
choices** before generating audio or rendering. The whole pipeline reads this one file:
`Root.tsx` (orientation + template), `generate-audio.ts` (voice). The API key is critical — don't
proceed without it.

---

## Phase 1: Fetch & Analyze Article

### 1a. Fetch the article content

Try `WebFetch` first. If it fails (common with WeChat/authenticated pages), fall back to Playwright:

```
1. browser_navigate to the URL
2. browser_snapshot to get the accessibility tree
3. Extract all text content from the snapshot
```

For WeChat articles specifically, Playwright is usually needed as WebFetch often gets blocked.

### 1b. Analyze and structure the content

Read the full article. Identify:
- **Title** — The main topic/thesis
- **Key sections** — Natural content breaks (count driven by the chosen duration preset)
- **Key points per section** — 2-4 bullet points each
- **Notable quotes** — Memorable phrases for emphasis slides

Target the scene count from the duration preset (Phase 0): `glance` 4–5, `standard` 8–10,
`deep` 12–15, `auto` based on the article. Fewer feels rushed; more feels bloated.

### 1c. Extract article images

While reading the article, also collect useful images. These add significant visual value to the
video — diagrams, screenshots, photos, and charts from the article are far more compelling than
generic shapes.

**Using WebFetch:** Look for markdown image syntax `![alt text](url)` in the fetched content.
Collect the URLs along with their alt text and the surrounding context (which section they're in).

**Using Playwright:** Run `browser_evaluate` to extract image data:

```javascript
Array.from(document.querySelectorAll('img'))
  .filter(img => img.naturalWidth > 100 && img.naturalHeight > 100)
  .map(img => ({ src: img.src, alt: img.alt, w: img.naturalWidth, h: img.naturalHeight }))
```

**Filtering rules** — skip these images:
- Small icons, logos, avatars (< 100px in either dimension)
- Tracking pixels (1×1 or invisible)
- Decorative dividers or spacers
- Social media share buttons
- Images with generic filenames like `spacer.gif`, `pixel.png`, `logo.svg`

**Target:** Collect 5–15 candidate images. Note which article section each image belongs to — this
helps match images to the right scenes in Phase 2.

---

## Phase 2: Write Narration Scripts

Create a `narration.json` file with this structure:

```json
{
  "coverTitle": "3-12字吸睛标题",
  "coverSubtitle": "一句话概括视频内容",
  "coverTag": "科技",
  "coverImageUrl": "https://example.com/hero-image.jpg",
  "coverImage": null,
  "scenes": [
    {
      "id": "scene01",
      "title": "开篇",
      "text": "今天我们来聊一个重要的话题：...",
      "imageUrl": "https://example.com/article-image.jpg",
      "image": null,
      "audioDuration": 0,
      "subtitles": null
    }
  ]
}
```

The `audioDuration` and `subtitles` fields are auto-filled by the `generate-audio.ts` script after TTS generation. The `image` and `coverImage` fields are auto-filled by the `download-images.ts` script. You only need to write `id`, `title`, `text`, `imageUrl`, and the cover fields.

### Cover fields

The cover is a 1920×1080 thumbnail image rendered alongside the video. It needs to be
eye-catching and summarize the video at a glance.

- **`coverTitle`** (required) — A punchy, short title (3–12 Chinese characters). Think YouTube thumbnail text: bold, curiosity-provoking, impossible to ignore. Examples: "代码的真相", "AI 要取代谁？", "被忽略的巨头"
- **`coverSubtitle`** (optional) — One sentence providing context (15–30 characters). Explains what the video is about without duplicating the title
- **`coverTag`** (optional) — A short category label (2–4 characters) like "科技", "财经", "人文", "深度"
- **`coverImageUrl`** (optional) — The most visually striking image from the article. Pick the one that would make someone stop scrolling. If omitted, the cover uses only the themed background
- **`coverImage`** — Set to `null`; filled by `download-images.ts`

### Image-to-scene mapping

The `imageUrl` field is optional — not every scene needs an image. Use images where they add
genuine visual value (typically 30–60% of scenes). When assigning images:

- **Match by content**: an image near a paragraph in the article → the scene about that paragraph
- **Prefer informative images**: diagrams, charts, screenshots, product photos > decorative photos
- **One image per scene max**: pick the most relevant one if multiple images match a scene
- **Set `imageUrl` to the original URL**: the download script handles fetching and path resolution
- **Set `image` to `null`**: it gets filled by `download-images.ts` with the local path

### Writing guidelines for each scene's `text`:

- **Length**: 50-120 Chinese characters per scene (~15-30 seconds of audio)
- **Tone**: Conversational, like a knowledgeable friend explaining something
- **Structure**: One clear idea per scene, with a natural transition to the next
- **Avoid**: Reading slides verbatim, jargon without explanation, walls of text
- **Total**: match the duration preset — `glance` 400–600 chars, `standard` 900–1200, `deep` 1500–2000

### Scene composition pattern:

| Scene | Purpose | Content |
|-------|---------|---------|
| 1 | Hook | Introduce the topic, state why it matters |
| 2 | Framework | Lay out the mental model or structure |
| 3-N-2 | Body | One key idea per scene, with examples |
| N-1 | Synthesis | Tie it all together |
| N | Closing | Memorable takeaway or call to action |

---

## Phase 3: Set Up Remotion Project

### 3a. Initialize project

Run the setup script which creates the Remotion project, installs dependencies, and copies the template:

```bash
bash <skill-path>/scripts/setup-project.sh <project-dir>
```

Where `<skill-path>` is the path to this skill's directory and `<project-dir>` is where the project should be created (e.g., `~/narration-video-<topic>`).

### 3b. Write video.config.json

The setup script copies a default `video.config.json`. **Overwrite it with the user's Phase 0
choices** (orientation, template, voice, duration). This single file drives the entire pipeline —
`Root.tsx` reads `orientation` (1920×1080 vs 1080×1920) and `template`; `generate-audio.ts` reads
`voice`.

### 3c. Copy narration.json

Place the `narration.json` from Phase 2 into the project root.

### 3d. Download article images

If any scenes have `imageUrl` fields, download the images:

```bash
cd <project-dir>
npx tsx scripts/download-images.ts
```

The script downloads each image to `public/images/{scene.id}.{ext}` and writes the local path
back to narration.json's `image` field. Failed downloads are skipped gracefully — scenes without
images simply render without them.

### 3e. Copy shared components

The setup script copies `SharedComponents.tsx` and `themes.ts` from
`<skill-path>/template/src/components/` into the project. `themes.ts` defines the 6 selectable
templates; `SharedComponents.tsx` provides theme-aware building blocks (BoldCard, DarkCard,
GlassCard, AnimatedText, Background, etc.) that **read colors and fonts from the active theme via
`useTheme()`** — so the same scene code looks correct under any template.

### 3f. Write scene components

Create one React component per scene in `src/scenes/`. Each scene component:

- Receives `{ fontDisplay, fontBody, fontMono, sceneIndex, totalScenes }` as props
- Uses `useCurrentFrame()` + `interpolate()`/`spring()` for animations
- **Gets colors from `useTheme()`** — never hardcode hex colors; use `theme.colors.accent`,
  `theme.colors.textPrimary`, etc. This keeps scenes template-agnostic.
- Renders content matching the narration for that scene

**Scene component template** — every scene follows this pattern:

```tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { SceneProps, Background, SlideNumber, TopNav, BoldCard, SectionLine, SceneImage, useTheme } from "../components/SharedComponents";
import narration from "../../narration.json";

const NAV_LABELS = ["开篇", "..."]; // navigation breadcrumb labels

export const SceneXX: React.FC<SceneProps> = ({ fontDisplay, fontBody, fontMono, sceneIndex, totalScenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme(); // colors adapt to the chosen template
  const scene = (narration as any).scenes[sceneIndex];
  const imagePath = scene?.image; // local path from download-images.ts, or null

  return (
    <AbsoluteFill>
      <Background />
      <SlideNumber current={N} total={totalScenes} fontFamily={fontMono} />
      <TopNav labels={NAV_LABELS} activeIndex={N-1} fontFamily={fontBody} />
      {/* Scene content — use theme.colors.* for any color, fontDisplay for headings */}
      {/* If imagePath exists, use <SceneImage src={imagePath} /> in the layout */}
    </AbsoluteFill>
  );
};
```

**Orientation matters** — check `video.config.json` `orientation` before laying out:
- **Landscape (1920×1080)**: two-column layouts, side-by-side cards, horizontal grids all work.
- **Portrait (1080×1920)**: stack everything **vertically** in a central column. Use fewer items
  per scene (2–3 max), larger text, and a single column of cards. Avoid wide two-column layouts
  and horizontal card rows — they get cramped. Keep content within the middle ~900px width.

**Visual layout patterns** — choose based on content type:

| Pattern | When to use | Layout |
|---------|-------------|--------|
| Title card | Opening/closing | Centered BoldCard with large text |
| Two-column | Comparisons, explanations | Left: title + desc, Right: BoldCard or DarkCard |
| Multi-card grid | Lists of 3+ items | 3 colored cards in a row |
| Centered statement | Big questions, quotes | Large centered text in BoldCard |
| Table/data | Comparisons, mappings | DarkCard with animated table rows |
| Case studies | Success/failure stories | 3 cards with colored left borders (green/yellow/red) |
| Image + text | Scene has article image | Left: title + description cards, Right: `<SceneImage>` in a container |
| Image accent | Small diagram/chart image | Image inside a GlassCard alongside text content |
| Full-bleed image hero | Strong opening/closing photo | Full-width `<SceneImage>` with text overlay via BoldCard |

**Animation rules**:
- Use `spring()` for scale/position (bouncy, physical feel)
- Use `interpolate()` for opacity fades (smooth)
- Stagger child elements with `delay` offsets (10-15 frames apart)
- Always `extrapolateRight: "clamp"` to prevent value overshoot
- Never use CSS animations — they flicker in Remotion renders

**Subtitle-safe zone**: Subtitles render at the bottom of the screen (`bottom: 80px`, semi-transparent background). Keep scene content clear of the bottom ~140px to avoid overlap. Use `padding-bottom: 100px` on scene content containers if needed.

---

## Phase 4: Generate TTS Audio

Run the audio generation script with the MiniMax API key:

```bash
cd <project-dir>
MINIMAX_API_KEY="<key>" MINIMAX_API_BASE="https://api.minimaxi.com/v1" npx tsx scripts/generate-audio.ts
```

The script will:
1. Read each scene's `text` from `narration.json`
2. Call MiniMax `/v1/t2a_v2` API with `speech-2.8-hd` model
3. Decode hex audio → save as `public/audio/sceneXX.mp3`
4. Write `audioDuration` (ms) back to `narration.json`
5. **Automatically generate subtitle timing** — splits each scene's text into segments and calculates `startFrame`/`endFrame` based on actual audio duration
6. Print total duration

### How subtitles work

Subtitles are generated automatically as a side-effect of audio generation:

1. **Text splitting**: Each scene's narration text is split by Chinese punctuation marks (。！？；：). Sentences longer than 24 characters are further split at ~20-character boundaries.
2. **Timing distribution**: Segments are distributed evenly across the audio duration. If a scene has 15 seconds of audio and 5 subtitle segments, each segment shows for ~3 seconds.
3. **Frame calculation**: Each segment gets a `startFrame` and `endFrame` relative to the scene start. The first segment begins at `AUDIO_OFFSET_FRAMES` (45 frames = 1.5s after scene start, when audio begins).
4. **Rendering**: The `<Subtitles>` component in `SharedComponents.tsx` renders text at the bottom of the screen with a semi-transparent black background. Text fades in/out smoothly between segments.

The subtitle data is saved to `narration.json` under each scene's `subtitles` field:

```json
{
  "id": "scene01",
  "title": "开篇",
  "text": "...",
  "audioDuration": 19800,
  "subtitles": {
    "segments": [
      { "text": "今天我们来聊一个", "startFrame": 45, "endFrame": 100 },
      { "text": "重要的话题：", "startFrame": 101, "endFrame": 156 },
      ...
    ]
  }
}
```

**Customizing subtitles**: If the auto-generated timing doesn't match the actual speech rhythm, manually adjust `startFrame`/`endFrame` values in `narration.json`. You can also split or merge segments for better pacing.

### MiniMax API details

- **Endpoint**: `POST https://api.minimaxi.com/v1/t2a_v2` (China) or `https://api.minimax.io/v1/t2a_v2` (Global)
- **Auth**: `Authorization: Bearer <API_KEY>`
- **Model**: `speech-2.8-hd` (highest quality)
- **Response**: `data.audio` is hex-encoded MP3 bytes; `extra_info.audio_length` is duration in ms
- **Rate limit**: ~60 RPM, add 500ms delay between requests
- **Cost**: ~$1 per hour of audio

### If the user is in China

Use `MINIMAX_API_BASE="https://api.minimaxi.com/v1"` (note the extra 'i' in minimaxi.com).

---

## Phase 5: Render Video + Cover

```bash
cd <project-dir>
# Render the video
npx remotion render src/index.ts NarrationVideo out/narration-video.mp4 --codec=h264 --crf=18
# Render the cover image
npx remotion still src/index.ts Cover out/cover.png
```

Video rendering takes 3-8 minutes depending on machine specs (8332 frames for a ~4.5 min video at 30fps).
Cover image rendering is near-instant (single frame).

### Preview first (optional)

```bash
cd <project-dir>
npm run dev
```

Opens Remotion Studio at `http://localhost:3000`. Use it to scrub through scenes and verify audio-visual sync before committing to a full render.

---

## Phase 6: Deliver

1. Tell the user the output file paths and sizes (video + cover)
2. Open the video: `open <output-path>`
3. Open the cover: `open out/cover.png`
4. Summarize: resolution, duration, number of scenes, voice used
5. Offer to adjust: narration text, voice, visual style, cover title, or re-render

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| WebFetch fails on URL | Use Playwright browser to fetch content |
| NotoSansSC font loading too slow | Add `ignoreTooManyRequestsWarning: true` to loadFont options |
| Audio 404 in Remotion Studio | Run the TTS script first to generate mp3 files |
| TypeScript errors on unused imports | Set `noUnusedLocals: false` in tsconfig |
| Remotion render out of memory | Reduce concurrency: `--concurrency=2` |
| MiniMax API returns error | Check API key validity; verify account has credits |
| Chinese text shows as squares | Font not loaded — check subsets include `chinese-simplified` |
| Subtitles out of sync with audio | Adjust `startFrame`/`endFrame` in narration.json manually |
| Subtitles overlap scene content | Subtitles render at `z-index: 100` with `bottom: 80px` — ensure scene content leaves bottom 120px clear |
| No subtitles appearing | Verify `narration.json` has `subtitles` field (run generate-audio.ts first) |
| Image download fails (403/timeout) | Some sites block direct downloads — try Playwright to save images instead |
| Image not showing in scene | Verify `image` field in narration.json is set (run download-images.ts first) |
| Image appears stretched | Use `fit="contain"` on SceneImage, or set explicit width/height via `style` prop |

---

## Project Structure Reference

```
<project-dir>/
├── src/
│   ├── index.ts              # registerRoot entry
│   ├── Root.tsx              # Composition with dynamic duration
│   ├── Video.tsx             # Sequence orchestration + Audio
│   ├── Cover.tsx             # Cover/thumbnail composition (single frame)
│   ├── scenes/               # One component per scene
│   │   ├── Scene01Xxx.tsx
│   │   └── ...
│   └── components/
│       ├── SharedComponents.tsx  # Theme-aware BoldCard, DarkCard, SceneImage, etc.
│       └── themes.ts             # 6 template definitions + useTheme source
├── public/
│   ├── audio/                # Generated mp3 files
│   └── images/               # Downloaded article images
├── scripts/
│   ├── generate-audio.ts     # MiniMax TTS script (reads voice from config)
│   └── download-images.ts    # Article image downloader (reads imageUrl from narration.json)
├── narration.json            # Narration text + durations + image paths + cover data
├── video.config.json         # orientation / template / voice / duration
├── remotion.config.ts
├── tsconfig.json
├── package.json
└── out/
    ├── narration-video.mp4   # Final rendered video
    └── cover.png             # Cover/thumbnail image
```
