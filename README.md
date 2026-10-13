# Sherif Morsi: portfolio

**Live:** https://shmorsi.github.io/

Portfolio of Sherif Morsi, third-year Computer Science student at Concordia University, applying machine learning to economic research, market shocks and financial analysis.

| Project | What it asks | Links |
|---|---|---|
| World Shock Lab | How do Federal Reserve and Bank of Canada surprises move world and Canadian markets? | [Case study](https://shmorsi.github.io/projects/world-shock-lab.html) · [Live site](https://shmorsi.github.io/world-shock-lab/) · [Code](https://github.com/shmorsi/world-shock-lab) |
| ATLAS | How does a cost shock in one industry spread through the global economy? | [Case study](https://shmorsi.github.io/projects/atlas.html) · [Release](https://github.com/shmorsi/atlas/releases/tag/v0.1.2) · [Code](https://github.com/shmorsi/atlas) |

Every project figure on the site comes from that project's published results, including the results that disappointed.

## Editing

A static site with no build step:

- `index.html`: the home page; `projects/*.html`: case studies; `404.html`: not-found page.
- `assets/site.css`: the design system (colour, type and layout tokens at the top); `assets/site.js`: the hero's shock-field animation, the mobile menu, active-section navigation and copy-email.
- `assets/img/*.webp`: screenshots of the real applications; `assets/og.png`: the link-preview image.

Preview locally with `python3 -m http.server 4173` from the repository root, then open http://localhost:4173. Pushing `main` publishes through GitHub Pages.
