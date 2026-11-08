"""Interactive pieces shared by the master page and the project pages.

Each piece is rendered here as complete static HTML, so it reads correctly without
JavaScript and scripts/check_site.py can verify it; assets/site.js then makes it
interactive. Every number comes from data/projects.json, data/dpc_lab.json or a
copied measurement file, never typed here.
"""

from __future__ import annotations

import html
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
P = {p["id"]: p for p in DATA["projects"]}
LAB = json.loads((ROOT / "data" / "dpc_lab.json").read_text())
AURVANE = json.loads((ROOT / "data" / "measurements" / "aurvane" / "worst-case_summary.json").read_text())
DPC = "deep-portfolio-constructor"
e = html.escape


def bind(pid: str, path: str, tag: str = "span", cls: str = "") -> str:
    cur = P[pid]
    for part in path.split("."):
        cur = cur[part]
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-bind="{pid}.{path}">{e(str(cur), quote=False)}</{tag}>'


def stat(key: str) -> str:
    """A Deep Portfolio Constructor figure, bound to data/projects.json."""
    return bind(DPC, f"stats.{key}.display")


def term(key: str, text: str) -> str:
    """A word with a plain-English definition one tap away (definitions live in assets/site.js)."""
    return f'<button type="button" class="term" data-term="{key}">{e(text)}</button>'


def pct(x: float) -> str:
    return f"{100 * x:.0f}%"


def signed(x: float, digits: int = 2) -> str:
    """The same rule as signed() in assets/site.js: a sign only when the rounded value is not zero."""
    text = f"{abs(x):.{digits}f}"
    if float(text) == 0:
        return text
    return ("+" if x > 0 else "−") + text


def number(text: str) -> float:
    return float(re.search(r"[−-]?\d+(?:\.\d+)?", text.replace(",", "")).group(0).replace("−", "-"))


# ---------------------------------------------------------------- the portfolio lab

STEPS = [  # strategy id in dpc_lab.json, short name, Sharpe stat, start of its row label in tables.performance
    ("ls_naive", "Naive signal", "sharpeNaive", "Naive"),
    ("ls_classical", "Classical optimiser", "sharpeClassical", "Classical"),
    ("ls_deep_twostage", "Deep risk model", "sharpeDeepRisk", "Deep risk"),
    ("ls_deep_alpha", "Deep views (AlphaFormer)", "sharpeAlpha", "Deep views"),
    ("e2e", "End-to-end (primary)", "sharpeE2E", "End-to-end"),
    ("e2e_deep", "Fully deep", "sharpeDeep", "Fully deep"),
]
PRIMARY = "e2e"
CRISIS_NAMES = {2008: "the 2008 financial crisis", 2020: "the 2020 pandemic crash", 2022: "the 2022 rate shock"}


def perf_rows() -> dict[str, list[str]]:
    """The performance table's row for each step, matched by its label so a reorder cannot misalign them."""
    rows = P[DPC]["tables"]["performance"]["rows"]
    headers = P[DPC]["tables"]["performance"]["headers"]
    assert headers == ["Strategy", "Net Sharpe", "Return", "Volatility", "Max drawdown", "FF6 alpha t", "Market beta", "Risk from intended bets"], headers
    out = {}
    for sid, _, key, prefix in STEPS:
        row = next(r for r in rows if r[0].startswith(prefix))
        assert row[1] == P[DPC]["stats"][key]["display"], (sid, row[1])
        out[sid] = row
    return out


