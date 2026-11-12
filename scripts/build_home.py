#!/usr/bin/env python3
"""Build index.html, the master page, from data/projects.json.

One featured project (the Deep Portfolio Constructor) and three project cards,
each linking to that project's own page. Every figure is a data-bind whose
fallback text is copied from data/projects.json here, and every chart is drawn
from the same file, so the page reads correctly without JavaScript and
scripts/check_site.py can verify it.

Run after any change to data/projects.json:  python3 scripts/build_home.py
"""

from __future__ import annotations

import html
import json
import math
import re
from pathlib import Path

import lab  # scripts/lab.py: the interactive pieces, rendered as static HTML first
import stories  # scripts/stories.py: one pinned, plain-English chapter per project
import ride  # scripts/ride.py: one dollar in 1960 and three trains to today, the first thing under the opening screen
import worlds  # scripts/worlds.py: the route, five worlds drawn from the projects' results

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
P = {p["id"]: p for p in DATA["projects"]}
FEATURED = "deep-portfolio-constructor"
ORDER = [p["id"] for p in DATA["projects"]]  # display order is the order in the data file
CARDS = [pid for pid in ORDER if pid != FEATURED]
STATUS = {"deep-portfolio-constructor": "Pre-registered", "pension-lab": "Pre-registered", "tsfm": "Test scored", "world-shock-lab": "Live", "aurvane": "Simulated"}
SHORT = {"deep-portfolio-constructor": "Portfolio", "pension-lab": "Pension", "tsfm": "TSFM", "world-shock-lab": "Shock Lab", "aurvane": "Aurvane"}
LIVE = {"world-shock-lab"}
GITHUB = "https://github.com/shmorsi"
LINKEDIN = "https://www.linkedin.com/in/sherif-morsi-a17628295/"
RESUME = "resume/Sherif_Morsi_Resume.pdf"
e = html.escape


# ---------------------------------------------------------------- data access

def bind(pid: str, path: str, tag: str = "span", cls: str = "") -> str:
    cur = P[pid]
    for part in path.split("."):
        cur = cur[part]
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-bind="{pid}.{path}">{e(str(cur), quote=False)}</{tag}>'


def stat(pid: str, key: str) -> dict:
    return P[pid]["stats"][key]


def number(text: str) -> float:
    """'−0.40' -> -0.4, '0.688×' -> 0.688. Display strings use the Unicode minus."""
    match = re.search(r"[−-]?\d+(?:\.\d+)?", text.replace(",", ""))
    if not match:
        raise ValueError(f"no number in {text!r}")
    return float(match.group(0).replace("−", "-"))


def interval(text: str) -> tuple[float, float, float | None]:
    """'−1.10 [−1.59, −0.61]' -> (lo, hi, point); '[0.624, 0.757]' -> (lo, hi, None)."""
    nums = [float(x.replace("−", "-")) for x in re.findall(r"[−+-]?\d+(?:\.\d+)?", text)]
    if len(nums) == 3:
        return nums[1], nums[2], nums[0]
    if len(nums) == 2:
        return nums[0], nums[1], None
    raise ValueError(f"not an interval: {text!r}")


def site_link(p: dict) -> dict:
    return next(link for link in p["links"] if link["kind"] == "site")


def page_href(p: dict) -> str:
    """The project's own page on this site (preferred over an external live site)."""
    for link in p["links"]:
        if not link.get("external") and link["kind"] in ("site", "more"):
            return link["href"]
    return site_link(p)["href"]


def repo_html(p: dict) -> str:
    repo = next(link for link in p["links"] if link["kind"] == "repo")
    if repo.get("public") is False:
        return '<span class="code-note">Code: private repository</span>'
    return f'<a class="button" href="{e(repo["href"])}" target="_blank" rel="noopener noreferrer">GitHub</a>'


def status(pid: str) -> str:
    live = " is-live" if pid in LIVE else ""
    return f'<span class="status{live}">{STATUS[pid]}</span>'


# ---------------------------------------------------------------- charts
# One grammar for every chart on the page: a row has a name and a value above a
# track; a track has a reference line (zero or the baseline) and either a bar
# from the reference or a point with its interval. Positions are percentages of
# the domain, computed here from data/projects.json.

