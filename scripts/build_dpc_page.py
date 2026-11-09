#!/usr/bin/env python3
"""Build projects/deep-portfolio-constructor.html (the project page) from data/projects.json.

Same rule as the master page: every figure is a data-bind whose fallback text
is copied from the data here, so the page reads correctly without JavaScript
and scripts/check_site.py can verify it. Sentences that depend on a result are
chosen by the pre-registered verdict in the data, never typed. Run after
scripts/sync_dpc.py, then run scripts/sync_chrome.py, which writes the header,
the project label and the previous / next links.
"""

from __future__ import annotations

import html
import json
import struct
from pathlib import Path

import lab  # scripts/lab.py: the interactive pieces, rendered as static HTML first

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
PID = "deep-portfolio-constructor"
P = {p["id"]: p for p in DATA["projects"]}
D = P[PID]
PROTOCOL = "https://github.com/shmorsi/deep-portfolio-constructor/blob/52cf135/docs/wealth_protocol.md"
e = html.escape
term = lab.term


def b(path: str, tag: str = "span", cls: str = "") -> str:
    cur = D
    for part in path.split("."):
        cur = cur[part]
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-bind="{PID}.{path}">{e(str(cur), quote=False)}</{tag}>'


def s(key: str) -> str:  # a stat's display value, bound
    return b(f"stats.{key}.display")


def has(key: str) -> bool:
    return key in D["stats"]


def verdict(key: str) -> str:
    return D["stats"][key]["display"]


def repo_button() -> str:
    """GitHub button from data/projects.json; sync_chrome.py turns it into a note if the repository is private."""
    repo = next(link for link in D["links"] if link["kind"] == "repo")
    return f'<a class="button button-solid" href="{e(repo["href"])}" target="_blank" rel="noopener noreferrer">GitHub</a>'


def png_size(src: str) -> tuple[int, int]:
    with (ROOT / src).open("rb") as f:
        head = f.read(24)
    return struct.unpack(">II", head[16:24])


def figure(src: str, alt: str, caption: str) -> str:
    w, h = png_size(src)
    return f"""<figure class="figure">
            <a class="screen" href="../{src}" target="_blank" rel="noopener" title="Open full size"><img src="../{src}" width="{w}" height="{h}" alt="{e(alt)}" decoding="async" loading="lazy"></a>
            <figcaption>{caption}</figcaption>
          </figure>"""


def results_lead() -> str:
    return {
        "better": "Out of sample from 1960, the network grew wealth faster than simply holding the market, and the pre-registered test says the gap is not luck.",
        "worse": "Out of sample from 1960, the network grew wealth more slowly than simply holding the market, and the pre-registered test says the gap is real.",
    }.get(verdict("vsMktVerdictDeep"), "Out of sample from 1960, the network's edge over simply holding the market is too small to tell from luck.")


def learned() -> str:
    """What the network chose to do, in a sentence that follows the data (every number bound)."""
    start, median = lab.number(D["stats"]["kappaStart"]["display"]), lab.number(D["stats"]["kappaDeep"]["display"])
    if median > 2 * start:
        trade = (f"It did not learn to sit still: its trade fraction started training at {s('kappaStart')} and settled at a median of "
                 f"{s('kappaDeep')}, chasing a target that moved every month.")
    elif median < start / 2:
        trade = f"It learned to hold: its trade fraction fell from {s('kappaStart')} at the start of training to a median of {s('kappaDeep')}."
    else:
        trade = f"Its trade fraction started training at {s('kappaStart')} and had a median of {s('kappaDeep')} out of sample."
    return (f"{trade} It leaned toward value, with a value-factor loading of {s('hmlDeep')} against the market's {s('hmlMarket')}; after "
            f"adjusting for market, size and value, its alpha is {s('alphaDeep')} a year ({term('t-stat', 't')} = {s('alphaTDeep')}).")


