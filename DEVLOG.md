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
- [ ] Show channel info (Discord, webchat, etc.) ⏳

---

## Phase 2: UI Improvements

### 2.1 Agent Sidebar
- [ ] Show all agents with status
- [ ] Click to filter by agent
- [ ] Show session count per agent

### 2.2 Better Event Display
- [ ] Color-code by agent
- [ ] Show tool call details
- [ ] Expand/collapse for full content

### 2.3 Cost Tracking
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

### 2026-02-07 — Phase 1 Complete 🎉

**Backend (server.js):**
- Fixed paths: `~/.clawdbot/` → `~/.openclaw/`
- Added `discoverAgents()` to scan all agent directories
- Added `/api/agents` endpoint returning agent list with session counts
- Updated session/event reading to support all agents
- Added agent filtering to `/api/events?agent=xxx`
- Agent emojis: 🧠 main, 🎭 venice, 💻 kimi

**Frontend (public/):**
- Added Agents panel in sidebar
- Click agent to filter sessions/events
- "All Agents" option shows combined view
- Agent emoji badges in session list (when viewing all)
- Agent badges in event metadata
- Styled agent selector with active state

**Files changed:**
- `server.js` — Multi-agent backend
- `public/index.html` — Added agents panel
- `public/style.css` — Agents panel styles
- `public/app.js` — Agent fetching, filtering, rendering
