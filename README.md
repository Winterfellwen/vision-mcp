# Vision MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that provides vision capabilities — analyze, compare, and extract text from images using [OpenRouter](https://openrouter.ai) vision models.

## Tools

### `analyze_image`
Analyze an image and describe its contents.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `imagePath` | string | yes | — | URL or local file path |
| `query` | string | no | `"Describe this image in detail."` | Custom question |

### `compare_images`
Compare two images and describe their differences.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image1` | string | yes | — | First image URL or local path |
| `image2` | string | yes | — | Second image URL or local path |
| `query` | string | no | `"Compare these two images..."` | Custom comparison question |

### `extract_text`
Extract text from an image (OCR).

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `imagePath` | string | yes | — | URL or local file path |
| `prompt` | string | no | `"Extract all text from this image."` | Custom OCR prompt |

## Quick Start

### Prerequisites
- Node.js 20+
- An [OpenRouter](https://openrouter.ai) API key

### Install

```bash
git clone https://github.com/Winterfellwen/vision-mcp.git
cd vision-mcp
npm install
```

### Configure

Set environment variables:

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
export OPENROUTER_MODEL=nvidia/nemotron-nano-12b-v2-vl:free
```

Or use a `.env` file (not committed). See `opencode.json.example` for all options.

### Run

```bash
node index.js
```

The server listens on **stdio** (standard MCP transport).

## Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | — | OpenRouter API key **(required)** |
| `OPENROUTER_MODEL` | `nvidia/nemotron-nano-12b-v2-vl:free` | Vision model ID |
| `OPENROUTER_API_URL` | `https://openrouter.ai/api/v1` | API base URL |
| `OPENROUTER_RATE_LIMIT_RPM` | `20` | Rate limit (requests per minute) |
| `OPENROUTER_IMAGE_MAX_DIM` | `768` | Max image dimension (px) |
| `OPENROUTER_IMAGE_QUALITY` | `70` | JPEG compression quality (1–100) |
| `OPENROUTER_PROXY_ENABLED` | `true` | Enable/disable SOCKS5 proxy |
| `OPENROUTER_PROXY_URL` | — | SOCKS5 proxy URL (e.g. `socks5://127.0.0.1:10808`) |
| `OPENROUTER_SITE_URL` | `https://opencode.ai` | Referer header for OpenRouter |
| `OPENROUTER_SITE_NAME` | `VisionMCP` | Site name header for OpenRouter |

## Integrate with OpenCode

Add to your `opencode.jsonc`:

```jsonc
{
  "mcp": {
    "vision": {
      "type": "local",
      "command": ["node", "/path/to/vision-mcp/index.js"],
      "enabled": true,
      "environment": {
        "OPENROUTER_API_KEY": "sk-or-v1-...",
        "OPENROUTER_MODEL": "nvidia/nemotron-nano-12b-v2-vl:free"
      }
    }
  }
}
```

## Architecture

```
                    ┌──────────────┐
  MCP Client ◄─────►│  index.js    │
    (stdio)         │  (stdio MCP) │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  OpenRouter  │
                    │  Vision API  │
                    └──────────────┘
```

- **Image compression**: Images are resized (max 768px), converted to JPEG (quality 70) via Jimp before sending
- **Rate limiting**: Sliding window (configurable RPM), waits instead of rejecting
- **Retry with backoff**: Retries on 404/429/5xx/connection errors with exponential backoff (2s→4s→8s→16s→32s)
- **Sequential queue**: Concurrent requests are queued and processed one at a time
- **Proxy**: Optional SOCKS5 proxy for networks that block OpenRouter

## Usage in OpenCode Prompts

```
Analyze this image: !vision.analyze_image imagePath=/path/to/photo.png

Compare two images: !vision.compare_images image1=/path/to/a.png image2=/path/to/b.png

Extract text: !vision.extract_text imagePath=/path/to/document.png
```

## License

MIT