def benchmarks_block() -> str:
    """The S&P 500 and the NASDAQ, added after the pre-registered test (only when the data has them)."""
    if not has("wealthSp500"):
        return ""
    return f"""<div class="prose">
          <h3>Against the S&amp;P 500 and the NASDAQ</h3>
          <p>Added after the pre-registered test, as context: the test's benchmark stays the whole US market. With dividends reinvested, $1 in the S&amp;P 500 at the end of 1959 became {s("wealthSp500")} ({s("cagrSp500")} a year). The network's difference from it is {s("vsSpDeep")} a year ({term("t-stat", "t")} = {s("vsSpTDeep")}): {s("vsSpVerdictDeep")}.</p>
          <p>The NASDAQ Composite starts in February 1971, and its free history has no dividends, so it is understated. From then, $1 became {s("wealth1971Nasdaq")} in the NASDAQ, {s("wealth1971Sp500")} in the S&amp;P 500, {s("wealth1971Market")} in the whole market and {s("wealth1971Deep")} with the network: {s("vsNqDeep")} a year against the NASDAQ (t = {s("vsNqTDeep")}): {s("vsNqVerdictDeep")}.</p>
          <div class="table-wrap" tabindex="0" role="region" aria-label="Against the S&amp;P 500 and the NASDAQ" data-table="{PID}.tables.benchmarks"></div>
          <p class="file-note">Sources: Yahoo Finance's S&amp;P 500 total-return index (from 1988), S&amp;P 500 prices and the NASDAQ Composite, with S&amp;P 500 dividends before 1988 from Robert Shiller's monthly data. Where both exist, the joined series tracks the official total-return index with a correlation of {s("spliceCorr")}.</p>
        </div>"""


def schedules_section() -> str:
    """The same network on four rebalancing schedules, added after the pre-registered test."""
    if not has("schedMonthlyWealth"):
        return ""
    names = {"Daily": "every day", "Monthly": "every month", "Quarterly": "every quarter", "Yearly": "every year"}
    best = max(names, key=lambda k: lab.number(D["stats"][f"sched{k}Wealth"]["display"]))
    lead = ("Once a month, the schedule it was trained for, grew the most." if best == "Monthly"
            else f"Rebalancing {names[best]} grew the most.")
    return f"""<section class="cs-section" aria-labelledby="s-schedule">
        <h2 id="s-schedule">How often to trade</h2>
        <div class="prose">
          <p class="big">The same network, rebalanced every day, month, quarter or year. {lead}</p>
          <p>Nothing is retrained. Each schedule runs the trained network on the same {s("years")} years and pays the same 10 bps per trade; only how often it trades changes. This was added after the pre-registered test, which judged the monthly schedule only.</p>
          <ul>
            <li><strong>Every month</strong>, as tested: at each month-end it reads the latest data, sets a target and moves most of the way there.</li>
            <li><strong>Every quarter or every year</strong>: the network is asked only at the end of each quarter, or only each December. In between, prices move the holdings and nothing is traded.</li>
            <li><strong>Every day</strong>: the network still decides at each month-end, because its inputs are monthly. Then at every daily close the portfolio is traded back to the mix it chose, using Kenneth French's daily industry returns. As a check, trading only at month-ends on the daily data gives {s("engineCheckWealth")}, against {s("wealthDeep")} from the monthly engine.</li>
          </ul>
          <p>Trading every day only keeps the portfolio at the month's chosen mix, and it costs more: {s("schedDailyCost")} a year against {s("schedMonthlyCost")}. Trading less often costs less ({s("schedYearlyCost")} a year once a year) but lets the tilts go stale: once a year it grew {s("schedYearlyVs")} a year against the market. That suggests what the network knows about each industry fades within months.</p>
        </div>
        <div class="wide">{lab.schedule_lab()}</div>
        <div class="prose">
          <div class="table-wrap" tabindex="0" role="region" aria-label="Rebalancing schedules" data-table="{PID}.tables.schedules"></div>
        </div>
      </section>"""


