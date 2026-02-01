# OpenClaw 🍊

Real-time observability dashboard for Clawdbot.

## What This Is

OpenClaw gives you visibility into what Clawdbot (me!) is doing — what tools I'm using, what files I'm accessing, what commands I'm running, and why I'm making decisions.

## Quick Start

```bash
cd /Users/takanome/Developer/perso/openclaw

# Run the server
node server.js
```

Open <http://localhost:3000>

## How It Works

1. **I log my actions** to `~/.clawdbot/logs/current.jsonl` using the `ClawLogger` class
2. **The dashboard polls** the API every 5 seconds for new events
3. **You see real-time activity** — sessions, tool calls, file access, etc.

## Using the Logger

### Quick Shell Logging

For quick logging from shell sessions:

```bash
# Source the helper
source /Users/takanome/Developer/perso/openclaw/clawlog.sh

# Log various events
clawlog tool_call "read()" tool=read path=SOUL.md reason="Checking identity"
clawfile SOUL.md read reason="Loading config"
clawexec "git status" reason="Checking repo state"
clawbrowser navigate "https://example.com"
clawmsg in "User message here"
clawmsg out "My response here"
clawthink "Deciding which approach to take..."
```

### TypeScript Logger

From any Clawdbot session, use the TypeScript logger:

```typescript
import { initLogger, getLogger } from "./lib/logger";

// Initialize at session start
initLogger("main-session", { 
  label: "Main Chat", 
  channel: "discord" 
});

const logger = getLogger();

// Log a tool call with reasoning
await logger.logTool("read", { path: "SOUL.md" }, 
  "Checking identity before responding");

// Log the result
await logger.logToolResult("read", "success", "Read 47 lines", 150);

// Log file access
await logger.logFileAccess("AGENTS.md", "read", "Loading workspace config");

// Log command execution
await logger.logExec("git status", "Checking repository state");

// Log browser activity
await logger.logBrowser("navigate", "https://example.com");

// Log reasoning/thoughts
await logger.logReasoning("Deciding which tool to use based on...");
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLAWDBOT SESSION                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ read file   │  │ exec cmd    │  │ browser actions     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                    │            │
│         └────────────────┴────────────────────┘            │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    │ ClawLogger│  ← Logs to JSONL          │
│                    └─────┬─────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
              ~/.clawdbot/logs/current.jsonl
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    OPENCLAW DASHBOARD                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ /api/events │  │/api/sessions│  │   /api/stats        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         └────────────────┴────────────────────┘            │
│                          │                                  │
│                    ┌─────┴─────┐                           │
│                    │  React UI │  ← Real-time updates      │
│                    └───────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

- `GET /api/events?limit=100&session=xxx&type=tool_call` — Recent events
- `GET /api/sessions` — Active/inactive sessions
- `GET /api/stats` — Today's aggregated stats

## Event Types

- `tool_call` / `tool_result` — Tool invocations and outcomes
- `file_access` — Read/write/edit operations
- `exec_command` — Shell command execution
- `browser_action` — Browser navigation/interaction
- `message_received` / `message_sent` — Chat messages
- `reasoning` — Agent thought process
- `session_start` / `session_end` — Session lifecycle

## Roadmap

- [ ] WebSocket real-time updates (instead of polling)
- [ ] Session replay (step through events chronologically)
- [ ] Tool usage analytics (graphs, trends)
- [ ] Search/filter events
- [ ] Export logs for debugging
- [ ] Mobile-responsive improvements
