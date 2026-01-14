import "server-only"
import { StreamClient } from '@stream-io/node-sdk';

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const apiSecret = process.env.STREAM_VIDEO_API_SECRET;

// Defensive initialization: only create the client if keys exist
// This prevents the "secretOrPrivateKey" error during GitHub builds
export const streamVideo = (apiKey && apiSecret) 
  ? new StreamClient(apiKey, apiSecret)
  : null as unknown as StreamClient;