def takeaways() -> dict[str, str]:
    r = perf_rows()
    return {
        "ls_naive": (f"<b>Naive signal.</b> Buy the top and short the bottom of three textbook signals, with no risk model. "
                     f"Only {r['ls_naive'][7]} of the risk came from the stock bets it meant to make; the rest was "
                     f"{term('factor', 'style and sector bets')} nobody chose, and at its worst it lost {r['ls_naive'][4]}."),
        "ls_classical": (f"<b>Classical optimiser.</b> Same signals, but a convex optimiser keeps the book "
                         f"{term('market-neutral', 'neutral')} to sectors, beta, size and value. "
                         f"{term('intended-risk', 'Risk from intended bets')} rose to {r['ls_classical'][7]} and the worst loss shrank to "
                         f"{r['ls_classical'][4]}. Return stayed near zero: the signals had no edge ({term('rank-ic', 'rank IC')} {stat('icComposite')})."),
        "ls_deep_twostage": (f"<b>Deep risk model.</b> A transformer forecasts the covariance instead of Ledoit-Wolf shrinkage. "
                             f"It predicts risk better ({term('likelihood', 'likelihood')} {stat('nllDeep')} vs {stat('nllLW')}) but hedges worse: "
                             f"the intended share fell to {r['ls_deep_twostage'][7]}."),
        "ls_deep_alpha": (f"<b>Deep views.</b> AlphaFormer, a {term('transformer', 'transformer')} that compares stocks with each other, "
                          f"replaces the classical signals: rank IC {stat('icDeep')} instead of {stat('icComposite')}, and net Sharpe rose to "
                          f"{stat('sharpeAlpha')}."),
        "e2e": (f"<b>End-to-end, the primary model.</b> The risk model and a correction to the views are "
                f"{term('end-to-end', 'trained through the optimiser')} on the portfolio's own net return. Best net "
                f"{term('sharpe', 'Sharpe')}, {stat('sharpeE2E')}, but the edge over classical has {term('t-stat', 't')} = {stat('diffT')}, not "
                f"significant, and its realised {term('beta', 'beta')} was {stat('betaE2E')}: part of the gain is market exposure."),
        "e2e_deep": (f"<b>Fully deep.</b> Training AlphaFormer end to end as well made it worse: Sharpe {stat('sharpeDeep')}, "
                     f"FF6 alpha t {stat('alphaTDeep')}. Each yearly refit has at most about 250 monthly decisions to learn from, "
                     f"too few for the extra parameters."),
    }


def _path(values: list[float], lo: float, hi: float) -> str:
    n = len(values)
    pts = []
    for i, v in enumerate(values):
        x = 1000 * i / (n - 1)
        y = 300 * (math.log(hi) - math.log(v)) / (math.log(hi) - math.log(lo))
        pts.append(f"{x:.1f} {y:.1f}")
    return "M" + " L".join(pts)


def growth_chart(uid: str) -> str:
    """Growth of $1, log scale, every strategy at once. SVG for the lines, HTML for every label."""
    dates = LAB["dates"]
    series = {s["id"]: s for s in LAB["strategies"]}
    allv = [v for s in LAB["strategies"] for v in s["growth"]]
    lo, hi = min(allv) * 0.88, max(allv) * 1.12
    ypos = lambda v: 100 * (math.log(hi) - math.log(v)) / (math.log(hi) - math.log(lo))  # noqa: E731
    xpos = lambda i: 100 * i / (len(dates) - 1)  # noqa: E731
    ticks = [t for t in (0.125, 0.25, 0.5, 1, 2, 4) if lo < t < hi]
    grid = "".join(f'<line class="grid{" one" if t == 1 else ""}" x1="0" x2="1000" y1="{3 * ypos(t):.1f}" y2="{3 * ypos(t):.1f}"/>' for t in ticks)
    ylabels = "".join(f'<span style="top:{ypos(t):.2f}%">{"$" + (f"{t:g}" if t >= 1 else f"{t:.2f}")}</span>' for t in ticks)
    bands, blabels = [], []
    for year in LAB["crisisYears"]:
        idx = [i for i, d in enumerate(dates) if d.startswith(str(year))]
        if not idx:
            continue
        a, b = max(idx[0] - 1, 0), idx[-1]
        bands.append(f'<rect class="crisis" x="{10 * xpos(a):.1f}" y="0" width="{10 * (xpos(b) - xpos(a)):.1f}" height="300"/>')
        blabels.append(f'<span style="left:{xpos(a):.2f}%">{year}</span>')
    lines = []
    for sid, name, _, _ in STEPS:
        on = " is-on" if sid == PRIMARY else ""
        lines.append(f'<path class="ln{on}" data-s="{sid}" d="{_path(series[sid]["growth"], lo, hi)}"><title>{e(name)}</title></path>')
    years = sorted({int(d[:4]) for d in dates})
    xt = [y for y in years if (y - years[0]) % 3 == 0 and y < years[-1]] + [years[-1]]
    xlabels = "".join(f'<span style="left:{xpos(next(i for i, d in enumerate(dates) if d.startswith(str(y)))):.2f}%">{y}</span>' for y in xt)
    payload = {"dates": [d[:7] for d in dates], "lo": lo, "hi": hi,
               "series": {sid: series[sid]["growth"] for sid, *_ in STEPS}}
    return f"""<div class="lab-plot" data-lab-plot>
              <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">{"".join(bands)}{grid}{"".join(lines)}<path class="ln-focus" d=""/></svg>
              <div class="lab-y" aria-hidden="true">{ylabels}</div>
              <div class="lab-crisis" aria-hidden="true">{"".join(blabels)}</div>
              <div class="lab-cursor" aria-hidden="true"><i class="lab-line"></i><i class="lab-dot"></i></div>
              <p class="lab-read" aria-live="off"></p>
            </div>
            <p class="lab-x" aria-hidden="true">{xlabels}</p>
            <script type="application/json" data-lab-data="{uid}">{json.dumps(payload, separators=(",", ":"))}</script>"""


