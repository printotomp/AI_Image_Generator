# Free Image Search

Type a prompt, get 3 downloadable, commercially-usable images pulled from free (non-paid) image sources. No AI generation — real photos and Creative Commons media with proper attribution.

## Image sources

The app fans out to multiple free providers in parallel and merges the results. Providers that need a key are skipped silently if the key is missing, so you can start with zero setup using the keyless sources.

| Source | API key | License | Signup |
| --- | --- | --- | --- |
| **Openverse** | ❌ Not required | CC / Public Domain (commercial filter on) | — |
| **Wikimedia Commons** | ❌ Not required | CC / Public Domain | — |
| **Pexels** | ✅ `PEXELS_API_KEY` | Pexels License (free commercial use, no attribution required) | https://www.pexels.com/api/ |
| **Pixabay** | ✅ `PIXABAY_API_KEY` | Pixabay Content License (free commercial use) | https://pixabay.com/api/docs/ |
| **Unsplash** | ✅ `UNSPLASH_ACCESS_KEY` | Unsplash License (free, attribution appreciated) | https://unsplash.com/developers |

All sources support commercial use. Attribution is displayed under each image in the UI (`Photo by {creator} on {source}`).

## Getting the free API keys

All three keyed providers are free and take ~2 minutes. No credit card required.

1. **Pexels** — sign in, click *Your API Key*, copy the key.
2. **Pixabay** — sign in, open the API docs page, the key is shown at the top.
3. **Unsplash** — create a new Application in the developer portal and copy the *Access Key* (not the Secret).

Add them as environment variables:

```
PEXELS_API_KEY=...
PIXABAY_API_KEY=...
UNSPLASH_ACCESS_KEY=...
```

In this Lovable project they are stored as Cloud secrets and injected into server functions automatically.

## How it works

- `src/lib/generate-image.functions.ts` is a TanStack Start server function (`createServerFn`) that queries every configured provider concurrently, de-duplicates by URL, and returns the first 3 results.
- `src/routes/index.tsx` renders the search box, sample prompts, results grid, and per-image download button (client-side blob download with a new-tab fallback).

## Adding a new provider

1. Read the credential (if any) from `process.env` inside the `.handler()`.
2. `fetch` the search endpoint, guard with `try/catch`, and `push({ url, source, credit, link })` for each result.
3. Skip silently if the key is missing so the app still works with the remaining sources.
