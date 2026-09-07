#!/usr/bin/env python3
"""Convert rendered concept-art PNG frames into looping GIFs."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

WIDTH, HEIGHT, FRAME_COUNT, FRAME_MS, MAX_BYTES = 480, 270, 120, 100, 512_000


def inputs(directory: Path) -> list[Path]:
    files = sorted(directory.glob("*.png"))
    if len(files) != FRAME_COUNT:
        raise ValueError(f"{directory}: expected {FRAME_COUNT} PNG frames, found {len(files)}")
    return files


def encode(source: Path, destination: Path) -> None:
    files = inputs(source)
    rgb = []
    for path in files:
        with Image.open(path) as image:
            if image.size != (WIDTH, HEIGHT):
                raise ValueError(f"{path}: expected {WIDTH}x{HEIGHT}, got {image.size}")
            rgb.append(image.convert("RGB"))
    # One palette for every frame prevents per-frame color flicker in the loop.
    palette = Image.new("RGB", (WIDTH, HEIGHT * len(rgb)))
    for index, image in enumerate(rgb): palette.paste(image, (0, index * HEIGHT))
    # Keep character motion smooth; reduce palette detail before reducing time resolution.
    for colors in (64, 48, 32):
        shared = palette.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
        encoded = [image.quantize(palette=shared, dither=Image.Dither.NONE) for image in rgb]
        encoded[0].save(destination, save_all=True, append_images=encoded[1:], duration=FRAME_MS, loop=0, disposal=1, optimize=True)
        if destination.stat().st_size <= MAX_BYTES:
            print(f"{destination}: {destination.stat().st_size} bytes, {colors} colors")
            return
    raise ValueError(f"{destination}: exceeds {MAX_BYTES} byte GIF cap")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: encode-reading-concepts.py <frames-dir> <output-dir>")
    frame_root, output_root = map(Path, sys.argv[1:])
    output_root.mkdir(parents=True, exist_ok=True)
    for story, output in (("war", "war-book-concept.gif"), ("grimm", "grimm-story-concept.gif")):
        encode(frame_root / story, output_root / output)


if __name__ == "__main__":
    main()
