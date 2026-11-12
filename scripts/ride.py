"""The ride: one dollar, January 1960, and three trains to today.

The first thing under the opening screen. The reader picks a train (hold the
market, follow a momentum rule, or the neural network of the wealth study) and
rides it through 801 months of real, out-of-sample returns: the dollar counts up,
the market's real falls arrive as storms, and the other two trains run alongside.
At the end stand the three results and the finding the whole site is about: by the
test fixed in advance, one gap is real and the other cannot be told from luck.

This module writes the section and hands the drawing (assets/site.js, "The ride")
its numbers. Every month of the three journeys comes from data/dpc_wealth.json, the
file the portfolio page's own chart reads; the storms are the market's falls of a
fifth or more, found here from that series (dates and depths are computed, only
their everyday names are typed); every figure in the words is a data-bind into
data/projects.json. The build stops if a journey does not end on its published
figure. Without JavaScript the section is its words and the three results.
"""

from __future__ import annotations

import html
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
e = html.escape
PID = "deep-portfolio-constructor"

# The three trains: the series in data/dpc_wealth.json, the stat that publishes where it ends, and how the page names it.
TRAINS = [
    ("market", "market", "wealthMarket", "The market", "Buy everything, and never touch it."),
    ("momentum", "momentum_tilt", "wealthMomentum", "The momentum rule", "Lean toward what has been rising. A rule from the 1990s."),
    ("deep", "deep", "wealthDeep", "The neural network", "My model: it re-reads 30 industries every month."),
]
# Everyday names for the falls, by the year of the low. A fall with no entry is shown by its years alone.
NAMES = {1974: "the oil shock", 1987: "Black Monday", 2002: "the dot-com bust", 2009: "the financial crisis", 2020: "the pandemic"}
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def _num(text: str) -> float:
    return float(re.search(r"\d+(?:\.\d+)?", text.replace(",", "")).group(0))


def _b(P: dict, key: str, cls: str = "") -> str:
    c = f' class="{cls}"' if cls else ""
    return f'<span{c} data-bind="{PID}.stats.{key}.display">{e(P[PID]["stats"][key]["display"], quote=False)}</span>'


def storms(market: list[float], dates: list[str]) -> list[dict]:
    """Every fall of the market of a fifth or more from its high: when it began, its low, when the high was regained."""
    out, peak, at, cur = [], market[0], 0, None
    for i, v in enumerate(market):
        if v >= peak:
            if cur and cur["depth"] >= 0.2:
                out.append({**cur, "back": i})
            peak, at, cur = v, i, None
        else:
            depth = 1 - v / peak
            if cur is None:
                cur = {"from": at, "low": i, "depth": 0.0}
            if depth > cur["depth"]:
                cur["depth"], cur["low"] = depth, i
    if cur and cur["depth"] >= 0.2:
        out.append({**cur, "back": len(market) - 1})
    for s in out:
        y0, y1 = int(dates[max(s["from"] - 1, 0)][:4]), int(dates[s["low"] - 1][:4])
        s["years"] = str(y1) if y0 == y1 else f"{y0}–{str(y1)[2:]}"
        s["name"] = NAMES.get(y1, "")
        s["depth"] = round(s["depth"] * 100)
    return out


def data(P: dict) -> dict:
    w = json.loads((ROOT / "data" / "dpc_wealth.json").read_text())
    growth, dates = w["growth"], w["dates"]
    series = {}
    for key, name, stat, _, _ in TRAINS:
        s = growth[name]
        shown = _num(P[PID]["stats"][stat]["display"])
        if round(s[-1]) != round(shown):
            raise SystemExit(f"ride.py: the {name} journey ends at {s[-1]:.0f}, the site publishes {shown:.0f}")
        series[key] = [round(10000 * math.log10(max(v, 1e-9))) for v in s]  # log10 x 10,000: four digits a month
    if len({len(v) for v in series.values()}) != 1 or len(series["market"]) != len(dates) + 1:
        raise SystemExit("ride.py: the three journeys and the calendar do not line up")
    return {"start": dates[0], "series": series, "storms": storms(growth["market"], dates),
            "end": {key: P[PID]["stats"][stat]["display"] for key, _, stat, _, _ in TRAINS}}


