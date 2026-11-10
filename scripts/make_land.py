#!/usr/bin/env python3
"""Write data/land_mask.json: a coarse map of where land is, for the particle globe on the master page.

Source: Natural Earth 1:110m land (public domain), as redistributed in the npm package
world-atlas 2.0.2 (ISC licence) as land-110m.json: the same dataset World Shock Lab's map uses.
The TopoJSON is decoded here and each cell of a 2.5 degree grid is marked land if its centre is
inside the land polygons (even-odd rule, with rings that cross the antimeridian unwrapped).
Nothing from the package is executed.

    python3 scripts/make_land.py path/to/land-110m.json
"""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
W, H = 144, 72  # 2.5 degree cells, west to east and north to south


def rings(topo: dict) -> list[list[tuple[float, float]]]:
    """Every polygon ring of the topology as a list of (lon, lat)."""
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(indices: list[int]) -> list[tuple[float, float]]:
        out: list[tuple[float, float]] = []
        for i in indices:
            pts = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(pts if not out else pts[1:])
        return out

    found = []

    def walk(geom: dict) -> None:
        kind = geom["type"]
        if kind == "GeometryCollection":
            for g in geom["geometries"]:
                walk(g)
        elif kind == "Polygon":
            found.extend(ring(r) for r in geom["arcs"])
        elif kind == "MultiPolygon":
            for poly in geom["arcs"]:
                found.extend(ring(r) for r in poly)

    for obj in topo["objects"].values():
        walk(obj)
    return found


def main() -> None:
    topo = json.loads(Path(sys.argv[1]).read_text())
    all_rings = rings(topo)
    # Unwrap each ring so that one crossing the antimeridian stays in one piece (longitudes may then pass 180).
    unwrapped = []
    for ring in all_rings:
        out = [ring[0]]
        shift = 0.0
        for (x1, _), (x2, y2) in zip(ring, ring[1:]):
            if x2 - x1 > 180:
                shift -= 360
            elif x1 - x2 > 180:
                shift += 360
            out.append((x2 + shift, y2))
        unwrapped.append(out)
    bits = []
    for j in range(H):
        lat = 90 - (j + 0.5) * 180 / H
        # Even-odd rule, ring by ring: where does the ring cross this latitude, and how many crossings lie west of the cell?
        per_ring = []
        for ring in unwrapped:
            xs = [x1 + (lat - y1) * (x2 - x1) / (y2 - y1) for (x1, y1), (x2, y2) in zip(ring, ring[1:]) if (y1 > lat) != (y2 > lat)]
            if xs:
                per_ring.append(xs)
        for i in range(W):
            lon = -180 + (i + 0.5) * 360 / W
            inside = False
            for xs in per_ring:
                if any(sum(1 for c in xs if c < lon + turn) % 2 == 1 for turn in (-360, 0, 360)):
                    inside = not inside  # a ring inside a ring is a hole (a lake or inland sea)
            bits.append(1 if inside else 0)
    packed = bytearray()
    for k in range(0, len(bits), 8):
        v = 0
        for b in bits[k:k + 8]:
            v = (v << 1) | b
        packed.append(v)
    out = {
        "source": "Natural Earth 1:110m land (public domain), the land-110m.json file that World Shock Lab's map also uses; rasterised by scripts/make_land.py",
        "width": W,
        "height": H,
        "bits": base64.b64encode(bytes(packed)).decode(),
    }
    (ROOT / "data" / "land_mask.json").write_text(json.dumps(out) + "\n")
    print(f"wrote data/land_mask.json: {sum(bits)} of {len(bits)} cells are land")
    for j in range(0, H, 2):
        print("".join("#" if bits[j * W + i] else "." for i in range(0, W, 2)))


if __name__ == "__main__":
    main()
