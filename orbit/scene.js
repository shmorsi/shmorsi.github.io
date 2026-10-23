/* Orbit mission-control scene.
   Plays a saved engine trace from replay/traces/. Stations come from the roles present in the
   trace, so a trace with more roles needs only an entry in ROLES, not new layout code.
   Motion uses transform and opacity only. Reduced motion shows the final frame, still. */
(() => {
  const mount = document.querySelector("[data-scene]");
  if (!mount) return;

  const ROLES = {
    planner: { label: "Planner", verb: "Writes the plan", color: "var(--r-planner)" },
    worker: { label: "Worker", verb: "Calls tools", color: "var(--r-worker)", usesTools: true },
    critic: { label: "Critic", verb: "Checks each claim", color: "var(--r-critic)", judges: true },
    commander: { label: "Commander", verb: "Sets the plan", color: "var(--r-planner)" },
    scout: { label: "Scout", verb: "Finds the data", color: "var(--r-scout)", usesTools: true },
    engineer: { label: "Engineer", verb: "Runs the tools", color: "var(--r-worker)", usesTools: true },
    analyst: { label: "Analyst", verb: "Works the numbers", color: "var(--r-analyst)", usesTools: true },
    auditor: { label: "Auditor", verb: "Signs off", color: "var(--r-auditor)", judges: true }
  };
  const ORDER = ["commander", "planner", "scout", "engineer", "worker", "analyst", "critic", "auditor"];
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

  let mission = null;
  let events = [];
  let cursor = 0;
  let playing = false;
  let timer = null;
  let nodes = {};
  let centers = {};
  let pulse = null;
  const STEP_MS = Number(params.get("stepms")) || 1900;
  let ICON_DY = 20;

  const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const pad = (n) => String(n).padStart(2, "0");
  const clock = (s) => `T+${pad(Math.floor(s / 60))}:${pad(Math.round(s) % 60)}`;
  const role = (name) => ROLES[name] || fallbackRole(name);

  function codeLine(code) {
    const lines = String(code || "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    return lines[lines.length - 1] || "";
  }

  function describe(event) {
    const p = event.payload || {};
    if (event.kind === "result") {
      const r = event.result || {};
      const out = r.stdout != null ? String(r.stdout).trim() : r.value != null ? String(r.value) : r.ok === false ? "error" : "done";
      return { who: "Tools", text: `${event.tool} returned ${out || "nothing"}`, key: "tool" };
    }
    if (event.kind === "revise") return { who: role(event.agent).label, text: `Sent back: ${event.reason || "revise"}`, key: event.agent, verdict: "revise" };
    if (event.kind === "invalid") return { who: role(event.agent).label, text: `Schema error: ${event.error || "invalid"}`, key: event.agent };
    if (Array.isArray(p.steps)) {
      const text = p.steps.length ? `Plan: ${p.steps.map((s) => `${s.goal}${s.tool ? ` (${s.tool})` : ""}`).join("; ")}` : "Plan: none. The corpus cannot answer this.";
      return { who: role(event.agent).label, text, key: event.agent };
    }
    if (p.action === "tool") {
      const args = p.arguments || {};
      const detail = args.code ? codeLine(args.code) : args.expression || args.path || args.query || "";
      return { who: role(event.agent).label, text: `Calls ${p.tool}: ${detail}`, key: event.agent, toTools: true };
    }
    if (p.action === "final") {
      const claims = (p.claims || []).map((c) => `cites ${c.citation}`).join(", ");
      return { who: role(event.agent).label, text: `${p.status === "refuse" ? "Refuses" : "Answers"}: ${p.answer}${claims ? ` (${claims})` : ""}`, key: event.agent, final: true };
    }
    if (p.verdict) return { who: role(event.agent).label, text: `${p.verdict === "accept" ? "Accepts" : p.verdict === "refuse" ? "Refuses" : "Revise"}: ${p.reason || ""}`, key: event.agent, verdict: p.verdict };
    return { who: role(event.agent || "agent").label, text: event.kind, key: event.agent };
  }

  function layout() {
    const roles = [...new Set(events.map((e) => e.agent).filter((a) => a && a !== "tool"))]
      .sort((a, b) => (ORDER.indexOf(a) + 99 * (ORDER.indexOf(a) < 0)) - (ORDER.indexOf(b) + 99 * (ORDER.indexOf(b) < 0)));
    stage.querySelectorAll(".station, .rack, .gate, .links-layer, .pulse").forEach((n) => n.remove());
    nodes = {};
    const make = (cls, art, name, verb, color) => {
      const el = document.createElement("div");
      el.className = cls;
      if (color) el.style.setProperty("--role", color);
      el.innerHTML = `${art}<span class="name">${esc(name)}</span><span class="verb">${esc(verb)}</span>`;
      stage.append(el);
      return el;
    };
    roles.forEach((r) => { const info = role(r); nodes[r] = make("station", consoleArt, info.label, info.verb, info.color); });
    nodes.tool = make("rack", rackArt, "Tools", "Sandboxed, on device");
    nodes.gate = make("gate", gateArt, "Grounding gate", "");
    const state = document.createElement("span");
    state.className = "state";
    nodes.gate.querySelector(".verb").replaceWith(state);

    const w = stage.clientWidth;
    const narrow = w < 600;
    ICON_DY = narrow ? 20 : 26;
    const pos = {};
    if (narrow) {
      const perRow = roles.length > 4 ? 3 : Math.min(roles.length, 3);
      const rows = Math.ceil(roles.length / perRow);
      const rowH = 132;
      roles.forEach((r, i) => {
        const row = Math.floor(i / perRow);
        const inRow = Math.min(perRow, roles.length - row * perRow);
        const col = i % perRow;
        pos[r] = [(col + 0.5) * (w / inRow), 78 + row * rowH];
      });
      const y = 78 + rows * rowH + 18;
      pos.tool = [w * 0.27, y];
      pos.gate = [w * 0.73, y];
      stage.style.height = `${y + 92}px`;
    } else {
      stage.style.height = "";
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
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "links-layer");
    svg.setAttribute("aria-hidden", "true");
    const line = (a, b) => {
      const l = document.createElementNS(svgNS, "line");
      l.setAttribute("x1", a[0]); l.setAttribute("y1", a[1] - ICON_DY); l.setAttribute("x2", b[0]); l.setAttribute("y2", b[1] - ICON_DY);
      svg.append(l);
    };
    for (let i = 1; i < roles.length; i += 1) line(pos[roles[i - 1]], pos[roles[i]]);
    roles.forEach((r) => {
      if (role(r).usesTools) line(pos[r], pos.tool);
      if (role(r).judges) line(pos[r], pos.gate);
    });
    stage.prepend(svg);
    centers = pos;
    Object.entries(pos).forEach(([k, [x, y]]) => { nodes[k].style.left = `${x}px`; nodes[k].style.top = `${y}px`; });
    pulse = document.createElement("span");
    pulse.className = "pulse";
    stage.append(pulse);
  }

  function travel(from, to) {
    if (!pulse || !centers[from] || !centers[to] || reduce) return;
    const [x1, y1] = centers[from];
    const [x2, y2] = centers[to];
    pulse.animate([
      { transform: `translate(${x1}px, ${y1 - ICON_DY}px)`, opacity: 0 },
      { transform: `translate(${x1}px, ${y1 - ICON_DY}px)`, opacity: 1, offset: 0.12 },
      { transform: `translate(${x2}px, ${y2 - ICON_DY}px)`, opacity: 1, offset: 0.88 },
      { transform: `translate(${x2}px, ${y2 - ICON_DY}px)`, opacity: 0 }
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

  function apply(i, animate) {
    const e = events[i];
    const d = describe(e);
    Object.values(nodes).forEach((n) => n.classList.remove("lit"));
    const key = e.kind === "result" ? "tool" : e.agent;
    if (nodes[key]) nodes[key].classList.add("lit");
    caption.style.setProperty("--role", key === "tool" ? "var(--ink)" : role(key).color);
    who.textContent = d.who;
    what.textContent = d.text;
    when.textContent = `${clock(e.t_sec ?? i * 4)} replay clock, event ${i + 1} of ${events.length}`;
    const gateState = nodes.gate.querySelector(".state");
    if (d.verdict) {
      nodes.gate.dataset.verdict = d.verdict;
      gateState.textContent = d.verdict === "accept" ? "Accepted" : d.verdict === "refuse" ? "Refused" : "Revise";
      nodes.gate.classList.add("lit");
    }
    if (i === events.length - 1 && mission) {
      const final = mission.status === "refuse" ? "refuse" : "answer";
      nodes.gate.dataset.verdict = final;
      gateState.textContent = final === "refuse" ? "Refused" : "Answer kept";
      nodes.gate.classList.add("lit");
      if (mission.answer) {
        who.textContent = "Grounding gate";
        caption.style.setProperty("--role", "var(--accent)");
        what.textContent = `${final === "refuse" ? "Refused" : "Kept"}: ${mission.answer}`;
      }
    }
    if (bar) bar.style.transform = `scaleX(${(i + 1) / events.length})`;
    if (animate) {
      if (d.toTools) travel(e.agent, "tool");
      else if (e.kind === "result") travel("tool", nextActor(i));
      else if (d.verdict === "accept" || d.verdict === "refuse") travel(e.agent, "gate");
      else travel(e.agent, nextActor(i));
    }
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
    timer = setTimeout(tick, STEP_MS);
  }

  function reset() {
    cursor = 0;
    Object.values(nodes).forEach((n) => n.classList.remove("lit"));
    if (nodes.gate) { delete nodes.gate.dataset.verdict; nodes.gate.querySelector(".state").textContent = ""; }
    who.textContent = "Orbit";
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
    events = rows.filter((r) => r.kind !== "mission" && r.kind !== "message");
    question.textContent = mission ? mission.question : "";
    const scripted = mission && mission.harness === "scripted_harness";
    tags.innerHTML = `<span class="scene-tag">Replay of a saved engine trace</span>${scripted ? `<span class="scene-tag warn">Scripted harness</span>` : ""}<span class="scene-tag">Not live</span><span class="scene-tag">Not a model score</span><span class="scene-tag">Task ${esc(mission ? mission.task_id : "")}</span>`;
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
  select.addEventListener("change", () => load(select.value).then(() => { if (!reduce) setPlaying(true); }));

  let resizeTimer;
  let lastW = stage.clientWidth;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (Math.abs(stage.clientWidth - lastW) < 2) return;
      lastW = stage.clientWidth;
      const at = cursor;
      layout();
      for (let i = 0; i < at; i += 1) apply(i, false);
    }, 150);
  });

  load(select.value).then(() => {
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