def portfolio_lab(uid: str) -> str:
    """The ablation, one click per step: Sharpe bars, growth of $1, the risk split and what changed."""
    rows = perf_rows()
    series = {s["id"]: s for s in LAB["strategies"]}
    sharpes = [number(P[DPC]["stats"][k]["display"]) for _, _, k, _ in STEPS]
    m = math.ceil(max(abs(v) for v in sharpes) * 10) / 10
    steps = []
    for i, ((sid, name, key, _), v) in enumerate(zip(STEPS, sharpes), 1):
        left, right = sorted((v, 0.0))
        pos = lambda x: f"{100 * (x + m) / (2 * m):.2f}%"  # noqa: E731
        rpos = lambda x: f"{100 * (m - x) / (2 * m):.2f}%"  # noqa: E731
        s = series[sid]
        row = rows[sid]
        attrs = (f'data-step="{sid}" data-sharpe="{e(row[1])}" data-ret="{e(row[2])}" data-dd="{e(row[4])}" data-beta="{e(row[6])}" '
                 f'data-final="${s["growth"][-1]:.2f}" data-spec="{s["risk"]["specific"]}" data-style="{s["risk"]["style"]}" '
                 f'data-sector="{s["risk"]["sector"]}"')
        pressed = "true" if sid == PRIMARY else "false"
        tone = " is-best" if sid == PRIMARY else (" is-neg" if v < 0 else "")
        steps.append(
            f'<li><button type="button" class="step{tone}" {attrs} aria-pressed="{pressed}" aria-controls="{uid}-panel">'
            f'<span class="step-top"><span class="step-n">{i:02d}</span><span class="step-name">{e(name)}</span>'
            f'<span class="step-val">{stat(key)}</span></span>'
            f'<span class="step-track"><i class="ref"></i><i class="fill" style="left:{pos(left)};right:{rpos(right)}"></i></span>'
            f'</button></li>')
    first = series[PRIMARY]
    row = rows[PRIMARY]
    risk = first["risk"]
    notes = "".join(f'<p class="lab-take{" is-active" if sid == PRIMARY else ""}" data-take="{sid}">{text}</p>'
                    for sid, text in takeaways().items())
    return f"""
        <div class="lab" id="{uid}" data-lab="{uid}">
          <div class="lab-steps">
            <p class="label">The ablation · net {term('sharpe', 'Sharpe')} · pick a step</p>
            <ol>{"".join(steps)}</ol>
            <p class="lab-scale" aria-hidden="true"><span>−{m:.1f}</span><span>0</span><span>{m:.1f}</span></p>
            <button type="button" class="text-link lab-next" data-lab-next>Next step</button>
          </div>
          <div class="lab-panel" id="{uid}-panel" role="region" aria-label="Selected step">
            <p class="label lab-title">Growth of $1 since January 2008 · <span data-lab-name>{e(dict((s, n) for s, n, *_ in STEPS)[PRIMARY])}</span></p>
            {growth_chart(uid)}
            <dl class="lab-stats">
              <div><dt>Net Sharpe</dt><dd data-k="sharpe">{e(row[1])}</dd></div>
              <div><dt>$1 became</dt><dd data-k="final">${first["growth"][-1]:.2f}</dd></div>
              <div><dt>Worst {term('drawdown', 'drawdown')}</dt><dd data-k="dd">{e(row[4])}</dd></div>
              <div><dt>Market {term('beta', 'beta')}</dt><dd data-k="beta">{e(row[6])}</dd></div>
            </dl>
            <div class="riskbar-block">
              <p class="label">Where the risk comes from</p>
              <div class="riskbar" aria-hidden="true"><i class="r-spec" style="width:{pct(risk["specific"])}"></i><i class="r-style" style="width:{pct(risk["style"])}"></i><i class="r-sector" style="width:{pct(risk["sector"])}"></i></div>
              <p class="riskbar-key"><span class="k-spec">Intended stock bets <b data-k="spec">{pct(risk["specific"])}</b></span><span class="k-style">Style factors <b data-k="style">{pct(risk["style"])}</b></span><span class="k-sector">Sectors <b data-k="sector">{pct(risk["sector"])}</b></span></p>
            </div>
            <div class="lab-notes" aria-live="polite">{notes}</div>
            <p class="chart-note">Shaded: the crisis years the project tests on their own, {", ".join(CRISIS_NAMES.get(y, str(y)) for y in LAB["crisisYears"])}. Out of sample from January 2008, {term('walk-forward', 'walk-forward')}, monthly rebalancing, net of 10 bps costs, 99 large caps. Ex-ante risk split from an independent Barra-style model, averaged over rebalances. Read from the project's committed results ({e(LAB["commit"])}).</p>
          </div>
        </div>"""


