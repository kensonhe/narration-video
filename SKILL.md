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

Before starting, gather requirements from the user using **two AskUserQuestion calls**:

**First AskUserQuestion call** (4 questions — visual & audio config):

   - **Orientation** — 横屏 or 竖屏?
     - `landscape` — 横屏 1920×1080 (default, for B站/YouTube/桌面)
     - `portrait` — 竖屏 1080×1920 (for 抖音/小红书/手机)
   - **Template** — 选择视频视觉风格（全部7个模板，选 "Other" 可输入模板名称）:
     1. `clean-light` — 极简浅色 (知识/财经/高级感) [默认]
     2. `editorial` — 杂志风暖纸 (人文/深度/故事)
     3. `aurora-night` — 极光暗夜 (科技/科学/未来感)
     4. `retro-sunset` — 复古日落 (创意/怀旧/音乐)
     5. `midnight-gold` — 深炭金紫 (商业/财经深度/付费感)
     6. `prism-glass` — 浅彩磨砂玻璃 (SaaS/创业/现代)
     7. `blossom` — 柔粉淡紫 (治愈/情感/生活美学)
     - `clean-light` — 极简浅色 [默认]
     - `editorial` — 杂志风暖纸
     - `aurora-night` — 极光暗夜
     - `retro-sunset` — 复古日落
   - **Voice** — Which narrator voice?
     - `audiobook_male_1` — 有声书男声 (default, warm narration)
     - `male-qn-jingying` — 精英青年男声 (authoritative/business)
     - `audiobook_female_1` — 有声书女声 (warm female)
     - `doc_commentary` — 纪录片解说 (documentary)
     (Also available via "Other": `Chinese (Mandarin)_News_Anchor` 新闻女声)
   - **Subtitles** — 是否显示字幕?
     - `true` — 显示字幕 (default, 在视频底部显示旁白文字)
     - `false` — 不显示字幕 (纯净画面，无字幕叠加)

**Before asking**: check whether `MINIMAX_API_KEY` is already set in the shell environment —
without printing its value (never echo the key itself):

```bash
[ -n "$MINIMAX_API_KEY" ] && echo "set" || echo "unset"
```

- If the output is `set`, the user has exported the key in their shell profile — **skip the API Key
  question** below. The audio script (Phase 4) reads `process.env.MINIMAX_API_KEY` automatically,
  so there's no need to collect or pass the key. Ask only the **Duration** question.
- If the output is `unset`, ask both questions below (Duration + API Key).

**Second AskUserQuestion call** (Duration, plus API Key only if the env var was unset):

   - **Duration** — 视频时长:
     - `standard` — 标准 ~3分钟 (8-10个场景, default)
     - `glance` — 速览 ~1分钟 (4-5个场景)
     - `deep` — 深度 ~5分钟 (12-15个场景)
     - `auto` — 根据文章长度自动决定
   - **API Key** — (only if `MINIMAX_API_KEY` is unset) MiniMax API Key (从 platform.minimax.io 获取):
     - `已有Key` — 我已有 API Key (选 "Other" 直接粘贴)
     - `需要帮助` — 我还没有，需要指导获取

If the user selected "需要帮助" for API Key, guide them: visit https://platform.minimax.io, sign up, create API key, then paste it. If they paste a key, hold it for Phase 4 and pass it inline when running the script — do **not** write the key into `video.config.json` (it's a secret; keep it in the conversation/env only).

Store the answers — they become `video.config.json`:

```json
{
  "orientation": "landscape",
  "template": "clean-light",
  "voice": { "voiceId": "audiobook_male_1", "speed": 1.0, "pitch": 0 },
  "duration": "standard",
  "subtitles": true
}
```

The setup script (Phase 3) copies a default `video.config.json`; **overwrite it with the user's
choices** before generating audio or rendering. The whole pipeline reads this one file:
`Root.tsx` (orientation + template + subtitles), `generate-audio.ts` (voice). The API key is critical — don't
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
  "coverImageUrl": null,
  "coverImage": null,
  "description": "AI 正在悄悄取代这三类工作，你中招了吗？#AI #职场 #知识分享 #干货",
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

