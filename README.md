# Sherif Morsi — portfolio

**Live:** https://shmorsi.github.io/

Portfolio of Sherif Morsi, Computer Science student at Concordia University, featuring four research projects at the intersection of machine learning and finance:

| Project | What it asks | Links |
|---|---|---|
| World Shock Lab | How do Federal Reserve and Bank of Canada surprises move world and Canadian markets? | [Case study](https://shmorsi.github.io/projects/world-shock-lab.html) · [Live site](https://shmorsi.github.io/world-shock-lab/) · [Code](https://github.com/shmorsi/world-shock-lab) |
| Earnings Lens | Which sentences in an earnings release move the stock? | [Case study](https://shmorsi.github.io/projects/earnings-lens.html) · [Live demo](https://shmorsi.github.io/earnings-lens/) · [Code](https://github.com/shmorsi/earnings-lens) |
| Shock Lab | What does a macro shock do to a portfolio, and which portfolio limits the damage? | [Case study](https://shmorsi.github.io/projects/shocklab.html) · [Live demo](https://shmorsi.github.io/shocklab/) · [Code](https://github.com/shmorsi/shocklab) |
| ATLAS | How does a cost shock in one industry spread through the global economy? | [Case study](https://shmorsi.github.io/projects/atlas.html) · [Release](https://github.com/shmorsi/atlas/releases/tag/v0.1.2) · [Code](https://github.com/shmorsi/atlas) |

Every figure on the site comes from the linked project's published results, including the results that disappointed.

## Editing

A static site with no build step:

- `index.html`: the home page; `projects/*.html`: case studies; `404.html`: not-found page.
- `assets/site.css`: the design system (colour, type and layout tokens at the top); `assets/site.js`: the hero's shock-field animation, the mobile menu, active-section navigation and copy-email.
- `assets/img/*.webp`: screenshots of the real applications; `assets/og.png`: the link-preview image.

Preview locally with `python3 -m http.server 4173` from the repository root, then open http://localhost:4173. Pushing `main` publishes through GitHub Pages.
