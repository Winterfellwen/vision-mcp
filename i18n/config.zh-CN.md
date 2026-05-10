# 配置说明 — Vision MCP Server

所有设置通过**环境变量**配置，在启动服务器前设置即可。

---

## 必填项

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VISION_API_KEY` | — | API 密钥（必填） |

---

## API 连接

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VISION_MODEL` | `gpt-4o-mini` | 视觉模型 ID |
| `VISION_API_URL` | OpenAI 官方地址 | API 地址，如 `https://api.openai.com/v1` |
| `VISION_TIMEOUT` | `120000` | API 请求超时时间（毫秒） |

---

## 频率限制（Rate Limiting）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VISION_RATE_LIMIT_RPM` | `20` | 每分钟最大 API 请求数（Requests Per Minute） |

### 工作原理

- **滑动窗口机制**：以最近 60 秒为窗口，统计已发请求次数。
- **自动等待**：当窗口内请求数 ≥ 限制值时，自动计算需要等待的时间，然后暂停执行。
- **对 AI 透明**：所有等待在 MCP 内部完成，AI 端无感知，只会等待最终结果返回。
- **计算公式**：`等待时间 = 最早请求的时间戳 + 60000ms - 当前时间 + 100ms 缓冲`

### 示例

```bash
# 默认每分钟最多 20 次请求
VISION_RATE_LIMIT_RPM=20

# 放宽到每分钟 60 次
VISION_RATE_LIMIT_RPM=60

# 关闭限流（设为 0）
VISION_RATE_LIMIT_RPM=0
```

---

## 图片处理

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VISION_IMAGE_MAX_DIM` | `768` | 图片最大尺寸（像素），长宽按比例缩放 |
| `VISION_IMAGE_QUALITY` | `70` | JPEG 压缩质量（1–100，数值越小压缩越狠） |

---

## 重试机制

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VISION_MAX_RETRIES` | `5` | 临时错误最大重试次数 |
| `VISION_RETRY_DELAY` | `2000` | 重试初始等待时间（毫秒），指数退避 |
| `VISION_RETRY_MAX_DELAY` | `15000` | 重试最大等待时间（毫秒） |

### 重试退避序列

| 第几次重试 | 等待时间 |
|------------|----------|
| 1 | ~2s |
| 2 | ~4s |
| 3 | ~8s |
| 4 | ~16s |
| 5 | ~32s（上限 15s） |

---

## 代理设置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VISION_PROXY_ENABLED` | `true` | 是否启用 SOCKS5 代理 |
| `VISION_PROXY_URL` | — | SOCKS5 代理地址，如 `socks5://127.0.0.1:10808` |

---

## 支持的 API 提供商

| 提供商 | `VISION_API_URL` 设置 | 示例模型 |
|--------|----------------------|----------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o` |
| OpenRouter | `https://openrouter.ai/api/v1` | `nvidia/nemotron-nano-12b-v2-vl:free` |
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.2-90b-vision-preview` |

---

## 快速配置示例

```bash
# Linux / macOS
export VISION_API_KEY="sk-..."
export VISION_RATE_LIMIT_RPM="30"
export VISION_MODEL="gpt-4o-mini"
node index.js

# Windows (PowerShell)
$env:VISION_API_KEY="sk-..."
$env:VISION_RATE_LIMIT_RPM="30"
$env:VISION_MODEL="gpt-4o-mini"
node index.js
```