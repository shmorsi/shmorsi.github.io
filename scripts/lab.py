"""Interactive pieces shared by the master page and the project pages.

Each piece is rendered here as complete static HTML, so it reads correctly without
JavaScript and scripts/check_site.py can verify it; assets/site.js then makes it
interactive. Every number comes from data/projects.json, data/dpc_wealth.json or a
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
WEALTH = json.loads((ROOT / "data" / "dpc_wealth.json").read_text())
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


def source_link(commit: str, path: str, text: str) -> str:
    """A link to a committed file in the project's repository, or plain text while the repository is private."""
    repo = next(link for link in P[DPC]["links"] if link["kind"] == "repo")
    if repo.get("public") is False:
        return e(text)
    return f'<a href="{e(repo["href"])}/tree/{e(commit)}/{e(path)}" target="_blank" rel="noopener noreferrer">{e(text)}</a>'


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



# ---------------------------------------------------------------- the wealth lab: $1 in 1960, seven ways

STRATEGIES = [  # id in dpc_wealth.json, short name, stat suffix in data/projects.json
    ("market", "Market (hold the index)", "Market"),
    ("equal_weight", "Equal weight", "Equal"),
    ("min_variance", "Minimum variance", "MinVar"),
    ("risk_parity", "Risk parity", "RiskParity"),
    ("growth_classical", "Classical growth optimiser", "Growth"),
    ("momentum_tilt", "Momentum tilt", "Momentum"),
    ("deep", "Deep Growth Network", "Deep"),
]
PRIMARY = "deep"


def stat_text(key: str) -> str:
    return str(P[DPC]["stats"][key]["display"])


def sampled(values: list[float], dates: list[str]) -> tuple[list[float], list[str]]:
    """The starting point, then every quarter-end: enough for a 66-year chart, a third of the bytes."""
    keep = [0] + [i + 1 for i, d in enumerate(dates) if d[5:7] in ("03", "06", "09", "12") or i == len(dates) - 1]
    labels = [WEALTH["start"]] + dates
    return [values[i] for i in keep], [labels[i] for i in keep]


def market_stress(values: list[float], depth: float = 0.2) -> list[tuple[int, int]]:
    """Runs of months in which the market was at least ``depth`` below its previous peak (from the data itself)."""
    runs, peak, start = [], values[0], None
    for i, v in enumerate(values):
        peak = max(peak, v)
        down = v <= (1 - depth) * peak
        if down and start is None:
            start = i
        if not down and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(values) - 1))
    return runs


def _path(values: list[float], lo: float, hi: float) -> str:
    n = len(values)
    return "M" + " L".join(f"{1000 * i / (n - 1):.1f} {300 * (math.log(hi) - math.log(v)) / (math.log(hi) - math.log(lo)):.1f}"
                           for i, v in enumerate(values))


