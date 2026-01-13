import dotenv from "dotenv";
import { StreamClient } from "@stream-io/node-sdk";

dotenv.config();

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const STREAM_API_SECRET = process.env.STREAM_VIDEO_API_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!STREAM_API_KEY || !STREAM_API_SECRET || !OPENAI_API_KEY) {
  throw new Error("❌ Missing required environment variables");
}

const client = new StreamClient(STREAM_API_KEY, STREAM_API_SECRET);
const video = client.video;

async function testRealtime() {
  // 1️⃣ Create or get call
  const call = video.call("default", "realtime-test-call");

  await call.getOrCreate({
    data: {
      created_by_id: "server-admin",
    },
  });

  console.log("✅ Call created");

  // 2️⃣ Connect OpenAI realtime agent
  const realtimeClient = await video.connectOpenAi({
    call,
    openAiApiKey: OPENAI_API_KEY,
    agentUserId: "ai-agent-test",
  });

  console.log("✅ OpenAI realtime connected");

  // 3️⃣ Update session (THIS is what you debugged earlier)
  await realtimeClient.updateSession({
    instructions:
      "You are a calm, helpful AI assistant. Greet the user politely.",
    turn_detection: {
      type: "server_vad",
    },
    input_audio_transcription: {
      model: "whisper-1",
    },
  });

  console.log("✅ Realtime session configured");

  console.log("🎉 Realtime test PASSED");
}

testRealtime().catch((err) => {
  console.error("❌ Realtime test FAILED");
  console.error(err);
});