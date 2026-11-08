#!/usr/bin/env python3
"""Keep the header, footer and private-repo links identical on every page.

* Rewrites the <header class="site-header"> and <footer class="site-footer">
  blocks of the master page, the mission pages and the Orbit mission page.
* Replaces links to repositories that visitors cannot open (data/projects.json
  links with "public": false) with a plain "Code: private" note, so the site
  never shows a dead GitHub link. Flip the flag to true and re-run when a
  repository goes public.

aurvane/index.html is built in the aurvane repository and is left untouched.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())

MISSIONS = [  # (label, path from the site root)
    ("Aurvane", "aurvane/"),
    ("Portfolio", "projects/deep-portfolio-constructor.html"),
    ("Orbit", "orbit/"),
    ("TSFM", "projects/tsfm.html"),
    ("Shock Lab", "projects/world-shock-lab.html"),
    ("ATLAS", "projects/atlas.html"),
]
HOME_NAV = [("Missions", "#missions"), ("Capabilities", "#capabilities"), ("Method", "#method"),
            ("Record", "#record"), ("Contact", "#contact")]
RESUME = "resume/Sherif_Morsi_Resume.pdf"
TOGGLE = ('<button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch theme"><svg viewBox="0 0 20 20" aria-hidden="true">'
          '<circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 2.75a7.25 7.25 0 0 1 0 14.5Z" fill="currentColor"/></svg></button>')
MENU = '<button class="menu-button" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-button>Menu</button>'


def header(prefix: str, current: str | None, home: bool) -> str:
    if home:
        items = [f'<a href="{href}" data-section="{href[1:]}">{label}</a>' for label, href in HOME_NAV]
    else:
        items = [f'<a href="{prefix}#missions">Missions</a>']
        for label, path in MISSIONS:
            cur = ' aria-current="page"' if path == current else ""
            items.append(f'<a href="{prefix}{path}"{cur}>{label}</a>')
    items.append(f'<a href="{prefix}{RESUME}">Resume</a>')
    nav = "\n        ".join(items)
    return f"""<header class="site-header">
    <a class="wordmark" href="{prefix or './'}">Sherif Morsi</a>
    <div class="header-tools">
      <nav class="site-nav" id="site-nav" aria-label="Main" data-site-nav>
        {nav}
      </nav>
      {TOGGLE}
      {MENU}
    </div>
  </header>"""


def footer(prefix: str) -> str:
    return f"""<footer class="site-footer">
    <span>© 2026 Sherif Morsi, Montreal</span>
    <span>
      <a href="mailto:shmorsi@outlook.com">Email</a>
      <a href="https://github.com/shmorsi" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="https://www.linkedin.com/in/sherif-morsi-a17628295/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <a href="{prefix}{RESUME}">Resume</a>
      <a href="{prefix}#missions">Missions</a>
    </span>
  </footer>"""


def private_prefixes() -> list[str]:
    out = []
    for project in DATA["projects"]:
        for link in project.get("links", []):
            if link.get("public") is False and "github.com/" in link["href"]:
                out.append(link["href"].rstrip("/"))
    return out


NOTE = '<span class="code-note">Code: private repository</span>'


def unlink_private(html: str) -> str:
    """Links to a repository visitors cannot open never ship as dead links.

    Buttons and stand-alone text links become one quiet note per action row;
    a link inside a sentence keeps its words and says "(private)"."""
    for repo in private_prefixes():
        pattern = re.compile(r'<a\b([^>]*)href="' + re.escape(repo) + r'(?:/[^"]*)?"[^>]*>(.*?)</a>', re.S)

        def repl(m: re.Match) -> str:
            attrs, inner = m.group(1), m.group(2)
            if "button" in attrs or "text-link" in attrs:
                return NOTE
            return f"{re.sub(r'<[^>]+>', '', inner).strip()} (private)"

        html = pattern.sub(repl, html)
    # collapse repeated notes in one row into a single note
    html = re.sub(r'(' + re.escape(NOTE) + r')(?:\s*' + re.escape(NOTE) + r')+', r'\1', html)
    return html


ORDER = ["aurvane", "deep-portfolio-constructor", "orbit", "tsfm", "world-shock-lab", "atlas"]
PATH_OF = dict(zip(ORDER, [path for _, path in MISSIONS]))
TITLE_OF = {"aurvane": "Aurvane", "deep-portfolio-constructor": "Deep Portfolio Constructor", "orbit": "Orbit",
            "tsfm": "Time-series foundation model", "world-shock-lab": "World Shock Lab", "atlas": "ATLAS"}
STATUS = {"aurvane": "Simulated", "deep-portfolio-constructor": "Walk-forward", "orbit": "Scored once",
          "tsfm": "Test scored", "world-shock-lab": "Live", "atlas": "Local app"}
PROJECTS = {p["id"]: p for p in DATA["projects"]}


def mission_switch(pid: str) -> str:
    i = ORDER.index(pid)
    prev_id, next_id = ORDER[i - 1], ORDER[(i + 1) % len(ORDER)]
    num = lambda x: f"{ORDER.index(x) + 1:02d}"  # noqa: E731
    return (f'<nav class="mission-switch" aria-label="Other missions">\n'
            f'        <a href="../{PATH_OF[prev_id]}"><span class="label">Previous · Mission {num(prev_id)}</span><strong>{TITLE_OF[prev_id]}</strong></a>\n'
            f'        <a href="../{PATH_OF[next_id]}"><span class="label">Next · Mission {num(next_id)}</span><strong>{TITLE_OF[next_id]}</strong></a>\n'
            f'      </nav>')


def missionize(html: str, pid: str) -> str:
    """Patch + mission label in the hero, the section index, and previous/next missions."""
    p = PROJECTS[pid]
    live = " is-live" if pid == "world-shock-lab" else ""
    meta = (f'<a class="text-link back manifest-link" href="../#missions">Mission manifest</a>\n'
            f'      <div class="mission-meta">\n'
            f'        <img class="patch" src="../assets/patches/{pid}.svg" alt="" width="88" height="88">\n'
            f'        <p class="label">Mission {p["mission"]} · {p["kicker"]} · <span class="status{live}">{STATUS[pid]}</span></p>\n'
            f'      </div>')
    html = re.sub(r'<a class="text-link back[^"]*" href="[^"]*">[^<]*</a>\s*(?:<p class="label">[^<]*</p>|<div class="mission-meta">.*?</div>)',
                  lambda m: meta, html, count=1, flags=re.S)
    if 'data-subnav' not in html:
        start = html.index('<header class="cs-hero')
        end = html.index('</header>', start) + len('</header>')
        html = html[:end] + '\n\n    <nav class="subnav" data-subnav aria-label="On this page"></nav>' + html[end:]
    html = re.sub(r'<nav class="(?:next-project|mission-switch)".*?</nav>', lambda m: mission_switch(pid), html, count=1, flags=re.S)
    return html


PAGES = {  # page -> (prefix to the site root, current mission path, is the master page)
    "index.html": ("", None, True),
    "projects/deep-portfolio-constructor.html": ("../", "projects/deep-portfolio-constructor.html", False),
    "projects/tsfm.html": ("../", "projects/tsfm.html", False),
    "projects/world-shock-lab.html": ("../", "projects/world-shock-lab.html", False),
    "projects/atlas.html": ("../", "projects/atlas.html", False),
    "orbit/index.html": ("../", "orbit/", False),
}


def main() -> None:
    for rel, (prefix, current, home) in PAGES.items():
        path = ROOT / rel
        if not path.exists():
            print(f"skip {rel} (missing)")
            continue
        html = path.read_text(encoding="utf-8")
        html = re.sub(r'<header class="site-header">.*?</header>', header(prefix, current, home), html, count=1, flags=re.S)
        html = re.sub(r'<footer class="site-footer">.*?</footer>', footer(prefix), html, count=1, flags=re.S)
        html = unlink_private(html)
        mission = next((m for m, path in PATH_OF.items() if path == current), None)
        if mission and mission != "deep-portfolio-constructor":  # that page is generated in the new template
            html = missionize(html, mission)
        path.write_text(html, encoding="utf-8")
        print(f"synced {rel}")


if __name__ == "__main__":
    main()
