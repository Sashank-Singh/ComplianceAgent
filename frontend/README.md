# ComplianceAgent Frontend

Next.js app with built-in compliance check API. Deploys as a single app to Vercel.

## Deploy to Vercel

1. **Import** the project (or `frontend/` as root directory).

2. **Set environment variable** in Vercel dashboard:
   - `OPENAI_API_KEY` — Your OpenAI API key (required for compliance classification)

3. **Deploy** — The app uses same-origin `/api` routes, so no `NEXT_PUBLIC_API_URL` is needed.

## Vercel Limits

- **Hobby plan**: 10s function timeout. Crawls may timeout on slow sites. Consider upgrading to Pro (60s).
- **Pro plan**: 60s timeout via `maxDuration` in the stream route.

## Local Development

```bash
# Create .env.local with:
OPENAI_API_KEY=sk-your-key

npm run dev
```

The app runs at http://localhost:3000. API routes: `/api/health`, `/api/check/stream`.