- **`coverTitle`** (required) — A punchy, short title (3–12 Chinese characters). Think YouTube thumbnail text: bold, curiosity-provoking, impossible to ignore. The cover is the very first thing a viewer sees, so apply the same hook mindset described in "Opening hook" below. Examples: "代码的真相", "AI 要取代谁？", "被忽略的巨头"
- **`coverSubtitle`** (optional) — One sentence providing context (15–30 characters). Explains what the video is about without duplicating the title
- **`coverTag`** (optional) — A short category label (2–4 characters) like "科技", "财经", "人文", "深度"
- **`coverImageUrl`** (optional) — A background/hero image is **not required**. Leaving this out is a perfectly good, often better, choice: the cover then renders as a clean, tone-driven design built entirely from the selected template's color scheme (themed gradient background, accent lines, glow). Only set `coverImageUrl` when the article has a genuinely striking image that would make someone stop scrolling — a mediocre or off-topic photo hurts the cover more than no photo. When in doubt, omit it and rely on the theme tone
- **`coverImage`** — Set to `null`; filled by `download-images.ts`

**Cover design rules**:
- **Title must be centered** — the cover title is the focal point; it must be centered both horizontally and vertically on the cover (use `textAlign: "center"` and flex `alignItems: "center"`, `justifyContent: "center"`). Never left-align or offset the title
- **Colors must match the video theme** — the cover shares the same `templateId` and theme as the video scenes. Use `useTheme()` and `theme.colors.*` (accent, textPrimary, textSecondary, bg.gradient, glow) for all cover colors. Do NOT hardcode arbitrary colors that differ from the scene palette. This is what makes a no-image cover work: the whole design should read as the selected template's 色调
- **No-image cover (default)** — when `coverImageUrl` is omitted, the cover uses the template's tone directly: `theme.bg.gradient` background, gradient mesh + particles, and the theme's native text colors (`theme.colors.textPrimary` for the title, `theme.colors.textSecondary` for the subtitle) with an `accent`/`glow` treatment. Do NOT force white text or a dark overlay here — those are only for photo backgrounds. The result should look like a natural, self-contained extension of the video's palette
- **Hero image mask** — *only when* a `coverImage` is present, lay a flat mask over it at **45% opacity** using a dark color from the chosen 配色: `theme.bg.base` for dark themes, `theme.colors.textPrimary` (the darkest tone in the palette) for light/vibrant themes — never the light base color, which wouldn't give white title text enough contrast over a photo. 45% subdues the image enough for readability while still letting it show through; the title's strong `textShadow` carries the rest. Do not drop below ~40% or the title becomes unreadable over busy photos; do not use a generic black tint when a theme dark color works.

### Video description (发布文案)

The `description` field is the publish caption pasted into the platform post alongside the video —
a one-line hook plus trending hashtags. Author it in Phase 2 with the rest of the narration, then
deliver it ready-to-paste as the **final output of Phase 6** (the last thing the user receives).

- **Length**: keep the whole thing (hook + hashtags) under 80 characters. Platforms truncate long
  captions and viewers rarely tap "expand more" — a tight caption gets read. Count Chinese
  characters and `#` tags together; if you're over 80, cut tags before cutting the hook.
- **Hook line first**: open with one punchy sentence that earns the click, echoing the opening
  hook's angle. No links (see "Platform-safe content"); no external-platform mentions (GitHub, npm, etc.); hashtags are fine — they're discovery tags, not URLs.
- **Trending hashtags (`#` 热门标签) at the end**: append 3–5 `#`-prefixed tags, leaning on
  *currently popular* trending tags so the post rides existing traffic rather than cold-starting.
  Include at least one broad trending tag (`#知识分享` / `#干货` / `科技`), 1–2 topic-specific
  tags tied to the video's actual subject, and one platform-native tag (e.g. `#抖音小助手` on
  抖音, `#小红书创作助手` on 小红书). Pick tags genuinely relevant to the content — empty
  trending-tag stuffing gets demoted by the algorithm.
- **Example** (38 chars, well under the cap): `AI 正在悄悄取代这三类工作，你中招了吗？#AI #职场 #知识分享 #干货`

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
- **Avoid**: Reading slides verbatim, jargon without explanation, walls of text, any links/URLs, and any mention of external platforms (GitHub, npm, PyPI, etc.) as places to find resources — see "Platform-safe content" below
- **Total**: match the duration preset — `glance` 400–600 chars, `standard` 900–1200, `deep` 1500–2000

### Platform-safe content — no links, no external-platform guidance

Video platforms (抖音、B站、小红书、视频号) scan narration text, on-screen text, *and* subtitles for
links and external-platform mentions. Videos containing such signals get **demoted in recommendations
(限流)** or outright banned — even if no actual URL is present. A phrase like "去 GitHub 搜 xxx"
is just as harmful as a raw link, because the platform's NLP classifiers detect the intent to direct
users off-platform. Treat any external-platform reference as a defect to fix *before* moving on.

#### No URLs or bare domains anywhere

