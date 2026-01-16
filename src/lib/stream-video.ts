import { StreamClient } from '@stream-io/node-sdk';

export const streamVideo = () => {
  // Use the exact environment variable names from your Vercel/Dashboard
  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
  const apiSecret = process.env.STREAM_VIDEO_API_SECRET;

  if (!apiKey || !apiSecret) {
    // This will show up in your Vercel Runtime logs if the variables are missing
    console.error("❌ Stream API Error: NEXT_PUBLIC_STREAM_VIDEO_API_KEY or STREAM_VIDEO_API_SECRET is not defined.");
    throw new Error("Stream Video environment variables are missing.");
  }

  // Create and return a new instance of the StreamClient
  return new StreamClient(apiKey, apiSecret);
};