def pos(x: float, lo: float, hi: float) -> str:
    """Distance from the left edge of the track, as a percentage of the domain."""
    return f"{100 * (x - lo) / (hi - lo):.2f}%"


def rpos(x: float, lo: float, hi: float) -> str:
    """Distance from the right edge of the track."""
    return f"{100 * (hi - x) / (hi - lo):.2f}%"


def chart(rows: list[str], axis: str, note: str, label: str, cls: str = "") -> str:
    c = f" {cls}" if cls else ""
    return (f'<figure class="chart{c}" aria-label="{e(label)}">\n'
            + "\n".join(rows)
            + f'\n            {axis}\n            <figcaption class="chart-note">{note}</figcaption>\n          </figure>')


def bar_row(name: str, value_html: str, value: float, lo: float, hi: float, ref: float, tone: str = "") -> str:
    """tone: "best" (accent), "dim", or "" (ink). Bars below the reference are dim unless marked best."""
    left, right = sorted((value, ref))
    tone = tone or ("dim" if value < ref else "")
    cls = (f" is-{tone}" if tone else "") + (" neg" if value < ref else "")  # neg: the bar grows leftward from the reference
    return (f'            <div class="chart-row{cls}">'
            f'<p class="chart-head"><span class="chart-name">{e(name)}</span><span class="chart-val">{value_html}</span></p>'
            f'<span class="chart-track" style="--ref:{pos(ref, lo, hi)}"><i class="ref"></i>'
            f'<i class="fill" style="left:{pos(left, lo, hi)};right:{rpos(right, lo, hi)}"></i></span></div>')


def point_row(name: str, value_html: str, point: float, ci: tuple[float, float], lo: float, hi: float, ref: float) -> str:
    return (f'            <div class="chart-row">'
            f'<p class="chart-head"><span class="chart-name">{e(name)}</span><span class="chart-val">{value_html}</span></p>'
            f'<span class="chart-track" style="--ref:{pos(ref, lo, hi)}"><i class="ref"></i>'
            f'<i class="ci" style="left:{pos(ci[0], lo, hi)};right:{rpos(ci[1], lo, hi)}"></i>'
            f'<i class="pt" style="left:{pos(point, lo, hi)}"></i></span></div>')


def axis(ticks: list[tuple[float, str]], lo: float, hi: float) -> str:
    spans = "".join(f'<span style="left:{pos(x, lo, hi)}">{e(t)}</span>' for x, t in ticks)
    return f'<p class="chart-axis" aria-hidden="true">{spans}</p>'


def tsfm_chart() -> str:
    rows = P["tsfm"]["tables"]["patchTest"]["rows"]
    crps = [r for r in rows if r[2] == "CRPS"]
    lo, hi = 0.5, 1.1
    out = []
    for r in crps:
        point, ci = float(r[3]), interval(r[4])[:2]
        out.append(point_row(f"vs {r[1]}", f"{e(r[3])}× {e(r[4])}", point, ci, lo, hi, 1.0))
    note = "Test CRPS as a multiple of each baseline; 1 is the baseline, lower is better. 95% intervals, one seed, 97 configurations."
    test = chart(out, axis([(0.5, "0.5"), (0.75, "0.75"), (1.0, "1 = baseline")], lo, hi), note,
                 "Test CRPS relative to two baselines, with 95% intervals")
    val = P["tsfm"]["tables"]["validation"]
    assert val["headers"] == ["Run", "Parameters", "CRPS", "MASE"], val["headers"]
    best = min(float(r[2]) for r in val["rows"])
    bars = [bar_row(f"{r[1]} parameters", e(r[2]), float(r[2]), lo, hi, 1.0, "best" if float(r[2]) == best else "")
            for r in val["rows"]]
    scale = chart(bars, axis([(0.5, "0.5"), (0.75, "0.75"), (1.0, "1 = Seasonal Naive")], lo, hi),
                  "Validation CRPS against Seasonal Naive on 16 held-out configurations, one seed: the bar is the gain over the baseline.",
                  "Validation CRPS by model size")
    return f"""{test}
            <p class="label card-sub">Bigger model, lower error</p>
            {scale}"""


