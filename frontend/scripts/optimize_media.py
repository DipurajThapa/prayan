#!/usr/bin/env python3
"""Build the site's optimised media from the originals in frontend/media-src.

    python3 frontend/scripts/optimize_media.py        (needs Pillow with AVIF support, and ffmpeg)

For every image it writes AVIF, WebP and a JPEG fallback in a few widths to
public/static/media/, with a content hash in each filename. Files under /static/ are
served with a one-year immutable cache, and a new hash means a new URL, so browsers
and the CDN never show a stale file. It also:
  - crops very tall photos to 4:5 (every slot on the site is 4:5 or wider and crops to the centre anyway)
  - re-encodes the hero video to 1280px at a capped bitrate
  - writes src/lib/media-manifest.json (read by src/lib/media.js)
  - writes the home-hero preload script into public/index.html
  - writes public/media/social-preview.jpg (1200x630, stable URL for og:image)
  - deletes generated files that are no longer referenced
Re-running is cheap: outputs whose source and settings have not changed are kept.
"""
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageOps, features

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "media-src"
OUT = ROOT / "public" / "static" / "media"
URL = "/static/media"
MANIFEST = ROOT / "src" / "lib" / "media-manifest.json"
INDEX = ROOT / "public" / "index.html"
SOCIAL = ROOT / "public" / "media" / "social-preview.jpg"

DEFAULT_WIDTHS = (480, 800, 1200)
WIDTHS = {"hero-dubai-villa-pool": (1200, 1600, 2000), "hero-dubai-villa-pool-mobile": (480, 900)}
FALLBACK_WIDTH = {"hero-dubai-villa-pool": 1600, "hero-dubai-villa-pool-mobile": 900}
MAX_PORTRAIT = 5 / 4  # height / width
QUALITY = {"avif": 55, "webp": 75, "jpg": 78}
VIDEO = {"hero-dubai-mansion-skyline": {"width": 1280, "bitrate": 1400}}
SETTINGS_VERSION = "1"  # bump to force every file to be re-encoded


def digest(*parts) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p if isinstance(p, bytes) else str(p).encode())
    return h.hexdigest()[:10]


def load(path: Path) -> Image.Image:
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    w, h = im.size
    if h / w > MAX_PORTRAIT:
        nh = round(w * MAX_PORTRAIT)
        top = (h - nh) // 2
        im = im.crop((0, top, w, top + nh))
    return im


def save(im: Image.Image, fmt: str, dest: Path):
    if fmt == "avif":
        im.save(dest, "AVIF", quality=QUALITY["avif"], speed=4)
    elif fmt == "webp":
        im.save(dest, "WEBP", quality=QUALITY["webp"], method=6)
    else:
        im.save(dest, "JPEG", quality=QUALITY["jpg"], optimize=True, progressive=True)


def build_image(src: Path, keep: set) -> dict:
    key = src.stem
    raw = src.read_bytes()
    im = load(src)
    widths = [w for w in WIDTHS.get(key, DEFAULT_WIDTHS) if w <= im.width] or [im.width]
    entry = {"w": im.width, "h": im.height}
    for fmt in ("avif", "webp", "jpg"):
        fmt_widths = [FALLBACK_WIDTH.get(key, 800)] if fmt == "jpg" else widths
        fmt_widths = [min(w, im.width) for w in fmt_widths]
        candidates = []
        for w in fmt_widths:
            name = f"{key}-{w}.{digest(raw, fmt, w, QUALITY[fmt], MAX_PORTRAIT, SETTINGS_VERSION)}.{fmt}"
            dest = OUT / name
            if not dest.exists():
                save(im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS), fmt, dest)
            keep.add(name)
            candidates.append(f"{URL}/{name} {w}w")
        entry[fmt] = candidates[0].split(" ")[0] if fmt == "jpg" else ", ".join(candidates)
    entry["src"] = entry.pop("jpg")
    return entry


def build_video(src: Path, keep: set) -> dict:
    key = src.stem
    cfg = VIDEO[key]
    name = f"{key}-{cfg['width']}.{digest(src.read_bytes(), cfg, SETTINGS_VERSION)}.mp4"
    dest = OUT / name
    if not dest.exists():
        if not shutil.which("ffmpeg"):
            sys.exit("ffmpeg is needed to encode the hero video")
        br = cfg["bitrate"]
        common = ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-vf", f"scale={cfg['width']}:-2",
                  "-c:v", "libx264", "-preset", "slow", "-b:v", f"{br}k", "-passlogfile", str(OUT / "_x264")]
        subprocess.run(common + ["-pass", "1", "-f", "mp4", "/dev/null"], check=True)
        subprocess.run(common + ["-maxrate", f"{br * 3 // 2}k", "-bufsize", f"{br * 2}k", "-pass", "2",
                                 "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(dest)], check=True)
        for log in OUT.glob("_x264*"):
            log.unlink()
    keep.add(name)
    return {"src": f"{URL}/{name}"}


def write_social(src: Path):
    im = load(src)
    im = ImageOps.fit(im, (1200, 630), Image.LANCZOS)
    SOCIAL.parent.mkdir(parents=True, exist_ok=True)
    im.save(SOCIAL, "JPEG", quality=82, optimize=True, progressive=True)


def write_preload(manifest: dict):
    """Start the hero download while the HTML is still parsing, on the home page only.
    The srcset and sizes match the <picture> in Home.jsx exactly, so the browser reuses this download."""
    mobile, desktop = manifest["hero-dubai-villa-pool-mobile"], manifest["hero-dubai-villa-pool"]
    links = [{"media": "(max-width: 767px)", "srcset": mobile["avif"]}, {"media": "(min-width: 768px)", "srcset": desktop["avif"]}]
    script = (
        "<script>if(location.pathname===\"/\"){" + json.dumps(links, separators=(",", ":")) + ".forEach(function(o){"
        "var l=document.createElement(\"link\");l.rel=\"preload\";l.as=\"image\";l.type=\"image/avif\";l.media=o.media;"
        "l.setAttribute(\"imagesrcset\",o.srcset);l.setAttribute(\"imagesizes\",\"100vw\");l.setAttribute(\"fetchpriority\",\"high\");"
        "document.head.appendChild(l)})}</script>"
    )
    html = INDEX.read_text()
    block = f"<!-- media:preload:start (generated by scripts/optimize_media.py) -->\n        {script}\n        <!-- media:preload:end -->"
    new, n = re.subn(r"<!-- media:preload:start.*?<!-- media:preload:end -->", lambda _: block, html, flags=re.S)
    if n != 1:
        sys.exit("public/index.html is missing the <!-- media:preload:start --> ... <!-- media:preload:end --> markers")
    INDEX.write_text(new)


def main():
    if not features.check("avif"):
        sys.exit("This Pillow build has no AVIF support; install Pillow 11.2 or newer")
    OUT.mkdir(parents=True, exist_ok=True)
    keep, manifest = set(), {}
    for src in sorted(SRC.glob("*.jpg")):
        manifest[src.stem] = build_image(src, keep)
        print(f"image  {src.stem}")
    for src in sorted(SRC.glob("*.mp4")):
        manifest[src.stem] = build_video(src, keep)
        print(f"video  {src.stem}")
    for f in OUT.iterdir():
        if f.name not in keep:
            f.unlink()
            print(f"remove {f.name}")
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    write_social(SRC / "hero-dubai-villa-pool.jpg")
    write_preload(manifest)
    total = sum(f.stat().st_size for f in OUT.iterdir())
    print(f"{len(keep)} files, {total / 1024 / 1024:.1f} MB in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
