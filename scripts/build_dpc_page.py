#!/usr/bin/env python3
"""Build projects/deep-portfolio-constructor.html (the project page) from data/projects.json.

Same rule as the master page: every figure is a data-bind whose fallback text
is copied from the data here, so the page reads correctly without JavaScript
and scripts/check_site.py can verify it. Run after scripts/sync_dpc.py, then run
scripts/sync_chrome.py, which writes the header, the project label and the previous / next links.
"""

from __future__ import annotations

import html
import json
from pathlib import Path

import lab  # scripts/lab.py: the interactive pieces, rendered as static HTML first

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
PID = "deep-portfolio-constructor"
P = {p["id"]: p for p in DATA["projects"]}
D = P[PID]
e = html.escape


def b(path: str, tag: str = "span", cls: str = "") -> str:
    cur = D
    for part in path.split("."):
        cur = cur[part]
    c = f' class="{cls}"' if cls else ""
    return f'<{tag}{c} data-bind="{PID}.{path}">{e(str(cur), quote=False)}</{tag}>'


def s(key: str) -> str:  # a stat's display value, bound
    return b(f"stats.{key}.display")


def repo_button() -> str:
    """GitHub button from data/projects.json; sync_chrome.py turns it into a note if the repository is private."""
    repo = next(link for link in D["links"] if link["kind"] == "repo")
    return f'<a class="button button-solid" href="{e(repo["href"])}" target="_blank" rel="noopener noreferrer">GitHub</a>'


def figure(src: str, alt: str, caption: str, w: int = 1600, h: int = 900) -> str:
    return f"""<figure class="figure">
            <a class="screen" href="../{src}" target="_blank" rel="noopener" title="Open full size"><img src="../{src}" width="{w}" height="{h}" alt="{e(alt)}" decoding="async" loading="lazy"></a>
            <figcaption>{caption}</figcaption>
          </figure>"""


