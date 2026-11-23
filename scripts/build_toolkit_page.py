#!/usr/bin/env python3
"""Build projects/toolkit.html: the quant and institutional toolkit, every figure read from a result file.

    python3 scripts/build_toolkit_page.py                # project repos checked out next to this one
    python3 scripts/build_toolkit_page.py --src ~/code   # or wherever they are

Reads the committed results of three repositories and copies what the page quotes into
data/toolkit.json (with each source's path and commit), and four figures into assets/img/toolkit/.
When a repository is not checked out, the snapshot already in data/toolkit.json is used, so the
page always builds. scripts/sync_all.py runs this before sync_chrome.py, which dresses the page
with the site's header and footer. Nothing on the page is typed by hand.
"""

from __future__ import annotations

import argparse
import html
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "data" / "toolkit.json"
PAGE = ROOT / "projects" / "toolkit.html"
IMG = ROOT / "assets" / "img" / "toolkit"
GH = "https://github.com/shmorsi"

SOURCES = {
    "institutional": ("deep-portfolio-constructor", "reports/institutional/summary.json"),
    "derivatives": ("deep-portfolio-constructor", "reports/derivatives/summary.json"),
    "anomalies": ("deep-portfolio-constructor", "reports/anomalies/summary.json"),
    "excel": ("deep-portfolio-constructor", "excel/verification.json"),
    "stance_dev": ("world-shock-lab", "results/stance/dev.json"),
    "stance_test": ("world-shock-lab", "results/stance/test.json"),
    "stance_external": ("world-shock-lab", "results/stance/external.json"),
    "serve_export": ("tsfm-from-scratch", "results/serve/export.json"),
    "serve_bench": ("tsfm-from-scratch", "results/serve/bench_cpu_1thread.json"),
}
FIGURES = {
    "active.png": ("deep-portfolio-constructor", "reports/figures/institutional/active.png"),
    "ldi.png": ("deep-portfolio-constructor", "reports/figures/institutional/ldi.png"),
    "vrp.png": ("deep-portfolio-constructor", "reports/figures/derivatives/vrp.png"),
    "anomalies.png": ("deep-portfolio-constructor", "reports/figures/anomalies/combine.png"),
}
KEEP = {   # what the page quotes, per source (keeps the snapshot small)
    "institutional": ["active", "curve", "liabilities", "ldi", "fx", "privates", "var"],
    "derivatives": ["vrp", "curve", "overlay", "examples"],
}


def _find(src: Path, name: str) -> Path | None:
    for p in src.iterdir() if src.is_dir() else []:
        if p.is_dir() and p.name.lower() == name.lower():
            return p
    return None


def _commit(repo: Path) -> str:
    out = subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=False)
    return out.stdout.strip() or "unknown"


def _slim(key: str, data: dict) -> dict:
    if key in KEEP:
        data = {k: data[k] for k in KEEP[key] if k in data}
    if key == "institutional":
        data["active"] = {k: data["active"][k] for k in ("budgets", "risk_models", "final_risk", "attribution")}
        data["curve"] = {k: v for k, v in data["curve"].items() if k not in ("latest_fit",)}
        data["privates"] = {"fund": {k: data["privates"]["fund"][k] for k in ("tvpi", "irr", "breakeven_year", "trough_cumulative_net")},
                            "pacing": {k: data["privates"]["pacing"][k] for k in ("target", "commit_rate", "years_to_90pct_of_target", "share_before", "share_after_crash")},
                            "desmoothing": data["privates"]["desmoothing"]}
    if key == "anomalies":
        data = {k: data[k] for k in ("start", "end", "months", "n_t196", "n_t3", "n_bh", "survival", "pooled", "combine_start", "combine")}
    return data


def collect(src: Path) -> dict:
    snap = json.loads(SNAPSHOT.read_text()) if SNAPSHOT.exists() else {"sources": {}}
    for key, (repo_name, rel) in SOURCES.items():
        repo = _find(src, repo_name)
        if repo and (repo / rel).is_file():
            snap[key] = _slim(key, json.loads((repo / rel).read_text()))
            snap["sources"][key] = {"repository": repo_name, "path": rel, "commit": _commit(repo)}
    IMG.mkdir(parents=True, exist_ok=True)
    for name, (repo_name, rel) in FIGURES.items():
        repo = _find(src, repo_name)
        if repo and (repo / rel).is_file():
            shutil.copyfile(repo / rel, IMG / name)
    missing = [k for k in SOURCES if k not in snap]
    if missing:
        raise SystemExit(f"no result files and no snapshot for: {', '.join(missing)}")
    SNAPSHOT.write_text(json.dumps(snap, indent=1) + "\n")
    return snap


