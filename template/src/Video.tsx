import { AbsoluteFill, Sequence, staticFile, interpolate } from "remotion";
import { Audio } from "@remotion/media";
import { Subtitles, ThemeProvider, type SubtitleData } from "./components/SharedComponents";
import { getTheme, type TemplateId } from "./components/themes";

// =====================================================
// SCENE IMPORTS
// Add/remove imports here as scenes are created.
// Each scene component lives in src/scenes/SceneXXName.tsx
// =====================================================
// import { Scene01Title } from "./scenes/Scene01Title";
// import { Scene02Framework } from "./scenes/Scene02Framework";
// ... etc

// =====================================================
// TYPES
// =====================================================
export interface SceneFrameData {
  from: number;
  duration: number;
  totalFrames: number;
}

export interface VideoProps {
  sceneFrames: SceneFrameData[];
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
  subtitles?: SubtitleData[]; // Per-scene subtitle data
  templateId?: TemplateId;    // Active visual template (from video.config.json)
  orientation?: "landscape" | "portrait";
  sound?: SoundConfig;        // Optional BGM + transition SFX (from video.config.json)
}

// Optional sound layer. All fields are opt-in — when a path is null/absent, that
// audio element is simply not rendered, so a missing file never breaks the render.
export interface SoundConfig {
  bgm?: string | null;         // path under public/, e.g. "audio/bgm/track.mp3"; null = no BGM
  bgmVolume?: number;          // steady BGM level, ducked well under the voice (default 0.1)
  transitionSfx?: string | null; // path under public/, played at each scene start; null = off
  transitionVolume?: number;   // SFX level (default 0.3)
}

// =====================================================
// SCENE REGISTRY
// Update this array when adding/removing scenes.
// Order must match narration.json scenes order.
// =====================================================
const SCENE_COMPONENTS: React.FC<any>[] = [
  // Scene01Title,
  // Scene02Framework,
  // ... add scene components here
];

const SCENE_AUDIO_IDS: string[] = [
  // "scene01",
  // "scene02",
  // ... matches narration.json scene IDs
];

// Audio starts ~0.3s (9 frames at 30fps) into each scene — narration must begin almost
// immediately so the first 2s hook lands (抖音前2秒跳出率高). Must match PADDING_BEFORE_MS
// in Root.tsx and the offset in scripts/generate-audio.ts.
const AUDIO_OFFSET_FRAMES = 9;

// =====================================================
// MAIN VIDEO COMPONENT
// Orchestrates scenes, audio, and subtitles under the active theme.
// =====================================================
export const NarrationVideo: React.FC<VideoProps> = ({
  sceneFrames,
  fontDisplay,
  fontBody,
  fontMono,
  subtitles,
  templateId,
  orientation = "landscape",
  sound,
}) => {
  const totalScenes = sceneFrames.length;
  const theme = getTheme(templateId);
  const isPortrait = orientation === "portrait";

  // Total timeline length, used for the BGM fade-out envelope.
  const totalFrames = sceneFrames.reduce((sum, s) => sum + s.duration, 0);

  // BGM: one track under the whole video, ducked well below the voice so narration
  // stays intelligible, with a 1s fade-in and ~1.7s fade-out envelope. Only rendered
  // when a path is configured — a missing/absent file leaves the video voice-only.
  const bgmPath = sound?.bgm;
  const bgmVolume = sound?.bgmVolume ?? 0.1;
  const FADE_IN = 30;   // 1s
  const FADE_OUT = 50;  // ~1.7s
  const transitionSfx = sound?.transitionSfx;
  const transitionVolume = sound?.transitionVolume ?? 0.3;

  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.bg.base }}>
        {/* Background music bed (optional) — spans the entire timeline, auto-ducked
            under the voice via a low steady volume + fade in/out envelope. */}
        {bgmPath && (
          <Audio
            src={staticFile(bgmPath)}
            volume={(f) =>
              interpolate(
                f,
                [0, FADE_IN, totalFrames - FADE_OUT, totalFrames],
                [0, bgmVolume, bgmVolume, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              )
            }
          />
        )}

        {sceneFrames.map((sf, i) => {
          const SceneComponent = SCENE_COMPONENTS[i];
          if (!SceneComponent) return null;

          const sceneSubtitles = subtitles?.[i];

          return (
            <Sequence
              key={i}
              from={sf.from}
              durationInFrames={sf.duration}
              name={`Scene ${i + 1}`}
            >
              {/* Scene visuals */}
              <SceneComponent
                fontDisplay={fontDisplay}
                fontBody={fontBody}
                fontMono={fontMono}
                sceneIndex={i}
                totalScenes={totalScenes}
              />

              {/* Transition SFX (optional) — a short whoosh/soft cut at each scene
                  start (skipped on scene 1 so it doesn't fight the opening hook). */}
              {transitionSfx && i > 0 && (
                <Audio src={staticFile(transitionSfx)} volume={transitionVolume} />
              )}

              {/* Scene audio */}
              <Audio
                src={staticFile(`audio/${SCENE_AUDIO_IDS[i]}.mp3`)}
                from={AUDIO_OFFSET_FRAMES}
                volume={1.0}
              />

              {/* Subtitles overlay — only if subtitle data exists for this scene */}
              {sceneSubtitles && (
                <Subtitles
                  subtitles={sceneSubtitles}
                  fontFamily={fontBody}
                  audioOffsetFrames={AUDIO_OFFSET_FRAMES}
                  portrait={isPortrait}
                />
              )}
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
