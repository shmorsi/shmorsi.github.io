#!/usr/bin/env python3
"""Write the Deep Portfolio Constructor entry in data/projects.json.

Every figure is copied from the project's committed export,
deep-portfolio-constructor/reports/site_figures.json (written by
`python -m dpc.cli site`), and keeps that file and row as its source.
Nothing here is typed by hand.

    python3 scripts/sync_dpc.py ../deep-portfolio-constructor/reports/site_figures.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = "deep-portfolio-constructor"


def main(fig_path: str) -> None:
    F = json.loads(Path(fig_path).read_text())

    def v(key: str) -> float:
        return F[key]["value"]

    def src(*keys: str) -> str:
        return "; ".join(f"{REPO} reports/site_figures.json [{k}], from {F[k]['source']}" for k in keys)

    pct = lambda x: f"{x * 100:.0f}%"  # noqa: E731
    sgn = lambda x, d=2: f"{x:+.{d}f}".replace("-", "−")  # noqa: E731
    num = lambda x, d=2: f"{x:.{d}f}".replace("-", "−")  # noqa: E731

    def stat(label: str, display: str, *keys: str) -> dict:
        return {"label": label, "display": display, "source": src(*keys)}

    seeds = sorted(k for k in F if k.startswith("seeds.seed="))
    seed_disp = " / ".join(num(v(k)) for k in seeds)
    diff = "diff.e2e - ls_classical"  # the primary end-to-end model, pre-specified in Stage 5
    diff_deep = "diff.e2e_deep - ls_classical"
    stats = {
        "intendedShift": stat("Share of risk from intended stock bets, naive to optimised",
                              f"{pct(v('ls_naive.exante_share_specific'))} → {pct(v('ls_classical.exante_share_specific'))}",
                              "ls_naive.exante_share_specific", "ls_classical.exante_share_specific"),
        "specificE2E": stat("Share of risk from intended bets, end-to-end model", pct(v("e2e.exante_share_specific")), "e2e.exante_share_specific"),
        "specificDeep": stat("Share of risk from intended bets, fully deep model", pct(v("e2e_deep.exante_share_specific")), "e2e_deep.exante_share_specific"),
        "sharpeE2E": stat("Net Sharpe, end-to-end model (deep risk, trained through the optimiser)", num(v("e2e.sharpe")), "e2e.sharpe"),
        "sharpeDeep": stat("Net Sharpe, fully deep model (adds the AlphaFormer)", num(v("e2e_deep.sharpe")), "e2e_deep.sharpe"),
        "sharpeAlpha": stat("Net Sharpe, deep views and deep risk, two-stage", num(v("ls_deep_alpha.sharpe")), "ls_deep_alpha.sharpe"),
        "sharpeDeepRisk": stat("Net Sharpe, deep risk model only", num(v("ls_deep_twostage.sharpe")), "ls_deep_twostage.sharpe"),
        "sharpeClassical": stat("Net Sharpe, classical optimiser", num(v("ls_classical.sharpe")), "ls_classical.sharpe"),
        "sharpeNaive": stat("Net Sharpe, naive signal portfolio", num(v("ls_naive.sharpe")), "ls_naive.sharpe"),
        "diffT": stat("End-to-end minus classical, Newey-West t", num(v(f"{diff}.t_stat")), f"{diff}.t_stat"),
        "diffMonthly": stat("End-to-end minus classical, monthly return", f"{sgn(v(f'{diff}.mean_monthly_diff') * 100)}%", f"{diff}.mean_monthly_diff"),
        "diffDeepT": stat("Fully deep minus classical, Newey-West t", num(v(f"{diff_deep}.t_stat")), f"{diff_deep}.t_stat"),
        "betaE2E": stat("Realised market beta, end-to-end model", num(v("e2e.beta_mkt")), "e2e.beta_mkt"),
        "betaDeep": stat("Realised market beta, fully deep model", num(v("e2e_deep.beta_mkt")), "e2e_deep.beta_mkt"),
        "hedgedE2E": stat("Net Sharpe after hedging its own trailing beta, end-to-end model", num(v("e2e.sharpe_beta_hedged")), "e2e.sharpe_beta_hedged"),
        "unhedgedE2E": stat("Same window, before the hedge", num(v("e2e.sharpe_unhedged")), "e2e.sharpe_unhedged"),
        "alphaTE2E": stat("FF6 alpha t-stat, end-to-end model", num(v("e2e.alpha_t_ff6")), "e2e.alpha_t_ff6"),
        "alphaTDeep": stat("FF6 alpha t-stat, fully deep model", num(v("e2e_deep.alpha_t_ff6")), "e2e_deep.alpha_t_ff6"),
        "icDeep": stat("Out-of-sample rank IC, AlphaFormer", num(v("ic.deep_alpha.mean_IC"), 4), "ic.deep_alpha.mean_IC"),
        "icDeepT": stat("AlphaFormer IC, Newey-West t", num(v("ic.deep_alpha.IC_t_stat_NW")), "ic.deep_alpha.IC_t_stat_NW"),
        "icMomentum": stat("Out-of-sample rank IC, momentum alone", num(v("ic.momentum.mean_IC"), 4), "ic.momentum.mean_IC"),
        "spreadMomentum": stat("Top minus bottom quintile, momentum alone, per month", f"{sgn(v('ic.momentum.Q5_minus_Q1_monthly') * 100)}%", "ic.momentum.Q5_minus_Q1_monthly"),
        "icComposite": stat("Out-of-sample rank IC, classical composite", num(v("ic.combined.mean_IC"), 4), "ic.combined.mean_IC"),
        "spreadDeep": stat("Top minus bottom quintile, AlphaFormer, per month", f"{sgn(v('ic.deep_alpha.Q5_minus_Q1_monthly') * 100)}%", "ic.deep_alpha.Q5_minus_Q1_monthly"),
        "nllDeep": stat("Out-of-sample covariance NLL, deep model (lower is better)", num(v("risk.deep.mean_oos_nll"), 3), "risk.deep.mean_oos_nll"),
        "nllLW": stat("Out-of-sample covariance NLL, Ledoit-Wolf", num(v("risk.ledoit_wolf.mean_oos_nll"), 3), "risk.ledoit_wolf.mean_oos_nll"),
        "gmvDeep": stat("Minimum-variance realised vol, deep covariance", f"{v('risk.deep.gmv_realised_vol_ann') * 100:.1f}%", "risk.deep.gmv_realised_vol_ann"),
        "gmvLW": stat("Minimum-variance realised vol, Ledoit-Wolf", f"{v('risk.ledoit_wolf.gmv_realised_vol_ann') * 100:.1f}%", "risk.ledoit_wolf.gmv_realised_vol_ann"),
        "seedsE2E": stat("Net Sharpe of the end-to-end model across seeds 42 / 43 / 44", seed_disp, *seeds),
        "tests": stat("Automated tests", f"{int(v('tests'))}", "tests"),
        "oracleSharpe": stat("Sharpe of a deliberately cheating oracle (look-ahead calibration)", num(v("oracle_sharpe"), 1), "oracle_sharpe"),
        "costE2E20": stat("End-to-end model Sharpe at 20 bps costs", num(v("cost.e2e.sharpe@20bps")), "cost.e2e.sharpe@20bps"),
        "costE2E40": stat("End-to-end model Sharpe at 40 bps costs", num(v("cost.e2e.sharpe@40bps")), "cost.e2e.sharpe@40bps"),
        "constraintRange": stat("End-to-end model Sharpe across position caps 3-10% and sector limits 2.5-10%",
                                f"{num(v('constraints.e2e.sharpe_min'))} to {num(v('constraints.e2e.sharpe_max'))}",
                                "constraints.e2e.sharpe_min", "constraints.e2e.sharpe_max"),
        "paramsAlpha": stat("AlphaFormer parameters, per ensemble member", f"{int(v('params.alpha_former')):,}", "params.alpha_former"),
        "paramsRisk": stat("Deep risk model parameters", f"{int(v('params.risk_model')):,}", "params.risk_model"),
        "stocks": stat("Stocks, US and Canadian large caps", f"{int(v('universe.n_stocks'))}", "universe.n_stocks"),
        "months": stat("Out-of-sample months, walk-forward", f"{int(v(f'{diff}.n_months'))}", f"{diff}.n_months"),
    }
    names = [("ls_naive", "Naive signal, no risk model"), ("ls_classical", "Classical: Ledoit-Wolf + optimiser"),
             ("ls_deep_twostage", "Deep risk model + optimiser"), ("ls_deep_alpha", "Deep views + deep risk + optimiser"),
             ("e2e", "End-to-end through the optimiser (primary)"), ("e2e_deep", "Fully deep: adds AlphaFormer to end-to-end")]
    perf_rows = [[label, num(v(f"{sid}.sharpe")), f"{v(f'{sid}.ann_return') * 100:.1f}%".replace("-", "\u2212"),
                  f"{v(f'{sid}.ann_vol') * 100:.1f}%", f"{v(f'{sid}.max_drawdown') * 100:.0f}%".replace("-", "\u2212"),
                  num(v(f"{sid}.alpha_t_ff6")), num(v(f"{sid}.beta_mkt")), pct(v(f"{sid}.exante_share_specific"))]
                 for sid, label in names if f"{sid}.sharpe" in F]
    tables = {
        "performance": {
            "caption": "Market-neutral strategies, out of sample January 2008 to September 2026, monthly rebalancing, net of 10 bps costs.",
            "headers": ["Strategy", "Net Sharpe", "Return", "Volatility", "Max drawdown", "FF6 alpha t", "Market beta", "Risk from intended bets"],
            "rows": perf_rows,
            "highlightRow": [sid for sid, _ in names if f"{sid}.sharpe" in F].index("e2e"),
            "source": f"{REPO} reports/stage6_performance.csv and reports/stage6_risk_decomposition.csv via reports/site_figures.json",
        },
    }
    entry = {
        "id": REPO,
        "number": "01",
        "code": "DPC",
        "role": "featured",
        "badge": "Walk-forward",
        "kicker": "Deep learning and quant",
        "title": "Deep Portfolio Constructor",
        "summary": ("A market-neutral long-short equity portfolio built as a five-step ablation, with PyTorch at every layer: a "
                    "transformer return model (AlphaFormer), a transformer covariance model, and end-to-end training through a "
                    "differentiable constrained optimiser (cvxpylayers). Walk-forward from January 2008, net of 10 bps costs, "
                    f"{int(v('universe.n_stocks'))} US and Canadian large caps."),
        "purpose": ("A long-short portfolio that keeps the intended stock bets and removes unintended sector and factor risk, "
                    "with PyTorch models for the views, the risk, and the decision itself."),
        "proves": (f"Making the optimiser neutral to sectors, beta, size and value raised the share of risk from intended stock bets "
                   f"from {pct(v('ls_naive.exante_share_specific'))} to {pct(v('ls_classical.exante_share_specific'))}. "
                   f"Training through the optimiser gave the best net Sharpe, {num(v('e2e.sharpe'))} against "
                   f"{num(v('ls_classical.sharpe'))} for the classical optimiser; the gap is not statistically significant, "
                   f"and adding the deep return model on top did not help."),
        "caveat": (f"Walk-forward, out of sample from January 2008, {int(v(f'{diff}.n_months'))} months, net of 10 bps costs, monthly rebalancing. "
                   f"The universe is today's {int(v('universe.n_stocks'))} large caps, so survivorship bias inflates long-only results. "
                   f"The end-to-end model's edge over the classical optimiser has a Newey-West t of {num(v(f'{diff}.t_stat'))}, not significant. "
                   f"Its realised market beta was {num(v('e2e.beta_mkt'))} despite an ex-ante limit of 0.05; hedging its own trailing beta "
                   f"takes its Sharpe from {num(v('e2e.sharpe_unhedged'))} to {num(v('e2e.sharpe_beta_hedged'))} on the same window. "
                   f"The fully deep model, which adds the AlphaFormer, scored {num(v('e2e_deep.sharpe'))} with an FF6 alpha t of "
                   f"{num(v('e2e_deep.alpha_t_ff6'))}, one seed. The deep covariance model wins on likelihood but loses to Ledoit-Wolf "
                   f"on minimum-variance volatility."),
        "image": {"src": "assets/img/dpc-risk.png", "alt": "Bar chart: share of predicted portfolio variance from stock-specific bets, style factors and sectors for each strategy.",
                  "width": 1600, "height": 900},
        "tags": ["Python", "PyTorch", "cvxpylayers", "cvxpy", "pandas", "pytest", "Streamlit"],
        "links": [
            {"label": "Project page", "href": "projects/deep-portfolio-constructor.html", "kind": "site"},
            {"label": "GitHub", "href": "https://github.com/shmorsi/deep-portfolio-constructor", "kind": "repo", "external": True, "public": False},
        ],
        "glanceIds": ["sharpeE2E", "specificE2E", "icDeep", "tests"],
        "factIds": ["sharpeE2E", "icDeep", "diffT"],
        "headline": {
            "stat": "intendedShift",
            "qualifier": (f"Ex-ante share of portfolio variance from stock-specific bets, independent Barra-style model, "
                          f"out of sample from January 2008. The end-to-end model keeps {pct(v('e2e.exante_share_specific'))}."),
        },
        "stats": stats,
        "tables": tables,
    }
    path = ROOT / "data" / "projects.json"
    data = json.loads(path.read_text())
    data["projects"] = [p for p in data["projects"] if p["id"] != REPO]
    data["projects"].insert(0, entry)  # the featured project leads the page
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"synced {REPO}: {len(stats)} stats")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT.parent / REPO / "reports" / "site_figures.json"))
