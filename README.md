# Free Image Search (Python POC)

Type a prompt, get downloadable, commercially-usable images from free stock and Creative Commons sources. No AI generation — real photos with attribution.

## Run

Requires [uv](https://docs.astral.sh/uv/).

```bash
uv sync
uv run streamlit run app.py
```

Open the URL shown in the terminal (usually `http://localhost:8501`).

## API keys

Keys are hardcoded in `config.py` for this POC. Edit that file to change them.

## Image sources

Queries each provider in order, merges results, de-duplicates by URL, and returns **all** unique matches.

| Source | Key in `config.py` | Max per search |
| --- | --- | --- |
| Pexels | `PEXELS_API_KEY` | 3 |
| Pixabay | `PIXABAY_API_KEY` | 3 |
| Unsplash | `UNSPLASH_ACCESS_KEY` | 3 |
| Openverse | — | 3 |
| Wikimedia Commons | — | 3 |

**Pixabay note:** The Pixabay API requires `per_page` to be **at least 3** (valid range is 3–200). This app uses `IMAGES_PER_PLATFORM = 3` in `app.py`, so do not set it below 3 or Pixabay requests will fail with HTTP 400.

## Use as a library

```python
from app import search_images

images = search_images("sunset over mountains")
for img in images:
    print(img["url"], img["source"])
```

## Files

- `config.py` — API keys
- `app.py` — `search_images()` + Streamlit UI
- `pyproject.toml` — dependencies (managed with uv)