def pension_chart() -> str:
    """What each policy costs the plan's sponsor: on average, then in the worst 5% of simulated futures."""
    rows = P["pension-lab"]["tables"]["simulated"]["rows"]   # policy, average cost, worst 5%, funded share, stocks
    hi_avg = max(number(r[1]) for r in rows) * 1.08
    hi_tail = max(number(r[2]) for r in rows) * 1.08
    best_avg, best_tail = min(number(r[1]) for r in rows), min(number(r[2]) for r in rows)
    avg = [bar_row(r[0], e(r[1]), number(r[1]), 0, hi_avg, 0, "best" if number(r[1]) == best_avg else "") for r in rows]
    tail = [bar_row(r[0], e(r[2]), number(r[2]), 0, hi_tail, 0, "best" if number(r[2]) == best_tail else "") for r in rows]
    n = P["pension-lab"]["stats"]["scenarios"]["display"]
    first = chart(avg, axis([(0, "$0"), (hi_avg / 2, f"${hi_avg / 2:.0f}"), (hi_avg, f"${hi_avg:.0f}")], 0, hi_avg),
                  f"Average cost to the plan's sponsor over 20 years, per $100 promised, across {n} simulated futures. Shorter is better.",
                  "Average cost to the sponsor by policy")
    second = chart(tail, axis([(0, "$0"), (hi_tail / 2, f"${hi_tail / 2:.0f}"), (hi_tail, f"${hi_tail:.0f}")], 0, hi_tail),
                   "The same cost in the worst 5% of those futures: how bad it gets.",
                   "Cost to the sponsor in the worst 5% of futures, by policy")
    return f"""{first}
            <p class="label card-sub">When it goes badly</p>
            {second}"""


CHARTS = {"pension-lab": pension_chart, "tsfm": tsfm_chart, "world-shock-lab": lab.shock_widget, "aurvane": lab.attack_board}


# ---------------------------------------------------------------- sections

def telemetry(pid: str) -> str:
    p = P[pid]
    st = p["stats"][p["headline"]["stat"]]
    return (f'<li data-headline="{pid}"><a href="#p-{pid}"><span class="t-top"><span class="t-num">{p["number"]}</span>{status(pid)}</span>'
            f'<strong>{e(p["title"])}</strong><span class="fig">{e(st["display"])}</span>'
            f'<span class="fig-label">{e(st["label"])}</span></a></li>')


def feature() -> str:
    pid = FEATURED
    p = P[pid]
    href = page_href(p)
    key = p["headline"]["stat"]
    stack = [("Point-in-time features", "13 per industry, 7 for the market", f'{bind(pid, "stats.industries.display")} US industries'),
             ("Transformer", "Every industry attends to every other", f'{bind(pid, "stats.params.display")} parameters'),
             ("Long-only tilt", "Scales each market weight by ⅓× to 3×", "Never short, never levered"),
             ("Learned trade fraction", "How much of the gap to its target to trade", f'{bind(pid, "stats.tradedDeep.display")} traded a year')]
    steps = "".join(f'<li><span class="step-num">{i:02d}</span><b>{e(a)}</b><span>{e(b)}</span><small>{c}</small></li>'
                    for i, (a, b, c) in enumerate(stack, 1))
    return f"""
      <article class="feature" id="p-{pid}" data-reveal>
        <div class="feature-head">
          <p class="label"><span class="num">{p["number"]}</span> Featured · {e(p["kicker"])} · {status(pid)}</p>
          <h3><a href="{e(href)}">{e(p["title"])}</a></h3>
          {bind(pid, "purpose", "p", "purpose")}
        </div>
        {lab.portfolio_lab("lab-home")}
        <div class="feature-fig">
          {bind(pid, f"stats.{key}.display", "p", "big-fig")}
          {bind(pid, f"stats.{key}.label", "p", "fig-label")}
          {bind(pid, "headline.qualifier", "p", "qualifier")}
        </div>
        <div class="feature-proof">
          <p class="proves"><span class="label">What it proves</span>{bind(pid, "proves")}</p>
          <div class="actions">
            <a class="button button-solid" href="{e(href)}">Open the project</a>
            {repo_html(p)}
          </div>
        </div>
        <div class="feature-stack">
          <p class="label">The deep stack · PyTorch</p>
          <figure class="hero-viz stack-viz">
            <!-- Drawn by assets/site.js. An illustration, not data; a still frame under reduced motion. -->
            <div class="hero-stage">
              <canvas class="hero-canvas" data-market aria-hidden="true"></canvas>
              <button type="button" class="viz-pause" data-market-pause aria-pressed="false">Pause</button>
            </div>
            <figcaption>Illustration, not data. Prices stream into a transformer that sets the portfolio's weights; the amber pulses are the gradient of the result flowing back. <span class="viz-hint">Point at a stock to trace it; click its price line to shock it and watch the portfolio rebalance.</span></figcaption>
          </figure>
          <ol class="pipeline">{steps}</ol>
          <p class="backprop"><span class="backprop-line" aria-hidden="true"></span><span>Trained {lab.term("end-to-end", "end to end")} on the {lab.term("kelly", "growth of wealth")}: the gradient of 60 months of compounding, net of every trading cost, flows back through a {lab.term("differentiable", "differentiable simulator")} into the network.</span></p>
        </div>
      </article>"""