def growth_chart(uid: str) -> str:
    dates = WEALTH["dates"]
    full_market = WEALTH["growth"]["market"]
    series, labels = {}, None
    for sid, *_ in STRATEGIES:
        series[sid], labels = sampled(WEALTH["growth"][sid], dates)
    bench = sampled(WEALTH["benchmarks"]["sp500"], dates)[0] if WEALTH.get("benchmarks") else None
    allv = [v for vals in series.values() for v in vals] + (bench or [])
    lo, hi = min(allv) * 0.8, max(allv) * 1.25
    ypos = lambda v: 100 * (math.log(hi) - math.log(v)) / (math.log(hi) - math.log(lo))  # noqa: E731
    xfull = lambda i: 100 * i / (len(full_market) - 1)  # noqa: E731
    ticks = [t for t in (1, 10, 100, 1000, 10000) if lo < t < hi]
    grid = "".join(f'<line class="grid{" one" if t == 1 else ""}" x1="0" x2="1000" y1="{3 * ypos(t):.1f}" y2="{3 * ypos(t):.1f}"/>' for t in ticks)
    ylabels = "".join(f'<span style="top:{ypos(t):.2f}%">${t:,}</span>' for t in ticks)
    bands = "".join(f'<rect class="crisis" x="{10 * xfull(a):.1f}" y="0" width="{max(10 * (xfull(b) - xfull(a)), 2):.1f}" height="300"/>'
                    for a, b in market_stress(full_market))
    lines = "".join(f'<path class="ln{" is-on" if sid == PRIMARY else ""}{" is-ref" if sid == "market" else ""}" data-s="{sid}" '
                    f'd="{_path(series[sid], lo, hi)}"><title>{e(name)}</title></path>' for sid, name, _ in STRATEGIES)
    if bench:  # a fixed reference, not one of the strategies to pick
        lines += f'<path class="ln is-bench" data-bench="sp500" d="{_path(bench, lo, hi)}"><title>S&amp;P 500, dividends reinvested</title></path>'
    years = sorted({int(d[:4]) for d in labels})
    xt = [y for y in years if y % 10 == 0] + ([years[-1]] if years[-1] % 10 else [])
    # The final, partial decade's year is dropped on phones (CSS), where it would collide with the decade before it.
    xlabels = "".join(f'<span{" class=\"is-end\"" if y % 10 else ""} style="left:{100 * next(i for i, d in enumerate(labels) if d.startswith(str(y))) / (len(labels) - 1):.2f}%">{y}</span>' for y in xt)
    payload = {"dates": labels, "lo": lo, "hi": hi, "series": series}
    return f"""<div class="lab-plot" data-lab-plot>
              <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">{bands}{grid}{lines}<path class="ln-focus" d=""/></svg>
              <div class="lab-y" aria-hidden="true">{ylabels}</div>
              <div class="lab-cursor" aria-hidden="true"><i class="lab-line"></i><i class="lab-dot"></i></div>
              <p class="lab-read" aria-live="off"></p>
            </div>
            <p class="lab-x" aria-hidden="true">{xlabels}</p>
            <script type="application/json" data-lab-data="{uid}">{json.dumps(payload, separators=(",", ":"))}</script>"""


def versus_market(sfx: str) -> str:
    """'+0.59% a year against the market (t = 0.87): no detectable difference', every part bound."""
    return (f"{stat('vsMkt' + sfx)} a year against the market ({term('t-stat', 't')} = {stat('vsMktT' + sfx)}): "
            f"{stat('vsMktVerdict' + sfx)}")


def takeaways() -> dict[str, str]:
    st = stat
    return {
        "market": (f"<b>Market.</b> Buy every industry at its market weight and hold it: the index fund most professional "
                   f"managers fail to beat. $1 in 1960 became {st('wealthMarket')}, {st('cagrMarket')} a year, trading only "
                   f"{st('tradedMarket')} of the portfolio a year as the index itself changes."),
        "equal_weight": (f"<b>Equal weight.</b> Put 1/30 in every industry each January and sit: a bet on the smaller "
                         f"industries. {versus_market('Equal')}."),
        "min_variance": (f"<b>Minimum variance.</b> The lowest-risk long-only mix and the smoothest ride (worst fall "
                         f"{st('mddMinVar')} against the market's {st('mddMarket')}), but it lags whenever the largest "
                         f"industries lead. {versus_market('MinVar')}."),
        "risk_parity": (f"<b>Risk parity.</b> Equal risk from every industry, rebalanced each January. "
                        f"{versus_market('RiskParity')}."),
        "growth_classical": (f"<b>Classical growth optimiser.</b> The textbook version of the network's own goal: maximise "
                             f"{term('kelly', 'long-run growth')} from estimated returns and risks, inside the same bounds. "
                             f"$1 became {st('wealthGrowth')}, {versus_market('Growth')}."),
        "momentum_tilt": (f"<b>Momentum tilt.</b> Overweight the industries that rose most over the past year. "
                          f"{versus_market('Momentum')}. The price: it trades {st('tradedMomentum')} of the portfolio a year."),
        "deep": deep_takeaway(),
    }


def deep_takeaway() -> str:
    """The network's note. The sentence follows the pre-registered verdict; every number is bound."""
    st = stat
    verdict = stat_text("vsMktVerdictDeep")
    reading = {"better": "better by the pre-registered test",
               "worse": "worse by the pre-registered test"}.get(verdict, "too small to tell from luck by the pre-registered test")
    return (f"<b>Deep Growth Network.</b> A {term('transformer', 'transformer')} trained on the growth of wealth itself, through a "
            f"{term('differentiable', 'simulator')} that charges for every trade. $1 became {st('wealthDeep')}: {st('vsMktDeep')} a year "
            f"against the market ({term('t-stat', 't')} = {st('vsMktTDeep')}), {reading}. It trades {st('tradedDeep')} of the portfolio "
            f"a year and moves a median {st('kappaDeep')} of the way from its holdings to its target each month.")


