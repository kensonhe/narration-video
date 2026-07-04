import "./index.css";
import { Composition } from "remotion";
import { NarrationVideo } from "./Video";
import { Cover } from "./Cover";
// Fonts: bundled locally via @fontsource. The woff2 files ship inside the
// npm packages and are webpack-bundled at render time, so rendering never
// contacts Google (fonts.gstatic.com is blocked in China). This replaces the
// old @remotion/google-fonts setup that fetched fonts at render time.
// Only the weights each font actually uses are imported.
import "@fontsource/archivo-black/400.css";
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/700.css";
import "@fontsource/noto-serif-sc/400.css";
import "@fontsource/noto-serif-sc/700.css";
import "@fontsource/noto-serif-sc/900.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";
import "@fontsource/bebas-neue/400.css";
import "@fontsource/russo-one/400.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import narration from "../narration.json";
import config from "../video.config.json";
import { getTheme, type FontRole } from "./components/themes";

// =====================================================
// THEME + ORIENTATION (from video.config.json)
// =====================================================
const theme = getTheme((config as { template?: string }).template);
const orientation = (config as { orientation?: string }).orientation === "portrait" ? "portrait" : "landscape";
const subtitlesEnabled = (config as { subtitles?: boolean }).subtitles !== false; // default: true
const WIDTH = orientation === "portrait" ? 1080 : 1920;
const HEIGHT = orientation === "portrait" ? 1920 : 1080;

// =====================================================
// FONT FAMILIES
// The @fontsource CSS imports above register each family via @font-face
// (woff2 bundled locally — no network fetch at render). The active theme
// decides which drives display / body / mono text (see themes.ts `fonts`).
// Family names must match the @font-face declarations in each package.
// =====================================================
const FONT_FAMILIES: Record<FontRole, string> = {
  archivoBlack: "Archivo Black",
  notoSansSC: "Noto Sans SC",
  notoSerifSC: "Noto Serif SC",
  spaceGrotesk: "Space Grotesk",
  playfairDisplay: "Playfair Display",
  bebasNeue: "Bebas Neue",
  russoOne: "Russo One",
  jetBrainsMono: "JetBrains Mono",
};

const fontDisplay = FONT_FAMILIES[theme.fonts.display];
const fontBody = FONT_FAMILIES[theme.fonts.body];
const fontMono = FONT_FAMILIES[theme.fonts.mono];

// =====================================================
// TIMING CONFIGURATION
// Each scene = padding_before + audio + padding_after
// =====================================================
const FPS = 30;
const PADDING_BEFORE_MS = 1500; // 1.5s visual intro before speech starts
const PADDING_AFTER_MS = 800;   // 0.8s visual hold after speech ends

function calculateSceneFrames() {
  const scenes: Array<{ from: number; duration: number; totalFrames: number }> = [];
  let currentFrame = 0;

  for (const scene of (narration as { scenes: Array<{ audioDuration?: number }> }).scenes) {
    const audioMs = scene.audioDuration || 12000; // default 12s placeholder
    const totalMs = PADDING_BEFORE_MS + audioMs + PADDING_AFTER_MS;
    const duration = Math.ceil((totalMs / 1000) * FPS);
    scenes.push({ from: currentFrame, duration, totalFrames: duration });
    currentFrame += duration;
  }

  return scenes;
}

// Extract subtitle data from narration.json
// Each scene may have a `subtitles` field with pre-calculated segments
function extractSubtitles(): Array<{ segments: Array<{ text: string; startFrame: number; endFrame: number }> }> {
  const narr = narration as { scenes: Array<{ text: string; audioDuration?: number; subtitles?: { segments: Array<{ text: string; startFrame: number; endFrame: number }> } }> };
  return narr.scenes.map((scene) => {
    if (scene.subtitles?.segments?.length) {
      return scene.subtitles;
    }
    // Fallback: if no pre-calculated subtitles, split text evenly across audio duration
    const audioMs = scene.audioDuration || 12000;
    const audioFrames = Math.ceil((audioMs / 1000) * FPS);
    const audioStart = Math.ceil((PADDING_BEFORE_MS / 1000) * FPS); // AUDIO_OFFSET_FRAMES
    return splitTextToSubtitles(scene.text, audioStart, audioFrames);
  });
}

// Split text into subtitle segments distributed evenly across the audio
function splitTextToSubtitles(
  text: string,
  audioStartFrame: number,
  audioDurationFrames: number
): { segments: Array<{ text: string; startFrame: number; endFrame: number }> } {
  // Split by Chinese punctuation or every ~18 characters
  const rawSegments: string[] = [];
  const sentenceRegex = /[^。！？；：\n]+[。！？；：\n]?/g;
  const matches = text.match(sentenceRegex) || [text];

  for (const match of matches) {
    const trimmed = match.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 24) {
      rawSegments.push(trimmed);
    } else {
      // Split long sentences at ~20 chars
      for (let i = 0; i < trimmed.length; i += 20) {
        rawSegments.push(trimmed.slice(i, i + 20));
      }
    }
  }

  if (rawSegments.length === 0) {
    rawSegments.push(text);
  }

  // Distribute segments evenly across audio duration
  const framesPerSegment = Math.floor(audioDurationFrames / rawSegments.length);
  const segments = rawSegments.map((segText, i) => ({
    text: segText,
    startFrame: audioStartFrame + i * framesPerSegment,
    endFrame: audioStartFrame + (i + 1) * framesPerSegment - 1,
  }));

  return { segments };
}

const sceneFrames = calculateSceneFrames();
const totalDuration = sceneFrames.reduce((sum, s) => sum + s.duration, 0);
const subtitles = subtitlesEnabled ? extractSubtitles() : [];

// =====================================================
// COVER DATA (from narration.json top-level fields)
// =====================================================
const narr = narration as {
  coverTitle?: string;
  coverSubtitle?: string;
  coverTag?: string;
  coverImage?: string | null;
};
const coverTitle = narr.coverTitle || "解说视频";
const coverSubtitle = narr.coverSubtitle || "";
const coverTag = narr.coverTag || "";
const coverImage = narr.coverImage || null;

// =====================================================
// COMPOSITION REGISTRATION
// Width/height come from video.config.json orientation.
// =====================================================
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="NarrationVideo"
        component={NarrationVideo as React.FC}
        durationInFrames={totalDuration}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          sceneFrames,
          fontDisplay,
          fontBody,
          fontMono,
          subtitles,
          templateId: theme.id,
          orientation,
        }}
      />
      <Composition
        id="Cover"
        component={Cover as React.FC}
        durationInFrames={1}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          title: coverTitle,
          subtitle: coverSubtitle,
          tag: coverTag,
          fontDisplay,
          fontBody,
          fontMono,
          coverImage,
          templateId: theme.id,
        }}
      />
    </>
  );
};
