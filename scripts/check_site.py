#!/usr/bin/env python3
"""Fail if the portfolio states a title or claim it must not, or if a figure bind is broken."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "projects.json").read_text())
TEXT_PATHS = [
    *ROOT.glob("*.html"),
    *ROOT.glob("*.md"),
    *ROOT.glob("projects/*.html"),
    ROOT / "assets" / "site.js",
    ROOT / "data" / "projects.json",
]

FORBIDDEN = [
    r"software engineer",
    r"\bml engineer\b",
    r"machine learning engineer",
    r"full-stack engineer",
    r"research engineer",
    r"ai engineering",
    r"fluent in french",
    r"french \(fluent\)",
    r"\baws\b",
    r"amazon web services",
    r"\bjira\b",
    r"production deployment",
    r"deployed to production",
    r"beat a published",
    r"beats a published",
    r"beat timesfm",
    r"better than timesfm",
    r"outperformed",
    r"github\.com/shmorsi/shocklab\b",
]

errors: list[str] = []

# The lab's app lives at shock-lab/. world-shock-lab/ is its old address: only a page that forwards there.
if sorted(f.name for f in (ROOT / "world-shock-lab").glob("*")) != ["index.html"] or "../shock-lab/" not in (ROOT / "world-shock-lab" / "index.html").read_text():
    errors.append("world-shock-lab/ must hold only index.html, forwarding to ../shock-lab/")

projects = {project["id"]: project for project in DATA["projects"]}
if "macro-analyst-agent" in projects:
    errors.append("macro-analyst-agent must not be listed on the site")
if (ROOT / "projects" / "macro-analyst-agent.html").exists():
    errors.append("projects/macro-analyst-agent.html must not be served")

for project in DATA["projects"]:
    stats = project.get("stats") or {}
    for key, stat in stats.items():
        for field in ("label", "display", "source"):
            if not str(stat.get(field, "")).strip():
                errors.append(f"{project['id']}.stats.{key} is missing {field}")
    headline = project.get("headline") or {}
    if project.get("role") == "featured":
        if headline.get("stat") not in stats:
            errors.append(f"{project['id']} headline.stat must name one stat")
        if not str(headline.get("qualifier", "")).strip():
            errors.append(f"{project['id']} headline needs its honest qualifier")
        if not str(project.get("purpose", "")).strip():
            errors.append(f"{project['id']} needs a one-line purpose")
        kinds = [link.get("kind") for link in project.get("links") or []]
        if "site" not in kinds or "repo" not in kinds:
            errors.append(f"{project['id']} needs a site link and a repo link")
    for key in project.get("factIds") or []:
        if key not in stats:
            errors.append(f"{project['id']} factIds references missing stat {key}")
    for key in project.get("glanceIds") or []:
        if key not in stats:
            errors.append(f"{project['id']} glanceIds references missing stat {key}")
    for name, table in (project.get("tables") or {}).items():
        if not table.get("rows") or not table.get("source"):
            errors.append(f"{project['id']}.tables.{name} needs rows and a source")

bind_re = re.compile(r'data-(?:bind|table)="([^"]+)"')
html_files = list(ROOT.glob("*.html")) + list((ROOT / "projects").glob("*.html"))
html_files.append(ROOT / "aurvane" / "index.html")   # a project page like the others; its demo is built in the aurvane repository
for path in html_files:
    text = path.read_text()
    for raw in bind_re.findall(text):
        project_id, _, rest = raw.partition(".")
        cursor = projects.get(project_id)
        if cursor is None:
            errors.append(f"{path.name} bind {raw} has unknown project")
            continue
        for part in rest.split("."):
            if isinstance(cursor, dict) and part in cursor:
                cursor = cursor[part]
            else:
                errors.append(f"{path.name} bind {raw} does not resolve")
                break
    for glance in re.findall(r'data-glance="([^"]+)"', text):
        if glance not in projects:
            errors.append(f"{path.name} glance {glance} is unknown")

for path in TEXT_PATHS:
    if not path.exists():
        continue
    lowered = path.read_text(encoding="utf-8").lower()
    for pattern in FORBIDDEN:
        if re.search(pattern, lowered):
            errors.append(f"{path.relative_to(ROOT)} matches forbidden pattern /{pattern}/")

resume_pdf = ROOT / "resume" / "Sherif_Morsi_Resume.pdf"
resume_bytes = resume_pdf.read_bytes() if resume_pdf.exists() else b""
if not resume_bytes.startswith(b"%PDF"):
    errors.append("resume/Sherif_Morsi_Resume.pdf is missing or is not a PDF")
if b"PLACEHOLDER" in resume_bytes:
    errors.append("resume PDF is still a placeholder")
if "The resume PDF is a placeholder." in (ROOT / "index.html").read_text(encoding="utf-8"):
    errors.append("hero still says the resume PDF is a placeholder")

for path in [*html_files, ROOT / "README.md", ROOT / "sitemap.xml", ROOT / "data" / "projects.json"]:
    if not path.exists():
        continue
    page = path.read_text(encoding="utf-8")
    if re.search(r"macro-analyst-agent|Macro Analyst", page):
        errors.append(f"{path.relative_to(ROOT)} still mentions the Macro Analyst Agent")

# Facts that must stay true, and stale ones that must not come back.
tsfm = projects.get("tsfm", {})
if "test split was not scored" in json.dumps(tsfm).lower():
    errors.append("tsfm must not say the test split was not scored; the CPU model was scored once")
for needle in ("833,440", "1.109", "1.217", "no detectable difference", "worse"):
    if needle not in tsfm.get("caveat", ""):
        errors.append(f"tsfm caveat must state {needle!r} for the test-scored CPU model")
tsfm_caveat = tsfm.get("caveat", "")
for needle in ("0.688", "0.624", "0.757", "patch_s2", "better"):
    if needle not in tsfm_caveat:
        errors.append(f"tsfm caveat must state the patch_s2 test headline {needle!r}")
if "no test score" in tsfm_caveat.lower() or "test pending" in tsfm_caveat.lower():
    errors.append("tsfm caveat must not say the patch_s2 test is pending or unscored")
for path in html_files:
    page = path.read_text(encoding="utf-8")
    if "devpost" in page.lower():
        errors.append(f"{path.relative_to(ROOT)} links Devpost; that profile is empty")
home = (ROOT / "index.html").read_text(encoding="utf-8")
if "Trained in agentic AI for intent-based 5G network slicing (Amazon Bedrock)." not in home:
    errors.append("Nokia role must keep the agentic AI training line")
# The home telemetry strip repeats each headline figure for no-JS readers; it must match the data.
for pid, project in projects.items():
    if project.get("role") != "featured":
        continue
    stat = project["stats"][project["headline"]["stat"]]
    block = re.search(rf'data-headline="{re.escape(pid)}".*?</li>', home, re.S)
    if not block:
        errors.append(f"index.html telemetry strip is missing {pid}")
    elif stat["display"] not in block.group(0) or stat["label"] not in block.group(0):
        errors.append(f"index.html telemetry strip for {pid} does not match data/projects.json")
# data-bind fallback text must match the data it binds.
for path in html_files:
    page = path.read_text(encoding="utf-8")
    for raw, shown in re.findall(r'data-bind="([^"]+)">([^<]*)<', page):
        project_id, _, rest = raw.partition(".")
        cursor = projects.get(project_id)
        for part in rest.split("."):
            cursor = cursor.get(part) if isinstance(cursor, dict) else None
        if shown and cursor is not None and shown != str(cursor):
            errors.append(f"{path.relative_to(ROOT)} bind {raw} shows {shown!r} but data says {cursor!r}")
sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
for loc in ("projects/deep-portfolio-constructor.html", "projects/pension-lab.html", "projects/tsfm.html", "projects/world-shock-lab.html", "shock-lab/", "aurvane/"):
    if f"https://shmorsi.github.io/{loc}</loc>" not in sitemap:
        errors.append(f"sitemap.xml is missing {loc}")

# The lab's app (shock-lab/, built in the world-shock-lab repository) is a section of this site: it carries this
# site's header and stands on this site's page. Its header must list the projects in this site's order, and
# its page colours, width and gutter must be this site's values in both themes, so nothing shifts or changes
# shade when a reader moves between a project page and the lab.
def _tokens(css: str, light: bool) -> dict[str, str]:
    """The custom properties of the first :root block (or the light-theme one), with spelling differences removed."""
    m = re.search(r':root\[data-theme="?light"?\]\s*\{([^}]*)\}' if light else r":root\s*\{([^}]*)\}", css)
    out = {}
    for name, value in re.findall(r"(--[\w-]+)\s*:\s*([^;]+)", m.group(1) if m else ""):
        value = re.sub(r"\s+", "", value.lower())
        value = re.sub(r"(?<![\d.])0\.", ".", value)                                  # 0.3 and .3 are one number
        value = re.sub(r"^#([0-9a-f])([0-9a-f])([0-9a-f])$", r"#\1\1\2\2\3\3", value)  # #000 and #000000 are one colour
        out[name] = value
    return out


_lab = ROOT / "shock-lab" / "assets"
_lab_js = "".join(f.read_text(errors="ignore") for f in sorted(_lab.glob("index-*.js")))
_lab_css = "".join(f.read_text(errors="ignore") for f in sorted(_lab.glob("*.css")))
_site_css = (ROOT / "assets" / "site.css").read_text()
_order = [p["id"] for p in DATA["projects"]]
_href = {"deep-portfolio-constructor": "../projects/deep-portfolio-constructor.html", "pension-lab": "../projects/pension-lab.html",
         "world-shock-lab": "../projects/world-shock-lab.html", "tsfm": "../projects/tsfm.html", "aurvane": "../aurvane/"}
_at = [_lab_js.find(f'"{_href[pid]}"') for pid in _order]
if -1 in _at or _at != sorted(_at):
    errors.append("shock-lab/: the app's header does not list the projects in this site's order "
                  "(SITE in world-shock-lab web/src/App.tsx; rebuild there, then scripts/sync_all.py)")
_same = {"--bg": "--bg", "--surface": "--surface", "--surface-2": "--surface-2", "--ink": "--ink", "--muted": "--muted",
         "--line": "--line", "--line-strong": "--line-2", "--accent": "--accent", "--max": "--max", "--gutter": "--gutter"}
for _light in (False, True):
    _mine, _labs = _tokens(_site_css, _light), _tokens(_lab_css, _light)
    for _name, _theirs in _same.items():
        if _name in _mine and _labs.get(_theirs) != _mine[_name]:
            errors.append(f"shock-lab/: {'light' if _light else 'dark'} {_theirs} is {_labs.get(_theirs)!r} but this site's {_name} is {_mine[_name]!r} "
                          "(web/src/styles.css in world-shock-lab)")

# The route down the right edge names each stop by its role in the story. On a project page those names come from
# assets/site.js, so they must be the roles scripts/stories.py gives the chapters, in the same order.
_roles = re.search(r"const ROLES = \[([^\]]*)\];", (ROOT / "assets" / "site.js").read_text())
sys.path.insert(0, str(ROOT / "scripts"))
import stories as _stories  # noqa: E402
_want = [_stories.ROLE[p["id"]] for p in DATA["projects"]]
if not _roles or re.findall(r'"([^"]+)"', _roles.group(1)) != _want:
    errors.append(f"assets/site.js ROLES must list the chapters' roles in order: {_want} (scripts/stories.py ROLE)")

# The live-score slot is written by scripts/sync_wsl_live.py from the project's score files. With no
# score it stays empty and shows no number; with scores every figure in it is a bind to the counts in
# data/projects.json, and it has to say that two decisions are not a track record.
wsl_page = (ROOT / "projects" / "world-shock-lab.html").read_text(encoding="utf-8")
wsl_stats = projects.get("world-shock-lab", {}).get("stats", {})
wsl_block = re.search(r"<!-- live-score:start.*?<!-- live-score:end -->", wsl_page, re.S)
if not wsl_block or 'data-slot="wsl-live-score"' not in wsl_block.group(0):
    errors.append("world-shock-lab page must keep its live-score slot between the live-score markers")
else:
    wsl_text = re.sub(r"<[^>]+>", " ", wsl_block.group(0))
    wsl_loose = re.sub(r"<span data-bind=[^>]*>.*?</span>", " ", wsl_block.group(0), flags=re.S)
    wsl_loose = re.sub(r"<[^>]+>", " ", wsl_loose).replace("68%", " ").replace("90%", " ")
    if "liveDecisions" in wsl_stats:
        if "No decision has been scored" in wsl_text or "not a track record" not in wsl_text or "not filled in by hand" not in wsl_text:
            errors.append("world-shock-lab live-score slot must show the scores, say they are not a track record, and say they are not typed by hand")
        if "liveScores" not in projects["world-shock-lab"].get("tables", {}) or 'data-table="world-shock-lab.tables.liveScores"' not in wsl_block.group(0):
            errors.append("world-shock-lab live-score slot must show the per-decision table from data/projects.json")
        if re.search(r"\d", wsl_loose):
            errors.append("world-shock-lab live-score slot must not state a figure outside a data-bind")
    else:
        if "No decision has been scored" not in wsl_text or re.search(r"\d", wsl_loose):
            errors.append("world-shock-lab live-score slot must stay empty, with no number, until a decision is scored")
tsfm_page = (ROOT / "projects" / "tsfm.html").read_text(encoding="utf-8")
# The risk study's section is written by scripts/sync_risk.py from deep-portfolio-constructor's export.
# It must be there once the figures are, say when the rule was fixed, and say so for a checkpoint that was not run.
risk_block = re.search(r"<!-- risk:start.*?<!-- risk:end -->", tsfm_page, re.S)
tsfm_stats = tsfm.get("stats", {})
if not risk_block:
    errors.append("tsfm page must keep the risk markers")
elif "riskMonths" in tsfm_stats:
    risk_text = re.sub(r"<[^>]+>", " ", risk_block.group(0))
    if 'id="s-risk"' not in risk_block.group(0) or "committed before any forecast was scored" not in risk_text:
        errors.append("tsfm page must show the risk study and say its rule was committed before any forecast was scored")
    for table in ("riskAccuracy", "riskPortfolio"):
        if table not in tsfm.get("tables", {}) or f'data-table="tsfm.tables.{table}"' not in risk_block.group(0):
            errors.append(f"tsfm page must show the risk study's {table} table from data/projects.json")
    for sfx in ("CpuS0", "PatchS2"):
        status = tsfm_stats.get(f"riskStatus{sfx}", {}).get("display")
        if status == "run" and f"tsfm.stats.riskWqlVerdictFt{sfx}.display" not in risk_block.group(0):
            errors.append(f"tsfm risk section must state the pre-registered verdict for {sfx}")
        if status != "run" and "has not been run on this test" not in risk_text:
            errors.append(f"tsfm risk section must say that {sfx} has not been run")
tsfm_slot = re.search(r'data-slot="tsfm-patch-test"[^>]*>(.*?)</div>', tsfm_page, re.S)
tsfm_slot_text = re.sub(r"<[^>]+>", " ", tsfm_slot.group(1)) if tsfm_slot else ""
if not tsfm_slot or "0.688" not in tsfm_slot_text or "Not scored" in tsfm_slot_text:
    errors.append("tsfm headline test slot must show the measured 0.688 test figure")
tsfm_distill = re.search(r'data-slot="tsfm-distill"[^>]*>(.*?)</div>', tsfm_page, re.S)
if not tsfm_distill or "Not scored" not in tsfm_distill.group(1) or re.search(r"\d", re.sub(r"<[^>]+>", " ", tsfm_distill.group(1))):
    errors.append("tsfm distillation slot must say 'Not scored' and must not show a number")
# Internal links, image alts, and the tags a shared link needs.
meta_needles = (
    "<title>",
    'name="description"',
    'name="viewport"',
    'rel="canonical"',
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'property="og:url"',
    'name="twitter:card"',
)
for path in html_files:
    page = path.read_text(encoding="utf-8")
    if path.name != "404.html":
        for needle in meta_needles:
            if needle not in page:
                errors.append(f"{path.relative_to(ROOT)} is missing {needle}")
        if not re.search(r"<h1[\s>]", page):
            errors.append(f"{path.relative_to(ROOT)} is missing an h1")
    for tag in re.findall(r"<img\b[^>]*>", page, re.I):
        if not re.search(r"\balt=", tag, re.I):
            errors.append(f"{path.relative_to(ROOT)} has an img without alt")
    for raw in re.findall(r'''(?:href|src)="([^"]+)"''', page):
        if raw.startswith(("mailto:", "tel:", "data:", "javascript:", "http://", "https://")):
            continue
        url, _, frag = raw.partition("#")
        url = url.split("?", 1)[0]
        if url.startswith("/"):
            target = (ROOT / url.lstrip("/")).resolve()
        elif url == "":
            target = path.resolve()
        else:
            target = (path.parent / url).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            errors.append(f"{path.relative_to(ROOT)} link {raw} leaves the site")
            continue
        if target.is_dir():
            target = target / "index.html"
        if not target.is_file():
            errors.append(f"{path.relative_to(ROOT)} link {raw} does not resolve")
            continue
        if frag.startswith("/"):                      # a view inside the lab's app (shock-lab/#/map), not an id
            continue
        if frag and target.suffix == ".html" and f'id="{frag}"' not in target.read_text(encoding="utf-8"):
            errors.append(f"{path.relative_to(ROOT)} link {raw} has no matching id")

for css_path in ROOT.rglob("*.css"):
    for raw in re.findall(r"url\(\s*([^)]+?)\s*\)", css_path.read_text(encoding="utf-8")):
        ref = raw.strip("\"'")
        if ref.startswith(("data:", "http://", "https://")):
            continue
        target = (css_path.parent / ref).resolve()
        if not target.is_file():
            errors.append(f"{css_path.relative_to(ROOT)} url {ref} does not resolve")

for project in DATA["projects"]:
    if project.get("role") == "featured" and not str(project.get("proves", "")).strip():
        errors.append(f"{project['id']} needs a skimmable proves line")
    proves = project.get("proves", "")
    if proves and proves not in home:
        errors.append(f"index.html is missing the proves line for {project['id']}")

if "prefers-reduced-motion" not in (ROOT / "assets" / "site.css").read_text(encoding="utf-8"):
    errors.append("stylesheet must respect prefers-reduced-motion")
# How it learned: the training view covers every network in the copied logs, and its caption keeps the honesty line.
_wealth = json.loads((ROOT / "data" / "dpc_wealth.json").read_text())
_train = _wealth.get("training")
if _train:
    _n = sum(len(_train["curves"][r]) for r in _train["refits"])
    _dpc = projects.get("deep-portfolio-constructor", {}).get("stats", {})
    if _dpc.get("trainNetworks", {}).get("display") != str(_n):
        errors.append(f"deep-portfolio-constructor.stats.trainNetworks must be {_n}, the networks in data/dpc_wealth.json")
    _page = (ROOT / "projects" / "deep-portfolio-constructor.html").read_text(encoding="utf-8")
    if 'id="s-learn"' not in _page or _page.count("data-train=") != len(_train["refits"]):
        errors.append("projects/deep-portfolio-constructor.html must show 'How it learned' with one button per refit")
    if "so they flatter the network" not in _page:
        errors.append("the training view must say validation scores flatter the network")

# Aurvane: displayed figures match the copied summary, and the page says they are simulated.
aurvane = projects.get("aurvane")
asum_path = ROOT / "data" / "measurements" / "aurvane" / "worst-case_summary.json"
if aurvane is None or aurvane.get("role") != "featured":
    errors.append("Aurvane must be a featured project")
elif not asum_path.exists():
    errors.append("data/measurements/aurvane/worst-case_summary.json is missing")
else:
    asum = json.loads(asum_path.read_text())
    on, off = asum["with_aurvane"], asum["without_aurvane"]
    want = {
        "attacksWith": f"{on['attacks_landed']} of {on['poisoned_tasks']}",
        "attacksWithout": f"{off['attacks_landed']} of {off['poisoned_tasks']}",
        "lossWith": f"{on['money_lost_cad']:,.0f} CAD",
        "cleanDone": f"{on['clean_completed']} of {on['clean_tasks']}",
        "falseAlarms": str(on["clean_friction_events"]),
    }
    for key, display in want.items():
        if aurvane["stats"][key]["display"] != display:
            errors.append(f"aurvane.stats.{key} shows {aurvane['stats'][key]['display']!r} but the summary says {display!r}")
    caveat = aurvane.get("caveat", "").lower()
    for needle in ("simulated", "worst-case", "have not been run"):
        if needle not in caveat:
            errors.append(f"aurvane caveat must state {needle!r}")
    if not (ROOT / "aurvane" / "index.html").is_file() or not (ROOT / "aurvane" / "media" / "aurvane-demo.mp4").is_file():
        errors.append("aurvane/ needs index.html and media/aurvane-demo.mp4")
    rt_path = ROOT / "data" / "measurements" / "aurvane" / "redteam_summary.json"
    if rt_path.exists():
        rt = json.loads(rt_path.read_text())
        phrase = f"{rt['attacks']} smarter attacks: {rt['contained']} contained, {rt['capped']} capped by the budget, {rt['gets through']} get through"
        if phrase not in aurvane.get("summary", ""):
            errors.append("aurvane summary must quote the red-team counts from redteam_summary.json")
    # Aurvane's page is a page of this site. The aurvane repository builds the demo; scripts/sync_chrome.py writes what
    # every project page shares. So it must load this site's stylesheet and script, bring no palette or font of its
    # own (it would stop following the theme, and stop looking like the other pages), and be dressed.
    av_page = (ROOT / "aurvane" / "index.html").read_text(encoding="utf-8")
    for needed in ('href="../assets/site.css', 'src="../assets/site.js', '<header class="cs-hero wrap has-scene">', "data-plain", "data-cs-scene",
                   "data-subnav", 'class="project-switch"', 'data-glance="aurvane"', 'id="roomBox"'):
        if needed not in av_page:
            errors.append(f"aurvane/index.html is not this site's project page: it has no {needed} (run scripts/sync_aurvane.py on the aurvane build)")
    av_style = "".join(re.findall(r"<style>(.*?)</style>", av_page, flags=re.S))
    av_style = re.sub(r":where\(\.av\) \.room \{.*?\}", "", av_style, flags=re.S)   # the replay is a dark screen in both themes
    for token in ("--bg:", "--ink:", "--muted:", "--accent:", "--surface:", "--line:", "--font:", "@font-face"):
        if token in av_style:
            errors.append(f"aurvane/index.html defines {token} itself; it must use this site's tokens (assets/site.css)")
    sys.path.insert(0, str(ROOT / "scripts"))
    import sync_chrome as _chrome  # noqa: E402
    try:
        _dressed = _chrome.dress(av_page, "../", "aurvane/", False)
    except SystemExit as exc:   # not a project page of this site at all
        _dressed = av_page
        errors.append(f"aurvane/index.html cannot take this site's header and label: {exc}")
    if _dressed != av_page:
        errors.append("aurvane/index.html does not carry this site's current header, label, picture or links (run scripts/sync_chrome.py)")
    quote = f"attacks that landed fell from {off['attacks_landed']} of {off['poisoned_tasks']} to {on['attacks_landed']} of {on['poisoned_tasks']}"
    if quote not in av_page:
        errors.append("aurvane/index.html does not quote the copied benchmark summary (sync the page and the summaries from the same aurvane commit)")
    # The old URL stays alive as a tiny redirect; nothing else may carry the old name.
    old = ROOT / "glass" / "index.html"
    if not old.is_file() or "../aurvane/" not in old.read_text():
        errors.append("glass/index.html must redirect to ../aurvane/")
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix in {".html", ".js", ".json", ".css", ".xml", ".md"} and ".git" not in path.parts \
                and path != old and path.name != "check_site.py" and re.search(r"\bglass\b", path.read_text(errors="ignore"), re.I):
            errors.append(f"{path.relative_to(ROOT)} still uses the project's old name")

# Deep Portfolio Constructor: every figure comes from the project's committed export, and the limits stay stated.
dpc = projects.get("deep-portfolio-constructor")
if dpc is None or not (ROOT / "projects" / "deep-portfolio-constructor.html").exists():
    errors.append("Deep Portfolio Constructor needs its project entry and projects/deep-portfolio-constructor.html")
else:
    for key, stat in dpc["stats"].items():
        if not stat["source"].startswith("deep-portfolio-constructor reports/"):
            errors.append(f"deep-portfolio-constructor.stats.{key} must cite the project's committed reports/ file")
    verdict = dpc["stats"].get("vsMktVerdictDeep", {}).get("display")
    if verdict not in ("better", "worse", "no detectable difference"):
        errors.append("the network's verdict against the market must be one of the protocol's three")
    caveat = dpc.get("caveat", "")
    for needle in ("pre-registered", "long-only", "survivorship", "not funds", "found later", "US data only", f"the verdict is {verdict}"):
        if needle not in caveat:
            errors.append(f"deep-portfolio-constructor caveat must state {needle!r}")
    proves = dpc.get("proves", "")
    reading = {"better": "better by the pre-registered test", "worse": "worse by the pre-registered test"}.get(verdict, "cannot tell from luck")
    if reading not in proves:
        errors.append(f"deep-portfolio-constructor proves line must state the pre-registered verdict ({reading!r})")
    if verdict != "better" and re.search(r"\bbetter\b|significan|\bbeats?\b", proves):
        errors.append("deep-portfolio-constructor proves line must not claim an edge the pre-registered test did not find")
    if re.search(r"\bshort(?:s|ing|ed)?\b|long-short|market-neutral", " ".join([dpc["purpose"], dpc["summary"], proves])):
        errors.append("deep-portfolio-constructor is a long-only study: no shorting language in its purpose, summary or proves line")

# Project marks exist for every project, and no page links to a repository visitors cannot open.
for project in DATA["projects"]:
    if not (ROOT / "assets" / "marks" / f"{project['id']}.svg").is_file():
        errors.append(f"missing project mark assets/marks/{project['id']}.svg (run scripts/make_marks.py)")
    for link in project.get("links") or []:
        if link.get("public") is False:
            repo = link["href"].rstrip("/")
            for path in html_files:
                if re.search(r'href="' + re.escape(repo) + r'(?:/[^"]*)?"', path.read_text(encoding="utf-8")):
                    errors.append(f"{path.relative_to(ROOT)} links {repo}, which is marked private (run scripts/sync_chrome.py)")

# Retired projects (Orbit, ATLAS): their repositories were deleted, so nothing on the site may name or link them.
# aurvane/index.html is built elsewhere and only mentions an unrelated fictional company.
for path in ROOT.rglob("*"):
    if not path.is_file() or ".git" in path.parts or path.suffix not in {".html", ".js", ".json", ".css", ".xml", ".md"}:
        continue
    if path.name == "check_site.py" or path.is_relative_to(ROOT / "aurvane"):
        continue
    if re.search(r"\borbit\b|\batlas\b", path.read_text(errors="ignore"), re.I):
        errors.append(f"{path.relative_to(ROOT)} still names a retired project (Orbit or ATLAS)")
for gone in ("orbit", "projects/atlas.html", "data/measurements/orbit"):
    if (ROOT / gone).exists():
        errors.append(f"{gone} belongs to a retired project and must not be served")

# Every page addresses the stylesheet and the script by their current version (scripts/sync_chrome.py stamps it). Without
# it a returning browser keeps the old files for a while and shows a new page half dressed.
sys.path.insert(0, str(ROOT / "scripts"))
import sync_chrome as _chrome  # noqa: E402
_version = _chrome.asset_version()
for path in sorted(ROOT.rglob("*.html")):
    if ".git" in path.parts or path.is_relative_to(ROOT / "shock-lab") or path.is_relative_to(ROOT / "scripts"):
        continue
    for ref in re.findall(r'(?:href|src)="[^"]*assets/site\.(?:css|js)[^"]*"', path.read_text(encoding="utf-8", errors="ignore")):
        if not ref.endswith(f'?v={_version}"'):
            errors.append(f"{path.relative_to(ROOT)} loads {ref.split(chr(34))[1]} without the current version stamp (run scripts/sync_chrome.py)")

# Three projects; the first has three studies. Order, numbers (01.1, 01.2, 01.3, 02, 03) and groups follow scripts/groups.py.
sys.path.insert(0, str(ROOT / "scripts"))
import groups as _groups  # noqa: E402
_expected = _groups.apply(json.loads(json.dumps(DATA)))
if [p["id"] for p in DATA["projects"]] != [p["id"] for p in _expected["projects"]]:
    errors.append("data/projects.json is not in the order of scripts/groups.py (run python3 scripts/groups.py)")
for project, want in zip(DATA["projects"], _expected["projects"]):
    for key in ("number", "group", "study"):
        if project.get(key) != want[key]:
            errors.append(f"{project['id']}.{key} must be {want[key]!r}, not {project.get(key)!r} (run python3 scripts/groups.py)")
if DATA.get("groups") != _expected["groups"]:
    errors.append("data/projects.json groups do not match scripts/groups.py (run python3 scripts/groups.py)")

# The master page is generated: its <main> must match a fresh build from data/projects.json, charts included.
import importlib.util  # noqa: E402

sys.dont_write_bytecode = True  # no __pycache__ in the site repository
spec = importlib.util.spec_from_file_location("build_home", ROOT / "scripts" / "build_home.py")
build_home = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_home)
main_of = lambda text: re.search(r"<main id=\"main\">.*?</main>", text, re.S).group(0)  # noqa: E731
if main_of(build_home.page()) != main_of(home):
    errors.append("index.html is out of date with data/projects.json (run scripts/build_home.py, then scripts/sync_chrome.py)")

# The hero illustration and every reveal must respect reduced motion.
site_js = (ROOT / "assets" / "site.js").read_text(encoding="utf-8")
if "prefers-reduced-motion" not in site_js:
    errors.append("assets/site.js must check prefers-reduced-motion before animating")
if "Illustration, not data" not in home:
    errors.append("the hero illustration must say it is an illustration, not data")

# The wealth lab and the holdings view are exports of the project's committed results; they must agree with its table.
wealth_path = ROOT / "data" / "dpc_wealth.json"
dpc_stats = projects["deep-portfolio-constructor"]["stats"]
if not wealth_path.exists():
    errors.append("data/dpc_wealth.json is missing (run scripts/sync_dpc.py)")
else:
    wealth = json.loads(wealth_path.read_text())
    if not wealth["source"].startswith("deep-portfolio-constructor "):
        errors.append("data/dpc_wealth.json must cite the deep-portfolio-constructor repository and commit")
    months = int(dpc_stats["months"]["display"])
    if len(wealth["dates"]) != months:
        errors.append(f"data/dpc_wealth.json should cover {months} months")
    perf = projects["deep-portfolio-constructor"]["tables"]["performance"]
    for sid, label in wealth["labels"].items():
        series = wealth["growth"][sid]
        row = next((r for r in perf["rows"] if r[0] == label), None)
        if len(series) != months + 1:
            errors.append(f"growth of $1 for {sid} should have {months} months plus its starting point")
        if row is None:
            errors.append(f"lab strategy {sid} has no row in the performance table")
        elif (f"${series[-1]:,.0f}" if series[-1] >= 10 else f"${series[-1]:,.2f}") != row[1]:
            errors.append(f"lab growth of $1 for {sid} ends at {series[-1]} but the table says {row[1]}")
    h = wealth["holdings"]
    for t, (row, mrow) in enumerate(zip(h["deepBp"], h["marketBp"])):
        # Whole basis points, rounded so each month adds to exactly 100%: long-only and fully invested.
        if len(row) != len(h["industries"]) or sum(row) != 10000 or min(row) < 0 or sum(mrow) != 10000 or min(mrow) < 0:
            errors.append(f"holdings {h['dates'][t]} must be long-only and fully invested")
            break

# Every interactive piece is on its page, every dotted word has a definition, and the toy says it is made up.
dpc_page = (ROOT / "projects" / "deep-portfolio-constructor.html").read_text(encoding="utf-8")
for hook, where, text in (("data-lab=", "index.html", home), ("data-shock", "index.html", home), ("data-attack", "index.html", home),
                          ("data-market-pause", "index.html", home), ("data-lab=", "the portfolio page", dpc_page),
                          ("data-growth-toy", "the portfolio page", dpc_page), ("data-holdings=", "the portfolio page", dpc_page),
                          ("data-start-toy", "the portfolio page", dpc_page), ("data-schedules", "the portfolio page", dpc_page)):
    if hook not in text:
        errors.append(f"{where} is missing its interactive piece {hook}")
glossary = set(re.findall(r'^\s+"([a-z-]+)": \[', site_js, re.M))
for path in html_files:
    for key in set(re.findall(r'class="term" data-term="([^"]+)"', path.read_text(encoding="utf-8"))):
        if key not in glossary:
            errors.append(f"{path.relative_to(ROOT)} uses the term {key!r} but assets/site.js has no definition for it")
if "Made-up numbers, not data" not in dpc_page:
    errors.append("the growth toy must say its numbers are made up, not data")
if re.search(r"long-short|market-neutral|dollar-neutral|\bshorts?\b(?! of)", re.sub(r"never shorts?|no shorting|never short", "", main_of(dpc_page))):
    errors.append("the portfolio page must not describe short positions: the study is long-only")
spec_dpc = importlib.util.spec_from_file_location("build_dpc_page", ROOT / "scripts" / "build_dpc_page.py")
build_dpc = importlib.util.module_from_spec(spec_dpc)
spec_dpc.loader.exec_module(build_dpc)
body_of = lambda text: re.search(r'<div class="cs-body wrap">.*?<nav class="project-switch"', text, re.S).group(0)  # noqa: E731
if body_of(build_dpc.page()) != body_of(dpc_page):
    errors.append("projects/deep-portfolio-constructor.html is out of date with data/projects.json (run scripts/build_dpc_page.py, then scripts/sync_chrome.py)")

# One website: World Shock Lab's app is served from this repository (scripts/sync_all.py copies its build) under the site's own header.
lab_app = ROOT / "shock-lab" / "index.html"
if not lab_app.is_file():
    errors.append("shock-lab/index.html is missing: build the app in the world-shock-lab repository and run scripts/sync_all.py")
else:
    bundle = "".join(f.read_text(encoding="utf-8") for f in (ROOT / "shock-lab" / "assets").glob("index-*.js"))
    for needle in ("../projects/pension-lab.html", "../resume/Sherif_Morsi_Resume.pdf", "Sherif Morsi"):
        if needle not in bundle:
            errors.append(f"shock-lab/ app does not carry the site header ({needle!r} not found in its bundle)")

# The Pension Lab: its page, its pictures and its sentences all come from one export of the study, and none may claim
# more than the pre-registered verdicts in that export.
pension = projects.get("pension-lab")
pension_path = ROOT / "data" / "pension.json"
if pension is None:
    errors.append("data/projects.json has no pension-lab project (run scripts/sync_pension.py)")
elif not pension_path.exists():
    errors.append("data/pension.json is missing (run scripts/sync_pension.py)")
else:
    pdata = json.loads(pension_path.read_text())
    pstats = pension["stats"]
    if not pdata["source"].startswith("deep-portfolio-constructor "):
        errors.append("data/pension.json must cite the deep-portfolio-constructor repository and commit")
    for where, key in (("simulated", "vsGlideVerdict"), ("model_risk", "walkVerdict"), ("history", "histVerdict")):
        verdict = pstats[key]["display"]
        if verdict not in ("better", "worse", "no detectable difference"):
            errors.append(f"pension-lab.stats.{key} must be one of the three pre-registered verdicts, not {verdict!r}")
        if pdata["verdicts"][where] != verdict:
            errors.append(f"pension-lab.stats.{key} says {verdict!r} but data/pension.json says {pdata['verdicts'][where]!r}")
        for field in ("caveat", "proves"):
            said = {"better": "better", "worse": "worse", "no detectable difference": "detect"}[verdict]
            if said not in pension[field]:
                errors.append(f"pension-lab.{field} must state the {where} verdict ({verdict})")
    # The protocol: if the learned policy is not better than the glide path, the page says so in its first line.
    for where in ("simulated", "history"):
        v = pdata["verdicts"][where]
        if v != "better" and {"worse": "worse than", "no detectable difference": "not detectably different from"}[v] not in pension["purpose"]:
            errors.append(f"pension-lab.purpose (the page's first line) must say the learned policy is not better than the glide path ({where}: {v})")
    if "Pre-registered" not in pension["caveat"] or "about three independent" not in pension["caveat"]:
        errors.append("pension-lab caveat must say the test was pre-registered and that the historical periods amount to about three independent ones")
    for name in ("60/40", "Glide path", "Learned policy"):
        paths = pdata["fans"]["paths"].get(name) or []
        if len(paths) < 60 or any(len(path) != 21 for path in paths):
            errors.append(f"data/pension.json needs at least 60 twenty-year paths for {name}")
    spec_pen = importlib.util.spec_from_file_location("build_pension_page", ROOT / "scripts" / "build_pension_page.py")
    build_pen = importlib.util.module_from_spec(spec_pen)
    spec_pen.loader.exec_module(build_pen)
    pension_page = (ROOT / "projects" / "pension-lab.html").read_text(encoding="utf-8") if (ROOT / "projects" / "pension-lab.html").exists() else ""
    if not pension_page or body_of(build_pen.page()) != body_of(pension_page):
        errors.append("projects/pension-lab.html is out of date with data/projects.json (run scripts/build_pension_page.py, then scripts/sync_chrome.py)")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"ok: {len(DATA['groups'])} projects, {len(projects)} studies")
