# Recallable

A note-taking application with AI assistant, built with TanStack Start and Convex.

https://github.com/user-attachments/assets/1daba531-76e7-4203-9cbe-d5f0df9b753d

## Features

- 📝 Rich text editor with TipTap (headings, lists, code blocks, tables, images)
- 📁 Hierarchical organization with folders and tagging
- 🤖 AI assistant for searching, creating, and managing notes
- 🔍 Full-text search with document indexing
- 🔐 Authentication with Better Auth
- ⚡ Real-time sync with Convex
- 🎨 Modern UI with Tailwind CSS v4

## Tech Stack

TanStack Ecosystem, TipTap, Tailwind CSS, Convex, Better Auth, Openrouter 

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
   bunx convex env set BETTER_AUTH_SECRET your_secret_here
   bunx convex env set OPENROUTER_API_KEY your_api_key
   bunx convex env set GITHUB_CLIENT_ID your_github_id
   bunx convex env set GITHUB_CLIENT_SECRET your_github_secret
   bunx convex env set RESEND_API_KEY your_resend_key
   bunx convex env set RESEND_WEBHOOK_SECRET your_webhook_secret
   bunx convex env set SITE_URL http://localhost:3800
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

- `BETTER_AUTH_SECRET` - Auth secret (must match project)
- `OPENROUTER_API_KEY` - AI provider API key
- `GITHUB_CLIENT_ID` - GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
- `RESEND_API_KEY` - Resend email service API key
- `RESEND_WEBHOOK_SECRET` - Resend webhook secret
- `SITE_URL` - Application URL (e.g., http://localhost:3800)

Set Convex env vars with:

```bash
bunx convex env set BETTER_AUTH_SECRET your_secret
bunx convex env set OPENROUTER_API_KEY your_openrouter_key
bunx convex env set GITHUB_CLIENT_ID your_github_id
bunx convex env set GITHUB_CLIENT_SECRET your_github_secret
bunx convex env set RESEND_API_KEY your_resend_key
bunx convex env set RESEND_WEBHOOK_SECRET your_webhook_secret
bunx convex env set SITE_URL http://localhost:3800
```

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

# Set production environment variables
bunx convex env set BETTER_AUTH_SECRET your_secret --prod
bunx convex env set OPENROUTER_API_KEY your_key --prod
bunx convex env set GITHUB_CLIENT_ID your_id --prod
bunx convex env set GITHUB_CLIENT_SECRET your_secret --prod
bunx convex env set RESEND_API_KEY your_key --prod
bunx convex env set RESEND_WEBHOOK_SECRET your_secret --prod
bunx convex env set SITE_URL https://your-production-url.com --prod
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
