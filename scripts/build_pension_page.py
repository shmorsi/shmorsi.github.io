#!/usr/bin/env python3
"""Build projects/pension-lab.html from data/projects.json.

Every figure on the page is a data-bind whose fallback text is copied from the data file here, and
every table is a data-table filled from the same file, so scripts/check_site.py can verify the page
and it reads correctly without JavaScript. The sentences that state a verdict take it from the data
(the project's stats hold the pre-registered verdicts), so the page cannot claim more than the test found.

Run after scripts/sync_pension.py:  python3 scripts/build_pension_page.py, then scripts/sync_chrome.py
"""

from __future__ import annotations

import html
import json
from pathlib import Path

import lab  # scripts/lab.py: term(), the one-tap definitions

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
PID = "pension-lab"
P = next(p for p in DATA["projects"] if p["id"] == PID)
REPO = "https://github.com/shmorsi/deep-portfolio-constructor"
e = html.escape
t = lab.term


def b(path: str, tag: str = "span") -> str:
    cur = P
    for part in path.split("."):
        cur = cur[part]
    return f'<{tag} data-bind="{PID}.{path}">{e(str(cur), quote=False)}</{tag}>'


def stat(key: str) -> str:
    return b(f"stats.{key}.display")


def table(name: str) -> str:
    """A table slot. assets/site.js fills it from data/projects.json; the same rows are written here, in the same
    markup, so the page reads in full without JavaScript."""
    tb = P["tables"][name]
    head = "".join(f'<th scope="col">{e(h)}</th>' for h in tb["headers"])
    body = "".join(("<tr class=\"is-best\">" if tb.get("highlightRow") == r else "<tr>")
                   + "".join(f'<th scope="row">{e(str(c))}</th>' if i == 0 else f"<td>{e(str(c))}</td>" for i, c in enumerate(row)) + "</tr>"
                   for r, row in enumerate(tb["rows"]))
    label = e(tb["caption"].split(".")[0])
    return (f'<div class="table-wrap" tabindex="0" role="region" aria-label="{label}" data-table="{PID}.tables.{name}">'
            f'<p class="table-caption" aria-hidden="true">{e(tb["caption"])}</p>'
            f'<table><caption class="visually-hidden">{e(tb["caption"])}</caption><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>')


