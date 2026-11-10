#!/usr/bin/env python3
"""Draw the share images (1200x630) for the home page, Aurvane, the Deep Portfolio Constructor and the Pension Lab in the site's own system.

Run:  python3 scripts/make_og.py      (needs Playwright's Chromium)
Out:  assets/og.png, aurvane/media/og-aurvane.png, assets/og-dpc.png, assets/og-pension.png

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
dpc = DATA["deep-portfolio-constructor"]["stats"]
pen = DATA["pension-lab"]["stats"]
TAGLINE = json.loads((ROOT / "data" / "projects.json").read_text())["tagline"]
TITLES = [g["title"] for g in json.loads((ROOT / "data" / "projects.json").read_text())["groups"]]   # the three projects (scripts/groups.py)
COUNT = {3: "Three", 4: "Four", 5: "Five", 6: "Six"}.get(len(TITLES), str(len(TITLES)))
CARDS = {
    ROOT / "assets" / "og.png": f"""
      <div class="rule"></div><p class="label">Long-term investing · deep learning · AI agents</p>
      <h1>Sherif Morsi</h1>
      <p class="lede">{TAGLINE}</p>
      <p class="dim">{COUNT} projects, every figure traced to a result file, every test fixed before it was run.</p>
      <p class="foot">{"".join(f"<span>{t}</span>" for t in TITLES)}</p>""",
    ROOT / "assets" / "og-dpc.png": f"""
      <div class="rule"></div><p class="label accent">Deep Portfolio Constructor · deep learning for long-term wealth</p>
      <p class="fig">$1 &rarr; {dpc["wealthDeep"]["display"]}</p>
      <p class="lede">A neural network's long-only portfolio, January 1960 to today. The market: {dpc["wealthMarket"]["display"]}.</p>
      <p class="dim">Trained on the growth of wealth after costs. Against the market, {dpc["vsMktDeep"]["display"]} a year: {dpc["vsMktVerdictDeep"]["display"]}, by the pre-registered test.</p>
      <p class="foot"><span>Out of sample from 1960</span><span>{dpc["industries"]["display"]} US industries</span><span>Every figure traced</span></p>""",
    ROOT / "assets" / "og-pension.png": f"""
      <div class="rule"></div><p class="label accent">Pension Lab · what a pension promise costs to keep</p>
      <p class="fig">{pen["costLearned"]["display"]} <span style="color:#8e8e93">vs</span> {pen["costGlide"]["display"]}</p>
      <p class="lede">What a {pen["fundedStart"]["display"]}-funded plan costs its sponsor over 20 years, per $100 promised: a learned policy against a glide path.</p>
      <p class="dim">{pen["scenarios"]["display"]} simulated futures: {pen["vsGlideVerdict"]["display"]}. {pen["starts"]["display"]} real 20-year periods: {pen["histVerdict"]["display"]}. Rules fixed before the test.</p>
      <p class="foot"><span>Pre-registered</span><span>Inflation-indexed liabilities</span><span>Every figure traced</span></p>""",
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