def card(pid: str) -> str:
    p = P[pid]
    href = page_href(p)
    site = site_link(p)
    extra = ""
    app = next((link for link in p["links"] if link["kind"] == "app"), None)   # an interactive app served from this site
    if app:
        extra = f'<a class="text-link" href="{e(app["href"])}">{e(app["label"])}</a>'
    elif site.get("external"):
        extra = f'<a class="text-link" href="{e(site["href"])}" target="_blank" rel="noopener noreferrer">{e(site["label"])}</a>'
    tags = "".join(f"<li>{e(t)}</li>" for t in p.get("tags", []))
    return f"""
        <li class="card" id="p-{pid}" data-reveal>
          <div class="card-chart">
            {CHARTS[pid]()}
          </div>
          <p class="label"><span class="num">{p["number"]}</span> {e(p["kicker"])} · {status(pid)}</p>
          <h3><a class="card-link" href="{e(href)}">{e(p["title"])}</a></h3>
          {bind(pid, "purpose", "p", "purpose")}
          <p class="proves"><span class="label">What it proves</span>{bind(pid, "proves")}</p>
          <ul class="tags" aria-label="Stack">{tags}</ul>
          <div class="actions">
            <a class="button button-solid" href="{e(href)}">Open the project</a>
            {repo_html(p)}
            {extra}
          </div>
        </li>"""


RULES = [
    ("Decide the test first", "Splits, metrics, baselines and the rule for a disappointing answer are tagged in git before the test set is opened."),
    ("No look-ahead", "Models refit on past data only. Tests fail if changing data after a decision date changes the decision."),
    ("Intervals, not points", "Every comparison carries its interval. When the interval includes zero, the page says it is not an improvement."),
    ("Every number traced", "Figures are read from one data file that names each result's source, and a check fails the build if a page drifts."),
]

# Where the work fits, by the team that would use it. Every phrase names something a project's code does;
# scripts/check_site.py still rejects job titles and claims the projects do not back.
TOOLKIT = [
    ("On an investment team", "Long-only portfolios built for decades, with rebalancing and every trading cost counted. Factor models, "
     "walk-forward backtests with no look-ahead, and how a rate surprise moves stocks, bond yields and currencies.",
     ["deep-portfolio-constructor", "world-shock-lab"]),
    ("In quantitative research", "The test is fixed before the data is opened. Newey-West and bootstrap inference, event studies, "
     "false-discovery control, and published findings replicated before anything new is claimed.",
     ["deep-portfolio-constructor", "world-shock-lab", "tsfm"]),
    ("On an AI or ML team", "Transformers written and trained from scratch in PyTorch, probabilistic forecasting, LLM agents with tool calling, "
     "MCP and prompt-injection defence. Python, TypeScript, SQL, pytest, GitHub Actions.",
     ["tsfm", "aurvane"]),
]


MARQUEE = ["PyTorch", "Transformers", "Portfolio construction", "Probabilistic forecasting",
           "Differentiable simulation", "Event studies", "AI agents", "Pre-registered tests"]


