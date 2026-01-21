import { serve } from "inngest/next";
import { inngest } from "../inngest/client";
import { processMeetingTranscript } from "../inngest/functions"; // Ensure this path is correct

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processMeetingTranscript, // Add all your functions here
  ],
});