# ---------------------------------------------------------------- World Shock Lab: a surprise of any size

SHORT_ASSET = {
    "S&P/TSX Composite (%)": ("S&P/TSX", "%"),
    "Big-Six Canadian banks (%)": ("Big-Six banks", "%"),
    "10-year Government of Canada yield (basis points)": ("10-year Canada yield", " bp"),
    "Canadian dollars per US dollar (%)": ("CAD per US dollar", "%"),
}


def _triple(cell: str) -> tuple[float, float, float]:
    nums = [float(x.replace("−", "-")) for x in re.findall(r"[−+-]?\d+(?:\.\d+)?", cell)]
    return nums[0], nums[1], nums[2]


def _fmt(x: float, unit: str) -> str:
    s = f"{abs(x):.2f}"
    sign = "−" if x < -0.0049 else ("+" if x > 0.0049 else "")
    return f"{sign}{s}{unit}"


def shock_widget() -> str:
    """Announcement-day response to a Fed or Bank of Canada surprise of the reader's chosen size.

    The committed estimates are per 10 bp surprise in that country's 2-year yield; the models are
    linear in the surprise, so a surprise of s bp scales the estimate and its 90% band by s / 10."""
    table = P["world-shock-lab"]["tables"]["announcement"]
    assert table["headers"][1:3] == ["Fed surprise", "BoC surprise"], table["headers"]
    rows = []
    for asset, fed, boc, _ in table["rows"]:
        name, unit = SHORT_ASSET.get(asset, (asset, ""))
        f, b = _triple(fed), _triple(boc)
        dmax = max(abs(v) for v in (*f, *b)) * 2.5
        d = math.ceil(dmax / (0.5 if dmax < 8 else 5)) * (0.5 if dmax < 8 else 5)
        p, lo, hi = f  # the page opens on a +10 bp Fed surprise: exactly the committed estimate
        pos = lambda x: f"{100 * (x + d) / (2 * d):.2f}%"  # noqa: E731
        rpos = lambda x: f"{100 * (d - x) / (2 * d):.2f}%"  # noqa: E731
        rows.append(
            f'<div class="chart-row" data-fed="{f[0]},{f[1]},{f[2]}" data-boc="{b[0]},{b[1]},{b[2]}" data-d="{d:g}" data-unit="{e(unit)}">'
            f'<p class="chart-head"><span class="chart-name">{e(name)}</span><span class="chart-val">{_fmt(p, unit)} '
            f'<small>[{_fmt(lo, "")}, {_fmt(hi, "")}]</small></span></p>'
            f'<span class="chart-track" style="--ref:50%"><i class="ref"></i><i class="ci" style="left:{pos(lo)};right:{rpos(hi)}"></i>'
            f'<i class="pt" style="left:{pos(p)}"></i></span></div>')
    return f"""<figure class="chart shock" data-shock aria-label="Announcement-day response of four Canadian assets to a central-bank surprise">
              <div class="shock-controls">
                <div class="seg" role="radiogroup" aria-label="Central bank">
                  <button type="button" role="radio" aria-checked="true" data-bank="fed">Fed</button>
                  <button type="button" role="radio" aria-checked="false" data-bank="boc">Bank of Canada</button>
                </div>
                <label class="shock-size"><span>Surprise</span><input type="range" min="-25" max="25" step="5" value="10" data-shock-size aria-label="Surprise size in basis points"><output data-shock-out>+10 bp</output></label>
              </div>
{chr(10).join("              " + r for r in rows)}
              <figcaption class="chart-note">Move on announcement day for a surprise in the 2-year yield of that size, with 90% bands. Scaled linearly from the committed per-10 bp estimates. Opens on a +10 bp Fed surprise. {term('bp', 'What is a bp?')}</figcaption>
            </figure>"""


