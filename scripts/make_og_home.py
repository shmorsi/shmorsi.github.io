#!/usr/bin/env python3
"""Draw the home page's share image (assets/og.png, 1200x630) from the home page itself.

The card is the opening of index.html at 1200x630 once the camera has pulled back from Montréal: the
name, the line under it, and the curve of the Earth at night. The navigation, buttons and countdown are
hidden for the card. Nothing on it is typed here, so it never says something the page does not.

Run:  python3 scripts/make_og_home.py      (needs Playwright's Chromium; set CHROMIUM to use one already installed)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.dont_write_bytecode = True
from check_layout import serve  # noqa: E402  the same local server the layout check uses

CARD = """
.top-nav, .top .btn, .hero .actions, .hero .meta, .hero-foot, .hud, .skip { display: none !important; }
.hero { min-height: 630px; padding-top: 70px; }
.hero h1 { font-size: 112px; margin: 18px 0 20px; }
.lede { font-size: 27px; max-width: 26ch; }
"""


def main() -> None:
    server, base = serve()
    with sync_playwright() as p:
        launch = {"args": ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]}
        if os.environ.get("CHROMIUM"):
            launch["executable_path"] = os.environ["CHROMIUM"]
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        page.goto(f"{base}/", wait_until="networkidle")
        page.add_style_tag(content=CARD)
        page.wait_for_timeout(9000)  # the opening shot: from Montréal at night back to the curve of the Earth
        out = ROOT / "assets" / "og.png"
        page.screenshot(path=str(out))
        browser.close()
    server.shutdown()
    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
