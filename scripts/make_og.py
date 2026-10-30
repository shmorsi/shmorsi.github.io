#!/usr/bin/env python3
"""Draw the share images (1200x630) for the home page and Aurvane in the site's own system.

Run:  python3 scripts/make_og.py      (needs Playwright's Chromium)
Out:  assets/og.png, aurvane/media/og-aurvane.png

Figures come from data/projects.json, so a share card never says something the page does not.
"""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CHROME = "/opt/pw-browsers/chromium"  # a preinstalled Chromium, when there is one; Playwright's own otherwise
# Inlined, because a page set from a string cannot load a file:// font.
FONT = "data:font/woff2;base64," + base64.b64encode((ROOT / "assets" / "fonts" / "inter-tight-latin.woff2").read_bytes()).decode()
DATA = {p["id"]: p for p in json.loads((ROOT / "data" / "projects.json").read_text())["projects"]}

STYLE = f"""
@font-face {{ font-family: "Inter Tight"; src: url("{FONT}") format("woff2"); font-weight: 100 900; }}
* {{ margin: 0; box-sizing: border-box; }}
body {{ width: 1200px; height: 630px; background: #000; color: #f5f5f7; font-family: "Inter Tight", Arial, sans-serif;
        padding: 72px; display: flex; flex-direction: column; border-top: 5px solid #8ec5ff; }}
.rule {{ width: 56px; height: 2px; background: #8ec5ff; margin-bottom: 26px; }}
.label {{ font-size: 21px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #a8a8ad; }}
.label.accent {{ color: #8ec5ff; }}
h1 {{ font-size: 92px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1; margin-top: 44px; }}
.fig {{ font-size: 104px; font-weight: 500; line-height: 1; margin-top: 30px; }}
.lede {{ font-size: 30px; color: #f5f5f7; margin-top: 22px; }}
.dim {{ font-size: 23px; color: #8e8e93; margin-top: 12px; }}
.foot {{ margin-top: auto; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.18);
         font-size: 22px; color: #a8a8ad; display: flex; gap: 14px; }}
.foot span + span::before {{ content: "·"; margin-right: 14px; color: #636366; }}
"""

aurvane = DATA["aurvane"]["stats"]
CARDS = {
    ROOT / "assets" / "og.png": f"""
      <div class="rule"></div><p class="label">Sherif Morsi</p>
      <h1>AI engineer</h1>
      <p class="lede">Agent systems and models, built from scratch.</p>
      <p class="dim">Agents that hand work to each other in messages code can check.</p>
      <p class="foot"><span>Aurvane</span><span>Orbit</span><span>Time-series foundation model</span><span>World Shock Lab</span><span>ATLAS</span></p>""",
    ROOT / "aurvane" / "media" / "og-aurvane.png": f"""
      <div class="rule"></div><p class="label accent">Aurvane · agent security</p>
      <p class="fig">{aurvane["attacksWith"]["display"]}</p>
      <p class="lede">Attacks that landed with Aurvane. Without it, {aurvane["attacksWithout"]["display"]}.</p>
      <p class="dim">Simulated worst-case agent, 60 paired tasks. Signed mandates, four rules on every action.</p>
      <p class="foot"><span>Every agent action: signed, bounded, visible</span></p>""",
}

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME if os.path.exists(CHROME) else None)
    page = browser.new_page(viewport={"width": 1200, "height": 630})
    for out, body in CARDS.items():
        page.set_content(f"<!doctype html><style>{STYLE}</style><body>{body}</body>")
        page.evaluate("document.fonts.ready")
        assert page.evaluate("document.fonts.check('20px \"Inter Tight\"')"), "Inter Tight did not load"
        page.wait_for_timeout(200)
        page.screenshot(path=str(out))
        print(f"wrote {out.relative_to(ROOT)}")
    browser.close()
