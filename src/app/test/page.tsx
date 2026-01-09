"use client";

import { useState } from "react";

export default function WebhookSimulatorPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const simulateWebhook = async () => {
    setLogs([]);

    try {
      // 1️⃣ Ensure meeting exists and get the actual ID
      // We fetch from the API we just fixed
      const meetingRes = await fetch("/api/demo", { method: "POST" });
      if (!meetingRes.ok) throw new Error("Failed to create demo meeting");
      
      const meetingData = await meetingRes.json();
      const meetingId = meetingData.meetingId;

      setLogs((prev) => [...prev, `Setup → Meeting verified: ${meetingId}`]);

      // 2️⃣ Prepare the Webhook Payload
      const webhookId = `test-${Date.now()}`;
      const payload = {
        type: "call.session_started",
        id: webhookId, // This ID stays the same for both calls to test idempotency
        call: { 
          custom: { meetingId: meetingId } 
        },
      };

      // 3️⃣ Simulate the Double Webhook (Sequential calls)
      for (let i = 1; i <= 2; i++) {
        const res = await fetch("/api/webhook", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "demo",
            "x-signature": "demo",
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        setLogs((prev) => [
          ...prev,
          `Attempt ${i} → HTTP ${res.status}: ${JSON.stringify(data)}`,
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setLogs((prev) => [...prev, `ERROR: ${message}`]);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        Webhook Idempotency Simulator
      </h1>

      <button
        onClick={simulateWebhook}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Simulate Double Webhook
      </button>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2">Logs</h2>
        <ul className="p-4 bg-gray-900 text-green-400 font-mono text-xs rounded-lg space-y-1 min-h-[150px]">
          {logs.length === 0 && <li className="text-gray-600">No logs yet. Click the button to start.</li>}
          {logs.map((log, i) => (
            <li key={i} className="border-b border-gray-800 pb-1">
              {log}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}