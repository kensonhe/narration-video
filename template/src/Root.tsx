import "./index.css";
import { Composition } from "remotion";
import { NarrationVideo } from "./Video";
import { Cover } from "./Cover";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadNotoSansSC } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadNotoSerifSC } from "@remotion/google-fonts/NotoSerifSC";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadPlayfairDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadRussoOne } from "@remotion/google-fonts/RussoOne";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import narration from "../narration.json";
import config from "../video.config.json";
import { getTheme, type FontRole } from "./components/themes";

// =====================================================
// THEME + ORIENTATION (from video.config.json)
// =====================================================
const theme = getTheme((config as { template?: string }).template);
const orientation = (config as { orientation?: string }).orientation === "portrait" ? "portrait" : "landscape";
const WIDTH = orientation === "portrait" ? 1080 : 1920;
const HEIGHT = orientation === "portrait" ? 1920 : 1080;

// =====================================================
// FONT LOADING
// All families are loaded; the active theme decides which drives
// display / body / mono text (see themes.ts `fonts`).
// =====================================================
const archivoBlack = loadArchivoBlack();
const notoSansSC = loadNotoSansSC("normal", {
  weights: ["400", "700"],
  subsets: ["chinese-simplified", "latin"],
  ignoreTooManyRequestsWarning: true,
});
const notoSerifSC = loadNotoSerifSC("normal", {
  weights: ["400", "700", "900"],
  subsets: ["chinese-simplified", "latin"],
  ignoreTooManyRequestsWarning: true,
});
const spaceGrotesk = loadSpaceGrotesk("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});
const playfairDisplay = loadPlayfairDisplay("normal", {
  weights: ["400", "700", "900"],
  subsets: ["latin"],
});
const bebasNeue = loadBebasNeue();
const russoOne = loadRussoOne();
const jetBrainsMono = loadJetBrainsMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

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
const subtitles = extractSubtitles();

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
