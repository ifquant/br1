#!/usr/bin/env python3
"""Encode deterministic concept PNG frames as compact looping GIFs."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

WIDTH, HEIGHT, FRAME_COUNT = 1200, 720, 240


def inputs(directory: Path) -> list[Path]:
    files = sorted(directory.glob("*.png"))
    if len(files) != FRAME_COUNT:
        raise ValueError(f"{directory}: expected {FRAME_COUNT} PNG frames, found {len(files)}")
    return files


def palette_for(files: list[Path]) -> Image.Image:
    """Build one shared palette from representative frames to keep GIF diffs compact."""
    sample = Image.new("RGB", (200, 120 * 20))
    for slot, path in enumerate(files[::12]):
        with Image.open(path) as image:
            sample.paste(image.convert("RGB").resize((200, 120)), (0, slot * 120))
    return sample.quantize(colors=48, method=Image.Quantize.MEDIANCUT)


def encode(source: Path, destination: Path) -> None:
    files = inputs(source)
    palette = palette_for(files)
    encoded: list[Image.Image] = []
    for path in files:
        with Image.open(path) as image:
            if image.size != (WIDTH, HEIGHT):
                raise ValueError(f"{path}: expected {WIDTH}x{HEIGHT}, got {image.size}")
            encoded.append(image.convert("RGB").quantize(palette=palette, dither=Image.Dither.NONE))
    # GIF durations are centiseconds; eighty 90 ms frames plus 160 80 ms frames equal exactly 20 seconds.
    durations = [90 if index % 3 == 0 else 80 for index in range(FRAME_COUNT)]
    encoded[0].save(destination, save_all=True, append_images=encoded[1:], duration=durations, loop=0, optimize=True, disposal=1)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: encode-reading-concepts.py <frames-dir> <output-dir>")
    frame_root, output_root = map(Path, sys.argv[1:])
    output_root.mkdir(parents=True, exist_ok=True)
    for story, output in (("war", "war-book-concept.gif"), ("grimm", "grimm-story-concept.gif")):
        encode(frame_root / story, output_root / output)


if __name__ == "__main__":
    main()
