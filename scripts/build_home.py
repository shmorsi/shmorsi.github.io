#!/usr/bin/env python3
"""Build index.html, the master page, from data/projects.json.

The master page is a mission manifest: one card per project, each linking to
that project's own mission page. Every figure on it is a data-bind whose
fallback text is copied from data/projects.json here, so the page reads
correctly without JavaScript and scripts/check_site.py can verify it.

Run after any change to data/projects.json:  python3 scripts/build_home.py
"""

from __future__ import annotations

import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
P = {p["id"]: p for p in DATA["projects"]}
ORDER = ["aurvane", "deep-portfolio-constructor", "orbit", "tsfm", "world-shock-lab", "atlas"]
TRACKS = {  # which recruiter track each mission is evidence for
    "aurvane": "agents eng",
    "deep-portfolio-constructor": "ml quant eng",
    "orbit": "agents ml eng",
    "tsfm": "ml eng",
    "world-shock-lab": "quant ml eng",
    "atlas": "quant ml",
}
STATUS = {"aurvane": "Simulated", "deep-portfolio-constructor": "Walk-forward", "orbit": "Scored once",
          "tsfm": "Test scored", "world-shock-lab": "Live", "atlas": "Local app"}
LIVE = {"world-shock-lab"}
e = html.escape


def bind(pid: str, path: str, tag: str = "span", cls: str = "") -> str:
    cur = P[pid]
    for part in path.split("."):
        cur = cur[part]
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-bind="{pid}.{path}">{e(str(cur), quote=False)}</{tag}>'


def site_link(p: dict) -> dict:
    return next(link for link in p["links"] if link["kind"] == "site")


def mission_href(p: dict) -> str:
    """The project's own mission page on this site (preferred over an external live site)."""
    for link in p["links"]:
        if not link.get("external") and link["kind"] in ("site", "more"):
            return link["href"]
    return site_link(p)["href"]


def repo_html(p: dict) -> str:
    repo = next(link for link in p["links"] if link["kind"] == "repo")
    if repo.get("public") is False:
        return '<span class="code-note">Code: private repository</span>'
    return f'<a class="button" href="{e(repo["href"])}" target="_blank" rel="noopener noreferrer">GitHub</a>'


def telemetry(pid: str) -> str:
    p = P[pid]
    st = p["stats"][p["headline"]["stat"]]
    live = " is-live" if pid in LIVE else ""
    return (f'<li data-headline="{pid}"><a href="#m-{pid}"><span class="mission-top"><span class="label mission-num">{p["mission"]}</span>'
            f'<span class="status{live}">{STATUS[pid]}</span></span><strong>{e(p["title"])}</strong>'
            f'<span class="fig">{e(st["display"])}</span><span class="fig-label">{e(st["label"])}</span></a></li>')


def card(pid: str) -> str:
    p = P[pid]
    stat = p["headline"]["stat"]
    href = mission_href(p)
    live = " is-live" if pid in LIVE else ""
    extra = ""
    site = site_link(p)
    if site.get("external"):
        extra = f'<a class="text-link" href="{e(site["href"])}" target="_blank" rel="noopener noreferrer">{e(site["label"])}</a>'
    tags = "".join(f"<li>{e(t)}</li>" for t in p.get("tags", []))
    return f"""
        <li class="m-card" id="m-{pid}" data-tracks="{TRACKS[pid]}" data-reveal>
          <div class="m-card-top">
            <img class="patch" src="assets/patches/{pid}.svg" alt="" width="64" height="64" decoding="async">
            <div class="m-card-id"><span class="label">Mission {p["mission"]} · {e(p["kicker"])}</span><span class="status{live}">{STATUS[pid]}</span></div>
          </div>
          <h3><a class="card-link" href="{e(href)}">{e(p["title"])}</a></h3>
          {bind(pid, "purpose", "p", "purpose")}
          <div>
            {bind(pid, f"stats.{stat}.display", "p", "m-fig")}
            {bind(pid, f"stats.{stat}.label", "p", "fig-label")}
            {bind(pid, "headline.qualifier", "p", "qualifier")}
          </div>
          <p class="proves"><span class="label">What it proves</span>{bind(pid, "proves")}</p>{NOTES.get(pid, lambda: "")()}
          <ul class="tags" aria-label="Stack">{tags}</ul>
          <div class="actions">
            <a class="button button-solid" href="{e(href)}">Enter mission</a>
            {repo_html(p)}
            {extra}
          </div>
        </li>"""


