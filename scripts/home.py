"""The home page (index.html): mission control for a portfolio, over a live Earth.

One dotted Earth (assets/earth.json, real coastlines) stays behind the whole page and flies to each
section's place as the reader scrolls: the curve of the Earth seen from space at the opening, the United States for the
wealth study, rings leaving the Fed, the Bank of Canada and OPEC for World Shock Lab, Montréal for
ÉPICENTRE, and back to the horizon at the end. assets/home.js draws it (WebGL) and runs the counters
and countdowns; assets/home.css sets the page.

Everything here is static HTML first: every figure is a data-bind into data/projects.json (or, for the
datathon project, a figure from data/projects.json "more", which names the file it comes from), the
wealth chart's lines are drawn here from data/dpc_wealth.json, and the page reads in full without
JavaScript. Under reduced motion the Earth holds still and nothing counts.

scripts/build_home.py calls page() and writes the result to index.html.
"""

from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path

import ride  # the three journeys from 1960, already checked against the published figures

ROOT = Path(__file__).resolve().parents[1]
e = html.escape
DPC = "deep-portfolio-constructor"
GITHUB = "https://github.com/shmorsi"
LINKEDIN = "https://www.linkedin.com/in/sherif-morsi-a17628295/"
RESUME = "resume/Sherif_Morsi_Resume.pdf"
EMAIL = "shmorsi@outlook.com"
PHONE = ("+14385966468", "+1 (438) 596-6468")

# What the Earth shows behind each mission, in words, so the picture never claims more than it is.
GLOBE = {
    "deep-portfolio-constructor": ("dpc", "The Earth turns to the United States: the study holds Kenneth French's 30 US industry portfolios."),
    "pension-lab": ("pension", "Each path around the Earth stands for one simulated future of the plan. An illustration: the test ran 10,000."),
    "world-shock-lab": ("wsl", "Rings leave Washington, Ottawa and Vienna, where the Fed, the Bank of Canada and OPEC announce."),
    "tsfm": ("tsfm", "The sweep stands for the model reading series from 77 datasets. An illustration."),
    "aurvane": ("aurvane", "A shell for the four checks every agent action has to pass. An illustration."),
    "epicentre": ("epicentre", "Montréal, where the PolyFinances Datathon ran, and the shock that spreads from one holding."),
}


def asset_version() -> str:
    digest = hashlib.sha256()
    for name in ("home.css", "home.js"):
        digest.update((ROOT / "assets" / name).read_bytes())
    return digest.hexdigest()[:10]


def bind(P: dict, pid: str, path: str, tag: str = "span", cls: str = "") -> str:
    cur = P[pid]
    for part in path.split("."):
        cur = cur[part]
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-bind="{pid}.{path}">{e(str(cur), quote=False)}</{tag}>'


# ---------------------------------------------------------------- the wealth study's telemetry: $1 from 1960

W, H = 600, 260
LO, HI = -0.25, 3.45  # log10 of dollars


def telemetry(P: dict) -> str:
    d = ride.data(P, {k: "" for k in ("world-shock-lab", "tsfm", "aurvane", "pension-lab")})
    series = d["series"]
    n = len(series["market"]) - 1
    y = lambda v: H - (v / 10000 - LO) / (HI - LO) * H  # noqa: E731
    paths = {k: "M" + " L".join(f"{i / n * W:.1f},{y(v):.1f}" for i, v in enumerate(s)) for k, s in series.items()}
    lines = "".join(f'<path class="tl tl-{k}" d="{paths[k]}" pathLength="1" vector-effect="non-scaling-stroke"/>'
                    for k in ("market", "momentum", "deep"))
    grid = "".join(f'<line x1="0" x2="{W}" y1="{y(k * 10000):.1f}" y2="{y(k * 10000):.1f}"/>' for k in range(4))
    ends = {"deep": ("My network", "wealthDeep"), "momentum": ("Momentum rule", "wealthMomentum"), "market": ("The market", "wealthMarket")}
    legend = "".join(f'<li class="tk-{k}"><span>{e(name)}</span>{bind(P, DPC, f"stats.{stat}.display", "b")}</li>' for k, (name, stat) in ends.items())
    return f"""
              <figure class="telemetry" id="ride" data-ride aria-label="Growth of one dollar from January 1960, log scale: the market, a momentum rule and the neural network">
                <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true"><g class="tg">{grid}</g>{lines}</svg>
                <p class="t-axis" aria-hidden="true"><span>1960</span><span>$1 to</span><span>2026</span></p>
                <ul class="t-legend">{legend}</ul>
              </figure>"""


