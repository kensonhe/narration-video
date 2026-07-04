/**
 * MiniMax TTS Audio Generation Script
 *
 * Reads narration.json, calls MiniMax TTS API for each scene,
 * saves mp3 files to public/audio/, and writes audio durations
 * back to narration.json for Remotion frame calculation.
 *
 * Usage: MINIMAX_API_KEY=xxx npx tsx scripts/generate-audio.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

interface SceneNarration {
  id: string;
  title: string;
  text: string;
  audioDuration?: number; // ms, filled after generation
  subtitles?: {
    segments: Array<{
      text: string;
      startFrame: number;
      endFrame: number;
    }>;
  };
}

interface NarrationData {
  scenes: SceneNarration[];
}

interface MiniMaxResponse {
  data: {
    audio: string; // hex-encoded audio bytes
    status: number;
  };
  extra_info: {
    audio_length: number; // milliseconds
    audio_sample_rate: number;
    audio_size: number;
    bitrate: number;
    word_count: number;
    usage_characters: number;
    audio_format: string;
    audio_channel: number;
  };
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

const API_KEY = process.env.MINIMAX_API_KEY;
const API_BASE = process.env.MINIMAX_API_BASE || "https://api.minimax.io/v1";

if (!API_KEY) {
  console.error("Error: MINIMAX_API_KEY environment variable is required.");
  console.error("Usage: MINIMAX_API_KEY=xxx npx tsx scripts/generate-audio.ts");
  process.exit(1);
}

// =====================================================
// VOICE SETTINGS (from video.config.json)
// Falls back to the default narrator voice if the config or `voice`
// field is missing.
// =====================================================
interface VoiceConfig {
  voiceId?: string;
  speed?: number;
  pitch?: number;
}

function loadVoiceConfig(): Required<VoiceConfig> {
  const defaults = { voiceId: "audiobook_male_1", speed: 1.0, pitch: 0 };
  try {
    const configPath = join(PROJECT_ROOT, "video.config.json");
    if (existsSync(configPath)) {
      const cfg = JSON.parse(readFileSync(configPath, "utf-8")) as { voice?: VoiceConfig };
      return {
        voiceId: cfg.voice?.voiceId ?? defaults.voiceId,
        speed: cfg.voice?.speed ?? defaults.speed,
        pitch: cfg.voice?.pitch ?? defaults.pitch,
      };
    }
  } catch (err) {
    console.warn(`  ⚠ Could not read video.config.json, using default voice. (${err})`);
  }
  return defaults;
}

const VOICE = loadVoiceConfig();

async function generateAudio(text: string): Promise<{ audioBytes: Buffer; durationMs: number }> {
  const payload = {
    model: "speech-2.8-hd",
    text,
    stream: false,
    language_boost: "Chinese",
    output_format: "hex",
    voice_setting: {
      voice_id: VOICE.voiceId,
      speed: VOICE.speed,
      vol: 1.0,
      pitch: VOICE.pitch,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
  };

  const response = await fetch(`${API_BASE}/t2a_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = (await response.json()) as MiniMaxResponse;

  if (result.base_resp.status_code !== 0) {
    throw new Error(`API Error [${result.base_resp.status_code}]: ${result.base_resp.status_msg}`);
  }

  const audioHex = result.data?.audio;
  if (!audioHex) {
    throw new Error("No audio data in response");
  }

  // Decode hex to binary
  const audioBytes = Buffer.from(audioHex, "hex");

  return {
    audioBytes,
    durationMs: result.extra_info.audio_length,
  };
}

async function main() {
  // Read narration data
  const narrationPath = join(PROJECT_ROOT, "narration.json");
  const narration: NarrationData = JSON.parse(readFileSync(narrationPath, "utf-8"));

  // Ensure audio output directory exists
  const audioDir = join(PROJECT_ROOT, "public", "audio");
  if (!existsSync(audioDir)) {
    mkdirSync(audioDir, { recursive: true });
  }

  console.log(`Generating audio for ${narration.scenes.length} scenes...`);
  console.log(`Voice: ${VOICE.voiceId} (speed ${VOICE.speed}, pitch ${VOICE.pitch})\n`);

  for (let i = 0; i < narration.scenes.length; i++) {
    const scene = narration.scenes[i];
    const outputFile = join(audioDir, `${scene.id}.mp3`);

    console.log(`[${i + 1}/${narration.scenes.length}] ${scene.title}: "${scene.text.substring(0, 30)}..."`);

    try {
      const { audioBytes, durationMs } = await generateAudio(scene.text);

      // Save audio file
      writeFileSync(outputFile, audioBytes);

      // Update narration data with duration
      scene.audioDuration = durationMs;

      console.log(`  ✓ Saved: ${scene.id}.mp3 (${(audioBytes.length / 1024).toFixed(1)} KB, ${(durationMs / 1000).toFixed(1)}s)`);

      // Rate limit: small delay between requests
      if (i < narration.scenes.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`  ✗ Failed: ${error}`);
      process.exit(1);
    }
  }

  // Write updated narration.json with durations
  writeFileSync(narrationPath, JSON.stringify(narration, null, 2));

  console.log(`\n✓ All audio generated successfully!`);
  console.log(`  Updated narration.json with audio durations.`);

  // Print summary
  const totalMs = narration.scenes.reduce((sum, s) => sum + (s.audioDuration || 0), 0);
  console.log(`  Total duration: ${(totalMs / 1000).toFixed(1)}s (${(totalMs / 60000).toFixed(1)} min)`);

  // Generate subtitle timing for each scene
  console.log(`\n→ Generating subtitle timing...`);
  const FPS = 30;
  const AUDIO_OFFSET_FRAMES = Math.ceil((1500 / 1000) * FPS); // PADDING_BEFORE_MS = 1500

  for (const scene of narration.scenes) {
    const audioDurationMs = scene.audioDuration || 12000;
    const audioDurationFrames = Math.ceil((audioDurationMs / 1000) * FPS);

    // Split text into subtitle segments
    const segments = splitTextToSegments(scene.text, AUDIO_OFFSET_FRAMES, audioDurationFrames);
    scene.subtitles = { segments };

    console.log(`  ${scene.id}: ${segments.length} subtitle segments`);
  }

  // Write narration.json again with subtitle data
  writeFileSync(narrationPath, JSON.stringify(narration, null, 2));
  console.log(`\n✓ Subtitle timing saved to narration.json`);
}

/**
 * Split narration text into subtitle segments distributed evenly across audio duration.
 *
 * Strategy:
 * 1. Split by Chinese punctuation (。！？；：)
 * 2. Further split long sentences at ~20 characters
 * 3. Distribute segments evenly across the audio timeline
 */
