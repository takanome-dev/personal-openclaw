#!/usr/bin/env node
/**
 * Quick logger for Clawdbot sessions
 * Usage: node log.js <type> <action> [key=value...]
 * 
 * Examples:
 *   node log.js tool_call "read()" tool=read path=SOUL.md reason="Checking identity"
 *   node log.js file_access "read: AGENTS.md" path=AGENTS.md
 *   node log.js exec_command "git status" command="git status"
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const LOG_DIR = path.join(os.homedir(), '.clawdbot', 'logs');
const CURRENT_LOG = path.join(LOG_DIR, 'current.jsonl');

// Session info - should be set via env or args
const SESSION_ID = process.env.CLAW_SESSION || 'main-' + Date.now();
const SESSION_LABEL = process.env.CLAW_LABEL || 'Main Session';
const CHANNEL = process.env.CLAW_CHANNEL || 'discord';

async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch {}
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function parseArgs(args) {
  const details = {};
  for (const arg of args) {
    const [key, ...valueParts] = arg.split('=');
    if (key && valueParts.length > 0) {
      details[key] = valueParts.join('=');
    }
  }
  return details;
}

async function log(type, action, details) {
  const event = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,
    sessionLabel: SESSION_LABEL,
    channel: CHANNEL,
    type,
    action,
    ...details,
  };
  
  await ensureLogDir();
  await fs.appendFile(CURRENT_LOG, JSON.stringify(event) + '\n', 'utf-8');
  console.log(`✓ Logged: ${type} - ${action}`);
}

const [type, action, ...rest] = process.argv.slice(2);

if (!type || !action) {
  console.log('Usage: node log.js <type> <action> [key=value...]');
  console.log('');
  console.log('Examples:');
  console.log('  node log.js tool_call "read()" tool=read path=SOUL.md');
  console.log('  node log.js file_access "read: file.txt" path=file.txt');
  console.log('  node log.js exec_command "git status" command="git status"');
  console.log('');
  console.log('Set env vars:');
  console.log('  CLAW_SESSION=session-id CLAW_LABEL="My Session" CLAW_CHANNEL=discord');
  process.exit(1);
}

const details = parseArgs(rest);
log(type, action, details).catch(console.error);
