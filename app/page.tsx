"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  Terminal, 
  FileText, 
  Globe, 
  MessageSquare, 
  Clock,
  Cpu,
  ChevronRight,
  Circle,
  X
} from "lucide-react";
import { ClawEvent, Session, DailyStats } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

function EventIcon({ type }: { type: ClawEvent["type"] }) {
  switch (type) {
    case "tool_call":
    case "tool_result":
      return <Cpu className="w-4 h-4 text-clawd-accent" />;
    case "file_access":
      return <FileText className="w-4 h-4 text-blue-400" />;
    case "exec_command":
      return <Terminal className="w-4 h-4 text-yellow-400" />;
    case "browser_action":
      return <Globe className="w-4 h-4 text-purple-400" />;
    case "message_received":
    case "message_sent":
      return <MessageSquare className="w-4 h-4 text-green-400" />;
    default:
      return <Activity className="w-4 h-4 text-gray-400" />;
  }
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs ${isActive ? "text-green-400" : "text-gray-500"}`}>
      <Circle className={`w-2 h-2 ${isActive ? "fill-green-400" : "fill-gray-500"}`} />
      {isActive ? "Active" : "Idle"}
    </span>
  );
}

export default function Dashboard() {
  const [events, setEvents] = useState<ClawEvent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsRes, sessionsRes, statsRes] = await Promise.all([
          fetch("/api/events?limit=50"),
          fetch("/api/sessions"),
          fetch("/api/stats"),
        ]);

        const eventsData = await eventsRes.json();
        const sessionsData = await sessionsRes.json();
        const statsData = await statsRes.json();

        setEvents(eventsData.events || []);
        setSessions(sessionsData.sessions || []);
        setStats(statsData.stats);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-clawd-dark flex items-center justify-center">
        <div className="text-clawd-accent animate-pulse">Loading OpenClaw...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-clawd-dark text-gray-200">
      {/* Header */}
      <header className="border-b border-clawd-border bg-clawd-panel">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-clawd-accent rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">OpenClaw</h1>
                <p className="text-xs text-gray-400">Clawdbot Observability</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Circle className="w-2 h-2 fill-green-400 text-green-400 animate-pulse" />
                <span className="text-green-400">Live</span>
              </div>
              {stats && (
                <span className="text-gray-400">
                  {stats.totalEvents} events today
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Stats Cards */}
          <div className="col-span-12 grid grid-cols-4 gap-4">
            <StatCard
              icon={<Cpu className="w-5 h-5" />}
              label="Tool Calls"
              value={stats ? Object.values(stats.toolBreakdown).reduce((a, b) => a + b, 0) : 0}
              color="text-clawd-accent"
            />
            <StatCard
              icon={<Terminal className="w-5 h-5" />}
              label="Commands"
              value={stats?.execCommands || 0}
              color="text-yellow-400"
            />
            <StatCard
              icon={<Globe className="w-5 h-5" />}
              label="Browser Sessions"
              value={stats?.browserSessions || 0}
              color="text-purple-400"
            />
            <StatCard
              icon={<MessageSquare className="w-5 h-5" />}
              label="Messages"
              value={stats?.messagesExchanged || 0}
              color="text-green-400"
            />
          </div>

          {/* Sessions Panel */}
          <div className="col-span-3">
            <div className="bg-clawd-panel rounded-lg border border-clawd-border">
              <div className="px-4 py-3 border-b border-clawd-border">
                <h2 className="font-semibold text-white">Sessions</h2>
              </div>
              <div className="divide-y divide-clawd-border">
                {sessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                      selectedSession === session.id ? "bg-white/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {session.label || session.id.slice(0, 8)}
                      </span>
                      <StatusBadge isActive={session.isActive} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{session.eventCount} events</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                ))}
                {sessions.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No active sessions
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Events Feed */}
          <div className="col-span-9">
            <div className="bg-clawd-panel rounded-lg border border-clawd-border">
              <div className="px-4 py-3 border-b border-clawd-border flex items-center justify-between">
                <h2 className="font-semibold text-white">
                  {selectedSession ? "Session Events" : "Live Activity"}
                </h2>
                {selectedSession && (
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear filter
                  </button>
                )}
              </div>
              <div className="divide-y divide-clawd-border max-h-[600px] overflow-y-auto">
                {(selectedSession
                  ? events.filter(e => e.sessionId === selectedSession)
                  : events
                ).map(event => (
                  <div key={event.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{EventIcon({ type: event.type })}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">
                            {event.action}
                          </span>
                          {event.tool && (
                            <span className="text-xs px-1.5 py-0.5 bg-clawd-accent/20 text-clawd-accent rounded">
                              {event.tool}
                            </span>
                          )}
                        </div>
                        
                        {event.reason && (
                          <p className="text-xs text-gray-400 mb-1">
                            <span className="text-gray-500">Reason:</span> {event.reason}
                          </p>
                        )}
                        
                        {event.resultSummary && (
                          <p className="text-xs text-gray-400 mb-1">
                            <span className="text-gray-500">Result:</span> {event.resultSummary}
                          </p>
                        )}
                        
                        {event.filePath && (
                          <p className="text-xs text-gray-500 font-mono truncate">
                            {event.filePath}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </span>
                          {event.sessionLabel && (
                            <span className="text-gray-600">{event.sessionLabel}</span>
                          )}
                          {event.channel && (
                            <span className="text-gray-600">#{event.channel}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="px-4 py-12 text-center text-gray-500">
                    No events yet. Start using Clawdbot to see activity here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top Files */}
        {stats && stats.topFiles.length > 0 && (
          <div className="mt-6">
            <div className="bg-clawd-panel rounded-lg border border-clawd-border">
              <div className="px-4 py-3 border-b border-clawd-border">
                <h2 className="font-semibold text-white">Top Files Accessed Today</h2>
              </div>
              <div className="grid grid-cols-2 gap-px bg-clawd-border">
                {stats.topFiles.map((file, i) => (
                  <div key={file.path} className="bg-clawd-panel px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-sm w-6">#{i + 1}</span>
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-300 font-mono truncate max-w-md">
                        {file.path}
                      </span>
                    </div>
                    <span className="text-sm text-clawd-accent">{file.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-clawd-panel rounded-lg border border-clawd-border p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
