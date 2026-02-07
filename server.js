const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const OPENCLAW_HOME = path.join(os.homedir(), '.openclaw');
const AGENTS_DIR = path.join(OPENCLAW_HOME, 'agents');
const OPENCLAW_LOGS = path.join(OPENCLAW_HOME, 'logs', 'current.jsonl');

// Discover all agents dynamically
async function discoverAgents() {
  try {
    const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name);
  } catch {
    return ['main']; // fallback
  }
}

// Get sessions directory for an agent
function getAgentSessionsDir(agentId) {
  return path.join(AGENTS_DIR, agentId, 'sessions');
}

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

// Read all session files across all agents
async function readSessions() {
  try {
    const agents = await discoverAgents();
    const sessions = [];
    
    for (const agentId of agents) {
      const sessionsDir = getAgentSessionsDir(agentId);
      try {
        const files = await fs.readdir(sessionsDir);
        const sessionFiles = files.filter(f => f.endsWith('.jsonl') && !f.includes('.deleted.'));
        
        for (const file of sessionFiles) {
          const sessionId = file.replace('.jsonl', '');
          const events = await readSessionFile(sessionId, agentId);
          if (events.length > 0) {
            sessions.push({
              id: sessionId,
              agentId,
              events,
              metadata: events.find(e => e.type === 'session')?.data || {},
            });
          }
        }
      } catch {
        // Agent might not have sessions dir yet
        continue;
      }
    }
    return sessions;
  } catch (err) {
    console.error('Error reading sessions:', err);
    return [];
  }
}