def portfolio_lab(uid: str) -> str:
    """Seven ways to invest $1 in 1960: pick one to see its path, its risk and what it did differently."""
    wealth = {sid: WEALTH["growth"][sid][-1] for sid, *_ in STRATEGIES}
    top = max(wealth.values())
    steps = []
    for i, (sid, name, suffix) in enumerate(STRATEGIES, 1):
        pressed = "true" if sid == PRIMARY else "false"
        tone = " is-best" if sid == PRIMARY else (" is-ref" if sid == "market" else "")
        vs = "" if sid == "market" else f'data-vs="{e(stat_text("vsMkt" + suffix))}" data-vst="{e(stat_text("vsMktT" + suffix))}" data-verdict="{e(stat_text("vsMktVerdict" + suffix))}"'
        attrs = (f'data-step="{sid}" data-wealth="{e(stat_text("wealth" + suffix))}" data-cagr="{e(stat_text("cagr" + suffix))}" '
                 f'data-dd="{e(stat_text("mdd" + suffix))}" data-traded="{e(stat_text("traded" + suffix))}" {vs}')
        steps.append(
            f'<li><button type="button" class="step{tone}" {attrs} aria-pressed="{pressed}" aria-controls="{uid}-panel">'
            f'<span class="step-top"><span class="step-n">{i:02d}</span><span class="step-name">{e(name)}</span>'
            f'<span class="step-val">{stat("wealth" + suffix)}</span></span>'
            f'<span class="step-track"><i class="fill" style="left:0;right:{100 * (1 - wealth[sid] / top):.2f}%"></i></span>'
            f'</button></li>')
    first = dict((sid, suffix) for sid, _, suffix in STRATEGIES)[PRIMARY]
    notes = "".join(f'<p class="lab-take{" is-active" if sid == PRIMARY else ""}" data-take="{sid}">{text}</p>' for sid, text in takeaways().items())
    return f"""
        <div class="lab" id="{uid}" data-lab="{uid}">
          <div class="lab-steps">
            <p class="label">$1 invested in January 1960 · pick a strategy</p>
            <ol>{"".join(steps)}</ol>
            <button type="button" class="text-link lab-next" data-lab-next>Next strategy</button>
          </div>
          <div class="lab-panel" id="{uid}-panel" role="region" aria-label="Selected strategy">
            <p class="label lab-title">Growth of $1 since 1960, log scale · <span data-lab-name>{e(dict((s, n) for s, n, _ in STRATEGIES)[PRIMARY])}</span></p>
            {growth_chart(uid)}
            <dl class="lab-stats">
              <div><dt>$1 became</dt><dd data-k="wealth">{stat_text("wealth" + first)}</dd></div>
              <div><dt>Per year ({term('cagr', 'CAGR')})</dt><dd data-k="cagr">{stat_text("cagr" + first)}</dd></div>
              <div><dt>Worst {term('drawdown', 'fall')}</dt><dd data-k="dd">{stat_text("mdd" + first)}</dd></div>
              <div><dt>Traded per year</dt><dd data-k="traded">{stat_text("traded" + first)}</dd></div>
            </dl>
            <p class="lab-vs" data-lab-vs>Against the market: <b data-k="vs">{stat_text("vsMkt" + first)}</b> a year of growth, {term('t-stat', 't')} = <b data-k="vst">{stat_text("vsMktT" + first)}</b>: <b data-k="verdict">{stat_text("vsMktVerdict" + first)}</b>.</p>
            <div class="lab-notes" aria-live="polite">{notes}</div>
            <p class="chart-note">{bench_note()}Shaded: months when the market was 20% or more below its previous peak. Long-only, fully invested, every trade costs 10 bps, out of sample from January 1960 to {e(WEALTH["dates"][-1][:4])}. Kenneth French's 30 US industry portfolios, which include the firms that later failed. Read from the project's {source_link(WEALTH["commit"], "reports/results/wealth", "committed results")} ({e(WEALTH["commit"])}).</p>
          </div>
        </div>"""