function splitTextToSegments(
  text: string,
  audioStartFrame: number,
  audioDurationFrames: number
): Array<{ text: string; startFrame: number; endFrame: number }> {
  // Split by Chinese punctuation marks
  const rawSegments: string[] = [];
  const sentenceRegex = /[^。！？；：\n]+[。！？；：\n]?/g;
  const matches = text.match(sentenceRegex) || [text];

  for (const match of matches) {
    const trimmed = match.trim();
    if (!trimmed) continue;
    // If segment is short enough, keep as-is
    if (trimmed.length <= 24) {
      rawSegments.push(trimmed);
    } else {
      // Split long sentences at ~20 character boundaries
      // Try to break at spaces or punctuation if possible
      for (let i = 0; i < trimmed.length; i += 20) {
        const chunk = trimmed.slice(i, i + 20);
        if (chunk.trim()) rawSegments.push(chunk.trim());
      }
    }
  }

  if (rawSegments.length === 0) {
    rawSegments.push(text);
  }

  // Distribute segments evenly across the audio duration
  const framesPerSegment = Math.max(15, Math.floor(audioDurationFrames / rawSegments.length));
  const segments = rawSegments.map((segText, i) => ({
    text: segText,
    startFrame: audioStartFrame + i * framesPerSegment,
    endFrame: audioStartFrame + (i + 1) * framesPerSegment - 1,
  }));

  return segments;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});