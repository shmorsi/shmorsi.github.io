#!/usr/bin/env python3
"""Bring every project's committed results into the site, rebuild it, and check it.

One command after any change in a project repository:

    python3 scripts/sync_all.py                # project repos checked out next to this one
    python3 scripts/sync_all.py --src ~/code   # or wherever they are

It does three things, in order, and stops at the first failure:

1. Copy what is generated upstream (nothing is typed by hand):
   * deep-portfolio-constructor  reports/site_wealth.json -> scripts/sync_dpc.py
                                 reports/pension/site_pension.json -> scripts/sync_pension.py (the Pension Lab)
   * aurvane                     ui/index.html -> aurvane/index.html,
                                 bench/results/*_summary.json -> data/measurements/aurvane/
   * world-shock-lab             web/dist/ (its built app) -> shock-lab/, so the lab is served
                                 from this repository as one section of the site
2. Check what is hand-written against the files it cites, so a changed result
   upstream cannot leave a stale figure on the site:
   * every stat whose source names a JSON file in a project repository and quotes
     its raw numbers: each quoted number must still be in that file;
   * world-shock-lab: once live/scores/ holds a score, the page must stop saying
     "pending" (the check fails and says which page to update).
3. Rebuild (build_home, build_dpc_page, build_pension_page, sync_chrome) and run check_site.py.

Exit 0: the site matches every project. Exit 1: something needs a hand edit; the
messages say what and where. The output is also written to $GITHUB_STEP_SUMMARY
when it runs in GitHub Actions (.github/workflows/sync.yml).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = sys.executable

# Site project id -> repository name on GitHub.
REPOS = {
    "deep-portfolio-constructor": "deep-portfolio-constructor",
    "tsfm": "tsfm-from-scratch",
    "world-shock-lab": "world-shock-lab",
    "aurvane": "aurvane",
}
AURVANE_SUMMARIES = ["worst-case_summary.json", "redteam_summary.json"]
FLOAT = re.compile(r"(?<![\w.])-?\d+\.\d{6,}")  # raw numbers quoted from a file, not rounded displays
JSON_PATH = re.compile(r"\b((?:results|bench|reports|live)/[\w./-]+\.json)\b")

report: list[str] = []
problems: list[str] = []


def say(line: str) -> None:
    print(line)
    report.append(line)


def fail(line: str) -> None:
    print(f"error: {line}", file=sys.stderr)
    problems.append(line)


def find_repo(src: Path, name: str) -> Path | None:
    """The checkout of `name` under `src`, matching the folder name case-insensitively."""
    if not src.is_dir():
        return None
    for child in src.iterdir():
        if child.is_dir() and child.name.lower() == name.lower():
            return child
    return None


def head(repo: Path) -> str:
    try:
        return subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"],
                              capture_output=True, text=True, check=True).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def run(script: str, *args: str) -> bool:
    proc = subprocess.run([PY, str(ROOT / "scripts" / script), *args], capture_output=True, text=True)
    out = (proc.stdout + proc.stderr).strip()
    if proc.returncode != 0:
        fail(f"{script} failed:\n{out}")
        return False
    last = out.splitlines()[-1] if out else "ok"
    say(f"- `{script}`: {last}")
    return True


def copy_if_changed(src: Path, dst: Path) -> bool:
    if dst.is_file() and dst.read_bytes() == src.read_bytes():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    return True


def numbers(obj) -> list[float]:
    if isinstance(obj, bool):
        return []
    if isinstance(obj, (int, float)):
        return [float(obj)]
    if isinstance(obj, dict):
        return [x for v in obj.values() for x in numbers(v)]
    if isinstance(obj, list):
        return [x for v in obj for x in numbers(v)]
    return []


def sync_dpc(repo: Path) -> None:
    export = repo / "reports" / "site_wealth.json"
    if not export.is_file():
        fail(f"{export} is missing: run `python -m dpc.cli wealth-site` in deep-portfolio-constructor and commit it")
        return
    run("sync_dpc.py", str(export))
    pension = repo / "reports" / "pension" / "site_pension.json"   # the Pension Lab lives in the same repository
    if not pension.is_file():
        fail(f"{pension} is missing: run `python -m dpc.cli pension-site` in deep-portfolio-constructor and commit it")
        return
    run("sync_pension.py", str(pension))


def sync_aurvane(repo: Path) -> None:
    changed = []
    page = repo / "ui" / "index.html"
    if not page.is_file():
        fail(f"{page} is missing: run `python ui/build.py` in aurvane and commit it")
        return
    if copy_if_changed(page, ROOT / "aurvane" / "index.html"):
        changed.append("aurvane/index.html")
    for name in AURVANE_SUMMARIES:
        src = repo / "bench" / "results" / name
        if not src.is_file():
            fail(f"{src} is missing")
            continue
        if copy_if_changed(src, ROOT / "data" / "measurements" / "aurvane" / name):
            changed.append(f"data/measurements/aurvane/{name}")
    say(f"- aurvane: {'copied ' + ', '.join(changed) if changed else 'no change'}")


def sync_wsl_app(repo: Path) -> None:
    """The lab's interactive app is part of this site: its build is copied here, file for file."""
    build = repo / "web" / "dist"
    if not (build / "index.html").is_file():
        fail(f"{build} is missing: run `npm ci && npm run build` in world-shock-lab/web first")
        return
    dest = ROOT / "shock-lab"
    new = {f.relative_to(build): f for f in build.rglob("*") if f.is_file()}
    old = {f.relative_to(dest) for f in dest.rglob("*") if f.is_file()} if dest.is_dir() else set()
    changed = [str(rel) for rel, f in new.items() if copy_if_changed(f, dest / rel)]
    for rel in old - set(new):                                   # a renamed (re-hashed) asset leaves nothing behind
        (dest / rel).unlink()
        changed.append(f"removed {rel}")
    say(f"- world-shock-lab app: {f'{len(changed)} file(s) changed' if changed else 'no change'}")


