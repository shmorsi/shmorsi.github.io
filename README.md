# Sherif Morsi

Portfolio of Sherif Morsi, a third-year Computer Science student at Concordia University in Montreal.

**Live:** https://shmorsi.github.io/

The site is the hub. Each project keeps its own repository; this site links to its live page and its code.

| Order | One line | Live page | Code |
|---|---|---|---|
| 01 Orbit | Autonomous Incident Commander: a scripted demo of a fictional checkout outage, where the auditor refuses a fake root cause. Measured results stay the frozen makerspace test, including the claude-haiku-5-5 API scores. | [Mission page](https://shmorsi.github.io/orbit/) | [orbit-multi-agent](https://github.com/shmorsi/orbit-multi-agent) |
| 02 TSFM | patch_s2 on the test split: CRPS 0.688× upstream AutoARIMA, 95% CI [0.624, 0.757], better. Validation CRPS was 0.605× Seasonal Naive. | [Case study](https://shmorsi.github.io/projects/tsfm.html) | [tsfm-from-scratch](https://github.com/shmorsi/tsfm-from-scratch) |
| 03 World Shock Lab | How a central-bank surprise ripples through 53 markets, with forecasts published before each decision. | [Live site](https://shmorsi.github.io/world-shock-lab/), [case study](https://shmorsi.github.io/projects/world-shock-lab.html) | [world-shock-lab](https://github.com/shmorsi/world-shock-lab) |
| 04 ATLAS | An economic research terminal that traces how a cost shock travels through the world's production networks. | [Case study](https://shmorsi.github.io/projects/atlas.html) | [atlas](https://github.com/shmorsi/atlas) |

## Update a measured number

Do not type a new figure into a page. Every displayed figure is read from **[data/projects.json](data/projects.json)**, and each one names the committed result it came from. `scripts/check_site.py` fails if the visible fallback text drifts from that file.

The project repositories generate their own documents from those result files. Run the generator in the project repository after the result is committed. Copy a figure into `data/projects.json` only when that command printed it from a committed file, and keep the source path on the stat. Do not round it again here.

| Pending result | Committed file, when it exists | Regenerate |
|---|---|---|
| Orbit round table | `orbit-multi-agent` `results/v3_api/<model>/team_v3.json` (`make score-v3`) | `python -m orbit_agents.eval.readme` |
| Orbit T4 distill | `results/v3_qwen1.5b/team_distill.json` | same command, once that file is a measured model eval |
| Orbit Qwen harness v3 rescores | `results/v3_qwen1.5b/single_base.json`, `team_base.json`, `team_lora.json` | same command |
| World Shock Lab decision scores | `world-shock-lab` `live/scores/` for the published forecasts | `uv run wsl report docs` |
| TSFM distillation | none on `tsfm-from-scratch` main | do not invent one |

`tsfm-from-scratch` has no distillation result and no distillation template on `main`. Its `scripts/make_portfolio_page.py` writes an older page layout. Do not point that script at this site.

The claude-haiku-5-5 v1 and v2 API scores are measured in `results/v3_api/claude-haiku-5-5/`. The patch_s2 test score is measured in `results/analysis/headline.json`. Until a pending file exists, the site leaves that slot empty: Orbit says "Not yet scored" and the World Shock Lab live score says "Pending" with no track record. A missing file stays missing. The generators do not invent one.

Each project has one headline figure (`headline.stat` plus its honest `headline.qualifier`), three short facts (`factIds`), a quiet `caveat`, and two prominent links: `kind: "site"` and `kind: "repo"`.

The home page's mission index and each `data-bind` span also carry the figure as plain text, so the page reads correctly without JavaScript. `scripts/check_site.py` fails if that text drifts from the data.

## Design

Static HTML, one stylesheet (`assets/site.css`), one script (`assets/site.js`), and a self-hosted Inter Tight under the SIL Open Font License. No third-party font request. Pure black by default, with tracked uppercase display type, thin rules, and one ice-blue accent. Light follows the OS, and the header toggle overrides it. The home page leads with Orbit: a code-drawn planner / worker / critic schematic, then the time-series model, World Shock Lab, and ATLAS. `data/projects.json` still stores its own mission codes; the page order is presentation only. Motion is a fade on scroll plus one packet on the Orbit schematic, both off under `prefers-reduced-motion`. The same tokens cover the home page, the case studies, the Orbit mission page, and the replay console.

The Orbit page has a mission-control scene (`orbit/scene.js`) that replays a saved engine trace from `orbit/replay/traces/`. It opens on the incident-commander traces in `orbit/replay/traces/incident/` (copied from `mission/traces/incident/` in the Orbit repository at 880468f) and keeps the six-role v2 traces and the three-role v1 traces in the same selector. The full console in `orbit/replay/` plays the incident demo first. `orbit/media/incident-commander.gif` is the same clip as `docs/incident-commander.gif` in that repository. Every trace there comes from the scripted harness: a replay, not a model score.

Case-study figures marked `data-video-src=""` are slots for walkthrough videos. Set the attribute to a `.webm` or `.mp4` path and the screenshot becomes a muted, click-to-play video.

## Check

```sh
python3 -m http.server 4173      # preview at http://localhost:4173
python3 scripts/check_site.py    # copy rules, figure binds, pending slots, and internal links
```

The resume link points at `resume/Sherif_Morsi_Resume.pdf`. World Shock Lab's live site is served from the `world-shock-lab` repository at `https://shmorsi.github.io/world-shock-lab/`; do not add a `world-shock-lab/` directory here.