def ablation_item(sfx: str, name: str, what: str) -> str:
    if not has(f"wealth{sfx}"):
        return ""
    vs = (f"; {s(f'vsPair{sfx}')} a year against the full network ({term('t-stat', 't')} = {s(f'vsPair{sfx}T')}): {s(f'vsPair{sfx}Verdict')}"
          if has(f"vsPair{sfx}") else "")
    return f"<li><strong>{e(name)}</strong> ({what}): {s(f'wealth{sfx}')}, trading {s(f'traded{sfx}')} a year{vs}.</li>"


def learning_section() -> str:
    """Every network behind the deployed policy, from the project's committed training logs."""
    if not has("trainNetworks"):
        return ""
    return f"""<section class="cs-section" aria-labelledby="s-learn">
        <h2 id="s-learn">How it learned</h2>
        <div class="prose">
          <p class="big">{s("trainNetworks")} networks, each trained on the past only and stopped by years it never trained on.</p>
          <p>The deployed policy is not one network. At each {term("walk-forward", "walk-forward")} refit, every five years from 1959, five seeds are trained on data before the last ten years, those ten years decide when to stop, and the five targets are averaged. Pick a refit to watch its five seeds learn.</p>
          <p>At the first refit every seed starts as the market, because the tilt head is zero at birth, and the median seed found {s("trainFirstGain")} a year of extra growth on the validation decade. After that each seed starts from its own network of five years earlier, and in {s("trainKept")} of those refits early stopping found nothing better and kept it: the network is allowed not to change its mind. Training all {s("trainNetworks")} took {s("trainHours")} of wall-clock time.</p>
        </div>
        <div class="wide">{lab.training_view()}</div>
      </section>"""


def page() -> str:
    t = D["title"]
    desc = ("A long-only portfolio for long-term wealth, built by a neural network in PyTorch: a transformer trained on the growth "
            "of wealth itself through a differentiable simulator of buying, holding and paying to trade, tested out of sample from 1960.")
    ablations = "".join([
        ablation_item("DeepTradeAll", "No learned trade fraction", "it trades all the way to its target every month"),
        ablation_item("DeepMlp", "No attention", "each industry is judged on its own features and the market's, never against its peers"),
        ablation_item("DeepUnanchored", "No market anchor", "it allocates from scratch with no bounds; untrained, it holds equal weights"),
    ])
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>{e(t)} · Sherif Morsi</title>
  <meta name="description" content="{e(desc)}">
  <meta name="author" content="Sherif Morsi">
  <meta name="theme-color" content="#000000">
  <meta name="color-scheme" content="dark light">
  <link rel="canonical" href="https://shmorsi.github.io/projects/{PID}.html">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Sherif Morsi">
  <meta property="og:url" content="https://shmorsi.github.io/projects/{PID}.html">
  <meta property="og:title" content="{e(t)} · Sherif Morsi">
  <meta property="og:description" content="{e(D['purpose'])}">
  <meta property="og:image" content="https://shmorsi.github.io/assets/og-dpc.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{e(t)}: a neural network that builds a long-only portfolio for long-term wealth.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(t)} · Sherif Morsi">
  <meta name="twitter:description" content="{e(D['purpose'])}">
  <meta name="twitter:image" content="https://shmorsi.github.io/assets/og-dpc.png">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="../assets/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
  <link rel="preload" href="../assets/fonts/inter-tight-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../assets/site.css">
  <script>try{{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}}catch(e){{}}</script>
  <script src="../assets/site.js" defer></script>