def bench_note() -> str:
    if "wealthSp500" not in P[DPC]["stats"]:
        return ""
    return f'<span class="key-bench" aria-hidden="true"></span>Dashed amber: the S&amp;P 500 with dividends reinvested, {stat("wealthSp500")}. '


# ---------------------------------------------------------------- how often to trade: the same network on four schedules

SCHEDULE_TEXT = {
    "daily": ("Every day", "The network still decides at each month-end; then at every daily close the portfolio is traded back to the mix it chose."),
    "monthly": ("Every month", "As tested: at each month-end it reads the latest data, sets a target and moves most of the way there."),
    "quarterly": ("Every quarter", "The network is asked only at the end of March, June, September and December; in between, prices move the holdings."),
    "yearly": ("Every year", "The network is asked only each December; for the other eleven months the portfolio is left alone."),
}


def schedule_lab() -> str:
    """The same trained network on four rebalancing schedules; opens on the tested one (monthly)."""
    if not WEALTH.get("schedules"):
        return ""
    dates = WEALTH["dates"]
    series = {n: sampled(WEALTH["schedules"][n], dates)[0] for n in SCHEDULE_TEXT}
    market, labels = sampled(WEALTH["growth"]["market"], dates)
    sp = sampled(WEALTH["benchmarks"]["sp500"], dates)[0] if WEALTH.get("benchmarks") else None
    allv = [v for vals in series.values() for v in vals] + market + (sp or [])
    lo, hi = min(allv) * 0.8, max(allv) * 1.25
    ypos = lambda v: 100 * (math.log(hi) - math.log(v)) / (math.log(hi) - math.log(lo))  # noqa: E731
    ticks = [t for t in (1, 10, 100, 1000, 10000) if lo < t < hi]
    grid = "".join(f'<line class="grid{" one" if t == 1 else ""}" x1="0" x2="1000" y1="{3 * ypos(t):.1f}" y2="{3 * ypos(t):.1f}"/>' for t in ticks)
    ylabels = "".join(f'<span style="top:{ypos(t):.2f}%">${t:,}</span>' for t in ticks)
    lines = f'<path class="ln is-ref" d="{_path(market, lo, hi)}"><title>Whole US market</title></path>'
    if sp:
        lines += f'<path class="ln is-bench" d="{_path(sp, lo, hi)}"><title>S&amp;P 500, dividends reinvested</title></path>'
    lines += "".join(f'<path class="ln{" is-on" if n == "monthly" else ""}" data-sched-line="{n}" d="{_path(series[n], lo, hi)}">'
                     f'<title>{e(SCHEDULE_TEXT[n][0])}</title></path>' for n in SCHEDULE_TEXT)
    years = sorted({int(d[:4]) for d in labels})
    xt = [y for y in years if y % 10 == 0] + ([years[-1]] if years[-1] % 10 else [])
    xlabels = "".join(f'<span{" class=\"is-end\"" if y % 10 else ""} style="left:{100 * next(i for i, d in enumerate(labels) if d.startswith(str(y))) / (len(labels) - 1):.2f}%">{y}</span>' for y in xt)
    buttons = []
    for n, (name, say) in SCHEDULE_TEXT.items():
        sfx = n.capitalize()
        attrs = " ".join(f'data-{k}="{e(stat_text(f"sched{sfx}{v}"))}"' for k, v in
                         (("wealth", "Wealth"), ("gross", "Gross"), ("traded", "Traded"), ("cost", "Cost"), ("vs", "Vs"), ("vst", "T"), ("verdict", "Verdict")))
        buttons.append(f'<button type="button" role="radio" aria-checked="{str(n == "monthly").lower()}" data-sched="{n}" data-say="{e(say)}" {attrs}>{e(name)}</button>')
    m = "Monthly"
    return f"""<figure class="toy sched" data-schedules aria-label="The same network rebalanced every day, month, quarter or year">
            <div class="seg" role="radiogroup" aria-label="How often it rebalances">{"".join(buttons)}</div>
            <div class="lab-plot sched-plot" data-sched-plot>
              <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">{grid}{lines}</svg>
              <div class="lab-y" aria-hidden="true">{ylabels}</div>
            </div>
            <p class="lab-x" aria-hidden="true">{xlabels}</p>
            <dl class="toy-stats">
              <div><dt>$1 became</dt><dd data-sk="wealth">{stat_text(f"sched{m}Wealth")}</dd></div>
              <div><dt>Before costs</dt><dd data-sk="gross">{stat_text(f"sched{m}Gross")}</dd></div>
              <div><dt>Traded per year</dt><dd data-sk="traded">{stat_text(f"sched{m}Traded")}</dd></div>
              <div><dt>Cost per year</dt><dd data-sk="cost">{stat_text(f"sched{m}Cost")}</dd></div>
            </dl>
            <p class="lab-vs">Against the market: <b data-sk="vs">{stat_text(f"sched{m}Vs")}</b> a year of growth, {term('t-stat', 't')} = <b data-sk="vst">{stat_text(f"sched{m}T")}</b>: <b data-sk="verdict">{stat_text(f"sched{m}Verdict")}</b>.</p>
            <p class="toy-say" aria-live="polite" data-sched-say>{e(SCHEDULE_TEXT["monthly"][1])}</p>
            <figcaption class="chart-note">The same trained network on each schedule, nothing retrained, every trade at 10 bps, January 1960 to {e(month_name_text(WEALTH["dates"][-1]))}. Dashed grey: the whole US market; dashed amber: the S&amp;P 500 with dividends reinvested. Added after the pre-registered test, which judged the monthly schedule only. From the project's {source_link(WEALTH["commit"], "reports/results/wealth", "committed results")} ({e(WEALTH["commit"])}).</figcaption>
          </figure>"""


