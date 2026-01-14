import { NextRequest, NextResponse } from "next/server";
import { streamVideo } from "@/lib/stream-video";
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { callId } = await req.json();
  if (!callId) return NextResponse.json({ ok: true });

  const call = streamVideo.video.call("default", callId);

  try {
    await call.end();
  } catch {
    // already ended → idempotent
  }

  return NextResponse.json({ ok: true });
}
