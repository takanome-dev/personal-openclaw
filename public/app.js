// OpenClaw Dashboard Client

const icons = {
  tool_call: '⚡',
  tool_result: '✓',
  file_access: '📄',
  exec_command: '⌘',
  browser_action: '🌐',
  message_received: '📥',
  message_sent: '📤',
  reasoning: '💭',
  session_start: '▶',
  session_end: '■',
  session_goal_set: '🎯',
  session_goal_completed: '✅',
  session_goal_abandoned: '❌',
};

const goalStatusIcons = {
  active: '🎯',
  completed: '✅',
  abandoned: '❌',
};

const toolColors = {
  read: '#60a5fa',
  write: '#f87171',
  edit: '#fbbf24',
  exec: '#f59e0b',
  browser: '#a78bfa',
  web_search: '#34d399',
  web_fetch: '#34d399',
  message: '#22c55e',
  memory_search: '#818cf8',
  memory_get: '#818cf8',
};

const eventColors = {
  tool_call: '#f59e0b',
  tool_result: '#22c55e',
  exec_command: '#a78bfa',
  message_received: '#6366f1',
  message_sent: '#818cf8',
  reasoning: '#94a3b8',
  session_start: '#10b981',
};

const channelIcons = {
  discord: '💬',
  webchat: '🌐',
  telegram: '✈️',
  whatsapp: '📱',
  signal: '📞',
  imessage: '💬',
  slack: '💼',
  googlechat: '🗣️',
  clawdbot: '🤖',
};

const channelColors = {
  discord: '#5865F2',
  webchat: '#6366f1',
  telegram: '#26A5E4',
  whatsapp: '#25D366',
  signal: '#3a76f0',
  imessage: '#34C759',
  slack: '#E01E5A',
  googlechat: '#34A853',
  clawdbot: '#94a3b8',
};

let selectedSession = null;
let selectedAgent = null; // null = all agents
let pollInterval;

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

async function fetchAgents() {
  const res = await fetch('/api/agents');
  const data = await res.json();
  return data.agents || [];
}

async function fetchEvents() {
  let url = '/api/events?limit=50';
  if (selectedSession) {
    url += `&session=${selectedSession}`;
  } else if (selectedAgent) {
    url += `&agent=${selectedAgent}`;
  }
  const res = await fetch(url);
  const data = await res.json();
  return data.events || [];
}

async function fetchSessions() {
  const res = await fetch('/api/sessions');
  const data = await res.json();
  let sessions = data.sessions || [];
  // Filter by selected agent if set
  if (selectedAgent) {
    sessions = sessions.filter(s => s.agentId === selectedAgent);
  }
  return sessions;
}

async function fetchStats() {
  const res = await fetch('/api/stats');
  const data = await res.json();
  return data.stats;
}

async function fetchGoals() {
  const url = selectedSession
    ? `/api/goals?session=${selectedSession}`
    : '/api/goals';
  const res = await fetch(url);
  const data = await res.json();
  return data.goals || [];
}