NOTES = {  # a second, honest reading shown under a card's proves line
    "orbit": lambda: (f'\n          <p class="qualifier">Code repair: {bind("orbit", "stats.codeTeamPass.display")} with the reviewer, '
                      f'{bind("orbit", "stats.codeSinglePass.display")} for a single agent. Paired 95% interval 0.000 to 0.15625 '
                      f'includes zero, so the gap is not an improvement.</p>'),
}


SYSTEMS = [
    ("AI agents and LLMs", "Agents that act inside bounds a human signed, and hand work to each other in messages that code checks.",
     [("Aurvane", "#m-aurvane"), ("Orbit", "#m-orbit")],
     "LLM agents, multi-agent systems, tool calling, MCP, structured outputs, QLoRA, prompt-injection defense, LLM evaluation"),
    ("Machine learning and deep learning", "Models written and trained from scratch in PyTorch, scored once on frozen, pre-registered tests.",
     [("Portfolio", "#m-deep-portfolio-constructor"), ("TSFM", "#m-tsfm"), ("ATLAS", "#m-atlas")],
     "PyTorch, transformers, differentiable optimisation, time-series forecasting, mixed precision, scikit-learn, bootstrap intervals"),
    ("Quant research and portfolios", "Factor-neutral portfolios, walk-forward backtests, and causal estimates of how markets react to central banks.",
     [("Portfolio", "#m-deep-portfolio-constructor"), ("Shock Lab", "#m-world-shock-lab"), ("ATLAS", "#m-atlas")],
     "Portfolio optimisation, risk models, cvxpy, factor models, econometrics, statsmodels, Newey-West inference, QUARCC"),
    ("Engineering practice", "Typed, tested, reproducible code with CI, from Python SDKs and an MCP server to live sites and dashboards.",
     [("Aurvane", "#m-aurvane"), ("Shock Lab", "#m-world-shock-lab"), ("TSFM", "#m-tsfm")],
     "Python, TypeScript, SQL, FastAPI, DuckDB, Git, GitHub Actions, pytest, Playwright, Docker"),
]


def systems() -> str:
    out = []
    for title, text, ev, skills in SYSTEMS:
        links = "".join(f'<li><a href="{h}">{e(n)}</a></li>' for n, h in ev)
        out.append(f"""
        <article class="system" data-reveal>
          <h3>{e(title)}</h3>
          <p>{e(text)}</p>
          <ul class="evidence" aria-label="Evidence">{links}</ul>
          <p class="skills">{e(skills)}</p>
        </article>""")
    return "".join(out)


def page() -> str:
    tagline = e(DATA["tagline"])
    titles = ", ".join(P[i]["title"] for i in ORDER)
    desc = f"Sherif Morsi builds AI agents, deep learning models and quant research systems, scored on tests fixed in advance. Missions: {titles}."
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Sherif Morsi · AI agents, deep learning, quant research</title>
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
  <meta property="og:title" content="Sherif Morsi · Mission manifest">
  <meta property="og:description" content="{tagline} Six missions, each with its own page and every figure traced to a result file.">
  <meta property="og:image" content="https://shmorsi.github.io/assets/og.png">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Sherif Morsi. {tagline}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Sherif Morsi · Mission manifest">
  <meta name="twitter:description" content="{tagline}">
  <meta name="twitter:image" content="https://shmorsi.github.io/assets/og.png">
  <meta name="twitter:image:alt" content="Sherif Morsi. {tagline}">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="assets/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
  <link rel="preload" href="assets/fonts/inter-tight-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="assets/site.css">
  <script>try{{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}}catch(e){{}}document.documentElement.classList.add("js")</script>
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
    "knowsAbout": ["AI agents", "Multi-agent systems", "Large language models", "Deep learning", "PyTorch", "Portfolio construction", "Quantitative research", "Time-series forecasting", "Econometrics", "Python"],
    "sameAs": ["https://github.com/shmorsi", "https://www.linkedin.com/in/sherif-morsi-a17628295"]
  }}
  </script>
