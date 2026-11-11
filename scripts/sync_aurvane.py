#!/usr/bin/env python3
"""Bring Aurvane's page into the site.

Input: the aurvane repository's ui/site/index.html, built there by `python ui/build.py`: the
demo (its sections, styles, scripts and the data baked in from its bench/results/) inside this
site's project-page layout. Output: aurvane/index.html.

The page is not copied byte for byte. What every project page shares is written by this site:
the header, the footer, the project label, the "In plain English" panel, the picture beside
the title and the previous / next links (scripts/sync_chrome.py, dress()). So a change to the
site's header or to another project reaches this page without a new build of Aurvane, and the
page cannot arrive looking different from the others. Run:
    python3 scripts/sync_aurvane.py ../aurvane/ui/site/index.html
then check_site.py.
"""

from __future__ import annotations

import sys
from pathlib import Path

import sync_chrome

ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "aurvane" / "index.html"
NEEDS = ('href="../assets/site.css"', 'src="../assets/site.js"', '<header class="cs-hero', 'data-subnav', 'id="roomBox"')


def main(src: str) -> None:
    source = Path(src)
    if not source.is_file():
        raise SystemExit(f"{source} is missing: run `python ui/build.py` in aurvane and commit ui/site/index.html")
    html = source.read_text(encoding="utf-8")
    missing = [n for n in NEEDS if n not in html]
    if missing:
        raise SystemExit(f"{source} is not the page built for this site (missing {', '.join(missing)}). "
                         "Point this at ui/site/index.html, not at the self-contained ui/index.html.")
    dressed = sync_chrome.dress(html, "../", "aurvane/", False)
    if PAGE.is_file() and PAGE.read_text(encoding="utf-8") == dressed:
        print("aurvane/index.html: no change")
        return
    PAGE.parent.mkdir(parents=True, exist_ok=True)
    PAGE.write_text(dressed, encoding="utf-8")
    print(f"aurvane/index.html: updated ({len(dressed) // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT.parent / "aurvane" / "ui" / "site" / "index.html"))
