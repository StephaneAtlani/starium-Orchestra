#!/usr/bin/env python3
"""
Restaure la transparence des assets Orion (damier / fond neutre clair aplati en JPEG)
et génère les masters + variantes sous apps/web/public/brand/orion/.

Usage (depuis la racine du repo) :
  python3 scripts/process-orion-assets.py [dossier_sources]

Par défaut, lit les PNG masters dans apps/web/public/brand/orion/_sources/
(noms : orion-normal.png, orion-thinking.png, orion-message.png, orion-attention.png).
"""
from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image
import numpy as np

REPO = Path(__file__).resolve().parents[1]
DEFAULT_SRC = REPO / "apps/web/public/brand/orion/_sources"
DEST = REPO / "apps/web/public/brand/orion"
SIZES = [28, 40, 48, 56, 80, 96, 112, 128, 160]

PERSONALITIES = (
    "orion-normal",
    "orion-thinking",
    "orion-message",
    "orion-attention",
)


def is_neutral_background(r: int, g: int, b: int) -> bool:
    """Damier / fond clair neutre (export JPEG sans canal alpha)."""
    if max(r, g, b) < 215:
        return False
    if max(r, g, b) - min(r, g, b) > 28:
        return False
    return True


def restore_transparency(src: Path) -> Image.Image:
    im = Image.open(src).convert("RGBA")
    arr = np.array(im, dtype=np.uint8)
    h, w = arr.shape[:2]
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if visited[y, x]:
            continue
        visited[y, x] = True
        r, g, b, _ = arr[y, x]
        if not is_neutral_background(int(r), int(g), int(b)):
            continue
        arr[y, x, 3] = 0
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                q.append((nx, ny))

    return Image.fromarray(arr, "RGBA")


def resize_rgba(im: Image.Image, px: int) -> Image.Image:
    return im.resize((px, px), Image.Resampling.LANCZOS)


def main() -> None:
    src_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    if not src_dir.is_dir():
        print(f"Dossier sources introuvable : {src_dir}", file=sys.stderr)
        sys.exit(1)

    for name in PERSONALITIES:
        src = src_dir / f"{name}.png"
        if not src.is_file():
            print(f"Manquant : {src}", file=sys.stderr)
            sys.exit(1)

        rgba = restore_transparency(src)
        master = DEST / f"{name}.png"
        rgba.save(master, format="PNG", optimize=True)
        alpha = np.array(rgba)[:, :, 3]
        trans_pct = round((alpha == 0).mean() * 100, 1)
        print(f"✓ {master.name} — {trans_pct}% transparent, mode RGBA")

        for px in SIZES:
            out_dir = DEST / "sizes" / str(px)
            out_dir.mkdir(parents=True, exist_ok=True)
            resize_rgba(rgba, px).save(out_dir / f"{name}.png", format="PNG", optimize=True)

    print(f"Terminé — {len(PERSONALITIES)} masters, {len(SIZES)} tailles chacun.")


if __name__ == "__main__":
    main()
