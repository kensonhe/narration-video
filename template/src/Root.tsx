import "./index.css";
import { Composition } from "remotion";
import { NarrationVideo } from "./Video";
import { Cover } from "./Cover";
import { loadLocalFont } from "./components/LocalFonts";
import narration from "../narration.json";
import config from "../video.config.json";
import fontManifest from "../font-manifest.json";
import { getTheme, type FontRole } from "./components/themes";

// =====================================================
// THEME + ORIENTATION (from video.config.json)
// =====================================================
const theme = getTheme((config as { template?: string }).template);
const orientation = (config as { orientation?: string }).orientation === "portrait" ? "portrait" : "landscape";
const subtitlesEnabled = (config as { subtitles?: boolean }).subtitles !== false; // default: true
const sound = (config as { sound?: {
  bgm?: string | null;
  bgmVolume?: number;
  transitionSfx?: string | null;
  transitionVolume?: number;
} }).sound; // optional BGM + transition SFX; undefined = voice-only
const WIDTH = orientation === "portrait" ? 1080 : 1920;
const HEIGHT = orientation === "portrait" ? 1920 : 1080;

// =====================================================
// FONT LOADING (local — no Google CDN required)
// All families are loaded from public/fonts/ via font-manifest.json.
// The active theme decides which drives display / body / mono text.
// =====================================================
const manifest = fontManifest as Record<string, Array<{ filename: string; weight: string }>>;

const archivoBlack = loadLocalFont("ArchivoBlack", "Archivo Black", manifest["ArchivoBlack"] || []);
const notoSansSC = loadLocalFont("NotoSansSC", "Noto Sans SC", manifest["NotoSansSC"] || []);
const notoSerifSC = loadLocalFont("NotoSerifSC", "Noto Serif SC", manifest["NotoSerifSC"] || []);
const spaceGrotesk = loadLocalFont("SpaceGrotesk", "Space Grotesk", manifest["SpaceGrotesk"] || []);
const playfairDisplay = loadLocalFont("PlayfairDisplay", "Playfair Display", manifest["PlayfairDisplay"] || []);
const bebasNeue = loadLocalFont("BebasNeue", "Bebas Neue", manifest["BebasNeue"] || []);
const russoOne = loadLocalFont("RussoOne", "Russo One", manifest["RussoOne"] || []);
const jetBrainsMono = loadLocalFont("JetBrainsMono", "JetBrains Mono", manifest["JetBrainsMono"] || []);

const FONT_FAMILIES: Record<FontRole, string> = {
  archivoBlack: archivoBlack.fontFamily,
  notoSansSC: notoSansSC.fontFamily,
  notoSerifSC: notoSerifSC.fontFamily,
  spaceGrotesk: spaceGrotesk.fontFamily,
  playfairDisplay: playfairDisplay.fontFamily,
  bebasNeue: bebasNeue.fontFamily,
  russoOne: russoOne.fontFamily,
  jetBrainsMono: jetBrainsMono.fontFamily,
};

const fontDisplay = FONT_FAMILIES[theme.fonts.display];
const fontBody = FONT_FAMILIES[theme.fonts.body];
const fontMono = FONT_FAMILIES[theme.fonts.mono];

// =====================================================
// TIMING CONFIGURATION
// Each scene = padding_before + audio + padding_after
// =====================================================
const FPS = 30;
// Keep the pre-speech gap tiny: on 抖音 the first ~2s decide whether a viewer stays,
// so narration must start almost immediately (声音一开始就说话). The scene visuals still
// animate in from frame 0 — this only controls when the voice begins. A short gap also
// tightens pacing across every scene (节奏快). If you ever need a slower, calmer intro
// (e.g. a long-form documentary), raise this — but for short-form keep it ≤ ~300ms.
const PADDING_BEFORE_MS = 300;  // ~0.3s before speech starts (was 1500ms)
const PADDING_AFTER_MS = 500;   // 0.5s visual hold after speech ends (was 800ms)

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
          sound,
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
