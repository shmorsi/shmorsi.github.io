#!/usr/bin/env python3
"""Copy World Shock Lab's live scores into the site.

Input: the project's live/forecasts/ and live/scores/ (written by its own `wsl live run`,
once per decision, never edited). Output:

* the live figures and the per-decision table of the world-shock-lab entry in data/projects.json;
* the "Live score" slot of projects/world-shock-lab.html, between its two markers.

Nothing is typed here: every count comes from the score files. A forecast that is "shown but
not scored" in the project's protocol (the Bank of Canada's own 2-year yield on the day, which
is the surprise itself) is left out of every count, as it is there. With no score file the slot
says so and shows no number. Run:
    python3 scripts/sync_wsl_live.py ../world-shock-lab
then sync_chrome.py and check_site.py.
"""

from __future__ import annotations

import html
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PID = "world-shock-lab"
PAGE = ROOT / "projects" / "world-shock-lab.html"
START, END = "<!-- live-score:start (written by scripts/sync_wsl_live.py; do not edit) -->", "<!-- live-score:end -->"
BANK = {"fomc": "Federal Reserve", "boc": "Bank of Canada"}
LIVE_KEYS = ("liveDecisions", "liveForecasts", "liveInside68", "liveInside90", "liveBeatsNoChange", "liveScoredOn")
e = html.escape


def bind(key: str, text: str) -> str:
    return f'<span data-bind="{PID}.stats.{key}.display">{e(text, quote=False)}</span>'


def read(repo: Path) -> tuple[list[dict], list[dict]]:
    """Forecast files and score-1 files, oldest decision first."""
    forecasts = [json.loads(p.read_text()) for p in sorted((repo / "live" / "forecasts").glob("*.json"))]
    scores = [json.loads(p.read_text()) for p in sorted((repo / "live" / "scores").glob("*_score1.json"))]
    return forecasts, scores


def counted(score: dict) -> list[dict]:
    """The cells of a score that count: everything except the ones the protocol shows but does not score."""
    return [c for c in score["scores"] if not c.get("mechanical")]


def head(repo: Path) -> str:
    return subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip() or "unknown"


def figures(repo: Path) -> tuple[dict[str, dict], dict | None]:
    """The live stats and the per-decision table, or no table when nothing is scored."""
    forecasts, scores = read(repo)
    published = {f["event_id"]: f["published_at"][:10] for f in forecasts}
    commit = head(repo)
    where = f"world-shock-lab live/scores/ at {commit}"
    if not scores:
        status = {"label": "Live forecasts scored", "display": "None yet",
                  "source": f"{where}: no score file. {len(forecasts)} forecast file(s) in live/forecasts/."}
        return {"forecastStatus": status}, None
    cells = [c for s in scores for c in counted(s)]
    n = len(cells)
    of = lambda k: f"{sum(1 for c in cells if c[k])} of {n}"  # noqa: E731
    files = ", ".join(f"{s['event_id']}_score1.json" for s in scores)
    stat = lambda label, display, how: {"label": label, "display": display, "source": f"{where} ({files}): {how}"}  # noqa: E731
    stats = {
        "liveDecisions": stat("Decisions scored so far", str(len(scores)), "one score-1 file per decision"),
        "liveForecasts": stat("Forecasts scored so far", str(n), "cells with mechanical = false, over every score-1 file"),
        "liveInside68": stat("Outcomes inside the 68% band", of("inside68"), "cells with inside68 = true"),
        "liveInside90": stat("Outcomes inside the 90% band", of("inside90"), "cells with inside90 = true"),
        "liveBeatsNoChange": stat("Forecasts closer than a forecast of no change", of("beats_no_change"), "cells with beats_no_change = true"),
        "liveScoredOn": stat("Scored on", max(s["scored_at"][:10] for s in scores), "latest scored_at"),
        "forecastStatus": stat("Live forecasts scored", f"{len(scores)} decisions", "score 1 of each decision; code_git_sha " + ", ".join(sorted({s["code_git_sha"][:7] for s in scores}))),
    }
    rows = []
    for s in scores:
        c = counted(s)
        rows.append([f"{BANK[s['bank']]}, {s['decision_date']}", published.get(s["event_id"], ""), str(len(c)),
                     f"{sum(x['inside68'] for x in c)} of {len(c)}", f"{sum(x['inside90'] for x in c)} of {len(c)}",
                     f"{sum(x['beats_no_change'] for x in c)} of {len(c)}"])
    table = {
        "caption": "Each decision's forecasts, scored once every five-day outcome was published. A forecast is one outcome (the Canadian 2-year yield, "
                   "the Canadian dollar, Canadian banks) at one horizon (one day, five days).",
        "headers": ["Decision", "Forecast published", "Forecasts scored", "Inside the 68% band", "Inside the 90% band", "Closer than no change"],
        "rows": rows,
        "source": f"{where}: {files}. Counted by scripts/sync_wsl_live.py; cells the protocol shows but does not score are left out.",
    }
    return stats, table


