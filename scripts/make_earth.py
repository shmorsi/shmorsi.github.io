#!/usr/bin/env python3
"""Write assets/earth.bin: the dots of the home page's globe, one wherever there is land.

Source: Natural Earth 1:50m land (public domain), as redistributed in the npm package
world-atlas 2.0.2 (ISC licence) as land-50m.json, the same dataset as data/land_mask.json at a
finer scale. Nothing from the package is executed: the TopoJSON is decoded by
scripts/make_land.py's reader, rasterised on a quarter-degree grid (even-odd rule), and then a
Fibonacci lattice of evenly spaced points on the sphere is kept where it lands on land.

    npm pack world-atlas@2.0.2 && tar -xzf world-atlas-2.0.2.tgz
    python3 scripts/make_earth.py package/land-50m.json
"""

from __future__ import annotations

import bisect
import json
import math
import struct
import sys
from pathlib import Path

import make_land  # the TopoJSON reader

ROOT = Path(__file__).resolve().parents[1]
CELL = 0.25          # degrees per raster cell
POINTS = 64000       # points on the whole sphere; about 29% fall on land


def mask(rings: list[list[tuple[float, float]]]) -> list[bytearray]:
    """Row by row (north to south), 1 where the cell's centre is on land."""
    unwrapped = []
    for ring in rings:
        out, shift = [ring[0]], 0.0
        for (x1, _), (x2, y2) in zip(ring, ring[1:]):
            if x2 - x1 > 180:
                shift -= 360
            elif x1 - x2 > 180:
                shift += 360
            out.append((x2 + shift, y2))
        unwrapped.append(out)
    W, H = int(360 / CELL), int(180 / CELL)
    rows = []
    for j in range(H):
        lat = 90 - (j + 0.5) * CELL
        xs = []
        for ring in unwrapped:
            for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
                if (y1 > lat) != (y2 > lat):
                    x = x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
                    xs.extend((x - 360, x, x + 360))  # a ring unwrapped past the antimeridian still counts where it lands
        xs.sort()
        row = bytearray(W)
        for i in range(W):
            lon = -180 + (i + 0.5) * CELL
            row[i] = bisect.bisect_left(xs, lon) % 2
        rows.append(row)
    return rows


def main() -> None:
    topo = json.loads(Path(sys.argv[1]).read_text())
    rows = mask(make_land.rings(topo))
    W = len(rows[0])
    golden = math.pi * (3 - math.sqrt(5))
    packed = bytearray()
    kept = 0
    for k in range(POINTS):
        y = 1 - 2 * (k + 0.5) / POINTS
        lat = math.degrees(math.asin(y))
        lon = (math.degrees(k * golden) + 180) % 360 - 180
        j = min(len(rows) - 1, int((90 - lat) / CELL))
        i = min(W - 1, int((lon + 180) / CELL))
        if rows[j][i]:
            packed += struct.pack("<hh", round(lat * 100), round(lon * 100))
            kept += 1
    # int16 little-endian pairs: latitude x 100, longitude x 100, one pair per dot
    (ROOT / "assets" / "earth.bin").write_bytes(bytes(packed))
    print(f"wrote assets/earth.bin: {kept} of {POINTS} points are on land")


if __name__ == "__main__":
    main()