- **No URLs in narration `text`** — not `https://...`, not `www.xxx.com`, not `xxx.com`. The TTS would
  read them aloud badly, and subtitles (Phase 4) would surface them as detectable link text.
- **No URLs as on-screen text in scenes** — no "来源：example.com" labels, no "详见 xxx.com"
  captions. The `imageUrl`/`coverImageUrl` fields are exempt: those are internal fetch paths the
  viewer never sees rendered as text.
- **Check the cover too** — `coverTitle`/`coverSubtitle`/`coverTag` must be link-free.

#### No GitHub, code-repository, or external-download guidance

This is the #1 cause of 限流 for tech/knowledge videos. Platforms actively suppress content that
funnels viewers to external sites. **None of the following may appear in narration `text`,
on-screen text, subtitles, the `description`, or cover fields:**

- **Naming specific external platforms as destinations** — no "GitHub", "Gitee", "Google",
  "npm", "PyPI", "Docker Hub", "Hugging Face", "ModelScope", etc. as places the viewer should
  go. Example violations: "在 GitHub 上搜索 xxx", "去 Gitee 下载", "npm install xxx",
  "打开 GitHub 搜索这个仓库".
- **"Search for it" directives** — no "搜索 xxx 就能找到", "Google 一下", "去搜一下这个项目".
  These signal off-platform traffic and classifiers flag them.
- **Download/install instructions** — no "运行 pip install xxx", "克隆这个仓库", "下载这个工具".
  Even without a URL, these tell the viewer to leave the platform.
- **Repository/project names as CTAs** — no "项目地址在 xxx-repo", "仓库名叫 yyy". Naming a repo
  is effectively the same as giving a link — the viewer will search for it, and the platform knows.

#### Safe alternatives — how to handle content that references external tools/resources

When the source article mentions a tool, library, or project hosted externally, **rewrite for the
video audience** using these patterns:

| Article says | ❌ Bad (限流) | ✅ Safe (use these) |
|---|---|---|
| "The project is on GitHub at user/repo" | "去 GitHub 搜 user/repo" | Simply **omit** the location; describe what the tool does |
| "Install with `pip install xxx`" | "运行 pip install xxx" | "这个工具叫 xxx，可以直接使用" |
| "Clone the repo from GitHub" | "打开 GitHub 克隆仓库" | "作者已经开放使用，感兴趣的朋友可以了解一下" |
| "Available on npm as @pkg" | "在 npm 搜索 @pkg" | "这个工具已经公开发布，名字就叫 @pkg" |
| "See the documentation at docs.xxx.com" | "去 docs.xxx.com 查看" | "具体用法可以自行搜索关键词「xxx」" (vague enough to pass) |

**Key principle**: The video should be **self-contained** — the viewer learns something useful
without needing to go anywhere. If a tool or project is central to the topic, mention its **name**
and **what it does**, but never **where to find it** or **how to install it**. Let the viewer's
curiosity do the work — they'll search on their own if interested, and the platform doesn't see
an off-platform CTA.

#### The `description` field also needs to be clean

The publish caption (`description`) is scanned too. No "GitHub 链接在评论区", no "项目地址私信我",
no "回复 xxx 获取下载地址". These all trigger demotion. Keep the description purely about the
**content value** + trending hashtags.

### Opening hook (开头钩子) — required

The first 3–5 seconds are make-or-break. On 抖音/小红书/视频号 a viewer decides whether to keep
watching or scroll past within those first seconds, so the opening scene's `text` *must* grab
them and give them a reason to stay. This is the single highest-leverage moment in the whole
video — a weak open wastes every scene after it. Don't open with the flat "今天我们来聊...".
Lead instead with one of:

- **A contrarian claim** — "你以为 X 是对的？其实恰好相反。"
- **A surprising number** — "99% 的人没注意到，这个细节正在..." (let the number do the work)
- **A stakes question** — "如果你正在做 X，这90秒可能帮你省下三年弯路。"
- **A mystery box** — "看到最后你会发现，整件事的真相其实只有一句话。" (teases a payoff
  that keeps them watching to the end)
- **A relatable pain** — "你是不是也遇到过：...？" (the viewer recognizes themselves and stays)

Pair the verbal hook with a visual one: the first frame of scene 1 should be visually striking
(a bold card, a big number, a provocative question on screen) — not a slow fade-in on empty
space. The cover title and the opening line should hit the same nerve from two angles.

The hook must stay true to the article — promise only what the video actually delivers. Clickbait
that doesn't pay off loses the viewer at the letdown and kills completion rate, which is the
opposite of attracting traffic.

### Hooks throughout (留人钩子)