def section(P: dict) -> str:
    d = data(P)
    y0, m0 = int(d["start"][:4]), int(d["start"][5:7])
    last = len(d["series"]["market"]) - 1
    end_y, end_m = y0 + (m0 - 1 + last - 1) // 12, (m0 - 1 + last - 1) % 12
    picks = "".join(
        f'<label class="ride-train" data-train="{key}"><input type="radio" name="ride-train" value="{key}"{" checked" if key == "deep" else ""}>'
        f'<span class="rt-dot" aria-hidden="true"></span><span class="rt-name">{e(name)}</span><span class="rt-line">{e(line)}</span></label>'
        for key, _, _, name, line in TRAINS)
    hud = "".join(
        f'<li data-train="{key}"><span class="rt-dot" aria-hidden="true"></span><span class="rh-name">{e(name)}</span>'
        f'<span class="rh-you">you</span><output class="rh-val" data-ride-val="{key}">$1.00</output></li>'
        for key, _, _, name, _ in TRAINS)
    blob = e(json.dumps(d, separators=(",", ":"), ensure_ascii=False), quote=True)
    return f"""<section class="section ride" id="ride" aria-labelledby="ride-title">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="label">The ride</p>
          <h2 id="ride-title">One dollar, 1960</h2>
          <p>It is {MONTHS[m0 - 1]} {y0} and you have one dollar. Three trains leave for today. Pick one and ride it through {last} months of real markets: every fall on the way happened.</p>
        </div>
        <div class="ride-stage" data-ride="{blob}">
          <div class="ride-view">
            <p class="ride-date" aria-hidden="true"><span data-ride-date>{MONTHS[m0 - 1]} {y0}</span></p>
            <ol class="ride-hud" aria-label="What one dollar has become on each train">{hud}</ol>
          </div>
          <p class="ride-note" data-ride-note aria-live="polite"></p>
          <div class="ride-desk">
            <fieldset class="ride-pick"><legend>Pick your train</legend>{picks}</fieldset>
            <div class="ride-controls">
              <button class="button button-solid" type="button" data-ride-play>Board</button>
              <label class="ride-scrub"><span class="visually-hidden">Month of the journey</span>
                <input type="range" min="0" max="{last}" step="1" value="0" data-ride-scrub></label>
              <span class="ride-ends" aria-hidden="true"><span>{y0}</span><span>{end_y}</span></span>
            </div>
          </div>
        </div>
        <div class="ride-arrival" data-ride-arrival>
          <p class="label">Arrival, {MONTHS[end_m]} {end_y}</p>
          <ol class="ride-results">
            <li data-train="momentum"><span class="rr-name">The momentum rule</span>{_b(P, "wealthMomentum", "fig")}<span class="rr-line">{_b(P, "vsMktMomentum")} a year over the market, t = {_b(P, "vsMktTMomentum")}: {_b(P, "vsMktVerdictMomentum")}.</span></li>
            <li data-train="deep"><span class="rr-name">The neural network</span>{_b(P, "wealthDeep", "fig")}<span class="rr-line">{_b(P, "vsMktDeep")} a year over the market, t = {_b(P, "vsMktTDeep")}: {_b(P, "vsMktVerdictDeep")}.</span></li>
            <li data-train="market"><span class="rr-name">The market</span>{_b(P, "wealthMarket", "fig")}<span class="rr-line">The one to beat. It needed no decisions at all.</span></li>
          </ol>
          <p class="ride-moral">Sixty-six years, and my own model's lead still cannot be told from luck. The test was written down before the journey was run, so that is the answer I publish. Everything else on this site is built the same way.</p>
          <p class="ride-next"><a class="button" href="projects/deep-portfolio-constructor.html">How it was tested</a><a class="text-link" href="#sky">Next: the five stops on the line</a></p>
        </div>
      </div>
    </section>"""