def e(x) -> str:
    return html.escape(str(x), quote=True)


def pct(x: float, d: int = 1) -> str:
    return f"{100 * x:.{d}f}%"


def table(caption: str, head: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th scope=\"col\">{e(h)}</th>" for h in head)
    body = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return (f'<div class="table-wrap" tabindex="0" role="region" aria-label="{e(caption)}">'
            f'<table><caption>{e(caption)}</caption><thead><tr>{th}</tr></thead><tbody>{body}</tbody></table></div>')


def figure(name: str, alt: str, caption: str) -> str:
    return (f'<figure class="figure-block"><img src="../assets/img/toolkit/{name}" alt="{e(alt)}" loading="lazy" '
            f'style="width:100%;height:auto;border-radius:6px;background:#fff"><figcaption class="caveat">{e(caption)}</figcaption></figure>')


def section(sid: str, title: str, body: str) -> str:
    return (f'      <section class="cs-section" aria-labelledby="s-{sid}">\n        <h2 id="s-{sid}">{e(title)}</h2>\n'
            f'        <div class="prose">\n{body}\n        </div>\n      </section>\n')


def source(key: str, s: dict) -> str:
    src = s["sources"][key]
    repo = {"deep-portfolio-constructor": "deep-portfolio-constructor", "world-shock-lab": "world-shock-lab", "tsfm-from-scratch": "tsfm-from-scratch"}[src["repository"]]
    return f'<a class="text-link" href="{GH}/{repo}/blob/main/{src["path"]}" target="_blank" rel="noopener noreferrer">{e(src["path"])}</a> ({e(src["repository"])} @ <code>{e(src["commit"])}</code>)'


