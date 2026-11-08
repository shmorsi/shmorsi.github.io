#!/usr/bin/env python3
"""Export the Deep Portfolio Constructor's committed results for the site's interactive charts.

Reads only files committed in the deep-portfolio-constructor repository:
  reports/results/<strategy>__daily.parquet        daily net returns, out of sample
  reports/results/<strategy>__risk_decomp.parquet  ex-ante risk split at each rebalance
  reports/results/e2e__weights.parquet             the end-to-end model's weights at each rebalance
  reports/dashboard_bundle/universe.parquet        names, countries and sectors
  config.yaml                                      evaluation.crisis_years

Writes:
  data/dpc_lab.json   growth of $1 at each month-end, risk split and max drawdown per strategy
  data/dpc_book.json  the end-to-end book: weights in basis points at each of the 225 rebalances

Run with the project's virtual environment (pandas + pyarrow):
  ../deep-portfolio-constructor/.venv/bin/python scripts/export_dpc_lab.py [path to the repo]
then python3 scripts/build_home.py, scripts/build_dpc_page.py and scripts/sync_chrome.py.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

import pandas as pd
import yaml

ROOT = Path(__file__).resolve().parents[1]
STRATEGIES = ["ls_naive", "ls_classical", "ls_deep_twostage", "ls_deep_alpha", "e2e", "e2e_deep"]
BOOK = "e2e"


def to_bp(row: list[float]) -> list[int]:
    """Weights in whole basis points that still add up to the book's net (largest-remainder rounding).

    Rounding 99 weights one by one can move a dollar-neutral book's net by several basis points;
    this keeps every weight within 1 bp of its exact value and the total exact."""
    exact = [10000 * float(v) for v in row]
    floors = [math.floor(v) for v in exact]
    short = round(sum(exact)) - sum(floors)
    order = sorted(range(len(exact)), key=lambda i: exact[i] - floors[i], reverse=True)
    for i in order[:short]:
        floors[i] += 1
    return floors


def main(repo: Path) -> None:
    res = repo / "reports" / "results"
    commit = subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(["git", "-C", str(repo), "status", "--porcelain", "reports", "config.yaml"], capture_output=True, text=True, check=True).stdout.strip()
    if dirty:
        raise SystemExit("reports/ or config.yaml has uncommitted changes; export only committed results")

    strategies, dates = [], None
    for sid in STRATEGIES:
        net = pd.read_parquet(res / f"{sid}__daily.parquet")["net"]
        growth = (1 + net).cumprod()  # the same curve as the project's own chart (reports/figures/site/dpc-cumulative.png)
        month_end = growth.groupby(growth.index.to_period("M")).last()
        start = net.index[0] - pd.Timedelta(days=1)
        these = [start.strftime("%Y-%m-%d")] + [growth[growth.index.to_period("M") == p].index[-1].strftime("%Y-%m-%d") for p in month_end.index]
        if dates is None:
            dates = these
        elif these != dates:
            raise SystemExit(f"{sid} is not on the same month-ends as {STRATEGIES[0]}")
        risk = pd.read_parquet(res / f"{sid}__risk_decomp.parquet")
        strategies.append({
            "id": sid,
            "growth": [1.0] + [round(float(v), 4) for v in month_end.values],
            "risk": {k: round(float(risk[f"share_{k}"].mean()), 4) for k in ("specific", "style", "sector")},
            "maxDrawdown": round(float((growth / growth.cummax() - 1).min()), 4),
        })

    crisis = yaml.safe_load((repo / "config.yaml").read_text())["evaluation"]["crisis_years"]
    lab = {
        "source": (f"deep-portfolio-constructor {commit}: reports/results/<strategy>__daily.parquet (net), "
                   f"<strategy>__risk_decomp.parquet (mean share at each rebalance), config.yaml evaluation.crisis_years"),
        "note": "Growth of $1 from daily net returns, compounded, read at each month-end. Market-neutral returns, net of 10 bps costs.",
        "commit": commit,
        "dates": dates,
        "crisisYears": crisis,
        "strategies": strategies,
    }
    (ROOT / "data" / "dpc_lab.json").write_text(json.dumps(lab, separators=(",", ":")) + "\n")

    weights = pd.read_parquet(res / f"{BOOK}__weights.parquet")
    uni = pd.read_parquet(repo / "reports" / "dashboard_bundle" / "universe.parquet")
    order = uni.sort_values(["sector", "name"]).index.tolist()  # group the book by sector for display
    weights = weights[order]
    net = pd.read_parquet(res / f"{BOOK}__daily.parquet")["net"]
    rdec = pd.read_parquet(res / f"{BOOK}__risk_decomp.parquet")
    nxt, share = [], []
    for i, d in enumerate(weights.index):  # what the book earned until the next rebalance, net of costs
        end = weights.index[i + 1] if i + 1 < len(weights.index) else None
        window = net[(net.index > d) & (net.index <= end)] if end is not None else net.iloc[0:0]
        nxt.append(round(float((1 + window).prod() - 1), 5) if len(window) else None)
        share.append(round(float(rdec.loc[d, "share_specific"]), 4) if d in rdec.index else None)
    book = {
        "source": (f"deep-portfolio-constructor {commit}: reports/results/{BOOK}__weights.parquet, {BOOK}__daily.parquet, "
                   f"{BOOK}__risk_decomp.parquet; names and sectors from reports/dashboard_bundle/universe.parquet"),
        "note": "Weights in basis points of capital (1% = 100). Positive = long, negative = short.",
        "commit": commit,
        "strategy": BOOK,
        "tickers": order,
        "names": [str(uni.loc[t, "name"]) for t in order],
        "countries": [str(uni.loc[t, "country"]) for t in order],
        "sectors": [str(uni.loc[t, "sector"]) for t in order],
        "dates": [d.strftime("%Y-%m-%d") for d in weights.index],
        "weightsBp": [to_bp(row) for row in weights.values],
        "nextMonthNet": nxt,
        "shareSpecific": share,
    }
    (ROOT / "data" / "dpc_book.json").write_text(json.dumps(book, separators=(",", ":"), ensure_ascii=False) + "\n")
    print(f"wrote data/dpc_lab.json ({len(dates)} month-ends, {len(strategies)} strategies) and "
          f"data/dpc_book.json ({len(book['dates'])} rebalances x {len(order)} stocks) from {commit}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "deep-portfolio-constructor")