def check_cited_numbers(project: dict, repo: Path) -> None:
    """Each raw number a stat quotes from a JSON file in `repo` must still be in that file."""
    checked = stale = 0
    for key, stat in project.get("stats", {}).items():
        source = stat.get("source", "")
        paths = [p for p in JSON_PATH.findall(source) if (repo / p).is_file()]
        quoted = [float(x) for x in FLOAT.findall(source.replace("−", "-"))]
        if not paths or not quoted:
            continue
        found = [x for p in paths for x in numbers(json.loads((repo / p).read_text()))]
        for value in quoted:
            checked += 1
            if not any(abs(value - f) <= 1e-12 * max(1.0, abs(f)) for f in found):
                stale += 1
                fail(f"{project['id']}.stats.{key}: {value} is no longer in {repo.name}/{' or '.join(paths)}. "
                     f"The result changed upstream: update the display and source in data/projects.json "
                     f"and the hand-written page, then rerun.")
    say(f"- {project['id']}: {checked - stale} of {checked} cited raw numbers match {repo.name}")


def check_wsl_scores(repo: Path) -> None:
    scores = sorted((repo / "live" / "scores").glob("*.json")) if (repo / "live" / "scores").is_dir() else []
    forecasts = sorted((repo / "live" / "forecasts").glob("*.json")) if (repo / "live" / "forecasts").is_dir() else []
    page = (ROOT / "projects" / "world-shock-lab.html").read_text(encoding="utf-8")
    say(f"- world-shock-lab: {len(forecasts)} forecast file(s), {len(scores)} score file(s)")
    if scores and "No decision has been scored" in page:
        fail("world-shock-lab now has score files in live/scores/ "
             f"({', '.join(s.name for s in scores)}) but projects/world-shock-lab.html still says no decision has "
             "been scored. Fill the score slot from those files (and relax the pending rule in check_site.py).")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", default=str(ROOT.parent), help="folder holding the project checkouts (default: next to this repo)")
    args = ap.parse_args()
    src = Path(args.src).expanduser().resolve()
    data = json.loads((ROOT / "data" / "projects.json").read_text())
    projects = {p["id"]: p for p in data["projects"]}

    repos: dict[str, Path] = {}
    say("## Project repositories")
    for pid, name in REPOS.items():
        repo = find_repo(src, name)
        if repo is None:
            fail(f"{name} is not checked out under {src}")
            continue
        repos[pid] = repo
        say(f"- {name} @ `{head(repo)}`")
    if problems:
        return finish()

    say("\n## Copy generated results")
    sync_dpc(repos["deep-portfolio-constructor"])
    sync_aurvane(repos["aurvane"])
    sync_wsl_app(repos["world-shock-lab"])

    say("\n## Check hand-written figures against their sources")
    for pid in ("tsfm", "world-shock-lab"):
        check_cited_numbers(projects[pid], repos[pid])
    check_wsl_scores(repos["world-shock-lab"])

    if not problems:
        say("\n## Build and check")
        for script in ("build_home.py", "build_dpc_page.py", "build_pension_page.py", "sync_chrome.py", "check_site.py"):
            if not run(script):
                break
    return finish()


def finish() -> int:
    if problems:
        report.append("\n## Needs a hand edit\n" + "\n".join(f"- {p}" for p in problems))
    else:
        report.append("\nThe site matches every project.")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write("\n".join(report) + "\n")
    print("FAILED" if problems else "ok: site in sync with every project")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
