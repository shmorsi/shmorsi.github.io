#!/usr/bin/env python3
"""Copy the Deep Portfolio Constructor's committed results into the site.

Input: the project's reports/site_wealth.json, written by ``python -m dpc.cli
wealth-site`` from its committed results, and the figures beside it. Output:

* the project's entry in data/projects.json (every figure with its source);
* data/dpc_wealth.json: the growth of $1 of every strategy and the network's
  holdings, for the interactive charts;
* assets/img/dpc-*.png: the project's own figures.

Nothing is typed here: every number is formatted from the export. Run:
    python3 scripts/sync_dpc.py ../deep-portfolio-constructor/reports/site_wealth.json
then build_home.py, build_dpc_page.py and sync_chrome.py.
"""

from __future__ import annotations

import json
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = "deep-portfolio-constructor"
SUFFIX = {"market": "Market", "equal_weight": "Equal", "min_variance": "MinVar", "risk_parity": "RiskParity",
          "growth_classical": "Growth", "momentum_tilt": "Momentum", "deep": "Deep",
          "deep_trade_all": "DeepTradeAll", "deep_mlp": "DeepMlp", "deep_unanchored": "DeepUnanchored", "deep_pair": "DeepPair"}
MAIN = ["market", "equal_weight", "min_variance", "risk_parity", "growth_classical", "momentum_tilt", "deep"]
ABLATIONS = ["deep_trade_all", "deep_mlp", "deep_unanchored"]
FIGURES = {"growth.png": "dpc-growth.png", "tilts.png": "dpc-tilts.png", "rolling.png": "dpc-rolling.png"}
MINUS = "−"


def money(x: float) -> str:
    return f"${x:,.0f}" if x >= 10 else f"${x:,.2f}"


def pct(x: float, digits: int = 1, sign: bool = False) -> str:
    text = f"{abs(100 * x):.{digits}f}"
    if float(text) == 0:
        return f"{text}%"
    if sign:
        return ("+" if x > 0 else MINUS) + text + "%"
    return (MINUS if x < 0 else "") + text + "%"


def num(x: float, digits: int = 2) -> str:
    text = f"{abs(x):.{digits}f}"
    return (MINUS if x < 0 and float(text) != 0 else "") + text


def month_name(ym: str) -> str:
    """'2026-09' -> 'September 2026'."""
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    return f"{months[int(ym[5:7]) - 1]} {ym[:4]}"


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as f:
        head = f.read(24)
    assert head[:8] == b"\x89PNG\r\n\x1a\n", path
    return struct.unpack(">II", head[16:24])


