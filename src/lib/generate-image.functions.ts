import { createServerFn } from "@tanstack/react-start";

type ImageResult = { url: string; source: string; credit: string; link: string };

export const generateImages = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string }) => {
    if (!input?.prompt || typeof input.prompt !== "string") {
      throw new Error("Prompt is required");
    }
    return { prompt: input.prompt.slice(0, 200).trim() };
  })
    .handler(async ({ data }): Promise<{ images: ImageResult[] }> => {
        // Read from process.env (Lovable Cloud / real OS env) with import.meta.env
        // fallback (local `.env` file loaded by Vite in dev).
        const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
        const pexelsKey = "SxLMLwCX0JwgJ58hHqUNQJvpwyM7sQnIILmcGY9BorVM3sFNBQexjJfO";
        const pixabayKey = "56550929-c7eb526558089523259627a33";
      const unsplashKey = "2Nm2TTVUyeH0Ap-I1sH9sh1ql-GkiQFkJG7ieBbMwRc";

    const query = encodeURIComponent(data.prompt);
    const results: ImageResult[] = [];
    const seen = new Set<string>();
    const push = (r: ImageResult) => {
      if (!r.url || seen.has(r.url)) return;
      seen.add(r.url);
      results.push(r);
    };

    // Pexels — free, commercial use OK
    if (pexelsKey) {
      try {
        const r = await fetch(
          `https://api.pexels.com/v1/search?query=${query}&per_page=6`,
          { headers: { Authorization: pexelsKey } },
        );
        if (r.ok) {
          const j = (await r.json()) as {
            photos?: Array<{ src: { large: string }; photographer: string; url: string }>;
          };
          for (const p of j.photos ?? []) {
            push({ url: p.src.large, source: "Pexels", credit: p.photographer, link: p.url });
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Pixabay — free, commercial use OK
    if (pixabayKey) {
      try {
        const r = await fetch(
          `https://pixabay.com/api/?key=${pixabayKey}&q=${query}&per_page=6&safesearch=true&image_type=photo`,
        );
        if (r.ok) {
          const j = (await r.json()) as {
            hits?: Array<{ webformatURL: string; user: string; pageURL: string }>;
          };
          for (const h of j.hits ?? []) {
            push({ url: h.webformatURL, source: "Pixabay", credit: h.user, link: h.pageURL });
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Unsplash — free, requires attribution
    if (unsplashKey) {
      try {
        const r = await fetch(
          `https://api.unsplash.com/search/photos?query=${query}&per_page=6&client_id=${unsplashKey}`,
        );
        if (r.ok) {
          const j = (await r.json()) as {
            results?: Array<{
              urls: { regular: string };
              user: { name: string };
              links: { html: string };
            }>;
          };
          for (const u of j.results ?? []) {
            push({
              url: u.urls.regular,
              source: "Unsplash",
              credit: u.user.name,
              link: u.links.html,
            });
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Openverse — no API key required. Aggregates Creative Commons / public domain images.
    try {
      const r = await fetch(
        `https://api.openverse.org/v1/images/?q=${query}&page_size=6&license_type=commercial`,
        { headers: { "User-Agent": "lovable-image-search/1.0" } },
      );
      if (r.ok) {
        const j = (await r.json()) as {
          results?: Array<{
            url: string;
            thumbnail?: string;
            creator?: string;
            foreign_landing_url?: string;
            source?: string;
          }>;
        };
        for (const o of j.results ?? []) {
          push({
            url: o.thumbnail || o.url,
            source: `Openverse${o.source ? ` (${o.source})` : ""}`,
            credit: o.creator || "Unknown",
            link: o.foreign_landing_url || o.url,
          });
        }
      }
    } catch {
      /* ignore */
    }

    // Wikimedia Commons — free, public domain / CC, no API key
    try {
      const r = await fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${query}&gsrlimit=6&prop=imageinfo&iiprop=url|user|extmetadata&iiurlwidth=800&format=json&origin=*`,
      );
      if (r.ok) {
        const j = (await r.json()) as {
          query?: {
            pages?: Record<
              string,
              {
                title: string;
                imageinfo?: Array<{
                  thumburl?: string;
                  url: string;
                  user: string;
                  descriptionurl: string;
                }>;
              }
            >;
          };
        };
        const pages = j.query?.pages ? Object.values(j.query.pages) : [];
        for (const p of pages) {
          const info = p.imageinfo?.[0];
          if (!info) continue;
          push({
            url: info.thumburl || info.url,
            source: "Wikimedia Commons",
            credit: info.user,
            link: info.descriptionurl,
          });
        }
      }
    } catch {
      /* ignore */
    }

    if (results.length === 0) {
      throw new Error(
        "No images found. Try a different prompt, or add PEXELS_API_KEY / PIXABAY_API_KEY / UNSPLASH_ACCESS_KEY for more sources.",
      );
    }

    return { images: results };
  });
