#!/usr/bin/env python3
"""Copy the risk study into the site: where the forecasting model meets the investing project.

The study lives in deep-portfolio-constructor (docs/risk_protocol.md): does the forecasting
model's volatility forecast beat the standard methods, and does a long-only portfolio built on
it run at lower risk? Input: that repository's reports/risk/site_risk.json, written by
`python -m dpc.cli risk-evaluate` from its committed results. Output:

* the risk figures (stats named risk...) and two tables of the tsfm entry in data/projects.json;
* the "Does it help an investor?" section of projects/tsfm.html, between its two markers.

Nothing is typed: every figure is a bind to the export, and each sentence is chosen by the
pre-registered verdict it reports. A checkpoint the study has not scored is said to be not run.
Run:
    python3 scripts/sync_risk.py ../deep-portfolio-constructor/reports/risk/site_risk.json
then sync_chrome.py and check_site.py.
"""

from __future__ import annotations

import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PID = "tsfm"
PAGE = ROOT / "projects" / "tsfm.html"
START, END = "<!-- risk:start (written by scripts/sync_risk.py; do not edit) -->", "<!-- risk:end -->"
REPO = "https://github.com/shmorsi/deep-portfolio-constructor"
# The two checkpoints the protocol names: suffix in the export, and what a reader calls each.
MODELS = {"CpuS0": "small public model", "PatchS2": "headline model"}
ACCURATE = {"better": "more accurate than the standard method", "worse": "less accurate than the standard method",
            "no detectable difference": "not detectably more accurate than the standard method"}
RISK = {"lower risk": "a portfolio built on them ran at lower risk", "higher risk": "a portfolio built on them ran at higher risk",
        "no detectable difference": "a portfolio built on them was no less risky"}
e = html.escape


def key(name: str) -> str:
    return "risk" + name[0].upper() + name[1:]