Attention drifts every 20–30 seconds, so reopen the curiosity gap periodically to keep viewers
watching through to the end:

- **Tease the next beat at the end of a scene**: "但这还不是最反直觉的部分..." / "接下来这个，才是关键。"
- **Foreshadow and pay off**: drop a detail early ("记住这个数字，待会儿会用上") and call it back later.
- **Reset at section breaks**: every 2–3 scenes, pivot with a question or a surprising turn
  rather than a flat "接下来我们看...".
- **Save the biggest reveal for the end**: the closing scene resolves the opening hook and
  delivers the promised payoff. A satisfying ending drives rewatches and comments.

One hook every 2–3 scenes, woven into the natural flow, is enough — stacking them back-to-back
reads as manipulative and erodes trust.

### Scene composition pattern:

| Scene | Purpose | Content |
|-------|---------|---------|
| 1 | Hook | Earn attention in the first 3–5s — follow "Opening hook" above; no flat "今天我们聊..." intros |
| 2 | Framework | Lay out the mental model or structure |
| 3-N-2 | Body | One key idea per scene, with examples |
| N-1 | Synthesis | Tie it all together |
| N | Closing | Resolve the opening hook and deliver the promised payoff; CTA must be platform-safe (no external-platform mentions — see "Platform-safe content") |

**Before moving to Phase 3**: scan every scene `text`, the cover fields, the `description`, and
any planned on-screen labels for: (1) URLs or bare domains, (2) mentions of GitHub/Gitee/npm/PyPI
or any external platform as a destination, (3) install/search directives ("搜索 xxx", "pip install",
"克隆仓库"), (4) repository or project names used as CTAs. Any of these can trigger platform
限流 — fix them all now, not after the render completes.

---

## Phase 3: Set Up Remotion Project

### 3a. Initialize project

Run the setup script which creates the Remotion project, installs dependencies, and copies the template:

```bash
bash <skill-path>/scripts/setup-project.sh <project-dir>
```

Where `<skill-path>` is the path to this skill's directory and `<project-dir>` is where the project should be created (e.g., `~/narration-video-<topic>`).

The setup script automatically copies cached Chrome Headless Shell and pre-downloaded Google Fonts from `<skill-path>/cache/` into the project — **no VPN required** for rendering if the cache is populated. If the cache is empty, Remotion will download Chrome on first render (requires VPN in China).

To populate the cache (one-time, requires VPN):
```bash
# Copy Chrome from any existing project
cp -R ~/narration-video-*/node_modules/.remotion/chrome-headless-shell <skill-path>/cache/
# Download all Google Fonts woff2 files
cd <skill-path>
npx tsx scripts/download-fonts.ts
```

### 3b. Write video.config.json

The setup script copies a default `video.config.json`. **Overwrite it with the user's Phase 0
choices** (orientation, template, voice, duration, subtitles). This single file drives the entire pipeline —
`Root.tsx` reads `orientation` (1920×1080 vs 1080×1920), `template`, and `subtitles` (boolean); `generate-audio.ts` reads
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
- **Color text for readability** — `textPrimary`/`textSecondary`/`textMuted` are all
  verified ≥4.5:1 against the background; use these for headings, body, and numbers.
  `accent`/`accent2`/`accent3` are tuned for **fills and decoration** (BoldCard
  backgrounds, lines, glows, gradient bars) — several of them fail contrast as small
  text on the theme background. Only use `accent` as a text color on large/bold
  headings, and never `accent2`/`accent3` for body-size colored text. Text placed on an
  accent-filled BoldCard must use `theme.colors.textOnCard`.
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