def main(src: str) -> None:
    src_path = Path(src)
    site = json.loads(src_path.read_text())
    if "deep" not in site["performance"]:
        raise SystemExit("the export has no Deep Growth Network results yet")
    perf, comps, labels = site["performance"], site["comparisons"], site["labels"]
    origin = f"{REPO} reports/site_wealth.json"
    stats: dict[str, dict] = {}

    def put(key: str, label: str, display: str, path: str) -> None:
        stats[key] = {"label": label, "display": display, "source": f"{origin} [{path}], from reports/results/wealth/*.parquet"}

    def versus(prefix: str, key: str, what: str) -> None:
        """prefix, prefix+T, prefix+Ci, prefix+Verdict: one pre-registered comparison."""
        c = comps[key]
        put(prefix, f"Growth per year (log), {what}", pct(c["diff_log_growth"], 2, sign=True), f"comparisons.{key}.diff_log_growth")
        put(prefix + "T", f"Newey-West t, {what}", num(c["t_nw"]), f"comparisons.{key}.t_nw")
        put(prefix + "Ci", f"95% block-bootstrap interval, {what}", f"{pct(c['ci_low'], 2, sign=True)} to {pct(c['ci_high'], 2, sign=True)}",
            f"comparisons.{key}.ci_low, ci_high")
        put(prefix + "Verdict", f"Pre-registered verdict, {what}", c["verdict"], f"comparisons.{key}.verdict")

    for sid in MAIN:
        sfx, p, label = SUFFIX[sid], perf[sid], labels[sid]
        put(f"wealth{sfx}", f"$1 invested in January 1960, {label}", money(p["terminal_wealth"]), f"performance.{sid}.terminal_wealth")
        put(f"cagr{sfx}", f"Compound growth per year, {label}", pct(p["cagr"], 2), f"performance.{sid}.cagr")
        put(f"mdd{sfx}", f"Worst fall from a peak, {label}", pct(p["max_drawdown"], 0), f"performance.{sid}.max_drawdown")
        put(f"sharpe{sfx}", f"Sharpe ratio, {label}", num(p["sharpe"]), f"performance.{sid}.sharpe")
        put(f"traded{sfx}", f"Share of the portfolio traded per year, {label}", pct(p["turnover_per_year"], 0), f"performance.{sid}.turnover_per_year")
        if sid != "market":  # vsMkt{S}, vsMktT{S}, vsMktCi{S}, vsMktVerdict{S}: the names scripts/lab.py reads
            put(f"beat{sfx}", f"Share of rolling 10-year windows in which it grew faster than the market, {label}",
                pct(p["beat_market_rolling"], 0), f"performance.{sid}.beat_market_rolling")
            key, c = f"{sid} - market", comps[f"{sid} - market"]
            put(f"vsMkt{sfx}", f"Growth per year above the market (log), {label}", pct(c["diff_log_growth"], 2, sign=True),
                f"comparisons.{key}.diff_log_growth")
            put(f"vsMktT{sfx}", f"Newey-West t of that difference, {label}", num(c["t_nw"]), f"comparisons.{key}.t_nw")
            put(f"vsMktCi{sfx}", f"95% block-bootstrap interval of that difference, {label}",
                f"{pct(c['ci_low'], 2, sign=True)} to {pct(c['ci_high'], 2, sign=True)}", f"comparisons.{key}.ci_low, ci_high")
            put(f"vsMktVerdict{sfx}", f"Pre-registered verdict against the market, {label}", c["verdict"], f"comparisons.{key}.verdict")
    for sid in ("momentum_tilt", "equal_weight", "growth_classical"):
        versus(f"deepVs{SUFFIX[sid]}", f"deep - {sid}", f"Deep Growth Network minus {labels[sid]}")

    d, m = perf["deep"], perf["market"]
    put("holdDeep", "Average holding period, Deep Growth Network", f"{d['holding_years']:.1f} years", "performance.deep.holding_years")
    put("activeDeep", "How far its weights sit from the index on average (active share), Deep Growth Network", pct(d["active_share"], 0),
        "performance.deep.active_share")
    put("alphaDeep", "Fama-French three-factor alpha per year, Deep Growth Network", pct(d["alpha_annual"], 2, sign=True), "performance.deep.alpha_annual")
    put("alphaTDeep", "Newey-West t of that alpha", num(d["alpha_t"]), "performance.deep.alpha_t")
    put("betaDeep", "Market beta (three-factor regression), Deep Growth Network", num(d["beta_mkt"]), "performance.deep.beta_mkt")
    put("volDeep", "Volatility per year, Deep Growth Network", pct(d["volatility"], 1), "performance.deep.volatility")
    put("volMarket", "Volatility per year, the market", pct(m["volatility"], 1), "performance.market.volatility")
    put("worstYearDeep", "Worst calendar year, Deep Growth Network", pct(d["worst_year"], 0), "performance.deep.worst_year")
    put("worstYearMarket", "Worst calendar year, the market", pct(m["worst_year"], 0), "performance.market.worst_year")
    seeds = [site["seeds"][k]["terminal_wealth"] for k in sorted(site["seeds"])]
    put("seedsDeep", "$1 in 1960 for each seed's network on its own (seeds 42 to 46)", ", ".join(money(x) for x in seeds), "seeds.*.terminal_wealth")
    put("seedsBeatDeep", "Seeds whose network on its own ended above the market", f"{sum(x > m['terminal_wealth'] for x in seeds)} of {len(seeds)}",
        "seeds.*.terminal_wealth against performance.market.terminal_wealth")
    for c in (0, 25, 50):
        key = f"deep@{c}bps"
        put(f"costDeep{c}", f"Growth per year above the market at {c} bps per trade, same decisions re-priced",
            pct(site["costs"][key]["vs_market_log_growth"], 2, sign=True), f"costs.{key}.vs_market_log_growth")
    put("kappaStart", "Trade fraction the network starts training from", pct(site["init_trade"], 0), "init_trade, from config.yaml")
    put("hmlDeep", "Loading on the Fama-French value factor, Deep Growth Network", num(d["beta_hml"]), "performance.deep.beta_hml")
    put("hmlMarket", "Loading on the Fama-French value factor, the market", num(m["beta_hml"]), "performance.market.beta_hml")
    if site.get("trade_fraction"):
        put("kappaDeep", "Median share of the gap to its target the network trades each month", pct(site["trade_fraction"]["median"], 0),
            "trade_fraction.median")
    if "deep_pair" in perf:
        put("wealthDeepPair", f"$1 invested in January 1960, {labels['deep_pair']}", money(perf["deep_pair"]["terminal_wealth"]),
            "performance.deep_pair.terminal_wealth")
    for sid in ABLATIONS:
        if sid not in perf:
            continue
        sfx = SUFFIX[sid]
        put(f"wealth{sfx}", f"$1 invested in January 1960, {labels[sid]}", money(perf[sid]["terminal_wealth"]), f"performance.{sid}.terminal_wealth")
        put(f"traded{sfx}", f"Share of the portfolio traded per year, {labels[sid]}", pct(perf[sid]["turnover_per_year"], 0),
            f"performance.{sid}.turnover_per_year")
        if f"{sid} - deep_pair" in comps:
            versus(f"vsPair{sfx}", f"{sid} - deep_pair", f"{labels[sid]} minus the full network with the same seeds")
    put("oracle", "$1 in 1960 for a deliberately cheating policy that sees next month's returns (calibration)",
        f"${site['oracle_terminal_wealth'] / 1e6:,.0f} million", "oracle_terminal_wealth")
    put("months", "Out-of-sample months", f"{site['oos']['months']}", "oos.months")
    put("years", "Whole years out of sample", f"{site['oos']['months'] // 12}", "oos.months // 12")
    put("industries", "US industry portfolios", f"{len(site['holdings']['industries'])}", "holdings.industries")
    put("params", "Parameters in one Deep Growth Network", f"{site['params']:,}", "params")
    put("tests", "Automated tests", f"{site['tests']}", "tests")
    put("dataCorr", "Correlation of the rebuilt market portfolio with French's market return", f"{site['data_check']['correlation']:.4f}",
        "data_check.correlation, from reports/wealth/data_summary.json")

    bench, sched = site.get("benchmarks"), site.get("schedules")
    if bench:  # added after the pre-registered test: the S&P 500 and the NASDAQ Composite
        sp, nq, chk = bench["sp500"], bench["nasdaq"], bench["checks"]["sp500_splice"]
        put("wealthSp500", "$1 invested in January 1960, S&P 500 with dividends reinvested", money(sp["wealth"]["sp500"]), "benchmarks.sp500.wealth.sp500")
        put("cagrSp500", "Compound growth per year, S&P 500 with dividends reinvested", pct(sp["cagr"]["sp500"], 2), "benchmarks.sp500.cagr.sp500")
        for who, sfx in (("deep", "Deep"), ("market", "Market")):
            c = sp["comparisons"][f"{who} - sp500"]
            put(f"vsSp{sfx}", f"Growth per year against the S&P 500 (log), {labels[who]}", pct(c["diff_log_growth"], 2, sign=True), f"benchmarks.sp500.comparisons.{who} - sp500.diff_log_growth")
            put(f"vsSpT{sfx}", f"Newey-West t against the S&P 500, {labels[who]}", num(c["t_nw"]), f"benchmarks.sp500.comparisons.{who} - sp500.t_nw")
            put(f"vsSpVerdict{sfx}", f"Verdict against the S&P 500 (same rule, added after the test), {labels[who]}", c["verdict"], f"benchmarks.sp500.comparisons.{who} - sp500.verdict")
        for who, sfx in (("nasdaq", "Nasdaq"), ("deep", "Deep"), ("market", "Market"), ("sp500", "Sp500")):
            put(f"wealth1971{sfx}", f"$1 invested at the end of February 1971, {who}", money(nq["wealth"][who]), f"benchmarks.nasdaq.wealth.{who}")
        c = nq["comparisons"]["deep - nasdaq"]
        put("vsNqDeep", "Growth per year against the NASDAQ Composite, price only (log), Deep Growth Network", pct(c["diff_log_growth"], 2, sign=True), "benchmarks.nasdaq.comparisons.deep - nasdaq.diff_log_growth")
        put("vsNqTDeep", "Newey-West t against the NASDAQ Composite", num(c["t_nw"]), "benchmarks.nasdaq.comparisons.deep - nasdaq.t_nw")
        put("vsNqVerdictDeep", "Verdict against the NASDAQ Composite (same rule, added after the test)", c["verdict"], "benchmarks.nasdaq.comparisons.deep - nasdaq.verdict")
        put("spliceCorr", "Correlation of the S&P 500 price-plus-dividends series with the official total-return index", f"{chk['correlation']:.4f}", "benchmarks.checks.sp500_splice.correlation")
        put("spliceGap", "Yearly gap between them", pct(chk["annual_log_gap"], 3, sign=True), "benchmarks.checks.sp500_splice.annual_log_gap")
    if sched:  # added after the pre-registered test: the same network on four rebalancing schedules
        for n in ("daily", "monthly", "quarterly", "yearly"):
            v, sfx = sched[n], n.capitalize()
            put(f"sched{sfx}Wealth", f"$1 invested in January 1960, network rebalanced {n}", money(v["terminal_wealth"]), f"schedules.{n}.terminal_wealth")
            put(f"sched{sfx}Gross", f"The same before costs, rebalanced {n}", money(v["gross_terminal_wealth"]), f"schedules.{n}.gross_terminal_wealth")
            put(f"sched{sfx}Cagr", f"Compound growth per year, rebalanced {n}", pct(v["cagr"], 2), f"schedules.{n}.cagr")
            put(f"sched{sfx}Traded", f"Share of the portfolio traded per year, rebalanced {n}", pct(v["turnover_per_year"], 0), f"schedules.{n}.turnover_per_year")
            put(f"sched{sfx}Cost", f"Trading cost per year, rebalanced {n}", pct(v["cost_per_year"], 2), f"schedules.{n}.cost_per_year")
            put(f"sched{sfx}Vs", f"Growth per year against the market, rebalanced {n}", pct(v["vs_market"]["diff_log_growth"], 2, sign=True), f"schedules.{n}.vs_market.diff_log_growth")
            put(f"sched{sfx}T", f"Newey-West t against the market, rebalanced {n}", num(v["vs_market"]["t_nw"]), f"schedules.{n}.vs_market.t_nw")
            put(f"sched{sfx}Verdict", f"Verdict against the market, rebalanced {n}", v["vs_market"]["verdict"], f"schedules.{n}.vs_market.verdict")
        e = sched["engine_check"]
        put("engineCheckWealth", "$1 from 1960 on daily data, trading only at month-ends (engine check)", money(e["daily_engine_month_end_only_wealth"]), "schedules.engine_check.daily_engine_month_end_only_wealth")
        put("engineCheckGap", "Yearly gap from the monthly engine", pct(e["annual_log_gap"], 3, sign=True), "schedules.engine_check.annual_log_gap")

    rows = []
    for sid in MAIN:
        p = perf[sid]
        vs = "benchmark" if sid == "market" else f"{pct(comps[f'{sid} - market']['diff_log_growth'], 2, sign=True)} (t {num(comps[f'{sid} - market']['t_nw'])})"
        rows.append([labels[sid], money(p["terminal_wealth"]), pct(p["cagr"], 2), num(p["sharpe"]), pct(p["max_drawdown"], 0),
                     pct(p["turnover_per_year"], 0), vs])
    cols = sorted(site["decades"].keys())
    end_year = site["oos"]["end"][:4]
    dheaders = ["Strategy"] + [c if c != cols[-1] else f"{c} (to {end_year})" for c in cols]
    drows = [[labels[sid]] + [pct(site["decades"][c][sid], 1) for c in cols] for sid in MAIN]
    tables = {
        "performance": {
            "caption": (f"$1 invested in January 1960, long-only and fully invested, out of sample to {month_name(site['oos']['end'])}, every trade costs "
                        f"{site['cost_bps']:g} bps. Growth vs market is the yearly difference in log growth, with its Newey-West t."),
            "headers": ["Strategy", "$1 became", "Per year", "Sharpe", "Worst fall", "Traded per year", "Growth vs market"],
            "rows": rows, "highlightRow": MAIN.index("deep"),
            "source": f"{REPO} reports/wealth/performance.csv and reports/wealth/comparisons.csv via reports/site_wealth.json",
        },
        "decades": {
            "caption": "Compound growth per year in each decade, net of costs.",
            "headers": dheaders, "rows": drows, "highlightRow": MAIN.index("deep"),
            "source": f"{REPO} reports/wealth/decades.csv via reports/site_wealth.json",
        },
    }
    if bench:
        sp, nq = bench["sp500"], bench["nasdaq"]
        tables["benchmarks"] = {
            "caption": ("What $1 became, added after the pre-registered test. S&P 500 with dividends reinvested; NASDAQ Composite price only, "
                        "so it is understated. Strategies net of 10 bps per trade."),
            "headers": ["", f"From the end of {month_name(sp['start_wealth_date'])}", f"From the end of {month_name(nq['start_wealth_date'])}"],
            "rows": [[sp["label"], money(sp["wealth"]["sp500"]), money(nq["wealth"]["sp500"])],
                     [nq["label"], "not yet listed", money(nq["wealth"]["nasdaq"])],
                     ["Whole US market", money(sp["wealth"]["market"]), money(nq["wealth"]["market"])],
                     [labels["deep"], money(sp["wealth"]["deep"]), money(nq["wealth"]["deep"])]],
            "highlightRow": 3,
            "source": f"{REPO} reports/wealth/summary.json [benchmarks] via reports/site_wealth.json",
        }
    if sched:
        words = {"daily": "Every day", "monthly": "Every month (as tested)", "quarterly": "Every quarter", "yearly": "Every year"}
        tables["schedules"] = {
            "caption": "The same trained network on four rebalancing schedules, January 1960 to September 2026, added after the pre-registered test.",
            "headers": ["Rebalanced", "$1 became", "Before costs", "Traded per year", "Cost per year", "Growth vs market"],
            "rows": [[words[n], money(sched[n]["terminal_wealth"]), money(sched[n]["gross_terminal_wealth"]), pct(sched[n]["turnover_per_year"], 0),
                      pct(sched[n]["cost_per_year"], 2), f"{pct(sched[n]['vs_market']['diff_log_growth'], 2, sign=True)} (t {num(sched[n]['vs_market']['t_nw'])})"]
                     for n in ("daily", "monthly", "quarterly", "yearly")],
            "highlightRow": 1,
            "source": f"{REPO} reports/wealth/summary.json [schedules] via reports/site_wealth.json",
        }

    c = comps["deep - market"]
    verdict = c["verdict"]
    wd, wm = money(d["terminal_wealth"]), money(m["terminal_wealth"])
    diff, t = pct(c["diff_log_growth"], 2, sign=True), num(c["t_nw"])
    if verdict == "better":
        proves = (f"Trained only on the growth of wealth, the network turned $1 in 1960 into {wd}, against {wm} for the market: "
                  f"{diff} a year, long-only and after costs, better by the pre-registered test (t = {t}).")
    elif verdict == "worse":
        proves = (f"An honest negative: the network turned $1 in 1960 into {wd}, against {wm} for the market, {diff} a year, "
                  f"worse by the pre-registered test (t = {t}).")
    else:
        proves = (f"Trained only on the growth of wealth, the network turned $1 in 1960 into {wd}, against {wm} for the market: "
                  f"{diff} a year, a gap the pre-registered test cannot tell from luck (t = {t}).")
    mom = comps["momentum_tilt - market"]
    caveat = (f"Out of sample from January 1960 to {month_name(site['oos']['end'])} ({site['oos']['months']} months), long-only, fully invested, every trade "
              f"costs {site['cost_bps']:g} bps. The test, the comparisons and the decision rule were pre-registered in git before the network "
              f"was run out of sample; against the market the verdict is {verdict} (Newey-West t {t}, 95% interval "
              f"{pct(c['ci_low'], 2, sign=True)} to {pct(c['ci_high'], 2, sign=True)} a year). Kenneth French's 30 US industry portfolios hold "
              f"every listed firm at each date, so there is no survivorship bias among firms, but they are industries, not funds an investor "
              f"could buy in 1960, and the features are ones finance research found later. A simple momentum tilt grew "
              f"{pct(mom['diff_log_growth'], 2, sign=True)} a year above the market (t {num(mom['t_nw'])}). US data only: one country's "
              f"century is still one history.")
    gw, gh = png_size(src_path.parent / "figures" / "wealth" / "growth.png")
    entry = {
        "id": REPO,
        "number": "01",
        "code": "DPC",
        "role": "featured",
        "badge": f"1960 to {end_year}",
        "kicker": "Deep learning and long-term investing",
        "title": "Deep Portfolio Constructor",
        "purpose": "A neural network that builds a long-only portfolio for long-term wealth, trained on the growth of wealth after every trading cost.",
        "proves": proves,
        "summary": (f"A transformer that allocates across Kenneth French's {len(site['holdings']['industries'])} US industries, trained in "
                    f"PyTorch on the growth of wealth itself through a differentiable simulator of buying, holding and paying to trade, "
                    f"walk-forward from 1960 and tested out of sample against the market and five classical long-only strategies."),
        "caveat": caveat,
        "image": {"src": "assets/img/dpc-growth.png", "alt": "Growth of $1 invested in January 1960 for seven long-only strategies, on a log scale.",
                  "width": gw, "height": gh},
        "tags": ["Python", "PyTorch", "pandas", "NumPy", "cvxpy", "statsmodels", "pytest"],
        "links": [
            {"label": "Project page", "href": "projects/deep-portfolio-constructor.html", "kind": "site"},
            {"label": "GitHub", "href": "https://github.com/shmorsi/deep-portfolio-constructor", "kind": "repo", "external": True},
        ],
        "glanceIds": ["wealthDeep", "vsMktDeep", "tradedDeep", "tests"],
        "factIds": ["wealthDeep", "vsMktDeep", "tradedDeep"],
        "headline": {
            "stat": "wealthDeep",
            "qualifier": (f"Long-only, out of sample from January 1960, net of {site['cost_bps']:g} bps per trade. Holding the market grew to {wm}; "
                          f"the difference is {diff} a year: {verdict}, by the pre-registered test."),
        },
        "stats": stats,
        "tables": tables,
    }
    path = ROOT / "data" / "projects.json"
    data = json.loads(path.read_text())
    data["projects"] = [p for p in data["projects"] if p["id"] != REPO]
    data["projects"].insert(0, entry)  # the featured project leads the page
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    dates = site["dates"]
    keep = [i for i, day in enumerate(dates) if day[5:7] in ("03", "06", "09", "12") or i == len(dates) - 1]
    h = site["holdings"]
    wealth = {
        "source": site["source"], "commit": site["commit"], "start": site["start"], "dates": dates,
        "labels": {k: labels[k] for k in MAIN}, "growth": {k: site["growth"][k] for k in MAIN},
        "holdings": {"industries": h["industries"], "dates": [dates[i] for i in keep], "deepBp": [h["deepBp"][i] for i in keep],
                     "marketBp": [h["marketBp"][i] for i in keep], "kappa": [h["kappa"][i] for i in keep] if h.get("kappa") else None},
    }
    if bench:
        wealth["benchmarks"] = {"sp500": bench["sp500"]["growth"]["sp500"],
                                "nasdaq": {"start": bench["nasdaq"]["start_wealth_date"], "dates": bench["nasdaq"]["dates"],
                                           "growth": bench["nasdaq"]["growth"]}}
    if sched:
        wealth["schedules"] = sched["growth"]
    (ROOT / "data" / "dpc_wealth.json").write_text(json.dumps(wealth, separators=(",", ":")) + "\n")
    for name, dest in FIGURES.items():
        shutil.copyfile(src_path.parent / "figures" / "wealth" / name, ROOT / "assets" / "img" / dest)
    print(f"synced {REPO} {site['commit']}: {len(stats)} stats; deep vs market: {verdict}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT.parent / REPO / "reports" / "site_wealth.json"))
