# Design: New Templates + Component Polish

**Date:** 2026-07-06
**Scope:** `narration-video` skill — add 4 new visual templates + refine shared components.

## Goal

Make the generated Remotion "pages" (scenes + cover) more beautiful and cover more content
types. User delegated curation ("我来搭配") and approved a diverse set of 4 new templates that
do NOT overlap the existing 6 (`clean-light`, `editorial`, `aurora-night`, `neubrutalist`,
`zen-garden`, `retro-sunset`). Palettes/font pairings sourced from the `ui-ux-pro-max` skill's
curated database (Fintech, Beauty/Spa, Minimalist Monochrome, Glassmorphism, Modern Dark Cinema).

## A. 4 new templates (added to `template/src/components/themes.ts`)

All conform to the existing `Theme` interface — no new fields, no new card style.

### 7. `midnight-gold` — dark premium / business · 财经深度/付费感
- mode: `dark`
- bg: base `#0A0A0F`; gradient `linear-gradient(160deg,#0A0A0F 0%,#14131F 40%,#1A1623 100%)`;
  meshColors `["rgba(245,158,11,0.10)","rgba(139,92,246,0.12)","rgba(217,119,6,0.06)"]`;
  particleColor `"rgba(245,158,11,0.08)"`; gridOpacity `0.015`
- colors: accent `#F59E0B`; accent2 `#8B5CF6`; accent3 `#FBBF24`; glow `rgba(245,158,11,0.35)`;
  textPrimary `#F5F1E8`; textSecondary `#A89F8C`; textMuted `#6B6354`; textOnCard `#1A1206`;
  cardBg `rgba(28,25,38,0.72)`; cardBorder `rgba(245,158,11,0.12)`
- card: `{ radius: 20, style: "glass" }`
- fonts: `spaceGrotesk / notoSansSC / jetBrainsMono`
- subtitle: bg `rgba(10,10,15,0.75)`; text `#F5F1E8`; border `1px solid rgba(245,158,11,0.22)`

### 8. `prism-glass` — light vibrant glassmorphism · SaaS/创业/现代 UI
- mode: `vibrant`
- bg: base `#EEF0FF`;
  gradient `linear-gradient(160deg,#F5F3FF 0%,#ECE9FE 35%,#FCE7F3 70%,#FFF1E6 100%)`;
  meshColors `["rgba(139,92,246,0.18)","rgba(236,72,153,0.14)","rgba(59,130,246,0.12)"]`;
  particleColor `"rgba(139,92,246,0.06)"`; gridOpacity `0`
- colors: accent `#7C3AED`; accent2 `#EC4899`; accent3 `#3B82F6`; glow `rgba(124,58,237,0.25)`;
  textPrimary `#1E1B2E`; textSecondary `#5B556B`; textMuted `#9B95AB`; textOnCard `#FFFFFF`;
  cardBg `rgba(255,255,255,0.55)`; cardBorder `rgba(255,255,255,0.6)`
- card: `{ radius: 24, style: "glass" }`
- fonts: `spaceGrotesk / notoSansSC / jetBrainsMono`
- subtitle: bg `rgba(30,27,46,0.70)`; text `#FFFFFF`; border `1px solid rgba(124,58,237,0.25)`

### 9. `mono-press` — pure B&W high-contrast editorial · 严肃/深度/报道
- mode: `light`
- bg: base `#FBFAF6`; gradient `linear-gradient(180deg,#FFFFFF 0%,#FBFAF6 100%)`;
  meshColors `["rgba(0,0,0,0.012)","rgba(0,0,0,0.008)"]`; particleColor `"none"`; gridOpacity `0`
- colors: accent `#111111`; accent2 `#3A3A3A`; accent3 `#6B6B6B`; glow `rgba(0,0,0,0.08)`;
  textPrimary `#0A0A0A`; textSecondary `#4A4A4A`; textMuted `#8A8A8A`; textOnCard `#FFFFFF`;
  cardBg `#FFFFFF`; cardBorder `#0A0A0A`
- card: `{ radius: 2, style: "paper" }` (zero-ish radius, hairline border, neutralized shadow)
- fonts: `playfairDisplay / notoSerifSC / jetBrainsMono`
- subtitle: bg `rgba(10,10,10,0.88)`; text `#FFFFFF`; border `2px solid #0A0A0A`

### 10. `blossom` — soft pastel blush/lilac · 治愈/情感/生活美学
- mode: `light`
- bg: base `#FDF6F8`; gradient `linear-gradient(170deg,#FFFBF6 0%,#FDF2F8 45%,#F5F0FA 100%)`;
  meshColors `["rgba(236,72,153,0.10)","rgba(139,92,246,0.08)"]`;
  particleColor `"rgba(236,72,153,0.06)"`; gridOpacity `0`
- colors: accent `#C2185B`; accent2 `#8E5BC9`; accent3 `#E89BBA`; glow `rgba(194,24,91,0.18)`;
  textPrimary `#3D2435`; textSecondary `#6E5570`; textMuted `#A392A6`; textOnCard `#FFFFFF`;
  cardBg `rgba(255,255,255,0.80)`; cardBorder `rgba(194,24,91,0.10)`
- card: `{ radius: 24, style: "glass" }`
- fonts: `notoSerifSC / notoSansSC / spaceGrotesk`
- subtitle: bg `rgba(61,36,53,0.78)`; text `#FFFFFF`; border `1px solid rgba(194,24,91,0.25)`

## B. Component polish (`template/src/components/SharedComponents.tsx`)

CSS-level refinements only — no new components, no interface changes.

1. **GlassCard shadows theme-aware.** Replace the one-size `0 0 20px rgba(0,0,0,0.3)` glass
   shadow: light/vibrant → `0 8px 24px rgba(0,0,0,0.06)` + `inset 0 1px 0 rgba(255,255,255,0.5)`;
   dark → `0 12px 32px rgba(0,0,0,0.4)` + `inset 0 1px 0 rgba(255,255,255,0.06)`.
2. **GlassCard `paper` shadow de-warmed.** Replace hardcoded `rgba(60,40,20,0.12)` with neutral
   `rgba(0,0,0,0.08)` (so mono-press B&W doesn't go yellow).
3. **BoldCard top inner highlight.** Add `inset 0 1px 0 rgba(255,255,255,0.18)` for a
   top-lit feel; soften the bottom `rgba(0,0,0,0.05)` blob to `0.03`.
4. **GradientMesh atmosphere.** Bump blur `60px → 80px`; add a top→bottom vignette layer on dark
   themes (`linear-gradient(180deg, transparent, rgba(0,0,0,0.05))`) for depth.
5. **SceneImage inner highlight.** Add `inset 0 0 0 1px rgba(255,255,255,0.06)` inner edge light.

## C. SKILL.md sync

- Phase 0 "Template" question: add the 4 new templates to the option list (with `Other` listing
  any remaining). Total 10 templates.
- No scene-authoring guidance changes needed — component interfaces are unchanged.

## Verification

After implementing, render real Remotion stills (cover + one sample scene) under each of the 4
new templates using an existing project (`narration-video-archify`), then present them to the
user for visual review. Adjust any palette that looks off.
