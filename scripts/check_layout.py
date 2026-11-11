#!/usr/bin/env python3
"""Fail if a chapter of the master page does not fit the screen it is pinned to.

Each chapter of the master page holds the screen while its four steps play out with the
scroll. Everything in it therefore has to fit one screen: on a small laptop the last
paragraph and the button used to run off the bottom, and on a phone the picture's labels
printed over the chapter title. This script opens the built page in a real browser at the
sizes people actually use, scrolls to the middle of every step of every chapter, and checks:

  1. the words fit: label, title, step text and the "Open the project" button are all on
     screen, in order, and none overlaps the next;
  2. the picture and the words do not overlap (one column: the picture ends above the
     label; two columns: the columns do not cross, and the picture is fully on screen);
  3. the picture is not squeezed to nothing (it keeps a useful share of the screen);
  4. no page scrolls sideways.

A screen too short to hold a chapter gets the plain layout (nothing pinned); there the
script checks only that the page does not scroll sideways and the steps are all visible.

Run:  pip install playwright && python -m playwright install chromium
      python3 scripts/check_layout.py            # every size
      python3 scripts/check_layout.py 390x664    # one size, with the numbers
Set CHROMIUM to use a browser that is already installed.
"""

from __future__ import annotations

import functools
import http.server
import os
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

# (width, height, what it is). Heights are the page's visible height: the screen minus the
# browser's own bars.
SIZES = [
    (360, 640, "small Android phone"),
    (375, 553, "iPhone SE, Safari bars shown"),
    (390, 664, "iPhone 13, Safari bars shown"),
    (390, 750, "iPhone 13, bars hidden"),
    (430, 740, "large phone"),
    (844, 390, "phone on its side"),
    (768, 1024, "tablet, upright"),
    (1024, 700, "tablet on its side / small window"),
    (1280, 577, "1280x720 laptop"),
    (1366, 625, "1366x768 laptop"),
    (1536, 730, "1080p laptop at 125% zoom"),
    (1440, 900, "desktop"),
    (1920, 950, "1080p desktop"),
    (2560, 1300, "large desktop"),
]
OTHER_PAGES = ["projects/deep-portfolio-constructor.html", "projects/pension-lab.html",
               "projects/world-shock-lab.html", "projects/tsfm.html", "aurvane/"]
TOL = 2.0          # pixels of slack for rounding
MIN_PICTURE = 0.17  # the picture keeps at least this share of the screen's height

MEASURE = """
(idx) => {
  const st = [...document.querySelectorAll('[data-story]')][idx];
  const r = (el) => { const b = el.getBoundingClientRect(); return {t: b.top, b: b.bottom, l: b.left, r: b.right, w: b.width, h: b.height}; };
  const stage = st.querySelector('.story-stage');
  const svg = st.querySelector('.scene');
  const keep = svg.style.transform; svg.style.transform = 'none';
  const sb = r(svg); svg.style.transform = keep;
  const vb = svg.getAttribute('viewBox').split(/\\s+/).map(Number);
  const scale = Math.min(sb.w / vb[2], sb.h / vb[3]);
  // The drawing is fitted inside the svg's box, centred; its own box is what must clear the words.
  const drawn = {t: sb.t + (sb.h - scale * vb[3]) / 2, b: sb.b - (sb.h - scale * vb[3]) / 2,
                 l: sb.l + (sb.w - scale * vb[2]) / 2, r: sb.r - (sb.w - scale * vb[2]) / 2, h: scale * vb[3]};
  const steps = [...st.querySelectorAll('.st-step')];
  const shown = steps.map((e) => Number(getComputedStyle(e).opacity));
  const active = shown.indexOf(Math.max(...shown));
  const text = steps[active].querySelector('.st-text');
  const lead = st.querySelector('.st-lead');
  const tabs = st.querySelector('.st-tabs');
  const vis = (el) => el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
  return {
    pinned: getComputedStyle(stage).position === 'sticky',
    cols: getComputedStyle(stage).gridTemplateColumns.trim().split(/\\s+/).length,
    vh: innerHeight, vw: innerWidth,
    overflowX: document.documentElement.scrollWidth - innerWidth,
    stage: r(stage), drawn, svg: sb,
    label: r(st.querySelector('.st-copy .label')), title: r(st.querySelector('.st-title')),
    lead: vis(lead) ? r(lead) : null, tabs: vis(tabs) ? r(tabs) : null,
    head: r(steps[active].querySelector('.st-head')), text: r(text),
    foot: r(st.querySelector('.st-foot .button')),
    active, opacity: shown[active], font: parseFloat(getComputedStyle(text).fontSize),
    name: st.dataset.story, n: steps.length,
  };
}
"""