def marquee() -> str:
    """A decorative band of the toolkit. aria-hidden: the same words are in the Approach section."""
    items = "".join(f'<span class="mq-item{" is-outline" if i % 2 else ""}">{e(w)}</span><span class="mq-sep">✦</span>'
                    for i, w in enumerate(MARQUEE))
    return (f'<div class="marquee" aria-hidden="true"><div class="marquee-track" data-marquee>'
            f'<div class="marquee-run">{items}</div><div class="marquee-run">{items}</div></div></div>')


STATEMENT = ("I build AI for long-term investing: systems that *invest* for decades, *forecast* with an honest range, "
             "and keep *AI assistants* safe around money. And I test them like a scientist. The test is written down "
             "before the result is seen, and the result is published even when the answer is no.")


def statement() -> str:
    """A sentence that lights up word by word as the reader scrolls. *word* marks an accent."""
    words = []
    for w in STATEMENT.split():
        hot = "*" in w
        clean = w.replace("*", "")
        words.append(f'<span class="sw{" is-hot" if hot else ""}">{e(clean)}</span>')
    return " ".join(words)


def rules() -> str:
    return "".join(f'<li><span class="num">{i:02d}</span><h3>{e(t)}</h3><p>{e(d)}</p></li>' for i, (t, d) in enumerate(RULES, 1))


def toolkit() -> str:
    out = []
    for title, text, proof in TOOLKIT:
        links = "".join(f'<a href="#p-{pid}">{e(SHORT[pid])}</a>' for pid in proof)
        out.append(f'<article><h3>{e(title)}</h3><p>{e(text)}</p><p class="proof"><span class="label">See</span>{links}</p></article>')
    return "".join(out)


def page() -> str:
    tagline = e(DATA["tagline"])
    titles = ", ".join(g["title"] + (f" ({', '.join(P[i]['study'] for i in g['projects'])})" if len(g["projects"]) > 1 else "") for g in DATA["groups"])
    count = len(DATA["groups"])
    words = {3: "Three", 4: "Four", 5: "Five", 6: "Six"}.get(count, str(count))
    desc = (f"Sherif Morsi builds AI for long-term investing: portfolios, forecasts and AI agents, "
            f"scored on tests fixed in advance. Projects: {titles}.")
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Sherif Morsi · AI for long-term investing</title>
  <meta name="description" content="{e(desc)}">
  <meta name="author" content="Sherif Morsi">
  <meta name="theme-color" content="#000000">
  <meta name="color-scheme" content="dark light">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://shmorsi.github.io/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Sherif Morsi">
  <meta property="og:locale" content="en_CA">
  <meta property="og:url" content="https://shmorsi.github.io/">
  <meta property="og:title" content="Sherif Morsi · AI for long-term investing">
  <meta property="og:description" content="{tagline} {words} projects, each with its own page and every figure traced to a result file.">
  <meta property="og:image" content="https://shmorsi.github.io/assets/og.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Sherif Morsi. {tagline}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Sherif Morsi · AI for long-term investing">
  <meta name="twitter:description" content="{tagline}">
  <meta name="twitter:image" content="https://shmorsi.github.io/assets/og.png">
  <meta name="twitter:image:alt" content="Sherif Morsi. {tagline}">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="assets/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
  <link rel="preload" href="assets/fonts/inter-tight-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/site.css">
  <script>try{{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}}catch(e){{}}</script>
  <script src="assets/site.js" defer></script>
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Sherif Morsi",
    "url": "https://shmorsi.github.io/",
    "email": "mailto:shmorsi@outlook.com",
    "jobTitle": "Computer Science student",
    "homeLocation": {{"@type": "Place", "name": "Montreal, Quebec, Canada"}},
    "alumniOf": {{"@type": "CollegeOrUniversity", "name": "Concordia University"}},
    "knowsAbout": ["Deep learning", "PyTorch", "Transformers", "Portfolio construction", "Quantitative research", "Risk models", "Time-series forecasting", "Econometrics", "AI agents", "Python"],
    "sameAs": ["{GITHUB}", "https://www.linkedin.com/in/sherif-morsi-a17628295"]
  }}
  </script>