async function readSessionFile(sessionId, agentId = 'main') {
  try {
    const sessionsDir = getAgentSessionsDir(agentId);
    const filePath = path.join(sessionsDir, `${sessionId}.jsonl`);
    const content = await fs.readFile(filePath, 'utf-8');
    return content.trim().split('\n').filter(Boolean).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// Read OpenClaw custom logs (for goals)
async function readOpenClawLogs() {
  try {
    const content = await fs.readFile(OPENCLAW_LOGS, 'utf-8').catch(() => '');
    if (!content.trim()) return [];
    return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

// Transform native Clawdbot events to OpenClaw format
function transformEvent(event, sessionId, agentId = 'main') {
  const base = {
    id: event.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    sessionId,
    agentId,
    raw: event,
  };

  switch (event.type) {
    case 'session':
      return {
        ...base,
        type: 'session_start',
        action: `Session started: ${event.cwd || 'unknown'}`,
        channel: 'clawdbot',
      };

    case 'message': {
      const role = event.message?.role;
      const content = event.message?.content;
      let text = '';
      
      if (Array.isArray(content)) {
        // Extract text from content array
        text = content.map(c => {
          if (c.type === 'text') return c.text;
          if (c.type === 'thinking') return '[thinking]';
          if (c.type === 'toolCall') return `${c.name}()`;
          if (c.type === 'toolResult') return '[tool result]';
          return '';
        }).join(' ').substring(0, 200);
      } else if (typeof content === 'string') {
        text = content.substring(0, 200);
      }

      return {
        ...base,
        type: role === 'user' ? 'message_received' : 'message_sent',
        action: text || `[${role} message]`,
        channel: 'clawdbot',
        role,
      };
    }

    case 'tool':
    case 'toolCall': {
      const toolName = event.tool || event.name;
      const args = event.args || event.arguments;
      let action = `${toolName}()`;
      
      // Extract meaningful action from args
      if (args) {
        if (args.path) action = `${toolName}: ${args.path}`;
        else if (args.command) action = `${toolName}: ${args.command.substring(0, 50)}`;
        else if (args.url) action = `${toolName}: ${args.url}`;
        else if (args.query) action = `${toolName}: "${args.query.substring(0, 50)}"`;
      }

      return {
        ...base,
        type: 'tool_call',
        action,
        tool: toolName,
        args,
        channel: 'clawdbot',
      };
    }

    case 'toolResult': {
      return {
        ...base,
        type: 'tool_result',
        action: `${event.tool || 'tool'} result`,
        tool: event.tool,
        resultStatus: event.error ? 'error' : 'success',
        resultSummary: event.error ? String(event.error).substring(0, 100) : 'Completed',
        channel: 'clawdbot',
      };
    }

    case 'exec':
      return {
        ...base,
        type: 'exec_command',
        action: event.command?.substring(0, 100) || 'exec',
        command: event.command,
        resultStatus: event.error ? 'error' : 'success',
        channel: 'clawdbot',
      };

    case 'model_change':
      return {
        ...base,
        type: 'reasoning',
        action: `Switched to ${event.provider}/${event.modelId}`,
        channel: 'clawdbot',
      };

    case 'thinking_level_change':
      return {
        ...base,
        type: 'reasoning',
        action: `Thinking level: ${event.thinkingLevel}`,
        channel: 'clawdbot',
      };

    case 'custom':
      // Skip internal/custom events for cleaner UI
      return null;

    default:
      return null; // Skip unknown events
  }
}

// Aggregate sessions for API
async function getSessions() {
  const sessions = await readSessions();
  const openclawLogs = await readOpenClawLogs();
  const goalEvents = openclawLogs.filter(e => 
    e.type === 'session_goal_set' || 
    e.type === 'session_goal_completed' || 
    e.type === 'session_goal_abandoned'
  );
  
  const sessionGoals = new Map();
  for (const event of goalEvents) {
    const goals = sessionGoals.get(event.sessionId) || [];
    
    if (event.type === 'session_goal_set') {
      goals.push({
        id: event.goalId || event.id,
        description: event.description || event.action,
        status: 'active',
        createdAt: event.timestamp,
      });
    } else {
      const goalId = event.goalId;
      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        goal.status = event.type === 'session_goal_completed' ? 'completed' : 'abandoned';
        goal.completedAt = event.timestamp;
        if (event.outcome) goal.outcome = event.outcome;
      }
    }
    sessionGoals.set(event.sessionId, goals);
  }

  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  return sessions.map(s => {
    const events = s.events;
    const sessionEvent = events.find(e => e.type === 'session');
    const lastEvent = events[events.length - 1];
    const toolEvents = events.filter(e => e.type === 'tool' || e.type === 'toolCall');
    const execEvents = events.filter(e => e.type === 'exec');
    const messageEvents = events.filter(e => e.type === 'message');
    
    const lastActivity = lastEvent?.timestamp || sessionEvent?.timestamp;
    const goals = sessionGoals.get(s.id) || [];
    const completed = goals.filter(g => g.status === 'completed').length;
    const abandoned = goals.filter(g => g.status === 'abandoned').length;

    return {
      id: s.id,
      label: sessionEvent?.cwd?.split('/').pop() || s.id.slice(0, 8),
      agentId: s.agentId || 'main',
      channel: 'clawdbot',
      startedAt: sessionEvent?.timestamp,
      lastActivity,
      eventCount: events.length,
      isActive: now - new Date(lastActivity).getTime() < thirtyMinutes,
      cwd: sessionEvent?.cwd,
      toolCount: toolEvents.length,
      execCount: execEvents.length,
      messageCount: messageEvents.length,
      goals,
      goalSummary: goals.length > 0 ? {
        total: goals.length,
        completed,
        abandoned,
        completionRate: Math.round((completed / goals.length) * 100),
      } : undefined,
    };
  }).sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
}

// Get events for API
async function getEvents(sessionId, agentId, limit = 100) {
  let allEvents = [];
  
  if (sessionId) {
    // Find which agent owns this session
    const sessions = await readSessions();
    const session = sessions.find(s => s.id === sessionId);
    const ownerAgent = session?.agentId || agentId || 'main';
    const events = await readSessionFile(sessionId, ownerAgent);
    allEvents = events.map(e => transformEvent(e, sessionId, ownerAgent)).filter(Boolean);
  } else {
    const sessions = await readSessions();
    for (const s of sessions) {
      // Filter by agent if specified
      if (agentId && s.agentId !== agentId) continue;
      const transformed = s.events.map(e => transformEvent(e, s.id, s.agentId)).filter(Boolean);
      allEvents = allEvents.concat(transformed);
    }
    // Also include OpenClaw goal events
    const openclawLogs = await readOpenClawLogs();
    const goalEvents = openclawLogs.filter(e => 
      e.type?.startsWith('session_goal') || 
      e.type === 'reasoning' ||
      e.type === 'browser_action'
    );
    allEvents = allEvents.concat(goalEvents);
  }
  
  return allEvents
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
}

// Get stats
async function getStats() {
  const sessions = await readSessions();
  const today = new Date().toISOString().split('T')[0];
  
  let totalEvents = 0;
  let toolBreakdown = {};
  let execCommands = 0;
  let messagesExchanged = 0;
  let topFiles = new Map();
  
  for (const s of sessions) {
    const todayEvents = s.events.filter(e => (e.timestamp || '').startsWith(today));
    totalEvents += todayEvents.length;
    
    for (const event of todayEvents) {
      if (event.type === 'tool' || event.type === 'toolCall') {
        const tool = event.tool || event.name || 'other';
        toolBreakdown[tool] = (toolBreakdown[tool] || 0) + 1;
        
        // Track file access
        if (event.args?.path) {
          topFiles.set(event.args.path, (topFiles.get(event.args.path) || 0) + 1);
        }
      }
      if (event.type === 'exec') execCommands++;
      if (event.type === 'message') messagesExchanged++;
    }
  }
  
  const sortedFiles = Array.from(topFiles.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  return {
    date: today,
    totalEvents,
    toolBreakdown,
    topFiles: sortedFiles,
    execCommands,
    browserSessions: 0, // Not tracked in native logs
    messagesExchanged,
    sessionCount: sessions.length,
  };
}

// Get goals
async function getGoals(sessionId) {
  const openclawLogs = await readOpenClawLogs();
  const goalEvents = openclawLogs.filter(e => 
    e.type === 'session_goal_set' || 
    e.type === 'session_goal_completed' || 
    e.type === 'session_goal_abandoned'
  );
  
  if (sessionId) {
    return goalEvents.filter(g => g.sessionId === sessionId);
  }
  return goalEvents;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API routes
  if (url.pathname === '/api/agents') {
    const agents = await discoverAgents();
    const agentInfo = [];
    for (const agentId of agents) {
      const sessionsDir = getAgentSessionsDir(agentId);
      let sessionCount = 0;
      try {
        const files = await fs.readdir(sessionsDir);
        sessionCount = files.filter(f => f.endsWith('.jsonl') && !f.includes('.deleted.')).length;
      } catch {}
      agentInfo.push({
        id: agentId,
        sessionCount,
        emoji: agentId === 'main' ? '🧠' : agentId === 'venice' ? '🎭' : agentId === 'kimi' ? '💻' : '🤖',
      });
    }
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ agents: agentInfo }));
    return;
  }

  if (url.pathname === '/api/events') {
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const sessionId = url.searchParams.get('session');
    const agentId = url.searchParams.get('agent');
    const events = await getEvents(sessionId, agentId, limit);
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

  if (url.pathname === '/api/goals') {
    const sessionId = url.searchParams.get('session');
    const goals = await getGoals(sessionId);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ goals }));
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

server.listen(PORT, async () => {
  const agents = await discoverAgents();
  console.log(`🍊 OpenClaw dashboard running at http://localhost:${PORT}`);
  console.log(`   Agents discovered: ${agents.join(', ')}`);
  console.log(`   Reading from: ${AGENTS_DIR}`);
});