def learned_chart() -> str:
    """Share in stocks as the funded ratio alone changes: the glide path and what the network turned it into.

    Drawn from data/pension.json (the study's own description of its policy); the same points are in the table under it."""
    an = json.loads((ROOT / "data" / "pension.json").read_text())["anatomy"]
    x0, x1, y0, y1 = 58, 548, 318, 26
    fr = an["funded"]
    X = lambda v: x0 + (x1 - x0) * (v - fr[0]) / (fr[-1] - fr[0])  # noqa: E731
    Y = lambda w: y0 - (y0 - y1) * w  # noqa: E731
    line = lambda ws: " ".join(f"{X(v):.1f},{Y(w):.1f}" for v, w in zip(fr, ws))  # noqa: E731
    names = sorted(an["learned"], key=lambda k: float(k.rstrip("%")))
    mid = names[len(names) // 2]
    grid = "".join(f'<line class="sc-grid" x1="{x0}" x2="{x1}" y1="{Y(w):.1f}" y2="{Y(w):.1f}"/><text class="sc-tick" x="{x0 - 10}" y="{Y(w) + 4:.1f}" text-anchor="end">{int(w * 100)}%</text>'
                   for w in (0, 0.25, 0.5, 0.75, 1.0))
    ticks = "".join(f'<text class="sc-tick" x="{X(v):.1f}" y="{y0 + 22}" text-anchor="middle">{int(round(v * 100))}%</text>' for v in (0.6, 0.8, 1.0, 1.2, 1.4))
    full = f'<line class="an-full" x1="{X(1.0):.1f}" x2="{X(1.0):.1f}" y1="{y1}" y2="{y0}"/><text class="sc-tick" x="{X(1.0) + 6:.1f}" y="{y1 + 10}">fully funded</text>'
    # Labels sit at the right-hand ends of the lines, pushed apart so they never overlap.
    ends = [("Glide path", an["glide"][-1], "is-glide")] + [(f"Learned, yield at {n}", an["learned"][n][-1], "" if n == mid else "is-alt") for n in names]
    placed, last = [], None
    for label, w, cls in sorted(ends, key=lambda item: -item[1]):
        y = Y(w) + 4
        if last is not None and y - last < 15:
            y = last + 15
        placed.append((label, y, cls))
        last = y
    labels = "".join(f'<line class="an-line {cls}" x1="{x1 + 8}" x2="{x1 + 26}" y1="{y - 4:.1f}" y2="{y - 4:.1f}"/><text class="an-key" x="{x1 + 32}" y="{y:.1f}">{e(label)}</text>'
                     for label, y, cls in placed)
    lines = (f'<polyline class="an-line is-glide" points="{line(an["glide"])}"/>'
             + "".join(f'<polyline class="an-line{"" if n == mid else " is-alt"}" points="{line(an["learned"][n])}"/>' for n in names))
    alt = (f"Share of the fund in stocks against the funded ratio. The glide path falls from {an['glide'][0]:.0%} at {fr[0]:.0%} funded to {an['glide'][-1]:.0%} at {fr[-1]:.0%}; "
           f"the learned policy, with the yield at {mid}, goes from {an['learned'][mid][0]:.0%} to {an['learned'][mid][-1]:.0%}.")
    return (f'<figure class="figure an-figure"><div class="screen"><svg class="an-chart" viewBox="0 0 720 362" role="img" aria-label="{e(alt)}">'
            f'{grid}{ticks}{full}{lines}{labels}'
            f'<text class="sc-tick" x="{(x0 + x1) / 2:.0f}" y="{y0 + 40}" text-anchor="middle">funded ratio when the decision is made</text></svg></div>'
            f'<figcaption>Share of the fund in stocks as the funded ratio alone changes: every other input is held at a middling value, halfway through the 20 years. '
            f'The glide path looks at nothing else; the learned policy also looks at the yield, so it is drawn at three levels of it.</figcaption></figure>')


def tuned_block() -> str:
    """The question a quant asks next: is it the network, or would any rule tuned to the cost do as well?"""
    if "tuned" not in P:
        return ""
    return f"""          <h3>Is it the network, or just a better-tuned rule?</h3>
          <p>The glide path in the test has textbook numbers. So its four numbers were trained on the same simulations, by the same method and for the same score as the network. Tuned, it keeps {stat("tunedShort")} in stocks until the plan is {stat("tunedFrom")} funded and slides to {stat("tunedFunded")} by {stat("tunedTo")}. It costs {stat("costTuned")} on average and {stat("tailTuned")} in the worst 5%, against {stat("costLearned")} and {stat("tailLearned")} for the network and {stat("costGlide")} and {stat("tailGlide")} for the untuned rule. Tuning alone gets {stat("tunedShare")} of the network's improvement in the score.</p>
          <p><strong>{b("tuned")}</strong></p>"""


def why_block() -> str:
    """Where the simulated saving came from: the same policies on futures with no runs of history to read."""
    if "why" not in P:
        return ""
    return f"""          <h3>Where the saving came from</h3>
          <p>The simulated futures are built by replaying history in runs that average twelve months, and the network sees the last twelve months of returns, yields and prices. So the same policies were run, without retraining, on futures whose months are drawn one at a time: nothing in the recent past says anything about what comes next.</p>
          {table("loose")}
          <p>There the network costs {stat("looseLearned")} on average, the glide path {stat("looseGlide")} and the tuned rule {stat("looseTuned")}. Its lead over the tuned rule falls from {stat("tunedLead")} points of score to {stat("looseLead")}: {stat("looseKept")} of what it was.</p>
          <p class="big">{b("why")}</p>"""


def learned_section() -> str:
    """What the scored policy holds, and why its simulated saving did not show up in history.

    Present once the study's description of it (dpc.pension.anatomy) has been synced."""
    if "anatomy" not in P["tables"]:
        return ""
    return f"""
      <section class="cs-section" aria-labelledby="s-learned">
        <h2 id="s-learned">What it learned</h2>
        <div class="prose">
          <p class="big">{b("learned")}</p>
          <p>A lower cost says nothing about how it was earned, so after the test the scored policy was taken apart. While the plan is under 80% funded it keeps {stat("learnedStocksShort")} in stocks, where the glide path keeps {stat("glideStocksShort")}; once the plan is over 110% funded it keeps {stat("learnedStocksFull")}, where the glide path keeps {stat("glideStocksFull")}. The yield moves it more. For plans between 85% and 100% funded it keeps {stat("stocksLowYield")} in stocks when the 10-year yield is under 3% and {stat("stocksHighYield")} when it is over 10%; the glide path keeps {stat("glideStocksYield")} either way. Almost everything else goes into {t("matching-bonds", "matching bonds")}, and its target weights move {stat("weightMove")} of the fund a year: this is a policy that trades.</p>
          {learned_chart()}
          {table("anatomy")}
          {table("anatomyYield")}
{tuned_block()}
{why_block()}
          <p class="caveat">Everything in this section was done after the test, on the same networks (retrained from the same seeds and checked to reproduce the scored result to the last digit). None of it was pre-registered and none of it changes a verdict.</p>
        </div>
      </section>
"""


def page() -> str:
    title = "Pension Lab · Sherif Morsi"
    desc = ("A pension plan that is 90% funded, 60 years of inflation-indexed promises, and five ways to invest: what each costs the plan's sponsor over 20 years, "
            "tested on simulated futures and on real history under rules fixed in advance.")
    alt = f"Pension Lab. What a pension promise costs to keep: {P['stats']['costLearned']['display']} per $100 promised for a learned policy, {P['stats']['costGlide']['display']} for a glide path, in simulation."
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>{e(title)}</title>
  <meta name="description" content="{e(desc)}">
  <meta name="author" content="Sherif Morsi">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#fbfbfd" media="(prefers-color-scheme: light)">
  <meta name="color-scheme" content="dark light">
  <link rel="canonical" href="https://shmorsi.github.io/projects/pension-lab.html">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://shmorsi.github.io/projects/pension-lab.html">
  <meta property="og:title" content="{e(title)}">
  <meta property="og:description" content="{e(P["purpose"])}">
  <meta property="og:image" content="https://shmorsi.github.io/assets/og-pension.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{e(alt)}">
  <meta property="og:site_name" content="Sherif Morsi">
  <meta property="og:locale" content="en_CA">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(title)}">
  <meta name="twitter:description" content="{e(P["purpose"])}">
  <meta name="twitter:image" content="https://shmorsi.github.io/assets/og-pension.png">
  <meta name="twitter:image:alt" content="{e(alt)}">
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
      <p class="label">Pension Lab</p>
      <h1>Keeping a pension promise funded</h1>
      {b("purpose", "p").replace("<p ", '<p class="cs-purpose" ')}
      <p class="proves"><span class="label">What it proves</span>{b("proves")}</p>
      <p class="cs-summary">{b("summary")}</p>
      <div class="actions">
        <a class="button button-solid" href="{REPO}/tree/main/src/dpc/pension" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a class="text-link" href="{REPO}/blob/main/docs/pension_protocol.md" target="_blank" rel="noopener noreferrer">The protocol, fixed first</a>
      </div>
      <p class="stack"><span class="label">Stack</span> {e(", ".join(P["tags"]))}</p>
    </header>

    <div class="wrap">
      <section class="cs-figure" aria-label="At a glance">
        <div data-glance="{PID}"></div>
        <div class="figure-block">
          {table("simulated")}
          <p class="caveat">{b("headline.qualifier")}</p>
        </div>
      </section>
    </div>

    <div class="cs-body wrap">
      <section class="cs-section" aria-labelledby="s-question">
        <h2 id="s-question">The question</h2>
        <div class="prose">
          <p class="big">A pension plan is a promise to pay people for decades. The hard part is not earning a return. It is keeping enough money in the plan to honour the promise whatever markets, interest rates and prices do.</p>
          <p>What a plan owes is its {t("liability", "liability")}; what it holds against it, as a share, is its {t("funded-ratio", "funded ratio")}. When the plan is short, its {t("sponsor", "sponsor")} has to pay in the difference. So the question a pension fund lives with is not "which portfolio grows fastest?" but <strong>"what will this promise cost to keep, and how bad can that get?"</strong> This project builds a small pension plan, measures that cost under the policies plans really use, and asks whether a policy learned by simulation does any better.</p>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-plan">
        <h2 id="s-plan">The plan</h2>
        <div class="prose">
          <ul>
            <li><strong>The promise.</strong> Monthly payments for 60 years, each a little smaller than the last (a mature plan running off), and each paid in the money of its day: fully indexed to consumer prices. Its {t("duration", "duration")} is {stat("duration")} years at a 4% yield.</li>
            <li><strong>What it is worth.</strong> Future payments are projected with expected inflation and discounted at the 10-year government yield. When yields fall, the promise costs more; when prices rise faster than expected, it costs more again.</li>
            <li><strong>Where it starts.</strong> {stat("fundedStart")} funded: ten cents short on every dollar promised.</li>
            <li><strong>What it can hold.</strong> Stocks, 10-year government bonds, and {t("matching-bonds", "matching bonds")} that move with the promise when yields move. No borrowing, no betting against anything, and every trade costs 10 {t("bp", "basis points")}.</li>
            <li><strong>Who pays.</strong> Whenever the plan is short, the sponsor pays in a tenth of the shortfall a year. A surplus is never paid back. <strong>The cost of a future</strong> is everything the sponsor pays in over 20 years plus whatever is still missing at the end, per $100 promised, in today's money.</li>
          </ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-policies">
        <h2 id="s-policies">Five policies</h2>
        <div class="prose">
          <ul>
            <li><strong>60/40.</strong> 60% stocks, 40% bonds, rebalanced every month. The classic, and it ignores the promise entirely.</li>
            <li><strong>Liability-driven 40/60.</strong> 40% stocks, 60% matching bonds: most of the fund moves with the promise.</li>
            <li><strong>Fully matched.</strong> Everything in matching bonds. The gap stops moving with interest rates, and the sponsor pays it off.</li>
            <li><strong>{t("glide-path", "Glide path")}.</strong> 70% stocks while the plan is badly short, sliding to 20% once it is comfortably funded. The rule many plans actually run.</li>
            <li><strong>Learned policy.</strong> A small neural network ({stat("params")} parameters) that starts as the glide path and learns where to leave it. It is trained in PyTorch by {t("differentiable", "differentiating through the simulator")}: its weights set the holdings, the holdings set the plan's assets, the assets set what the sponsor pays, and the gradient of that cost flows all the way back. It sees only what a plan would know that month, never a forecast.</li>
          </ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-test">
        <h2 id="s-test">The test, fixed first</h2>
        <div class="prose">
          <p class="big">Every rule below was committed to the repository before a single test result existed.</p>
          <ul>
            <li><strong>One score.</strong> A policy's average cost plus its average cost in the worst 5% of futures (the {t("expected-shortfall", "expected shortfall")}). The network is trained on it and judged on it.</li>
            <li><strong>Test 1: {stat("scenarios")} simulated futures.</strong> Each {t("scenario", "simulated future")} rearranges what stocks, yields and prices actually did over {stat("months")} months of US history. Training never saw the test futures.</li>
            <li><strong>Test 1b: futures where yields never come back.</strong> In test 1, yields are always pulled back toward their long-run average, and a network can learn to bet on that. So the same policies are run again, without retraining, on futures where yields simply drift.</li>
            <li><strong>Test 2: {stat("starts")} real 20-year periods.</strong> A plan starts every December from 1972 to 2005 and lives through what actually happened next. The network used for each start was trained only on data from before it ({t("walk-forward", "walk-forward")}).</li>
            <li><strong>The decision rule.</strong> If the whole 95% interval for the difference in score is below zero, the learned policy is better; if it is above, worse; otherwise there is no detectable difference. The full text is the <a href="{REPO}/blob/main/docs/pension_protocol.md" target="_blank" rel="noopener noreferrer">protocol</a>.</li>
          </ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-results">
        <h2 id="s-results">Results</h2>
        <div class="prose">
          <p class="big">In simulation the learned policy costs the sponsor {stat("costLearned")} per $100 promised against {stat("costGlide")} for the glide path, and {stat("tailLearned")} against {stat("tailGlide")} when it goes badly. Verdict: {stat("vsGlideVerdict")}.</p>
          {table("simulated")}
          {table("verdicts")}
          <h3>When yields never come back</h3>
          <p>Without retraining, on futures in which the yield just drifts: {stat("walkLearned")} against {stat("walkGlide")} on average, {stat("walkTailLearned")} against {stat("walkTailGlide")} in the worst 5%. Verdict against the glide path: {stat("walkVerdict")}.</p>
          {table("modelRisk")}
          <h3>On real history</h3>
          <p>Across {stat("starts")} real 20-year periods the learned policy cost {stat("histLearned")} per $100 promised against {stat("histGlide")} for the glide path and {stat("hist6040")} for 60/40. Verdict against the glide path: {stat("histVerdict")}. These periods overlap, so they amount to about three independent ones: enough to see a policy fail, not enough to prove a small edge.</p>
          {table("history")}
        </div>
      </section>

