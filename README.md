# Sherif Morsi

Portfolio of Sherif Morsi, a third-year Computer Science student at Concordia University in Montreal: AI for long-term investing, quant research, and AI agents.

**Live:** https://shmorsi.github.io/

The site is a **master page plus one page per project**. The master page features the Deep Portfolio Constructor as an interactive lab, then one card per project, each with a chart drawn from that project's committed results (two of them interactive). Each card links to the project's own page, with the method, the results, the limits and links to the code.

| No. | Project | One line | Project page | Code |
|---|---|---|---|---|
| 01 | Deep Portfolio Constructor | A neural network that builds a long-only portfolio for long-term wealth: a transformer allocates across 30 US industries and learns how much to trade, trained in PyTorch on the growth of wealth after costs through a differentiable simulator. Out of sample from January 1960, $1 became $1,368 against $929 for the market (+0.58% a year, t = 1.40): no detectable difference by the pre-registered test. | [projects/deep-portfolio-constructor.html](https://shmorsi.github.io/projects/deep-portfolio-constructor.html) | [deep-portfolio-constructor](https://github.com/shmorsi/deep-portfolio-constructor) |
| 02 | Time-series foundation model | A decoder-only transformer pretrained from scratch in PyTorch, and the audit that found benchmark test data in a public pretraining corpus. Test CRPS 0.688× upstream AutoARIMA, 95% CI [0.624, 0.757], better. | [projects/tsfm.html](https://shmorsi.github.io/projects/tsfm.html) | [tsfm-from-scratch](https://github.com/shmorsi/tsfm-from-scratch) |
| 03 | World Shock Lab | How a central-bank surprise ripples through 53 markets, with forecasts published before each decision. | [projects/world-shock-lab.html](https://shmorsi.github.io/projects/world-shock-lab.html), [live site](https://shmorsi.github.io/world-shock-lab/) | [world-shock-lab](https://github.com/shmorsi/world-shock-lab) |
| 04 | Aurvane | The trust layer for the agent economy: signed mandates, four rules on every action, narrower-only sub-agent mandates, a hash-chained log. Against a simulated agent that obeys every injected instruction, attacks that landed fell from 30 of 30 to 7 of 30. Real-model runs have not been run yet. | [aurvane/](https://shmorsi.github.io/aurvane/) | [aurvane](https://github.com/shmorsi/aurvane) |

Project numbers follow the order of `data/projects.json`. "Private" means visitors cannot open the repository: the site shows "Code: private repository" instead of a dead link. To publish one, set `"public": true` on its repo link in `data/projects.json` (or remove the key), then run `python3 scripts/build_home.py` and `python3 scripts/sync_chrome.py`.

## Keep the site in sync with the projects

Change a project in its own repository first, merge it to that repository's `main`, then bring it here. One command does every step below, in order, and stops on the first problem:

```sh
python3 scripts/sync_all.py          # expects the project repos checked out next to this one (--src to point elsewhere)
```

It copies what each project generates (the Deep Portfolio Constructor's `reports/site_wealth.json`, Aurvane's `ui/index.html` and benchmark summaries), checks every hand-written TSFM and World Shock Lab figure against the raw numbers in the JSON file it cites, fails if World Shock Lab has scored a decision the page still calls pending, then rebuilds and runs `check_site.py`. Exit 0 means the site matches every project.

The [Sync projects](.github/workflows/sync.yml) workflow runs the same script daily against each project's `main` (or on demand from the Actions tab) and opens one pull request, `auto/sync-projects`, when anything changed. It never merges by itself. If a hand-written figure went stale it fails instead, and the run summary names the stat and the page to fix. It needs one setting: Settings > Actions > General > "Allow GitHub Actions to create and approve pull requests".

To keep merges clean: one branch per change, merged to `main` before starting the next; project repo first, site second; never edit a generated file (`index.html`, `projects/deep-portfolio-constructor.html`, `aurvane/index.html`, `data/dpc_wealth.json`) by hand, because the next sync overwrites it.

## Update a measured number

Do not type a new figure into a page. Every displayed figure, and every chart on the master page, is read from **[data/projects.json](data/projects.json)**, and each figure names the committed result it came from. `scripts/check_site.py` fails if the visible fallback text drifts from that file, or if the master page no longer matches a fresh build.

The project repositories generate their own documents from those result files. Copy a figure into `data/projects.json` only when a command printed it from a committed file, and keep the source path on the stat. Do not round it again here.

| Result | Where the site reads it | Note |
|---|---|---|
| Deep Portfolio Constructor: every figure, the growth of $1, the holdings and the figures | `deep-portfolio-constructor` `reports/site_wealth.json` and `reports/figures/wealth/` | Written by `python -m dpc.cli wealth-site` in that repository from its committed `reports/results/wealth/*.parquet`, then `python3 scripts/sync_dpc.py <path to site_wealth.json>` here, which writes `data/projects.json`, `data/dpc_wealth.json` and `assets/img/dpc-*.png`. Nothing is typed by hand. `check_site.py` fails if the lab's growth of $1 disagrees with the performance table, if any month's holdings are not long-only and fully invested, or if a sentence disagrees with the pre-registered verdict. |
| TSFM, test split | `tsfm-from-scratch` `results/analysis/headline.json` | patch_s2, one seed, 97 configurations. |
| World Shock Lab decision scores | `world-shock-lab` `live/scores/` when a decision has been scored | The project page keeps the slot empty until that file exists. As of 2026-11-08 no score file is committed. |
| Aurvane, worst-case benchmark | `data/measurements/aurvane/worst-case_summary.json` | Copied from the `aurvane` repo `bench/results/`. Simulated worst-case agent, 60 paired tasks, deterministic. Not a real-model score. |
| TSFM distillation | none on `tsfm-from-scratch` main | Do not invent one. |

## Build

The master page and the Deep Portfolio Constructor page are generated from `data/projects.json`, so their fallback text always matches the data. The TSFM and World Shock Lab pages are hand-written; `sync_chrome.py` keeps their shared parts in step.

```sh
python3 scripts/sync_dpc.py ../deep-portfolio-constructor/reports/site_wealth.json    # project figures, series and holdings, when they change
python3 scripts/make_marks.py        # one project mark per project (assets/marks/)
python3 scripts/make_land.py land-110m.json   # data/land_mask.json for the particle globe (only if the map source changes)
python3 scripts/build_home.py        # index.html, the master page (with scripts/stories.py and scripts/plain.py)
python3 scripts/build_dpc_page.py    # projects/deep-portfolio-constructor.html
python3 scripts/sync_chrome.py       # header, footer, project label, plain-English panel, previous / next links, private-repo notes
python3 scripts/make_og.py           # share images (needs Playwright's Chromium)
python3 scripts/check_site.py        # copy rules, figure binds, charts, pending slots, internal links
```

## Design

Static HTML, one stylesheet (`assets/site.css`), one script (`assets/site.js`), and a self-hosted Inter Tight under the SIL Open Font License. No third-party font request, no framework.

The look is a launch-control theme for a deep learning and markets portfolio: pure black by default on every page, tracked uppercase display type, thin rules, telemetry numerals, ghost buttons that fill on hover, and one ice-blue accent (`#8ec5ff`), with amber for anything live. The header toggle switches to light for that browser.

- **Hero.** Full-bleed: the name on the left, and behind it a 3D neural network drawn in 18,000 glowing points (8,000 on phones) that flies together when the page opens, turns slowly, leans toward the pointer and carries pulses forward and amber pulses back.
- **The stage.** Those points are one system for the whole page (a WebGL canvas fixed behind the content, "The stage" in `assets/site.js`). As the reader scrolls they re-form into each story's picture in turn: "$1", thirty industry bars, the growth of that dollar drawn from 1960 to 2026, a forecast and its range, a globe taking a shock that spreads out from Washington, thirty attacks landing and then being stopped, and finally the name. Each shape is sampled from the story's own SVG, so the points carry the same data and the SVG keeps its words and numbers on top; the globe's land comes from `data/land_mask.json` (Natural Earth 1:110m, public domain; `scripts/make_land.py` rasterises it). Without WebGL, or under reduced motion, the SVG pictures stay as they are.
- **Telemetry strip.** Each project's headline figure, linked to its card.
- **Featured project: the portfolio lab.** Pick one of seven long-only strategies and see its growth of $1 since 1960 (market crashes shaded, a readout under the pointer), its compound growth, worst fall and turnover, its pre-registered verdict against the market, and what it did differently, in plain English. Beside its deep stack sits the interactive illustration of end-to-end learning: seeded random-walk prices stream into a small network, the outputs set the portfolio's weights, and amber pulses run backwards as the gradient. Point at a stock to trace it; click its price line to shock it. It is labelled as an illustration, not data, has a pause button, and draws one still frame under `prefers-reduced-motion`.
- **Project cards.** One chart grammar for every card: a reference line (zero or the baseline) and either bars or points with their intervals, drawn from the data at build time. World Shock Lab's card takes a Fed or Bank of Canada surprise of any size and scales the committed per-10 bp estimates and their 90% bands; Aurvane's card replays its 30 poisoned tasks with and without the guard.
- **The portfolio page.** "Try it" is a two-asset growth toy (labelled as made-up numbers) that shows why the network is trained on the growth of wealth rather than on average return; "Inside the portfolio" scrubs through the network's real holdings against the market's, quarter by quarter since 1960; "How often to trade" switches the same trained network between daily, monthly, quarterly and yearly rebalancing; the results compare it with the S&P 500 (dividends reinvested) and the NASDAQ Composite.
- **Plain English.** Jargon (Sharpe, the Kelly criterion, active share, CRPS, basis point, prompt injection and so on) has a dotted underline and a one-tap definition.

- **Four projects, in plain English.** Right after the hero, a sentence lights up word by word as you scroll, then each project gets a pinned chapter: the screen holds while four short, jargon-free steps (the question, what it does, how it works, the honest result) play out with the scroll, and a picture beside them builds from the project's real results: the growth of $1 since 1960 drawn month by month, the forecast error against a standard method, a Fed surprise rippling across 53 markets, 30 attacks landing and then being stopped. The words live in `scripts/plain.py` (one source, also used for the "In plain English" panel at the top of each project page); the pictures are drawn by `scripts/stories.py` from `data/projects.json` and `data/dpc_wealth.json`, and every number in them is a data-bind.
- **Motion that follows the scroll.** Nothing waits on a timer: titles rise letter by letter, blocks slide into place and figures count up as a function of the scroll position, so the page moves exactly as fast as the reader. The mouse wheel is smoothed. A slow WebGL field of domain-warped noise sits behind every page and takes on each chapter's colour; the hero name thickens and lights toward the pointer, then leaves letter by letter as you scroll; a toolkit marquee runs with the scroll; a closing wordmark fills as the page ends. Panels light up under the pointer, buttons lean toward it, and pages cross-fade.

All of it lives at the end of `assets/site.css` and `assets/site.js` ("Atmosphere"). It is added only when the reader allows motion: under `prefers-reduced-motion` the field draws one still frame, the chapters lay out as plain text beside finished pictures, and nothing moves. Nothing is hidden if the script does not run.

Every interactive piece is rendered as complete static HTML first by `scripts/lab.py`, so it reads correctly without JavaScript; `assets/site.js` then wires it up.

Project pages share one template: a project label with its mark, the headline, a sticky section index built from the page's own headings, the sections, and previous / next project links. Motion is a short fade on scroll and charts that draw in; nothing moves under `prefers-reduced-motion`, and nothing is hidden if the script does not run.

`aurvane/index.html` is built in the `aurvane` repository (`python ui/build.py`) and copied here unchanged. It uses the same tokens and loads this site's Inter Tight from `../assets/fonts/`.

## Check

```sh
python3 -m http.server 4173      # preview at http://localhost:4173
python3 scripts/check_site.py    # copy rules, figure binds, charts, pending slots, and internal links
```

The resume link points at `resume/Sherif_Morsi_Resume.pdf`. World Shock Lab's live site is served from the `world-shock-lab` repository at `https://shmorsi.github.io/world-shock-lab/`; do not add a `world-shock-lab/` directory here.
