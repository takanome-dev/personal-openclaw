# OpenClaw Development Log

Tracking incremental improvements to the observability dashboard.

## Current Status
- **Approach:** Vanilla Node.js server + static HTML/CSS/JS
- **Goal:** Multi-agent observability for Venice/Opus/Kimi setup

---

## Phase 1: Foundation Fixes

### 1.1 Fix Data Paths ✅
- [x] Update `~/.clawdbot/` → `~/.openclaw/`
- [x] Read transcripts from correct location
- [x] Test with actual session data

### 1.2 Multi-Agent Discovery ✅
- [x] Scan `~/.openclaw/agents/*/` for all agents
- [x] Add `/api/agents` endpoint
- [x] Include agentId in sessions and events
- [x] List agents in sidebar (UI)
- [x] Filter sessions by agent (UI)
- [x] Show agent emoji in session list
- [x] Show agent badge in events

### 1.3 Improve Session Reading ✅
- [x] Read from `~/.openclaw/agents/*/sessions/`
- [x] Parse session metadata correctly
- [x] Show channel info (Discord, webchat, etc.)

---

## Phase 2: UI Improvements

### 2.1 Channel Display ✅
- [x] Parse channel from session metadata (Discord, webchat, etc.)
- [x] Display channel badges in events and sessions
- [x] Channel icons and colors per platform

### 2.2 Better Event Display ✅
- [x] Event color-coding by type (left border)
- [x] Tool call expand/collapse with full args
- [x] Channel badges in event header

### 2.3 Agent Status Indicators ⏳
- [ ] Show all agents with status
- [ ] Active/idle indicators per agent

### 2.4 Cost Tracking ⏳
- [ ] Parse usage from transcripts
- [ ] Show cost per session
- [ ] Daily cost summary

---

## Phase 3: Advanced Features

### 3.1 Real-time Updates
- [ ] WebSocket instead of polling
- [ ] Live event stream

### 3.2 Session Timeline
- [ ] Visual timeline of events
- [ ] Spawn relationships (who spawned who)

---

## Changelog

### 2026-02-07 — Phase 1 & Phase 2 Partial 🎉

**Phase 1 Complete: Multi-Agent Observability**

**Backend (server.js):**
- Fixed paths: `~/.clawdbot/` → `~/.openclaw/`
- Added `discoverAgents()` to scan all agent directories
- Added `/api/agents` endpoint returning agent list with session counts
- Updated session/event reading to support all agents
- Added agent filtering to `/api/events?agent=xxx`
- Extract and include channel info in sessions and events

**Frontend (public/):**
- Added Agents panel in sidebar
- Click agent to filter sessions/events
- "All Agents" option shows combined view
- Agent emoji badges in session list (when viewing all)
- Agent badges in event metadata

**Phase 2 Partial: UI Enhancements**

**Backend (server.js):**
- Channel info parsing from session metadata

**Frontend (public/):**
- Channel badges with icons (Discord 💬, webchat 🌐, etc.)
- Channel-specific colors
- Event color-coding by type (left border indicator)
- Tool call expand/collapse with full args display
- Improved event layout with channel badges

**Files changed:**
- `server.js` — Channel extraction, multi-agent backend
- `public/app.js` — Channel badges, event color-coding, tool call details
- `public/style.css` — Agent panel, channel badges, expand/collapse styles
