"""The home page (index.html): one short, animated story on engraved paper.

Who (a guilloche rosette, the pattern engraved on banknotes and share certificates, drawn live
by assets/home.js), a ticker of each project's headline figure, one dollar from 1960 drawn as
you scroll, the work, how it is done, experience, contact.

Everything here is static HTML first: every figure is a data-bind into data/projects.json (or,
for the datathon project, a figure from data/projects.json "more", which names the file in that
repository it comes from), the chart's lines are drawn here from data/dpc_wealth.json, and the
page reads in full without JavaScript. assets/home.js only animates what is already on the page,
and shows the final frame when the reader prefers reduced motion.

scripts/build_home.py calls page() and writes the result to index.html.
"""

from __future__ import annotations

import hashlib
import html
import json
import math
from pathlib import Path

import ride  # the three journeys from 1960 and the market's falls, already checked against the published figures

ROOT = Path(__file__).resolve().parents[1]
e = html.escape
DPC = "deep-portfolio-constructor"
GITHUB = "https://github.com/shmorsi"
LINKEDIN = "https://www.linkedin.com/in/sherif-morsi-a17628295/"
RESUME = "resume/Sherif_Morsi_Resume.pdf"
EMAIL = "shmorsi@outlook.com"
PHONE = ("+14385966468", "+1 (438) 596-6468")

# Each project's seal: a hypotrochoid (R, r, d) of its own, so every row carries a different engraving.
SEALS = {"deep-portfolio-constructor": (60, 21, 30), "pension-lab": (60, 16, 26), "world-shock-lab": (60, 26, 34),
         "tsfm": (60, 13, 30), "aurvane": (60, 18, 12), "epicentre": (60, 23, 36)}
TICKER = {"deep-portfolio-constructor": "Portfolio", "pension-lab": "Pension", "world-shock-lab": "Shock Lab",
          "tsfm": "Forecasting", "aurvane": "Aurvane", "epicentre": "ÉPICENTRE"}
LINES = [("market", "The market", "Buy every US stock and never touch it."),
         ("momentum", "A momentum rule", "Lean toward what has been rising."),
         ("deep", "My neural network", "Re-reads 30 industries every month.")]


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


def seal(pid: str, size: int = 120) -> str:
    """A small engraved rosette, drawn here so it shows without JavaScript."""
    R, r, d = SEALS[pid]
    turns = r // math.gcd(R, r)
    pts = []
    n = 720
    for i in range(n + 1):
        t = 2 * math.pi * turns * i / n
        x = (R - r) * math.cos(t) + d * math.cos((R - r) / r * t)
        y = (R - r) * math.sin(t) - d * math.sin((R - r) / r * t)
        pts.append(f"{x:.1f} {y:.1f}")
    path = "M" + " L".join(pts) + "Z"
    return (f'<svg class="seal" viewBox="-80 -80 160 160" width="{size}" height="{size}" aria-hidden="true">'
            f'<circle r="76" class="seal-ring"/><circle r="70" class="seal-ring thin"/>'
            f'<path d="{path}" pathLength="1" class="seal-path"/></svg>')


# ---------------------------------------------------------------- the ride: one dollar from 1960

W, H = 1000, 560
LO, HI = -0.25, 3.45  # log10 of dollars: about $0.56 to $2,800


def _y(v: float) -> float:
    return H - (v - LO) / (HI - LO) * H


