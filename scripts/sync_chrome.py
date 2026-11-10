#!/usr/bin/env python3
"""Keep the header, footer, project header and private-repo links identical on every page.

* Rewrites the <header class="site-header"> and <footer class="site-footer">
  blocks of the master page and every project page on this site.
* On project pages, writes the project label (mark, number, kicker, status),
  the section index slot, and the previous / next project links, in the order
  of data/projects.json.
* Replaces links to repositories that visitors cannot open (data/projects.json
  links with "public": false) with a plain "Code: private repository" note, so
  the site never shows a dead GitHub link. Flip the flag to true and re-run
  when a repository goes public.

aurvane/index.html is built in the aurvane repository and is left untouched.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import plain  # scripts/plain.py: each project in plain English

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
PROJECTS = {p["id"]: p for p in DATA["projects"]}
ORDER = [p["id"] for p in DATA["projects"]]

PATH_OF = {  # each project's own page, from the site root
    "deep-portfolio-constructor": "projects/deep-portfolio-constructor.html",
    "tsfm": "projects/tsfm.html",
    "world-shock-lab": "projects/world-shock-lab.html",
    "aurvane": "aurvane/",
}
SHORT = {"deep-portfolio-constructor": "Portfolio", "tsfm": "TSFM", "world-shock-lab": "Shock Lab", "aurvane": "Aurvane"}
STATUS = {"deep-portfolio-constructor": "Pre-registered", "tsfm": "Test scored", "world-shock-lab": "Live", "aurvane": "Simulated"}
HOME_NAV = [("Work", "#work"), ("Approach", "#approach"), ("Experience", "#experience"), ("Contact", "#contact")]
RESUME = "resume/Sherif_Morsi_Resume.pdf"
TOGGLE = ('<button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch theme"><svg viewBox="0 0 20 20" aria-hidden="true">'
          '<circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 2.75a7.25 7.25 0 0 1 0 14.5Z" fill="currentColor"/></svg></button>')
MENU = '<button class="menu-button" type="button" aria-expanded="false" aria-controls="site-nav" data-menu-button>Menu</button>'
THEME_SCRIPT = '<script>try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>'


def header(prefix: str, current: str | None, home: bool) -> str:
    if home:
        items = [f'<a href="{href}" data-section="{href[1:]}">{label}</a>' for label, href in HOME_NAV]
    else:
        items = [f'<a href="{prefix}#work">Work</a>']
        for pid in ORDER:
            path = PATH_OF[pid]
            cur = ' aria-current="page"' if path == current else ""
            items.append(f'<a href="{prefix}{path}"{cur}>{SHORT[pid]}</a>')
    items.append(f'<a class="nav-resume" href="{prefix}{RESUME}">Resume</a>')
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
      <a href="{prefix}#work">All projects</a>
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


def project_switch(pid: str) -> str:
    i = ORDER.index(pid)
    prev_id, next_id = ORDER[i - 1], ORDER[(i + 1) % len(ORDER)]
    title = lambda x: PROJECTS[x]["title"]  # noqa: E731
    num = lambda x: PROJECTS[x]["number"]  # noqa: E731
    return (f'<nav class="project-switch" aria-label="Other projects">\n'
            f'        <a href="../{PATH_OF[prev_id]}"><span class="label">Previous · {num(prev_id)}</span><strong>{title(prev_id)}</strong></a>\n'
            f'        <a href="../{PATH_OF[next_id]}"><span class="label">Next · {num(next_id)}</span><strong>{title(next_id)}</strong></a>\n'
            f'      </nav>')


def projectize(html: str, pid: str) -> str:
    """Mark and project label in the hero, the section index, and previous/next projects."""
    p = PROJECTS[pid]
    live = " is-live" if pid == "world-shock-lab" else ""
    meta = (f'<a class="text-link all-link" href="../#work">All projects</a>\n'
            f'      <div class="project-meta">\n'
            f'        <img class="mark" src="../assets/marks/{pid}.svg" alt="" width="72" height="72">\n'
            f'        <p class="label"><span class="num">{p["number"]}</span> {p["kicker"]} · <span class="status{live}">{STATUS[pid]}</span></p>\n'
            f'      </div>')
    html, n = re.subn(r'<a class="text-link (?:back|all-link)[^"]*" href="[^"]*">[^<]*</a>\s*'
                      r'(?:<p class="label">[^<]*</p>|<div class="(?:mission|project)-meta">.*?</div>)',
                      lambda m: meta, html, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"{pid}: could not find the project label block")
    # The "In plain English" panel sits right under the page title, from scripts/plain.py.
    html = re.sub(r'\s*<section class="plain" data-plain.*?</section>', "", html, count=1, flags=re.S)
    if pid in plain.PLAIN:
        start = html.index('<header class="cs-hero')
        h1 = html.index("</h1>", start) + len("</h1>")
        html = html[:h1] + "\n      " + plain.panel(pid, p["stats"]) + html[h1:]
    if "data-subnav" not in html:
        start = html.index('<header class="cs-hero')
        end = html.index("</header>", start) + len("</header>")
        html = html[:end] + '\n\n    <nav class="subnav" data-subnav aria-label="On this page"></nav>' + html[end:]
    html, n = re.subn(r'<nav class="(?:next-project|mission-switch|project-switch)".*?</nav>', lambda m: project_switch(pid),
                      html, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"{pid}: could not find the previous / next block")
    return html


PAGES = {"index.html": ("", None, True)}  # page -> (prefix to the site root, its own path, is the master page)
PAGES.update({path: ("../", path, False) for pid, path in PATH_OF.items() if path.endswith(".html")})


def main() -> None:
    for rel, (prefix, current, home) in PAGES.items():
        path = ROOT / rel
        if not path.exists():
            raise SystemExit(f"missing page {rel}")
        html = path.read_text(encoding="utf-8")
        html = re.sub(r'<header class="site-header">.*?</header>', header(prefix, current, home), html, count=1, flags=re.S)
        html = re.sub(r'<footer class="site-footer">.*?</footer>', footer(prefix), html, count=1, flags=re.S)
        html = re.sub(r'\n[ \t]*<canvas class="stars"[^>]*></canvas>', "", html)  # the old star field
        html = re.sub(r'<script>try\{var t=localStorage\.getItem\("theme"\).*?</script>', THEME_SCRIPT, html, count=1)
        html = unlink_private(html)
        pid = next((p for p, own in PATH_OF.items() if own == current), None)
        if pid:
            html = projectize(html, pid)
        path.write_text(html, encoding="utf-8")
        print(f"synced {rel}")


if __name__ == "__main__":
    main()