# ---------------------------------------------------------------- the missions

def actions(links: list[tuple[str, str, bool]]) -> str:
    out = []
    for i, (label, href, external) in enumerate(links):
        ext = ' target="_blank" rel="noopener noreferrer"' if external else ""
        out.append(f'<a class="btn{" btn-solid" if i == 0 else ""}" href="{e(href)}"{ext}>{e(label)}</a>')
    return f'<div class="actions">{"".join(out)}</div>'


def mission(P: dict, pid: str, page: str, i: int) -> str:
    p = P[pid]
    key = p["headline"]["stat"]
    repo = next(link for link in p["links"] if link["kind"] == "repo")
    links = [("Explore the mission", page, False)]
    app = next((link for link in p["links"] if link["kind"] == "app"), None)
    if app:
        links.append((app["label"], app["href"], False))
    if repo.get("public") is not False:
        links.append(("Code", repo["href"], True))
    facts = "".join(f'<div>{bind(P, pid, f"stats.{k}.display", "dd")}{bind(P, pid, f"stats.{k}.label", "dt")}</div>'
                    for k in [f for f in p["factIds"] if f != key][:2])
    scene, caption = GLOBE[pid]
    extra = telemetry(P) if pid == DPC else ""
    if pid == "world-shock-lab":  # the live forecasts: a countdown to the next decisions the lab forecasts in public
        when = p["stats"]["nextDecision"]["display"]
        extra = (f'\n              <p class="m-live">Next live forecasts, Fed and Bank of Canada, {bind(P, pid, "stats.nextDecision.display")}: '
                 f'<b data-countdown="{e(when)}T14:00:00-05:00" data-short>published before the decision</b></p>')
    return f"""
        <article class="mission{" is-flip" if i % 2 else ""}" id="p-{pid}" data-scene="{scene}">
          <div class="wrap mission-in">
            <div class="m-copy" data-reveal>
              <p class="m-tag">Mission {e(p["number"])}<span>{e(p["kicker"])}</span></p>
              <h3><a href="{e(page)}">{e(p["title"])}</a></h3>
              {bind(P, pid, "purpose", "p", "m-purpose")}
              <div class="m-head">
                {bind(P, pid, f"stats.{key}.display", "p", "m-fig")}
                {bind(P, pid, f"stats.{key}.label", "p", "m-label")}
              </div>
              <dl class="m-facts">{facts}</dl>{extra}
              {actions(links)}
              <p class="m-globe">{e(caption)}</p>
            </div>
          </div>
        </article>"""


def extra_mission(x: dict, i: int) -> str:
    scene, caption = GLOBE[x["id"]]
    links = [(link["label"], link["href"], True) for link in x["links"]]
    first = x["links"][0]["href"]
    tags = ", ".join(x["tags"])
    return f"""
        <article class="mission{" is-flip" if i % 2 else ""}" id="p-{x["id"]}" data-scene="{scene}">
          <div class="wrap mission-in">
            <div class="m-copy" data-reveal>
              <p class="m-tag">Mission {e(x["number"])}<span>{e(x["kicker"])}</span><em class="new">New</em></p>
              <h3><a href="{e(first)}" target="_blank" rel="noopener noreferrer">{e(x["title"])}</a></h3>
              <p class="m-purpose">{e(x["purpose"])}</p>
              <div class="m-head">
                <p class="m-fig">{e(x["headline"]["display"])}</p>
                <p class="m-label">{e(x["headline"]["label"])}</p>
              </div>
              <p class="m-note">{e(x["headline"]["qualifier"])}</p>
              <p class="m-stack">Built with {e(tags)}</p>
              {actions(links)}
              <p class="m-globe">{e(caption)}</p>
            </div>
          </div>
        </article>"""


