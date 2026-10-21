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
placeholder = projects["macro-analyst-agent"]
if placeholder.get("stats") or placeholder.get("tables") or placeholder.get("homeMetricIds"):
    errors.append("Macro Analyst Agent must not carry metrics until its repository publishes them")
if placeholder.get("role") != "placeholder":
    errors.append("Macro Analyst Agent role must stay 'placeholder'")

for project in DATA["projects"]:
    stats = project.get("stats") or {}
    for key, stat in stats.items():
        for field in ("label", "display", "source"):
            if not str(stat.get(field, "")).strip():
                errors.append(f"{project['id']}.stats.{key} is missing {field}")
    for key in project.get("homeMetricIds") or []:
        if key not in stats:
            errors.append(f"{project['id']} homeMetricIds references missing stat {key}")
    for key in project.get("glanceIds") or []:
        if key not in stats:
            errors.append(f"{project['id']} glanceIds references missing stat {key}")
    for name, table in (project.get("tables") or {}).items():
        if not table.get("rows") or not table.get("source"):
            errors.append(f"{project['id']}.tables.{name} needs rows and a source")

bind_re = re.compile(r'data-(?:bind|table)="([^"]+)"')
for path in ROOT.glob("*.html"):
    pass
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
        else:
            if raw.startswith(tuple()) is False and "data-bind" in text:
                pass
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
orbit_project = projects.get("orbit")
if orbit_project is None or orbit_project.get("role") != "featured":
    errors.append("Orbit must be a featured project")
if projects["atlas"].get("role") != "secondary":
    errors.append("ATLAS stays a secondary mission")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok — {len(projects)} projects, placeholder has no metrics")