</head>
<body data-root="" data-metrics="data/projects.json">
  <a class="skip" href="#main">Skip to content</a>
  <canvas class="stars" data-stars aria-hidden="true"></canvas>

  <header class="site-header"></header>

  <main id="main">
    <section class="hero launch wrap" aria-labelledby="hero-title">
      <!-- A planet limb with slow orbits. Decorative; still under reduced motion. -->
      <canvas class="hero-sky" data-orbits aria-hidden="true"></canvas>
      <div class="hero-main">
        <p class="label">Montreal · Concordia University · Winter 2027 internships</p>
        <h1 id="hero-title">Sherif<br>Morsi</h1>
        <p class="tagline">{tagline}</p>
        <p class="hero-meta">Third-year Computer Science student at Concordia University. Open to 4 to 16 month internships anywhere in Canada from January 2027, in AI agents, machine learning, quantitative research and portfolio construction.</p>
        <div class="actions">
          <a class="button button-solid" href="#missions">View missions</a>
          <a class="button" href="resume/Sherif_Morsi_Resume.pdf" download>Resume</a>
          <a class="button" href="https://github.com/shmorsi" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a class="button" href="https://www.linkedin.com/in/sherif-morsi-a17628295/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
      </div>
      <!-- Figures below mirror data/projects.json so they show without JavaScript. scripts/check_site.py fails if they drift. -->
      <ol class="mission-index" aria-label="Mission telemetry">
        {"".join(telemetry(i) for i in ORDER)}
      </ol>
    </section>

    <section class="section wrap" id="missions" aria-labelledby="missions-title">
      <span id="work"></span>
      <div class="section-head" data-reveal>
        <p class="label">Mission manifest</p>
        <h2 id="missions-title">Missions</h2>
        <p>Six projects. Each has its own mission page with the method, the results and the limits. Filter by the kind of role you are hiring for.</p>
      </div>
      <div class="tracks" role="group" aria-label="Filter missions by track">
        <button type="button" data-track-filter="all" aria-pressed="true">All</button>
        <button type="button" data-track-filter="agents" aria-pressed="false">AI agents</button>
        <button type="button" data-track-filter="ml" aria-pressed="false">Deep learning and ML</button>
        <button type="button" data-track-filter="quant" aria-pressed="false">Quant and finance</button>
        <button type="button" data-track-filter="eng" aria-pressed="false">Engineering</button>
        <span class="visually-hidden" data-track-count aria-live="polite"></span>
      </div>
      <ol class="mission-grid">{"".join(card(i) for i in ORDER)}
      </ol>
      <p class="file-note">Every figure on this site is read from <a href="data/projects.json"><code>data/projects.json</code></a>, and each one names the result file it came from.</p>
    </section>

    <section class="section wrap" id="capabilities" aria-labelledby="capabilities-title">
      <div class="section-head" data-reveal>
        <p class="label">Flight systems</p>
        <h2 id="capabilities-title">Capabilities</h2>
        <p>Four kinds of work, each backed by missions you can open and check.</p>
      </div>
      <div class="systems">{systems()}
      </div>
    </section>

    <section class="section wrap protocol" id="method" aria-labelledby="method-title">
      <div class="section-head" data-reveal>
        <p class="label">Flight rules</p>
        <h2 id="method-title">Method</h2>
        <p>The same four rules on every mission. They are why a number on this site means something.</p>
      </div>
      <ol class="principles" data-reveal>
        <li><span class="label">01 · Decide the test first</span><h3>Pre-registered</h3><p>Splits, metrics, baselines and the rule for a disappointing answer are tagged in git before the test set is opened.</p></li>
        <li><span class="label">02 · No look-ahead</span><h3>Walk-forward only</h3><p>Models refit on past data only. Tests fail if changing data after a decision date changes the decision.</p></li>
        <li><span class="label">03 · Intervals, not points</span><h3>Uncertainty shown</h3><p>Every comparison carries its interval. When the interval includes zero, the page says it is not an improvement.</p></li>
        <li><span class="label">04 · Every number traced</span><h3>Checked by code</h3><p>Figures are read from one data file that names each result's source, and a check fails the build if a page drifts.</p></li>
      </ol>
      <p class="label relay-label">Inside three missions</p>
      <div class="relay" data-reveal>
        <div class="lane">
          <p class="label">Orbit · a team that reviews itself</p>
          <ol class="flow">
            <li><b>Planner</b><span>Plan, as JSON</span></li>
            <li><b>Coder</b><span>Full files, source only</span></li>
            <li><b>Tests</b><span>pytest, no network</span></li>
            <li><b>Critic</b><span>Accept or revise</span></li>
            <li><b>Reviewer</b><span>Code, not a model</span></li>
            <li><b>Trace</b><span>Every turn, JSONL</span></li>
          </ol>
        </div>
        <div class="lane">
          <p class="label">Aurvane · a chain of trust</p>
          <ol class="flow">
            <li><b>You</b><span>Sign a mandate</span></li>
            <li><b>Agent</b><span>Reads anything</span></li>
            <li><b>Sub-agent</b><span>Narrower mandate</span></li>
            <li><b>Guard</b><span>Four rules</span></li>
            <li><b>Tool</b><span>Allow, ask, or block</span></li>
            <li><b>Log</b><span>Hash-chained</span></li>
          </ol>
        </div>
        <div class="lane">
          <p class="label">Deep Portfolio Constructor · learning through the decision</p>
          <ol class="flow">
            <li><b>AlphaFormer</b><span>Views, PyTorch</span></li>
            <li><b>Risk model</b><span>Covariance, PyTorch</span></li>
            <li><b>Optimiser</b><span>Neutral, differentiable</span></li>
            <li><b>Portfolio</b><span>Long-short</span></li>
            <li><b>Next month</b><span>Realised return</span></li>
            <li><b>Gradient</b><span>Back through all three</span></li>
          </ol>
        </div>
      </div>
    </section>

    <section class="section wrap" id="record" aria-labelledby="record-title">
      <span id="experience"></span>
      <div class="section-head" data-reveal>
        <p class="label">Flight record</p>
        <h2 id="record-title">Experience</h2>
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
            <li>Coursework includes data structures and algorithms, object-oriented programming, artificial intelligence, machine learning, linear algebra, and multivariable calculus.</li>
          </ul>
        </div>
      </article>
      <div data-reveal>
        <p class="label certs-label">Certifications</p>
        <div class="certs">
          <article><h3>Building with the Claude API</h3><p>Anthropic</p></article>
          <article><h3>Claude Code 101</h3><p>Anthropic</p></article>
          <article><h3>Claude 101</h3><p>Anthropic</p></article>
          <article><h3>Machine Learning with Python</h3><p>IBM</p></article>
        </div>
        <p class="quarcc"><strong>Quantitative Research and Competitions Club (QUARCC)</strong>, member, Concordia University.</p>
      </div>
    </section>

    <section class="section wrap contact" id="contact" aria-labelledby="contact-title">
      <span id="about"></span>
      <p class="label">Ground control</p>
      <h2 id="contact-title">Contact</h2>
      <div class="split">
        <div>
          <p class="lede">I build AI systems that can be trusted to act, train the models underneath them, and write the measurement down, including when the answer is no.</p>
          <dl class="facts">
            <div><dt>Based</dt><dd>Montreal, Quebec, Canada</dd></div>
            <div><dt>Status</dt><dd>Canadian permanent resident. UAE Golden Visa.</dd></div>
            <div><dt>Open to</dt><dd>Internships of 4, 8, 12, or 16 months, anywhere in Canada, from January 2027</dd></div>
            <div><dt>Languages</dt><dd>English, Arabic, and French (learning)</dd></div>
            <div><dt>Also</dt><dd>QUARCC member. Arab Run Club Montreal. John Molson Book Club.</dd></div>
          </dl>
        </div>
        <div>
          <a class="email" href="mailto:shmorsi@outlook.com">shmorsi@outlook.com</a>
          <p class="phone"><a href="tel:+14385966468">+1 (438) 596-6468</a></p>
          <div class="actions">
            <a class="button button-solid" href="resume/Sherif_Morsi_Resume.pdf" download>Download resume</a>
            <a class="button" href="https://github.com/shmorsi" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a class="button" href="https://www.linkedin.com/in/sherif-morsi-a17628295" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <button class="text-link" type="button" data-copy-email="shmorsi@outlook.com">Copy email</button>
          </div>
        </div>
      </div>
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