function renderEvents(events) {
  const container = document.getElementById('events-list');
  
  if (events.length === 0) {
    container.innerHTML = '<div class="empty">No events yet. Start using Clawdbot to see activity here.</div>';
    return;
  }
  
  container.innerHTML = events.map(event => {
    const eventColor = eventColors[event.type] || 'var(--accent)';
    const channelIcon = channelIcons[event.channel] || '🔵';
    const channelColor = channelColors[event.channel] || '#94a3b8';
    const isToolCall = event.type === 'tool_call' && event.args;
    const eventId = `event-${event.id}`;
    
    return `
      <div class="event-item" style="border-left: 2px solid ${eventColor}">
        <div class="event-icon">${icons[event.type] || '•'}</div>
        <div class="event-content">
          <div class="event-header">
            <span class="event-action">${escapeHtml(event.action)}</span>
            ${event.tool ? `<span class="event-tool" style="background: ${toolColors[event.tool] || eventColor}">${event.tool}</span>` : ''}
            ${event.channel ? `<span class="event-channel" style="background: ${channelColor}20; color: ${channelColor}">${channelIcon} ${event.channel}</span>` : ''}
          </div>
          ${isToolCall ? `
            <button class="event-expand-btn" data-target="${eventId}">
              <span class="expand-icon">▶</span> Show details
            </button>
            <div class="event-details hidden" id="${eventId}">
              <pre class="event-args">${escapeHtml(JSON.stringify(event.args, null, 2))}</pre>
            </div>
          ` : ''}
          ${event.reason ? `<div class="event-reason"><span>Reason:</span> ${escapeHtml(event.reason)}</div>` : ''}
          ${event.resultSummary ? `<div class="event-result"><span>Result:</span> ${escapeHtml(event.resultSummary)}</div>` : ''}
          ${event.filePath ? `<div class="event-file">${escapeHtml(event.filePath)}</div>` : ''}
          <div class="event-meta">
            <span>🕐 ${formatTimeAgo(event.timestamp)}</span>
            ${event.agentId ? `<span class="event-agent">${{'main':'🧠','venice':'🎭','kimi':'💻'}[event.agentId] || '🤖'} ${event.agentId}</span>` : ''}
            ${event.sessionLabel ? `<span>📱 ${escapeHtml(event.sessionLabel)}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Add expand/collapse handlers
  container.querySelectorAll('.event-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const details = document.getElementById(targetId);
      const icon = btn.querySelector('.expand-icon');
      
      if (details.classList.contains('hidden')) {
        details.classList.remove('hidden');
        icon.textContent = '▼';
        btn.innerHTML = '<span class="expand-icon">▼</span> Hide details';
      } else {
        details.classList.add('hidden');
        btn.innerHTML = '<span class="expand-icon">▶</span> Show details';
      }
    });
  });
}

function renderAgents(agents) {
  const container = document.getElementById('agents-list');
  
  if (!agents || agents.length === 0) {
    container.innerHTML = '<div class="empty">No agents found</div>';
    return;
  }
  
  const totalSessions = agents.reduce((sum, a) => sum + a.sessionCount, 0);
  
  container.innerHTML = `
    <button class="agent-item all ${selectedAgent === null ? 'active' : ''}" data-id="">
      <div class="agent-emoji">✦</div>
      <div class="agent-info">
        <div class="agent-name">All Agents</div>
        <div class="agent-sessions">${totalSessions} sessions</div>
      </div>
    </button>
    ${agents.map(agent => `
      <button class="agent-item ${agent.id === selectedAgent ? 'active' : ''}" data-id="${agent.id}">
        <div class="agent-emoji">${agent.emoji}</div>
        <div class="agent-info">
          <div class="agent-name">${escapeHtml(agent.id)}</div>
          <div class="agent-sessions">${agent.sessionCount} sessions</div>
        </div>
      </button>
    `).join('')}
  `;
  
  // Add click handlers
  container.querySelectorAll('.agent-item').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAgent = btn.dataset.id || null;
      selectedSession = null; // Clear session filter when switching agents
      document.getElementById('sessions-title').textContent = 
        selectedAgent ? `${selectedAgent} Sessions` : 'Sessions';
      document.getElementById('events-title').textContent = 'Live Activity';
      document.getElementById('clear-filter').classList.add('hidden');
      refresh();
    });
  });
}

