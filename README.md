# Recallable

A note-taking application with AI assistant, built with TanStack Start and Convex.

## Demo

<video src="./demo.mp4" controls width="100%"></video>

## Features

- 📝 Rich text editor with TipTap (headings, lists, code blocks, tables, images)
- 📁 Hierarchical organization with folders and tagging
- 🤖 AI assistant for searching, creating, and managing notes
- 🔍 Full-text search with document indexing
- 🔐 Authentication with Better Auth
- ⚡ Real-time sync with Convex
- 🎨 Modern UI with Tailwind CSS v4

## Tech Stack

**Frontend:** TanStack Start, TanStack Router, TanStack Query, TipTap, Tailwind CSS v4  
**Backend:** Convex, Better Auth, Convex Agent (AI)  
**Runtime:** Bun

## Setup

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Setup environment variables**

   Create `.env.local` in project root:

   ```env
   # Convex
   CONVEX_DEPLOYMENT=dev:your-deployment
   VITE_CONVEX_URL=https://your-deployment.convex.cloud

   # Better Auth (project-side)
   VITE_SITE_URL=http://localhost:3800
   BETTER_AUTH_URL=http://localhost:3800
   BETTER_AUTH_SECRET=your_secret_here
   ```

   Set Convex environment variables (stored in Convex cloud):

   ```bash
   bunx convex env set OPENROUTER_API_KEY your_api_key
   bunx convex env set BETTER_AUTH_SECRET your_secret_here
   ```

3. **Initialize Convex**

   ```bash
   bunx convex dev
   ```

4. **Generate auth secret**

   ```bash
   bunx @better-auth/cli secret
   ```

5. **Start dev server**

   ```bash
   bun run dev
   ```

6. **Open** http://localhost:3800

## Environment Variables

**Project `.env.local`** (for frontend/SSR):

- `VITE_CONVEX_URL` - Convex deployment URL
- `CONVEX_DEPLOYMENT` - Convex deployment name
- `VITE_SITE_URL` - Application URL
- `BETTER_AUTH_URL` - Auth endpoint URL
- `BETTER_AUTH_SECRET` - Auth secret key

**Convex Cloud** (for backend functions):

- `OPENROUTER_API_KEY` - AI provider API key
- `BETTER_AUTH_SECRET` - Auth secret (must match project)

Set Convex env vars with: `bunx convex env set KEY value`

## Scripts

```bash
bun run dev       # Development server
bun run build     # Production build
bun run test      # Run tests
bun run deploy    # Deploy to Cloudflare
```

## Project Structure

```
src/
  ├── components/   # React components
  ├── routes/       # TanStack Router routes
  └── lib/          # Utils
convex/
  ├── schema.ts     # Database schema
  ├── items.ts      # Notes & folders
  ├── chat.ts       # AI chat
  ├── agent.ts      # AI configuration
  └── auth.ts       # Authentication
```

## Database Schema

- `items` - Notes and folders
- `tags` - Tags for categorization
- `documentIndex` - Search index
- `agentThreads` - AI chat threads

## AI Configuration

Edit `convex/agent.ts` to change model:

```typescript
languageModel: openrouter.chat("z-ai/glm-4.5-air");
```

## Deployment

**Convex:**

```bash
bunx convex deploy
bunx convex env set OPENROUTER_API_KEY your_key --prod
```

**Cloudflare Pages:**

```bash
bun run deploy
```

Set production environment variables in Cloudflare dashboard.

## License

MIT

---

Built with TanStack Start & Convex