**Typography — size text for phone viewing** (the #1 readability rule):

Most viewers watch on phones. A 1920×1080 video squeezed into a ~360px-tall feed
turns a 28px body font into ~9px on screen — unreadable. So size text up
**aggressively**, and prefer a few large elements over many small ones. The values
below are **hard minimums — aim for the typical range, not the floor**. If your
scene code has any `fontSize` below these minimums (except subtitles), it is wrong.

| Element | Landscape (1920×1080) | Portrait (1080×1920) |
|---------|------------------------|------------------------|
| Primary heading / display | ≥ 80px (88–120 typical) | ≥ 72px (80–108 typical) |
| Card body / bullets / list | ≥ 34px (36–44 typical) | ≥ 38px (40–48 typical) |
| Big numbers / counters | ≥ 88px (96–120 typical) | ≥ 76px (84–100 typical) |
| Subtitles (auto-rendered — do NOT change) | 44px | 54px |
| Secondary chrome (slide no., nav) | 20–24px | 22–26px |

**Important**: subtitle sizes (44px landscape / 54px portrait) are fixed in
`SharedComponents.tsx` — do not modify them. All other text should be larger
than the minimums above.

If a card would need 4+ bullets below 34px to fit, cut to 2–3 and raise the
size — dense small text is exactly the "can't read it" complaint. The
one-idea-per-scene rule already keeps text short; now make what's left big.

**Animation rules**:
- Use `spring()` for scale/position (bouncy, physical feel)
- Use `interpolate()` for opacity fades (smooth)
- Stagger child elements with `delay` offsets (10-15 frames apart)
- Always `extrapolateRight: "clamp"` to prevent value overshoot
- Never use CSS animations — they flicker in Remotion renders

**Subtitle-safe zone**: When subtitles are enabled (`subtitles: true` in config), they render at the bottom of the screen (landscape `bottom: 100px`, portrait `bottom: 220px`, semi-transparent background) at 44px (landscape) / 54px (portrait). Keep scene content clear of the bottom ~190px (landscape) / ~330px (portrait) to avoid overlap — use `padding-bottom` on scene content containers accordingly. When subtitles are disabled, the full screen area is available.

---

## Phase 4: Generate TTS Audio

Run the audio generation script. It reads `MINIMAX_API_KEY` from the environment, so how you
invoke it depends on where the key came from:

**Key already in the shell env** (Phase 0 detected `MINIMAX_API_KEY` is `set`) — run directly,
the script inherits the env var. Don't pass the key inline (keeps it out of shell history):
```bash
cd <project-dir>
MINIMAX_API_BASE="https://api.minimaxi.com/v1" npx tsx scripts/generate-audio.ts   # China
# Outside China, drop MINIMAX_API_BASE (script defaults to https://api.minimax.io/v1):
npx tsx scripts/generate-audio.ts
```

**Key collected via conversation** (user pasted it in Phase 0 because the env var was `unset`) —
pass it inline:
```bash
cd <project-dir>
MINIMAX_API_KEY="<key>" MINIMAX_API_BASE="https://api.minimaxi.com/v1" npx tsx scripts/generate-audio.ts
```

If the script errors with `MINIMAX_API_KEY is not set`, the env var wasn't actually inherited
(e.g., it's set in a profile this shell didn't source) — fall back to passing it inline.

The script will:
1. Read each scene's `text` from `narration.json`
2. Call MiniMax `/v1/t2a_v2` API with `speech-2.8-hd` model
3. Decode hex audio → save as `public/audio/sceneXX.mp3`
4. Write `audioDuration` (ms) back to `narration.json`
5. **Automatically generate subtitle timing** — splits each scene's text into segments and calculates `startFrame`/`endFrame` based on actual audio duration
6. Print total duration

### How subtitles work

Subtitles are generated automatically as a side-effect of audio generation. Whether they appear in the final video is controlled by the `subtitles` field in `video.config.json` (Phase 0):

- **`subtitles: true`** (default) — subtitles are rendered at the bottom of each scene
- **`subtitles: false`** — subtitle data is still generated (for timing reference) but **not rendered** in the video

The generation process:

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

If Chrome was not auto-copied from cache (e.g., first-time setup without VPN), Remotion will download it automatically on first render. You can also point to a cached Chrome binary:
```bash
npx remotion render src/index.ts NarrationVideo out/narration-video.mp4 --codec=h264 --crf=18 \
  --browser-executable=<skill-path>/cache/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell
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
4. **Output the publish caption** — print `narration.json`'s `description` field as the final
   deliverable, ready-to-paste into the platform post. It must be under 80 characters (a hook
   line + 3–5 `#` trending hashtags, no links). Present it cleanly on its own line so the user
   can copy it straight into 抖音/B站/小红书/视频号 — this is the last thing they receive, so
   make it prominent, not buried.
5. Summarize: resolution, duration, number of scenes, voice used
6. Offer to adjust: narration text, voice, visual style, cover title, description, or re-render

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
| Subtitles overlap scene content | Subtitles render at `z-index: 100` (44px landscape / 54px portrait) — leave the bottom ~190px (landscape) / ~330px (portrait) clear |
| No subtitles appearing | Verify `narration.json` has `subtitles` field (run generate-audio.ts first) and `video.config.json` has `"subtitles": true` |
| Subtitles showing when user disabled them | Check `video.config.json` — set `"subtitles": false` to hide them |
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
├── video.config.json         # orientation / template / voice / duration / subtitles
├── remotion.config.ts
├── tsconfig.json
├── package.json
└── out/
    ├── narration-video.mp4   # Final rendered video
    └── cover.png             # Cover/thumbnail image
```
