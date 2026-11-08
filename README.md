# Sherif Morsi

Portfolio of Sherif Morsi, a third-year Computer Science student at Concordia University in Montreal: AI agents, deep learning, and quant research.

**Live:** https://shmorsi.github.io/

The site is a **master page plus one mission page per project**. The master page is a mission manifest: one card per project, with a role filter (AI agents, deep learning and ML, quant and finance, engineering). Each card links to that project's own mission page, with the method, the results, the limits and links to the code.

| Mission | One line | Mission page | Code |
|---|---|---|---|
| 01 Aurvane | The trust layer for the agent economy: signed mandates, four rules on every action, narrower-only sub-agent mandates, Allow/Deny approvals, a hash-chained log. Against a simulated agent that obeys every injected instruction, attacks that landed fell from 30 of 30 to 7 of 30. Real-model runs have not been run yet. | [aurvane/](https://shmorsi.github.io/aurvane/) | [aurvane](https://github.com/shmorsi/aurvane) |
| 02 Deep Portfolio Constructor | A market-neutral long-short portfolio with PyTorch at every layer (a transformer return model, a transformer covariance model, end-to-end training through a differentiable optimiser), built as an ablation. The optimiser raised the share of risk from intended stock bets from 17% to 61%; training through the optimiser gave the best net Sharpe, 0.58 against −0.03, not significant. | [projects/deep-portfolio-constructor.html](https://shmorsi.github.io/projects/deep-portfolio-constructor.html) | private |
| 03 Orbit | Orbit Code: a planner, coder, test runner, and reviewer. On code-eval-v2 the team passed 29 of 32 and a single agent passed 27 of 32. Paired 95% interval 0.000 to 0.15625, includes zero, so that gap is not an improvement. | [orbit/](https://shmorsi.github.io/orbit/) | private |
| 04 TSFM | patch_s2 on the test split: CRPS 0.688× upstream AutoARIMA, 95% CI [0.624, 0.757], better. Validation CRPS was 0.605× Seasonal Naive. | [projects/tsfm.html](https://shmorsi.github.io/projects/tsfm.html) | [tsfm-from-scratch](https://github.com/shmorsi/tsfm-from-scratch) |
| 05 World Shock Lab | How a central-bank surprise ripples through 53 markets, with forecasts published before each decision. | [projects/world-shock-lab.html](https://shmorsi.github.io/projects/world-shock-lab.html), [live site](https://shmorsi.github.io/world-shock-lab/) | [world-shock-lab](https://github.com/shmorsi/world-shock-lab) |
| 06 ATLAS | An economic research terminal that traces how a cost shock travels through the world's production networks. | [projects/atlas.html](https://shmorsi.github.io/projects/atlas.html) | private |

"Private" means visitors cannot open the repository. The site shows "Code: private repository" instead of a dead link. To publish one, set `"public": true` on its repo link in `data/projects.json` (or remove the key), then run `python3 scripts/sync_chrome.py` and `python3 scripts/build_home.py`.

## Update a measured number

Do not type a new figure into a page. Every displayed figure is read from **[data/projects.json](data/projects.json)**, and each one names the committed result it came from. `scripts/check_site.py` fails if the visible fallback text drifts from that file.

The project repositories generate their own documents from those result files. Copy a figure into `data/projects.json` only when a command printed it from a committed file, and keep the source path on the stat. Do not round it again here.

| Result | Where the site reads it | Note |
|---|---|---|
| Aurvane, worst-case benchmark | `data/measurements/aurvane/worst-case_summary.json` | Copied from the `aurvane` repo `bench/results/`. Simulated worst-case agent, 60 paired tasks, deterministic. Not a real-model score. |
| Deep Portfolio Constructor, every figure | `deep-portfolio-constructor` `reports/site_figures.json` | Written by `python -m dpc.cli site` in that repository, then `python3 scripts/sync_dpc.py <path to site_figures.json>` here. Nothing is typed by hand. |
| Orbit Code, code-eval-v2 | `data/measurements/orbit/code_v2/claude-haiku-5-5/{single,team}.json` | 32 tasks. `comparison.json`: pass@1 interval 0.000 to 0.15625, includes zero, so 29 of 32 versus 27 of 32 is not an improvement. |
| Orbit fine-tune, harness v3 | `data/measurements/orbit/v3_qwen1.5b/` including `comparison.json` | Schema-valid interval for the fine-tuned team minus the base team is above zero. Task success includes zero. |
| Orbit Boardroom | none | Scripted demo. The page says it is not a measured score. |
| World Shock Lab decision scores | `world-shock-lab` `live/scores/` when a decision has been scored | The case study keeps the slot empty until that file exists. As of 2026-11-08 no score file is committed. |
| TSFM distillation | none on `tsfm-from-scratch` main | Do not invent one. |

## Build

The master page and the Deep Portfolio Constructor page are generated from `data/projects.json`, so their fallback text always matches the data. The other mission pages are hand-written; `sync_chrome.py` keeps their shared parts in step.

```sh
python3 scripts/sync_dpc.py ../deep-portfolio-constructor/reports/site_figures.json   # project figures, when they change
python3 scripts/make_patches.py      # one mission patch per project (assets/patches/)
python3 scripts/build_home.py        # index.html, the master page
python3 scripts/build_dpc_page.py    # projects/deep-portfolio-constructor.html
python3 scripts/sync_chrome.py       # header, footer, private-repo notes, mission nav on every page
python3 scripts/make_og.py           # share images (needs Playwright's Chromium)
python3 scripts/check_site.py        # copy rules, figure binds, pending slots, internal links
```

## Design

Static HTML, one stylesheet (`assets/site.css`), one script (`assets/site.js`), and a self-hosted Inter Tight under the SIL Open Font License. No third-party font request.

The look is a launch-control theme: pure black by default on every page, tracked uppercase display type, thin rules, square corners, ghost buttons that fill on hover, and one ice-blue accent (`#8ec5ff`). The header toggle switches to light for that browser. The hero is a planet limb with slow orbits on a still star field. Each project has an original mission patch drawn by `scripts/make_patches.py`. No third-party logos, marks or photography are used.

Mission pages share one template: a mission label with the patch, the headline, a sticky section index built from the page's own headings, the sections, and previous/next mission links. Motion is a short fade on scroll. Clips stay on a still frame until played, and nothing animates under `prefers-reduced-motion`.

`aurvane/index.html` is built in the `aurvane` repository (`python ui/build.py`) and copied here unchanged. It uses the same tokens and loads this site's Inter Tight from `../assets/fonts/`.

The Orbit page has a mission-control scene (`orbit/scene.js`) that replays a saved engine trace from `orbit/replay/traces/`. It opens on the incident-commander traces in `orbit/replay/traces/incident/` and keeps the six-role v2 traces and the three-role v1 traces in the same selector. Every trace there comes from the scripted harness: a replay, not a model score.

## Check

```sh
python3 -m http.server 4173      # preview at http://localhost:4173
python3 scripts/check_site.py    # copy rules, figure binds, pending slots, and internal links
```

The resume link points at `resume/Sherif_Morsi_Resume.pdf`. World Shock Lab's live site is served from the `world-shock-lab` repository at `https://shmorsi.github.io/world-shock-lab/`; do not add a `world-shock-lab/` directory here.