def month_name_text(ym: str) -> str:
    return f"{MONTH_NAMES[int(ym[5:7]) - 1]} {ym[:4]}"


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


# ---------------------------------------------------------------- try it: why growth, not average return

GROWTH_TOY = {  # two made-up assets: the steady market and a riskier industry with a higher average return
    "mu": [0.10, 0.13], "sigma": [0.16, 0.30], "rho": 0.6, "years": 66,
}


def toy_growth(x: float) -> tuple[float, float, float]:
    """(average return, volatility, growth rate) with a share x in the riskier asset; growth = mean - variance / 2."""
    (m1, m2), (s1, s2), r = GROWTH_TOY["mu"], GROWTH_TOY["sigma"], GROWTH_TOY["rho"]
    mean = (1 - x) * m1 + x * m2
    var = (1 - x) ** 2 * s1 ** 2 + x ** 2 * s2 ** 2 + 2 * x * (1 - x) * r * s1 * s2
    return mean, math.sqrt(var), mean - var / 2


def growth_optimum() -> float:
    (m1, m2), (s1, s2), r = GROWTH_TOY["mu"], GROWTH_TOY["sigma"], GROWTH_TOY["rho"]
    a = s1 ** 2 + s2 ** 2 - 2 * r * s1 * s2
    return min(1.0, max(0.0, ((m2 - m1) + s1 ** 2 - r * s1 * s2) / a))