def hud(P: dict, order: list[str], more: list[dict]) -> str:
    """The webcast strip along the foot of the screen: the mission in view, the camera's place, and the page as a timeline."""
    nodes = [("#top", "Launch", "Sherif Morsi", "Launch")]
    nodes += [(f"#p-{pid}", P[pid]["number"], P[pid]["title"], f"Mission {P[pid]['number']}") for pid in order]
    nodes += [(f"#p-{x['id']}", x["number"], x["title"], f"Mission {x['number']}") for x in more]
    nodes += [("#experience", "Log", "Flight log", "Experience"), ("#contact", "Contact", "Let's talk", "Contact")]
    items = "".join(f'<li><a href="{h}" data-node data-code="{e(code)}" data-name="{e(name)}"><i></i><span>{e(short)}</span></a></li>'
                    for h, short, name, code in nodes)
    return f"""  <nav class="hud" data-hud aria-label="The page as a launch timeline">
    <p class="hud-now" aria-hidden="true"><span data-hud-code>Launch</span><b data-hud-name>Sherif Morsi</b></p>
    <div class="hud-line"><span class="hud-track" aria-hidden="true"><i data-hud-fill></i></span><ol>{items}</ol></div>
    <p class="hud-tel" aria-hidden="true"><span>Lat<b data-hud-lat>45.50° N</b></span><span>Lon<b data-hud-lon>73.57° W</b></span><span>Alt<b data-hud-alt>0 km</b></span><span><b data-hud-clock>T+ 00:00:00</b></span></p>
  </nav>"""


RULES = [
    ("Decide the test first", "Splits, metrics, baselines and the rule for a disappointing answer are tagged in git before the test set is opened."),
    ("No look-ahead", "Models refit on past data only. Tests fail if changing data after a decision date changes the decision."),
    ("Intervals, not points", "Every comparison carries its interval. When the interval includes zero, the page says it is not an improvement."),
    ("Every number traced", "Figures are read from one data file that names each result's source, and a check fails the build if a page drifts."),
]

STATS = [("deep-portfolio-constructor", "months", "Months of markets tested out of sample"),
         ("world-shock-lab", "assets", "Global markets in the shock lab"),
         ("tsfm", "series", "Series the forecaster learned from"),
         ("pension-lab", "scenarios", "Simulated futures of one pension plan")]


# ---------------------------------------------------------------- the page

