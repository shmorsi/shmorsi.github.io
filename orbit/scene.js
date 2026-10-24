/* Orbit mission-control scene.
   Plays a saved engine trace from replay/traces/. Stations come from the roles in the trace:
   v1 traces have three (planner, worker, critic) and a grounding gate; v2 traces have six,
   and the auditor is the gate. Each v2 event kind (assign, draft, revise, audit, final) has
   its own visual state. Motion uses transform and opacity only. Reduced motion shows the
   final frame, still. */
(() => {
  const mount = document.querySelector("[data-scene]");
  if (!mount) return;

  const ROLES = {
    planner: { label: "Planner", verb: "Writes the plan", color: "var(--r-planner)" },
    worker: { label: "Worker", verb: "Calls tools", color: "var(--r-worker)", usesTools: true },
    critic: { label: "Critic", verb: "Checks each claim", verbV2: "Accepts or revises", color: "var(--r-critic)", judges: true },
    commander: { label: "Commander", verb: "Assigns steps", color: "var(--r-planner)" },
    scout: { label: "Scout", verb: "Reads the corpus", color: "var(--r-scout)", usesTools: true },
    engineer: { label: "Engineer", verb: "Runs code", color: "var(--r-worker)", usesTools: true },
    analyst: { label: "Analyst", verb: "Drafts the answer", color: "var(--r-analyst)", usesTools: true },
    auditor: { label: "Auditor", verb: "Code, not a model", color: "var(--r-auditor)", judges: true }
  };
  const ORDER = ["commander", "planner", "scout", "engineer", "worker", "analyst", "critic", "auditor"];
  const V2_EDGES = [
    ["commander", "scout"], ["commander", "engineer"], ["commander", "analyst"],
    ["scout", "tool"], ["engineer", "tool"], ["analyst", "tool"],
    ["analyst", "critic"], ["critic", "auditor"]
  ];
  const fallbackRole = (name) => ({ label: name.charAt(0).toUpperCase() + name.slice(1), verb: "Agent", color: "var(--ink)" });

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const recording = params.has("record");
  const base = mount.dataset.scene;
  const stage = mount.querySelector(".stage");
  const caption = mount.querySelector(".caption");
  const who = caption.querySelector(".who");
  const what = caption.querySelector(".what");
  const when = caption.querySelector(".when");
  const playBtn = mount.querySelector("[data-play]");
  const restartBtn = mount.querySelector("[data-restart]");
  const select = mount.querySelector("[data-trace]");
  const question = mount.querySelector(".scene-q");
  const tags = mount.querySelector("[data-tags]");
  const bar = mount.querySelector(".progress i");
  const transcript = mount.querySelector("[data-transcript]");

  const svgNS = "http://www.w3.org/2000/svg";
  const consoleArt = `<svg viewBox="0 0 92 64" aria-hidden="true">
      <rect class="bg" x="14" y="6" width="64" height="38"/>
      <rect class="glow" x="14" y="6" width="64" height="38" fill="currentColor" fill-opacity="0.16"/>
      <rect x="14" y="6" width="64" height="38" fill="none" stroke="currentColor" stroke-width="1.25"/>
      <path d="M22 16h30M22 24h44M22 32h22" stroke="currentColor" stroke-width="1" opacity="0.6"/>
      <path d="M46 44v8M30 52h32M4 60h84" stroke="currentColor" stroke-width="1.25" fill="none"/>
    </svg>`;
  const rackArt = `<svg viewBox="0 0 92 64" aria-hidden="true">
      <rect class="bg" x="20" y="4" width="52" height="56"/>
      <rect class="glow" x="20" y="4" width="52" height="56" fill="currentColor" fill-opacity="0.16"/>
      <rect x="20" y="4" width="52" height="56" fill="none" stroke="currentColor" stroke-width="1.25"/>
      <path d="M20 18h52M20 32h52M20 46h52" stroke="currentColor" stroke-width="1"/>
      <circle cx="28" cy="11" r="1.6" fill="currentColor"/><circle cx="28" cy="25" r="1.6" fill="currentColor"/><circle cx="28" cy="39" r="1.6" fill="currentColor"/><circle cx="28" cy="53" r="1.6" fill="currentColor"/>
    </svg>`;
  const gateArt = `<svg viewBox="0 0 92 64" aria-hidden="true">
      <rect class="bg" x="16" y="10" width="60" height="52"/>
      <rect class="glow" x="22" y="10" width="48" height="50" fill="currentColor" fill-opacity="0.16"/>
      <path d="M16 62V10h60v52M28 62V22h36v40" fill="none" stroke="currentColor" stroke-width="1.25"/>
      <path d="M10 10h72" stroke="currentColor" stroke-width="1.25"/>
    </svg>`;
  const TICK = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.5"/></svg>`;
  const CROSS = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>`;

  let mission = null;
  let team = "v1";
  let roles = [];
  let events = [];
  let cursor = 0;
  let playing = false;
  let timer = null;
  let nodes = {};
  let centers = {};
  let iconDy = {};
  let ledger = null;
  let pulse = null;
  const STEP_MS = Number(params.get("stepms")) || 1900;

  const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const pad = (n) => String(n).padStart(2, "0");
  const clock = (s) => `T+${pad(Math.floor(s / 60))}:${pad(Math.round(s) % 60)}`;
  const role = (name) => ROLES[name] || fallbackRole(name);
  const verbFor = (name) => (team === "v2" && role(name).verbV2) || role(name).verb;
  const clip = (text, n) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
  const rank = (name) => (ORDER.indexOf(name) < 0 ? 99 : ORDER.indexOf(name));

  function codeLine(code) {
    const lines = String(code || "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    return lines[lines.length - 1] || "";
  }

  function resultText(r) {
    if (r.stdout != null) return String(r.stdout).trim();
    if (r.result != null) return String(r.result);
    if (r.value != null) return String(r.value);
    if (Array.isArray(r.matches)) return r.matches.length ? `"${clip(String(r.matches[0].text || ""), 90)}"` : "no match";
    if (Array.isArray(r.results)) return r.results.length ? `"${clip(String(r.results[0].snippet || r.results[0].title || ""), 90)}"` : "no result";
    if (r.text != null) return `"${clip(String(r.text), 90)}"`;
    return r.ok === false ? "an error" : "done";
  }

  function findingLabel(f) {
    if (f.claim != null && f.value != null) return `${f.claim} = ${f.value}`;
    if (f.claim != null && f.text != null) return `${f.claim}: "${f.text}"`;
    if (f.claim != null) return f.claim;
    return `Number ${f.number}`;
  }

  function findingSource(f) {
    if (f.ok) return f.citation || "in trace";
    return f.citation ? `not in ${f.citation}` : "in no result";
  }

  function cites(claims) {
    const list = (claims || []).map((c) => c.citation).filter(Boolean);
    return list.length ? ` (cites ${list.join(", ")})` : "";
  }

  function describe(event) {
    const p = event.payload || {};
    const name = role(event.agent || "agent").label;
    if (event.kind === "result") {
      return { who: "Tools", text: `${event.tool} returned ${resultText(event.result || {}) || "nothing"}${event.call ? `, as ${event.call}` : ""}`, key: "tool" };
    }
    if (event.kind === "assign") {
      return { who: name, text: `Assigns step ${event.step_number} to the ${role(event.role).label.toLowerCase()}: ${event.goal}${event.tool ? ` (${event.tool})` : ""}`, key: event.agent };
    }
    if (event.kind === "draft") {
      return { who: name, text: `Drafts ${event.status === "refuse" ? "a refusal" : "an answer"}: ${event.answer}${cites(event.claims)}`, key: event.agent };
    }
    if (event.kind === "revise") return { who: name, text: `Sends it back: ${event.reason || "revise"}`, key: event.agent, verdict: "revise" };
    if (event.kind === "audit") {
      const findings = event.findings || [];
      const bad = findings.filter((f) => !f.ok);
      const ok = findings.length - bad.length;
      const miss = bad.length ? ` ${bad.map((f) => (f.claim != null ? f.claim : f.number)).join(", ")}: ${bad[0].reason}.` : "";
      return { who: name, text: `Checks ${findings.length} items against the tool results. ${ok} of ${findings.length} supported.${miss} ${event.verdict === "pass" ? "Pass." : "Refuse."}`, key: event.agent };
    }
    if (event.kind === "final") {
      return { who: name, text: `${event.status === "refuse" ? "Refused" : "Final answer"}: ${event.answer}`, key: event.agent, final: true };
    }
    if (event.kind === "invalid") return { who: name, text: `Schema error: ${event.error || "invalid"}`, key: event.agent };
    if (Array.isArray(p.steps)) {
      const text = p.steps.length
        ? `Plan: ${p.steps.map((s) => `${s.goal}${s.role || s.tool ? ` (${[s.role, s.tool].filter(Boolean).join(", ")})` : ""}`).join("; ")}`
        : "Plan: none. The corpus cannot answer this.";
      return { who: name, text, key: event.agent };
    }
    if (p.action === "tool") {
      const args = p.arguments || {};
      const detail = args.code ? codeLine(args.code) : args.expression || args.path || args.query || "";
      return { who: name, text: `Calls ${p.tool}: ${detail}`, key: event.agent, toTools: true };
    }
    if (p.action === "final") {
      return { who: name, text: `${p.status === "refuse" ? "Refuses" : "Answers"}: ${p.answer}${cites(p.claims)}`, key: event.agent, final: true };
    }
    if (p.verdict) return { who: name, text: `${p.verdict === "accept" ? "Accepts" : p.verdict === "refuse" ? "Refuses" : "Revise"}: ${p.reason || ""}`, key: event.agent, verdict: p.verdict };
    return { who: name, text: event.kind, key: event.agent };
  }

  /* v2 writes a parsed turn and then the event it becomes (draft, revise). Show the event once. */
  function compact(rows) {
    const list = rows.filter((r) => r.kind !== "mission" && r.kind !== "message");
    if (team !== "v2") return list;
    return list.filter((e, i) => {
      const next = list[i + 1];
      return !(e.kind === "parsed" && next && next.agent === e.agent && (next.kind === "draft" || next.kind === "revise"));
    });
  }

  function make(cls, art, name, verb, color) {
    const el = document.createElement("div");
    el.className = cls;
    if (color) el.style.setProperty("--role", color);
    el.innerHTML = `${art}<span class="name">${esc(name)}</span><span class="verb">${esc(verb)}</span><span class="state"></span>`;
    stage.append(el);
    return el;
  }

  function makeLedger() {
    const el = document.createElement("div");
    el.className = "ledger";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<span class="ledger-title">Claim check</span><p class="wait">Runs after the critic accepts</p><ol></ol>`;
    stage.append(el);
    return el;
  }

  function maxFindings() {
    return events.reduce((n, e) => (e.kind === "audit" ? Math.max(n, (e.findings || []).length) : n), 0);
  }

  function layout() {
    stage.querySelectorAll(".station, .rack, .gate, .ledger, .links-layer, .pulse").forEach((n) => n.remove());
    nodes = {};
    ledger = null;
    const v2 = team === "v2";
    roles.forEach((r) => {
      const info = role(r);
      nodes[r] = v2 && r === "auditor"
        ? make("gate auditor", gateArt, info.label, verbFor(r), info.color)
        : make("station", consoleArt, info.label, verbFor(r), info.color);
    });
    nodes.tool = make("rack", rackArt, "Tools", "Sandboxed, on device");
    if (v2 && nodes.auditor) {
      nodes.gate = nodes.auditor;
      ledger = makeLedger();
    } else {
      nodes.gate = make("gate", gateArt, "Grounding gate", "Keeps cited claims");
    }

    /* The reduced-motion stylesheet gives every property a tiny transition; height must apply at once. */
    stage.style.transitionProperty = "none";
    stage.style.height = "";
    const w = stage.clientWidth;
    stage.dataset.team = team;
    stage.classList.toggle("compact", w < 820);
    const pos = {};
    let ledgerBox = null;
    if (v2) {
      const ledgerH = 44 + Math.max(2, maxFindings()) * 24;
      if (w < 820) {
        /* Commander on top, the three specialists fan out below it, then tools, critic, auditor. */
        const rowH = 144;
        const col = (c) => (c + 0.5) * (w / 3);
        const grid = { commander: [1, 0], scout: [0, 1], engineer: [1, 1], analyst: [2, 1], critic: [1, 2], auditor: [2, 2] };
        roles.forEach((r, i) => { const at = grid[r] || [i % 3, 3]; pos[r] = [col(at[0]), 80 + at[1] * rowH]; });
        pos.tool = [col(0), 80 + 2 * rowH];
        const top = 80 + 2 * rowH + 92;
        ledgerBox = { left: 12, top, width: w - 24 };
        stage.style.height = `${top + ledgerH + 16}px`;
      } else {
        if (stage.clientHeight < 560) stage.style.height = "560px";
        const h = stage.clientHeight;
        const ax = Math.min(w * 0.875, w - 118);
        const place = { commander: [0.085, 0.5], scout: [0.29, 0.19], engineer: [0.29, 0.5], analyst: [0.29, 0.81], critic: [0.68, 0.81] };
        roles.forEach((r, i) => { const at = place[r]; pos[r] = at ? [w * at[0], h * at[1]] : [w * (0.1 + 0.15 * i), h * 0.19]; });
        if (nodes.auditor) pos.auditor = [ax, h * 0.81];
        pos.tool = [w * 0.5, h * 0.5];
        ledgerBox = { left: ax - 108, top: Math.max(16, h * 0.81 - 92 - ledgerH), width: 216 };
      }
    } else {
      const narrow = w < 600;
      if (narrow) {
        const perRow = roles.length > 4 ? 3 : Math.min(roles.length, 3);
        const rows = Math.ceil(roles.length / perRow);
        const rowH = 140;
        roles.forEach((r, i) => {
          const row = Math.floor(i / perRow);
          const inRow = Math.min(perRow, roles.length - row * perRow);
          pos[r] = [((i % perRow) + 0.5) * (w / inRow), 82 + row * rowH];
        });
        const y = 82 + rows * rowH + 10;
        pos.tool = [w * 0.27, y];
        pos.gate = [w * 0.73, y];
        stage.style.height = `${y + 96}px`;
      } else {
        const h = stage.clientHeight;
        const n = roles.length;
        const span = Math.min(150, 46 + n * 22) * (Math.PI / 180);
        roles.forEach((r, i) => {
          const t = n === 1 ? 0.5 : i / (n - 1);
          const ang = -Math.PI / 2 - span / 2 + t * span;
          pos[r] = [w / 2 + Math.cos(ang) * Math.min(w * 0.34, 460), h * 0.9 + Math.sin(ang) * h * 0.64];
        });
        const inner = n > 3 ? Math.min(w * 0.11, 150) : Math.min(w * 0.17, 230);
        pos.tool = [w / 2 - inner, h * 0.8];
        pos.gate = [w / 2 + inner, h * 0.8];
      }
    }
    if (v2 && nodes.auditor) pos.gate = pos.auditor;
    Object.entries(pos).forEach(([k, [x, y]]) => { if (nodes[k]) { nodes[k].style.left = `${x}px`; nodes[k].style.top = `${y}px`; } });
    if (ledger && ledgerBox) {
      ledger.style.left = `${ledgerBox.left}px`;
      ledger.style.top = `${ledgerBox.top}px`;
      ledger.style.width = `${ledgerBox.width}px`;
    }
    iconDy = {};
    Object.entries(nodes).forEach(([k, node]) => {
      const art = node.querySelector("svg");
      iconDy[k] = node.offsetHeight / 2 - (art ? art.getBoundingClientRect().height / 2 : 0);
    });

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "links-layer");
    svg.setAttribute("aria-hidden", "true");
    const line = (a, b) => {
      if (!pos[a] || !pos[b]) return;
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", pos[a][0]); l.setAttribute("y1", pos[a][1] - iconDy[a]);
      l.setAttribute("x2", pos[b][0]); l.setAttribute("y2", pos[b][1] - iconDy[b]);
      svg.append(l);
    };
    if (v2) {
      V2_EDGES.forEach(([a, b]) => line(a, b));
    } else {
      for (let i = 1; i < roles.length; i += 1) line(roles[i - 1], roles[i]);
      roles.forEach((r) => {
        if (role(r).usesTools) line(r, "tool");
        if (role(r).judges) line(r, "gate");
      });
    }
    stage.prepend(svg);
    centers = pos;
    pulse = document.createElement("span");
    pulse.className = "pulse";
    stage.append(pulse);
  }

  function travel(from, to) {
    if (!pulse || !centers[from] || !centers[to] || from === to || reduce) return;
    const [x1, y1] = centers[from];
    const [x2, y2] = centers[to];
    const d1 = iconDy[from] || 0;
    const d2 = iconDy[to] || 0;
    pulse.style.setProperty("--pulse", from === "tool" ? "var(--accent)" : role(from).color);
    pulse.animate([
      { transform: `translate(${x1}px, ${y1 - d1}px)`, opacity: 0 },
      { transform: `translate(${x1}px, ${y1 - d1}px)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${x2}px, ${y2 - d2}px)`, opacity: 1, offset: 0.88 },
      { transform: `translate(${x2}px, ${y2 - d2}px)`, opacity: 0 }
    ], { duration: Math.min(1100, STEP_MS * 0.6), easing: "cubic-bezier(0.45, 0, 0.2, 1)", fill: "forwards" });
  }

  function nextActor(i) {
    for (let j = i + 1; j < events.length; j += 1) {
      const e = events[j];
      if (e.kind === "result") return "tool";
      if (e.agent && e.agent !== "tool") return e.agent;
    }
    return "gate";
  }

  function setState(key, text) {
    const node = nodes[key];
    const slot = node && node.querySelector(".state");
    if (slot) slot.textContent = text;
  }

  function fillLedger(event, animate) {
    if (!ledger) return;
    const findings = event.findings || [];
    ledger.querySelector(".wait").hidden = true;
    ledger.dataset.verdict = event.verdict;
    ledger.classList.toggle("animate", Boolean(animate) && !reduce);
    ledger.querySelector("ol").innerHTML = findings.map((f, k) => `<li class="${f.ok ? "ok" : "no"}" style="--k:${k}">${f.ok ? TICK : CROSS}<span class="what">${esc(findingLabel(f))}</span><span class="src">${esc(findingSource(f))}</span></li>`).join("");
  }

  function finish(status, answer, by) {
    const final = status === "refuse" ? "refuse" : "answer";
    nodes.gate.dataset.verdict = final;
    setState("gate", final === "refuse" ? "Refused" : "Answer kept");
    nodes.gate.classList.add("lit");
    if (answer) {
      who.textContent = by;
      caption.style.setProperty("--role", final === "refuse" ? "var(--r-critic)" : "var(--accent)");
      what.textContent = `${final === "refuse" ? "Refused" : team === "v2" ? "Final answer" : "Kept"}: ${answer}`;
    }
  }

  function apply(i, animate) {
    const e = events[i];
    const d = describe(e);
    const p = e.payload || {};
    const v2 = team === "v2";
    Object.values(nodes).forEach((n) => n.classList.remove("lit"));
    const key = e.kind === "result" ? "tool" : e.agent;
    if (nodes[key]) nodes[key].classList.add("lit");
    if (nodes[key] && key !== "tool") nodes[key].classList.remove("assigned");
    caption.style.setProperty("--role", key === "tool" ? "var(--ink)" : role(key).color);
    who.textContent = d.who;
    what.textContent = d.text;
    when.textContent = `${clock(e.t_sec ?? i * 4)} replay clock, event ${i + 1} of ${events.length}`;

    if (e.kind === "assign") {
      if (nodes[e.role]) nodes[e.role].classList.add("assigned");
      setState(e.role, `Step ${e.step_number}${e.tool ? ` · ${e.tool}` : ""}`);
      setState(e.agent, `Step ${e.step_number} out`);
    } else if (Array.isArray(p.steps)) {
      setState(e.agent, p.steps.length ? `Plan · ${p.steps.length} step${p.steps.length > 1 ? "s" : ""}` : "Empty plan");
    } else if (p.action === "tool") {
      setState(e.agent, p.tool);
    } else if (e.kind === "result") {
      setState("tool", `${e.call || ""} ${e.tool}`.trim());
      if (e.by) setState(e.by, `${e.call || e.tool} back`);
    } else if (e.kind === "draft") {
      const n = events.slice(0, i + 1).filter((x) => x.kind === "draft").length;
      setState(e.agent, `Draft ${n}`);
    } else if (p.action === "final") {
      setState(e.agent, p.status === "refuse" ? "Refusal" : "Answer");
    }

    if (d.verdict && !(v2 && key === "auditor")) {
      setState(e.agent, d.verdict === "accept" ? "Accept" : d.verdict === "refuse" ? "Refuse" : "Revise");
      if (!v2) {
        nodes.gate.dataset.verdict = d.verdict;
        setState("gate", d.verdict === "accept" ? "Accepted" : d.verdict === "refuse" ? "Refused" : "Revise");
        nodes.gate.classList.add("lit");
      }
    }
    if (e.kind === "audit") {
      nodes.gate.dataset.verdict = e.verdict === "pass" ? "accept" : "refuse";
      setState("gate", e.verdict === "pass" ? "Pass" : "Refuse");
      fillLedger(e, animate);
    }
    if (e.kind === "final") finish(e.status, e.answer, d.who);
    else if (i === events.length - 1 && mission && !events.some((x) => x.kind === "final")) {
      finish(mission.status, mission.answer, v2 ? role("auditor").label : "Grounding gate");
    }
    if (bar) bar.style.transform = `scaleX(${(i + 1) / events.length})`;

    if (!animate) return;
    if (e.kind === "assign") travel(e.agent, e.role);
    else if (d.toTools) travel(e.agent, "tool");
    else if (e.kind === "result") travel("tool", e.by && nodes[e.by] ? e.by : nextActor(i));
    else if (e.kind === "draft") travel(e.agent, "critic");
    else if (v2 && d.verdict === "revise") travel(e.agent, "analyst");
    else if (v2 && d.verdict === "accept") travel(e.agent, "auditor");
    else if (v2 && Array.isArray(p.steps)) return;
    else if (e.kind === "audit" || e.kind === "final") return;
    else if (d.verdict === "accept" || d.verdict === "refuse") travel(e.agent, "gate");
    else travel(e.agent, nextActor(i));
  }

  function dwell(event) {
    if (!event) return 1;
    if (event.kind === "audit") return 1.3 + 0.15 * (event.findings || []).length;
    if (event.kind === "final") return 1.3;
    return 1;
  }

  function setPlaying(on) {
    playing = on;
    playBtn.setAttribute("aria-pressed", String(on));
    playBtn.textContent = on ? "Pause" : "Play";
    clearTimeout(timer);
    if (on) tick();
  }

  function tick() {
    if (!playing) return;
    if (cursor >= events.length) {
      if (recording) { setPlaying(false); document.body.dataset.sceneDone = "1"; return; }
      timer = setTimeout(() => { reset(); tick(); }, 3200);
      return;
    }
    apply(cursor, true);
    cursor += 1;
    timer = setTimeout(tick, STEP_MS * dwell(events[cursor - 1]));
  }

  function reset() {
    cursor = 0;
    Object.values(nodes).forEach((n) => {
      n.classList.remove("lit", "assigned");
      const slot = n.querySelector(".state");
      if (slot) slot.textContent = "";
    });
    if (nodes.gate) delete nodes.gate.dataset.verdict;
    if (ledger) {
      ledger.querySelector(".wait").hidden = false;
      ledger.querySelector("ol").innerHTML = "";
      delete ledger.dataset.verdict;
    }
    who.textContent = "Orbit";
    caption.style.removeProperty("--role");
    what.textContent = mission ? mission.question : "";
    when.textContent = "Replay of a saved engine trace";
    if (bar) bar.style.transform = "scaleX(0)";
  }

  function showFinal() {
    for (let i = 0; i < events.length; i += 1) apply(i, false);
    cursor = events.length;
  }

  async function load(file) {
    setPlaying(false);
    const res = await fetch(`${base}traces/${file}`);
    if (!res.ok) throw new Error(`Missing trace ${file}`);
    const rows = (await res.text()).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    mission = rows.find((r) => r.kind === "mission") || null;
    const rules = (mission && mission.flight_rules) || {};
    team = (mission && mission.team) || rules.team || (rows.some((r) => r.kind === "assign" || r.kind === "audit") ? "v2" : "v1");
    events = compact(rows);
    const seen = [...new Set(events.map((e) => e.agent).filter((a) => a && a !== "tool"))];
    roles = (team === "v2" && Array.isArray(rules.roles) ? [...rules.roles] : seen).sort((a, b) => rank(a) - rank(b));
    question.textContent = mission ? mission.question : "";
    const kind = document.querySelector("[data-trace-kind]");
    if (kind) {
      kind.textContent = String(file).startsWith("incident/")
        ? "This trace is the incident-commander scripted demo on a fictional corpus. It is not a measured score."
        : "The trace open here is the makerspace harness. It is not the incident demo and not a score.";
    }
    const slot = document.querySelector("[data-incident-slot]");
    if (slot && String(file).startsWith("incident/")) {
      const strong = slot.querySelector("strong");
      const copy = slot.querySelector("p");
      if (strong) strong.textContent = "Scripted demo";
      if (copy) copy.textContent = "Playing a shipped incident trace. Fictional corpus. Not a measured score.";
    }
    const scripted = mission && mission.harness === "scripted_harness";
    const teamTag = team === "v2" ? `Team v2, ${roles.length} roles` : `Team v1, ${roles.length} roles`;
    tags.innerHTML = `<span class="scene-tag">Replay of a saved engine trace</span>${scripted ? `<span class="scene-tag warn">Scripted harness</span>` : ""}<span class="scene-tag">Not live</span><span class="scene-tag">Not a model score</span><span class="scene-tag">${esc(teamTag)}</span><span class="scene-tag">Task ${esc(mission ? mission.task_id : "")}</span>`;
    if (transcript) {
      transcript.innerHTML = events.map((e) => { const d = describe(e); return `<li><strong>${esc(d.who)}.</strong> ${esc(d.text)}</li>`; }).join("")
        + (mission ? `<li><strong>Result.</strong> ${esc(mission.status)}: ${esc(mission.answer || "")}</li>` : "");
    }
    layout();
    reset();
    if (reduce) showFinal();
  }

  playBtn.addEventListener("click", () => {
    caption.setAttribute("aria-live", "polite");
    if (playing) { setPlaying(false); return; }
    if (cursor >= events.length) reset();
    setPlaying(true);
  });
  restartBtn.addEventListener("click", () => { setPlaying(false); reset(); setPlaying(true); });
  select.addEventListener("change", () => load(select.value).then(() => { if (!reduce) setPlaying(true); }).catch((error) => { what.textContent = error.message; }));

  let resizeTimer;
  let lastW = stage.clientWidth;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (Math.abs(stage.clientWidth - lastW) < 2) return;
      lastW = stage.clientWidth;
      const at = cursor;
      layout();
      reset();
      for (let i = 0; i < at; i += 1) apply(i, false);
      cursor = at;
    }, 150);
  });

  const wanted = params.get("trace");
  if (wanted && [...select.options].some((o) => o.value === wanted)) select.value = wanted;

  const attachIncident = async () => {
    try {
      const res = await fetch(`${base}traces/incident/index.json`);
      if (!res.ok) return;
      const items = await res.json();
      const shipped = (Array.isArray(items) ? items : []).filter((item) => {
        const file = item && item.file;
        return typeof file === "string" && file.length > 0 && !file.includes("..") && !file.startsWith("/") && !file.includes("\\");
      });
      if (!shipped.length) return;
      const group = document.createElement("optgroup");
      group.label = "Incident commander, scripted demo";
      shipped.forEach((item) => {
        const option = document.createElement("option");
        option.value = `incident/${item.file}`;
        option.textContent = item.question || item.task_id || item.file;
        group.append(option);
      });
      select.prepend(group);
      const asked = params.get("trace");
      if (asked && [...select.options].some((option) => option.value === asked)) select.value = asked;
      else if (!asked) select.value = `incident/${shipped[0].file}`;
    } catch { /* makerspace traces stay selected until the incident index ships */ }
  };

  attachIncident().then(async () => {
    try {
      await load(select.value);
    } catch (error) {
      if (!String(select.value).startsWith("incident/")) throw error;
      select.value = [...select.options].some((option) => option.value === "v2/revise.jsonl") ? "v2/revise.jsonl" : "revise.jsonl";
      await load(select.value);
    }
  }).then(() => {
    if (reduce) return;
    if (recording) { setTimeout(() => setPlaying(true), 900); return; }
    if (!("IntersectionObserver" in window)) return;
    let started = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started) { started = true; setPlaying(true); }
        if (!entry.isIntersecting && playing) setPlaying(false);
      });
    }, { threshold: 0.35 });
    io.observe(stage);
  }).catch((error) => { what.textContent = error.message; });
})();