def growth_toy() -> str:
    xs = [i / 100 for i in range(101)]
    gs = [toy_growth(x)[2] for x in xs]
    ms = [toy_growth(x)[0] for x in xs]
    lo, hi = min(min(gs), min(ms)) - 0.005, max(max(gs), max(ms)) + 0.005
    y = lambda v: 300 * (hi - v) / (hi - lo)  # noqa: E731
    gpath = "M" + " L".join(f"{1000 * x:.1f} {y(g):.1f}" for x, g in zip(xs, gs))
    mpath = "M" + " L".join(f"{1000 * x:.1f} {y(m):.1f}" for x, m in zip(xs, ms))
    best = growth_optimum()
    x0 = 1.0
    mean, vol, g = toy_growth(x0)
    years = GROWTH_TOY["years"]
    say = toy_say(x0)
    return f"""<figure class="toy growth-toy" data-growth-toy data-years="{years}">
            <div class="toy-controls">
              <label class="shock-size"><span>Share in the risky industry</span><input type="range" min="0" max="100" step="1" value="{round(100 * x0)}" data-toy-x aria-label="Share in the risky industry, percent"><output data-toy-out>{round(100 * x0)}%</output></label>
            </div>
            <div class="toy-plot">
              <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path class="toy-mean" d="{mpath}"/><path class="toy-growth" d="{gpath}"/>
                <line class="toy-best" x1="{1000 * best:.1f}" x2="{1000 * best:.1f}" y1="0" y2="300"/>
              </svg>
              <i class="toy-dot toy-dot-mean" style="left:{100 * x0:.1f}%;top:{y(mean) / 3:.2f}%"></i>
              <i class="toy-dot toy-dot-growth" style="left:{100 * x0:.1f}%;top:{y(g) / 3:.2f}%"></i>
              <span class="toy-tag toy-tag-mean">Average return</span><span class="toy-tag toy-tag-growth">Growth of wealth</span>
              <span class="toy-tag toy-tag-best" style="left:{100 * best:.1f}%">Most growth: {round(100 * best)}%</span>
            </div>
            <p class="lab-x toy-x" aria-hidden="true"><span style="left:0">0% risky</span><span style="left:50%">50%</span><span style="left:100%">100% risky</span></p>
            <dl class="toy-stats">
              <div><dt>Average return</dt><dd data-t="mean">{100 * mean:.1f}%</dd></div>
              <div><dt>Volatility</dt><dd data-t="vol">{100 * vol:.1f}%</dd></div>
              <div><dt>Growth per year</dt><dd data-t="growth">{100 * g:.1f}%</dd></div>
              <div><dt>$1 after {years} years</dt><dd data-t="wealth">${math.exp(years * g):,.0f}</dd></div>
            </dl>
            <p class="toy-say" aria-live="polite" data-toy-say>{e(say)}</p>
            <figcaption class="chart-note">Made-up numbers, not data: a steady market (10% average return, 16% volatility) and a riskier industry (13%, 30%), correlation 0.6. Growth of wealth is the average return minus half the variance, which is why the network is trained on growth, not on return. <script type="application/json" data-toy-data>{json.dumps(GROWTH_TOY, separators=(",", ":"))}</script></figcaption>
          </figure>"""


def toy_say(x: float) -> str:
    """The sentence under the toy; site.js writes the same sentence as the slider moves."""
    best = growth_optimum()
    years = GROWTH_TOY["years"]
    mean, vol, g = toy_growth(x)
    _, _, gb = toy_growth(best)
    if abs(x - best) <= 0.02:
        return f"{round(100 * x)}% risky is the growth-optimal mix: ${math.exp(years * g):,.0f} after {years} years. Any more risk raises the average return and lowers the wealth."
    if x > best:
        return (f"{round(100 * x)}% risky has the higher average return ({100 * mean:.1f}%) but volatility drags growth down to "
                f"{100 * g:.1f}%: ${math.exp(years * g):,.0f} after {years} years, against ${math.exp(years * gb):,.0f} at {round(100 * best)}%.")
    return (f"{round(100 * x)}% risky is too timid: growth {100 * g:.1f}% a year, ${math.exp(years * g):,.0f} after {years} years, "
            f"against ${math.exp(years * gb):,.0f} at {round(100 * best)}%.")


# ---------------------------------------------------------------- inside the portfolio: the network's holdings, 1960 to today

def holdings_view(src: str) -> str:
    h = WEALTH["holdings"]
    n = len(h["dates"])
    return f"""<figure class="book holdings" data-holdings="{e(src)}">
            <div class="book-head">
              <p class="book-date"><span class="label">Month</span><b data-h-date>{e(h["dates"][-1])}</b></p>
              <dl class="book-stats">
                <div><dt>Biggest overweight</dt><dd data-h="over">–</dd></div>
                <div><dt>Biggest underweight</dt><dd data-h="under">–</dd></div>
                <div><dt>Differs from the index</dt><dd data-h="active">–</dd></div>
                <div><dt>Traded this month</dt><dd data-h="kappa">–</dd></div>
              </dl>
            </div>
            <div class="book-plot" data-h-plot></div>
            <div class="book-controls">
              <button type="button" class="button" data-h-play aria-pressed="false">Play</button>
              <input type="range" min="0" max="{n - 1}" step="1" value="{n - 1}" data-h-range aria-label="Month">
            </div>
            <p class="book-read" aria-live="polite" data-h-read>Point at an industry to see its weight.</p>
            <figcaption class="chart-note">Each pair is one of the 30 industries: the outline is its weight in the market, the bar what the network held, sampled each quarter from 1960. The network scales each industry's market weight by a factor between a third and three, then rescales the portfolio to 100%; it never shorts. From the project's {source_link(WEALTH["commit"], "reports/results/wealth", "committed results")} ({e(WEALTH["commit"])}).</figcaption>
            <noscript><p class="caveat">The holdings view needs JavaScript. The numbers behind it are in <a href="{e(src)}">{e(src.split("/")[-1])}</a>.</p></noscript>
          </figure>"""


