import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2, Sparkles } from "lucide-react";
import { generateImages } from "@/lib/generate-image.functions";

export const Route = createFileRoute("/")({
  component: Index,
});

const SAMPLE_PROMPTS = [
  "A 2-year-old doberman with a non-black color, sitting in a park",
  "A cozy reading nook with warm lighting and a cat",
  "A futuristic city skyline at sunset, cinematic",
  "A bowl of ramen, top-down, photorealistic",
  "A watercolor painting of mountains at dawn",
];

function Index() {
  const [prompt, setPrompt] = useState(
    "get me a picture of a doberman of age 2 with non black color",
  );
  type ImageResult = { url: string; source: string; credit: string; link: string };
  const [images, setImages] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generate = useServerFn(generateImages);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setImages([]);
    try {
      const result = await generate({ data: { prompt } });
      setImages(result.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function download(img: ImageResult, idx: number) {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image-${idx + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(img.url, "_blank");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">AI Image Generator</h1>
          <p className="mt-2 text-muted-foreground">
            Describe what you want. Get 3 variations. Download any of them.
          </p>
        </header>

        <form onSubmit={handleGenerate} className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. a doberman of age 2 with non-black color"
            className="h-12 text-base"
            disabled={loading}
          />
          <Button type="submit" disabled={loading} className="h-12 px-6">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Generate
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-1">Try:</span>
          {SAMPLE_PROMPTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => !loading && setPrompt(s)}
              className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-foreground transition hover:bg-muted disabled:opacity-50"
              disabled={loading}
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex aspect-square animate-pulse items-center justify-center rounded-lg border bg-muted"
              >
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ))}
          {!loading &&
            images.map((img, i) => (
              <div key={i} className="group overflow-hidden rounded-lg border bg-card shadow-sm">
                <img src={img.url} alt={`Result ${i + 1}`} className="aspect-square w-full object-cover" />
                <div className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Photo by{" "}
                    <a href={img.link} target="_blank" rel="noreferrer" className="underline">
                      {img.credit}
                    </a>{" "}
                    on {img.source}
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => download(img, i)}>
                    <Download className="mr-2 h-4 w-4" /> Download
                  </Button>
                </div>
              </div>
            ))}
        </div>

        {!loading && images.length === 0 && !error && (
          <p className="mt-16 text-center text-sm text-muted-foreground">
            Type a prompt and hit Generate to see 3 image variations.
          </p>
        )}
      </div>
    </div>
  );
}