</head>
<body data-root="../" data-metrics="../data/projects.json">
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header"></header>
  <main id="main">
    <header class="cs-hero wrap">
      <a class="text-link all-link" href="../#work">All projects</a>
      <div class="project-meta"></div>
      <h1>{e(t)}</h1>
      {b("purpose", "p", "cs-purpose")}
      <p class="proves"><span class="label">What it proves</span>{b("proves")}</p>
      {b("summary", "p", "cs-summary")}
      <div class="actions">
        {repo_button()}
        <a class="text-link" href="#s-checks">How the numbers are checked</a>
      </div>
      <p class="stack"><span class="label">Stack</span> Python, PyTorch, pandas, NumPy, cvxpy, statsmodels, pytest</p>
    </header>

    <nav class="subnav" data-subnav aria-label="On this page"></nav>

    <div class="wrap">
      <section class="cs-figure" aria-label="At a glance">
        <div data-glance="{PID}"></div>
        {figure("assets/img/dpc-growth.png", "Growth of $1 invested in January 1960 for seven long-only strategies, on a log scale. The Deep Growth Network is the thick blue line, the market the black one.", "Growth of $1 invested in January 1960, out of sample, net of every trading cost. The same chart is interactive under Results.")}
      </section>
    </div>

    <div class="cs-body wrap">
      <section class="cs-section" aria-labelledby="s-problem">
        <h2 id="s-problem">Objective</h2>
        <div class="prose">
          <p class="big">Grow wealth over decades: buy, hold, and trade only when it pays.</p>
          <p>A long-term investor keeps the compound growth of their wealth, and that is not the average return. Volatility drags compounding down (growth is roughly the average return minus half the variance), and the cost of every trade compounds too. So this network is not trained to forecast returns. It is trained on the quantity the investor keeps: the growth of wealth after costs, the {term("kelly", "Kelly criterion")}.</p>
          <p>The rules are a patient investor's: long-only, fully invested, no leverage, no shorting, no jumping into cash. The universe is Kenneth French's {s("industries")} US industry portfolios, which at every date hold every listed firm in the industry, including the ones that later failed, so there is no {term("survivorship", "survivorship bias")}. The question, fixed in advance: can a neural network beat simply holding the market, out of sample from 1960?</p>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-try">
        <h2 id="s-try">Try it</h2>
        <div class="prose">
          <p class="big">Why the network is trained on growth, not on average return.</p>
          <p>Two made-up assets: a steady market and a riskier industry with a higher average return. Slide toward the risky one. The average return rises all the way; the wealth it compounds into peaks, then falls, because volatility drains growth. The network's loss is the second curve.</p>
        </div>
        <div class="wide">{lab.growth_toy()}</div>
      </section>

      <section class="cs-section" aria-labelledby="s-stack">
        <h2 id="s-stack">The deep stack</h2>
        <div class="prose">
          <p class="big">A transformer that tilts the index, learns when not to trade, and learns from the wealth it ends up with.</p>
          <ul>
            <li><strong>Inputs known at each month-end.</strong> For every industry, 13 features: returns over 1, 3, 12 (skipping the last month), 36 and 60 months, volatility over 1 and 5 years, downside risk, drawdown, beta and correlation with the market, book-to-market and its weight in the index, plus where the current holding sits against the market. For the market as a whole, 7 more: its trend over 1 and 5 years, volatility, drawdown, valuation, the spread between industries and the T-bill rate.</li>
            <li><strong>Attention across industries.</strong> Each industry is a token, with one more for the market; two {term("transformer", "transformer")} blocks let every industry weigh every other before the network decides. {s("params")} parameters.</li>
            <li><strong>Long-only by construction.</strong> The network tilts the market's weights: each industry's weight is multiplied by a factor between a third and three, then the portfolio is rescaled to 100%. Always fully invested, never short, never levered. The tilt starts at zero, so an untrained network holds exactly the market and has to earn every deviation from it.</li>
            <li><strong>A learned trade fraction.</strong> A second head reads the market token and decides how much of the gap between today's holdings and the target to trade this month: none of it is buy and hold, all of it a full rebalance. How much to trade is learned, not set by hand.</li>
            <li><strong>Trained on the outcome.</strong> A {term("differentiable", "differentiable simulator")} plays the investing rules forward: holdings drift with prices, every trade costs 10 bps, and the loss is minus the log growth of wealth over five-year episodes. Gradients flow back through 60 months of compounding, so a trade today is judged by the years after it.</li>
            <li><strong>Walk-forward, pre-registered.</strong> The network is refit every five years on past data only ({term("walk-forward", "walk-forward")}), with the last ten years of each window held out to decide when to stop training. Five seeds; the deployed policy averages them. The protocol, the comparisons and the decision rule were {term("pre-registered", "pre-registered")} in git before the network was run out of sample.</li>
          </ul>
        </div>
      </section>

