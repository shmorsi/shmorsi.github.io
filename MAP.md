# Map of everything

One page to keep track of the whole thing: what lives where, what happens by itself, and what waits for you.

## The five repositories

| Repository | What it is | Where it shows on the site | What the site reads from it |
|---|---|---|---|
| `shmorsi.github.io` | The website itself | Every page | Its own `data/projects.json`, pages and scripts |
| `deep-portfolio-constructor` | The flagship: three studies of AI for long-term investing | Portfolio page, Pension page, and the risk section of the forecasting page | `reports/site_wealth.json`, `reports/pension/site_pension.json`, `reports/risk/site_risk.json` |
| `tsfm-from-scratch` | The forecasting model built from scratch | Forecasting (TSFM) page | The numbers its page cites, checked against `results/analysis/headline.json` |
| `world-shock-lab` | Central-bank shocks and live forecasts | Shock Lab page and the app at `/shock-lab/` | The built app (`web/dist`) and the score files in `live/scores/` |
| `aurvane` | The trust layer for AI agents | Aurvane page at `/aurvane/` | Its built page `ui/site/index.html` and two benchmark summaries |

## How a change reaches the live site

1. The change is made in the project's own repository, on a working branch, and proposed as a pull request.
2. You merge that pull request. The project's `main` now has it.
3. On the website repository, `python3 scripts/sync_all.py` copies what changed, rebuilds the pages and checks everything. That is proposed as a second pull request.
4. You merge that one. About a minute later the live site shows it.

`main` is always what is live. Nothing reaches the site without a merge.

## What runs by itself

| What | Where | When |
|---|---|---|
| Checks on every pull request (tests, site rules, layout at 14 screen sizes) | Each repository's Actions tab | On every push |
| Sync of the site with every project | Website repository, "Sync projects" | Daily; opens a pull request named `auto/sync-projects` when something changed |
| Live forecasts before each central-bank decision, and their scores after | `world-shock-lab`, "live" | Weekdays |
| Publishing the site | Website repository, "pages build and deployment" | After every merge to `main` |

## What only you can do

| What | Where | By when |
|---|---|---|
| Merge pull requests | The "Merge pull request" button on each one | When you like what you see |
| Add the `FRED_API_KEY` secret | `world-shock-lab` → Settings → Secrets and variables → Actions | Before November 29 (the December 9 forecasts publish from then) |
| Add the `ANTHROPIC_API_KEY` secret and run "real-model benchmark" | `aurvane` → Settings → Secrets, then Actions | Any time; capped at 5 USD |
| Let the daily sync open its pull request | Website repository → Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" | Once |
| Run the strong forecasting model on the two market studies | Colab, with the weights on your Drive | Any time |
| Profile bio, pinned repositories, repository descriptions | GitHub profile and each repository's "About" | Once |

## Branches

- `main`: the real one in every repository. The website shows whatever is on the website repository's `main`.
- `feature/friendly-hamilton-dspd7f`: the working branch that open pull requests come from. Leave it.
- Tags such as `prereg-v1` and `protocol-v4` mark the moment a test was fixed in advance. Never delete those.

### Old branches that can go

Every one was checked: seven are already fully inside `main`, the other ten are October drafts that later work replaced, and no document cites a commit that lives only on them. To delete one: open the repository's branches page and press the bin icon next to it.

| Repository | Branches page | Branches to delete |
|---|---|---|
| Website | https://github.com/shmorsi/shmorsi.github.io/branches | `claude/fix-everything`, `cursor/portfolio-mission-control-ea96`, `cursor/spacex-portfolio-pass-8796`, `feature/elegant-goldberg-tv9zhr`, `feature/modest-meitner-d1b93p`, `wealth-study` |
| Portfolio | https://github.com/shmorsi/deep-portfolio-constructor/branches | `feature/modest-meitner-d1b93p`, `wealth-study` |
| Forecasting model | https://github.com/shmorsi/tsfm-from-scratch/branches | `cursor/harvest-patch-s2-test-318e`, `cursor/readme-recruiter-polish-2a32`, `feature/elegant-goldberg-tv9zhr` |
| Shock Lab | https://github.com/shmorsi/world-shock-lab/branches | `cursor/landing-perfection-0b07`, `feature/elegant-goldberg-tv9zhr`, `feature/modest-meitner-d1b93p` |
| Aurvane | https://github.com/shmorsi/aurvane/branches | `feature/elegant-goldberg-tv9zhr`, `feature/modest-meitner-d1b93p`, `meta-hackathon` |

Once they are gone, this section can be deleted too.

## Going back

Every merged pull request has a "Revert" button. Pressing it opens a new pull request that undoes that one; merging it puts things back.

## Words

- **Commit**: a saved snapshot with a note.
- **Branch**: a separate copy to work in, so `main` stays untouched.
- **Pull request**: a proposal to put a branch's changes into `main`, with the checks run on it.
- **Merge**: accepting the proposal.
