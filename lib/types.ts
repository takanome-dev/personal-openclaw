export type EventType = 
  | "tool_call"
  | "tool_result"
  | "session_start"
  | "session_end"
  | "file_access"
  | "exec_command"
  | "browser_action"
  | "message_received"
  | "message_sent"
  | "reasoning";

export type ToolName = 
  | "read"
  | "write"
  | "edit"
  | "exec"
  | "browser"
  | "web_search"
  | "web_fetch"
  | "message"
  | "memory_search"
  | "memory_get"
  | "sessions_list"
  | "sessions_history"
  | "sessions_send"
  | "cron"
  | "image"
  | "tts"
  | "other";

export interface ClawEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  sessionLabel?: string;
  type: EventType;
  tool?: ToolName;
  
  // What was done
  action: string;
  args?: Record<string, unknown>;
  
  // Why it was done
  reason?: string;
  context?: string;
  
  // Result
  resultSummary?: string;
  resultStatus?: "success" | "error" | "pending";
  durationMs?: number;
  
  // File/command specifics
  filePath?: string;
  command?: string;
  url?: string;
  
  // Metadata
  channel?: string;
  agentId?: string;
}

export interface Session {
  id: string;
  label?: string;
  agentId?: string;
  channel?: string;
  startedAt: string;
  lastActivity: string;
  eventCount: number;
  isActive: boolean;
}

export interface DailyStats {
  date: string;
  totalEvents: number;
  toolBreakdown: Record<ToolName, number>;
  topFiles: { path: string; count: number }[];
  execCommands: number;
  browserSessions: number;
  messagesExchanged: number;
}
