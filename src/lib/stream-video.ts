import { StreamClient } from '@stream-io/node-sdk';

export const streamVideo = () => {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
  const apiSecret = process.env.STREAM_VIDEO_API_SECRET;

  if (!apiKey) {
    console.error("❌ MISSING: NEXT_PUBLIC_STREAM_VIDEO_API_KEY");
  }
  if (!apiSecret) {
    console.error("❌ MISSING: STREAM_VIDEO_API_SECRET");
  }

  if (!apiKey || !apiSecret) {
    throw new Error("Stream environment variables are not set in Vercel");
  }

  return new StreamClient(apiKey, apiSecret);
};