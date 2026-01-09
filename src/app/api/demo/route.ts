import { db } from "@/db/client";
import { meetings, user, agents } from "@/db/schema";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const meetingId = "demo-meeting";
    const demoUserId = "u1";
    const demoAgentId = "a1";
    const now = new Date();

    // 1. Ensure User exists (id: u1)
    await db.insert(user).values({
      id: demoUserId,
      name: "Demo User",
      email: "demo@example.com",
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();

    // 2. Ensure Agent exists (id: a1)
    await db.insert(agents).values({
      id: demoAgentId,
      name: "Demo Agent",
      userid: demoUserId,
      instructions: "Be a helpful assistant",
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();

    // 3. FORCE Meeting to 'processing' state
    // We use onConflictDoUpdate so that even if the meeting exists 
    // as "upcoming", it gets pushed to "processing" for your demo.
    await db.insert(meetings)
      .values({
        id: meetingId,
        name: "Demo Meeting",
        userid: demoUserId,
        agentid: demoAgentId,
        status: "processing", 
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: meetings.id,
        set: { 
          status: "processing", 
          updatedAt: now 
        },
      });

    return NextResponse.json({ 
      success: true, 
      meetingId, 
      currentState: "processing" 
    });

  } catch (error: any) {
    console.error("CRITICAL_DB_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}