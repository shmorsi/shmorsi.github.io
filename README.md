# Sherif Morsi

Portfolio of Sherif Morsi, a third-year Computer Science student at Concordia University in Montreal.

**Live:** https://shmorsi.github.io/

The site is the hub. Each project keeps its own repository; this site links to its live page and its code.

| Mission | One line | Live page | Code |
|---|---|---|---|
| 01 TSFM | A forecasting foundation model built from first principles, and the audit that caught a public benchmark corpus leaking its own test data. | [Case study](https://shmorsi.github.io/projects/tsfm.html) | [tsfm-from-scratch](https://github.com/shmorsi/tsfm-from-scratch) |
| 02 World Shock Lab | How a central-bank surprise ripples through 53 markets, with forecasts published before each decision. | [Live site](https://shmorsi.github.io/world-shock-lab/), [case study](https://shmorsi.github.io/projects/world-shock-lab.html) | [world-shock-lab](https://github.com/shmorsi/world-shock-lab) |
| 03 Orbit | AI teams you can audit: agents that plan, act, and refuse to state anything they can't prove. | [Mission page](https://shmorsi.github.io/orbit/) | [orbit-multi-agent](https://github.com/shmorsi/orbit-multi-agent) |
| 04 ATLAS | An economic research terminal that traces how a cost shock travels through the world's production networks. | [Case study](https://shmorsi.github.io/projects/atlas.html) | [atlas](https://github.com/shmorsi/atlas) |

## Update a measured number

Edit **[data/projects.json](data/projects.json)** only. Every page reads its figures from that file, and each figure names the result file it came from. Do not add a number unless it is in the resume or in a committed result file in the project's repository.

Each project has one headline figure (`headline.stat` plus its honest `headline.qualifier`), three short facts (`factIds`), a quiet `caveat`, and two prominent links: `kind: "site"` and `kind: "repo"`.

The home page's mission index and each `data-bind` span also carry the figure as plain text, so the page reads correctly without JavaScript. `scripts/check_site.py` fails if that text drifts from the data.

## Design

Static HTML, one stylesheet (`assets/site.css`), one script (`assets/site.js`), and a self-hosted Inter Tight under the SIL Open Font License. Dark by default; light follows the OS, and the header toggle overrides it. Motion is a single fade on scroll, off under `prefers-reduced-motion`.

The Orbit page has a mission-control scene (`orbit/scene.js`) that replays a saved engine trace from `orbit/replay/traces/`. Stations are laid out from the roles present in the trace, so a trace with more roles needs only a new entry in the `ROLES` map. A recorded clip of it is in `orbit/media/orbit-mission-control.{webm,mp4,gif}` with a poster PNG.

Case-study figures marked `data-video-src=""` are slots for walkthrough videos. Set the attribute to a `.webm` or `.mp4` path and the screenshot becomes a muted, click-to-play video.

## Check

```sh
python3 -m http.server 4173      # preview at http://localhost:4173
python3 scripts/check_site.py    # copy rules, figure binds, and required facts
```

The resume link points at `resume/Sherif_Morsi_Resume.pdf`. World Shock Lab's live site is served from the `world-shock-lab` repository at `https://shmorsi.github.io/world-shock-lab/`; do not add a `world-shock-lab/` directory here.
