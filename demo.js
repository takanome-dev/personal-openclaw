const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.clawdbot', 'logs');
const CURRENT_LOG = path.join(LOG_DIR, 'current.jsonl');

async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch {}
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function logEvent(sessionId, type, action, details = {}) {
  const event = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    sessionId,
    type,
    action,
    ...details,
  };
  
  await ensureLogDir();
  await fs.appendFile(CURRENT_LOG, JSON.stringify(event) + '\n', 'utf-8');
}

// Demo logging
const sessionId = 'demo-session-' + Date.now();

async function main() {
  console.log('Logging demo events...');
  
  await logEvent(sessionId, 'tool_call', 'read()', {
    sessionLabel: 'Dashboard Demo',
    channel: 'openclaw',
    tool: 'read',
    args: { path: 'SOUL.md' },
    reason: 'Checking identity before responding',
    filePath: 'SOUL.md',
    resultStatus: 'success',
    resultSummary: 'Read 47 lines',
    durationMs: 150,
  });
  
  await logEvent(sessionId, 'file_access', 'read: AGENTS.md', {
    sessionLabel: 'Dashboard Demo',
    channel: 'openclaw',
    filePath: 'AGENTS.md',
    reason: 'Loading workspace config',
  });
  
  await logEvent(sessionId, 'exec_command', 'git status', {
    sessionLabel: 'Dashboard Demo',
    channel: 'openclaw',
    command: 'git status',
    reason: 'Checking repository state',
    resultStatus: 'success',
  });
  
  await logEvent(sessionId, 'tool_call', 'write()', {
    sessionLabel: 'Dashboard Demo',
    channel: 'openclaw',
    tool: 'write',
    args: { path: 'lib/logger.ts' },
    reason: 'Creating logger module',
    filePath: 'lib/logger.ts',
    resultStatus: 'success',
    resultSummary: 'Wrote 192 lines',
    durationMs: 300,
  });
  
  await logEvent(sessionId, 'browser_action', 'navigate', {
    sessionLabel: 'Dashboard Demo',
    channel: 'openclaw',
    url: 'http://localhost:3000',
  });
  
  await logEvent(sessionId, 'reasoning', 'Deciding to create a simple Node.js server first', {
    sessionLabel: 'Dashboard Demo',
    channel: 'openclaw',
  });
  
  await logEvent(sessionId, 'message_received', 'New #idea: I want to be able to track everything...', {
    sessionLabel: 'Dashboard Demo',
    channel: 'discord',
  });
  
  await logEvent(sessionId, 'message_sent', "Alright, I've tested the full flow...", {
    sessionLabel: 'Dashboard Demo',
    channel: 'discord',
  });
  
  await logEvent(sessionId, 'tool_call', 'web_fetch()', {
    sessionLabel: 'Dashboard Demo',
    channel: 'openclaw',
    tool: 'web_fetch',
    args: { url: 'https://digitalproductsenegal.lovable.app/' },
    reason: 'Testing product MVP',
    url: 'https://digitalproductsenegal.lovable.app/',
    resultStatus: 'success',
    resultSummary: 'Fetched 117 chars',
    durationMs: 85,
  });
  
  console.log('✅ Demo events logged!');
  console.log('🌐 Check http://localhost:3000');
}

main().catch(console.error);
