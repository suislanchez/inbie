# 📨 **Inbie**  
### Your inbox, ready before you wake.

This is my latest productivity hack:  
An **RAG-powered AI email assistant** named **Inby** that sorts, labels, and drafts replies automatically, so you wake up to a fully organized inbox — complete with smart drafts and templates ready to go.

---

## ⚙️What Inby Does

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

```bash
bun install
