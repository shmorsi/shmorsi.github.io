#!/usr/bin/env python3
"""Draw one mission patch per project as an SVG: assets/patches/<id>.svg.

Original artwork in the site's own system: a ring with the mission code and
number set on a circular path, a thin inner ring, and one simple glyph per
project. Monochrome strokes plus the site's ice-blue accent, so the patches
read on black and on white. Run after adding a project to data/projects.json.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "patches"
INK = "#f5f5f7"
ACCENT = "#8ec5ff"


def _poly(points: list[tuple[float, float]]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def glyph(pid: str) -> str:
    """A centred glyph in a 200x200 box (centre 100,100, radius ~40)."""
    if pid == "aurvane":  # a shield with a check: signed, bounded actions
        return (f'<path d="M100 58 L132 70 V98 C132 120 118 136 100 144 C82 136 68 120 68 98 V70 Z" fill="none" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M86 100 L97 111 L117 89" fill="none" stroke="{ACCENT}" stroke-width="4" stroke-linecap="square"/>')
    if pid == "deep-portfolio-constructor":  # three network layers feeding one portfolio node
        layers = [(64, [72, 92, 112, 132]), (100, [80, 100, 120]), (136, [100])]
        edges, nodes = [], []
        for (x0, ys0), (x1, ys1) in zip(layers, layers[1:]):
            for y0 in ys0:
                for y1 in ys1:
                    edges.append(f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" stroke="{INK}" stroke-opacity="0.35" stroke-width="1.2"/>')
        for i, (x, ys) in enumerate(layers):
            for y in ys:
                fill = ACCENT if i == len(layers) - 1 else "#000"
                nodes.append(f'<circle cx="{x}" cy="{y}" r="{6 if i < 2 else 9}" fill="{fill}" stroke="{INK}" stroke-width="2"/>')
        return "".join(edges + nodes)
    if pid == "orbit":  # a planet with two crossing orbits and a satellite
        return (f'<circle cx="100" cy="100" r="14" fill="none" stroke="{INK}" stroke-width="3"/>'
                f'<ellipse cx="100" cy="100" rx="40" ry="16" fill="none" stroke="{INK}" stroke-width="2" transform="rotate(-25 100 100)"/>'
                f'<ellipse cx="100" cy="100" rx="40" ry="16" fill="none" stroke="{INK}" stroke-opacity="0.5" stroke-width="2" transform="rotate(35 100 100)"/>'
                f'<circle cx="136" cy="83" r="5" fill="{ACCENT}"/>')
    if pid == "tsfm":  # a series that continues as a forecast fan
        pts = [(60 + i * 4, 100 - 14 * math.sin(i / 2.2)) for i in range(11)]
        hist = _poly(pts)
        x0, y0 = pts[-1]
        return (f'<polyline points="{hist}" fill="none" stroke="{INK}" stroke-width="3"/>'
                f'<path d="M{x0:.1f} {y0:.1f} L142 {y0 - 22:.1f} L142 {y0 + 22:.1f} Z" fill="{ACCENT}" fill-opacity="0.25" stroke="none"/>'
                f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="142" y2="{y0:.1f}" stroke="{ACCENT}" stroke-width="3" stroke-dasharray="5 4"/>')
    if pid == "world-shock-lab":  # a globe with a ripple
        return (f'<circle cx="100" cy="100" r="34" fill="none" stroke="{INK}" stroke-width="3"/>'
                f'<ellipse cx="100" cy="100" rx="14" ry="34" fill="none" stroke="{INK}" stroke-opacity="0.5" stroke-width="2"/>'
                f'<line x1="66" y1="100" x2="134" y2="100" stroke="{INK}" stroke-opacity="0.5" stroke-width="2"/>'
                f'<circle cx="118" cy="84" r="5" fill="{ACCENT}"/>'
                f'<circle cx="118" cy="84" r="13" fill="none" stroke="{ACCENT}" stroke-width="2"/>'
                f'<circle cx="118" cy="84" r="21" fill="none" stroke="{ACCENT}" stroke-opacity="0.5" stroke-width="1.5"/>')
    if pid == "atlas":  # a production network
        pts = [(70, 78), (104, 66), (132, 90), (122, 128), (84, 132), (98, 100)]
        edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0), (5, 0), (5, 2), (5, 3), (5, 1)]
        lines = "".join(f'<line x1="{pts[a][0]}" y1="{pts[a][1]}" x2="{pts[b][0]}" y2="{pts[b][1]}" stroke="{INK}" stroke-opacity="0.5" stroke-width="2"/>' for a, b in edges)
        dots = "".join(f'<circle cx="{x}" cy="{y}" r="{7 if i == 5 else 5}" fill="{ACCENT if i == 5 else "#000"}" stroke="{INK}" stroke-width="2"/>' for i, (x, y) in enumerate(pts))
        return lines + dots
    return f'<circle cx="100" cy="100" r="20" fill="none" stroke="{INK}" stroke-width="3"/>'


def short_code(code: str) -> str:
    """Long names do not fit on the ring: 'World Shock Lab' -> 'WSL'."""
    return code.upper() if len(code) <= 8 else "".join(w[0] for w in code.split()).upper()


def patch(pid: str, code: str, mission: str, title: str) -> str:
    top = f"MISSION {mission} · {short_code(code)}"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Mission patch: {title}">
  <defs>
    <path id="ring-top-{pid}" d="M 28 100 A 72 72 0 0 1 172 100"/>
    <path id="ring-bot-{pid}" d="M 34 100 A 66 66 0 0 0 166 100"/>
  </defs>
  <circle cx="100" cy="100" r="96" fill="#000"/>
  <circle cx="100" cy="100" r="96" fill="none" stroke="{INK}" stroke-width="2"/>
  <circle cx="100" cy="100" r="84" fill="none" stroke="{ACCENT}" stroke-width="1.5"/>
  <circle cx="100" cy="100" r="58" fill="none" stroke="{INK}" stroke-opacity="0.25" stroke-width="1"/>
  <text font-family="Inter Tight, Helvetica Neue, Arial, sans-serif" font-size="11.5" font-weight="600" letter-spacing="3.2" fill="{INK}" text-anchor="middle">
    <textPath href="#ring-top-{pid}" startOffset="50%">{top}</textPath>
  </text>
  <text font-family="Inter Tight, Helvetica Neue, Arial, sans-serif" font-size="9" font-weight="500" letter-spacing="2.6" fill="{INK}" fill-opacity="0.7" text-anchor="middle">
    <textPath href="#ring-bot-{pid}" startOffset="50%">SHERIF MORSI</textPath>
  </text>
  {glyph(pid)}
</svg>
"""


def main() -> None:
    data = json.loads((ROOT / "data" / "projects.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for p in data["projects"]:
        (OUT / f"{p['id']}.svg").write_text(patch(p["id"], p.get("code", p["id"][:4].upper()), p.get("mission", "00"), p["title"]))
        print(OUT / f"{p['id']}.svg")


if __name__ == "__main__":
    main()