def page(DATA: dict, P: dict, order: list[str], links: dict) -> str:
    v = asset_version()
    tagline = DATA["tagline"]
    more = DATA.get("more", [])
    count = len(DATA["groups"]) + len(more)
    words = {3: "Three", 4: "Four", 5: "Five", 6: "Six"}.get(count, str(count))
    titles = ", ".join([g["title"] for g in DATA["groups"]] + [x["title"] for x in more])
    desc = (f"Sherif Morsi builds AI for long-term investing: portfolios, pensions, forecasts and AI agents, "
            f"scored on tests fixed in advance. Projects: {titles}.")
    missions = "".join(mission(P, pid, links[pid], i) for i, pid in enumerate(order)) + "".join(extra_mission(x, len(order) + j) for j, x in enumerate(more))
    stats = "".join(f'<li data-reveal>{bind(P, pid, f"stats.{k}.display", "b", "count")}<span>{e(label)}</span></li>' for pid, k, label in STATS)
    rules = "".join(f'<li data-reveal><h3>{e(t)}</h3><p>{e(d)}</p></li>' for t, d in RULES)
    nav = [("Missions", "#work"), ("Approach", "#approach"), ("Flight log", "#experience"), ("Contact", "#contact")]
    navhtml = "".join(f'<a href="{h}">{t}</a>' for t, h in nav)
    title = "Sherif Morsi, AI for long-term investing"
    return f"""<!doctype html>
<html lang="en" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>{title}</title>
  <meta name="description" content="{e(desc)}">
  <meta name="author" content="Sherif Morsi">
  <meta name="theme-color" content="#000000">
  <meta name="color-scheme" content="dark">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://shmorsi.github.io/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Sherif Morsi">
  <meta property="og:locale" content="en_CA">
  <meta property="og:url" content="https://shmorsi.github.io/">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{e(tagline)} {words} projects, each with its own page and every figure traced to a result file.">
  <meta property="og:image" content="https://shmorsi.github.io/assets/og.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Sherif Morsi. {e(tagline)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{e(tagline)}">
  <meta name="twitter:image" content="https://shmorsi.github.io/assets/og.png">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="assets/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
  <link rel="preload" href="assets/fonts/barlow-600.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/barlow-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/earth.bin" as="fetch" crossorigin>
  <link rel="stylesheet" href="assets/home.css?v={v}">
  <script>document.documentElement.classList.replace("no-js","js")</script>
  <script src="assets/vendor/lenis.min.js" defer></script>
  <script src="assets/home.js?v={v}" defer></script>
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Sherif Morsi",
    "url": "https://shmorsi.github.io/",
    "email": "mailto:{EMAIL}",
    "jobTitle": "Computer Science student",
    "homeLocation": {{"@type": "Place", "name": "Montreal, Quebec, Canada"}},
    "alumniOf": {{"@type": "CollegeOrUniversity", "name": "Concordia University"}},
    "knowsAbout": ["Pension funds", "Asset-liability management", "Portfolio construction", "Deep learning", "PyTorch", "Transformers", "Time-series forecasting", "Econometrics", "AI agents", "Python"],
    "sameAs": ["{GITHUB}", "https://www.linkedin.com/in/sherif-morsi-a17628295"]
  }}
  </script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <canvas class="globe" data-globe aria-hidden="true"></canvas>
  <div class="veil" aria-hidden="true"></div>
{hud(P, order, more)}
  <header class="top">
    <div class="wrap top-in">
      <a class="brand" href="./" aria-label="Sherif Morsi, home">Sherif Morsi</a>
      <nav class="top-nav" aria-label="Sections">{navhtml}</nav>
      <a class="btn btn-sm" href="{RESUME}" download>Resume</a>
    </div>
  </header>

  <main id="main">
    <section class="hero" id="top" data-scene="horizon" aria-labelledby="hero-title">
      <div class="wrap hero-in">
        <p class="status" data-reveal><span class="dot" aria-hidden="true"></span>Open to internships from January 2027</p>
        <h1 id="hero-title" data-split>Sherif Morsi</h1>
        <p class="lede" data-reveal>{e(tagline)}</p>
        <p class="meta" data-reveal>Third-year Computer Science at Concordia University, Montréal. Looking for a 4 to 16 month internship from January 2027 with a pension fund, asset manager or AI team, anywhere in Canada.</p>
        <div class="actions" data-reveal>
          <a class="btn btn-solid" href="{RESUME}" download>Download resume</a>
          <a class="btn" href="#work">See the missions</a>
        </div>
      </div>
      <div class="wrap hero-foot">
        <p class="countdown" data-countdown="2027-01-01T00:00:00-05:00"><span class="cd-label">Available in</span><span class="cd-time" data-cd-time>January 2027</span></p>
        <p class="scroll-cue" aria-hidden="true">Scroll</p>
      </div>
    </section>

    <section class="stats" data-scene="rise" aria-label="The work in four numbers">
      <ul class="wrap stats-in">{stats}</ul>
    </section>

    <section class="missions" id="work" aria-labelledby="work-title">
      <div class="wrap missions-head" data-scene="rise">
        <h2 id="work-title" data-reveal>Missions</h2>
        <p data-reveal>{words} projects. One question about investing for decades, asked in three studies: grow the money, keep a pension promise funded, and measure the shocks that hit both. Then a forecasting model written from scratch, a lock that keeps AI agents inside signed limits, and a datathon build that shows investors what they really own.</p>
      </div>{missions}
      <div class="wrap">
        <p class="aside" data-reveal>Prefer the long way round? <a href="voyage.html">Every project as a chapter, with the charts to try</a>.</p>
      </div>
    </section>

    <section class="section" id="approach" data-scene="drift" aria-labelledby="approach-title">
      <div class="wrap">
        <h2 id="approach-title" data-reveal>Flight rules</h2>
        <p class="intro" data-reveal>The same four rules on every project. They are why a number on this site means something, including when the answer is no.</p>
        <ul class="rules">{rules}</ul>
      </div>
    </section>

    <section class="section" id="experience" data-scene="log" aria-labelledby="experience-title">
      <div class="wrap">
        <h2 id="experience-title" data-reveal>Flight log</h2>
        <ol class="log">
          <li data-reveal>
            <p class="when">Aug to Sep 2026<span>Cairo</span></p>
            <div>
              <h3>AI &amp; Machine Learning Intern<span>Nokia</span></h3>
              <ul>
                <li>Trained and evaluated Python and PyTorch models on wireless network telemetry to forecast 5G energy demand.</li>
                <li>Developed data and ML pipelines for 5G energy telemetry, to support automated network management and optimization.</li>
                <li>Trained in agentic AI for intent-based 5G network slicing (Amazon Bedrock). Presented findings to cross-functional data science and engineering teams, and led the project proposal and requirements review.</li>
              </ul>
            </div>
          </li>
          <li data-reveal>
            <p class="when">Aug to Sep 2025<span>Cairo</span></p>
            <div>
              <h3>Credit Analyst Job Shadow<span>Qatar National Bank</span></h3>
              <ul>
                <li>Built and documented Python utilities and SQL queries that preprocess and validate SME financial records for the bank's credit-review process, improving data quality and reliability.</li>
              </ul>
            </div>
          </li>
          <li data-reveal>
            <p class="when">Expected May 2028<span>Montréal</span></p>
            <div>
              <h3>Bachelor of Computer Science<span>Concordia University</span></h3>
              <ul>
                <li>Coursework in probability, linear algebra, multivariable calculus, machine learning, artificial intelligence, data structures and algorithms, and object-oriented programming.</li>
                <li>Member of QUARCC, the Quantitative Research and Competitions Club.</li>
                <li>Certifications: Building with the Claude API (Anthropic) and Machine Learning with Python (IBM).</li>
              </ul>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="section contact" id="contact" data-scene="home" aria-labelledby="contact-title">
      <div class="wrap">
        <p class="kicker" data-reveal data-countdown="2027-01-01T00:00:00-05:00">Next launch: January 2027<span class="cd-time" data-cd-time></span></p>
        <h2 id="contact-title" data-reveal>Let's talk</h2>
        <p class="contact-lede" data-reveal>Available for 4, 8, 12 or 16 months, anywhere in Canada. The fastest way to reach me is email.</p>
        <p class="mail" data-reveal><a href="mailto:{EMAIL}">{EMAIL}</a><button class="copy" type="button" data-copy="{EMAIL}">Copy</button></p>
        <div class="actions" data-reveal>
          <a class="btn btn-solid" href="{RESUME}" download>Download resume</a>
          <a class="btn" href="tel:{PHONE[0]}">{PHONE[1]}</a>
          <a class="btn" href="{GITHUB}" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a class="btn" href="{LINKEDIN}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
        <dl class="facts" data-reveal>
          <div><dt>Based in</dt><dd>Montréal, Québec, Canada</dd></div>
          <div><dt>Status</dt><dd>Canadian permanent resident</dd></div>
          <div><dt>Languages</dt><dd>English, Arabic, and French (learning)</dd></div>
          <div><dt>Also</dt><dd>QUARCC, Arab Run Club Montreal, John Molson Book Club</dd></div>
        </dl>
      </div>
    </section>
  </main>

  <footer class="foot">
    <div class="wrap foot-in">
      <p>Sherif Morsi, 2026. Every figure is read from <a href="data/projects.json">one data file</a> that names its source. Earth: NASA Blue Marble and Black Marble imagery, Natural Earth coastlines.</p>
      <p><a href="voyage.html">The long way round</a><a href="#top" data-top>Back to top</a></p>
    </div>
  </footer>
  <div class="toast" role="status" aria-live="polite" data-toast></div>
</body>
</html>
"""
