import { StreamClient } from "@stream-io/node-sdk";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const secret = process.env.STREAM_VIDEO_API_SECRET;

if (!apiKey || !secret) {
  throw new Error("Missing Stream credentials");
}

const client = new StreamClient(apiKey, secret);
const video = client.video;

async function testStream() {
  const call = video.call("default", "test-call-123");

  await call.getOrCreate({
    data: {
      created_by_id: "server-admin", // ✅ REQUIRED
    },
  });

  console.log("✅ Stream video call created successfully");
}

testStream().catch((err) => {
  console.error("❌ Stream error");
  console.error(err);
});
