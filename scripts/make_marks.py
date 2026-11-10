#!/usr/bin/env python3
"""Draw one project mark per project as an SVG: assets/marks/<id>.svg.

Original artwork in the site's own system: a black tile on a faint chart grid,
accent corner ticks, and one simple glyph per project. Monochrome strokes plus
the site's ice-blue accent, so the marks read on black and on white.
Run after adding a project to data/projects.json.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "marks"
INK = "#f4f5f7"
ACCENT = "#8ec5ff"


def _poly(points: list[tuple[float, float]]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def glyph(pid: str) -> str:
    """A centred glyph in a 200x200 box (centre 100,100, radius about 46)."""
    if pid == "deep-portfolio-constructor":  # network layers feeding one long-short book
        layers = [(58, [64, 88, 112, 136]), (100, [76, 100, 124]), (142, [100])]
        edges, nodes = [], []
        for (x0, ys0), (x1, ys1) in zip(layers, layers[1:]):
            for y0 in ys0:
                for y1 in ys1:
                    edges.append(f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{INK}" stroke-opacity="0.32" stroke-width="1.3"/>')
        for i, (x, ys) in enumerate(layers):
            for y in ys:
                fill = ACCENT if i == len(layers) - 1 else "#000"
                nodes.append(f'<circle cx="{x}" cy="{y}" r="{6 if i < 2 else 10}" fill="{fill}" stroke="{INK}" stroke-width="2"/>')
        return "".join(edges + nodes)
    if pid == "tsfm":  # a series that continues as a forecast fan
        pts = [(52 + i * 5, 104 - 16 * math.sin(i / 2.3)) for i in range(11)]
        x0, y0 = pts[-1]
        return (f'<path d="M{x0:.1f} {y0:.1f} L150 {y0 - 26:.1f} L150 {y0 + 26:.1f} Z" fill="{ACCENT}" fill-opacity="0.22"/>'
                f'<polyline points="{_poly(pts)}" fill="none" stroke="{INK}" stroke-width="3"/>'
                f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="150" y2="{y0:.1f}" stroke="{ACCENT}" stroke-width="3" stroke-dasharray="6 5"/>')
    if pid == "world-shock-lab":  # a globe with a ripple
        return (f'<circle cx="96" cy="104" r="38" fill="none" stroke="{INK}" stroke-width="3"/>'
                f'<ellipse cx="96" cy="104" rx="16" ry="38" fill="none" stroke="{INK}" stroke-opacity="0.5" stroke-width="2"/>'
                f'<line x1="58" y1="104" x2="134" y2="104" stroke="{INK}" stroke-opacity="0.5" stroke-width="2"/>'
                f'<circle cx="118" cy="84" r="5" fill="{ACCENT}"/>'
                f'<circle cx="118" cy="84" r="14" fill="none" stroke="{ACCENT}" stroke-width="2"/>'
                f'<circle cx="118" cy="84" r="24" fill="none" stroke="{ACCENT}" stroke-opacity="0.5" stroke-width="1.5"/>')
    if pid == "pension-lab":  # a plan's funded ratio fanning out over the years, against the line it has to reach
        top = [(52 + i * 9.6, 118 - i * 5.4 - 1.2 * math.sin(i * 1.3)) for i in range(11)]
        low = [(52 + i * 9.6, 118 + i * 2.6 + 1.2 * math.sin(i * 1.7)) for i in range(11)]
        mid = [(52 + i * 9.6, 118 - i * 2.2) for i in range(11)]
        return (f'<polygon points="{_poly(top + low[::-1])}" fill="{ACCENT}" fill-opacity="0.2"/>'
                f'<line x1="48" y1="90" x2="152" y2="90" stroke="{INK}" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="5 5"/>'
                f'<polyline points="{_poly(mid)}" fill="none" stroke="{INK}" stroke-width="3"/>'
                f'<circle cx="52" cy="118" r="5" fill="{ACCENT}"/>')
    if pid == "aurvane":  # a shield with a check: signed, bounded actions
        return (f'<path d="M100 54 L136 68 V98 C136 122 120 140 100 148 C80 140 64 122 64 98 V68 Z" fill="none" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M84 100 L97 113 L119 89" fill="none" stroke="{ACCENT}" stroke-width="4" stroke-linecap="square"/>')
    return f'<circle cx="100" cy="100" r="22" fill="none" stroke="{INK}" stroke-width="3"/>'


def mark(pid: str, title: str) -> str:
    grid = "".join(
        f'<line x1="{v}" y1="8" x2="{v}" y2="192"/><line x1="8" y1="{v}" x2="192" y2="{v}"/>' for v in range(33, 192, 25)
    )
    ticks = (f'<path d="M8 26 V8 H26 M174 8 H192 V26 M192 174 V192 H174 M26 192 H8 V174" fill="none" '
             f'stroke="{ACCENT}" stroke-width="2"/>')
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Project mark: {title}">
  <rect width="200" height="200" fill="#000"/>
  <g stroke="{INK}" stroke-opacity="0.07" stroke-width="1">{grid}</g>
  <rect x="8" y="8" width="184" height="184" fill="none" stroke="{INK}" stroke-opacity="0.22" stroke-width="1.5"/>
  {ticks}
  {glyph(pid)}
</svg>
"""


def main() -> None:
    data = json.loads((ROOT / "data" / "projects.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for p in data["projects"]:
        (OUT / f"{p['id']}.svg").write_text(mark(p["id"], p["title"]))
        print(OUT.relative_to(ROOT) / f"{p['id']}.svg")


if __name__ == "__main__":
    main()