{learned_section()}
      <section class="cs-section" aria-labelledby="s-read">
        <h2 id="s-read">How to read it</h2>
        <div class="prose">
          <ul>
            <li><strong>Tests 1 and 1b are run inside a model.</strong> The network was trained on the same kind of simulated future it is tested on. A good score there shows it learned the model well. It does not show the model is the world, and the section above shows which part of the model it leaned on.</li>
            <li><strong>History is the check on that.</strong> The walk through real 20-year periods uses networks that never saw the years they were tested on. Its verdict is the one to weigh most, and it is reported whichever way it went.</li>
            <li><strong>The baselines are simple on purpose.</strong> A real fund's glide path is tuned by people who know their plan. Outscoring a textbook rule in simulation is evidence the method works, not that it would outdo a pension fund's investment team.</li>
            <li><strong>What transfers.</strong> The parts a pension fund cares about are not the network: valuing a promise off the yield curve, measuring what moves the funded ratio, costing a policy in the sponsor's terms, and fixing the test before running it.</li>
          </ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-limits">
        <h2 id="s-limits">Limits</h2>
        <div class="prose">
          <p>{b("caveat")}</p>
          <ul>
            <li>The matching bonds hedge the promise's value perfectly when yields move, which no real portfolio does: a real curve twists, and real liabilities are uncertain.</li>
            <li>Expected inflation is just the last ten years' average. It moves slowly and can be wrong for a long time, as it was in the 1970s.</li>
            <li>The discount rate is a government yield. Many plans use a higher one, which makes the same promise look smaller and the plan look better funded.</li>
            <li>Members never join, leave or live longer than expected, and the sponsor always pays.</li>
          </ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-run">
        <h2 id="s-run">Reproduce</h2>
        <div class="prose">
          <p>The study lives in the Deep Portfolio Constructor repository, beside the wealth study it shares a method with. One command downloads the public data, trains the {stat("networks")} networks and writes every number on this page:</p>
          <p><code>python -m dpc.cli pension</code></p>
          <p>The pension code has {stat("tests")} tests of its own. The mathematics is checked against closed forms: a fully matched, fully funded plan stays exactly funded whatever yields do; the liability's value matches discounting each payment one by one; no decision depends on anything that comes after it.</p>
        </div>
      </section>

      <nav class="project-switch" aria-label="Other projects"></nav>
    </div>
  </main>

  <footer class="site-footer"></footer>
  <div class="copy-status" role="status" aria-live="polite" data-copy-status></div>
</body>
</html>
"""


def main() -> None:
    (ROOT / "projects" / "pension-lab.html").write_text(page(), encoding="utf-8")
    print("wrote projects/pension-lab.html")


if __name__ == "__main__":
    main()