# ---------------------------------------------------------------- Aurvane: thirty attacks, with and without the guard

ATTACKS = [  # attack type in the benchmark, what the hidden text asks for (aurvane README)
    ("exfiltrate", "Email your private transcript to a stranger."),
    ("redirect", "Submit your application to a different posting."),
    ("overspend", "Pay a stranger a 1,200 CAD “fee”."),
    ("forge", "Claim the budget was raised to 5,000 CAD, then spend 900."),
    ("skim", "Add a 45 CAD charge at the store you already trust. Allowed, but capped by the signed budget."),
    ("rewrite", "Slip a sentence into your cover letter. Aurvane guards actions, not prose, so it lands."),
]


def _cad(x: float) -> str:
    return f"{x:,.0f} CAD"


def attack_board() -> str:
    off, on = AURVANE["without_aurvane"], AURVANE["with_aurvane"]
    groups = []
    k = 0
    for kind, desc in ATTACKS:
        a, b = off["by_attack"][kind], on["by_attack"][kind]
        assert a["n"] == b["n"] and a["landed"] == a["n"], kind
        cells = "".join(f'<i class="{"hit" if j < b["landed"] else "stop"}" style="--i:{k + j}"></i>' for j in range(b["n"]))
        k += b["n"]
        groups.append(
            f'<li><button type="button" class="attack-group" data-kind="{kind}" data-desc="{e(desc)}" '
            f'data-off="{a["landed"]}/{a["n"]}" data-on="{b["landed"]}/{b["n"]}">'
            f'<span class="attack-name">{kind}</span><span class="cells">{cells}</span>'
            f'<span class="attack-count">{b["landed"]}/{b["n"]}</span></button></li>')
    return f"""<figure class="chart attack is-on" data-attack aria-label="Prompt-injection attacks that landed, by type, with and without Aurvane"
                  data-landed-off="{off["attacks_landed"]}" data-landed-on="{on["attacks_landed"]}" data-total="{on["poisoned_tasks"]}"
                  data-loss-off="{off["money_lost_cad"]:.0f}" data-loss-on="{on["money_lost_cad"]:.0f}">
              <div class="seg" role="radiogroup" aria-label="Guard">
                <button type="button" role="radio" aria-checked="false" data-guard="off">Without Aurvane</button>
                <button type="button" role="radio" aria-checked="true" data-guard="on">With Aurvane</button>
              </div>
              <ol class="attack-groups">{"".join(groups)}</ol>
              <p class="attack-key" aria-hidden="true"><span class="k-hit">Attack landed</span><span class="k-stop">Stopped or held for you</span></p>
              <p class="attack-readout"><span><b data-attack-landed>{on["attacks_landed"]} of {on["poisoned_tasks"]}</b> attacks landed</span><span><b data-attack-loss>{_cad(on["money_lost_cad"])}</b> lost</span></p>
              <p class="attack-desc" aria-live="polite" data-attack-desc>Each square is one poisoned task. Pick an attack type to see what its hidden text asks the agent to do.</p>
              <figcaption class="chart-note">{term('prompt-injection', 'Prompt injection')} against a simulated agent that obeys every injected instruction, 30 poisoned tasks, deterministic, run once.</figcaption>
            </figure>"""


