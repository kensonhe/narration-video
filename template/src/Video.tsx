import { AbsoluteFill, Sequence, staticFile } from "remotion";
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

// Audio starts 1.5s (45 frames at 30fps) into each scene
const AUDIO_OFFSET_FRAMES = 45;

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
}) => {
  const totalScenes = sceneFrames.length;
  const theme = getTheme(templateId);
  const isPortrait = orientation === "portrait";

  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.bg.base }}>
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
