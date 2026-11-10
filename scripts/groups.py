#!/usr/bin/env python3
"""Three projects. The first has three studies.

The site shows three projects: one about investing for the long run, in three studies that live in two
repositories; one deep-learning model built from scratch; one system for AI agents. This module is the one
place that says which study belongs to which project, in what order, and how each is numbered:

    01.1, 01.2, 01.3   the studies of project 01
    02, 03             projects with one study

`apply(data)` orders data["projects"], sets each study's "number", "group" and "study", and writes the
project list to data["groups"]. The sync scripts call it before they write data/projects.json;
`python3 scripts/groups.py` applies it to the file as it is.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

GROUPS = [
    {"id": "investing", "number": "01", "title": "Deep Portfolio Constructor", "kicker": "AI for long-term investing",
     "line": "One question in three studies: can AI help someone who invests for decades, and how would you know? "
             "Grow the money, keep a pension promise funded, and measure what a central-bank surprise does to both.",
     "studies": [("deep-portfolio-constructor", "Wealth study"), ("pension-lab", "Pension Lab"), ("world-shock-lab", "World Shock Lab")]},
    {"id": "forecasting", "number": "02", "title": "Time-Series Foundation Model", "kicker": "Deep learning from scratch",
     "line": "A forecasting model built and trained from first principles, and the audit that caught a public benchmark leaking its own test data.",
     "studies": [("tsfm", "Time-Series Foundation Model")]},
    {"id": "agents", "number": "03", "title": "Aurvane", "kicker": "Agentic AI",
     "line": "A trust layer for AI agents that act with real money and data: signed mandates, a check on every action, and a log that cannot be rewritten.",
     "studies": [("aurvane", "Aurvane")]},
]
ORDER = [pid for g in GROUPS for pid, _ in g["studies"]]


def apply(data: dict) -> dict:
    by_id = {p["id"]: p for p in data["projects"]}
    missing = [pid for pid in ORDER if pid not in by_id]
    extra = [pid for pid in by_id if pid not in ORDER]
    if extra:
        raise SystemExit(f"scripts/groups.py does not place {', '.join(extra)} in a project")
    data["projects"] = [by_id[pid] for pid in ORDER if pid in by_id]
    data["groups"] = []
    for g in GROUPS:
        here = [(pid, name) for pid, name in g["studies"] if pid not in missing]
        for i, (pid, name) in enumerate(here, 1):
            by_id[pid]["number"] = f"{g['number']}.{i}" if len(g["studies"]) > 1 else g["number"]
            by_id[pid]["group"] = g["id"]
            by_id[pid]["study"] = name
        data["groups"].append({"id": g["id"], "number": g["number"], "title": g["title"], "kicker": g["kicker"], "line": g["line"],
                               "projects": [pid for pid, _ in here]})
    return data


def main() -> None:
    path = ROOT / "data" / "projects.json"
    data = apply(json.loads(path.read_text()))
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print("three projects: " + "; ".join(f"{g['number']} {g['title']} ({len(g['projects'])})" for g in data["groups"]))


if __name__ == "__main__":
    main()