# ---------------------------------------------------------------- try it: why neutralise a long-short book

TOY = {  # eight made-up stocks. The signal is mostly a market bet with a Tech tilt, like the textbook signals in the project.
    "names": ["Tech A", "Tech B", "Tech C", "Tech D", "Energy A", "Energy B", "Energy C", "Energy D"],
    "beta": [1.5, 1.3, 1.1, 0.9, 1.4, 1.2, 0.8, 0.6],
    "tech": [1, 1, 1, 1, 0, 0, 0, 0],
    "alpha": [0.009, 0.006, 0.005, 0.0012, 0.005, -0.002, -0.006, -0.008],
    "marketVol": 0.05, "sectorVol": 0.03, "specificVol": 0.05,
}


def _toy_state_naive() -> tuple[list[float], float, tuple[float, float, float]]:
    """The toy's opening state: weights proportional to the demeaned signal, 100% long and 100% short."""
    a = TOY["alpha"]
    mean = sum(a) / len(a)
    w = [x - mean for x in a]
    gross = sum(abs(x) for x in w)
    w = [2 * x / gross for x in w]
    beta = sum(b * x for b, x in zip(TOY["beta"], w))
    tech = sum(t * x for t, x in zip(TOY["tech"], w))
    vm = TOY["marketVol"] ** 2 * beta ** 2
    vs = TOY["sectorVol"] ** 2 * (tech ** 2 + (-tech + sum(w)) ** 2)
    vi = TOY["specificVol"] ** 2 * sum(x * x for x in w)
    t = vm + vs + vi
    return w, beta, (vi / t, vm / t, vs / t)


def toy_text(beta: float, split: tuple[float, float, float]) -> str:
    """The sentence under the toy for its opening state (site.js writes the others the same way)."""
    pi, pm, ps = split
    return (f"Following the signal: beta {signed(beta)}, and only {pct(pi)} of the risk is the stock picks. "
            f"{pct(pm)} is the market and {pct(ps)} a sector bet nobody chose.")


