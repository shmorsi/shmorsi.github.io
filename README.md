# Sherif Morsi

**Live:** https://shmorsi.github.io/

Portfolio of Sherif Morsi, a third-year Computer Science student at Concordia University. The site is static and deploys on GitHub Pages.

| Mission | Question | Links |
|---|---|---|
| 01 — TSFM | Can a small transformer, pretrained from scratch, forecast series it has not seen? | [Case study](https://shmorsi.github.io/projects/tsfm.html) · [Code](https://github.com/shmorsi/tsfm-from-scratch) |
| 02 — World Shock Lab | How do Federal Reserve and Bank of Canada surprises move markets? | [Case study](https://shmorsi.github.io/projects/world-shock-lab.html) · [Live site](https://shmorsi.github.io/world-shock-lab/) · [Code](https://github.com/shmorsi/world-shock-lab) |
| 03 — Macro Analyst Agent | Placeholder. Repository link pending. No measured results yet. | [Status](https://shmorsi.github.io/projects/macro-analyst-agent.html) |
| 04 — ATLAS | How does a cost shock spread through a production network? | [Case study](https://shmorsi.github.io/projects/atlas.html) · [Code](https://github.com/shmorsi/atlas) |

## Update a measured number

Edit **[data/projects.json](data/projects.json)** only. The home page and the case studies read every figure from that file. Do not add a number unless it is in the resume or in a committed result file. The Macro Analyst Agent record stays empty until its repository publishes results.

The resume link points at `resume/Sherif_Morsi_Resume.pdf`, the current one-page resume.

World Shock Lab's live site is served from the `world-shock-lab` repository at `https://shmorsi.github.io/world-shock-lab/`. Do not add a `world-shock-lab/` directory to this repo.

Preview with `python3 -m http.server 4173`. Check copy rules with `python3 scripts/check_site.py`.