def ride_section(P: dict) -> str:
    d = ride.data(P, {k: "" for k in ("world-shock-lab", "tsfm", "aurvane", "pension-lab")})
    series = d["series"]
    n = len(series["market"]) - 1
    x = lambda i: i / n * W  # noqa: E731
    paths = {}
    for key in series:
        pts = [f"{x(i):.1f},{_y(v / 10000):.1f}" for i, v in enumerate(series[key])]
        paths[key] = "M" + " L".join(pts)
    grid = "".join(f'<line x1="0" x2="{W}" y1="{_y(k):.1f}" y2="{_y(k):.1f}"/>' for k in range(0, 4))
    grid_labels = "".join(f'<span style="top:{_y(k) / H * 100:.2f}%">${10 ** k:,}</span>' for k in range(0, 4))
    years = "".join(f'<span style="left:{x((yr - 1960) * 12) / W * 100:.2f}%">{yr}</span>'
                    for yr in range(1960, 2030, 10))
    storms = []
    for s in d["storms"]:
        if not s["name"]:
            continue
        a, b = x(s["from"]), x(s["back"])
        late = " is-late" if a / W > 0.72 else ""  # near the right edge: the label hangs to the left of its line
        name = s["name"][0].upper() + s["name"][1:]
        storms.append(f'<div class="storm{late}" data-at="{s["from"] / n:.4f}" style="left:{a / W * 100:.2f}%;width:{(b - a) / W * 100:.2f}%">'
                      f'<span>{e(name)}<small>{e(s["years"])}, the market fell {s["depth"]}%</small></span></div>')
    lines = "".join(f'<path class="line line-{k}" d="{paths[k]}" vector-effect="non-scaling-stroke"/>' for k in ("market", "momentum", "deep"))
    heads = "".join(f'<circle class="head head-{k}" r="5" cx="{W}" cy="{_y(series[k][-1] / 10000):.1f}" vector-effect="non-scaling-stroke"/>'
                    for k in ("market", "momentum", "deep"))
    stat = {"market": "wealthMarket", "momentum": "wealthMomentum", "deep": "wealthDeep"}
    legend = "".join(
        f'<li class="lg lg-{k}"><span class="lg-name">{e(name)}</span><span class="lg-note">{e(note)}</span>'
        f'<span class="lg-val" data-count="{k}">{bind(P, DPC, f"stats.{stat[k]}.display")}</span></li>'
        for k, name, note in LINES)
    payload = json.dumps({"start": d["start"], "w": W, "h": H, "lo": LO, "hi": HI, "series": series}, separators=(",", ":"))
    return f"""
    <section class="ride" id="ride" data-ride aria-labelledby="ride-title">
      <div class="ride-pin">
        <div class="wrap ride-grid">
          <div class="ride-copy">
            <h2 id="ride-title">One dollar, January&nbsp;1960.</h2>
            <p class="ride-step is-on" data-step="0">Three ways to hold it for the next 66 years. Scroll, and watch {bind(P, DPC, "stats.months.display")} real months happen to each, out of sample and after every trading cost.</p>
            <p class="ride-step" data-step="1">The storms are real too. Every line falls through the oil shock, Black Monday, the dot-com bust and the financial crisis.</p>
            <p class="ride-step" data-step="2">September 2026. My network turned the dollar into {bind(P, DPC, "stats.wealthDeep.display")}, against {bind(P, DPC, "stats.wealthMarket.display")} for the market: {bind(P, DPC, "stats.vsMktDeep.display")} a year, t = {bind(P, DPC, "stats.vsMktTDeep.display")}. The test written down before the run calls that {bind(P, DPC, "stats.vsMktVerdictDeep.display", "span", "verdict")}, so that is what I publish.</p>
            <p class="ride-cta"><a class="btn" href="projects/deep-portfolio-constructor.html">How it was tested</a></p>
          </div>
          <figure class="ride-chart" aria-label="Growth of one dollar from January 1960 for the market, a momentum rule and the neural network, on a log scale">
            <div class="ride-plot">
              <div class="ride-year" aria-hidden="true"><span data-ride-year>2026</span></div>
              <div class="ride-storms" aria-hidden="true">{"".join(storms)}</div>
              <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">
                <defs><clipPath id="ride-clip"><rect data-ride-clip x="0" y="-20" width="{W}" height="{H + 40}"/></clipPath></defs>
                <g class="grid">{grid}</g>
                <g clip-path="url(#ride-clip)">{lines}</g>
                <g class="heads">{heads}</g>
              </svg>
              <div class="ride-ylabels" aria-hidden="true">{grid_labels}</div>
              <div class="ride-xlabels" aria-hidden="true">{years}</div>
            </div>
            <ol class="ride-legend">{legend}</ol>
            <figcaption>Growth of $1, log scale. Long-only, net of 10 basis points per trade. From the wealth study's committed results.</figcaption>
          </figure>
        </div>
      </div>
      <script type="application/json" data-ride-series>{payload}</script>
    </section>"""


# ---------------------------------------------------------------- the work

