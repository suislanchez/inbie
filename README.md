# **Inbie**  
### Your inbox, ready before you wake.

This is my latest productivity hack:  
An **RAG-powered AI email assistant** named **Inby** that sorts, labels, and drafts replies automatically, so you wake up to a fully organized inbox — complete with smart drafts and templates ready to go.

---

##What Inbie Does

- Sorts and **categorizes your emails** by what needs a reply and what doesn't
- **Drafts personalized responses** using your tone and preferences
- Fully customizable with **user-specific rules and filters**
- Periodically updates and **saves all drafts locally** using **Turso + Drizzle**
- Uses **tRPC** and **Hono** for API routing
- Integrates **OpenAI + Claude** models with the **Gmail API** via **Google OAuth**
- Runs on the **mastra_ai TypeScript framework** for building RAG agents

---

![inbox-flux-demo2-ezgif com-video-to-gif-converter](https://github.com/user-attachments/assets/9ca9b9ab-db4f-4496-8fbd-4935f7768c3e)

---

##  Tech Stack

- **Frontend**: React + TanStack Router + NativeWind (Expo)
- **Backend**: Hono + tRPC + Bun
- **Database**: SQLite + Drizzle + Turso (Edge storage)
- **Infra**: PWA, Biome, Husky, Tauri, Starlight, Turborepo

---

##  Getting Started

1. Clone the repo  
2. Install dependencies:


bun install
3. Set up Google OAuth:

In your .env:
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
VITE_URL=http://localhost:3000
####4.	Start the dev server:

The web app runs at http://localhost:3001
The API runs at http://localhost:3000

login to google, allow yourself in google cloud under allowed emails for dev, and enable scopes
##FAQ

Why is it called Inbie?

“Inbie” is short for Inbox + AI buddy. It’s your inbox’s new best friend — fast, friendly, and always working while you sleep.

Is it open source?

Yes, feel free to fork, remix, and build your own AI-powered email assistant.

How often does it run?

It checks for new emails and updates your drafts periodically using server-side jobs (configurable). You can also trigger it manually.

How customizable is it?

You can define rules like:
	•	Only reply to academic emails
	•	Use casual tone on weekends
	•	Auto-draft intros for career mail

The rules engine is JSON-configurable per user.

Can I use a different AI model?

Yes — the agent is built using mastra_ai, so you can switch between Claude, GPT-4, or even local LLMs.
