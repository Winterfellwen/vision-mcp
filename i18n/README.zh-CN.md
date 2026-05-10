[![English](https://img.shields.io/badge/lang-English-blue)](../README.md)

# Vision MCP Server

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) 视觉服务器 — 通过任意 OpenAI 兼容 API（OpenAI、OpenRouter、Together、Groq 等）对图片进行分析、对比和文字提取。

## 工具

### `analyze_image` — 分析图片

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `imagePath` | string | 是 | — | 图片 URL 或本地路径 |
| `query` | string | 否 | `"Describe this image in detail."` | 自定义提问 |

### `compare_images` — 对比两张图片

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `image1` | string | 是 | — | 第一张图片 URL 或本地路径 |
| `image2` | string | 是 | — | 第二张图片 URL 或本地路径 |
| `query` | string | 否 | `"Compare these two images..."` | 自定义对比问题 |

### `extract_text` — 提取图片文字（OCR）

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `imagePath` | string | 是 | — | 图片 URL 或本地路径 |
| `prompt` | string | 否 | `"Extract all text from this image."` | 自定义 OCR 提示 |

## 快速开始

```bash
git clone https://github.com/Winterfellwen/vision-mcp.git
cd vision-mcp
npm install
VISION_API_KEY=sk-... node index.js
```

服务器通过 **stdio**（标准 MCP 传输协议）监听。将其连接到你的 MCP 兼容客户端即可使用。

## 配置

所有设置通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VISION_API_KEY` | — | API 密钥 **（必填）** |
| `VISION_MODEL` | `gpt-4o-mini` | 视觉模型 ID |
| `VISION_API_URL` | OpenAI 默认 | API 地址（如 `https://api.openai.com/v1`） |
| `VISION_RATE_LIMIT_RPM` | `20` | 每分钟请求数限制 |
| `VISION_IMAGE_MAX_DIM` | `768` | 图片最大尺寸（像素） |
| `VISION_IMAGE_QUALITY` | `70` | JPEG 压缩质量（1–100） |
| `VISION_PROXY_ENABLED` | `true` | 是否启用 SOCKS5 代理 |
| `VISION_PROXY_URL` | — | SOCKS5 代理地址（如 `socks5://127.0.0.1:10808`） |
| `VISION_TIMEOUT` | `120000` | API 请求超时（毫秒） |
| `VISION_MAX_RETRIES` | `5` | 临时错误最大重试次数 |
| `VISION_RETRY_DELAY` | `2000` | 重试初始等待时间（毫秒） |
| `VISION_RETRY_MAX_DELAY` | `15000` | 重试最大等待时间（毫秒） |

## 支持的 API 提供商

兼容任何 OpenAI 格式的 API：

| 提供商 | `VISION_API_URL` | 示例模型 |
|--------|------------------|----------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini`、`gpt-4o` |
| OpenRouter | `https://openrouter.ai/api/v1` | `nvidia/nemotron-nano-12b-v2-vl:free` |
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.2-90b-vision-preview` |
| 其他 | 你的地址 | 你的模型 |

## 集成到 AI 编程工具

Vision MCP 兼容所有 MCP 客户端。各工具的配置方法见 [INTEGRATIONS.md](../INTEGRATIONS.md)：

- **OpenCode** — 配置 `opencode.jsonc`
- **Claude Code** — 配置 `~/.claude/settings.json`
- **Cursor** — 配置 `.cursor/mcp.json`
- **Windsurf** — 配置 `.windsurf/mcp_config.json`
- **Continue.dev** — 配置 `.continuerc.json`
- **GitHub Copilot** — 配置 `~/.config/github-copilot/mcp.json`
- **Gemini CLI** — 配置 `~/.config/gemini/mcp.json`

## 功能特性

- **图片压缩** — 通过 Jimp 自动缩放（最大 768px）和 JPEG 压缩（质量 70），减少 token 消耗
- **频率限制** — 滑动窗口限流（可配置 RPM），超限时等待而非拒绝
- **自动重试** — 对 404/429/5xx/网络错误进行指数退避重试（2s → 4s → 8s → 16s → 32s）
- **请求队列** — 并发请求自动排队，逐个处理，防止 API 冲突
- **SOCKS5 代理** — 可选代理，适合受限网络环境（中国、企业防火墙等）
- **对比模式** — 单次 API 调用同时发送两张图片，自动缩放至相同宽度，保证对比一致性

## 在 OpenCode 中使用

```
分析图片：   !vision.analyze_image imagePath=/path/to/photo.png
对比图片：   !vision.compare_images image1=/path/to/a.png image2=/path/to/b.png
提取文字：   !vision.extract_text imagePath=/path/to/document.png
```

## 系统架构

```
                    ┌──────────────┐
  MCP 客户端 ◄─────►│  index.js    │
   (stdio 通信)     │  (MCP 服务)  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  OpenAI 兼容  │
                    │  API 提供商   │
                    └──────────────┘
```

1. 通过 MCP 接收图片路径 → Jimp 加载并压缩 → base64 编码
2. 通过 OpenAI SDK 发送至兼容的视觉 API
3. 通过 MCP 返回分析结果

## 许可证

MIT
