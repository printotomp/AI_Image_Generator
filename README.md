# Free Image Search

Type a prompt, get downloadable, commercially-usable images pulled from free (non-paid) image sources. No AI generation — real photos and Creative Commons media with proper attribution.

## Running locally

**Requirements:** Node.js **22.12+** (required by `@tanstack/react-start`).

```bash
npm install
cp .env.example .env   # optional — see API keys below
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

Other scripts: `npm run build`, `npm run preview`, `npm run lint`.

## Image sources

The app queries every configured provider, merges the results, de-duplicates by URL, and returns **all** unique matches. Providers that need a key are skipped silently if the key is missing, so you can start with zero setup using the keyless sources.

| Source | API key | Max per search | License | Signup |
| --- | --- | --- | --- | --- |
| **Pexels** | ✅ `PEXELS_API_KEY` | 6 | Pexels License (free commercial use, no attribution required) | https://www.pexels.com/api/ |
| **Pixabay** | ✅ `PIXABAY_API_KEY` | 6 | Pixabay Content License (free commercial use) | https://pixabay.com/api/docs/ |
| **Unsplash** | ✅ `UNSPLASH_ACCESS_KEY` | 6 | Unsplash License (free, attribution appreciated) | https://unsplash.com/developers |
| **Openverse** | ❌ Not required | 6 | CC / Public Domain (commercial filter on) | — |
| **Wikimedia Commons** | ❌ Not required | 6 | CC / Public Domain | — |

Up to **~30 images** can be collected per search (6 × 5 providers), fewer after de-duplication or if a provider returns no matches. Results appear in provider order: Pexels → Pixabay → Unsplash → Openverse → Wikimedia.

All sources support commercial use. Attribution is displayed under each image in the UI (`Photo by {creator} on {source}`).

## Getting the free API keys

All three keyed providers are free and take ~2 minutes. No credit card required.

1. **Pexels** — sign in, click *Your API Key*, copy the key.
2. **Pixabay** — sign in, open the API docs page, the key is shown at the top.
3. **Unsplash** — create a new Application in the developer portal and copy the *Access Key* (not the Secret).

Add them to `.env` (copy from `.env.example`):

```
PEXELS_API_KEY=...
PIXABAY_API_KEY=...
UNSPLASH_ACCESS_KEY=...
```

On Lovable Cloud, keys can be stored as secrets and injected into server functions via `process.env`.

## How it works

- `src/lib/generate-image.functions.ts` — TanStack Start server function (`createServerFn`) that queries each provider, de-duplicates by URL, and returns the full result set.
- `src/routes/index.tsx` — search box, sample prompts, responsive results grid, and per-image download (client-side blob download with a new-tab fallback).

## Adding a new provider

1. Read the credential (if any) from `process.env` inside the `.handler()`.
2. `fetch` the search endpoint, guard with `try/catch`, and `push({ url, source, credit, link })` for each result.
3. Skip silently if the key is missing so the app still works with the remaining sources.
