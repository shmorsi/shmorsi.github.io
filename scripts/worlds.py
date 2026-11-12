"""The route: five worlds on one line, the whole site at a glance.

Right under the opening screen the reader sees every project at once, as a world
hanging over the land with a railway running past all five. Each world is drawn
from that project's own results (assets/site.js, "The route"), and under each one
sits a card with the headline figure, the result in a sentence, and what the
drawing shows. This module writes the cards and hands the drawing its data.

Nothing is typed by hand: every figure in a card is a data-bind into
data/projects.json, and the drawing's numbers come from the same files the
chapters use (data/dpc_wealth.json, data/pension.json, data/land_mask.json,
data/measurements/aurvane/). Without JavaScript, or without a canvas, the section
is five cards; the pictures are decoration on top of words that are already there.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
e = html.escape

ROLE = {"deep-portfolio-constructor": "The engine", "pension-lab": "The promise", "world-shock-lab": "The weather station",
        "tsfm": "The navigator", "aurvane": "The shield"}
KIND = {"deep-portfolio-constructor": "dpc", "pension-lab": "pension", "world-shock-lab": "wsl", "tsfm": "tsfm", "aurvane": "aurvane"}
TINT = {"deep-portfolio-constructor": "ice", "pension-lab": "amber", "world-shock-lab": "teal", "tsfm": "violet", "aurvane": "rose"}


def _num(text: str) -> float:
    """'$5.0' -> 5.0, '0.688×' -> 0.688, '−1.10%' -> -1.1."""
    match = re.search(r"[−-]?\d+(?:\.\d+)?", text.replace(",", ""))
    if not match:
        raise ValueError(f"no number in {text!r}")
    return float(match.group(0).replace("−", "-"))


def _b(P: dict, pid: str, key: str, cls: str = "") -> str:
    c = f' class="{cls}"' if cls else ""
    return f'<span{c} data-bind="{pid}.stats.{key}.display">{e(P[pid]["stats"][key]["display"], quote=False)}</span>'


def data(P: dict) -> dict:
    """What the drawing needs, read from the files the rest of the site reads."""
    w = json.loads((ROOT / "data" / "dpc_wealth.json").read_text())
    step = 3  # one point a quarter is enough for a ridge a few hundred pixels round
    growth = w["growth"]
    n = len(growth["deep"])  # the starting dollar, then one value per month
    idx = list(range(0, n, step))
    if idx[-1] != n - 1:
        idx.append(n - 1)
    shown = _num(P["deep-portfolio-constructor"]["stats"]["wealthDeep"]["display"])
    if round(growth["deep"][-1]) != round(shown):
        raise SystemExit(f"worlds.py: the growth series ends at {growth['deep'][-1]:.0f}, the headline says {shown:.0f}")
    fans = json.loads((ROOT / "data" / "pension.json").read_text())["fans"]["paths"]
    ci = re.search(r"\[(\d+\.\d+),\s*(\d+\.\d+)\]", P["tsfm"]["headline"]["qualifier"])
    if not ci:
        raise SystemExit("worlds.py: the forecasting model's headline no longer quotes its 95% interval")
    summary = json.loads((ROOT / "data" / "measurements" / "aurvane" / "worst-case_summary.json").read_text())
    attacks = [[name, a["n"], a["landed"]] for name, a in summary["with_aurvane"]["by_attack"].items()]
    total, landed = sum(a[1] for a in attacks), sum(a[2] for a in attacks)
    shown = P["aurvane"]["stats"]["attacksWith"]["display"]
    if shown != f"{landed} of {total}":
        raise SystemExit(f"worlds.py: the benchmark file says {landed} of {total} attacks landed, the site says {shown}")
    land = json.loads((ROOT / "data" / "land_mask.json").read_text())
    return {
        "dpc": {"deep": [round(growth["deep"][i], 2) for i in idx], "market": [round(growth["market"][i], 2) for i in idx],
                "from": w["dates"][0][:4], "to": w["dates"][-1][:4]},
        # Where each simulated plan stands after 20 years (its funded ratio), the same futures under two policies.
        "pension": {"learned": [round(p[-1], 3) for p in fans["Learned policy"]], "glide": [round(p[-1], 3) for p in fans["Glide path"]]},
        "wsl": {"next": P["world-shock-lab"]["stats"]["nextDecision"]["display"], "w": land["width"], "h": land["height"], "bits": land["bits"]},
        "tsfm": {"ratio": _num(P["tsfm"]["stats"]["patchTest"]["display"]), "lo": float(ci.group(1)), "hi": float(ci.group(2))},
        "aurvane": {"attacks": attacks},
    }


def cards(P: dict, status) -> dict:
    """The words under each world: the result in a sentence, then what the drawing shows."""
    d, pn, ws, ts, av = "deep-portfolio-constructor", "pension-lab", "world-shock-lab", "tsfm", "aurvane"
    summary = json.loads((ROOT / "data" / "measurements" / "aurvane" / "worst-case_summary.json").read_text())["with_aurvane"]
    stopped = summary["poisoned_tasks"] - summary["attacks_landed"]
    return {
        d: ("wealthDeep",
            f'What $1 in 30 US industries grew to since 1960, after costs. The market: {_b(P, d, "wealthMarket")}. '
            f'By the test fixed in advance: {_b(P, d, "vsMktVerdictDeep")}.',
            "The ridge is that dollar's growth, 1960 to 2026, with a seam every ten years. The dashed line inside it is the market."),
        pn: ("costHeadline",
             f'What a pension promise costs per $100, in simulation (the usual rule: {_b(P, pn, "costGlide")}). '
             f'On real history, {_b(P, pn, "histLearned")} against {_b(P, pn, "histGlide")}: {_b(P, pn, "histVerdict")}.',
             "Each mark in its rings is one simulated plan, placed by where it stands after 20 years. Bright: the learned policy. Dim: the usual rule."),
        ws: ("tsxFed",
             f'A 10 bp Fed surprise, on Canadian stocks that day. {_b(P, ws, "replications")} published findings replicated; '
             f'{_b(P, ws, "liveInside90")} live forecasts inside their 90% band.',
             f'Lit where the sun is right now. The wave leaves Washington. <span data-sky-next>The next forecast is for {_b(P, ws, "nextDecision")}.</span>'),
        ts: ("patchTest",
             f'Forecast error against the standard method, on tests it had never seen. '
             f'{_b(P, ts, "flagged")} series that overlap the benchmark were found and removed first.',
             "The dashed ring is the standard method. The model's ring sits inside it: less error. Its width is the 95% interval."),
        av: ("attacksWith",
             f'Hidden-instruction attacks that got through; without it, {_b(P, av, "attacksWithout")}. '
             f'A simulated worst-case agent: real models not run yet.',
             f"Thirty attacks arrive. The shield stops {stopped}; the {summary['attacks_landed']} that land are the two kinds it does not claim to stop."),
    }


def section(P: dict, order: list[str], status) -> str:
    text = cards(P, status)
    items = []
    for pid in order:
        p, (key, line, shows) = P[pid], text[pid]
        items.append(
            f'<li class="sky-world" data-world="{KIND[pid]}" data-tint="{TINT[pid]}"><a href="#story-{pid}">'
            f'<span class="w-orb" aria-hidden="true"></span>'
            f'<span class="w-top"><span class="num">{p["number"]}</span><span class="w-role">{e(ROLE[pid])}</span>{status(pid)}</span>'
            f'<strong class="w-title">{e(p["study"] if p.get("group") == "investing" else p["title"])}</strong>'
            f'{_b(P, pid, key, "fig")}'
            f'<span class="w-line">{line}</span>'
            f'<span class="w-key"><b>What you see</b> {shows}</span>'
            f'</a></li>')
    blob = e(json.dumps(data(P), separators=(",", ":")), quote=True)
    return f"""<section class="section sky" id="sky" aria-labelledby="sky-title">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="label">The route</p>
          <h2 id="sky-title">Five worlds, one line</h2>
          <p>The whole voyage at a glance, before it starts. Each stop is a world, and each world is drawn from its own results: nothing on it is decoration. Pick one to travel there.</p>
        </div>
        <div class="sky-stage" data-sky="{blob}">
          <ol class="sky-worlds">{"".join(items)}</ol>
          <button class="sky-pause" type="button" data-sky-pause aria-pressed="false" hidden>Pause</button>
        </div>
      </div>
    </section>"""