# ---------------------------------------------------------------- your start year: $1 from any January to today

MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def start_years() -> dict:
    """For every start year with at least ten years to run: what $1 became, network and market (from dpc_wealth.json)."""
    dates, g = WEALTH["dates"], WEALTH["growth"]
    out: dict = {"years": [], "end": dates[-1], "deep": [], "market": [], "cagrDeep": [], "cagrMarket": []}
    for year in sorted({int(d[:4]) for d in dates}):
        i = next(k for k, d in enumerate(dates) if int(d[:4]) == year)  # growth[i] is the value at the end of the month before
        months = len(dates) - i
        if months < 120:
            break
        for sid, ckey in (("deep", "cagrDeep"), ("market", "cagrMarket")):
            mult = g[sid][-1] / g[sid][i]
            out[sid].append(round(mult, 4))
            out[ckey].append(round(mult ** (12 / months) - 1, 6))
        out["years"].append(year)
    return out


def _money(x: float) -> str:
    """Cents below $100, so two amounts side by side are written the same way (site.js matches)."""
    return f"${x:,.0f}" if x >= 100 else f"${x:,.2f}"


def start_say(s: dict, i: int) -> str:
    """The sentence under the start-year slider; site.js writes the same sentence as it moves."""
    end = f"{MONTH_NAMES[int(s['end'][5:7]) - 1]} {s['end'][:4]}"
    lead = "the network" if s["deep"][i] > s["market"][i] else "the market"
    return (f"Invested in January {s['years'][i]} and left to the rules until {end}: {lead} ended ahead, "
            f"{100 * s['cagrDeep'][i]:.2f}% a year for the network against {100 * s['cagrMarket'][i]:.2f}% for the market.")


def start_toy() -> str:
    s = start_years()
    ahead = sum(d > m for d, m in zip(s["deep"], s["market"]))
    i = 0
    return f"""<figure class="toy start-toy" data-start-toy>
            <div class="toy-controls">
              <label class="shock-size"><span>Start investing in January</span><input type="range" min="{s["years"][0]}" max="{s["years"][-1]}" step="1" value="{s["years"][i]}" data-start-year aria-label="Start year"><output data-start-out>{s["years"][i]}</output></label>
            </div>
            <dl class="toy-stats">
              <div><dt>$1 became, network</dt><dd data-s="deep">{_money(s["deep"][i])}</dd></div>
              <div><dt>$1 became, market</dt><dd data-s="market">{_money(s["market"][i])}</dd></div>
              <div><dt>Per year, network</dt><dd data-s="cagrDeep">{100 * s["cagrDeep"][i]:.2f}%</dd></div>
              <div><dt>Per year, market</dt><dd data-s="cagrMarket">{100 * s["cagrMarket"][i]:.2f}%</dd></div>
            </dl>
            <p class="toy-say" aria-live="polite" data-start-say>{e(start_say(s, i))}</p>
            <figcaption class="chart-note">The same out-of-sample run, read from a later start: nothing is refit. Of the {len(s["years"])} start years from {s["years"][0]} to {s["years"][-1]}, each with at least ten years to run, the network ended ahead in {ahead}. Net of costs, from <a href="../data/dpc_wealth.json">data/dpc_wealth.json</a>. <script type="application/json" data-start-data>{json.dumps(s, separators=(",", ":"))}</script></figcaption>
          </figure>"""
