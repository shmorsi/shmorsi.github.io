#!/usr/bin/env python3
"""Draw assets/earth/limb.webp: the curve of the Earth at night, for the foot of every project page.

It is the home page's own Earth (NASA imagery, drawn by assets/home.js) at the opening shot, photographed
in a wide window with everything else hidden and the sky left transparent, then cropped to the band where
the Earth is. The project pages lay it along the bottom of the screen (assets/site.css), so the whole
site stands on the same planet.

Run:  python3 scripts/make_limb.py      (needs Playwright's Chromium; set CHROMIUM to use one already installed)
"""

from __future__ import annotations

import io
import os
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.dont_write_bytecode = True
from check_layout import serve  # noqa: E402  the same local server the layout check uses

HIDE = """
html, body { background: transparent !important; }
main, header, footer, .hud, .veil, .toast, .skip, canvas.globe + canvas.globe { visibility: hidden !important; }
"""
W, H = 2560, 1440


def main() -> None:
    server, base = serve()
    with sync_playwright() as p:
        launch = {"args": ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]}
        if os.environ.get("CHROMIUM"):
            launch["executable_path"] = os.environ["CHROMIUM"]
        browser = p.chromium.launch(**launch)
        page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1, reduced_motion="reduce")
        page.goto(f"{base}/", wait_until="networkidle")
        page.add_style_tag(content=HIDE)
        page.wait_for_timeout(6000)  # the pictures arrive; under reduced motion the Earth is drawn in its final place
        png = page.screenshot(omit_background=True)
        browser.close()
    server.shutdown()
    img = Image.open(io.BytesIO(png)).convert("RGBA")
    box = img.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()  # where the glow becomes the Earth's edge
    top = max(0, (box[1] if box else int(H * 0.55)) - 140)
    band = img.crop((0, top, W, H))
    # fade the top of the band, so the glow has no edge where the crop is
    alpha = band.getchannel("A")
    ramp = Image.linear_gradient("L").resize((W, 180))  # black to white, top to bottom
    top_part = Image.composite(alpha.crop((0, 0, W, 180)), Image.new("L", (W, 180), 0), ramp)
    alpha.paste(top_part, (0, 0))
    band.putalpha(alpha)
    out = ROOT / "assets" / "earth" / "limb.webp"
    band.save(out, "WEBP", quality=78, method=6)
    print(f"wrote {out.relative_to(ROOT)} ({band.size[0]}x{band.size[1]}, {out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
