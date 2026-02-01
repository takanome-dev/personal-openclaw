import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ClawEvent, Session } from "@/lib/types";

const LOG_DIR = join(homedir(), ".clawdbot", "logs");
const CURRENT_LOG = join(LOG_DIR, "current.jsonl");

export async function GET() {
  try {
    const content = await fs.readFile(CURRENT_LOG, "utf-8").catch(() => "");
    
    if (!content.trim()) {
      return NextResponse.json({ sessions: [] });
    }

    const lines = content.trim().split("\n").filter(Boolean);
    const events: ClawEvent[] = lines.map(line => JSON.parse(line));

    // Aggregate sessions
    const sessionMap = new Map<string, Session>();

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

    // Mark sessions as inactive if no activity in last 30 minutes
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    for (const session of sessionMap.values()) {
      const lastActivity = new Date(session.lastActivity).getTime();
      session.isActive = now - lastActivity < thirtyMinutes;
    }

    const sessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[API] Error aggregating sessions:", error);
    return NextResponse.json(
      { error: "Failed to get sessions" },
      { status: 500 }
    );
  }
}
