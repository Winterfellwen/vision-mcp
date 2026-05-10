# Integrating Vision MCP with AI Coding Tools

This server provides vision capabilities via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io). Below are instructions for each supported AI coding tool.

## OpenCode

Add to `opencode.jsonc` (project or global):

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

## Claude Code

Add to `~/.claude/settings.json` (global) or `claude.json` (project):

```json
{
  "mcpServers": {
    "vision": {
      "command": "node",
      "args": ["/path/to/vision-mcp/index.js"],
      "env": {
        "VISION_API_KEY": "sk-...",
        "VISION_MODEL": "gpt-4o-mini",
        "VISION_API_URL": "https://api.openai.com/v1"
      }
    }
  }
}
```

See example: `integrations/claude-code.json`

## Cursor

Add to `.cursor/mcp.json` (project-level):

```json
{
  "mcpServers": {
    "vision": {
      "command": "node",
      "args": ["/path/to/vision-mcp/index.js"],
      "env": {
        "VISION_API_KEY": "sk-...",
        "VISION_MODEL": "gpt-4o-mini",
        "VISION_API_URL": "https://api.openai.com/v1"
      }
    }
  }
}
```

See example: `integrations/cursor.json`

## Windsurf

Add to `.windsurf/mcp_config.json` (project-level) or `~/.codeium/windsurf/mcp_config.json` (global):

```json
{
  "mcpServers": {
    "vision": {
      "command": "node",
      "args": ["/path/to/vision-mcp/index.js"],
      "env": {
        "VISION_API_KEY": "sk-...",
        "VISION_MODEL": "gpt-4o-mini",
        "VISION_API_URL": "https://api.openai.com/v1"
      }
    }
  }
}
```

See example: `integrations/windsurf.json`

## Continue.dev

Add to `.continuerc.json` (project-level) or `~/.continue/config.json` (global):

```json
{
  "experimental": {
    "mcpServers": {
      "vision": {
        "command": "node",
        "args": ["/path/to/vision-mcp/index.js"],
        "env": {
          "VISION_API_KEY": "sk-...",
          "VISION_MODEL": "gpt-4o-mini",
          "VISION_API_URL": "https://api.openai.com/v1"
        }
      }
    }
  }
}
```

See example: `integrations/continue.json`

## GitHub Copilot

Add to `~/.config/github-copilot/mcp.json`:

```json
{
  "mcpServers": {
    "vision": {
      "command": "node",
      "args": ["/path/to/vision-mcp/index.js"],
      "env": {
        "VISION_API_KEY": "sk-...",
        "VISION_MODEL": "gpt-4o-mini",
        "VISION_API_URL": "https://api.openai.com/v1"
      }
    }
  }
}
```

See example: `integrations/github-copilot.json`

## Gemini CLI

Add to `~/.config/gemini/mcp.json`:

```json
{
  "mcpServers": {
    "vision": {
      "command": "node",
      "args": ["/path/to/vision-mcp/index.js"],
      "env": {
        "VISION_API_KEY": "sk-...",
        "VISION_MODEL": "gpt-4o-mini",
        "VISION_API_URL": "https://api.openai.com/v1"
      }
    }
  }
}
```

## Generic MCP Client

For any MCP-compatible client, register the server with:

- **Command**: `node`
- **Arguments**: `/path/to/vision-mcp/index.js`
- **Environment variables**: `VISION_API_KEY`, `VISION_MODEL`, `VISION_API_URL` (see README for full list)

## Proxy Support

If your network blocks the API provider, add proxy environment variables:

```json
"env": {
  "VISION_API_KEY": "sk-...",
  "VISION_MODEL": "gpt-4o-mini",
  "VISION_API_URL": "https://api.openai.com/v1",
  "VISION_PROXY_ENABLED": "true",
  "VISION_PROXY_URL": "socks5://127.0.0.1:10808"
}
```