def serve() -> tuple[http.server.ThreadingHTTPServer, str]:
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args: object) -> None:  # the request log is noise here
            pass

    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def check_step(m: dict, verbose: bool) -> list[str]:
    """The problems on one step of one chapter, as short sentences."""
    out: list[str] = []
    vh = m["vh"]
    chain = [("label", m["label"]), ("title", m["title"])]
    if m["lead"]:
        chain.append(("intro line", m["lead"]))
    if m["tabs"]:
        chain.append(("step buttons", m["tabs"]))
    chain += [("step heading", m["head"]), ("step text", m["text"]), ("button", m["foot"])]
    if chain[0][1]["t"] < -TOL:
        out.append(f"the label starts {-chain[0][1]['t']:.0f}px above the screen")
    for (an, a), (bn, b) in zip(chain, chain[1:]):
        if a["b"] > b["t"] + TOL:
            out.append(f"the {an} overlaps the {bn} by {a['b'] - b['t']:.0f}px")
    if m["foot"]["b"] > vh + TOL:
        out.append(f"the button ends {m['foot']['b'] - vh:.0f}px below the screen")
    if m["text"]["b"] > vh + TOL:
        out.append(f"the step text ends {m['text']['b'] - vh:.0f}px below the screen")
    d = m["drawn"]
    if m["cols"] == 1:
        if d["b"] > m["label"]["t"] + TOL:
            out.append(f"the picture runs {d['b'] - m['label']['t']:.0f}px into the words under it")
    else:
        words_right = max(m["title"]["r"], m["text"]["r"], m["label"]["r"])
        if d["l"] < words_right - TOL:
            out.append(f"the picture crosses the words by {words_right - d['l']:.0f}px")
        if d["t"] < -TOL or d["b"] > vh + TOL:
            out.append(f"the picture is cut off (top {d['t']:.0f}, bottom {d['b']:.0f} on a {vh}px screen)")
    if d["h"] < MIN_PICTURE * vh:
        out.append(f"the picture is only {d['h']:.0f}px tall ({100 * d['h'] / vh:.0f}% of the screen)")
    if m["opacity"] < 0.99:
        out.append(f"step {m['active'] + 1} is not fully shown (opacity {m['opacity']:.2f})")
    if verbose:
        print(f"      {m['name']:<28} step {m['active'] + 1}: text {m['font']:.1f}px, picture {d['h']:.0f}px "
              f"({100 * d['h'] / vh:.0f}%), button ends {vh - m['foot']['b']:.0f}px above the bottom")
    return out


def run(only: list[str]) -> int:
    server, base = serve()
    sizes = [s for s in SIZES if not only or f"{s[0]}x{s[1]}" in only]
    problems: list[str] = []
    with sync_playwright() as p:
        launch = {"args": ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]}
        if os.environ.get("CHROMIUM"):
            launch["executable_path"] = os.environ["CHROMIUM"]
        browser = p.chromium.launch(**launch)
        for w, h, what in sizes:
            ctx = browser.new_context(viewport={"width": w, "height": h}, is_mobile=w < 900, has_touch=w < 900)
            page = ctx.new_page()
            page.goto(f"{base}/", wait_until="load")
            page.wait_for_timeout(900)
            stories = page.evaluate("""() => [...document.querySelectorAll('[data-story]')].map((s) => {
                const b = s.getBoundingClientRect(); return {top: b.top + scrollY, h: b.height, n: s.querySelectorAll('.st-step').length}; })""")
            here: list[str] = []
            pinned = None
            for i, s in enumerate(stories):
                for k in range(s["n"]):
                    y = s["top"] + (s["h"] - h) * ((k + 0.6) / s["n"])
                    page.evaluate("(y) => window.scrollTo(0, y)", y)
                    page.wait_for_timeout(260)
                    m = page.evaluate(MEASURE, i)
                    pinned = m["pinned"]
                    if not pinned:
                        break
                    if m["active"] != k:
                        here.append(f"{m['name']}: asked for step {k + 1}, the page shows step {m['active'] + 1}")
                    here += [f"{m['name']} step {k + 1}: {x}" for x in check_step(m, bool(only))]
                if pinned is False:
                    break
            if pinned is False:  # the plain layout: everything in the flow, nothing to fit
                page.evaluate("() => window.scrollTo(0, 0)")
                hidden = page.evaluate("""() => [...document.querySelectorAll('.st-step')].filter((e) => Number(getComputedStyle(e).opacity) < 0.99 || e.getBoundingClientRect().height < 8).length""")
                if hidden:
                    here.append(f"plain layout: {hidden} steps are hidden")
            over = page.evaluate("() => document.documentElement.scrollWidth - innerWidth")
            if over > 1:
                here.append(f"the master page scrolls sideways by {over}px")
            if w in (360, 1366):  # the other pages, at the narrowest phone and the smallest laptop
                for url in OTHER_PAGES:
                    page.goto(f"{base}/{url}", wait_until="load")
                    page.wait_for_timeout(500)
                    over = page.evaluate("() => document.documentElement.scrollWidth - innerWidth")
                    if over > 1:
                        here.append(f"{url} scrolls sideways by {over}px")
            state = "pinned" if pinned else "plain layout"
            print(f"{'FAIL' if here else 'ok  '} {w}x{h}  {what} ({state})")
            for line in here:
                print(f"       {line}")
            problems += [f"{w}x{h}: {line}" for line in here]
            ctx.close()
        browser.close()
    server.shutdown()
    if problems:
        print(f"\n{len(problems)} layout problem(s)", file=sys.stderr)
        return 1
    print(f"ok: every chapter fits at {len(sizes)} screen sizes")
    return 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))