{learning_section()}

      <section class="cs-section" aria-labelledby="s-results">
        <h2 id="s-results">Results</h2>
        <div class="prose">
          <p class="big">{e(results_lead())}</p>
          <p>$1 invested in January 1960 became {s("wealthDeep")} with the network and {s("wealthMarket")} in the market: {s("cagrDeep")} a year against {s("cagrMarket")}. The yearly difference in log growth is {s("vsMktDeep")}, with a Newey-West {term("t-stat", "t")} of {s("vsMktTDeep")} and a 95% block-bootstrap interval of {s("vsMktCiDeep")}: {s("vsMktVerdictDeep")}. It traded {s("tradedDeep")} of the portfolio a year, an average holding period of {s("holdDeep")}, and its weights differed from the index's by {s("activeDeep")} on average ({term("active-share", "active share")}).</p>
          <p>{learned()}</p>
          <p>The strongest classical rival is a simple momentum tilt, {s("vsMktMomentum")} a year above the market. Against it the network's difference is {s("deepVsMomentum")} (t = {s("deepVsMomentumT")}): {s("deepVsMomentumVerdict")}. Against the classical growth optimiser, which chases the same goal with estimated returns and risks: {s("deepVsGrowth")} (t = {s("deepVsGrowthT")}): {s("deepVsGrowthVerdict")}.</p>
          <p>Pick a strategy to see its path and what it did differently. The full table is under the chart.</p>
        </div>
        <div class="wide">{lab.portfolio_lab("lab-dpc")}</div>
        <div class="prose">
          <div class="table-wrap" tabindex="0" role="region" aria-label="Strategy comparison" data-table="{PID}.tables.performance"></div>
          <p>A long-term investor does not get to pick 1960. Slide the start year to see what $1 became from any January to today.</p>
        </div>
        <div class="wide">{lab.start_toy()}</div>
        {benchmarks_block()}
      </section>

      <section class="cs-section" aria-labelledby="s-holdings">
        <h2 id="s-holdings">Inside the portfolio</h2>
        <div class="prose">
          <p class="big">What the network actually held: drag through {s("years")} years.</p>
          <p>Each pair is one industry: the outline is the market's weight, the bar the network's. Press play to watch its holdings through the oil shocks of the 1970s, the technology boom, 2008 and 2020, or point at an industry to read its weights.</p>
        </div>
        <div class="wide">{lab.holdings_view("../data/dpc_wealth.json")}</div>
        <div class="prose">
          {figure("assets/img/dpc-tilts.png", "Heatmap of the network's tilt against the market weight for each of the 30 industries, in five-year averages from 1960. Blue cells are overweights, red underweights.", "The network's tilt against each industry's market weight, averaged over five-year blocks: blue is overweight, red underweight.")}
        </div>
      </section>

      {schedules_section()}

      <section class="cs-section" aria-labelledby="s-decades">
        <h2 id="s-decades">Decade by decade</h2>
        <div class="prose">
          <p class="big">Long-term wealth is made over decades, so the comparison is too.</p>
          <p>In {s("beatDeep")} of the rolling ten-year windows since 1960 the network grew faster than the market; the momentum tilt did in {s("beatMomentum")}.</p>
          <div class="table-wrap" tabindex="0" role="region" aria-label="Growth by decade" data-table="{PID}.tables.decades"></div>
          {figure("assets/img/dpc-rolling.png", "Line chart of rolling ten-year growth above the market for the Deep Growth Network, the momentum tilt and equal weight, from 1970.", "Growth above the market over each rolling ten-year window, % a year.")}
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-ablation">
        <h2 id="s-ablation">What each part adds</h2>
        <div class="prose">
          <p class="big">Switch off one idea at a time.</p>
          <p>Each ablation was fixed in the protocol and trained with two seeds, 42 and 43, so it is compared with the full network averaged over the same two seeds, which turned $1 into {s("wealthDeepPair") if has("wealthDeepPair") else "the figure in the repository"}.</p>
          <ul>{ablations}</ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-robust">
        <h2 id="s-robust">Robustness</h2>
        <div class="prose">
          <ul>
            <li><strong>Seeds.</strong> Each seed's network on its own turned $1 into {s("seedsDeep")}: {s("seedsBeatDeep")} ended above the market. The deployed policy averages the five.</li>
            <li><strong>Costs.</strong> The same decisions re-priced: {s("costDeep0")} a year against the market with free trading, {s("costDeep25")} at 25 bps a trade and {s("costDeep50")} at 50 bps.</li>
            <li><strong>Risk.</strong> Volatility {s("volDeep")} a year against the market's {s("volMarket")}; worst calendar year {s("worstYearDeep")} against {s("worstYearMarket")}; market {term("beta", "beta")} {s("betaDeep")}.</li>
            <li><strong>Factor-adjusted.</strong> Fama-French three-factor alpha {s("alphaDeep")} a year (t = {s("alphaTDeep")}): what its tilts earned beyond exposure to the market, small firms and value.</li>
          </ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-limits">
        <h2 id="s-limits">Limits</h2>
        <div class="prose">
          <div class="callout">
            <p>Industries, not funds: an investor in 1960 could not buy these 30 portfolios cheaply, and sector funds came decades later. Costs are a flat 10 bps a trade, with no taxes or market impact; a taxable investor also pays tax on realised gains, which favours trading even less.</p>
            <p>The features carry hindsight. Momentum, value and low volatility were documented by finance research long after 1960, so the network was handed inputs an investor then would not have known to look at. The pre-registration fixes the test, not the feature list.</p>
            <p>One country, one century: the US market from 1960 was among the best in the world, and five seeds of one network on one history is a small sample. Several strategies were compared; the pre-registered primary test is the one to read.</p>
          </div>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-checks">
        <h2 id="s-checks">Checks</h2>
        <div class="prose">
          <p>{s("tests")} automated tests, including: the PyTorch simulator reproduces the NumPy backtest engine month by month; an untrained network holds exactly the market; every portfolio is long-only and fully invested; no training label is dated inside the validation window; and the features at any date are the same whether or not later data exists.</p>
          <p>The market portfolio rebuilt from the 30 industries tracks French's own market return with a correlation of {s("dataCorr")}. As calibration, a deliberately cheating policy that sees next month's returns, inside the same bounds and costs, turns $1 into {s("oracle")}: the simulator pays for real foresight, so an honest result should look nothing like that.</p>
          <p>The protocol is <a href="{PROTOCOL}" target="_blank" rel="noopener noreferrer"><code>docs/wealth_protocol.md</code></a>, committed before the out-of-sample run.</p>
          <p class="file-note">Figures on this page are read from <a href="../data/projects.json"><code>data/projects.json</code></a>, copied from the project's committed <a href="https://github.com/shmorsi/deep-portfolio-constructor/blob/main/reports/site_wealth.json" target="_blank" rel="noopener noreferrer"><code>reports/site_wealth.json</code></a>.</p>
        </div>
      </section>

      <nav class="project-switch" aria-label="Other projects"></nav>
    </div>
  </main>
  <footer class="site-footer"></footer>
</body>
</html>
"""


def main() -> None:
    out = ROOT / "projects" / f"{PID}.html"
    out.write_text(page(), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
