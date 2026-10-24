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
    *ROOT.glob("orbit/**/*.html"),
    ROOT / "assets" / "site.js",
    ROOT / "orbit" / "scene.js",
    ROOT / "data" / "projects.json",
]

FORBIDDEN = [
    r"software engineer",
    r"\bml engineer\b",
    r"machine learning engineer",
    r"\bai engineer\b",
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
html_files = list(ROOT.glob("*.html")) + list((ROOT / "projects").glob("*.html")) + list(ROOT.glob("orbit/**/*.html"))
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

orbit_page = (ROOT / "orbit" / "index.html").read_text(encoding="utf-8")
if "Evaluation pending: single agent vs team vs fine-tuned team on a frozen test set" not in orbit_page:
    errors.append("orbit page must mark the frozen-test evaluation as pending")
replay_html = (ROOT / "orbit" / "replay" / "index.html").read_text(encoding="utf-8")
if "Scripted harness" not in replay_html:
    errors.append("mission replay must keep the Scripted harness label")
for name in ("quotient.jsonl", "abort.jsonl", "revise.jsonl", "index.json"):
    trace = ROOT / "orbit" / "replay" / "traces" / name
    if not trace.exists():
        errors.append(f"missing bundled trace {name}")
for name in ("accept.jsonl", "revise.jsonl", "refuse.jsonl", "index.json"):
    if not (ROOT / "orbit" / "replay" / "traces" / "v2" / name).exists():
        errors.append(f"missing bundled v2 trace {name}")
v2_index = ROOT / "orbit" / "replay" / "traces" / "v2" / "index.json"
if v2_index.exists():
    for item in json.loads(v2_index.read_text()):
        trace = ROOT / "orbit" / "replay" / "traces" / "v2" / item["file"]
        header = json.loads(trace.read_text().splitlines()[0]) if trace.exists() else {}
        if header.get("team") != "v2" or header.get("harness") != "scripted_harness":
            errors.append(f"v2 trace {item['file']} must be a team v2 scripted-harness trace")
if 'value="v2/revise.jsonl" selected' not in orbit_page:
    errors.append("orbit scene must open on the v2 revise trace")
for label in ("Replay of a saved engine trace", "Scripted harness", "Not live", "Not a model score"):
    if label not in orbit_page or label not in (ROOT / "orbit" / "scene.js").read_text(encoding="utf-8"):
        errors.append(f"orbit scene must keep the label {label!r} in the page and in scene.js")

# The v2 results slot: no figure unless it cites a result file that exists in this repo or names one in Orbit.
slot = re.search(r'<div class="slot-empty"[^>]*data-slot="orbit-v2"[^>]*>(.*?)</div>', orbit_page, re.S)
if not slot:
    errors.append("orbit page needs the v2 results slot (data-slot=\"orbit-v2\")")
else:
    opening = re.search(r'<div class="slot-empty"[^>]*data-slot="orbit-v2"[^>]*>', orbit_page).group(0)
    source = (re.search(r'data-source="([^"]*)"', opening) or [None, ""])[1].strip()
    slot_text = re.sub(r"<[^>]+>", " ", slot.group(1))
    slot_text = re.sub(r"\bv2\b", " ", slot_text)
    has_number = re.search(r"\d", slot_text) is not None
    if has_number and not re.fullmatch(r"results/v3_api/[^\s\"]+/team_v2\.json", source):
        errors.append("orbit v2 slot shows a number without data-source naming results/v3_api/<model>/team_v2.json")
    if not has_number and "Not yet scored" not in slot_text:
        errors.append("orbit v2 slot must say 'Not yet scored' until it has a sourced figure")
    if source and not has_number:
        errors.append("orbit v2 slot names a source but shows no figure; clear data-source or add the figure")
orbit_data = json.dumps(projects.get("orbit", {}))
for pattern in (r"team_v2[^\"]*\d\.\d", r"v2 team[^.\"]*\b\d+ of 12", r"six-role[^.\"]*\b\d+ of 12"):
    if re.search(pattern, orbit_data, re.I) and "results/v3_api" not in orbit_data:
        errors.append("data/projects.json states a v2 team figure without citing results/v3_api")

orbit_project = projects.get("orbit")
if orbit_project is None or orbit_project.get("role") != "featured":
    errors.append("Orbit must be a featured project")
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
if "patch_s2" not in tsfm.get("caveat", "") or "no test score" not in tsfm.get("caveat", ""):
    errors.append("tsfm caveat must say the patch_s2 headline has no test score")
atlas = projects.get("atlas")
if atlas is None or not (ROOT / "projects" / "atlas.html").exists():
    errors.append("ATLAS needs its project entry and projects/atlas.html")
else:
    caveat = atlas.get("caveat", "").lower()
    for needle in ("local research terminal", "ridge", "one machine"):
        if needle not in caveat:
            errors.append(f"ATLAS caveat must state {needle!r}")
for path in html_files:
    page = path.read_text(encoding="utf-8")
    if "devpost" in page.lower():
        errors.append(f"{path.relative_to(ROOT)} links Devpost; that profile is empty")
home = (ROOT / "index.html").read_text(encoding="utf-8")
if "Trained in agentic AI for intent-based 5G network slicing (Amazon Bedrock)." not in home:
    errors.append("Nokia role must keep the agentic AI training line")
# The home mission index repeats each headline figure for no-JS readers; it must match the data.
for pid, project in projects.items():
    if project.get("role") != "featured":
        continue
    stat = project["stats"][project["headline"]["stat"]]
    block = re.search(rf'data-headline="{re.escape(pid)}".*?</li>', home, re.S)
    if not block:
        errors.append(f"index.html mission index is missing {pid}")
    elif stat["display"] not in block.group(0) or stat["label"] not in block.group(0):
        errors.append(f"index.html mission index for {pid} does not match data/projects.json")
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
for loc in ("projects/tsfm.html", "projects/world-shock-lab.html", "projects/atlas.html", "orbit/"):
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
if not tsfm_slot or "Not scored" not in tsfm_slot.group(1) or re.search(r"\d", re.sub(r"<[^>]+>", " ", tsfm_slot.group(1))):
    errors.append("tsfm headline test slot must say 'Not scored' and must not show a number")
if 'data-slot="orbit-score-v1"' not in orbit_page or 'data-slot="orbit-distill"' not in orbit_page:
    errors.append("orbit page needs pending slots for the three-role API score and the distilled team")
for needle in ("team_v1.json", "team_distill.json", "make score-v2", "python -m orbit_agents.eval.readme"):
    if needle not in orbit_page:
        errors.append(f"orbit page must name the pending result path or command {needle!r}")

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

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok: {len(projects)} projects")