def page() -> str:
    t = D["title"]
    desc = ("A market-neutral long-short portfolio with deep learning at every layer, in PyTorch: a transformer return model, a "
            "transformer covariance model, and both trained end to end through a differentiable constrained optimiser.")
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
  <meta property="og:image:alt" content="{e(t)}: deep learning at every layer of a market-neutral portfolio.">
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
      <p class="stack"><span class="label">Stack</span> Python, PyTorch, cvxpylayers, cvxpy, pandas, statsmodels, scikit-learn, pytest, Streamlit</p>
    </header>

    <nav class="subnav" data-subnav aria-label="On this page"></nav>

    <div class="wrap">
      <section class="cs-figure" aria-label="At a glance">
        <div data-glance="{PID}"></div>
        {figure("assets/img/dpc-risk.png", "Stacked bars: share of predicted variance from stock-specific bets, style factors and sectors for six market-neutral strategies. The naive signal portfolio is mostly style-factor risk; the classical optimiser is mostly stock-specific risk.", "Ex-ante risk split from an independent Barra-style model (6 style factors, 11 sectors), averaged over out-of-sample rebalances.")}
      </section>
    </div>

    <div class="cs-body wrap">
      <section class="cs-section" aria-labelledby="s-problem">
        <h2 id="s-problem">Objective</h2>
        <div class="prose">
          <p class="big">A long-short book should be paid for the stock views it intends to hold, not for accidental bets on the market, a sector, or a style factor.</p>
          <p>Trade a signal naively and it often carries a factor in disguise: a low-volatility score is mostly a short-beta bet. Here the same three textbook signals (12-1 momentum, one-month reversal, low volatility) are traded six ways on {s("stocks")} US and Canadian large caps, and an independent risk model measures how much of each portfolio's risk comes from the stock bets themselves.</p>
          <p>The pension-fund question behind it: does deep learning help build such a book, or does it just find new ways to take risk nobody asked for?</p>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-try">
        <h2 id="s-try">Try it</h2>
        <div class="prose">
          <p class="big">Why neutralise? Build a tiny long-short book and see where its risk comes from.</p>
          <p>Eight made-up stocks and one signal. Follow the signal and the book quietly bets on the market and on Tech over Energy. Switch to the optimiser and add the constraints one at a time: each one removes a risk the signal never meant to take.</p>
        </div>
        <div class="wide">{lab.neutral_toy()}</div>
      </section>

      <section class="cs-section" aria-labelledby="s-stack">
        <h2 id="s-stack">The deep stack</h2>
        <div class="prose">
          <p class="big">Deep learning at every layer of the portfolio, all in PyTorch, added one layer at a time so each one's contribution can be measured.</p>
          <ul>
            <li><strong>Views: AlphaFormer.</strong> Each stock's last 12 monthly returns are tokens for a transformer; a second transformer attends across stocks, so forecasts are relative and peer-aware. Trained on the negative information coefficient, a three-seed ensemble, {s("paramsAlpha")} parameters per member.</li>
            <li><strong>Risk: a transformer covariance model.</strong> Weekly patches of each stock's last 60 days plus six factor returns, then attention across stocks. The output is a factor covariance, D(BB&#8202;&#7488; + &Psi;)D, positive definite by construction. Trained on Gaussian likelihood, {s("paramsRisk")} parameters.</li>
            <li><strong>Decision: a differentiable optimiser.</strong> The portfolio is the solution of one convex problem (dollar-, sector-, beta-, size- and value-neutral, 5% position caps, a turnover limit), embedded as a cvxpylayers layer. Gradients of the realised result flow back through the optimiser into both networks.</li>
            <li><strong>Trained on the outcome.</strong> The end-to-end loss is next month's realised return, minus trading costs, minus a penalty on realised variance. The return model starts from the classical answer (a zero-initialised residual), so it moves only where that helped on validation.</li>
            <li><strong>Walk-forward.</strong> Every model refits once a year on past data only, from January 2008. A month is a training example only if its outcome was known at the refit date, and the code asserts it.</li>
          </ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-results">
        <h2 id="s-results">Results</h2>
        <div class="prose">
          <p class="big">Portfolio construction removed the unintended risk; training through the optimiser gave the best Sharpe, and the edge is not statistically significant.</p>
          <p>Neutralising sectors, beta, size and value raised the share of risk from intended stock bets from the naive portfolio to the optimised one: {s("intendedShift")}. Then the ablation, one deep component at a time, net Sharpe: classical optimiser {s("sharpeClassical")}; with the deep risk model {s("sharpeDeepRisk")}; with deep views as well {s("sharpeAlpha")}; trained end to end through the optimiser {s("sharpeE2E")}; fully deep, adding the AlphaFormer to end-to-end training, {s("sharpeDeep")}. The end-to-end model's edge over the classical optimiser is {s("diffMonthly")} per month with a Newey-West t of {s("diffT")}: not significant at 5%.</p>
          <p>Pick a step below to see its growth of $1, its risk split and what changed. The exact figures are in the table under it.</p>
        </div>
        <div class="wide">{lab.portfolio_lab("lab-dpc")}</div>
        <div class="prose">
          <div class="table-wrap" tabindex="0" role="region" aria-label="Strategy comparison" data-table="{PID}.tables.performance"></div>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-book">
        <h2 id="s-book">Inside the book</h2>
        <div class="prose">
          <p class="big">The actual portfolio, month by month: drag through 225 rebalances.</p>
          <p>Each bar is one stock's weight in the end-to-end model's book. Longs and shorts sit side by side inside every sector, so each sector nets out near zero: that is the neutrality doing its job. Press play to watch the book turn over through 2008, 2020 and 2022.</p>
        </div>
        <div class="wide">{lab.book_view("../data/dpc_book.json")}</div>
      </section>

      <section class="cs-section" aria-labelledby="s-views">
        <h2 id="s-views">Deep views</h2>
        <div class="prose">
          <p class="big">AlphaFormer turned a useless signal composite into a modestly positive one.</p>
          <p>Out of sample, the classical composite's rank IC was {s("icComposite")}. AlphaFormer's was {s("icDeep")} (Newey-West t {s("icDeepT")}): level with momentum alone ({s("icMomentum")}), not better. Where it differs is the extremes: its top-minus-bottom quintile spread was {s("spreadDeep")} per month, about double momentum's {s("spreadMomentum")}. Positive and still not significant: an honest small edge, not a discovery.</p>
          {figure("assets/img/dpc-ic.png", "Cumulative monthly rank IC since 2008 for AlphaFormer and three classical signals. AlphaFormer's line rises the most; low volatility falls.", "Cumulative rank information coefficient, out of sample, same months for every signal.", 1600, 800)}
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-risk">
        <h2 id="s-risk">Deep risk</h2>
        <div class="prose">
          <p class="big">The deep covariance model forecasts risk better, but does not hedge better.</p>
          <p>Its out-of-sample Gaussian likelihood beats Ledoit-Wolf shrinkage ({s("nllDeep")} vs {s("nllLW")}, lower is better), but the minimum-variance portfolio it builds is more volatile ({s("gmvDeep")} vs {s("gmvLW")}). Likelihood rewards getting each stock's risk level right; hedging depends on small, persistent co-movements that an 8-factor model compresses away. A better forecast is not the same as a better decision, which is the argument for training end to end.</p>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-leak">
        <h2 id="s-leak">The leak</h2>
        <div class="prose">
          <p class="big">End-to-end learning optimises realised profit, so it also learned to take market risk the constraints were meant to remove.</p>
          <p>The optimiser holds the estimated market beta within &plusmn;0.05, and the end-to-end models learned to sit at the top of that band. Betas of volatile stocks are measured with error, so the end-to-end model's realised beta was {s("betaE2E")}. Hedging its own trailing beta, estimated from past returns only, takes its Sharpe from {s("unhedgedE2E")} to {s("hedgedE2E")} on the same window, with an FF6 alpha t of {s("alphaTE2E")} before the hedge. Part of the edge was market exposure.</p>
          {figure("assets/img/dpc-beta.png", "Market beta of two strategies at each rebalance. The end-to-end model's estimated beta sits at the top of the plus-or-minus 0.05 band almost every month, while its realised beta, a dashed line, is 0.19. The classical optimiser's estimated beta mostly sits at the bottom of the band.", "Estimated beta at each rebalance (inside the shaded &plusmn;0.05 limit) against the end-to-end model's realised beta over the whole sample.", 1600, 736)}
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-ablation">
        <h2 id="s-ablation">More deep learning, not better</h2>
        <div class="prose">
          <p class="big">Adding the deep return model to end-to-end training made the portfolio worse, not better.</p>
          <p>The fully deep model trains the AlphaFormer, the risk model and the optimiser together. It scored a net Sharpe of {s("sharpeDeep")} (one seed), with an FF6 alpha t of {s("alphaTDeep")} and a realised beta of {s("betaDeep")}: what return it has is market exposure. The likely reason is sample size. Each yearly refit has at most about 250 monthly decisions to learn from, and the fully deep model has the most parameters to fit to them; it learned to lean ever harder on the AlphaFormer's score. The same AlphaFormer helped as a plain input (the two-stage model, {s("sharpeAlpha")}).</p>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-robust">
        <h2 id="s-robust">Robustness</h2>
        <div class="prose">
          <ul>
            <li><strong>Seeds.</strong> Net Sharpe of the end-to-end model across three seeds: {s("seedsE2E")}. The headline seed is the best of the three.</li>
            <li><strong>Costs.</strong> The same trades re-priced: end-to-end Sharpe {s("costE2E20")} at 20 bps and {s("costE2E40")} at 40 bps.</li>
            <li><strong>Constraints.</strong> Position caps from 3% to 10% and sector limits from 2.5% to 10%: Sharpe {s("constraintRange")}, using the trained forecasts.</li>
            <li><strong>Model size.</strong> The deep risk model at 8K, 29K and 109K parameters always beats Ledoit-Wolf on likelihood and always loses to it on minimum-variance volatility.</li>
            <li><strong>Reproducible.</strong> Retraining the deep risk model from scratch reproduces the main run digit for digit.</li>
          </ul>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-limits">
        <h2 id="s-limits">Limits</h2>
        <div class="prose">
          <div class="callout">
            <p>The universe is today's large caps: no point-in-time index membership was available, so long-only results carry survivorship bias and the low-volatility signal is penalised. Sector labels are current, not point-in-time.</p>
            <p>Size and value exposure are rolling betas to the Fama-French factors, not fundamental characteristics; estimation error in those betas is how market risk leaked through.</p>
            <p>No deep model's improvement is statistically significant, and six market-neutral variants were compared, so a multiple-testing haircut applies. Execution is simplified: monthly close, a flat 10 bps, no borrow costs.</p>
          </div>
        </div>
      </section>

      <section class="cs-section" aria-labelledby="s-checks">
        <h2 id="s-checks">Checks</h2>
        <div class="prose">
          <p>{s("tests")} automated tests, including: gradients through the optimiser layer checked against finite differences; the deep models' permutation equivariance across stocks; walk-forward label dates asserted; and truncation invariance, where scrambling every return after a date must leave every earlier decision unchanged. As calibration, a deliberately cheating strategy that trades on next month's returns scores a Sharpe of {s("oracleSharpe")}.</p>
          <p>A first-principles notebook rebuilds the ideas in a few lines of PyTorch: the neutrality projection, an optimiser differentiated with autograd, and a model learning the right signal from portfolio returns alone. A Streamlit dashboard shows current weights, the risk split and exposures against their limits.</p>
          <p class="file-note">Figures on this page are read from <a href="../data/projects.json"><code>data/projects.json</code></a>, copied from the project's committed <a href="https://github.com/shmorsi/deep-portfolio-constructor/blob/main/reports/site_figures.json" target="_blank" rel="noopener noreferrer"><code>reports/site_figures.json</code></a>.</p>
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
