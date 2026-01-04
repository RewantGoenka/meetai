import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const res = await client.responses.create({
      model: "gpt-4.1-mini",
      input: "Reply with: Voice AI backend OK",
    });

    console.log("✅ OpenAI working:");
    console.log(res.output_text);
  } catch (err) {
    console.error("❌ OpenAI error");
    console.error(err);
  }
}

test();
