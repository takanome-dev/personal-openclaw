const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { homedir } = require('os');

const PORT = process.env.PORT || 3000;
const LOG_DIR = path.join(homedir(), '.clawdbot', 'logs');
const CURRENT_LOG = path.join(LOG_DIR, 'current.jsonl');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

async function readLogs() {
  try {
    const content = await fs.readFile(CURRENT_LOG, 'utf-8').catch(() => '');
    if (!content.trim()) return [];
    return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

async function getSessions() {
  const events = await readLogs();
  const sessionMap = new Map();

  for (const event of events) {
    const existing = sessionMap.get(event.sessionId);
    if (!existing) {
      sessionMap.set(event.sessionId, {
        id: event.sessionId,
        label: event.sessionLabel,
        agentId: event.agentId,
        channel: event.channel,
        startedAt: event.timestamp,
        lastActivity: event.timestamp,
        eventCount: 1,
        isActive: true,
      });
    } else {
      existing.lastActivity = event.timestamp;
      existing.eventCount++;
      if (event.sessionLabel) existing.label = event.sessionLabel;
    }
  }

  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  for (const session of sessionMap.values()) {
    const lastActivity = new Date(session.lastActivity).getTime();
    session.isActive = now - lastActivity < thirtyMinutes;
  }

  return Array.from(sessionMap.values()).sort(
    (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity)
  );
}

async function getStats() {
  const events = await readLogs();
  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.timestamp.startsWith(today));

  const toolBreakdown = {};
  for (const event of todayEvents) {
    if (event.tool) {
      toolBreakdown[event.tool] = (toolBreakdown[event.tool] || 0) + 1;
    }
  }

  const fileCounts = new Map();
  for (const event of todayEvents) {
    if (event.filePath) {
      fileCounts.set(event.filePath, (fileCounts.get(event.filePath) || 0) + 1);
    }
  }
  const topFiles = Array.from(fileCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  return {
    date: today,
    totalEvents: todayEvents.length,
    toolBreakdown,
    topFiles,
    execCommands: todayEvents.filter(e => e.type === 'exec_command').length,
    browserSessions: new Set(todayEvents.filter(e => e.type === 'browser_action').map(e => e.sessionId)).size,
    messagesExchanged: todayEvents.filter(e => e.type === 'message_received' || e.type === 'message_sent').length,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API routes
  if (url.pathname === '/api/events') {
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const sessionId = url.searchParams.get('session');
    const type = url.searchParams.get('type');
    
    let events = await readLogs();
    if (sessionId) events = events.filter(e => e.sessionId === sessionId);
    if (type) events = events.filter(e => e.type === type);
    
    events = events
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ events }));
    return;
  }

  if (url.pathname === '/api/sessions') {
    const sessions = await getSessions();
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ sessions }));
    return;
  }

  if (url.pathname === '/api/stats') {
    const stats = await getStats();
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ stats }));
    return;
  }

  // Static files
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(__dirname, 'public', filePath);
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = await fs.readFile(filePath);
    res.setHeader('Content-Type', contentType);
    res.writeHead(200);
    res.end(content);
  } catch {
    // Serve index.html for client-side routing
    try {
      const content = await fs.readFile(path.join(__dirname, 'public', 'index.html'));
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
});

server.listen(PORT, () => {
  console.log(`🍊 OpenClaw dashboard running at http://localhost:${PORT}`);
  console.log(`   Logs directory: ${LOG_DIR}`);
});