function renderSessions(sessions) {
  const container = document.getElementById('sessions-list');
  
  if (sessions.length === 0) {
    container.innerHTML = '<div class="empty">No active sessions</div>';
    return;
  }
  
  const agentEmojis = { main: '🧠', venice: '🎭', kimi: '💻' };
  
  container.innerHTML = sessions.map(session => {
    const channelIcon = channelIcons[session.channel] || '🔵';
    const channelColor = channelColors[session.channel] || '#94a3b8';
    
    return `
      <button class="session-item ${session.id === selectedSession ? 'active' : ''}" data-id="${session.id}">
        <div class="session-header">
          <span class="session-name">
            ${!selectedAgent ? `<span class="session-agent">${agentEmojis[session.agentId] || '🤖'}</span>` : ''}
            ${escapeHtml(session.label || session.id.slice(0, 8))}
          </span>
          <span class="session-status ${session.isActive ? 'active' : 'idle'}">${session.isActive ? 'Active' : 'Idle'}</span>
        </div>
        <div class="session-meta">
          <span>${session.eventCount} events</span>
          <span>•</span>
          <span>${formatTimeAgo(session.lastActivity)}</span>
          ${session.channel ? `<span class="session-channel" style="color: ${channelColor}">${channelIcon} ${session.channel}</span>` : ''}
        </div>
        ${session.goalSummary ? `
          <div class="session-goals-summary">
            <span class="goal-badge completed">✓ ${session.goalSummary.completed}</span>
            ${session.goalSummary.abandoned > 0 ? `<span class="goal-badge abandoned">✕ ${session.goalSummary.abandoned}</span>` : ''}
            ${session.goalSummary.active > 0 ? `<span class="goal-badge active">● ${session.goalSummary.active}</span>` : ''}
            <span>(${session.goalSummary.completionRate}%)</span>
          </div>
        ` : ''}
      </button>
    `;
  }).join('');
  
  // Add click handlers
  container.querySelectorAll('.session-item').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSession = btn.dataset.id;
      document.getElementById('events-title').textContent = 'Session Events';
      document.getElementById('clear-filter').classList.remove('hidden');
      refresh();
    });
  });
}

function renderGoals(goals) {
  const container = document.getElementById('goals-list');
  const panel = document.getElementById('goals-panel');
  
  if (goals.length === 0) {
    panel.style.display = 'none';
    return;
  }
  
  panel.style.display = 'block';
  container.innerHTML = goals.map(goal => `
    <div class="goal-item">
      <div class="goal-status ${goal.status}">${goalStatusIcons[goal.status]}</div>
      <div class="goal-content">
        <div class="goal-description">${escapeHtml(goal.description)}</div>
        ${goal.outcome ? `<div class="goal-outcome">Outcome: ${escapeHtml(goal.outcome)}</div>` : ''}
        <div class="goal-meta">
          <span>🕐 ${formatTimeAgo(goal.createdAt)}</span>
          ${goal.completedAt ? `<span>• Completed ${formatTimeAgo(goal.completedAt)}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderStats(stats) {
  if (!stats) return;
  
  document.getElementById('event-count').textContent = `${stats.totalEvents} events today`;
  
  const toolCount = Object.values(stats.toolBreakdown).reduce((a, b) => a + b, 0);
  document.getElementById('stat-tools').textContent = toolCount;
  document.getElementById('stat-exec').textContent = stats.execCommands;
  document.getElementById('stat-browser').textContent = stats.browserSessions;
  document.getElementById('stat-messages').textContent = stats.messagesExchanged;
  
  // Render top files
  if (stats.topFiles.length > 0) {
    const filesPanel = document.getElementById('files-panel');
    const filesList = document.getElementById('files-list');
    
    filesPanel.style.display = 'block';
    filesList.innerHTML = stats.topFiles.map((file, i) => `
      <div class="file-item">
        <span class="file-rank">#${i + 1}</span>
        <span class="file-icon">📄</span>
        <span class="file-path">${escapeHtml(file.path)}</span>
        <span class="file-count">${file.count}×</span>
      </div>
    `).join('');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function refresh() {
  try {
    const [agents, events, sessions, stats, goals] = await Promise.all([
      fetchAgents(),
      fetchEvents(),
      fetchSessions(),
      fetchStats(),
      fetchGoals(),
    ]);
    
    renderAgents(agents);
    renderEvents(events);
    renderSessions(sessions);
    renderStats(stats);
    renderGoals(goals);
  } catch (err) {
    console.error('Refresh failed:', err);
  }
}

// Clear filter button
document.getElementById('clear-filter')?.addEventListener('click', () => {
  selectedSession = null;
  document.getElementById('events-title').textContent = 'Live Activity';
  document.getElementById('clear-filter').classList.add('hidden');
  refresh();
});

// Initial load and polling
refresh();
pollInterval = setInterval(refresh, 5000);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(pollInterval);
});
