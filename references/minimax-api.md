# MiniMax TTS API Reference

## Endpoints

| Region | URL |
|--------|-----|
| China (大陆) | `POST https://api.minimaxi.com/v1/t2a_v2` |
| Global | `POST https://api.minimax.io/v1/t2a_v2` |

**Note**: China endpoint uses `minimaxi.com` (extra 'i'). Use China endpoint for users in mainland China.

## Authentication

```
Authorization: Bearer <API_KEY>
```

Get API key from: https://platform.minimax.io → Account → API Keys

## Request Body

```json
{
  "model": "speech-2.8-hd",
  "text": "要合成的文本",
  "stream": false,
  "language_boost": "Chinese",
  "output_format": "hex",
  "voice_setting": {
    "voice_id": "audiobook_male_1",
    "speed": 1.0,
    "vol": 1.0,
    "pitch": 0
  },
  "audio_setting": {
    "sample_rate": 32000,
    "bitrate": 128000,
    "format": "mp3",
    "channel": 1
  }
}
```

## Response

```json
{
  "data": {
    "audio": "49443304...",
    "status": 2
  },
  "extra_info": {
    "audio_length": 11124,
    "audio_sample_rate": 32000,
    "audio_size": 179926,
    "bitrate": 128000,
    "word_count": 163,
    "usage_characters": 163,
    "audio_format": "mp3",
    "audio_channel": 1
  },
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

- `data.audio`: hex-encoded MP3 bytes → decode with `Buffer.from(hex, 'hex')`
- `extra_info.audio_length`: duration in milliseconds
- `base_resp.status_code`: 0 = success

## Recommended Voices for Narration

The skill offers these as selectable options (written into `video.config.json` → `voice.voiceId`):

| Voice ID | Name | Style | Best For |
|----------|------|-------|----------|
| `audiobook_male_1` | 有声书男声 | Warm narrator | **Default** — storytelling, explainers |
| `male-qn-jingying` | 精英青年男声 | Authoritative | Business/tech content |
| `audiobook_female_1` | 有声书女声 | Warm narrator | Female voice preference |
| `Chinese (Mandarin)_News_Anchor` | 新闻女声 | Formal | News-style narration |
| `doc_commentary` | 纪录片解说 | Documentary | Documentary narration |

## Models

| Model | Quality | Speed | Use When |
|-------|---------|-------|----------|
| `speech-2.8-hd` | Highest | Slower | **Production videos** (recommended) |
| `speech-2.8-turbo` | High | Fast | Real-time / testing |

## Limits

- **Sync API**: max 10,000 characters per request
- **Rate limit**: ~60 requests/minute
- **Pricing**: ~$100 per million characters (~$1/hour of audio)

## Special Text Tags

- `<#1.5#>` — Insert a 1.5-second pause (0.01–99.99s)
- `(laughs)`, `(sighs)`, `(breath)` — Interjections (speech-2.8 only)
