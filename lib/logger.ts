import { ClawEvent, EventType, ToolName } from "./types";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";

const LOG_DIR = join(homedir(), ".clawdbot", "logs");
const CURRENT_LOG = join(LOG_DIR, "current.jsonl");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Logger for Clawdbot observability
 * Call this from any session to log agent activity
 */
export class ClawLogger {
  private static instance: ClawLogger;
  private sessionId: string;
  private sessionLabel?: string;
  private channel?: string;
  private agentId?: string;

  private constructor(sessionId: string, opts?: { label?: string; channel?: string; agentId?: string }) {
    this.sessionId = sessionId;
    this.sessionLabel = opts?.label;
    this.channel = opts?.channel;
    this.agentId = opts?.agentId;
    this.ensureLogDir();
  }

  static getInstance(sessionId: string, opts?: { label?: string; channel?: string; agentId?: string }): ClawLogger {
    if (!ClawLogger.instance || ClawLogger.instance.sessionId !== sessionId) {
      ClawLogger.instance = new ClawLogger(sessionId, opts);
    }
    return ClawLogger.instance;
  }

  private async ensureLogDir(): Promise<void> {
    try {
      await fs.mkdir(LOG_DIR, { recursive: true });
    } catch {
      // Ignore
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a generic event
   */
  async log(
    type: EventType,
    action: string,
    details?: {
      tool?: ToolName;
      args?: Record<string, unknown>;
      reason?: string;
      context?: string;
      resultSummary?: string;
      resultStatus?: "success" | "error" | "pending";
      durationMs?: number;
      filePath?: string;
      command?: string;
      url?: string;
    }
  ): Promise<void> {
    const event: ClawEvent = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      sessionLabel: this.sessionLabel,
      type,
      action,
      channel: this.channel,
      agentId: this.agentId,
      ...details,
    };

    const line = JSON.stringify(event) + "\n";

    try {
      await fs.appendFile(CURRENT_LOG, line, "utf-8");
    } catch (err) {
      console.error("[ClawLogger] Failed to write log:", err);
    }
  }

  /**
   * Log a tool call
   */
  async logTool(
    tool: ToolName,
    args: Record<string, unknown>,
    reason?: string
  ): Promise<void> {
    // Extract common paths from args
    const filePath = args.path as string || args.file_path as string;
    const command = args.command as string;
    const url = args.url as string || args.targetUrl as string;

    await this.log("tool_call", `${tool}()`, {
      tool,
      args: this.sanitizeArgs(args),
      reason,
      filePath,
      command: command?.substring(0, 200), // Truncate long commands
      url,
    });
  }

  /**
   * Log a tool result
   */
  async logToolResult(
    tool: ToolName,
    status: "success" | "error",
    summary: string,
    durationMs?: number
  ): Promise<void> {
    await this.log("tool_result", `${tool}() -> ${status}`, {
      tool,
      resultStatus: status,
      resultSummary: summary.substring(0, 500), // Limit length
      durationMs,
    });
  }

  /**
   * Log file access
   */
  async logFileAccess(path: string, action: "read" | "write" | "edit", reason?: string): Promise<void> {
    await this.log("file_access", `${action}: ${path}`, {
      filePath: path,
      reason,
    });
  }

  /**
   * Log command execution
   */
  async logExec(command: string, reason?: string): Promise<void> {
    await this.log("exec_command", command.substring(0, 100), {
      command: command.substring(0, 200),
      reason,
    });
  }

  /**
   * Log browser action
   */
  async logBrowser(action: string, url?: string): Promise<void> {
    await this.log("browser_action", action, { url });
  }

  /**
   * Log message received/sent
   */
  async logMessage(direction: "received" | "sent", preview: string): Promise<void> {
    await this.log(direction === "received" ? "message_received" : "message_sent", 
      `${direction}: ${preview.substring(0, 100)}`
    );
  }

  /**
   * Log reasoning/thought process
   */
  async logReasoning(thought: string): Promise<void> {
    await this.log("reasoning", thought.substring(0, 200));
  }

  /**
   * Get recent events
   */
  async getRecentEvents(limit: number = 100): Promise<ClawEvent[]> {
    try {
      const content = await fs.readFile(CURRENT_LOG, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      const events = lines
        .slice(-limit)
        .map(line => JSON.parse(line) as ClawEvent);
      return events.reverse(); // Newest first
    } catch {
      return [];
    }
  }

  /**
   * Get all events for a session
   */
  async getSessionEvents(sessionId: string): Promise<ClawEvent[]> {
    try {
      const content = await fs.readFile(CURRENT_LOG, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      const events = lines
        .map(line => JSON.parse(line) as ClawEvent)
        .filter(e => e.sessionId === sessionId);
      return events;
    } catch {
      return [];
    }
  }

  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive fields
    const sensitive = ["password", "token", "secret", "key", "auth"];
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(args)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

// Convenience singleton for direct use
let defaultLogger: ClawLogger | null = null;

export function initLogger(sessionId: string, opts?: { label?: string; channel?: string; agentId?: string }): ClawLogger {
  defaultLogger = ClawLogger.getInstance(sessionId, opts);
  return defaultLogger;
}

export function getLogger(): ClawLogger {
  if (!defaultLogger) {
    throw new Error("Logger not initialized. Call initLogger() first.");
  }
  return defaultLogger;
}