def main(src: str) -> None:
    site = json.loads(Path(src).read_text())
    S = site["stats"]
    path = ROOT / "data" / "projects.json"
    data = json.loads(path.read_text())
    project = next(p for p in data["projects"] if p["id"] == PID)
    for old in [k for k in project["stats"] if k.startswith("risk")]:
        del project["stats"][old]
    project["stats"].update({key(k): v for k, v in S.items()})
    project["tables"]["riskAccuracy"] = site["tables"]["accuracy"]
    project["tables"]["riskPortfolio"] = site["tables"]["min_variance"]
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    def b(name: str) -> str:
        return f'<span data-bind="{PID}.stats.{key(name)}.display">{e(str(S[name]["display"]), quote=False)}</span>'

    run = [sfx for sfx in MODELS if S[f"status{sfx}"]["display"] == "run"]
    said = site["sentences"].get("seeds", "")                         # the public model's other pretraining seeds, when they were run
    seeds = (" Its other pretraining seeds give the same verdicts; they are in the table." if "give the same verdicts" in said
             else " Its other pretraining seeds do not all give the same verdicts; they are in the table." if said else "")
    items = []
    for sfx in run:
        who = MODELS[sfx]
        items.append(f"<li><strong>Accuracy, the {who} ({b(f'params{sfx}')} parameters).</strong> Fine-tuned, its quantile loss was {b(f'wqlFt{sfx}')} HAR's "
                     f"(95% interval {b(f'wqlCiFt{sfx}')}): {b(f'wqlVerdictFt{sfx}')}. Zero-shot it was {b(f'wqlZero{sfx}')} ({b(f'wqlCiZero{sfx}')}): "
                     f"{b(f'wqlVerdictZero{sfx}')}. Fine-tuning restarts every five years on past data only; at {b(f'refitsKept{sfx}')} refits the "
                     f"validation years preferred the untouched model.{seeds if sfx == 'CpuS0' else ''}</li>")
        if f"ftVsEwma{sfx}" in S:                                  # described after the test: where the fine-tuned model stands among the others
            helped = {"better": "Fine-tuning on past data helped", "worse": "Fine-tuning on past data hurt",
                      "no detectable difference": "Fine-tuning on past data made no detectable difference"}[S[f"ftVsZeroVerdict{sfx}"]["display"]]
            reach = {"worse": ", but not enough to reach HAR", "better": ", and took it past HAR", "no detectable difference": ", to within reach of HAR"}[S[f"wqlVerdictFt{sfx}"]["display"]]
            items.append(f"<li><strong>Where that leaves it</strong> (described after the test, not pre-registered). Fine-tuned, its loss was {b(f'ftVsEwma{sfx}')} "
                         f"that of RiskMetrics, the industry's usual method ({b(f'ftVsEwmaCi{sfx}')}: {b(f'ftVsEwmaVerdict{sfx}')}), {b(f'ftVsLast{sfx}')} that of "
                         f"simply repeating last month ({b(f'ftVsLastVerdict{sfx}')}), and {b(f'ftVsZero{sfx}')} its own zero-shot loss "
                         f"({b(f'ftVsZeroVerdict{sfx}')}). {helped}{reach}.</li>")
        items.append(f"<li><strong>What the forecasts are worth.</strong> One long-only minimum-variance rule is fed by each forecaster in turn. On this model's "
                     f"forecasts it ran at {b(f'volFt{sfx}')} a year against {b('volHar')} on HAR's ({b(f'volVsHarFt{sfx}')}, "
                     f"<button type=\"button\" class=\"term\" data-term=\"t-stat\">t</button> = {b(f'volTFt{sfx}')}): {b(f'volVerdictFt{sfx}')}.</li>")
    items.append(f"<li><strong>The ceiling.</strong> A perfect forecast of next month's volatilities would have run the same rule at {b('volOracle')} a year "
                 f"({b('oracleVsHar')} against HAR's: {b('oracleVerdict')}). That is all the room any forecaster has here. The market itself ran at {b('volMarket')}.</li>")
    for sfx in MODELS:
        if sfx not in run:
            items.append(f"<li><strong>The {MODELS[sfx]} ({b(f'params{sfx}')} parameters) has not been run on this test.</strong> Its weights are not public yet. "
                         f"The protocol names it by hash and scores it without change when they are.</li>")
    if run:
        top = run[-1]                                                  # the strongest checkpoint that has been scored
        earned = S[f"earns{top}"]["display"] == "yes"
        lead = (f"{'Yes' if earned else 'Not'} on this test. The {MODELS[top]}'s risk forecasts were {ACCURATE[S[f'wqlVerdictFt{top}']['display']]}, "
                f"and {RISK[S[f'volVerdictFt{top}']['display']]}.")
    else:
        lead = "Not tested yet: no checkpoint has been scored."
    block = f"""{START}
      <section class="cs-section" aria-labelledby="s-risk">
        <h2 id="s-risk">Does it help an investor?</h2>
        <div class="prose">
          <p class="big">{e(lead, quote=False)}</p>
          <p>This is where the forecasting model meets the investing project. At each month-end, six forecasters predict next month's volatility of each of {b('industries')} US industries: four standard methods, and this model both zero-shot and fine-tuned. Each makes {b('forecasts')} forecasts over {b('months')} months, the same out-of-sample window as the <a href="deep-portfolio-constructor.html">portfolio study</a>. The standard to beat is HAR, a regression on each industry's own recent volatility. The rule for what counts as helping (more accurate than HAR, and a lower-risk portfolio) was committed before any forecast was scored.</p>
          <ul>
            {(chr(10) + "            ").join(items)}
          </ul>
          <div class="table-wrap" tabindex="0" role="region" aria-label="Accuracy of the volatility forecasts" data-table="{PID}.tables.riskAccuracy"></div>
          <div class="table-wrap" tabindex="0" role="region" aria-label="The portfolio built on each forecaster" data-table="{PID}.tables.riskPortfolio"></div>
          <p class="file-note">The study lives in the Deep Portfolio Constructor repository: <a href="{REPO}/blob/main/docs/risk_protocol.md" target="_blank" rel="noopener noreferrer">protocol</a>, <a href="{REPO}/blob/main/reports/risk/results.md" target="_blank" rel="noopener noreferrer">every table</a>, <a href="{REPO}/tree/main/src/dpc/risk" target="_blank" rel="noopener noreferrer">code</a> and {b('tests')} tests. Volatility is measured from daily returns; the industries are Kenneth French's.</p>
        </div>
      </section>
      {END}"""
    text = PAGE.read_text(encoding="utf-8")
    if START not in text or END not in text:
        raise SystemExit(f"{PAGE.name} has no risk markers")
    before, rest = text.split(START, 1)
    PAGE.write_text(before + block + rest.split(END, 1)[1], encoding="utf-8")
    print(f"synced the risk study at {site['commit']}: {len(S)} stats; scored: {', '.join(MODELS[s] for s in run) or 'no checkpoint'}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(ROOT.parent / "deep-portfolio-constructor" / "reports" / "risk" / "site_risk.json"))