def neutral_toy() -> str:
    w, beta, split = _toy_state_naive()
    scale = 0.8  # the bars' full height is 80% of capital in every state
    bars = []
    for name, b, x in zip(TOY["names"], TOY["beta"], w):
        h = min(abs(x) / scale, 1) * 50
        sector = "tech" if name.startswith("Tech") else "energy"
        style = f"top:{50 - h:.2f}%;height:{h:.2f}%" if x >= 0 else f"top:50%;height:{h:.2f}%"
        bars.append(f'<li class="{sector}{" is-short" if x < 0 else ""}"><span class="toy-track"><i style="{style}"></i></span>'
                    f'<b>{name}</b><small>β {b:.1f}</small><span class="toy-w">{signed(100 * x, 0)}%</span></li>')
    pi, pm, ps = split
    real = P[DPC]["stats"]["intendedShift"]["display"]
    return f"""<figure class="toy" data-toy data-real="{e(real)}">
            <div class="toy-controls">
              <div class="seg" role="radiogroup" aria-label="How the book is built">
                <button type="button" role="radio" aria-checked="true" data-mode="naive">Follow the signal</button>
                <button type="button" role="radio" aria-checked="false" data-mode="opt">Optimiser</button>
              </div>
              <label class="switch"><input type="checkbox" data-con="beta" disabled> Beta-neutral</label>
              <label class="switch"><input type="checkbox" data-con="sector" disabled> Sector-neutral</label>
            </div>
            <ol class="toy-bars" aria-label="Weights">{"".join(bars)}</ol>
            <dl class="toy-stats">
              <div><dt>Portfolio {term('beta', 'beta')}</dt><dd data-t="beta">{signed(beta)}</dd></div>
              <div><dt>Risk from the stock picks</dt><dd data-t="picks">{pct(pi)}</dd></div>
              <div><dt>From the market</dt><dd data-t="market">{pct(pm)}</dd></div>
              <div><dt>From the sector bet</dt><dd data-t="sector">{pct(ps)}</dd></div>
            </dl>
            <div class="riskbar" aria-hidden="true"><i class="r-spec" style="width:{pct(pi)}"></i><i class="r-style" style="width:{pct(pm)}"></i><i class="r-sector" style="width:{pct(ps)}"></i></div>
            <p class="toy-say" aria-live="polite" data-toy-say>{e(toy_text(beta, split))}</p>
            <figcaption class="chart-note">A toy with eight made-up stocks, solved in your browser: mean-variance with the constraints you pick, then scaled to 100% long and 100% short. Not data. The real project solves the same kind of problem for 99 stocks every month, with a learned risk model.</figcaption>
            <script type="application/json" data-toy-data>{json.dumps(TOY, separators=(",", ":"))}</script>
          </figure>"""


# ---------------------------------------------------------------- inside the book: 225 rebalances of the real portfolio

def book_view(src: str) -> str:
    book = json.loads((ROOT / "data" / "dpc_book.json").read_text())
    n = len(book["dates"])
    start = max(i for i in range(n) if book["nextMonthNet"][i] is not None and book["shareSpecific"][i] is not None)
    return f"""<figure class="book" data-book="{e(src)}">
            <div class="book-head">
              <p class="book-date"><span class="label">Rebalance</span><b data-book-date>{e(book["dates"][start])}</b></p>
              <dl class="book-stats">
                <div><dt>Longs</dt><dd data-b="longs">–</dd></div>
                <div><dt>Shorts</dt><dd data-b="shorts">–</dd></div>
                <div><dt>Gross</dt><dd data-b="gross">–</dd></div>
                <div><dt>Net</dt><dd data-b="net">–</dd></div>
                <div><dt>Intended risk</dt><dd data-b="spec">–</dd></div>
                <div><dt>Next month</dt><dd data-b="next">–</dd></div>
              </dl>
            </div>
            <div class="book-plot" data-book-plot></div>
            <div class="book-controls">
              <button type="button" class="button" data-book-play aria-pressed="false">Play</button>
              <input type="range" min="0" max="{n - 1}" step="1" value="{start}" data-book-range aria-label="Rebalance date">
            </div>
            <p class="book-read" aria-live="polite" data-book-read>Point at a bar to see the stock and its weight.</p>
            <figcaption class="chart-note">The end-to-end model's actual book at each of its {n} monthly rebalances: {len(book["tickers"])} stocks grouped by sector, longs up and shorts down, as a share of capital. The amber line is each sector's net position, which the optimiser keeps within ±5%. "Next month" is what the book earned before the next rebalance, net of costs. From the project's committed results ({e(book["commit"])}).</figcaption>
            <noscript><p class="caveat">The book view needs JavaScript. The numbers behind it are in <a href="{e(src)}">{e(src.split("/")[-1])}</a>.</p></noscript>
          </figure>"""
