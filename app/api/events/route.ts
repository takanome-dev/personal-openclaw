import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { homedir } from "os";
import { ClawEvent } from "@/lib/types";

const LOG_DIR = join(homedir(), ".clawdbot", "logs");
const CURRENT_LOG = join(LOG_DIR, "current.jsonl");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const sessionId = searchParams.get("session");
  const type = searchParams.get("type") as ClawEvent["type"] | null;

  try {
    const content = await fs.readFile(CURRENT_LOG, "utf-8").catch(() => "");
    
    if (!content.trim()) {
      return NextResponse.json({ events: [] });
    }

    const lines = content.trim().split("\n").filter(Boolean);
    let events: ClawEvent[] = lines.map(line => JSON.parse(line));

    // Filter by session if specified
    if (sessionId) {
      events = events.filter(e => e.sessionId === sessionId);
    }

    // Filter by type if specified
    if (type) {
      events = events.filter(e => e.type === type);
    }

    // Sort by timestamp descending, limit
    events = events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({ events });
  } catch (error) {
    console.error("[API] Error reading logs:", error);
    return NextResponse.json(
      { error: "Failed to read logs" },
      { status: 500 }
    );
  }
}
