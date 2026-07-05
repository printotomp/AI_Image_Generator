"""Free image search POC — same providers & dedup logic as the original TypeScript app."""

import json
from urllib.parse import quote

import httpx
import streamlit as st

from config import PEXELS_API_KEY, PIXABAY_API_KEY, UNSPLASH_ACCESS_KEY

USER_AGENT = (
    "image-search-poc/1.0 "
    "(https://github.com/local/image-search-poc; mailto:poc@example.com) "
    "Python-httpx"
)
IMAGES_PER_PLATFORM = 3


def _print_platform_response(name: str, response: httpx.Response) -> None:
    print(f"\n{'=' * 60}")
    print(f"{name} | HTTP {response.status_code}")
    print("=" * 60)
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)


def search_images(prompt: str) -> list[dict]:
    prompt = prompt[:200].strip()
    if not prompt:
        raise ValueError("Prompt is required")

    query = quote(prompt)
    results: list[dict] = []
    seen: set[str] = set()

    print(f"\n>>> Search prompt: {prompt!r}")

    succeeded: list[str] = []
    failed: list[str] = []

    def push(url: str, source: str, credit: str, link: str) -> None:
        if not url or url in seen:
            return
        seen.add(url)
        results.append({"url": url, "source": source, "credit": credit, "link": link})

    with httpx.Client(timeout=30.0, headers={"User-Agent": USER_AGENT}) as client:
        if PEXELS_API_KEY:
            try:
                before = len(results)
                r = client.get(
                    f"https://api.pexels.com/v1/search?query={query}&per_page={IMAGES_PER_PLATFORM}",
                    headers={"Authorization": PEXELS_API_KEY},
                )
                _print_platform_response("Pexels", r)
                if r.is_success:
                    for p in r.json().get("photos") or []:
                        push(p["src"]["large"], "Pexels", p["photographer"], p["url"])
                    added = len(results) - before
                    if added:
                        succeeded.append(f"Pexels ({added} images)")
                    else:
                        failed.append("Pexels (no results)")
                else:
                    failed.append(f"Pexels (HTTP {r.status_code})")
            except Exception as e:
                print(f"\nPexels | ERROR: {e}")
                failed.append(f"Pexels ({e})")
        else:
            failed.append("Pexels (no API key)")

        if PIXABAY_API_KEY:
            try:
                before = len(results)
                r = client.get(
                    f"https://pixabay.com/api/?key={PIXABAY_API_KEY}&q={query}"
                    f"&per_page={IMAGES_PER_PLATFORM}&safesearch=true&image_type=photo"
                )
                _print_platform_response("Pixabay", r)
                if r.is_success:
                    for h in r.json().get("hits") or []:
                        push(h["webformatURL"], "Pixabay", h["user"], h["pageURL"])
                    added = len(results) - before
                    if added:
                        succeeded.append(f"Pixabay ({added} images)")
                    else:
                        failed.append("Pixabay (no results)")
                else:
                    failed.append(f"Pixabay (HTTP {r.status_code})")
            except Exception as e:
                print(f"\nPixabay | ERROR: {e}")
                failed.append(f"Pixabay ({e})")
        else:
            failed.append("Pixabay (no API key)")

        if UNSPLASH_ACCESS_KEY:
            try:
                before = len(results)
                r = client.get(
                    f"https://api.unsplash.com/search/photos?query={query}"
                    f"&per_page={IMAGES_PER_PLATFORM}&client_id={UNSPLASH_ACCESS_KEY}"
                )
                _print_platform_response("Unsplash", r)
                if r.is_success:
                    for u in r.json().get("results") or []:
                        push(
                            u["urls"]["regular"],
                            "Unsplash",
                            u["user"]["name"],
                            u["links"]["html"],
                        )
                    added = len(results) - before
                    if added:
                        succeeded.append(f"Unsplash ({added} images)")
                    else:
                        failed.append("Unsplash (no results)")
                else:
                    failed.append(f"Unsplash (HTTP {r.status_code})")
            except Exception as e:
                print(f"\nUnsplash | ERROR: {e}")
                failed.append(f"Unsplash ({e})")
        else:
            failed.append("Unsplash (no API key)")

        try:
            before = len(results)
            r = client.get(
                f"https://api.openverse.org/v1/images/?q={query}"
                f"&page_size={IMAGES_PER_PLATFORM}&license_type=commercial",
            )
            _print_platform_response("Openverse", r)
            if r.is_success:
                for o in r.json().get("results") or []:
                    src = o.get("source")
                    source = f"Openverse ({src})" if src else "Openverse"
                    push(
                        o.get("thumbnail") or o["url"],
                        source,
                        o.get("creator") or "Unknown",
                        o.get("foreign_landing_url") or o["url"],
                    )
                added = len(results) - before
                if added:
                    succeeded.append(f"Openverse ({added} images)")
                else:
                    failed.append("Openverse (no results)")
            else:
                failed.append(f"Openverse (HTTP {r.status_code})")
        except Exception as e:
            print(f"\nOpenverse | ERROR: {e}")
            failed.append(f"Openverse ({e})")

        try:
            before = len(results)
            r = client.get(
                "https://commons.wikimedia.org/w/api.php"
                f"?action=query&generator=search&gsrnamespace=6&gsrsearch={query}"
                f"&gsrlimit={IMAGES_PER_PLATFORM}&prop=imageinfo&iiprop=url|user|extmetadata"
                "&iiurlwidth=800&format=json&origin=*"
            )
            _print_platform_response("Wikimedia Commons", r)
            if r.is_success:
                pages = r.json().get("query", {}).get("pages") or {}
                for p in pages.values():
                    info = (p.get("imageinfo") or [None])[0]
                    if not info:
                        continue
                    push(
                        info.get("thumburl") or info["url"],
                        "Wikimedia Commons",
                        info["user"],
                        info["descriptionurl"],
                    )
                added = len(results) - before
                if added:
                    succeeded.append(f"Wikimedia Commons ({added} images)")
                else:
                    failed.append("Wikimedia Commons (no results)")
            else:
                failed.append(f"Wikimedia Commons (HTTP {r.status_code})")
        except Exception as e:
            print(f"\nWikimedia Commons | ERROR: {e}")
            failed.append(f"Wikimedia Commons ({e})")

    print(f"\n>>> Total unique images after dedup: {len(results)}")
    print("\n>>> Platform summary")
    if succeeded:
        print("  Success:", ", ".join(succeeded))
    else:
        print("  Success: none")
    if failed:
        print("  Failed: ", ", ".join(failed))
    else:
        print("  Failed:  none")

    if not results:
        raise ValueError(
            "No images found. Try a different prompt, or check API keys in config.py."
        )

    return results


def main() -> None:
    st.set_page_config(page_title="Free Image Search", layout="wide")
    st.title("Free Image Search")
    st.caption("Search free stock & Creative Commons images. No AI generation.")

    prompt = st.text_input(
        "Prompt",
        value="get me a picture of a doberman of age 2 with non black color",
        placeholder="e.g. sunset over mountains",
    )

    if st.button("Search", type="primary") and prompt.strip():
        with st.spinner("Searching..."):
            try:
                images = search_images(prompt)
                st.success(f"Found {len(images)} images")
            except ValueError as e:
                st.error(str(e))
                return

        cols = st.columns(3)
        for i, img in enumerate(images):
            with cols[i % 3]:
                st.image(img["url"], use_container_width=True)
                st.markdown(
                    f"Photo by [{img['credit']}]({img['link']}) on **{img['source']}**"
                )


if __name__ == "__main__":
    main()