</head>
<body data-root="" data-metrics="data/projects.json">
  <a class="skip" href="#main">Skip to content</a>

  <header class="site-header"></header>

  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-grid wrap">
        <div class="hero-copy">
          <p class="hero-badge"><span class="pulse" aria-hidden="true"></span>Open to internships from January 2027</p>
          <p class="eyebrow">Computer Science · Concordia University · Montreal</p>
          <h1 id="hero-title">Sherif Morsi</h1>
          <p class="hero-lead">{tagline}</p>
          <p class="hero-meta">Third-year Computer Science student. Open to 4 to 16 month internships anywhere in Canada from January 2027, with pension funds, asset managers and AI teams: portfolio construction, quantitative research, machine learning and AI agents.</p>
          <div class="actions">
            <a class="button button-solid" href="#ride">Take the ride</a>
            <a class="button" href="{RESUME}" download>Resume</a>
            <a class="button" href="{GITHUB}" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a class="button" href="{LINKEDIN}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          </div>
        </div>
        <!-- The right half is the stage for the particle sculpture drawn by assets/site.js: decoration, not content. -->
        <div class="hero-space" data-hero-stage aria-hidden="true"></div>
      </div>
      <div class="telemetry-band">
        <!-- Figures below mirror data/projects.json so they show without JavaScript. scripts/check_site.py fails if they drift. -->
        <ol class="telemetry wrap" aria-label="Headline result of each project">
          {"".join(telemetry(i) for i in ORDER)}
        </ol>
      </div>
    </section>

    {ride.section(P)}

    {marquee()}

    <section class="section statement" aria-label="In short">
      <div class="wrap">
        <p class="label">In short</p>
        <p class="statement-text" data-statement>{statement()}</p>
      </div>
    </section>

    {worlds.section(P, ORDER, status)}

    <section class="section stories" id="work" aria-labelledby="work-title">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="label">The voyage</p>
          <h2 id="work-title">{words} projects, in plain English</h2>
          <p>The first is about investing for decades, which is a long voyage with a promise at the end of it: pensions to pay. It comes in three studies: the engine that grows the money, the promise and what it costs to keep, and the weather station that measures the storms. The second is the navigator, a forecasting model built from scratch. The third is the shield, a lock that keeps AI agents inside limits a person signed. Keep scrolling: each picture is built from real results.</p>
          <p class="skip-story"><a class="text-link" href="#explore">In a hurry? Skip to the results you can try</a></p>
        </div>
      </div>
      {"".join(stories.story(P, pid, page_href(P[pid])) for pid in ORDER)}
    </section>

    <section class="section" id="explore" aria-labelledby="explore-title">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="label">Explore</p>
          <h2 id="explore-title">Try the results yourself</h2>
          <p>The same {words.lower()} projects, hands-on. Pick an investing strategy, size a central-bank surprise, or switch the AI guard on and off. Every underlined word has a one-tap definition.</p>
        </div>
        {feature()}
        <ol class="cards{" is-even" if len(CARDS) % 2 == 0 else ""}">{"".join(card(i) for i in CARDS)}
        </ol>
        <p class="file-note">Every figure and chart on this site is read from <a href="data/projects.json"><code>data/projects.json</code></a>, and each figure names the committed result file it came from.</p>
      </div>
    </section>

    <section class="section" id="approach" aria-labelledby="approach-title">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="label">Approach</p>
          <h2 id="approach-title">How I work</h2>
          <p>The same four rules on every project. They are why a number on this site means something.</p>
        </div>
        <ol class="rules" data-reveal>{rules()}</ol>
        <div class="toolkit" data-reveal><p class="label">Where I fit</p>{toolkit()}</div>
      </div>
    </section>

    <section class="section" id="experience" aria-labelledby="experience-title">
      <div class="wrap">
        <div class="section-head" data-reveal>
          <p class="label">Experience</p>
          <h2 id="experience-title">Experience</h2>
        </div>
        <article class="role" data-reveal>
          <p class="when"><b>Nokia</b>Aug 2026 to Sep 2026<br>Cairo, Egypt</p>
          <div>
            <h3>AI &amp; Machine Learning Intern</h3>
            <ul>
              <li>Trained and evaluated Python and PyTorch models on wireless network telemetry to forecast 5G energy demand.</li>
              <li>Developed data and ML pipelines for 5G energy telemetry, to support automated network management and optimization.</li>
              <li>Trained in agentic AI for intent-based 5G network slicing (Amazon Bedrock). Presented findings to cross-functional data science and engineering teams, and led the project proposal and requirements review.</li>
            </ul>
          </div>
        </article>
        <article class="role" data-reveal>
          <p class="when"><b>Qatar National Bank</b>Aug 2025 to Sep 2025<br>Cairo, Egypt</p>
          <div>
            <h3>Credit Analyst Job Shadow</h3>
            <ul>
              <li>Built and documented Python utilities and SQL queries that preprocess and validate SME financial records for the bank's credit-review process, improving data quality and reliability.</li>
            </ul>
          </div>
        </article>
        <article class="role" data-reveal>
          <p class="when"><b>Concordia University</b>Expected May 2028<br>Montreal, QC</p>
          <div>
            <h3>Bachelor of Computer Science</h3>
            <ul>
              <li>Available Winter 2027 (January to April 2027) for 4, 8, 12, or 16 months, anywhere in Canada. Willing to relocate within Canada.</li>
              <li>Coursework includes probability, linear algebra, multivariable calculus, machine learning, artificial intelligence, data structures and algorithms, and object-oriented programming.</li>
              <li>Quantitative Research and Competitions Club (QUARCC), member.</li>
            </ul>
          </div>
        </article>
        <div class="certs-block" data-reveal>
          <p class="label">Certifications</p>
          <div class="certs">
            <article><h3>Building with the Claude API</h3><p>Anthropic</p></article>
            <article><h3>Machine Learning with Python</h3><p>IBM</p></article>
          </div>
        </div>
      </div>
    </section>

    <section class="section contact" id="contact" aria-labelledby="contact-title">
      <div class="wrap">
        <p class="label">Contact</p>
        <h2 id="contact-title">Let's talk</h2>
        <div class="ticket">
          <div class="ticket-main">
            <p class="ticket-route" aria-label="A ticket from Montréal to your team">
              <span class="ticket-end"><b>MTL</b><small>Montréal</small></span>
              <span class="ticket-line" aria-hidden="true"><i></i></span>
              <span class="ticket-end is-to"><b>YOU</b><small>Your team</small></span>
            </p>
            <p class="lede">I build AI for long-term investing, train the models underneath it, and write the measurement down, including when the answer is no.</p>
            <dl class="ticket-facts">
              <div><dt>Passenger</dt><dd>Sherif Morsi</dd></div>
              <div><dt>Departs</dt><dd>January 2027</dd></div>
              <div><dt>Stay</dt><dd>4 to 16 months</dd></div>
              <div><dt>Class</dt><dd>Internship</dd></div>
            </dl>
          </div>
          <div class="ticket-stub reach">
            <p class="label">Boarding</p>
            <a class="email" href="mailto:shmorsi@outlook.com">shmorsi@outlook.com</a>
            <p class="phone"><a href="tel:+14385966468">+1 (438) 596-6468</a></p>
            <div class="actions">
              <a class="button button-solid" href="{RESUME}" download>Download resume</a>
              <a class="button" href="{GITHUB}" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a class="button" href="{LINKEDIN}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <button class="text-link" type="button" data-copy-email="shmorsi@outlook.com">Copy email</button>
            </div>
            <span class="ticket-code" aria-hidden="true"></span>
          </div>
        </div>
        <dl class="facts">
          <div><dt>Based</dt><dd>Montreal, Quebec, Canada</dd></div>
          <div><dt>Status</dt><dd>Canadian permanent resident. UAE Golden Visa.</dd></div>
          <div><dt>Open to</dt><dd>Internships of 4, 8, 12, or 16 months, anywhere in Canada, from January 2027</dd></div>
          <div><dt>Languages</dt><dd>English, Arabic, and French (learning)</dd></div>
          <div><dt>Also</dt><dd>QUARCC member. Arab Run Club Montreal. John Molson Book Club.</dd></div>
        </dl>
      </div>
      <p class="giant" aria-hidden="true" data-giant><span class="giant-line">Sherif Morsi</span><span class="giant-fill">Sherif Morsi</span></p>
    </section>
  </main>

  <footer class="site-footer"></footer>
  <div class="copy-status" role="status" aria-live="polite" data-copy-status></div>
</body>
</html>
"""


def main() -> None:
    (ROOT / "index.html").write_text(page(), encoding="utf-8")
    print("wrote index.html")


if __name__ == "__main__":
    main()