def render(s: dict) -> str:
    ins, der, an, xl = s["institutional"], s["derivatives"], s["anomalies"], s["excel"]
    sd, st, sx, se, sb = s["stance_dev"], s["stance_test"], s["stance_external"], s["serve_export"], s["serve_bench"]
    m = ins["active"]["budgets"]["0.02"]
    rm = ins["active"]["risk_models"]
    at = ins["active"]["attribution"]
    v = der["vrp"]
    var = ins["var"]
    full = next(r for r in ins["ldi"]["rows"] if r["hedge_ratio"] > 0.99)
    lbo, pen = xl["lbo_private_credit.xlsx"], xl["pension_funding_model.xlsx"]
    lat = sb["latency"]
    desc = ("The machinery around a portfolio, built and tested on public data: risk models, attribution in SQL, VaR backtests, derivatives and rates, "
            "LDI liquidity stress, private-markets pacing, an anomaly zoo, Excel models checked against Python, a LoRA fine-tune and a deployed model service.")
    sections = []
    sections.append(section("risk", "Risk, optimisation and attribution", f"""          <p class="big">A long-only portfolio against the cap-weighted market of 30 US industries, decided each month with past data only, {e(m['start'])} to {e(m['end'])}.</p>
          <ul>
            <li><strong>Factor risk model.</strong> Market, size and value loadings from 60 months of returns, plus each industry's own risk; ex-ante risk split into factor and specific parts that add up exactly.</li>
            <li><strong>Black-Litterman.</strong> Start from the returns the benchmark implies; move toward one momentum view sized from the previous ten years.</li>
            <li><strong>Tracking-error budget.</strong> Maximise expected return within {pct(0.02, 0)} tracking error, long-only, at most ten points over any benchmark weight (cvxpy). Net of costs: {pct(m['active_return_ann'], 2)} a year active (Newey-West t {m['active_t_nw']:.2f}), information ratio {m['information_ratio']:.2f}. The view was chosen knowing an earlier momentum result, so this shows the machinery, not an edge.</li>
            <li><strong>Was the risk forecast right?</strong> The bias statistic (1 is perfect) was {m['bias_statistic']:.2f} for the factor model, {rm['shrunk']['bias_statistic']:.2f} for a Ledoit-Wolf covariance: the three-factor model under-forecasts the risk of sector bets.</li>
            <li><strong>Brinson-Fachler attribution, Carino-linked.</strong> {pct(at['full_span_average_totals']['allocation'], 2)} a year from allocation, {pct(at['full_span_average_totals']['selection'], 2)} from selection. The same calculation in SQL (DuckDB) agrees with pandas to {at['sql_max_abs_difference']:.0e}.</li>
          </ul>
          {figure('active.png', 'Portfolio growth relative to the benchmark since 1970, and the rolling bias statistic of the risk forecasts.', 'Left: portfolio divided by benchmark. Right: the rolling 36-month bias statistic.')}
          <p class="caveat">Source: {source('institutional', s)}</p>"""))
    sections.append(section("var", "Value at risk, backtested", f"""          <p>A 99% one-month VaR of the US stock market forecast each month from the previous {var['window_months']} months, {e(var['start'])} to {e(var['end'])}. A sound model is exceeded in 1% of months (Kupiec) and its exceptions do not cluster (Christoffersen).</p>
          {table('99% VaR backtest of the US stock market', ['Model', 'Exceptions (expected)', 'Kupiec p', 'Christoffersen p'], [
              [n, f"{var[k]['exceptions']} ({var[k]['expected']:.1f})", f"{var[k]['p_value']:.3f}", f"{var[k]['independence']['p_value']:.3f}"]
              for k, n in (('historical', 'Historical simulation'), ('normal', 'Normal'), ('ewma', 'EWMA volatility'))])}"""))
    sections.append(section("derivatives", "Derivatives and the volatility risk premium", f"""          <p class="big">Selling a one-month straddle on the US market at the VIX and hedging its delta every day earned {pct(v['mean_hedged_pnl'], 2)} of the index a month from {e(v['start'])} to {e(v['end'])} (Newey-West t {v['t_nw']:.1f}).</p>
          <ul>
            <li>Positive in {pct(v['hit_rate'], 0)} of months; the losses come in a few crashes: {', '.join(e(w['month']) for w in v['worst'])}. The VIX sits above at-the-money volatility, so this overstates the premium somewhat.</li>
            <li>The library: Black-Scholes-Merton, Black-76 and Bachelier with Greeks and implied volatility; American options on binomial trees; Monte Carlo with antithetic and control variates; SABR calibration; Treasury curve bootstrapping, swaps and DV01. Every formula is checked against Hull's textbook values or an identity.</li>
            <li>Hull's Example 15.6: call {der['examples']['hull_15_6']['call']:.4f} (book 4.76). Early-exercise premium of an American put: {der['examples']['early_exercise_premium']:.3f}.</li>
          </ul>
          {figure('vrp.png', 'Monthly profit and loss of a delta-hedged short straddle on the US stock market since 1990, and its cumulative sum.', 'Left: P&L by month, as a share of the index. Right: cumulative P&L.')}
          <p class="caveat">Source: {source('derivatives', s)}</p>"""))
    sections.append(section("ldi", "Pensions: liabilities, LDI and currency", f"""          <ul>
            <li><strong>The promise with mortality.</strong> A closed cohort under the Gompertz-Makeham Standard Ultimate Survival Model; solvency duration {ins['liabilities']['solvency_duration']:.1f}; death rates 20% lower add {pct(ins['liabilities']['longevity_increase'])} to the liability. Key-rate durations on a Nelson-Siegel-Svensson Treasury curve (median fit {ins['curve']['fit_rmse_bp_median']:.1f} bp; level, slope and curvature explain {pct(ins['curve']['pca_cumulative'])} of curve moves).</li>
            <li><strong>LDI with a swap overlay.</strong> A full hedge takes {full['leverage']:.2f}× leverage and its collateral covers a {full['max_survivable_rise_bp']:.0f} bp rise; the worst month for the US 30-year yield since 1977 was {ins['ldi']['worst_us30']['20']['rise'] * 1e4:.0f} bp. Hedging steadies the funded ratio and creates liquidity risk: the 2022 UK LDI lesson. The swap was priced on the bootstrapped curve, which corrected the stress test's duration.</li>
            <li><strong>Currency.</strong> For a Canadian investor in US stocks ({e(ins['fx']['start'])} to {e(ins['fx']['end'])}), the minimum-variance hedge ratio is {ins['fx']['min_variance_ratio']:.2f}: the US dollar rose {pct(ins['fx']['usd_move_in_worst_24_equity_months'])} on average in the 24 worst months for US stocks.</li>
          </ul>
          {figure('ldi.png', 'As the interest-rate hedge ratio rises, the funded-ratio loss in a stress grows smaller while the yield rise the collateral can meet falls.', 'Funding risk falls as liquidity risk rises.')}"""))
    pa = ins["privates"]["pacing"]
    sections.append(section("privates", "Private markets and spreadsheets", f"""          <ul>
            <li><strong>Pacing a programme.</strong> Takahashi-Alexander fund cash flows (TVPI {ins['privates']['fund']['tvpi']:.2f}×). To hold {pct(pa['target'], 0)} in private assets the plan commits {pct(pa['commit_rate'])} of its assets a year and needs {pa['years_to_90pct_of_target']} years to reach 90% of target; a 30% public crash lifts the private share from {pct(pa['share_before'])} to {pct(pa['share_after_crash'])}: the denominator effect.</li>
            <li><strong>Desmoothing.</strong> Geltner's correction recovers volatility that appraisal smoothing hides ({pct(ins['privates']['desmoothing']['vol_observed'])} reported against {pct(ins['privates']['desmoothing']['vol_true'])} true, {pct(ins['privates']['desmoothing']['vol_desmoothed'])} recovered).</li>
            <li><strong>Excel, with live formulas.</strong> An LBO with a senior loan, cash sweep and private-credit tranche ({lbo['moic']:.2f}× and {pct(lbo['irr'])}; leverage {lbo['leverage_entry']:.1f}× to {lbo['leverage_exit']:.1f}×), and a 20-year pension funding model. LibreOffice recalculates both and they match Python to {max(lbo['max_abs_difference'], pen['max_abs_difference']):.0e}.
              <a class="text-link" href="{GH}/deep-portfolio-constructor/raw/main/excel/lbo_private_credit.xlsx">LBO workbook</a> · <a class="text-link" href="{GH}/deep-portfolio-constructor/raw/main/excel/pension_funding_model.xlsx">Pension workbook</a></li>
          </ul>
          <p class="caveat">Source: {source('excel', s)}</p>"""))
    sv = an["survival"]
    comb = an["combine"]
    labels = {"equal_weight": "Equal weight", "factor_momentum": "Factor momentum", "shrinkage_mv": "Shrinkage mean-variance", "boosting": "Gradient boosting"}
    sections.append(section("anomalies", "The anomaly zoo", f"""          <p class="big">Fifteen published equity anomalies, {e(an['start'])} to {e(an['end'])}: {an['n_t196']} clear t = 1.96, {an['n_t3']} clears 3.0, and returns fell from {pct(an['pooled']['mean_pre_ann'])} to {pct(an['pooled']['mean_post_ann'])} a year after the papers appeared.</p>
          {table('Combining the anomalies out of sample', ['Strategy', 'Sharpe', 'Since 2000', 'Against equal weight'], [
              [labels[k], f"{comb[k]['sharpe']:.2f}", f"{comb[k]['sharpe_since_2000']:.2f}", comb[k]['vs_equal_weight']['verdict'] if 'vs_equal_weight' in comb[k] else 'the benchmark'] for k in labels])}
          {figure('anomalies.png', 'Out-of-sample growth of four ways to hold fifteen anomalies since 1973, on a log scale.', 'Each month from 1973, using only the past.')}
          <p class="caveat">Momentum's Newey-West t: {sv['momentum']['t']:.2f}. Source: {source('anomalies', s)}</p>"""))
    lr = sd["lora_roberta"]
    sections.append(section("stance", "Fine-tuning a language model", f"""          <p class="big">roberta-base with LoRA adapters ({pct(lr['parameters']['share'], 2)} of its parameters trained, on a CPU) reads central-bank sentences as dovish, hawkish or neutral.</p>
          {table('Test split, scored once under a protocol tagged in git before training', ['Model', 'Macro-F1', 'Accuracy'], [
              ['Majority class', f"{st['majority']['macro_f1']:.3f}", pct(st['majority']['accuracy'])],
              ['TF-IDF + logistic regression', f"{st['tfidf_logreg']['macro_f1']:.3f}", pct(st['tfidf_logreg']['accuracy'])],
              ['roberta-base + LoRA', f"{st['lora_roberta']['macro_f1']:.3f}", pct(st['lora_roberta']['accuracy'])]])}
          <p>LoRA minus TF-IDF: {st['primary']['difference']:+.3f} (90% CI {st['primary']['lo']:+.3f} to {st['primary']['hi']:+.3f}): {e(st['primary']['verdict'])}. Out of domain, on {sx['pairs']} Bank of Canada statements, the classifier's stance correlates with the next decision at {sx['spearman']['rho']:.2f} (90% CI {sx['spearman']['lo']:.2f} to {sx['spearman']['hi']:.2f}), though little of that survives once today's decision is known.</p>
          <p class="caveat">Data: Shah, Paturi and Chava (ACL 2023). Source: {source('stance_test', s)}</p>"""))
    sections.append(section("serving", "Serving and MLOps", f"""          <ul>
            <li><strong>Export.</strong> The forecasting model's forward pass as an ONNX graph, matching PyTorch to {se['fp32']['parity']['max_abs']:.0e}.</li>
            <li><strong>Service.</strong> FastAPI with ONNX Runtime in a two-stage Docker image that CI builds and calls; Kubernetes manifests with probes and an autoscaler; Prometheus metrics and input-drift monitoring by population stability index; an MLflow run and model registry.</li>
            <li><strong>Latency</strong> (one thread, one series): PyTorch {lat['torch']['1']['p50_ms']:.1f} ms, ONNX {lat['onnx_fp32']['1']['p50_ms']:.1f} ms, int8 {lat['onnx_int8']['1']['p50_ms']:.1f} ms; int8's loss is {sb['accuracy']['int8_vs_fp32_ratio']:.3f}× fp32's on {sb['accuracy']['series']} held-out series.</li>
          </ul>
          <p class="caveat">Source: {source('serve_bench', s)}</p>"""))
    sections.append(section("limits", "Read with care", """          <ul>
            <li>Only the language-model test was pre-registered; the rest are tested tools run once on public data, and each report says so.</li>
            <li>Industries and decile portfolios, not stocks; gross of most trading costs; a three-factor risk model; a textbook mortality table; illustrative private-fund parameters.</li>
          </ul>"""))
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>Quant and institutional toolkit · Sherif Morsi</title>
  <meta name="description" content="{e(desc)}">
  <meta name="author" content="Sherif Morsi">
  <meta name="color-scheme" content="dark light">
  <link rel="canonical" href="https://shmorsi.github.io/projects/toolkit.html">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://shmorsi.github.io/projects/toolkit.html">
  <meta property="og:title" content="Quant and institutional toolkit · Sherif Morsi">
  <meta property="og:description" content="{e(desc)}">
  <meta property="og:image" content="https://shmorsi.github.io/assets/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../assets/site.css">
  <script>try{{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}}catch(e){{}}</script>
  <script src="../assets/site.js" defer></script>
