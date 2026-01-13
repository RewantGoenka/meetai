import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const res = await client.responses.create({
  model: "gpt-4.1-mini",
  input: "Say OK",
});

console.log("✅ OpenAI working:", res.output_text);