def row(P: dict, pid: str, page: str) -> str:
    p = P[pid]
    key = p["headline"]["stat"]
    repo = next(link for link in p["links"] if link["kind"] == "repo")
    links = [f'<a class="btn btn-solid" href="{e(page)}">Open the project</a>']
    if repo.get("public") is not False:
        links.append(f'<a class="btn" href="{e(repo["href"])}" target="_blank" rel="noopener noreferrer">Code</a>')
    app = next((link for link in p["links"] if link["kind"] == "app"), None)
    if app:
        links.append(f'<a class="btn" href="{e(app["href"])}">{e(app["label"])}</a>')
    tags = "".join(f"<li>{e(t)}</li>" for t in p.get("tags", []))
    return f"""
          <li class="work-row" id="p-{pid}" data-reveal>
            <a class="work-seal" href="{e(page)}" tabindex="-1" aria-hidden="true">{seal(pid)}</a>
            <div class="work-main">
              <p class="work-kicker"><span class="work-num">{e(p["number"])}</span>{e(p["kicker"])}</p>
              <h3><a href="{e(page)}">{e(p["title"])}</a></h3>
              {bind(P, pid, "purpose", "p", "work-purpose")}
            </div>
            <div class="work-fig">
              {bind(P, pid, f"stats.{key}.display", "p", "fig")}
              {bind(P, pid, f"stats.{key}.label", "p", "fig-label")}
            </div>
            <button class="work-more" type="button" aria-expanded="false" aria-controls="more-{pid}"><span>More</span></button>
            <div class="work-detail" id="more-{pid}">
              <div class="work-detail-in">
                {bind(P, pid, "headline.qualifier", "p", "work-qual")}
                <ul class="tags" aria-label="Built with">{tags}</ul>
                <div class="actions">{"".join(links)}</div>
              </div>
            </div>
          </li>"""


def extra_row(x: dict) -> str:
    """A project from data/projects.json "more": one outside the three research projects, with its own page elsewhere."""
    links = "".join(f'<a class="btn{" btn-solid" if i == 0 else ""}" href="{e(link["href"])}" target="_blank" rel="noopener noreferrer">{e(link["label"])}</a>'
                    for i, link in enumerate(x["links"]))
    tags = "".join(f"<li>{e(t)}</li>" for t in x["tags"])
    first = x["links"][0]["href"]
    return f"""
          <li class="work-row is-new" id="p-{x["id"]}" data-reveal>
            <a class="work-seal" href="{e(first)}" tabindex="-1" aria-hidden="true" target="_blank" rel="noopener noreferrer">{seal(x["id"])}</a>
            <div class="work-main">
              <p class="work-kicker"><span class="work-num">{e(x["number"])}</span>{e(x["kicker"])}<span class="new">New</span></p>
              <h3><a href="{e(first)}" target="_blank" rel="noopener noreferrer">{e(x["title"])}</a></h3>
              <p class="work-purpose">{e(x["purpose"])}</p>
            </div>
            <div class="work-fig">
              <p class="fig">{e(x["headline"]["display"])}</p>
              <p class="fig-label">{e(x["headline"]["label"])}</p>
            </div>
            <button class="work-more" type="button" aria-expanded="false" aria-controls="more-{x["id"]}"><span>More</span></button>
            <div class="work-detail" id="more-{x["id"]}">
              <div class="work-detail-in">
                <p class="work-qual">{e(x["headline"]["qualifier"])}</p>
                <ul class="tags" aria-label="Built with">{tags}</ul>
                <div class="actions">{links}</div>
              </div>
            </div>
          </li>"""


def ticker(P: dict, order: list[str], more: list[dict]) -> str:
    items = []
    for pid in order:
        st = P[pid]["stats"][P[pid]["headline"]["stat"]]
        items.append((TICKER[pid], st["display"], P[pid]["headline"]["stat"]))
    for x in more:
        items.append((TICKER[x["id"]], x["headline"]["display"], ""))
    run = "".join(f'<span class="tk"><b>{e(a)}</b><span>{e(b)}</span></span>' for a, b, _ in items)
    return (f'<div class="ticker" aria-hidden="true"><div class="ticker-track" data-ticker>'
            f'<div class="ticker-run">{run}</div><div class="ticker-run">{run}</div></div></div>')


