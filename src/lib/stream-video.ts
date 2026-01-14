import { StreamClient } from '@stream-io/node-sdk';

export const getStreamClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
  const apiSecret = process.env.STREAM_VIDEO_API_SECRET;

  if (!apiKey || !apiSecret) {
    // During build, this error won't throw because we aren't calling the function
    throw new Error("Stream variables are missing");
  }

  return new StreamClient(apiKey, apiSecret);
};