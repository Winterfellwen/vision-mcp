# Vision MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for vision tasks — analyze, compare, and extract text from images via any OpenAI-compatible API (OpenAI, OpenRouter, Together, Groq, etc.).

## Tools

### `analyze_image`
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `imagePath` | string | yes | — | URL or local file path |
| `query` | string | no | `"Describe this image in detail."` | Custom question |

### `compare_images`
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image1` | string | yes | — | First image URL or local path |
| `image2` | string | yes | — | Second image URL or local path |
| `query` | string | no | `"Compare these two images..."` | Custom question |

### `extract_text`
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `imagePath` | string | yes | — | URL or local file path |
| `prompt` | string | no | `"Extract all text from this image."` | Custom OCR prompt |

## Quick Start

```bash
git clone https://github.com/Winterfellwen/vision-mcp.git
cd vision-mcp
npm install
VISION_API_KEY=sk-... node index.js
```

## Configuration

All settings are configured via environment variables. Two naming styles are supported — `VISION_*` (preferred) and `OPENROUTER_*` (backward compatible). `VISION_*` values take priority.

| Variable | Default | Description |
|----------|---------|-------------|
| `VISION_API_KEY` | — | API key **(required)** |
| `VISION_MODEL` | `gpt-4o-mini` | Vision model ID |
| `VISION_API_URL` | OpenAI default | API base URL (e.g. `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`) |
| `VISION_RATE_LIMIT_RPM` | `20` | Rate limit (requests per minute) |
| `VISION_IMAGE_MAX_DIM` | `768` | Max image dimension in pixels |
| `VISION_IMAGE_QUALITY` | `70` | JPEG compression quality (1–100) |
| `VISION_PROXY_ENABLED` | `true` | Enable SOCKS5 proxy |
| `VISION_PROXY_URL` | — | SOCKS5 proxy URL (e.g. `socks5://127.0.0.1:10808`) |
| `VISION_TIMEOUT` | `120000` | API request timeout (ms) |
| `VISION_MAX_RETRIES` | `5` | Max retry attempts on transient errors |
| `VISION_RETRY_DELAY` | `2000` | Initial retry backoff (ms) |
| `VISION_RETRY_MAX_DELAY` | `15000` | Max retry backoff (ms) |

## Providers

This server uses the [OpenAI SDK](https://www.npmjs.com/package/openai) and works with any OpenAI-compatible API:

| Provider | `VISION_API_URL` | Example Model |
|----------|------------------|---------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o` |
| OpenRouter | `https://openrouter.ai/api/v1` | `nvidia/nemotron-nano-12b-v2-vl:free` |
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.2-90b-vision-preview` |
| Any OpenAI-compatible endpoint | your URL | your model |

## Integrate with OpenCode

```jsonc
{
  "mcp": {
    "vision": {
      "type": "local",
      "command": ["node", "/path/to/vision-mcp/index.js"],
      "enabled": true,
      "environment": {
        "VISION_API_KEY": "sk-...",
        "VISION_MODEL": "gpt-4o-mini",
        "VISION_API_URL": "https://api.openai.com/v1"
      }
    }
  }
}
```

## Features

- **Image compression** — resizes (max 768px) and compresses (JPEG quality 70) via Jimp before sending
- **Rate limiting** — sliding window (configurable RPM), waits instead of rejecting
- **Retry with backoff** — retries on 404/429/5xx/connection errors (2s→4s→8s→16s→32s)
- **Sequential queue** — concurrent requests are queued and processed one at a time
- **SOCKS5 proxy** — optional proxy for restricted networks
- **Compare mode** — sends both images in one API call, resized to the same width

## Usage in OpenCode

```
Analyze:      !vision.analyze_image imagePath=/path/to/photo.png
Compare:      !vision.compare_images image1=/path/to/a.png image2=/path/to/b.png
Extract text: !vision.extract_text imagePath=/path/to/document.png
```

## License

MIT
