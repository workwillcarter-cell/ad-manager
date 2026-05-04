# BloomaCare Creative

## What this is
BloomaCare Creative is a creative-production tracker that replaces a 3-Google-Sheets workflow. The CEO logs ad concepts on a spreadsheet-style board, an AI Generator team picks them up on a kanban, and editors finalize them on another kanban. When all three steps are done, ads auto-batch (10 per batch) and get auto-numbered as `Bloom100`, `Bloom101`, etc. Finished assets transfer to Dropbox.

Live site: **https://bloomacare-creative.vercel.app**

## Who you're talking to
The user is **Will Carter** — non-technical CEO who runs the business, not an engineer. Communication rules:
- Use plain English, no jargon. Explain what a command does before asking him to run it.
- Pick implementation defaults yourself. Only ask product-level questions (e.g., "should the strategist be able to delete cards?") not technical ones.
- Default login for testing: `admin@admanager.com` / `admin123`

## Stack
- Next.js 16.2.4 (App Router) · TypeScript · Tailwind v4
- Prisma + Neon Postgres (production DB)
- NextAuth (credentials provider, JWT sessions)
- Deployed on Vercel — auto-deploys on push to `main`

## Live data is sacred
Real users log real projects and batches in the production database every day. Two rules:
1. **Code changes are always safe** — pushing new code deploys a new app version but doesn't touch existing rows.
2. **Schema changes are not safe by default.** Anything involving Prisma migrations, dropping columns, renaming fields, or `prisma migrate` commands must be flagged to Will explicitly before running. Discuss the impact, decide together. Never run a destructive migration without confirmation.

If anything goes wrong post-deploy, Vercel can roll back to any previous deployment in one click — point Will at the Vercel dashboard's Deployments tab.

## Sister app
There's a sister app called **Vittelo Creative** (separate repo at `~/ClaudeProjects/vittelo-creative`, separate Vercel project, separate Neon DB). Cross-app bug fixes usually need to be applied in both — they share most of the codebase but have drifted (Vittelo has team-split architecture and removed the AIG board).

## Workflow when Will makes a request
1. Make the change
2. Test it locally if possible (`npm run dev` may already be running in another terminal)
3. Commit with a clear message
4. `git push` — Vercel auto-deploys in ~1 minute
5. Tell Will when it's live

If a request affects both apps, do it in one repo first, get confirmation it works, then apply to the other.
