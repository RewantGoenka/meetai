````markdown
# MeetAI

**Build Voice-AI Agents and run Meetings powered by them — faster than ever.**

MeetAI is an AI-powered meeting platform designed to handle **real-time conversations, event-driven workflows, and production-grade reliability**. This project demonstrates full-stack engineering at scale, with a focus on **system design, idempotency, and data integrity**.
Live agent participation is implemented and demonstrated; further iterations were intentionally paused in favor of building a generalized agentic workflow engine.

---

## Features

- Create AI-powered meeting agents
- Conduct and manage meetings with real-time AI support
- Event-driven workflows with idempotent and duplicate-safe webhooks
- Custom data-table architecture to handle complex meeting and agent states
- Reliable serverless deployment on Vercel

---

## Tech Stack

- **Frontend / API:** Next.js (App Router) + TypeScript  
- **API Layer:** tRPC (end-to-end type safety)  
- **Database:** PostgreSQL + Drizzle ORM  
- **Event Workflows:** Inngest  
- **AI Integration:** OpenAI API  
- **Local Development / Webhooks:** ngrok  
- **Deployment:** Vercel (serverless)

---

## Engineering Highlights

- **Custom data-table architecture** instead of plug-and-play ORM defaults  
- **Idempotent event and webhook handling** to safely support retries  
- **Duplicate webhook prevention** to maintain consistency  
- **Race-condition handling** across async workflows  

---

## Getting Started

1. Clone the repository  
```bash
git clone <repo-url>
cd meetai
````

2. Install dependencies

```bash
npm install
```

3. Set environment variables (`.env`)

```env
OPENAI_API_KEY=<your-key>
INNGEST_API_KEY=<your-key>
DATABASE_URL=<your-postgres-url>
```

4. Run local development server

```bash
npm run dev
```

5. Use **ngrok** for testing webhooks locally:

```bash
ngrok http 3000
```

6. Deploy on **Vercel** for production

---

## Live Demo

[https://meetai-zeta-ashen.vercel.app/sign-in](https://meetai-zeta-ashen.vercel.app/sign-in)

---

## Why MeetAI?

I built **MeetAI** because I wanted to go beyond simple “AI demos” and build something that actually **works reliably in the real world**.

Most AI meeting or agent demos stop at “it runs.” They don’t account for **failure modes, retries, or inconsistent data**. I wanted to:

* Learn **production-grade system design** in a serverless environment
* Understand **idempotency, duplicate event handling, and race conditions**
* Integrate **real-time AI workflows** in a way that’s maintainable and scalable
* Build a project that **shows I can design systems, not just write features**

The project forced me to think like **an engineer building infra that won’t break**, and not just a developer shipping CRUD. Every challenge — from webhook retries to serverless cold starts — taught me more about **reliability, data integrity, and scaling AI-driven products**.

MeetAI is a reflection of **months of iterative thinking, debugging, and designing for edge cases** — the kind of problems I want to solve professionally.

---

## License

MIT License

```
git clone <repo-url>
cd meetai
