const SARVAM_API_KEY = process.env.SARVAM_API_KEY!;
const SARVAM_BASE = "https://api.sarvam.ai";

export async function summarizeWithSarvam(text: string) {
  const res = await fetch(`${SARVAM_BASE}/summarize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SARVAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      domain: "meeting",
      output_format: "bullet",
      language: "en-IN",
    }),
  });

  if (!res.ok) {
    throw new Error(`Sarvam error ${res.status}`);
  }

  const data = await res.json();
  return data.summary;
}
