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
for needle in (
    "results/code_v2/claude-haiku-5-5/team.json",
    "results/v3_qwen1.5b/comparison.json",
    "results/v3_qwen1.5b/team_distill.json",
    "results/v3_qwen1.5b/team_lora.json",
    "not an improvement",
    "includes zero",
    "above zero",
    "29 of 32",
    "27 of 32",
):
    if needle not in orbit_page:
        errors.append(f"orbit page must state {needle!r}")
if re.search(r"team (beats|is better|outperforms)|(?<!not )an improvement", orbit_page, re.I):
    errors.append("orbit page must not call the code-eval gap or a zero-spanning interval an improvement")
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
if 'value="incident/report.jsonl" selected' not in orbit_page:
    errors.append("orbit scene must open on the incident report trace")
incident_index = ROOT / "orbit" / "replay" / "traces" / "incident" / "index.json"
if not incident_index.exists():
    errors.append("missing bundled incident index")
else:
    for item in json.loads(incident_index.read_text()):
        trace = ROOT / "orbit" / "replay" / "traces" / "incident" / item["file"]
        if not trace.exists():
            errors.append(f"missing bundled incident trace {item['file']}")
            continue
        header = json.loads(trace.read_text().splitlines()[0])
        if header.get("harness") != "scripted_harness" or header.get("scenario") != "incident":
            errors.append(f"incident trace {item['file']} must be a scripted incident trace")
if "not shipped" in orbit_page.lower() or "not shipped" in replay_html.lower():
    errors.append("incident traces are shipped; the site must not say they are not shipped")
for label in ("Replay of a saved engine trace", "Scripted harness", "Not live", "Not a model score"):
    if label not in orbit_page or label not in (ROOT / "orbit" / "scene.js").read_text(encoding="utf-8"):
        errors.append(f"orbit scene must keep the label {label!r} in the page and in scene.js")

# Measured slots cite the archive path. Boardroom stays a demo with no figure.
def slot_text(name: str) -> str:
    match = re.search(rf'<div class="slot-empty"[^>]*data-slot="{name}"[^>]*>(.*?)</div>', orbit_page, re.S)
    if not match:
        errors.append(f"orbit page needs data-slot={name!r}")
        return ""
    return re.sub(r"<[^>]+>", " ", match.group(1))

code_slot = slot_text("orbit-code")
if code_slot and ("29 of 32" not in code_slot or "not an improvement" not in code_slot):
    errors.append("orbit code slot must show 29 of 32 and say the gap is not an improvement")
board_slot = slot_text("orbit-boardroom")
if board_slot and ("Not a measured score" not in board_slot or re.search(r"\d", board_slot)):
    errors.append("boardroom slot must say 'Not a measured score' and must not show a number")
v3_slot_text = slot_text("orbit-harness-v3")
if v3_slot_text and ("0.764" not in v3_slot_text or "includes zero" not in v3_slot_text or "above zero" not in v3_slot_text):
    errors.append("orbit harness v3 slot must show the measured schema-valid rate and both interval readings")
distill_slot = slot_text("orbit-distill")
if distill_slot and ("2 of 12" not in distill_slot or "includes zero" not in distill_slot):
    errors.append("orbit distill slot must show 2 of 12 and the interval that includes zero")

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
tsfm_caveat = tsfm.get("caveat", "")
for needle in ("0.688", "0.624", "0.757", "patch_s2", "better"):
    if needle not in tsfm_caveat:
        errors.append(f"tsfm caveat must state the patch_s2 test headline {needle!r}")
if "no test score" in tsfm_caveat.lower() or "test pending" in tsfm_caveat.lower():
    errors.append("tsfm caveat must not say the patch_s2 test is pending or unscored")
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
tsfm_slot_text = re.sub(r"<[^>]+>", " ", tsfm_slot.group(1)) if tsfm_slot else ""
if not tsfm_slot or "0.688" not in tsfm_slot_text or "Not scored" in tsfm_slot_text:
    errors.append("tsfm headline test slot must show the measured 0.688 test figure")
tsfm_distill = re.search(r'data-slot="tsfm-distill"[^>]*>(.*?)</div>', tsfm_page, re.S)
if not tsfm_distill or "Not scored" not in tsfm_distill.group(1) or re.search(r"\d", re.sub(r"<[^>]+>", " ", tsfm_distill.group(1))):
    errors.append("tsfm distillation slot must say 'Not scored' and must not show a number")
if 'data-slot="orbit-distill"' not in orbit_page or 'data-slot="orbit-harness-v3"' not in orbit_page:
    errors.append("orbit page needs the measured distill and harness v3 slots")
for needle in ("team_distill.json", "comparison.json", "team.json"):
    if needle not in orbit_page:
        errors.append(f"orbit page must name the measured file {needle!r}")

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

for gif in ("orbit/media/orbit-code.gif", "orbit/media/orbit-boardroom.gif"):
    if gif not in home or not (ROOT / gif).is_file():
        errors.append(f"home page must use the measured clip {gif}")
if "prefers-reduced-motion" not in (ROOT / "assets" / "site.css").read_text(encoding="utf-8"):
    errors.append("stylesheet must respect prefers-reduced-motion")
if "data-gif" not in (ROOT / "assets" / "site.js").read_text(encoding="utf-8"):
    errors.append("clips must stay still until script decides to play them")

# Displayed Orbit figures have to match the copied measurement files.
meas = ROOT / "data" / "measurements" / "orbit"
code_team = json.loads((meas / "code_v2/claude-haiku-5-5/team.json").read_text())
code_single = json.loads((meas / "code_v2/claude-haiku-5-5/single.json").read_text())
if code_team.get("n_pass") != 29 or code_team.get("n_tasks") != 32 or code_single.get("n_pass") != 27:
    errors.append("code-eval measurement files no longer match the published 29 of 32 and 27 of 32")
code_cmp_path = meas / "code_v2/claude-haiku-5-5/comparison.json"
if not code_cmp_path.exists():
    errors.append("code-eval comparison.json is missing")
else:
    code_cmp = json.loads(code_cmp_path.read_text())
    pass_ci = code_cmp["pairs"]["team_minus_single"]["pass_at_1"]
    if pass_ci.get("point") != 0.0625 or pass_ci.get("low") != 0.0 or pass_ci.get("high") != 0.15625:
        errors.append("code-eval pass@1 interval no longer matches 0.0625 [0.0, 0.15625]")
    if not (pass_ci["low"] <= 0 <= pass_ci["high"]):
        errors.append("code-eval interval no longer includes zero; update the wording from the file")
    if "0.15625" not in orbit_page or "0.15625" not in home:
        errors.append("pages must show the code-eval interval 0.000 to 0.15625")
qwen_cmp = json.loads((meas / "v3_qwen1.5b/comparison.json").read_text())
task_ci = qwen_cmp["pairs"]["team_lora_minus_team_base"]["task_success_rate"]
schema_ci = qwen_cmp["pairs"]["team_lora_minus_team_base"]["schema_valid_rate"]
if not (task_ci["low"] < 0 < task_ci["high"]):
    errors.append("fine-tune task-success interval no longer spans zero; update the wording from the file")
if not (schema_ci["low"] > 0):
    errors.append("fine-tune schema-valid interval is no longer above zero; update the wording from the file")
orbit_blob = json.dumps(projects.get("orbit", {}))
for banned in ("0.607 → 0.780", "0.862", "0.559", "3 vs 2 of 12"):
    if banned in orbit_blob or banned in orbit_page or banned in home:
        errors.append(f"superseded Orbit figure {banned} is still on the site")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok: {len(projects)} projects")
