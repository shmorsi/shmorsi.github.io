#!/usr/bin/env python3
"""Bring the Pension Lab's results into the site. Nothing is typed by hand.

    python3 scripts/sync_pension.py ../deep-portfolio-constructor/reports/pension/site_pension.json

Reads the export that `python -m dpc.cli pension-site` writes in the deep-portfolio-constructor
repository and writes:

  data/projects.json   the "pension-lab" project: every stat (label, display, source), the tables,
                       and the sentences that quote them (summary, proves, caveat, headline qualifier),
                       composed here from the numbers and the pre-registered verdicts so they cannot drift
  data/pension.json    the funded-ratio fans and sample paths the pictures are drawn from

The project's place in the list and its number come from scripts/groups.py (it is the second study
of the first project).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import groups  # scripts/groups.py: the three projects and their studies

ROOT = Path(__file__).resolve().parents[1]
PID = "pension-lab"
REPO = "https://github.com/shmorsi/deep-portfolio-constructor"
LEARNED, GLIDE, SIXTY, LDI, MATCHED = "Learned policy", "Glide path", "60/40", "Liability-driven 40/60", "Fully matched"
ORDER = [SIXTY, LDI, MATCHED, GLIDE, LEARNED]
READING = {"better": "better than", "worse": "worse than", "no detectable difference": "not detectably different from"}


def money(x: float) -> str:
    return f"${100 * x:.1f}"


def pct(x: float) -> str:
    return f"{100 * x:.0f}%"


def signed(x: float) -> str:
    return f"{'+' if x > 0 else '−' if x < 0 else ''}{abs(100 * x):.1f}"


def main() -> None:
    export = json.loads(Path(sys.argv[1]).read_text())
    s, stats = export["summary"], export["stats"]
    sim, walk, hist = s["simulated"], s["model_risk"], s["history"]
    v_sim, v_walk, v_hist = (block["learned_minus"][GLIDE]["verdict"] for block in (sim, walk, hist))
    d_sim = sim["learned_minus"][GLIDE]
    where = "deep-portfolio-constructor reports/pension/summary.json"

    def table(block: dict, note: str) -> dict:
        rows = [[name, money(block["policies"][name]["mean_cost"]), money(block["policies"][name]["cvar_cost"]),
                 pct(block["policies"][name]["funded_end_share"]), pct(block["policies"][name]["stocks_mean"])] for name in ORDER]
        return {"caption": note, "headers": ["Policy", "Average cost", "Worst 5%", "Fully funded at year 20", "Average in stocks"], "rows": rows, "highlightRow": ORDER.index(LEARNED), "source": where}

    hist_rows = [[name, money(hist["policies"][name]["mean_cost"]), money(hist["policies"][name]["worst_cost"]),
                  pct(hist["policies"][name]["funded_end_share"]), pct(hist["policies"][name]["stocks_mean"])] for name in ORDER]
    verdict_rows = [[f"Learned policy against {name.lower() if name != SIXTY else name}", signed(block["learned_minus"][name]["difference"]),
                     f"{signed(block['learned_minus'][name]['lo'])} to {signed(block['learned_minus'][name]['hi'])}", block["learned_minus"][name]["verdict"]]
                    for name in (GLIDE, SIXTY, LDI, MATCHED) for block in (sim,)]
    tables = {
        "simulated": table(sim, f"{sim['scenarios']:,} simulated 20-year futures that training never saw. Cost to the sponsor per $100 promised; lower is better."),
        "modelRisk": table(walk, f"The same policies, not retrained, on {walk['scenarios']:,} futures in which the yield never returns to an average."),
        "history": {"caption": f"{hist['starts']} real 20-year periods, starting each December from {hist['first_start'] - 1} to {hist['last_start'] - 1}. They overlap: about three are independent.",
                    "headers": ["Policy", "Average cost", "Worst period", "Fully funded at year 20", "Average in stocks"], "rows": hist_rows,
                    "highlightRow": ORDER.index(LEARNED), "source": where},
        "verdicts": {"caption": "Score of the learned policy minus each rule's (average cost plus worst-5% cost, per $100 promised), simulated futures. Below zero is better.",
                     "headers": ["Comparison", "Difference", "95% interval", "Pre-registered verdict"], "rows": verdict_rows, "source": where},
    }

    c_learn, c_glide = stats["costLearned"]["display"], stats["costGlide"]["display"]
    t_learn, t_glide = stats["tailLearned"]["display"], stats["tailGlide"]["display"]
    w_learn, w_glide = stats["walkLearned"]["display"], stats["walkGlide"]["display"]
    h_learn, h_glide = stats["histLearned"]["display"], stats["histGlide"]["display"]
    proves = (f"In {sim['scenarios']:,} simulated futures the learned policy costs the sponsor {c_learn} per $100 promised against {c_glide} for a glide path, "
              f"and {t_learn} against {t_glide} in the worst 5%: {v_sim} by the pre-registered test. "
              f"When yields never return to an average it is {READING[v_walk]} the glide path, and over {hist['starts']} real 20-year periods it is {READING[v_hist]} it.")
    summary = (f"A pension plan that is {stats['fundedStart']['display']} funded has promised inflation-indexed payments for 60 years. "
               "Its liability is valued off the 10-year yield with expected inflation; its assets are stocks, 10-year bonds and bonds matched to the promise. "
               "Four standard policies (60/40, liability-driven, fully matched, a glide path) are compared with a policy trained in PyTorch through a differentiable simulator of the plan, "
               "on what the plan costs its sponsor over 20 years and how bad that gets.")
    caveat = (f"Pre-registered in git before the test ran. A stylised plan: one yield for all maturities, expected inflation is the last ten years' average, no inflation-linked bonds, no credit or private assets, no longevity risk. "
              f"Simulated futures rearrange US history from {s['data']['first_month'][:4]} and are the model the learned policy was trained on: against the glide path the verdict there is {v_sim} "
              f"(score difference {signed(d_sim['difference'])}, 95% interval {signed(d_sim['lo'])} to {signed(d_sim['hi'])}). "
              f"On futures in which yields never return to an average, without retraining: {w_learn} against {w_glide}, {v_walk}. "
              f"On {hist['starts']} real 20-year periods, which overlap and amount to about three independent ones: {h_learn} against {h_glide}, {v_hist}. US data only.")
    # The protocol: "If the learned policy is not better than the glide path, the page says so in its first line."
    question = "What it costs to keep a pension promise funded for 20 years, and whether a policy learned by simulation does better than the rule plans use."
    if v_sim == "better" and v_hist == "better":
        purpose = f"{question} It does, in simulation and on real history."
    elif v_sim == "better":
        purpose = f"{question} In simulation it does; on real history it is {READING[v_hist]} that rule."
    else:
        purpose = f"{question} It is {READING[v_sim]} that rule in simulation, and {READING[v_hist]} it on real history."
    project = {
        "id": PID, "code": "PENSION", "role": "featured", "badge": "Pre-registered", "kicker": "Pensions and long-term investing", "title": "Pension Lab",
        "purpose": purpose,
        "summary": summary, "proves": proves, "caveat": caveat,
        "headline": {"stat": "costHeadline", "qualifier": f"Average of {sim['scenarios']:,} simulated futures; a glide path costs {c_glide}. Against it the pre-registered verdict is {v_sim} in simulation, "
                                                          f"{v_walk} when yields never return to an average, and {v_hist} on real history."},
        "tags": ["Python", "PyTorch", "NumPy", "pandas", "pytest"],
        "links": [{"label": "Case study", "href": "projects/pension-lab.html", "kind": "site"},
                  {"label": "GitHub", "href": f"{REPO}/tree/main/src/dpc/pension", "kind": "repo", "external": True},
                  {"label": "Protocol", "href": f"{REPO}/blob/main/docs/pension_protocol.md", "kind": "more", "external": True}],
        "glanceIds": ["costLearned", "costGlide", "tailLearned", "fundedLearned"], "factIds": ["scenarios", "starts", "duration"],
        "stats": stats | {"costHeadline": {"label": f"Cost to the sponsor per $100 promised over 20 years, learned policy, in simulation (glide path {c_glide}). "
                                                    f"On {hist['starts']} real 20-year periods: {h_learn} against {h_glide}", "display": c_learn, "source": where}},
        "tables": tables,
    }

    # What the scored policy holds, described after the test (dpc.pension.anatomy). Optional: absent until it has been run.
    anatomy = export.get("anatomy")
    pictures = {"source": export["source"], "fans": export["fans"], "verdicts": {"simulated": v_sim, "model_risk": v_walk, "history": v_hist}}
    if anatomy:
        described = "deep-portfolio-constructor reports/pension/anatomy.json"
        bf = anatomy["by_funded"]
        seen = [i for i, w in enumerate(bf["learned"]) if w is not None]

        def average(which: str, asset: int, buckets: list[int]) -> float:
            """The average weight over several funded-ratio buckets, weighted by how many months fell in each."""
            use = [i for i in buckets if i in seen]
            total = sum(bf["share_of_months"][i] for i in use)
            return sum(bf["share_of_months"][i] * bf[which][i][asset] for i in use) / total if total else float("nan")

        short, full = [0, 1], [5, 6, 7]                      # under 80% funded; over 110% funded
        ls, gs, lf, gf = average("learned", 0, short), average("glide", 0, short), average("learned", 0, full), average("glide", 0, full)
        word = lambda d: "more" if d > 0.03 else "less" if d < -0.03 else "about as much"  # noqa: E731
        add = lambda label, value: {"label": label, "display": pct(value), "source": described}  # noqa: E731
        project["stats"] |= {
            "learnedStocksShort": add("Share in stocks while the plan is under 80% funded, learned policy (test futures)", ls),
            "glideStocksShort": add("The same, glide path", gs),
            "learnedStocksFull": add("Share in stocks once the plan is over 110% funded, learned policy (test futures)", lf),
            "glideStocksFull": add("The same, glide path", gf),
            "learnedBonds": add("Average share in 10-year bonds, learned policy", anatomy["overall"]["learned"][1]),
            "learnedMatching": add("Average share in matching bonds, learned policy", anatomy["overall"]["learned"][2]),
        }
        if word(ls - gs) == "more" and word(lf - gf) == "less":
            reading = "It takes more stock-market risk than the glide path while the plan is short and the sponsor is paying in, and less once the plan is funded."
        elif word(ls - gs) == word(lf - gf):
            reading = f"It holds {word(ls - gs)} in stocks {'as' if word(ls - gs) == 'about as much' else 'than'} the glide path whether the plan is short or funded."
        else:
            reading = (f"It holds {word(ls - gs)} in stocks {'as' if word(ls - gs) == 'about as much' else 'than'} the glide path while the plan is short, "
                       f"and {word(lf - gf)} once it is funded.")
        project["learned"] = reading
        project["tables"]["anatomy"] = {
            "caption": "What the learned policy held in the test futures, by how well funded the plan was at each monthly decision, next to what the glide path holds at the same funded ratio. A description made after the test; it changes no verdict.",
            "headers": ["Funded ratio", "Share of months", "Glide path: stocks", "Learned: stocks", "Learned: 10-year bonds", "Learned: matching bonds"],
            "rows": [[bf["buckets"][i][0].upper() + bf["buckets"][i][1:], pct(bf["share_of_months"][i]), pct(bf["glide"][i][0]), pct(bf["learned"][i][0]),
                      pct(bf["learned"][i][1]), pct(bf["learned"][i][2])] for i in seen],
            "source": described}
        tuned = anatomy.get("tuned_glide")
        if tuned:                                                # the glide path with its four numbers trained like the network
            tp, td = tuned["simulated"]["policy"], tuned["simulated"]["learned_minus_tuned"]
            wp, wd = tuned["model_risk"]["policy"], tuned["model_risk"]["learned_minus_tuned"]
            n = tuned["numbers"]
            mean = lambda k: sum(x[k] for x in n) / len(n)  # noqa: E731
            put = lambda label, display: {"label": label, "display": display, "source": described}  # noqa: E731
            project["stats"] |= {
                "costTuned": put("Average cost per $100 promised, glide path tuned on the same simulations (simulated futures)", money(tp["mean_cost"])),
                "tailTuned": put("Cost in the worst 5% of simulated futures, tuned glide path", money(tp["cvar_cost"])),
                "tunedVerdict": put("Learned policy against the tuned glide path, simulated futures (the protocol's rule; not pre-registered)", td["verdict"]),
                "walkCostTuned": put("Average cost when yields never come back, tuned glide path", money(wp["mean_cost"])),
                "walkTunedVerdict": put("Learned policy against the tuned glide path when yields never come back (not pre-registered)", wd["verdict"]),
                "tunedShort": put("Share in stocks while the plan is short, tuned glide path", pct(mean("stocks_when_short"))),
                "tunedFunded": put("Share in stocks once the plan is funded, tuned glide path", pct(mean("stocks_when_funded"))),
                "tunedFrom": put("Funded ratio where the tuned glide path starts leaving stocks", pct(mean("slide_from"))),
                "tunedTo": put("Funded ratio where the tuned glide path has finished leaving stocks", pct(mean("slide_to"))),
            }
            gain = tuned["simulated"]["tuned_minus_glide"]["difference"] / d_sim["difference"]
            project["stats"]["tunedShare"] = put("Share of the learned policy's improvement in the score that the tuned glide path also gets (simulated futures)", pct(min(max(gain, 0.0), 9.99)))
            project["stats"]["tunedLead"] = put("Score of the learned policy minus the tuned glide path, simulated futures", signed(td["difference"]))
            project["tuned"] = {
                "better": "The network still costs less than the tuned rule in simulation, so tuning is not the whole story.",
                "no detectable difference": "Against the tuned rule the network is not detectably different: tuning the rule to the cost captures the gain, and the network's extra inputs add nothing this test can detect.",
                "worse": "The tuned rule costs less than the network: four well-chosen numbers do better here than a network with ten inputs.",
            }[td["verdict"]]
        by = anatomy["by_yield"]
        ys = [i for i, w in enumerate(by["learned"]) if w is not None]
        low, high = by["learned"][ys[0]][0], by["learned"][ys[-1]][0]
        project["stats"] |= {
            "stocksLowYield": add(f"Share in stocks when the yield is {by['buckets'][ys[0]]}, learned policy (plans 85% to 100% funded)", low),
            "stocksHighYield": add(f"Share in stocks when the yield is {by['buckets'][ys[-1]]}, learned policy (plans 85% to 100% funded)", high),
            "glideStocksYield": add("Share in stocks at any yield, glide path (plans 85% to 100% funded)", sum(by["glide"][i][0] * by["share_of_months"][i] for i in ys) / sum(by["share_of_months"][i] for i in ys)),
            "weightMove": add("How far the learned policy's target weights move in a year, as a share of the fund", anatomy["overall"]["weight_change_per_year_learned"]),
        }
        if abs(low - high) > 0.2:
            project["learned"] += (" Above all it follows the yield: the higher the yield, the more it puts in bonds matched to the promise."
                                   if low > high else " Above all it follows the yield: the higher the yield, the more it puts in stocks.")
        project["tables"]["anatomyYield"] = {
            "caption": f"The same, by the level of the 10-year yield, for plans between {pct(by['funded_between'][0])} and {pct(by['funded_between'][1])} funded.",
            "headers": ["10-year yield", "Share of those months", "Glide path: stocks", "Learned: stocks", "Learned: 10-year bonds", "Learned: matching bonds"],
            "rows": [[by["buckets"][i][0].upper() + by["buckets"][i][1:], pct(by["share_of_months"][i]), pct(by["glide"][i][0]), pct(by["learned"][i][0]),
                      pct(by["learned"][i][1]), pct(by["learned"][i][2])] for i in ys],
            "source": described}
        loose = anatomy.get("one_month_blocks")
        if loose and tuned:
            names = [("Glide path", "Glide"), ("Tuned glide path", "Tuned"), (LEARNED, "Learned")]
            for name, key in names:
                r = loose["policies"][name]
                project["stats"][f"loose{key}"] = add(f"Average cost per $100 promised on futures drawn one month at a time, {name.lower()}", 0) | {"display": money(r["mean_cost"])}
                project["stats"][f"looseTail{key}"] = add(f"Cost in the worst 5% of futures drawn one month at a time, {name.lower()}", 0) | {"display": money(r["cvar_cost"])}
            d1, d0 = loose["learned_minus_tuned"]["difference"], tuned["simulated"]["learned_minus_tuned"]["difference"]
            kept = d1 / d0
            project["stats"]["looseLead"] = add("Score of the learned policy minus the tuned glide path, futures drawn one month at a time", 0) | {"display": signed(d1)}
            project["stats"]["looseKept"] = add("Share of the learned policy's lead over the tuned glide path that is left on futures drawn one month at a time", min(max(kept, 0.0), 9.99))
            project["stats"]["edgeSource"] = add("Where the simulated saving came from, in a sentence", 0) | {"display": (
                "most of its simulated edge came from patterns the simulator repeats, which no real plan can count on" if kept < 0.5 else
                "its simulated edge held up when the patterns the simulator repeats were taken away")}
            project["why"] = ("Most of the simulated saving came from patterns in the last twelve months that hold inside the runs of history the simulator replays. "
                              "A plan cannot rely on them: real history, where every network had seen only the past, gave the same answer." if kept < 0.5 else
                              "The saving does not depend on reading runs of history: it survives when the months are drawn one at a time.")
            project["tables"]["loose"] = {
                "caption": f"The same policies, not retrained, on {loose['scenarios']:,} futures whose months are drawn one at a time instead of in runs of history. Cost to the sponsor per $100 promised.",
                "headers": ["Policy", "Average cost", "Worst 5%", "Fully funded at year 20", "Average in stocks"],
                "rows": [[name, money(loose["policies"][name]["mean_cost"]), money(loose["policies"][name]["cvar_cost"]),
                          pct(loose["policies"][name]["funded_end_share"]), pct(loose["policies"][name]["stocks_mean"])] for name, _ in names],
                "highlightRow": 2, "source": described}
        curve = anatomy["curve"]
        pictures["anatomy"] = {"funded": curve["funded"], "glide": [round(w[0], 4) for w in curve["glide"]],
                               "learned": {name: [round(w[0], 4) for w in rows] for name, rows in curve["learned"].items()}}

    # The third study's estimates applied to this plan (dpc.pension.stress): what a Fed surprise does to the funded ratio.
    stress = export.get("stress")
    if stress:
        from_lab = f"deep-portfolio-constructor reports/pension/stress.json, from world-shock-lab {stress['lab']['lab_commit'][:7]}"
        pts = lambda v: f"{signed(v['points'] / 100)[:-2] if False else ('+' if v['points'] > 0 else '−' if v['points'] < 0 else '')}{abs(v['points']):.2f}"  # noqa: E731
        mp, cbi = stress["shocks"]["fed_mp"]["horizons"]["0"], stress["shocks"]["fed_cbi"]["horizons"]["0"]
        names = list(mp["policies"])
        sg = lambda x, unit: f"{'+' if x > 0 else '−' if x < 0 else ''}{abs(x):.2f}{unit}" if unit == "%" else f"{'+' if x > 0 else '−' if x < 0 else ''}{abs(x):.1f}{unit}"  # noqa: E731
        rows = [[sh["name"], sg(r["stocks_pct"], "%"), sg(r["yield_bp"], " bp"), sg(r["promise_pct"], "%"),
                 *[f"{pts(v)} (±{v['half_width']:.2f})" for v in r["policies"].values()]]
                for sh in stress["shocks"].values() for r in [sh["horizons"]["0"]]]
        project["tables"]["stress"] = {
            "caption": f"The move in the plan's funded ratio, in points, on the day of a 10 bp surprise in US monetary policy, at {pct(stress['at']['funded'])} funded. "
                       "In brackets: a band that adds the two estimates' 90% half-widths.",
            "headers": ["Surprise (+10 bp)", "Stocks", "10-year yield", "The promise", *names], "rows": rows, "source": from_lab}
        put2 = lambda label, display: {"label": label, "display": display, "source": from_lab}  # noqa: E731
        six = mp["policies"][SIXTY]
        project["stats"] |= {
            "stressStocks": put2("What a 10 bp Fed policy surprise does to stocks on the day (World Shock Lab)", sg(mp["stocks_pct"], "%")),
            "stressYield": put2("What it does to the 10-year yield", sg(mp["yield_bp"], " bp")),
            "stressPromise": put2("What that does to the value of the promise", sg(mp["promise_pct"], "%")),
            "stress6040": put2("Move in the funded ratio of a 60/40 plan, points", pts(six)),
            "stress6040Stocks": put2("Of which from its stocks, points", f"{abs(six['from_stocks']):.2f}"),
            "stress6040Yield": put2("Of which from the cheaper promise, net of its bonds, points", f"{abs(six['from_yield']):.2f}"),
            "stress6040Info": put2("Move in the funded ratio of a 60/40 plan after an information surprise, points", pts(cbi["policies"][SIXTY])),
            "stressEvents": put2("Fed announcements behind the estimates (stocks, then the yield)",
                                 " to ".join(str(n) for n in sorted(set(stress["shocks"]["fed_mp"]["events"].values())))),
        }
        project["stress"] = ("The same rise in rates can hurt or help a pension plan, depending on why it happened."
                             if six["points"] < 0 < cbi["policies"][SIXTY]["points"] else
                             "What a Fed surprise does to the plan depends on what it holds: the more it is matched to its promise, the less it moves.")
        project["stressBand"] = ("Both moves are inside their bands: the two channels are of similar size, so the net is small and these estimates do not settle its sign."
                                 if not six["excludes_zero"] and not cbi["policies"][SIXTY]["excludes_zero"] else
                                 "At least one of the two moves is outside its band.")

    project["stats"].setdefault("edgeSource", {"label": "Where the simulated saving came from, in a sentence", "display": "that analysis is on the project page",
                                               "source": "deep-portfolio-constructor reports/pension/anatomy.json"})

    path = ROOT / "data" / "projects.json"
    data = json.loads(path.read_text())
    ids = [p["id"] for p in data["projects"]]
    if PID in ids:
        data["projects"][ids.index(PID)] = project
    else:
        data["projects"].insert(ids.index("deep-portfolio-constructor") + 1, project)
    groups.apply(data)                                   # order, numbers and the three projects (scripts/groups.py)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    (ROOT / "data" / "pension.json").write_text(json.dumps(pictures, separators=(",", ":")) + "\n")
    print(f"synced {export['source']}: {len(stats)} stats; learned vs glide path: {v_sim} (simulated), {v_walk} (no pull to an average), {v_hist} (history)")


if __name__ == "__main__":
    main()
