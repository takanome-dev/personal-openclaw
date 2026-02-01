import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ClawEvent, DailyStats, ToolName } from "@/lib/types";

const LOG_DIR = join(homedir(), ".clawdbot", "logs");
const CURRENT_LOG = join(LOG_DIR, "current.jsonl");

export async function GET() {
  try {
    const content = await fs.readFile(CURRENT_LOG, "utf-8").catch(() => "");
    
    if (!content.trim()) {
      return NextResponse.json({ stats: null });
    }

    const lines = content.trim().split("\n").filter(Boolean);
    const events: ClawEvent[] = lines.map(line => JSON.parse(line));

    const today = new Date().toISOString().split("T")[0];
    const todayEvents = events.filter(e => e.timestamp.startsWith(today));

    // Tool breakdown
    const toolBreakdown: Record<string, number> = {};
    for (const event of todayEvents) {
      if (event.tool) {
        toolBreakdown[event.tool] = (toolBreakdown[event.tool] || 0) + 1;
      }
    }

    // Top files
    const fileCounts = new Map<string, number>();
    for (const event of todayEvents) {
      if (event.filePath) {
        fileCounts.set(event.filePath, (fileCounts.get(event.filePath) || 0) + 1);
      }
    }
    const topFiles = Array.from(fileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Exec commands
    const execCommands = todayEvents.filter(e => e.type === "exec_command").length;

    // Browser sessions
    const browserSessions = new Set(
      todayEvents.filter(e => e.type === "browser_action").map(e => e.sessionId)
    ).size;

    // Messages
    const messagesExchanged = todayEvents.filter(
      e => e.type === "message_received" || e.type === "message_sent"
    ).length;

    const stats: DailyStats = {
      date: today,
      totalEvents: todayEvents.length,
      toolBreakdown: toolBreakdown as Record<ToolName, number>,
      topFiles,
      execCommands,
      browserSessions,
      messagesExchanged,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("[API] Error calculating stats:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