RULES = [
    ("Decide the test first", "Splits, metrics, baselines and the rule for a disappointing answer are tagged in git before the test set is opened."),
    ("No look-ahead", "Models refit on past data only. Tests fail if changing data after a decision date changes the decision."),
    ("Intervals, not points", "Every comparison carries its interval. When the interval includes zero, the page says it is not an improvement."),
    ("Every number traced", "Figures are read from one data file that names each result's source, and a check fails the build if a page drifts."),
]


# ---------------------------------------------------------------- the page

def page(DATA: dict, P: dict, order: list[str], links: dict) -> str:
    v = asset_version()
    tagline = DATA["tagline"]
    more = DATA.get("more", [])
    count = len(DATA["groups"]) + len(more)
    words = {3: "Three", 4: "Four", 5: "Five", 6: "Six"}.get(count, str(count))
    titles = ", ".join([g["title"] for g in DATA["groups"]] + [x["title"] for x in more])
    desc = (f"Sherif Morsi builds AI for long-term investing: portfolios, forecasts and AI agents, "
            f"scored on tests fixed in advance. Projects: {titles}.")
    rows = "".join(row(P, pid, links[pid]) for pid in order) + "".join(extra_row(x) for x in more)
    rules = "".join(f'<li data-reveal><h3>{e(t)}</h3><p>{e(d)}</p></li>' for t, d in RULES)
    nav = [("Work", "#work"), ("Approach", "#approach"), ("Experience", "#experience"), ("Contact", "#contact")]
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
  <meta name="theme-color" content="#EDF1EC" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0C1A15" media="(prefers-color-scheme: dark)">
  <meta name="color-scheme" content="light dark">
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
  <link rel="preload" href="assets/fonts/bodoni-moda-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="assets/fonts/public-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/home.css?v={v}">
  <script>document.documentElement.classList.replace("no-js","js");try{{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}}catch(e){{}}</script>
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
    "knowsAbout": ["Deep learning", "PyTorch", "Transformers", "Portfolio construction", "Quantitative research", "Risk models", "Time-series forecasting", "Econometrics", "AI agents", "Python"],
    "sameAs": ["{GITHUB}", "https://www.linkedin.com/in/sherif-morsi-a17628295"]
  }}
  </script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="top">
    <div class="wrap top-in">
      <a class="brand" href="./" aria-label="Sherif Morsi, home"><svg viewBox="-80 -80 160 160" aria-hidden="true"><use href="#mark"/></svg><span>Sherif Morsi</span></a>
      <nav class="top-nav" aria-label="Sections">{navhtml}</nav>
      <div class="top-end">
        <a class="btn btn-solid btn-sm" href="{RESUME}" download>Resume</a>
        <button class="theme" type="button" data-theme-toggle aria-label="Switch between light and dark"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.25" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 2.75a7.25 7.25 0 0 1 0 14.5Z" fill="currentColor"/></svg></button>
      </div>
    </div>
    <span class="progress" data-progress aria-hidden="true"></span>
  </header>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><g id="mark" fill="none" stroke="currentColor">{seal("deep-portfolio-constructor").split('aria-hidden="true">', 1)[1].rsplit("</svg>", 1)[0].replace('class="seal-ring"', 'stroke-width="5"').replace('class="seal-ring thin"', 'stroke-width="2.5"').replace('class="seal-path"', 'stroke-width="3"')}</g></defs></svg>

  <main id="main">
    <section class="hero" id="top" aria-labelledby="hero-title">
      <canvas class="rosette" data-rosette aria-hidden="true"></canvas>
      <div class="wrap hero-in">
        <p class="status"><span class="dot" aria-hidden="true"></span>Open to internships from January 2027</p>
        <h1 id="hero-title" data-split>Sherif Morsi</h1>
        <p class="lede">{e(tagline)}</p>
        <p class="meta">Third-year Computer Science at Concordia University, Montreal. Looking for 4 to 16 month internships anywhere in Canada, with pension funds, asset managers and AI teams.</p>
        <div class="actions">
          <a class="btn btn-solid" href="{RESUME}" download>Download resume</a>
          <a class="btn" href="{GITHUB}" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a class="btn" href="{LINKEDIN}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
      </div>
      {ticker(P, order, more)}
    </section>
{ride_section(P)}

    <section class="section" id="work" aria-labelledby="work-title">
      <div class="wrap">
        <div class="head" data-reveal>
          <h2 id="work-title">What I've built</h2>
          <p>{words} projects. One question about investing for decades, in three studies; a forecasting model written from scratch; a lock that keeps AI agents inside signed limits; and a datathon build that shows investors what they really own. Every figure links back to a committed result.</p>
        </div>
        <ol class="work">{rows}
        </ol>
        <p class="aside">Prefer the long way round? <a href="voyage.html">Every project as a chapter, with the charts to try</a>.</p>
      </div>
    </section>

    <section class="section" id="approach" aria-labelledby="approach-title">
      <div class="wrap">
        <div class="head" data-reveal>
          <h2 id="approach-title">How I work</h2>
          <p>The same four rules on every project. They are why a number on this site means something, including when the answer is no.</p>
        </div>
        <ul class="rules">{rules}</ul>
      </div>
    </section>

    <section class="section" id="experience" aria-labelledby="experience-title">
      <div class="wrap">
        <div class="head" data-reveal>
          <h2 id="experience-title">Experience</h2>
        </div>
        <ol class="timeline" data-timeline>
          <li data-reveal>
            <p class="when">Aug to Sep 2026</p>
            <div>
              <h3>AI &amp; Machine Learning Intern<span>Nokia, Cairo</span></h3>
              <ul>
                <li>Trained and evaluated Python and PyTorch models on wireless network telemetry to forecast 5G energy demand.</li>
                <li>Developed data and ML pipelines for 5G energy telemetry, to support automated network management and optimization.</li>
                <li>Trained in agentic AI for intent-based 5G network slicing (Amazon Bedrock). Presented findings to cross-functional data science and engineering teams, and led the project proposal and requirements review.</li>
              </ul>
            </div>
          </li>
          <li data-reveal>
            <p class="when">Aug to Sep 2025</p>
            <div>
              <h3>Credit Analyst Job Shadow<span>Qatar National Bank, Cairo</span></h3>
              <ul>
                <li>Built and documented Python utilities and SQL queries that preprocess and validate SME financial records for the bank's credit-review process, improving data quality and reliability.</li>
              </ul>
            </div>
          </li>
          <li data-reveal>
            <p class="when">Expected May 2028</p>
            <div>
              <h3>Bachelor of Computer Science<span>Concordia University, Montreal</span></h3>
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

    <section class="section contact" id="contact" aria-labelledby="contact-title">
      <div class="wrap">
        <h2 id="contact-title" data-reveal>Let's talk.</h2>
        <p class="contact-lede" data-reveal>I'm available from January 2027 for 4, 8, 12 or 16 months, anywhere in Canada.</p>
        <p class="contact-mail" data-reveal><a href="mailto:{EMAIL}">{EMAIL}</a><button class="copy" type="button" data-copy="{EMAIL}">Copy</button></p>
        <div class="actions" data-reveal>
          <a class="btn btn-solid" href="{RESUME}" download>Download resume</a>
          <a class="btn" href="tel:{PHONE[0]}">{PHONE[1]}</a>
          <a class="btn" href="{GITHUB}" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a class="btn" href="{LINKEDIN}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
        <dl class="facts" data-reveal>
          <div><dt>Based in</dt><dd>Montreal, Quebec, Canada</dd></div>
          <div><dt>Status</dt><dd>Canadian permanent resident</dd></div>
          <div><dt>Languages</dt><dd>English, Arabic, and French (learning)</dd></div>
          <div><dt>Also</dt><dd>QUARCC, Arab Run Club Montreal, John Molson Book Club</dd></div>
        </dl>
      </div>
      <p class="giant" aria-hidden="true">Sherif Morsi</p>
    </section>
  </main>

  <footer class="foot">
    <div class="wrap foot-in">
      <p>Sherif Morsi, 2026. Every figure is read from <a href="data/projects.json">one data file</a> that names its source.</p>
      <p><a href="voyage.html">The long way round</a><a href="#top" data-top>Back to top</a></p>
    </div>
  </footer>
  <div class="toast" role="status" aria-live="polite" data-toast></div>
</body>
</html>
"""