</head>
<body data-root="../">
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header"></header>
  <main id="main">
    <header class="cs-hero wrap">
      <a class="text-link all-link" href="../#work">All projects</a>
      <p class="label"><span class="num">05</span> Capital markets, risk and private markets · <span class="status">Tested toolkit</span></p>
      <h1>Quant and institutional toolkit</h1>
      <p class="cs-purpose">{e(desc)}</p>
      <div class="actions">
        <a class="button button-solid" href="{GH}/deep-portfolio-constructor/tree/main/src/dpc" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a class="text-link" href="{GH}/deep-portfolio-constructor/blob/main/reports/institutional/results.md" target="_blank" rel="noopener noreferrer">Every table</a>
      </div>
      <p class="stack"><span class="label">Stack</span> Python, cvxpy, SciPy, DuckDB SQL, Excel, PyTorch, Hugging Face PEFT, ONNX Runtime, FastAPI, Docker, Kubernetes, MLflow, pytest</p>
    </header>
    <div class="cs-body wrap">
{''.join(sections)}    </div>
  </main>
  <footer class="site-footer"></footer>
</body>
</html>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", default=str(ROOT.parent))
    a = ap.parse_args()
    snap = collect(Path(a.src).expanduser().resolve())
    PAGE.write_text(render(snap))
    print(f"wrote {PAGE.relative_to(ROOT)} and {SNAPSHOT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