def slot(stats: dict[str, dict], decision: str, published: str, next_decision: str) -> str:
    """The "Live score" block of the project page. Every figure in it is a data-bind."""
    tail = (f"The next forecasts, for the decisions of {bind('nextDecision', next_decision)}, publish ten days before.")
    if "liveDecisions" not in stats:
        return f"""{START}
          <div class="slot-empty" aria-label="Live forecast score" data-slot="wsl-live-score" data-source="">
            <span class="label">Live score</span>
            <strong>Pending</strong>
            <p>No decision has been scored, so there is no track record. This slot stays empty until <code>live/scores/</code> in the World Shock Lab repository contains the score files for the decisions of {bind('forecastDecision', decision)}. Scores are not filled in by hand. {tail}</p>
          </div>
          {END}"""
    d = lambda k: bind(k, stats[k]["display"])  # noqa: E731
    return f"""{START}
          <div class="slot-empty" aria-label="Live forecast score" data-slot="wsl-live-score" data-source="world-shock-lab live/scores/">
            <span class="label">Live score, so far</span>
            <strong>{d("liveInside90")} inside the 90% band</strong>
            <p>The first {d("liveDecisions")} decisions have been scored: the Federal Reserve's and the Bank of Canada's of {bind('forecastDecision', decision)}, forecast on {bind('forecastPublished', published)}. Of the {d("liveForecasts")} forecasts scored, {d("liveInside90")} landed inside their 90% band and {d("liveInside68")} inside their 68% band; {d("liveBeatsNoChange")} were closer to the outcome than a forecast of no change.</p>
            <p>This is not a track record yet. Two decisions on one day are one draw, the bands are wide enough that most outcomes should land inside them, and beating "no change" about half the time is what luck looks like. It takes years of decisions to tell a good forecaster from a lucky one, and each one will be added here as it is scored.</p>
          </div>
          <div class="table-wrap" tabindex="0" role="region" aria-label="Live forecasts scored so far" data-table="{PID}.tables.liveScores"></div>
          <p class="file-note">Counted from the score files in the project's <code>live/scores/</code>, which its own code writes once per decision and never edits (scored on {d("liveScoredOn")}). Scores are not filled in by hand. For series the project may not republish, a score file records only whether the outcome fell inside each band. {tail}</p>
          {END}"""


def main(src: str) -> None:
    repo = Path(src)
    if not (repo / "live" / "forecasts").is_dir():
        raise SystemExit(f"{repo} has no live/forecasts/: point this at a checkout of world-shock-lab")
    stats, table = figures(repo)
    path = ROOT / "data" / "projects.json"
    data = json.loads(path.read_text())
    project = next(p for p in data["projects"] if p["id"] == PID)
    for key in LIVE_KEYS:
        project["stats"].pop(key, None)
    project["stats"].update(stats)
    project["tables"].pop("liveScores", None)
    if table:
        project["tables"]["liveScores"] = table
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    text = PAGE.read_text(encoding="utf-8")
    if START not in text or END not in text:
        raise SystemExit(f"{PAGE.name} has no live-score markers")
    s = project["stats"]
    block = slot(stats, s["forecastDecision"]["display"], s["forecastPublished"]["display"], s["nextDecision"]["display"])
    before, rest = text.split(START, 1)
    PAGE.write_text(before + block + rest.split(END, 1)[1], encoding="utf-8")
    scored = stats.get("liveDecisions", {}).get("display", "0")
    print(f"synced world-shock-lab live scores at {head(repo)}: {scored} decision(s) scored")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT.parent / "world-shock-lab"))
