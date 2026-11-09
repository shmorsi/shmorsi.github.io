#!/usr/bin/env python3
"""Fail if the portfolio states a title or claim it must not, or if a figure bind is broken."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
TEXT_PATHS = [
    *ROOT.glob("*.html"),
    *ROOT.glob("*.md"),
    *ROOT.glob("projects/*.html"),
    ROOT / "assets" / "site.js",
    ROOT / "data" / "projects.json",
]

FORBIDDEN = [
    r"software engineer",
    r"\bml engineer\b",
    r"machine learning engineer",
    r"full-stack engineer",
    r"research engineer",
    r"ai engineering",
    r"fluent in french",
    r"french \(fluent\)",
    r"\baws\b",
    r"amazon web services",
    r"\bjira\b",
    r"production deployment",
    r"deployed to production",
    r"beat a published",
    r"beats a published",
    r"beat timesfm",
    r"better than timesfm",
    r"outperformed",
    r"github\.com/shmorsi/shocklab\b",
]

errors: list[str] = []

if (ROOT / "world-shock-lab").exists():
    errors.append("world-shock-lab/ must not exist in this repo; the live site is served from the other repository")

projects = {project["id"]: project for project in DATA["projects"]}
if "macro-analyst-agent" in projects:
    errors.append("macro-analyst-agent must not be listed on the site")
if (ROOT / "projects" / "macro-analyst-agent.html").exists():
    errors.append("projects/macro-analyst-agent.html must not be served")

for project in DATA["projects"]:
    stats = project.get("stats") or {}
    for key, stat in stats.items():
        for field in ("label", "display", "source"):
            if not str(stat.get(field, "")).strip():
                errors.append(f"{project['id']}.stats.{key} is missing {field}")
    headline = project.get("headline") or {}
    if project.get("role") == "featured":
        if headline.get("stat") not in stats:
            errors.append(f"{project['id']} headline.stat must name one stat")
        if not str(headline.get("qualifier", "")).strip():
            errors.append(f"{project['id']} headline needs its honest qualifier")
        if not str(project.get("purpose", "")).strip():
            errors.append(f"{project['id']} needs a one-line purpose")
        kinds = [link.get("kind") for link in project.get("links") or []]
        if "site" not in kinds or "repo" not in kinds:
            errors.append(f"{project['id']} needs a site link and a repo link")
    for key in project.get("factIds") or []:
        if key not in stats:
            errors.append(f"{project['id']} factIds references missing stat {key}")
    for key in project.get("glanceIds") or []:
        if key not in stats:
            errors.append(f"{project['id']} glanceIds references missing stat {key}")
    for name, table in (project.get("tables") or {}).items():
        if not table.get("rows") or not table.get("source"):
            errors.append(f"{project['id']}.tables.{name} needs rows and a source")

bind_re = re.compile(r'data-(?:bind|table)="([^"]+)"')
html_files = list(ROOT.glob("*.html")) + list((ROOT / "projects").glob("*.html"))
for path in html_files:
    text = path.read_text()
    for raw in bind_re.findall(text):
        project_id, _, rest = raw.partition(".")
        cursor = projects.get(project_id)
        if cursor is None:
            errors.append(f"{path.name} bind {raw} has unknown project")
            continue
        for part in rest.split("."):
            if isinstance(cursor, dict) and part in cursor:
                cursor = cursor[part]
            else:
                errors.append(f"{path.name} bind {raw} does not resolve")
                break
    for glance in re.findall(r'data-glance="([^"]+)"', text):
        if glance not in projects:
            errors.append(f"{path.name} glance {glance} is unknown")

for path in TEXT_PATHS:
    if not path.exists():
        continue
    lowered = path.read_text(encoding="utf-8").lower()
    for pattern in FORBIDDEN:
        if re.search(pattern, lowered):
            errors.append(f"{path.relative_to(ROOT)} matches forbidden pattern /{pattern}/")

resume_pdf = ROOT / "resume" / "Sherif_Morsi_Resume.pdf"
resume_bytes = resume_pdf.read_bytes() if resume_pdf.exists() else b""
if not resume_bytes.startswith(b"%PDF"):
    errors.append("resume/Sherif_Morsi_Resume.pdf is missing or is not a PDF")
if b"PLACEHOLDER" in resume_bytes:
    errors.append("resume PDF is still a placeholder")
if "The resume PDF is a placeholder." in (ROOT / "index.html").read_text(encoding="utf-8"):
    errors.append("hero still says the resume PDF is a placeholder")

for path in [*html_files, ROOT / "README.md", ROOT / "sitemap.xml", ROOT / "data" / "projects.json"]:
    if not path.exists():
        continue
    page = path.read_text(encoding="utf-8")
    if re.search(r"macro-analyst-agent|Macro Analyst", page):
        errors.append(f"{path.relative_to(ROOT)} still mentions the Macro Analyst Agent")

# Facts that must stay true, and stale ones that must not come back.
tsfm = projects.get("tsfm", {})
if "test split was not scored" in json.dumps(tsfm).lower():
    errors.append("tsfm must not say the test split was not scored; the CPU model was scored once")
for needle in ("833,440", "1.109", "1.217", "no detectable difference", "worse"):
    if needle not in tsfm.get("caveat", ""):
        errors.append(f"tsfm caveat must state {needle!r} for the test-scored CPU model")
tsfm_caveat = tsfm.get("caveat", "")
for needle in ("0.688", "0.624", "0.757", "patch_s2", "better"):
    if needle not in tsfm_caveat:
        errors.append(f"tsfm caveat must state the patch_s2 test headline {needle!r}")
if "no test score" in tsfm_caveat.lower() or "test pending" in tsfm_caveat.lower():
    errors.append("tsfm caveat must not say the patch_s2 test is pending or unscored")
for path in html_files:
    page = path.read_text(encoding="utf-8")
    if "devpost" in page.lower():
        errors.append(f"{path.relative_to(ROOT)} links Devpost; that profile is empty")
home = (ROOT / "index.html").read_text(encoding="utf-8")
if "Trained in agentic AI for intent-based 5G network slicing (Amazon Bedrock)." not in home:
    errors.append("Nokia role must keep the agentic AI training line")
# The home telemetry strip repeats each headline figure for no-JS readers; it must match the data.
for pid, project in projects.items():
    if project.get("role") != "featured":
        continue
    stat = project["stats"][project["headline"]["stat"]]
    block = re.search(rf'data-headline="{re.escape(pid)}".*?</li>', home, re.S)
    if not block:
        errors.append(f"index.html telemetry strip is missing {pid}")
    elif stat["display"] not in block.group(0) or stat["label"] not in block.group(0):
        errors.append(f"index.html telemetry strip for {pid} does not match data/projects.json")
# data-bind fallback text must match the data it binds.
for path in html_files:
    page = path.read_text(encoding="utf-8")
    for raw, shown in re.findall(r'data-bind="([^"]+)">([^<]*)<', page):
        project_id, _, rest = raw.partition(".")
        cursor = projects.get(project_id)
        for part in rest.split("."):
            cursor = cursor.get(part) if isinstance(cursor, dict) else None
        if shown and cursor is not None and shown != str(cursor):
            errors.append(f"{path.relative_to(ROOT)} bind {raw} shows {shown!r} but data says {cursor!r}")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
for loc in ("projects/deep-portfolio-constructor.html", "projects/tsfm.html", "projects/world-shock-lab.html", "aurvane/"):
    if f"https://shmorsi.github.io/{loc}</loc>" not in sitemap:
        errors.append(f"sitemap.xml is missing {loc}")

# Pending results stay empty until a committed file exists. No placeholder score.
wsl_page = (ROOT / "projects" / "world-shock-lab.html").read_text(encoding="utf-8")
if 'data-slot="wsl-live-score"' not in wsl_page or "No decision has been scored" not in wsl_page:
    errors.append("world-shock-lab page must keep the October decision score pending")
wsl_slot = re.search(r'data-slot="wsl-live-score".*?</div>', wsl_page, re.S)
if wsl_slot and "%" in re.sub(r"<[^>]+>", " ", wsl_slot.group(0)):
    errors.append("world-shock-lab live-score slot must not show a percentage")
tsfm_page = (ROOT / "projects" / "tsfm.html").read_text(encoding="utf-8")
tsfm_slot = re.search(r'data-slot="tsfm-patch-test"[^>]*>(.*?)</div>', tsfm_page, re.S)
tsfm_slot_text = re.sub(r"<[^>]+>", " ", tsfm_slot.group(1)) if tsfm_slot else ""
if not tsfm_slot or "0.688" not in tsfm_slot_text or "Not scored" in tsfm_slot_text:
    errors.append("tsfm headline test slot must show the measured 0.688 test figure")
tsfm_distill = re.search(r'data-slot="tsfm-distill"[^>]*>(.*?)</div>', tsfm_page, re.S)
if not tsfm_distill or "Not scored" not in tsfm_distill.group(1) or re.search(r"\d", re.sub(r"<[^>]+>", " ", tsfm_distill.group(1))):
    errors.append("tsfm distillation slot must say 'Not scored' and must not show a number")
# Internal links, image alts, and the tags a shared link needs.
meta_needles = (
    "<title>",
    'name="description"',
    'name="viewport"',
    'rel="canonical"',
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'property="og:url"',
    'name="twitter:card"',
)
for path in html_files:
    page = path.read_text(encoding="utf-8")
    if path.name != "404.html":
        for needle in meta_needles:
            if needle not in page:
                errors.append(f"{path.relative_to(ROOT)} is missing {needle}")
        if not re.search(r"<h1[\s>]", page):
            errors.append(f"{path.relative_to(ROOT)} is missing an h1")
    for tag in re.findall(r"<img\b[^>]*>", page, re.I):
        if not re.search(r"\balt=", tag, re.I):
            errors.append(f"{path.relative_to(ROOT)} has an img without alt")
    for raw in re.findall(r'''(?:href|src)="([^"]+)"''', page):
        if raw.startswith(("mailto:", "tel:", "data:", "javascript:", "http://", "https://")):
            continue
        url, _, frag = raw.partition("#")
        url = url.split("?", 1)[0]
        if url.startswith("/"):
            target = (ROOT / url.lstrip("/")).resolve()
        elif url == "":
            target = path.resolve()
        else:
            target = (path.parent / url).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            errors.append(f"{path.relative_to(ROOT)} link {raw} leaves the site")
            continue
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            errors.append(f"{path.relative_to(ROOT)} link {raw} does not resolve")
            continue
        if frag and target.suffix == ".html" and f'id="{frag}"' not in target.read_text(encoding="utf-8"):
            errors.append(f"{path.relative_to(ROOT)} link {raw} has no matching id")

for css_path in ROOT.rglob("*.css"):
    for raw in re.findall(r"url\(\s*([^)]+?)\s*\)", css_path.read_text(encoding="utf-8")):
        ref = raw.strip("\"'")
        if ref.startswith(("data:", "http://", "https://")):
            continue
        target = (css_path.parent / ref).resolve()
        if not target.is_file():
            errors.append(f"{css_path.relative_to(ROOT)} url {ref} does not resolve")

for project in DATA["projects"]:
    if project.get("role") == "featured" and not str(project.get("proves", "")).strip():
        errors.append(f"{project['id']} needs a skimmable proves line")
    proves = project.get("proves", "")
    if proves and proves not in home:
        errors.append(f"index.html is missing the proves line for {project['id']}")

if "prefers-reduced-motion" not in (ROOT / "assets" / "site.css").read_text(encoding="utf-8"):
    errors.append("stylesheet must respect prefers-reduced-motion")
# Aurvane: displayed figures match the copied summary, and the page says they are simulated.
aurvane = projects.get("aurvane")
asum_path = ROOT / "data" / "measurements" / "aurvane" / "worst-case_summary.json"
if aurvane is None or aurvane.get("role") != "featured":
    errors.append("Aurvane must be a featured project")
elif not asum_path.exists():
    errors.append("data/measurements/aurvane/worst-case_summary.json is missing")
else:
    asum = json.loads(asum_path.read_text())
    on, off = asum["with_aurvane"], asum["without_aurvane"]
    want = {
        "attacksWith": f"{on['attacks_landed']} of {on['poisoned_tasks']}",
        "attacksWithout": f"{off['attacks_landed']} of {off['poisoned_tasks']}",
        "lossWith": f"{on['money_lost_cad']:,.0f} CAD",
        "cleanDone": f"{on['clean_completed']} of {on['clean_tasks']}",
        "falseAlarms": str(on["clean_friction_events"]),
    }
    for key, display in want.items():
        if aurvane["stats"][key]["display"] != display:
            errors.append(f"aurvane.stats.{key} shows {aurvane['stats'][key]['display']!r} but the summary says {display!r}")
    caveat = aurvane.get("caveat", "").lower()
    for needle in ("simulated", "worst-case", "have not been run"):
        if needle not in caveat:
            errors.append(f"aurvane caveat must state {needle!r}")
    if not (ROOT / "aurvane" / "index.html").is_file() or not (ROOT / "aurvane" / "media" / "aurvane-demo.mp4").is_file():
        errors.append("aurvane/ needs index.html and media/aurvane-demo.mp4")
    rt_path = ROOT / "data" / "measurements" / "aurvane" / "redteam_summary.json"
    if rt_path.exists():
        rt = json.loads(rt_path.read_text())
        phrase = f"{rt['attacks']} smarter attacks: {rt['contained']} contained, {rt['capped']} capped by the budget, {rt['gets through']} get through"
        if phrase not in aurvane.get("summary", ""):
            errors.append("aurvane summary must quote the red-team counts from redteam_summary.json")
    # The old URL stays alive as a tiny redirect; nothing else may carry the old name.
    old = ROOT / "glass" / "index.html"
    if not old.is_file() or "../aurvane/" not in old.read_text():
        errors.append("glass/index.html must redirect to ../aurvane/")
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix in {".html", ".js", ".json", ".css", ".xml", ".md"} and ".git" not in path.parts \
                and path != old and path.name != "check_site.py" and re.search(r"\bglass\b", path.read_text(errors="ignore"), re.I):
            errors.append(f"{path.relative_to(ROOT)} still uses the project's old name")

# Deep Portfolio Constructor: every figure comes from the project's committed export, and the limits stay stated.
dpc = projects.get("deep-portfolio-constructor")
if dpc is None or not (ROOT / "projects" / "deep-portfolio-constructor.html").exists():
    errors.append("Deep Portfolio Constructor needs its project entry and projects/deep-portfolio-constructor.html")
else:
    for key, stat in dpc["stats"].items():
        if not stat["source"].startswith("deep-portfolio-constructor reports/"):
            errors.append(f"deep-portfolio-constructor.stats.{key} must cite the project's committed reports/ file")
    verdict = dpc["stats"].get("vsMktVerdictDeep", {}).get("display")
    if verdict not in ("better", "worse", "no detectable difference"):
        errors.append("the network's verdict against the market must be one of the protocol's three")
    caveat = dpc.get("caveat", "")
    for needle in ("pre-registered", "long-only", "survivorship", "not funds", "found later", "US data only", f"the verdict is {verdict}"):
        if needle not in caveat:
            errors.append(f"deep-portfolio-constructor caveat must state {needle!r}")
    proves = dpc.get("proves", "")
    reading = {"better": "better by the pre-registered test", "worse": "worse by the pre-registered test"}.get(verdict, "cannot tell from luck")
    if reading not in proves:
        errors.append(f"deep-portfolio-constructor proves line must state the pre-registered verdict ({reading!r})")
    if verdict != "better" and re.search(r"\bbetter\b|significan|\bbeats?\b", proves):
        errors.append("deep-portfolio-constructor proves line must not claim an edge the pre-registered test did not find")
    if re.search(r"\bshort(?:s|ing|ed)?\b|long-short|market-neutral", " ".join([dpc["purpose"], dpc["summary"], proves])):
        errors.append("deep-portfolio-constructor is a long-only study: no shorting language in its purpose, summary or proves line")

# Project marks exist for every project, and no page links to a repository visitors cannot open.
for project in DATA["projects"]:
    if not (ROOT / "assets" / "marks" / f"{project['id']}.svg").is_file():
        errors.append(f"missing project mark assets/marks/{project['id']}.svg (run scripts/make_marks.py)")
    for link in project.get("links") or []:
        if link.get("public") is False:
            repo = link["href"].rstrip("/")
            for path in html_files:
                if re.search(r'href="' + re.escape(repo) + r'(?:/[^"]*)?"', path.read_text(encoding="utf-8")):
                    errors.append(f"{path.relative_to(ROOT)} links {repo}, which is marked private (run scripts/sync_chrome.py)")

# Retired projects (Orbit, ATLAS): their repositories were deleted, so nothing on the site may name or link them.
# aurvane/index.html is built elsewhere and only mentions an unrelated fictional company.
for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts or path.suffix not in {".html", ".js", ".json", ".css", ".xml", ".md"}:
        continue
    if path.name == "check_site.py" or path.is_relative_to(ROOT / "aurvane"):
        continue
    if re.search(r"\borbit\b|\batlas\b", path.read_text(errors="ignore"), re.I):
        errors.append(f"{path.relative_to(ROOT)} still names a retired project (Orbit or ATLAS)")
for gone in ("orbit", "projects/atlas.html", "data/measurements/orbit"):
    if (ROOT / gone).exists():
        errors.append(f"{gone} belongs to a retired project and must not be served")

# Projects are numbered 01, 02, ... in the order of data/projects.json, and each has its own page.
for i, project in enumerate(DATA["projects"], 1):
    if project.get("number") != f"{i:02d}":
        errors.append(f"{project['id']} must be number {i:02d} (data order), not {project.get('number')!r}")

# The master page is generated: its <main> must match a fresh build from data/projects.json, charts included.
import importlib.util  # noqa: E402

sys.dont_write_bytecode = True  # no __pycache__ in the site repository
spec = importlib.util.spec_from_file_location("build_home", ROOT / "scripts" / "build_home.py")
build_home = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_home)
main_of = lambda text: re.search(r"<main id=\"main\">.*?</main>", text, re.S).group(0)  # noqa: E731
if main_of(build_home.page()) != main_of(home):
    errors.append("index.html is out of date with data/projects.json (run scripts/build_home.py, then scripts/sync_chrome.py)")

# The hero illustration and every reveal must respect reduced motion.
site_js = (ROOT / "assets" / "site.js").read_text(encoding="utf-8")
if "prefers-reduced-motion" not in site_js:
    errors.append("assets/site.js must check prefers-reduced-motion before animating")
if "Illustration, not data" not in home:
    errors.append("the hero illustration must say it is an illustration, not data")

# The wealth lab and the holdings view are exports of the project's committed results; they must agree with its table.
wealth_path = ROOT / "data" / "dpc_wealth.json"
dpc_stats = projects["deep-portfolio-constructor"]["stats"]
if not wealth_path.exists():
    errors.append("data/dpc_wealth.json is missing (run scripts/sync_dpc.py)")
else:
    wealth = json.loads(wealth_path.read_text())
    if not wealth["source"].startswith("deep-portfolio-constructor "):
        errors.append("data/dpc_wealth.json must cite the deep-portfolio-constructor repository and commit")
    months = int(dpc_stats["months"]["display"])
    if len(wealth["dates"]) != months:
        errors.append(f"data/dpc_wealth.json should cover {months} months")
    perf = projects["deep-portfolio-constructor"]["tables"]["performance"]
    for sid, label in wealth["labels"].items():
        series = wealth["growth"][sid]
        row = next((r for r in perf["rows"] if r[0] == label), None)
        if len(series) != months + 1:
            errors.append(f"growth of $1 for {sid} should have {months} months plus its starting point")
        if row is None:
            errors.append(f"lab strategy {sid} has no row in the performance table")
        elif (f"${series[-1]:,.0f}" if series[-1] >= 10 else f"${series[-1]:,.2f}") != row[1]:
            errors.append(f"lab growth of $1 for {sid} ends at {series[-1]} but the table says {row[1]}")
    h = wealth["holdings"]
    for t, (row, mrow) in enumerate(zip(h["deepBp"], h["marketBp"])):
        # Whole basis points, rounded so each month adds to exactly 100%: long-only and fully invested.
        if len(row) != len(h["industries"]) or sum(row) != 10000 or min(row) < 0 or sum(mrow) != 10000 or min(mrow) < 0:
            errors.append(f"holdings {h['dates'][t]} must be long-only and fully invested")
            break

# Every interactive piece is on its page, every dotted word has a definition, and the toy says it is made up.
dpc_page = (ROOT / "projects" / "deep-portfolio-constructor.html").read_text(encoding="utf-8")
for hook, where, text in (("data-lab=", "index.html", home), ("data-shock", "index.html", home), ("data-attack", "index.html", home),
                          ("data-market-pause", "index.html", home), ("data-lab=", "the portfolio page", dpc_page),
                          ("data-growth-toy", "the portfolio page", dpc_page), ("data-holdings=", "the portfolio page", dpc_page),
                          ("data-start-toy", "the portfolio page", dpc_page), ("data-schedules", "the portfolio page", dpc_page)):
    if hook not in text:
        errors.append(f"{where} is missing its interactive piece {hook}")
glossary = set(re.findall(r'^\s+"([a-z-]+)": \[', site_js, re.M))
for path in html_files:
    for key in set(re.findall(r'class="term" data-term="([^"]+)"', path.read_text(encoding="utf-8"))):
        if key not in glossary:
            errors.append(f"{path.relative_to(ROOT)} uses the term {key!r} but assets/site.js has no definition for it")
if "Made-up numbers, not data" not in dpc_page:
    errors.append("the growth toy must say its numbers are made up, not data")
if re.search(r"long-short|market-neutral|dollar-neutral|\bshorts?\b(?! of)", re.sub(r"never shorts?|no shorting|never short", "", main_of(dpc_page))):
    errors.append("the portfolio page must not describe short positions: the study is long-only")
spec_dpc = importlib.util.spec_from_file_location("build_dpc_page", ROOT / "scripts" / "build_dpc_page.py")
build_dpc = importlib.util.module_from_spec(spec_dpc)
spec_dpc.loader.exec_module(build_dpc)
body_of = lambda text: re.search(r'<div class="cs-body wrap">.*?<nav class="project-switch"', text, re.S).group(0)  # noqa: E731
if body_of(build_dpc.page()) != body_of(dpc_page):
    errors.append("projects/deep-portfolio-constructor.html is out of date with data/projects.json (run scripts/build_dpc_page.py, then scripts/sync_chrome.py)")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok: {len(projects)} projects")
