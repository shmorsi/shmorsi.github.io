# Sherif Morsi

Portfolio of Sherif Morsi, a third-year Computer Science student at Concordia University in Montreal.

**Live:** https://shmorsi.github.io/

The site is the hub. Each project keeps its own repository; this site links to its live page and its code.

| Order | One line | Live page | Code |
|---|---|---|---|
| 01 Aurvane | The trust layer for the agent economy: signed mandates, four rules on every action, narrower-only sub-agent mandates, Allow/Deny approvals, a hash-chained log. Against a simulated agent that obeys every injected instruction, attacks that landed fell from 30 of 30 to 7 of 30; the 7 are by design (prose rewrites and in-budget charges capped by the mandate). Real-model runs have not been run yet. | [Live demo](https://shmorsi.github.io/aurvane/) | [aurvane](https://github.com/shmorsi/aurvane) |
| 02 Orbit | Orbit Code: a planner, coder, test runner, and reviewer. On code-eval-v2 the team passed 29 of 32 and a single agent passed 27 of 32. Paired 95% interval 0.000 to 0.15625, includes zero, so that gap is not an improvement. | [Mission page](https://shmorsi.github.io/orbit/) | [orbit-multi-agent](https://github.com/shmorsi/orbit-multi-agent) |
| 03 TSFM | patch_s2 on the test split: CRPS 0.688× upstream AutoARIMA, 95% CI [0.624, 0.757], better. Validation CRPS was 0.605× Seasonal Naive. | [Case study](https://shmorsi.github.io/projects/tsfm.html) | [tsfm-from-scratch](https://github.com/shmorsi/tsfm-from-scratch) |
| 04 World Shock Lab | How a central-bank surprise ripples through 53 markets, with forecasts published before each decision. | [Live site](https://shmorsi.github.io/world-shock-lab/), [case study](https://shmorsi.github.io/projects/world-shock-lab.html) | [world-shock-lab](https://github.com/shmorsi/world-shock-lab) |
| 05 ATLAS | An economic research terminal that traces how a cost shock travels through the world's production networks. | [Case study](https://shmorsi.github.io/projects/atlas.html) | [atlas](https://github.com/shmorsi/atlas) |

## Update a measured number

Do not type a new figure into a page. Every displayed figure is read from **[data/projects.json](data/projects.json)**, and each one names the committed result it came from. `scripts/check_site.py` fails if the visible fallback text drifts from that file.

The project repositories generate their own documents from those result files. Run the generator in the project repository after the result is committed. Copy a figure into `data/projects.json` only when that command printed it from a committed file, and keep the source path on the stat. Do not round it again here.

| Result | Where the site reads it | Note |
|---|---|---|
| Aurvane, worst-case benchmark | `data/measurements/aurvane/worst-case_summary.json` | Copied from the `aurvane` repo `bench/results/`. Simulated worst-case agent, 60 paired tasks, deterministic. Not a real-model score. |
| Orbit Code, code-eval-v2 | `data/measurements/orbit/code_v2/claude-haiku-5-5/{single,team}.json` | 32 tasks. `comparison.json`: pass@1 interval 0.000 to 0.15625, includes zero, so 29 of 32 versus 27 of 32 is not an improvement. |
| Orbit fine-tune, harness v3 | `data/measurements/orbit/v3_qwen1.5b/` including `comparison.json` | Schema-valid interval for the fine-tuned team minus the base team is above zero. Task success includes zero. |
| Orbit Boardroom | none | Scripted demo. The page says it is not a measured score. |
| World Shock Lab decision scores | `world-shock-lab` `live/scores/` when a decision has been scored | The case study keeps the slot empty until that file exists. |
| TSFM distillation | none on `tsfm-from-scratch` main | Do not invent one. |

`tsfm-from-scratch` has no distillation result and no distillation template on `main`. Its `scripts/make_portfolio_page.py` writes an older page layout. Do not point that script at this site.

The patch_s2 test score is measured in `tsfm-from-scratch` `results/analysis/headline.json`. A missing file stays missing. Do not describe an interval that includes zero as an improvement.

Each project has one headline figure (`headline.stat` plus its honest `headline.qualifier`), three short facts (`factIds`), a quiet `caveat`, and two prominent links: `kind: "site"` and `kind: "repo"`.

The home page's mission index and each `data-bind` span also carry the figure as plain text, so the page reads correctly without JavaScript. `scripts/check_site.py` fails if that text drifts from the data.

## Design

Static HTML, one stylesheet (`assets/site.css`), one script (`assets/site.js`), and a self-hosted Inter Tight under the SIL Open Font License. No third-party font request. Pure black by default, with tracked uppercase display type, thin rules, and one ice-blue accent. Light follows the OS, and the header toggle overrides it. The home page leads with Aurvane (the autoplaying muted film), then Orbit Code (the clip), Boardroom, the incident commander, and the fine-tuning table, then the time-series model, World Shock Lab, and ATLAS. Motion is a short fade on scroll. Clips stay on a still frame when they are already on screen, and they do not autoplay under `prefers-reduced-motion`. The same tokens cover the home page, the case studies, the Orbit mission page, and the replay console.

The Orbit page has a mission-control scene (`orbit/scene.js`) that replays a saved engine trace from `orbit/replay/traces/`. It opens on the incident-commander traces in `orbit/replay/traces/incident/` (copied from `mission/traces/incident/` in the Orbit repository at 880468f) and keeps the six-role v2 traces and the three-role v1 traces in the same selector. The full console in `orbit/replay/` plays the incident demo first. `orbit/media/incident-commander.gif` is the same clip as `docs/incident-commander.gif` in that repository. Every trace there comes from the scripted harness: a replay, not a model score.

Case-study figures marked `data-video-src=""` are slots for walkthrough videos. Set the attribute to a `.webm` or `.mp4` path and the screenshot becomes a muted, click-to-play video.

## Check

```sh
python3 -m http.server 4173      # preview at http://localhost:4173
python3 scripts/check_site.py    # copy rules, figure binds, pending slots, and internal links
```

The resume link points at `resume/Sherif_Morsi_Resume.pdf`. World Shock Lab's live site is served from the `world-shock-lab` repository at `https://shmorsi.github.io/world-shock-lab/`; do not add a `world-shock-lab/` directory here.
