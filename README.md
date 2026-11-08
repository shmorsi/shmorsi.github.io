# Sherif Morsi

Portfolio of Sherif Morsi, a third-year Computer Science student at Concordia University in Montreal: deep learning for finance, quant research, and AI agents.

**Live:** https://shmorsi.github.io/

The site is a **master page plus one page per project**. The master page features the Deep Portfolio Constructor as an interactive lab, then one card per project, each with a chart drawn from that project's committed results (two of them interactive). Each card links to the project's own page, with the method, the results, the limits and links to the code.

| No. | Project | One line | Project page | Code |
|---|---|---|---|---|
| 01 | Deep Portfolio Constructor | A market-neutral long-short portfolio with PyTorch at every layer (a transformer return model, a transformer covariance model, end-to-end training through a differentiable optimiser), built as an ablation. The optimiser raised the share of risk from intended stock bets from 17% to 61%; training through the optimiser gave the best net Sharpe, 0.58 against −0.03, not significant. | [projects/deep-portfolio-constructor.html](https://shmorsi.github.io/projects/deep-portfolio-constructor.html) | [deep-portfolio-constructor](https://github.com/shmorsi/deep-portfolio-constructor) |
| 02 | Time-series foundation model | A decoder-only transformer pretrained from scratch in PyTorch, and the audit that found benchmark test data in a public pretraining corpus. Test CRPS 0.688× upstream AutoARIMA, 95% CI [0.624, 0.757], better. | [projects/tsfm.html](https://shmorsi.github.io/projects/tsfm.html) | [tsfm-from-scratch](https://github.com/shmorsi/tsfm-from-scratch) |
| 03 | World Shock Lab | How a central-bank surprise ripples through 53 markets, with forecasts published before each decision. | [projects/world-shock-lab.html](https://shmorsi.github.io/projects/world-shock-lab.html), [live site](https://shmorsi.github.io/world-shock-lab/) | [world-shock-lab](https://github.com/shmorsi/world-shock-lab) |
| 04 | Aurvane | The trust layer for the agent economy: signed mandates, four rules on every action, narrower-only sub-agent mandates, a hash-chained log. Against a simulated agent that obeys every injected instruction, attacks that landed fell from 30 of 30 to 7 of 30. Real-model runs have not been run yet. | [aurvane/](https://shmorsi.github.io/aurvane/) | [aurvane](https://github.com/shmorsi/aurvane) |

Project numbers follow the order of `data/projects.json`. "Private" means visitors cannot open the repository: the site shows "Code: private repository" instead of a dead link. To publish one, set `"public": true` on its repo link in `data/projects.json` (or remove the key), then run `python3 scripts/build_home.py` and `python3 scripts/sync_chrome.py`.

## Update a measured number

Do not type a new figure into a page. Every displayed figure, and every chart on the master page, is read from **[data/projects.json](data/projects.json)**, and each figure names the committed result it came from. `scripts/check_site.py` fails if the visible fallback text drifts from that file, or if the master page no longer matches a fresh build.

The project repositories generate their own documents from those result files. Copy a figure into `data/projects.json` only when a command printed it from a committed file, and keep the source path on the stat. Do not round it again here.

| Result | Where the site reads it | Note |
|---|---|---|
| Deep Portfolio Constructor, every figure | `deep-portfolio-constructor` `reports/site_figures.json` | Written by `python -m dpc.cli site` in that repository, then `python3 scripts/sync_dpc.py <path to site_figures.json>` here. Nothing is typed by hand. |
| Deep Portfolio Constructor, growth of $1, risk split, the book | `data/dpc_lab.json`, `data/dpc_book.json` | Exported by `scripts/export_dpc_lab.py` from the project's committed `reports/results/*.parquet` (run it with that project's virtual environment). `check_site.py` fails if the risk split or drawdowns disagree with the performance table, or if any book is not dollar-neutral within its 5% position and ±5% sector limits. |
| TSFM, test split | `tsfm-from-scratch` `results/analysis/headline.json` | patch_s2, one seed, 97 configurations. |
| World Shock Lab decision scores | `world-shock-lab` `live/scores/` when a decision has been scored | The project page keeps the slot empty until that file exists. As of 2026-11-08 no score file is committed. |
| Aurvane, worst-case benchmark | `data/measurements/aurvane/worst-case_summary.json` | Copied from the `aurvane` repo `bench/results/`. Simulated worst-case agent, 60 paired tasks, deterministic. Not a real-model score. |
| TSFM distillation | none on `tsfm-from-scratch` main | Do not invent one. |

## Build

The master page and the Deep Portfolio Constructor page are generated from `data/projects.json`, so their fallback text always matches the data. The TSFM and World Shock Lab pages are hand-written; `sync_chrome.py` keeps their shared parts in step.

```sh
python3 scripts/sync_dpc.py ../deep-portfolio-constructor/reports/site_figures.json   # project figures, when they change
../deep-portfolio-constructor/.venv/bin/python scripts/export_dpc_lab.py              # the lab's series and the book, from committed results
python3 scripts/make_marks.py        # one project mark per project (assets/marks/)
python3 scripts/build_home.py        # index.html, the master page
python3 scripts/build_dpc_page.py    # projects/deep-portfolio-constructor.html
python3 scripts/sync_chrome.py       # header, footer, project label, previous / next links, private-repo notes
python3 scripts/make_og.py           # share images (needs Playwright's Chromium)
python3 scripts/check_site.py        # copy rules, figure binds, charts, pending slots, internal links
```

## Design

Static HTML, one stylesheet (`assets/site.css`), one script (`assets/site.js`), and a self-hosted Inter Tight under the SIL Open Font License. No third-party font request, no framework.

The look is a launch-control theme for a deep learning and markets portfolio: pure black by default on every page, tracked uppercase display type, thin rules, telemetry numerals, ghost buttons that fill on hover, and one ice-blue accent (`#8ec5ff`), with amber for anything live. The header toggle switches to light for that browser.

- **Hero.** An original canvas illustration of end-to-end learning for a long-short book: seeded random-walk prices stream into a small network, attention picks out edges, the outputs set long and short weights, and amber pulses run backwards as the gradient. Point at a stock to trace it; click its price line to shock it and watch the book rebalance. It is labelled as an illustration, not data, has a pause button, pauses off screen and in background tabs, and draws one still frame under `prefers-reduced-motion`.
- **Telemetry strip.** Each project's headline figure, linked to its card.
- **Featured project: the portfolio lab.** Pick a step of the ablation and see its growth of $1 since 2008 (crisis years shaded, a readout under the pointer), its Sharpe, drawdown and beta, where its risk comes from, and what changed, in plain English.
- **Project cards.** One chart grammar for every card: a reference line (zero or the baseline) and either bars or points with their intervals, drawn from the data at build time. World Shock Lab's card takes a Fed or Bank of Canada surprise of any size and scales the committed per-10 bp estimates and their 90% bands; Aurvane's card replays its 30 poisoned tasks with and without the guard.
- **The portfolio page.** "Try it" builds an eight-stock long-short book in the browser (labelled as made up) so a reader can switch on beta and sector neutrality and watch the unintended risk disappear; "Inside the book" scrubs through the real end-to-end book at all 225 rebalances.
- **Plain English.** Jargon (Sharpe, beta, CRPS, basis point, prompt injection and so on) has a dotted underline and a one-tap definition.

Every interactive piece is rendered as complete static HTML first by `scripts/lab.py`, so it reads correctly without JavaScript; `assets/site.js` then wires it up.

Project pages share one template: a project label with its mark, the headline, a sticky section index built from the page's own headings, the sections, and previous / next project links. Motion is a short fade on scroll and charts that draw in; nothing moves under `prefers-reduced-motion`, and nothing is hidden if the script does not run.

`aurvane/index.html` is built in the `aurvane` repository (`python ui/build.py`) and copied here unchanged. It uses the same tokens and loads this site's Inter Tight from `../assets/fonts/`.

## Check

```sh
python3 -m http.server 4173      # preview at http://localhost:4173
python3 scripts/check_site.py    # copy rules, figure binds, charts, pending slots, and internal links
```

The resume link points at `resume/Sherif_Morsi_Resume.pdf`. World Shock Lab's live site is served from the `world-shock-lab` repository at `https://shmorsi.github.io/world-shock-lab/`; do not add a `world-shock-lab/` directory here.
