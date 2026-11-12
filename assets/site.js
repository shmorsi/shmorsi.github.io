/* Sherif Morsi: theme, header, menu, reveals, the hero illustration, and every figure from data/projects.json.
   Every page reads correctly if this file fails to run: figures ship as fallback text, and nothing is hidden
   until this script adds the "motion" class. */
(() => {
  const html = document.documentElement;
  const root = document.body.dataset.root || "";
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduce = () => reduceQuery.matches;
  html.classList.add("motion");

  /* ---- Theme: dark by default; the toggle switches to light for this browser. ---------------- */
  const store = {
    get() { try { return localStorage.getItem("theme"); } catch { return null; } },
    set(value) { try { localStorage.setItem("theme", value); } catch { /* private mode */ } }
  };
  const currentTheme = () => html.dataset.theme || "dark";
  const themeListeners = [];
  const toggle = document.querySelector("[data-theme-toggle]");
  const paintToggle = () => {
    if (!toggle) return;
    toggle.setAttribute("aria-label", `Switch to ${currentTheme() === "dark" ? "light" : "dark"} theme`);
    toggle.dataset.mode = currentTheme();
  };
  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      html.dataset.theme = next;
      store.set(next);
      paintToggle();
      themeListeners.forEach((fn) => fn());
    });
  }
  paintToggle();

  /* ---- Header, menu, copy email ------------------------------------------------------------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); };
  onScroll();
  document.addEventListener("scroll", onScroll, { passive: true });

  const menuButton = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-site-nav]");
  if (menuButton && nav) {
    const close = () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "Menu";
      document.body.style.overflow = "";
    };
    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "Close" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
      if (open) nav.querySelector("a")?.focus();
    });
    nav.addEventListener("click", (event) => { if (event.target.closest("a")) close(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("open")) { close(); menuButton.focus(); }
    });
    window.matchMedia("(min-width: 901px)").addEventListener?.("change", close);
  }

  const copyStatus = document.querySelector("[data-copy-status]");
  let copyTimer;
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(button.dataset.copyEmail); } catch { /* still announce */ }
      if (!copyStatus) return;
      copyStatus.textContent = "Email copied";
      copyStatus.classList.add("show");
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => copyStatus.classList.remove("show"), 1800);
    });
  });

  /* ---- One calm reveal per block; charts draw themselves in as they arrive. ----------------- */
  const reveal = (scope) => {
    const nodes = [...(scope || document).querySelectorAll("[data-reveal]:not(.in)")];
    if (!nodes.length) return;
    if (reduce() || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => node.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    nodes.forEach((node) => io.observe(node));
  };

  /* ---- Master page: highlight the section in view. ------------------------------------------ */
  const sectionLinks = new Map();
  document.querySelectorAll("[data-section]").forEach((anchor) => sectionLinks.set(anchor.dataset.section, anchor));
  if (sectionLinks.size && "IntersectionObserver" in window) {
    const hero = document.querySelector(".hero");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach((item) => item.removeAttribute("aria-current"));
        sectionLinks.get(entry.target.id)?.setAttribute("aria-current", "true"); /* the hero has no link: nothing is current */
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    if (hero) io.observe(hero);
    sectionLinks.forEach((_, id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* ---- Project pages: the sticky section index, built from the page's own headings. --------- */
  const subnav = document.querySelector("[data-subnav]");
  if (subnav) {
    const heads = [...document.querySelectorAll(".cs-section > h2[id]")];
    const list = document.createElement("ol");
    heads.forEach((h) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `#${h.id}`;
      a.textContent = h.textContent;
      li.append(a);
      list.append(li);
    });
    subnav.replaceChildren(list);
    if ("IntersectionObserver" in window) {
      const byId = new Map([...list.querySelectorAll("a")].map((a) => [a.hash.slice(1), a]));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          byId.forEach((a) => a.removeAttribute("aria-current"));
          const a = byId.get(entry.target.id);
          if (!a) return;
          a.setAttribute("aria-current", "true");
          const li = a.parentElement; /* scroll the index only when the active link is out of view */
          const left = li.offsetLeft - list.offsetLeft;
          if (left < list.scrollLeft || left + li.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = Math.max(0, left - 16);
        });
      }, { rootMargin: "-30% 0px -60% 0px" });
      heads.forEach((h) => io.observe(h));
    }
  }

  /* ---- Video slots: a screenshot stands in until a walkthrough video is added. -------------- */
  document.querySelectorAll("[data-video-src]").forEach((slot) => {
    const src = slot.dataset.videoSrc;
    if (!src) return;
    const video = document.createElement("video");
    video.muted = true; video.loop = true; video.playsInline = true; video.preload = "none";
    if (slot.dataset.videoPoster) video.poster = slot.dataset.videoPoster;
    video.setAttribute("aria-label", slot.dataset.videoLabel || "Walkthrough video, no sound");
    const source = document.createElement("source");
    source.src = src;
    source.type = src.endsWith(".mp4") ? "video/mp4" : "video/webm";
    video.append(source);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button play";
    button.textContent = "Play";
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (video.paused) { video.play(); button.textContent = "Pause"; button.setAttribute("aria-pressed", "true"); }
      else { video.pause(); button.textContent = "Play"; button.setAttribute("aria-pressed", "false"); }
    });
    (slot.querySelector("[data-video-holder]") || slot).replaceChildren(video, button);
  });

  /* ---- An embedded tool (World Shock Lab's map) reports its own height; the frame takes it. ---- */
  const labFrame = document.querySelector("[data-lab-frame]");
  if (labFrame) {
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin || event.source !== labFrame.contentWindow) return;
      const h = event.data && Number(event.data.labHeight);
      if (h > 200 && h < 6000) labFrame.style.height = `${Math.ceil(h)}px`;
    });
  }

  /* ---- Figures: every number on the site is read from data/projects.json. ------------------- */
  const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
  const isText = (value) => !/[0-9]/.test(String(value));
  const figureHtml = (project) => {
    const stat = project.stats[project.headline.stat];
    const size = isText(stat.display) ? " is-text" : String(stat.display).length > 7 ? " is-long" : "";
    return `<div class="figure-block">
      <p class="hero-fig${size}">${esc(stat.display)}</p>
      <p class="fig-label">${esc(stat.label)}</p>
      <p class="qualifier">${esc(project.headline.qualifier)}</p>
    </div>`;
  };
  const specHtml = (project, ids) => `<dl class="spec">${ids.map((id) => project.stats[id]).filter(Boolean)
    .map((stat) => `<div><dt>${esc(stat.label)}</dt><dd>${esc(stat.display)}</dd></div>`).join("")}</dl>`;
  const tableHtml = (table) => {
    const head = table.headers.map((cell) => `<th scope="col">${esc(cell)}</th>`).join("");
    const body = table.rows.map((row, r) => `<tr${table.highlightRow === r ? ` class="is-best"` : ""}>${row
      .map((cell, i) => (i === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`)).join("")}</tr>`).join("");
    /* The visible caption sits outside the table, pinned to the visible width, so a phone never cuts it off
       when the table scrolls sideways; screen readers still get the real <caption>. */
    return `<p class="table-caption" aria-hidden="true">${esc(table.caption)}</p>` +
      `<table><caption class="visually-hidden">${esc(table.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  };
  const lookup = (byId, path) => {
    const [id, ...rest] = path.split(".");
    let cursor = byId[id];
    rest.forEach((key) => { cursor = cursor == null ? undefined : cursor[key]; });
    return cursor;
  };
  const hydrate = (data) => {
    const byId = Object.fromEntries(data.projects.map((project) => [project.id, project]));
    document.querySelectorAll("[data-headline]").forEach((node) => {
      const project = byId[node.dataset.headline];
      if (!project) return;
      const stat = project.stats[project.headline.stat];
      const fig = node.querySelector(".fig");
      const label = node.querySelector(".fig-label");
      if (fig) fig.textContent = stat.display;
      if (label) label.textContent = stat.label;
    });
    document.querySelectorAll("[data-bind]").forEach((node) => {
      const value = lookup(byId, node.dataset.bind);
      if (value != null) node.textContent = String(value);
    });
    document.querySelectorAll("[data-table]").forEach((node) => {
      const table = lookup(byId, node.dataset.table);
      node.innerHTML = table ? tableHtml(table) : `<p class="caveat">Missing table ${esc(node.dataset.table)} in data/projects.json.</p>`;
    });
    document.querySelectorAll("[data-glance]").forEach((node) => {
      const project = byId[node.dataset.glance];
      if (!project) return;
      const ids = (project.glanceIds || []).filter((id) => id !== project.headline.stat);
      node.innerHTML = `${figureHtml(project)}${specHtml(project, ids)}`;
    });
    reveal(document);
  };
  const metricsUrl = document.body.dataset.metrics;
  if (metricsUrl) {
    fetch(metricsUrl)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then(hydrate)
      .catch(() => { /* the fallback text already on the page is the same data */ });
  }

  /* ---- Hero illustration: end-to-end learning for a long-only portfolio. ---------------------
     Prices stream in on the left, a small network attends across them, and its outputs set the
     portfolio's weights on the right. Amber pulses run backwards: the gradient of the result.
     A seeded random walk, not market data. Point at a stock to trace it; click its price line to
     shock it. Paused off screen, in background tabs and on request; a still frame under reduced motion. */
  const canvas = document.querySelector("[data-market]");
  if (canvas) {
    const g = canvas.getContext("2d");
    const pauseButton = document.querySelector("[data-market-pause]");
    const N = 6;           /* assets */
    const H = 7;           /* hidden units per layer */
    const LEN = 96;        /* points on screen per price path */
    let seed = 20261108;
    const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
    const gauss = () => { let u = 0; while (u === 0) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); };
    const assets = Array.from({ length: N }, () => ({ drift: (rand() - 0.5) * 0.008, vol: 0.012 + rand() * 0.014, path: [], shock: 0 }));
    const tick = (a) => {
      const last = a.path.length ? a.path[a.path.length - 1] : 0;
      a.path.push(last + a.drift + a.vol * gauss());
      if (a.path.length > LEN) a.path.shift();
    };
    assets.forEach((a) => { for (let i = 0; i < LEN; i += 1) tick(a); });

    /* The "model": 24-step momentum through a softmax, so the portfolio is long-only and fully invested. */
    const signal = () => {
      const m = assets.map((a) => a.path[a.path.length - 1] - a.path[Math.max(0, a.path.length - 25)]);
      const e = m.map((x) => Math.exp(6 * x));
      const total = e.reduce((s, x) => s + x, 0);
      return e.map((x) => x / total);
    };
    let target = signal();
    const shown = target.slice();

    /* Attention: each hidden-to-hidden edge brightens on its own slow cycle. */
    const phase = Array.from({ length: H * H }, () => [0.25 + rand() * 0.6, rand() * Math.PI * 2]);
    const route = (from) => [from ?? Math.floor(rand() * N), Math.floor(rand() * H), Math.floor(rand() * H), Math.floor(rand() * N)];
    const pulses = Array.from({ length: 16 }, (_, i) => ({ path: route(), t: (i / 16) * 3, speed: 0.55 + rand() * 0.35, back: false }));
    for (let i = 0; i < 3; i += 1) pulses.push({ path: route(), t: i, speed: 0.4 + rand() * 0.15, back: true });

    let W = 0; let Hc = 0; let geo = null; let hover = -1;
    let colors = {};
    const readColors = () => {
      const css = getComputedStyle(html);
      const get = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
      colors = { ink: get("--ink", "#f4f5f7"), accent: get("--accent", "#8ec5ff"), warm: get("--warm", "#f2b450"), bg: get("--bg", "#000"), dim: get("--dim", "#8c8f97") };
    };
    const rgba = (hex, a) => {
      const h = hex.replace("#", "");
      const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
      const n = parseInt(full, 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };
    const layout = () => {
      const box = canvas.getBoundingClientRect();
      W = box.width; Hc = box.height;
      if (!W || !Hc) return;
      const dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(Hc * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const small = W < 520;
      const top = small ? 30 : 40;
      const bottom = Hc - (small ? 26 : 30);
      const row = (i) => top + ((bottom - top) * (i + 0.5)) / N;
      const hid = (j) => top + ((bottom - top) * (j + 0.5)) / H;
      geo = {
        small, top, bottom, row, hid,
        p0: 0, p1: W * 0.3,
        xIn: W * 0.355, xH1: W * 0.47, xH2: W * 0.585, xOut: W * 0.7,
        b0: W * 0.76, b1: W, band: ((bottom - top) / N) * 0.62
      };
      geo.zero = geo.b0 + 6;                 /* every weight starts from the left: nothing is short */
    };
    const nodeXY = (layer, index) => {
      if (layer === 0) return [geo.xIn, geo.row(index)];
      if (layer === 1) return [geo.xH1, geo.hid(index)];
      if (layer === 2) return [geo.xH2, geo.hid(index)];
      return [geo.xOut, geo.row(index)];
    };
    const label = (text, x, y, align, color) => {
      g.font = `600 ${geo.small ? 9.5 : 10.5}px "Inter Tight", Arial, sans-serif`;
      if ("letterSpacing" in g) g.letterSpacing = "1.6px";
      g.fillStyle = color || rgba(colors.dim, 1);
      g.textAlign = align;
      g.fillText(text, x, y);
      if ("letterSpacing" in g) g.letterSpacing = "0px";
    };
    const paint = (time) => {
      if (!geo) return;
      const { row, hid, top, bottom } = geo;
      const focus = hover;
      g.clearRect(0, 0, W, Hc);

      /* Column titles and the zero line of the book. */
      label("PRICES", geo.p0, top - 18, "left");
      label("MODEL", (geo.xIn + geo.xOut) / 2, top - 18, "center");
      label("PORTFOLIO", geo.b1, top - 18, "right");
      g.strokeStyle = rgba(colors.ink, 0.22);
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(geo.zero + 0.5, top - 6); g.lineTo(geo.zero + 0.5, bottom + 6); g.stroke();

      /* Price paths, each scaled to its own band; a faint lead line into the network. */
      assets.forEach((a, i) => {
        const y0 = row(i);
        let lo = Infinity; let hi = -Infinity;
        a.path.forEach((v) => { if (v < lo) lo = v; if (v > hi) hi = v; });
        const span = hi - lo || 1;
        const x = (k) => geo.p0 + ((geo.p1 - geo.p0) * k) / (LEN - 1);
        const y = (v) => y0 + geo.band / 2 - ((v - lo) / span) * geo.band;
        const lit = focus === i;
        const dimmed = focus >= 0 && !lit;
        g.strokeStyle = lit ? colors.accent : rgba(colors.ink, dimmed ? 0.28 : 0.62);
        g.lineWidth = lit ? 1.6 : 1.1;
        g.beginPath();
        a.path.forEach((v, k) => (k ? g.lineTo(x(k), y(v)) : g.moveTo(x(k), y(v))));
        g.stroke();
        const lx = x(a.path.length - 1); const ly = y(a.path[a.path.length - 1]);
        g.strokeStyle = rgba(lit ? colors.accent : colors.ink, lit ? 0.6 : 0.12);
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(geo.xIn, y0); g.stroke();
        g.fillStyle = a.shock > 0 ? colors.warm : colors.accent;
        g.beginPath(); g.arc(lx, ly, a.shock > 0 ? 3.2 : 2, 0, Math.PI * 2); g.fill();
      });

      /* Edges: a faint mesh, with attention picking out a few at a time. */
      g.lineWidth = 1;
      g.strokeStyle = rgba(colors.ink, focus >= 0 ? 0.04 : 0.06);
      g.beginPath();
      for (let i = 0; i < N; i += 1) for (let j = 0; j < H; j += 1) { g.moveTo(geo.xIn, row(i)); g.lineTo(geo.xH1, hid(j)); }
      for (let j = 0; j < H; j += 1) for (let k = 0; k < H; k += 1) { g.moveTo(geo.xH1, hid(j)); g.lineTo(geo.xH2, hid(k)); }
      for (let k = 0; k < H; k += 1) for (let m = 0; m < N; m += 1) { g.moveTo(geo.xH2, hid(k)); g.lineTo(geo.xOut, row(m)); }
      g.stroke();
      if (focus >= 0) { /* trace the focused stock: its fan into the network and out to its own weight */
        g.strokeStyle = rgba(colors.accent, 0.35);
        g.beginPath();
        for (let j = 0; j < H; j += 1) { g.moveTo(geo.xIn, row(focus)); g.lineTo(geo.xH1, hid(j)); g.moveTo(geo.xH2, hid(j)); g.lineTo(geo.xOut, row(focus)); }
        g.stroke();
      }
      for (let j = 0; j < H; j += 1) {
        for (let k = 0; k < H; k += 1) {
          const [w, ph] = phase[j * H + k];
          const a = 0.5 + 0.5 * Math.sin(time * w + ph);
          if (a < 0.82) continue;
          g.strokeStyle = rgba(colors.accent, (a - 0.82) * 2.6);
          g.beginPath(); g.moveTo(geo.xH1, hid(j)); g.lineTo(geo.xH2, hid(k)); g.stroke();
        }
      }

      /* Pulses: forward in accent, the gradient backward in amber. */
      pulses.forEach((p) => {
        const seg = Math.min(2, Math.floor(p.t));
        const f = p.t - seg;
        const layers = p.back ? [3 - seg, 2 - seg] : [seg, seg + 1];
        const idx = p.back ? [p.path[3 - seg], p.path[2 - seg]] : [p.path[seg], p.path[seg + 1]];
        const [ax, ay] = nodeXY(layers[0], idx[0]);
        const [bx, by] = nodeXY(layers[1], idx[1]);
        const px = ax + (bx - ax) * f; const py = ay + (by - ay) * f;
        const color = p.back ? colors.warm : colors.accent;
        g.strokeStyle = rgba(color, p.back ? 0.5 : 0.35);
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(ax + (bx - ax) * Math.max(0, f - 0.35), ay + (by - ay) * Math.max(0, f - 0.35)); g.lineTo(px, py); g.stroke();
        g.save();
        g.shadowColor = color; g.shadowBlur = 8;
        g.fillStyle = color;
        g.beginPath(); g.arc(px, py, p.back ? 2.4 : 2, 0, Math.PI * 2); g.fill();
        g.restore();
      });

      /* Nodes. */
      const node = (x, y, r, fill, ring) => {
        g.fillStyle = fill || colors.bg;
        g.strokeStyle = ring || rgba(colors.ink, 0.55);
        g.lineWidth = 1;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
      };
      for (let i = 0; i < N; i += 1) node(geo.xIn, row(i), 3, null, i === focus ? colors.accent : null);
      for (let j = 0; j < H; j += 1) { node(geo.xH1, hid(j), 3.4); node(geo.xH2, hid(j), 3.4); }
      const peak = Math.max(...shown.map(Math.abs)) || 1;
      for (let m = 0; m < N; m += 1) node(geo.xOut, row(m), 3.6, shown[m] > 0 ? rgba(colors.accent, 0.25 + 0.75 * (shown[m] / peak)) : null, m === focus ? colors.accent : null);

      /* The portfolio: one bar per stock, its share of the money. Long-only, so every bar grows to the right. */
      const span = geo.b1 - geo.zero - 4;
      shown.forEach((w, m) => {
        const y = row(m);
        const len = Math.max(1, (w / peak) * span);
        const h = Math.max(6, Math.min(14, geo.band * 0.42));
        const lit = m === focus;
        g.fillStyle = lit ? colors.accent : rgba(colors.accent, 0.35 + 0.65 * (w / peak));
        g.fillRect(geo.zero + 1, y - h / 2, len, h);
        g.strokeStyle = rgba(colors.ink, lit ? 0.3 : 0.1);
        g.beginPath(); g.moveTo(geo.xOut + 4, y); g.lineTo(geo.zero - 2, y); g.stroke();
      });

      /* The traced stock, in words. */
      if (focus >= 0) {
        const w = shown[focus];
        const a = assets[focus];
        const mom = a.path[a.path.length - 1] - a.path[Math.max(0, a.path.length - 25)];
        const side = `${(100 * w).toFixed(0)}% OF THE PORTFOLIO`;
        const text = `${a.shock > 0 ? "SHOCKED · " : ""}STOCK ${focus + 1} · ${mom >= 0 ? "+" : "−"}${Math.abs(100 * mom).toFixed(1)}% → ${side}`;
        label(text, geo.p0, bottom + 20, "left", a.shock > 0 ? colors.warm : colors.accent);
      }
    };

    let raf = 0; let last = 0; let clock = 0; let since = 0; let steps = 0;
    let onScreen = true; let paused = false;
    const rebalance = () => { target = signal(); };
    const frame = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now; clock += dt; since += dt;
      if (since > 0.14) {                         /* a new price every 140 ms */
        since = 0; steps += 1;
        assets.forEach(tick);
        assets.forEach((a) => { if (a.shock > 0) a.shock -= 1; });
        if (steps % 220 === 0) assets.forEach((a) => { a.drift = (rand() - 0.5) * 0.008; });
        if (steps % 12 === 0) rebalance();
      }
      shown.forEach((w, m) => { shown[m] = w + (target[m] - w) * Math.min(1, dt * 2.2); });
      pulses.forEach((p) => {
        p.t += dt * p.speed;
        if (p.t >= 3) { p.t = 0; p.path = route(); }
      });
      paint(clock);
      raf = onScreen && !document.hidden && !paused ? requestAnimationFrame(frame) : 0;
    };
    const start = () => { if (!raf && onScreen && !document.hidden && !paused) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const still = () => { layout(); paint(clock || 4); };
    const paintPause = () => {
      if (!pauseButton) return;
      pauseButton.textContent = paused ? "Play" : "Pause";
      pauseButton.setAttribute("aria-pressed", String(paused));
      pauseButton.setAttribute("aria-label", paused ? "Play the illustration" : "Pause the illustration");
    };
    paused = reduce();               /* reduced motion: a still frame until the reader asks for motion */
    paintPause();
    pauseButton?.addEventListener("click", () => {
      paused = !paused;
      paintPause();
      if (paused) { stop(); paint(clock || 4); } else start();
    });

    /* Point at a stock to trace it; click its price line to shock it. */
    const rowAt = (event) => {
      if (!geo) return -1;
      const box = canvas.getBoundingClientRect();
      const x = event.clientX - box.left; const y = event.clientY - box.top;
      if (y < geo.top - 8 || y > geo.bottom + 8) return -1;
      const i = Math.floor(((y - geo.top) / (geo.bottom - geo.top)) * N);
      return x < 0 || x > W ? -1 : Math.max(0, Math.min(N - 1, i));
    };
    canvas.addEventListener("pointermove", (event) => {
      const i = rowAt(event);
      if (i !== hover) { hover = i; canvas.style.cursor = i >= 0 ? "pointer" : ""; if (!raf) paint(clock || 4); }
    });
    canvas.addEventListener("pointerleave", () => { hover = -1; canvas.style.cursor = ""; if (!raf) paint(clock || 4); });
    canvas.addEventListener("click", (event) => {
      const i = rowAt(event);
      if (i < 0) return;
      const a = assets[i];
      const last = a.path[a.path.length - 1];
      a.path.push(last - 0.12);                   /* a 12% drop in one step */
      a.path.shift();
      a.shock = 40;                               /* steps the marker stays amber */
      hover = i;
      rebalance();                                /* the model reacts at once */
      if (!raf) { shown.forEach((_, m) => { shown[m] = target[m]; }); paint(clock || 4); }
    });

    readColors();
    still();
    themeListeners.push(() => { readColors(); if (!raf) paint(clock || 4); });
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { layout(); paint(clock || 4); }, 120);
    }, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; if (onScreen) start(); else stop(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else start(); });
    reduceQuery.addEventListener?.("change", () => { paused = reduce(); paintPause(); if (paused) { stop(); still(); } else start(); });
    document.fonts?.ready.then(() => { if (!raf) paint(clock || 4); });
    start();
  }

  /* ---- Shared helpers for the interactive pieces. ------------------------------------------------ */
  const minus = (x, digits = 2) => `${x < 0 ? "−" : ""}${Math.abs(x).toFixed(digits)}`;
  const signed = (x, digits = 2) => { /* a sign only when the rounded value is not zero (the same rule as scripts/lab.py) */
    const text = Math.abs(x).toFixed(digits);
    return Number(text) === 0 ? text : `${x > 0 ? "+" : "−"}${text}`;
  };
  const pctText = (x) => `${Math.round(100 * x)}%`;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthText = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
  /* A row of role="radio" buttons: click or arrow keys move the choice. */
  const radioGroup = (group, onChange) => {
    const radios = [...group.querySelectorAll('[role="radio"]')];
    const choose = (radio, focus) => {
      radios.forEach((r) => {
        const on = r === radio;
        r.setAttribute("aria-checked", String(on));
        r.tabIndex = on ? 0 : -1;
      });
      if (focus) radio.focus();
      onChange(radio);
    };
    radios.forEach((r) => { r.tabIndex = r.getAttribute("aria-checked") === "true" ? 0 : -1; });
    radios.forEach((r, i) => {
      r.addEventListener("click", () => choose(r, false));
      r.addEventListener("keydown", (event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        choose(radios[(i + step + radios.length) % radios.length], true);
      });
    });
  };
  const onceVisible = (node, fn) => {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      fn();
    }, { threshold: 0.35 });
    io.observe(node);
  };

  /* ---- Plain-English definitions: a dotted word opens one on hover, focus or tap. ---------------- */
  const GLOSSARY = {
    "sharpe": ["Sharpe ratio", "Average yearly return above cash divided by how much it swings. It rewards steady gains; the US stock market's was about 0.5 from 1960 to today."],
    "kelly": ["Growth of wealth (the Kelly criterion)", "The rate at which money compounds: roughly the average return minus half its variance. Maximising it is the Kelly criterion, the best rule for an investor who reinvests for decades. Two portfolios with the same average return grow at different speeds if one swings more."],
    "cagr": ["CAGR", "Compound annual growth rate: the steady yearly return that would turn $1 into the same final amount."],
    "survivorship": ["Survivorship bias", "Testing only on companies that exist today flatters the past, because the failures are left out. Industry portfolios avoid it: at every date they held every listed firm in the industry, including the ones that later failed."],
    "active-share": ["Differs from the index", "Half the sum of the gaps between the portfolio's weights and the market's: 0% is the index itself, 100% shares nothing with it."],
    "turnover": ["Traded per year", "The share of the portfolio sold and bought again in a year. Low turnover means low costs and taxes: closer to buy and hold."],
    "transformer": ["Transformer", "The neural-network design behind modern language models. Attention lets every input weigh every other input; here, every industry weighs every other industry before the network decides."],
    "end-to-end": ["End-to-end training", "Training the network on the final result, the growth of the portfolio's wealth after costs, instead of on how well it forecasts returns."],
    "differentiable": ["Differentiable simulator", "A simulator of the investing rules (prices move the holdings, every trade costs money) written so that gradients flow back through every month, letting the network learn from the wealth it ends up with."],
    "t-stat": ["t-statistic", "How many standard errors an estimate sits from zero. Below about 2, the edge could plausibly be luck, so it is reported as not significant."],
    "beta": ["Beta", "How much a portfolio moves with the market. 1 moves with it; 0.5 moves half as much."],
    "drawdown": ["Drawdown", "The fall from a previous high. The worst drawdown is the deepest such fall over the whole period."],
    "walk-forward": ["Walk-forward", "Every model is refit using only the data available at that date and judged on the months after it, as if it were trading live. No look-ahead."],
    "bp": ["Basis point (bp)", "One hundredth of a percentage point. A 10 bp surprise means the 2-year yield moved 0.10 points more than markets expected on the decision."],
    "prompt-injection": ["Prompt injection", "Instructions hidden in a web page, email or file that try to make an AI agent do something its user never asked for."],
    "crps": ["CRPS", "Continuous ranked probability score: how far a whole forecast distribution lands from what happened. Lower is better; 0.688× means 31% lower than the baseline."],
    "ci": ["Confidence interval", "The range the true value plausibly lies in. When it excludes the baseline, the difference is unlikely to be chance."],
    "pre-registered": ["Pre-registered", "The test, the metrics and the rule for reading a disappointing answer were fixed in git before the result was computed, so the answer cannot steer the question."],
    "funded-ratio": ["Funded ratio", "What a pension plan holds divided by what its promises are worth today. At 100% it could pay everything it owes; at 90% it is 10 cents short on every dollar."],
    "liability": ["Liability", "What the plan owes: every pension payment it has promised, added up in today's money. It rises when interest rates fall, because money set aside today then earns less on the way to each payment."],
    "sponsor": ["Sponsor", "Whoever stands behind the plan, usually the employer or a government. When the plan is short, the sponsor pays in the difference."],
    "glide-path": ["Glide path", "A rule for de-risking: hold more stocks while the plan is short of its promises, and move into safer bonds as it fills up."],
    "duration": ["Duration", "How much a value moves when interest rates move. A duration of 14 years means a one-point rise in rates cuts the value by about 14%."],
    "matching-bonds": ["Matching bonds", "Bonds chosen so that their payments line up with the pensions owed. When interest rates move, they rise and fall together with the promise, so the gap between them stays put."],
    "expected-shortfall": ["Worst 5% (expected shortfall)", "The average result across the worst one in twenty cases. It answers how bad it gets when it goes badly, which an average hides."],
    "scenario": ["Simulated future", "One possible path for stocks, interest rates and prices over the next 20 years, built by rearranging what has actually happened since 1953."],
  };
  const terms = [...document.querySelectorAll(".term[data-term]")].filter((t) => GLOSSARY[t.dataset.term]);
  if (terms.length) {
    const pop = document.createElement("div");
    pop.className = "term-pop";
    pop.id = "term-pop";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    document.body.append(pop);
    let owner = null; let pinned = false; let hideTimer;
    const place = () => {
      if (!owner) return;
      const r = owner.getBoundingClientRect();
      const w = Math.min(320, window.innerWidth - 32);
      pop.style.width = `${w}px`;
      const left = Math.max(16, Math.min(window.innerWidth - w - 16, r.left + r.width / 2 - w / 2));
      pop.style.left = `${left}px`;
      const below = r.bottom + 10;
      const h = pop.offsetHeight;
      pop.style.top = `${below + h > window.innerHeight - 12 ? Math.max(12, r.top - h - 10) : below}px`;
    };
    const show = (term, pin) => {
      clearTimeout(hideTimer);
      if (owner && owner !== term) owner.removeAttribute("aria-describedby");
      owner = term;
      pinned = pin;
      const [title, text] = GLOSSARY[term.dataset.term];
      pop.innerHTML = `<b>${esc(title)}</b>${esc(text)}`;
      pop.hidden = false;
      term.setAttribute("aria-describedby", "term-pop");
      term.setAttribute("aria-expanded", "true");
      place();
    };
    const hide = () => {
      pop.hidden = true;
      if (owner) { owner.removeAttribute("aria-describedby"); owner.setAttribute("aria-expanded", "false"); }
      owner = null; pinned = false;
    };
    terms.forEach((term) => {
      term.setAttribute("aria-expanded", "false");
      term.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") show(term, false); });
      term.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse" && !pinned) hideTimer = setTimeout(hide, 120); });
      term.addEventListener("focus", () => show(term, false));
      term.addEventListener("blur", () => { if (!pinned) hide(); });
      term.addEventListener("click", (event) => {
        event.stopPropagation();
        if (owner === term && pinned) hide(); else show(term, true);
      });
    });
    document.addEventListener("click", (event) => { if (owner && !pop.contains(event.target)) hide(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && owner) { const t = owner; hide(); t.focus(); } });
    window.addEventListener("scroll", () => { if (owner) place(); }, { passive: true });
    window.addEventListener("resize", () => { if (owner) place(); }, { passive: true });
  }

  /* ---- The wealth lab: $1 in 1960, one click per strategy, on the project's committed results. ---- */
  document.querySelectorAll("[data-lab]").forEach((root) => {
    const dataNode = root.querySelector(`[data-lab-data="${root.dataset.lab}"]`);
    if (!dataNode) return;
    const data = JSON.parse(dataNode.textContent);
    const steps = [...root.querySelectorAll(".step[data-step]")];
    const plot = root.querySelector("[data-lab-plot]");
    const focusPath = plot.querySelector(".ln-focus");
    const lines = new Map([...plot.querySelectorAll(".ln[data-s]")].map((p) => [p.dataset.s, p]));
    const cursor = plot.querySelector(".lab-cursor");
    const dot = plot.querySelector(".lab-dot");
    const read = plot.querySelector(".lab-read");
    const nameNode = root.querySelector("[data-lab-name]");
    const k = (key) => root.querySelector(`[data-k="${key}"]`);
    const vsLine = root.querySelector("[data-lab-vs]");
    const vsHtml = vsLine ? vsLine.innerHTML : "";
    const notes = [...root.querySelectorAll(".lab-take[data-take]")];
    const n = data.dates.length;
    const xp = (i) => (100 * i) / (n - 1);
    const yp = (v) => (100 * (Math.log(data.hi) - Math.log(v))) / (Math.log(data.hi) - Math.log(data.lo));
    const pathTo = (values, upto) => `M${values.slice(0, upto).map((v, i) => `${(10 * xp(i)).toFixed(1)} ${(3 * yp(v)).toFixed(1)}`).join(" L")}`;
    let current = (steps.find((b) => b.getAttribute("aria-pressed") === "true") || steps[0]).dataset.step;
    let drawRaf = 0;
    const draw = (sid, animate) => {
      cancelAnimationFrame(drawRaf);
      const values = data.series[sid];
      if (!animate || reduce()) { focusPath.setAttribute("d", pathTo(values, values.length)); return; }
      const t0 = performance.now();
      const run = (now) => {
        const f = Math.min(1, (now - t0) / 900);
        const eased = 1 - (1 - f) ** 3;
        focusPath.setAttribute("d", pathTo(values, Math.max(2, Math.round(eased * values.length))));
        if (f < 1) drawRaf = requestAnimationFrame(run);
      };
      drawRaf = requestAnimationFrame(run);
    };
    const select = (sid, animate) => {
      const button = steps.find((b) => b.dataset.step === sid);
      if (!button) return;
      current = sid;
      steps.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      lines.forEach((p, key) => p.classList.toggle("is-on", key === sid));
      plot.dataset.sel = sid;
      nameNode.textContent = button.querySelector(".step-name").textContent;
      ["wealth", "cagr", "dd", "traded"].forEach((key) => { k(key).textContent = button.dataset[key]; });
      if (vsLine) {
        if (button.dataset.vs) {
          vsLine.innerHTML = vsHtml;
          k("vs").textContent = button.dataset.vs;
          k("vst").textContent = button.dataset.vst;
          k("verdict").textContent = button.dataset.verdict;
        } else {
          vsLine.textContent = "The benchmark every other strategy is measured against.";
        }
      }
      notes.forEach((note) => note.classList.toggle("is-active", note.dataset.take === sid));
      draw(sid, animate);
      if (!plot.classList.contains("is-hover")) read.textContent = "";
    };
    steps.forEach((button, i) => {
      button.addEventListener("click", () => select(button.dataset.step, true));
      button.addEventListener("keydown", (event) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = steps[(i + step + steps.length) % steps.length];
        next.focus();
        select(next.dataset.step, true);
      });
    });
    root.querySelector("[data-lab-next]")?.addEventListener("click", () => {
      const i = steps.findIndex((b) => b.dataset.step === current);
      select(steps[(i + 1) % steps.length].dataset.step, true);
    });
    const at = (event) => {
      const box = plot.getBoundingClientRect();
      const i = Math.round(((event.clientX - box.left) / box.width) * (n - 1));
      return Math.max(0, Math.min(n - 1, i));
    };
    plot.addEventListener("pointermove", (event) => {
      const i = at(event);
      const v = data.series[current][i];
      cursor.style.left = `${xp(i)}%`;
      dot.style.top = `${yp(v)}%`;
      plot.classList.add("is-hover");
      read.textContent = `${monthText(data.dates[i])} · $1 → $${v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString("en-US")}`;
      read.classList.toggle("is-right", xp(i) < 40);
    });
    plot.addEventListener("pointerleave", () => { plot.classList.remove("is-hover"); read.textContent = ""; });
    select(current, false);
    onceVisible(root, () => draw(current, true));
  });

  /* ---- Inside the portfolio: the network's holdings against the market's, 1960 to today. -------- */
  const INDUSTRY_NAMES = {
    Food: "Food", Beer: "Beer and liquor", Smoke: "Tobacco", Games: "Recreation", Books: "Printing and publishing",
    Hshld: "Consumer goods", Clths: "Apparel", Hlth: "Healthcare", Chems: "Chemicals", Txtls: "Textiles",
    Cnstr: "Construction", Steel: "Steel", FabPr: "Fabricated products and machinery", ElcEq: "Electrical equipment",
    Autos: "Autos", Carry: "Aircraft, ships and rail", Mines: "Mining", Coal: "Coal", Oil: "Oil and gas",
    Util: "Utilities", Telcm: "Communication", Servs: "Business services", BusEq: "Business equipment and technology",
    Paper: "Business supplies and packaging", Trans: "Transportation", Whlsl: "Wholesale", Rtail: "Retail",
    Meals: "Restaurants and hotels", Fin: "Finance", Other: "Other"
  };
  document.querySelectorAll("[data-holdings]").forEach((fig) => {
    const plot = fig.querySelector("[data-h-plot]");
    const range = fig.querySelector("[data-h-range]");
    const play = fig.querySelector("[data-h-play]");
    const dateNode = fig.querySelector("[data-h-date]");
    const readNode = fig.querySelector("[data-h-read]");
    const hint = readNode.textContent;
    const statNode = (key) => fig.querySelector(`[data-h="${key}"]`);
    fetch(fig.dataset.holdings)
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((data) => {
        const h = data.holdings;
        const n = h.industries.length;
        /* Fixed order for the whole animation: by average market weight, largest first. */
        const avg = h.industries.map((_, i) => h.marketBp.reduce((s, row) => s + row[i], 0) / h.marketBp.length);
        const order = h.industries.map((_, i) => i).sort((a, b) => avg[b] - avg[a]);
        const top = Math.max(...h.deepBp.flat(), ...h.marketBp.flat()) / 10000;
        const ns = "http://www.w3.org/2000/svg";
        const W = n * 30; const HH = 300; const base = HH - 4;
        const scale = (base - 10) / top;
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", `0 0 ${W} ${HH}`);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("aria-hidden", "true");
        const make = (tag, attrs) => { const el = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k2, v]) => el.setAttribute(k2, v)); svg.append(el); return el; };
        make("line", { class: "zero", x1: 0, x2: W, y1: base, y2: base });
        const mkt = order.map((_, j) => make("rect", { class: "mkt", x: j * 30 + 3, width: 24, y: base, height: 0 }));
        const net = order.map((_, j) => make("rect", { class: "long", x: j * 30 + 8, width: 14, y: base, height: 0 }));
        const labels = document.createElement("div");
        labels.className = "book-sectors holdings-labels";
        labels.setAttribute("aria-hidden", "true");
        labels.innerHTML = order.map((i, j) => `<span style="left:${((j * 30 + 15) / W * 100).toFixed(2)}%">${esc(h.industries[i])}</span>`).join("");
        plot.replaceChildren(svg);
        plot.after(labels);
        let t = Number(range.value);
        let hover = -1;
        const name = (i) => INDUSTRY_NAMES[h.industries[i]] || h.industries[i];
        const describe = (i) => {
          const d = h.deepBp[t][i] / 100; const m = h.marketBp[t][i] / 100;
          return `${name(i)} (${h.industries[i]}) · network ${d.toFixed(1)}% · market ${m.toFixed(1)}% · ${(d / m).toFixed(2)}× its market weight`;
        };
        const update = () => {
          const d = h.deepBp[t]; const m = h.marketBp[t];
          order.forEach((i, j) => {
            const hd = (d[i] / 10000) * scale; const hm = (m[i] / 10000) * scale;
            net[j].setAttribute("y", base - hd); net[j].setAttribute("height", hd);
            mkt[j].setAttribute("y", base - hm); mkt[j].setAttribute("height", hm);
            net[j].setAttribute("class", `long${i === hover ? " hot" : ""}`);
          });
          const ratio = h.industries.map((_, i) => d[i] / Math.max(m[i], 1));
          const over = ratio.indexOf(Math.max(...ratio)); const under = ratio.indexOf(Math.min(...ratio));
          dateNode.textContent = monthText(h.dates[t]);
          statNode("over").textContent = `${h.industries[over]} ${ratio[over].toFixed(1)}×`;
          statNode("under").textContent = `${h.industries[under]} ${ratio[under].toFixed(1)}×`;
          statNode("active").textContent = `${Math.round(d.reduce((s, x, i) => s + Math.abs(x - m[i]), 0) / 200)}%`;
          statNode("kappa").textContent = h.kappa ? `${Math.round(100 * h.kappa[t])}% of the way` : "–";
          range.setAttribute("aria-valuetext", monthText(h.dates[t]));
          if (hover >= 0) readNode.textContent = describe(hover);
        };
        range.addEventListener("input", () => { t = Number(range.value); update(); });
        plot.addEventListener("pointermove", (event) => {
          const box = plot.getBoundingClientRect();
          const j = Math.floor(((event.clientX - box.left) / box.width) * n);
          const i = j >= 0 && j < n ? order[j] : -1;
          if (i !== hover) { hover = i; update(); if (i < 0) readNode.textContent = hint; }
        });
        plot.addEventListener("pointerleave", () => { hover = -1; update(); readNode.textContent = hint; });
        let timer = 0;
        const stopPlay = () => { clearInterval(timer); timer = 0; play.textContent = "Play"; play.setAttribute("aria-pressed", "false"); };
        play.addEventListener("click", () => {
          if (timer) { stopPlay(); return; }
          if (t >= h.dates.length - 1) t = 0;
          play.textContent = "Pause"; play.setAttribute("aria-pressed", "true");
          timer = setInterval(() => {
            t += 1; range.value = String(t); update();
            if (t >= h.dates.length - 1) stopPlay();
          }, reduce() ? 400 : 120);
        });
        range.addEventListener("pointerdown", stopPlay);
        update();
      })
      .catch(() => { plot.innerHTML = '<p class="caveat">The holdings could not be loaded. The numbers are in data/dpc_wealth.json.</p>'; });
  });

  /* ---- Your start year: $1 from any January to today, network against market. -------------------- */
  document.querySelectorAll("[data-start-toy]").forEach((fig) => {
    const D = JSON.parse(fig.querySelector("[data-start-data]").textContent);
    const slider = fig.querySelector("[data-start-year]");
    const out = fig.querySelector("[data-start-out]");
    const say = fig.querySelector("[data-start-say]");
    const set = (key, text) => { fig.querySelector(`[data-s="${key}"]`).textContent = text; };
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const end = `${MONTHS[Number(D.end.slice(5, 7)) - 1]} ${D.end.slice(0, 4)}`;
    const money = (x) => (x >= 100 ? `$${Math.round(x).toLocaleString("en-US")}` : `$${x.toFixed(2)}`);
    const pctText = (x) => `${(100 * x).toFixed(2)}%`;
    const update = () => {
      const i = Number(slider.value) - D.years[0];
      out.textContent = String(D.years[i]);
      set("deep", money(D.deep[i]));
      set("market", money(D.market[i]));
      set("cagrDeep", pctText(D.cagrDeep[i]));
      set("cagrMarket", pctText(D.cagrMarket[i]));
      const lead = D.deep[i] > D.market[i] ? "the network" : "the market";
      say.textContent = `Invested in January ${D.years[i]} and left to the rules until ${end}: ${lead} ended ahead, ` +
        `${pctText(D.cagrDeep[i])} a year for the network against ${pctText(D.cagrMarket[i])} for the market.`;
    };
    slider.addEventListener("input", update);
    update();
  });

  /* ---- How often to trade: the same network rebalanced every day, month, quarter or year. -------- */
  document.querySelectorAll("[data-schedules]").forEach((fig) => {
    const buttons = [...fig.querySelectorAll("[data-sched]")];
    const lines = [...fig.querySelectorAll("[data-sched-line]")];
    const say = fig.querySelector("[data-sched-say]");
    const pick = (button) => {
      buttons.forEach((b) => b.setAttribute("aria-checked", String(b === button)));
      lines.forEach((line) => line.classList.toggle("is-on", line.dataset.schedLine === button.dataset.sched));
      ["wealth", "gross", "traded", "cost", "vs", "vst", "verdict"].forEach((key) => {
        fig.querySelector(`[data-sk="${key}"]`).textContent = button.dataset[key];
      });
      say.textContent = button.dataset.say;
    };
    buttons.forEach((button, i) => {
      button.addEventListener("click", () => pick(button));
      button.addEventListener("keydown", (event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = buttons[(i + step + buttons.length) % buttons.length];
        next.focus();
        pick(next);
      });
    });
  });

  /* ---- How it learned: the five seeds of one walk-forward refit, picked from fourteen. ----------- */
  document.querySelectorAll("[data-training]").forEach((fig) => {
    const buttons = [...fig.querySelectorAll("[data-train]")];
    const groups = [...fig.querySelectorAll("[data-train-g], [data-train-y]")];
    const say = fig.querySelector("[data-train-say]");
    const pick = (button) => {
      const refit = button.dataset.train;
      buttons.forEach((b) => b.setAttribute("aria-checked", String(b === button)));
      groups.forEach((g) => g.classList.toggle("is-on", (g.dataset.trainG || g.dataset.trainY) === refit));
      ["improved", "gain", "val", "used"].forEach((key) => {
        fig.querySelector(`[data-tk="${key}"]`).textContent = button.dataset[key];
      });
      say.textContent = button.dataset.say;
    };
    buttons.forEach((button, i) => {
      button.addEventListener("click", () => pick(button));
      button.addEventListener("keydown", (event) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const next = buttons[(i + step + buttons.length) % buttons.length];
        next.focus();
        pick(next);
      });
    });
  });

  /* ---- Try it: why the network is trained on growth, not average return. ------------------------- */
  document.querySelectorAll("[data-growth-toy]").forEach((fig) => {
    const D = JSON.parse(fig.querySelector("[data-toy-data]").textContent);
    const [m1, m2] = D.mu; const [s1, s2] = D.sigma; const r = D.rho; const years = D.years;
    const slider = fig.querySelector("[data-toy-x]");
    const out = fig.querySelector("[data-toy-out]");
    const say = fig.querySelector("[data-toy-say]");
    const dotMean = fig.querySelector(".toy-dot-mean");
    const dotGrowth = fig.querySelector(".toy-dot-growth");
    const svgPath = fig.querySelector(".toy-growth");
    const tset = (key, text) => { fig.querySelector(`[data-t="${key}"]`).textContent = text; };
    const at = (x) => {
      const mean = (1 - x) * m1 + x * m2;
      const v = (1 - x) ** 2 * s1 ** 2 + x ** 2 * s2 ** 2 + 2 * x * (1 - x) * r * s1 * s2;
      return [mean, Math.sqrt(v), mean - v / 2];
    };
    const a = s1 ** 2 + s2 ** 2 - 2 * r * s1 * s2;
    const best = Math.min(1, Math.max(0, ((m2 - m1) + s1 ** 2 - r * s1 * s2) / a));
    /* The y-scale the build used, recovered from the drawn curve's end points. */
    const ys = svgPath.getAttribute("d").slice(1).split(" L").map((p) => Number(p.split(" ")[1]));
    const g0 = at(0)[2]; const g1 = at(1)[2];
    const pxPerUnit = (ys[0] - ys[ys.length - 1]) / (g1 - g0);
    const y0 = ys[0] + g0 * pxPerUnit;   /* svg y of the value 0 */
    const top = (v) => `${(y0 - v * pxPerUnit) / 3}%`;
    const money = (g) => `$${Math.round(Math.exp(years * g)).toLocaleString("en-US")}`;
    const update = () => {
      const x = Number(slider.value) / 100;
      const [mean, vol, g] = at(x);
      const gb = at(best)[2];
      out.textContent = `${Math.round(100 * x)}%`;
      dotMean.style.left = `${100 * x}%`; dotMean.style.top = top(mean);
      dotGrowth.style.left = `${100 * x}%`; dotGrowth.style.top = top(g);
      tset("mean", `${(100 * mean).toFixed(1)}%`); tset("vol", `${(100 * vol).toFixed(1)}%`);
      tset("growth", `${(100 * g).toFixed(1)}%`); tset("wealth", money(g));
      const pct = Math.round(100 * x); const pb = Math.round(100 * best);
      if (Math.abs(x - best) <= 0.02) say.textContent = `${pct}% risky is the growth-optimal mix: ${money(g)} after ${years} years. Any more risk raises the average return and lowers the wealth.`;
      else if (x > best) say.textContent = `${pct}% risky has the higher average return (${(100 * mean).toFixed(1)}%) but volatility drags growth down to ${(100 * g).toFixed(1)}%: ${money(g)} after ${years} years, against ${money(gb)} at ${pb}%.`;
      else say.textContent = `${pct}% risky is too timid: growth ${(100 * g).toFixed(1)}% a year, ${money(g)} after ${years} years, against ${money(gb)} at ${pb}%.`;
    };
    slider.addEventListener("input", update);
    update();
  });

  /* ---- World Shock Lab: a central-bank surprise of the reader's chosen size. ---------------------- */
  document.querySelectorAll("[data-shock]").forEach((fig) => {
    const rows = [...fig.querySelectorAll(".chart-row[data-fed]")];
    const range = fig.querySelector("[data-shock-size]");
    const out = fig.querySelector("[data-shock-out]");
    let bank = "fed";
    const update = () => {
      const s = Number(range.value);
      out.textContent = `${s > 0 ? "+" : s < 0 ? "−" : ""}${Math.abs(s)} bp`;
      range.setAttribute("aria-valuetext", `${out.textContent} surprise`);
      rows.forEach((row) => {
        const [p, lo, hi] = row.dataset[bank].split(",").map(Number);
        const d = Number(row.dataset.d);
        const unit = row.dataset.unit;
        const f = s / 10;
        let a = lo * f; let b = hi * f;
        if (a > b) [a, b] = [b, a];
        const v = p * f;
        const pos = (x) => `${(100 * (x + d)) / (2 * d)}%`;
        const rpos = (x) => `${(100 * (d - x)) / (2 * d)}%`;
        row.querySelector(".ci").style.left = pos(a);
        row.querySelector(".ci").style.right = rpos(b);
        row.querySelector(".pt").style.left = pos(v);
        row.querySelector(".chart-val").innerHTML = `${signed(v)}${esc(unit)} <small>[${signed(a)}, ${signed(b)}]</small>`;
      });
    };
    radioGroup(fig.querySelector('[role="radiogroup"]'), (radio) => { bank = radio.dataset.bank; update(); });
    range.addEventListener("input", update);
  });

  /* ---- Aurvane: thirty poisoned tasks, with and without the guard. -------------------------------- */
  document.querySelectorAll("[data-attack]").forEach((fig) => {
    const groups = [...fig.querySelectorAll(".attack-group")];
    const landed = fig.querySelector("[data-attack-landed]");
    const loss = fig.querySelector("[data-attack-loss]");
    const desc = fig.querySelector("[data-attack-desc]");
    const intro = desc.textContent;
    const total = fig.dataset.total;
    let on = fig.classList.contains("is-on");
    let shownLoss = Number(on ? fig.dataset.lossOn : fig.dataset.lossOff);
    let lossRaf = 0;
    const money = (x) => `${Math.round(x).toLocaleString("en-US")} CAD`;
    let picked = null;
    const tell = (group) => {
      if (!group) { desc.textContent = intro; return; }
      desc.textContent = `${group.dataset.kind}: ${group.dataset.desc} ${on ? "With Aurvane" : "Without Aurvane"}, ${on ? group.dataset.on : group.dataset.off} landed.`;
    };
    const set = (next) => {
      on = next;
      fig.classList.toggle("is-on", on);
      fig.classList.toggle("is-off", !on);
      groups.forEach((group) => { group.querySelector(".attack-count").textContent = on ? group.dataset.on : group.dataset.off; });
      landed.textContent = `${on ? fig.dataset.landedOn : fig.dataset.landedOff} of ${total}`;
      const from = shownLoss; const to = Number(on ? fig.dataset.lossOn : fig.dataset.lossOff);
      cancelAnimationFrame(lossRaf);
      if (reduce()) { shownLoss = to; loss.textContent = money(to); } else {
        const t0 = performance.now();
        const run = (now) => {
          const f = Math.min(1, (now - t0) / 900);
          shownLoss = from + (to - from) * (1 - (1 - f) ** 3);
          loss.textContent = money(shownLoss);
          if (f < 1) lossRaf = requestAnimationFrame(run);
        };
        lossRaf = requestAnimationFrame(run);
      }
      tell(picked);
    };
    const radios = fig.querySelector('[role="radiogroup"]');
    radioGroup(radios, (radio) => set(radio.dataset.guard === "on"));
    groups.forEach((group) => {
      group.addEventListener("click", () => {
        picked = picked === group ? null : group;
        groups.forEach((g2) => g2.setAttribute("aria-pressed", String(g2 === picked)));
        tell(picked);
      });
      group.addEventListener("pointerenter", (event) => { if (event.pointerType === "mouse") tell(group); });
      group.addEventListener("pointerleave", (event) => { if (event.pointerType === "mouse") tell(picked); });
      group.setAttribute("aria-pressed", "false");
    });
    /* First time it scrolls into view: show the attack landing, then the guard stopping it. */
    if (!reduce()) {
      onceVisible(fig, () => {
        const choose = (value) => radios.querySelector(`[data-guard="${value}"]`).click();
        choose("off");
        setTimeout(() => choose("on"), 1400);
      });
    }
  });

  reveal(document);
})();

/* ---- Atmosphere: the living field, scroll-driven type and stories, responsive surfaces. ------
   Pure decoration layered on the page above. Every moving part is a function of the scroll
   position, so nothing waits on a timer: stop scrolling and the page stops with you. It adds the
   "fx" class only when the reader allows motion, each piece fails on its own without touching the
   content, and under prefers-reduced-motion the background draws one still frame and the stories
   stay as plain text beside finished pictures. */
(() => {
  const html = document.documentElement;
  const body = document.body;
  const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const wide = () => window.innerWidth > 900;
  const isHome = !!document.querySelector(".hero");
  /* A pinned chapter is one screen tall. Below this height (a phone on its side) it cannot hold its
     words and its picture, so the master page stays plain, exactly as under reduced motion.
     scripts/check_layout.py checks every size above it. */
  const SHORT_SCREEN = 560;
  const tooShort = () => isHome && window.innerHeight < SHORT_SCREEN;
  const short = tooShort();
  const reduced = noMotion || short;
  if (isHome && !noMotion) {
    /* Turning the phone changes which page fits: load the one that does. */
    window.matchMedia("(orientation: portrait)").addEventListener?.("change", () => {
      setTimeout(() => { if (tooShort() !== short) window.location.reload(); }, 300);
    });
  }
  const safe = (fn) => { try { fn(); } catch (err) { /* decoration only: never break the page */ } };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (v, a, b) => clamp((v - a) / (b - a));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const inOut = (t) => t * t * (3 - 2 * t);
  const el = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.append(n); return n; };
  const docTop = (n) => { let y = 0; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; };
  if (!reduced) html.classList.add("fx");

  /* One clock for everything that moves, and one place that re-measures the layout. */
  const tasks = [];
  const measures = [];
  const remeasure = () => measures.forEach((fn) => safe(fn));
  let last = performance.now();
  let scrollV = 0, lastY = window.scrollY, vh = window.innerHeight;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const y = window.scrollY;
    scrollV += ((y - lastY) / Math.max(dt, 0.001) - scrollV) * 0.12;
    lastY = y;
    for (const fn of tasks) fn(dt, now / 1000);
    requestAnimationFrame(frame);
  };
  const startClock = () => {
    remeasure();
    window.addEventListener("resize", () => { vh = window.innerHeight; remeasure(); });
    document.fonts?.ready.then(remeasure);
    window.addEventListener("load", remeasure);
    if ("ResizeObserver" in window) {
      let queued = false;
      new ResizeObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; remeasure(); }); } }).observe(body);
    }
    if (!reduced) requestAnimationFrame(frame);
  };

  const pointer = { x: window.innerWidth * 0.62, y: window.innerHeight * 0.4, active: false };
  window.addEventListener("pointermove", (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; }, { passive: true });

  /* ---- Smooth wheel: the page glides to where the wheel sends it, at the reader's pace. ------- */
  safe(() => {
    if (reduced || !finePointer) return;
    let target = window.scrollY, cur = target, active = false;
    const max = () => document.documentElement.scrollHeight - window.innerHeight;
    const ownScroll = (n) => {
      for (; n && n.nodeType === 1 && n !== body && n !== html; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) return true;
      }
      return false;
    };
    window.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.defaultPrevented || Math.abs(e.deltaX) > Math.abs(e.deltaY) || body.style.overflow === "hidden" || ownScroll(e.target)) return;
      e.preventDefault();
      const d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (!active) target = cur = window.scrollY;
      target = clamp(target + d, 0, max());
      active = true;
    }, { passive: false });
    const stop = () => { active = false; };
    window.addEventListener("keydown", stop);
    window.addEventListener("pointerdown", stop);
    window.addEventListener("scroll", () => { if (!active) target = cur = window.scrollY; }, { passive: true });
    tasks.push((dt) => {
      if (!active) return;
      cur += (target - cur) * (1 - Math.pow(1 - 0.1, dt * 60));
      if (Math.abs(target - cur) < 0.5) { cur = target; active = false; }
      window.scrollTo({ top: cur, behavior: "instant" });
    });
  });

  /* ---- The field: domain-warped noise tinted by the chapter you are reading. ---------------- */
  const tints = { ice: [0.30, 0.56, 1.0], violet: [0.58, 0.40, 1.0], amber: [1.0, 0.62, 0.26], teal: [0.16, 0.74, 0.78], rose: [1.0, 0.34, 0.5] };
  const field = { tint: tints.ice.slice(), want: tints.ice };
  safe(() => {
    const canvas = el("canvas", "fx-field");
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "low-power" });
    if (!gl) return;
    body.prepend(canvas);
    const vs = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
    const fs = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec2 m;uniform float s;uniform float L;uniform vec3 tint;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  float k=min(r.x,r.y);
  vec2 p=(gl_FragCoord.xy-.5*r)/k;
  vec2 mp=(m-.5*r)/k;
  p.y-=s*.35;
  float T=t*.035+s*.25;
  vec2 q=vec2(fbm(p*1.3+vec2(T,-T*.6)),fbm(p*1.3+vec2(5.2,1.3)-T));
  vec2 w=vec2(fbm(p*1.1+2.2*q+vec2(1.7,9.2)+T*1.2),fbm(p*1.1+2.2*q+vec2(8.3,2.8)-T*.8));
  p+=(mp-p)*.06*exp(-1.6*length(p-mp));
  float f=fbm(p*.9+2.6*w);
  float md=exp(-2.4*length(p-mp));
  vec3 vio=vec3(.50,.36,1.),amb=vec3(1.,.66,.28);
  float band=smoothstep(.42,.95,f);
  vec3 col=tint*band*.62;
  col+=mix(vio,tint,.35)*smoothstep(.5,1.1,length(w))*.5*band;
  col+=amb*md*md*.14*band;
  col+=tint*md*.08;
  vec2 uv=gl_FragCoord.xy/r;
  float vig=smoothstep(1.35,.1,length((uv-vec2(.6,.62))*vec2(1.,1.2)));
  col*=vig;
  col=pow(col,vec3(1.35))*.95;
  if(L>.5){
    vec3 base=vec3(.984,.984,.992);
    col=base-vec3(col.r*.55+col.g*.25,col.g*.5,col.b*.18)*1.1;
  }
  col+=(h(gl_FragCoord.xy+t)-.5)/255.;
  gl_FragColor=vec4(col,1.);
}`;
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (name) => gl.getUniformLocation(prog, name);
    const uR = U("r"), uT = U("t"), uM = U("m"), uS = U("s"), uL = U("L"), uTint = U("tint");
    const scale = 0.4;
    let W = 0, H = 0;
    const size = () => {
      W = Math.max(2, Math.round(window.innerWidth * scale));
      H = Math.max(2, Math.round(window.innerHeight * scale));
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
    };
    size();
    const mouse = { x: W * 0.62, y: H * 0.6 };
    let acc = 0;
    const draw = (time) => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      mouse.x += (pointer.x * scale - mouse.x) * 0.05;
      mouse.y += ((window.innerHeight - pointer.y) * scale - mouse.y) * 0.05;
      for (let i = 0; i < 3; i++) field.tint[i] += (field.want[i] - field.tint[i]) * 0.04;
      gl.uniform2f(uR, W, H);
      gl.uniform1f(uT, time);
      gl.uniform2f(uM, mouse.x, mouse.y);
      gl.uniform1f(uS, (window.scrollY / max) * 3.0);
      gl.uniform1f(uL, html.dataset.theme === "light" ? 1 : 0);
      gl.uniform3f(uTint, field.tint[0], field.tint[1], field.tint[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    window.addEventListener("resize", () => { size(); if (reduced) draw(20); });
    new MutationObserver(() => { if (reduced) draw(20); }).observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    draw(reduced ? 20 : 0);
    requestAnimationFrame(() => canvas.classList.add("is-on"));
    if (reduced) return;
    tasks.push((dt, t) => {
      if (document.hidden) return;
      acc += dt;
      if (acc < 1 / 40) return; /* 40 frames a second is plenty for a slow field */
      acc = 0;
      draw(t);
    });
  });

  /* ---- Stars: two still layers of points behind everything, sliding at different speeds as the page scrolls. */
  safe(() => {
    const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const layers = [{ speed: 0.035, count: 430, max: 1.0 }, { speed: 0.09, count: 150, max: 1.7 }];
    let after = document.querySelector(".fx-field");
    layers.forEach((L) => {
      L.c = el("canvas", "fx-stars");
      L.c.setAttribute("aria-hidden", "true");
      if (after) after.after(L.c); else body.prepend(L.c);
      after = L.c;
    });
    let seenW = 0, seenH = 0;
    const paint = () => {
      const w = window.innerWidth, h = Math.max(window.innerHeight, 480);
      if (w === seenW && Math.abs(h - seenH) < 140) return; /* a phone's address bar sliding away is not worth a repaint */
      seenW = w; seenH = h;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      layers.forEach((L, li) => {
        const g = L.c.getContext("2d"), r = seeded(li * 77 + 5);
        L.c.width = Math.round(w * d); L.c.height = Math.round(h * 2 * d);
        L.c.style.height = `${h * 2}px`;
        L.h = h;
        g.setTransform(d, 0, 0, d, 0, 0);
        const count = Math.round(L.count * Math.min(1.6, (w * h) / (1440 * 900)));
        for (let i = 0; i < count; i += 1) {
          const x = r() * w, y = r() * h, rad = 0.35 + Math.pow(r(), 3) * L.max, a = 0.25 + r() * 0.6, tone = r();
          const rgb = tone < 0.1 ? "255,214,170" : tone < 0.4 ? "170,205,255" : "235,240,255";
          [y, y + h].forEach((yy) => { /* drawn twice, one screen apart, so the layer can wrap */
            g.fillStyle = `rgba(${rgb},${a.toFixed(2)})`;
            g.beginPath(); g.arc(x, yy, rad, 0, 6.2832); g.fill();
            if (rad > L.max * 0.75) { g.fillStyle = `rgba(${rgb},0.1)`; g.beginPath(); g.arc(x, yy, rad * 3.2, 0, 6.2832); g.fill(); }
          });
        }
      });
    };
    paint();
    let timer;
    window.addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(paint, 200); });
    if (reduced) return;
    tasks.push(() => {
      const y = window.scrollY;
      layers.forEach((L) => {
        const off = Math.round(((y * L.speed) % L.h) * 2) / 2;
        if (L.off !== off) { L.off = off; L.c.style.transform = `translate3d(0, ${-off}px, 0)`; }
      });
    });
  });

  /* ---- The land: an illustrated Earth, drawn in code. --------------------------------------------
     One long journey by train, left to right: high mountains and a stone viaduct, farmland, a coast
     with a lighthouse, a plain of wind turbines under an observatory, then a colourful city and its
     station. Nothing is an image: every ridge, tree, arch, carriage and window is a shape placed by
     a seeded rule, so the whole world weighs a few kilobytes and is sharp at any size.

     draw(g, W, H, S) paints one frame. S says where the journey is (J, in stops), how much of the
     screen the land takes (horizon, zoom), the time of day (tod), which palette (light: day; dark:
     night) and how far things that turn have turned (spin). All of S comes from the scroll. */
  const Land = (() => {
    const Z = 3.2; /* screen heights of world between two stops of the journey */
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    const bump = (j, a, b, s = 0.3) => ss(a - s, a + s, j) * (1 - ss(b - s, b + s, j));
    const hash = (n) => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
    const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

    /* What the land is made of at each point of the journey (j, in stops). */
    const B = {
      alp: (j) => bump(j, -9, 1.72) + 0.4 * bump(j, 1.72, 2.8) + 0.2 * bump(j, 3.95, 4.9) + 0.12 * ss(5.2, 6, j),
      hill: (j) => 0.6 + 0.4 * bump(j, 1.8, 2.9) - 0.42 * bump(j, 3.0, 3.9) - 0.3 * ss(5.3, 6.2, j),
      sea: (j) => bump(j, 2.95, 3.95, 0.2),
      city: (j) => ss(5.05, 5.75, j),
      span: (j) => bump(j, -9, 1.68, 0.18),
      farm: (j) => bump(j, 1.95, 2.85, 0.2),
      plain: (j) => bump(j, 4.05, 4.9, 0.2),
    };

    /* Colours: three moments of the night (blue hour, deep night, the lit city) and three of the day
       (morning, midday, golden hour). The time of day slides between them. */
    const TABLE = {
      skyTop: ["#0a0c1c", "#05060f", "#0b0a18", "#e6f0fc", "#dfedfc", "#f6e9e0"],
      skyLow: ["#3a2a66", "#16204c", "#3c2452", "#fdebd8", "#f0f6ff", "#ffd3a8"],
      glow: ["#ff8f7a", "#4a6ad8", "#ff9a6a", "#fff4e2", "#ffffff", "#ffb07a"],
      farLit: ["#7c6ec4", "#5c68b4", "#8c64aa", "#f6bcc8", "#f2c4d4", "#ffb09a"],
      farShade: ["#3a3274", "#28306e", "#442a60", "#9c9ade", "#90a2e2", "#b27caa"],
      snowLit: ["#eee4ff", "#d8deff", "#ffdbd2", "#ffffff", "#ffffff", "#fff2e2"],
      snowShade: ["#9c90da", "#808cd2", "#b28cc2", "#d6dcf8", "#ced9f9", "#eabaca"],
      midLit: ["#48528f", "#36467f", "#543c76", "#9cc0e4", "#8fc0d8", "#e29c8a"],
      midShade: ["#272b5c", "#1d2752", "#31214c", "#6a8fc8", "#6098ba", "#a26c8a"],
      haze: ["#9a78c8", "#3c56a8", "#b0688a", "#ffe9dc", "#eef4ff", "#ffc9a0"],
      hillTop: ["#2e3e70", "#202e5a", "#36325e", "#b6da8c", "#a0d47e", "#dac272"],
      hillLow: ["#171f42", "#111938", "#1d193a", "#64ac72", "#50a06a", "#8c9c5a"],
      rim: ["#8c7cd2", "#526aba", "#c27c92", "#e8f4b2", "#daf2aa", "#ffe2a2"],
      tree: ["#0e1630", "#0a1228", "#140f28", "#2f6e52", "#2a6a4c", "#4a6a40"],
      treeLit: ["#26386a", "#1c2c58", "#3a2c58", "#5c9c6a", "#5aa266", "#8c9c52"],
      stoneLit: ["#7064a2", "#585c96", "#7c5c8c", "#f2d2aa", "#eed6b2", "#f6ba8a"],
      stoneShade: ["#3b3369", "#2d3161", "#43315b", "#ca9c72", "#c2a27a", "#c27c62"],
      body: ["#aaa2c6", "#9094b8", "#b096ae", "#fcf2de", "#fcf4e4", "#ffeaca"],
      band: ["#c84a40", "#b04248", "#d05040", "#dc4a3c", "#de4c3e", "#e04a30"],
      roof: ["#4a4870", "#3c4068", "#503e60", "#8c8ca2", "#8a92aa", "#a27c82"],
      pane: ["#ffd98a", "#ffd98a", "#ffcf80", "#34486c", "#30486c", "#5a4460"],
      waterTop: ["#5c5eb2", "#364a9c", "#7c5092", "#a8daf4", "#90d2f2", "#f2ba92"],
      waterLow: ["#1f2359", "#151d4b", "#2b1b49", "#5caae2", "#4ca0de", "#b27c9a"],
      spark: ["#ffc8b0", "#a8c0ff", "#ffc0a0", "#ffffff", "#ffffff", "#fff0c0"],
      fore: ["#0b1024", "#080c1c", "#0e0a1c", "#3c7e5c", "#357a56", "#5a6e40"],
      foreRim: ["#2a3668", "#1e2a58", "#3a2a58", "#7cba7c", "#72ba76", "#aaaa62"],
      cloud: ["#6a5aa8", "#34407a", "#7a4a80", "#ffffff", "#ffffff", "#ffe2c8"],
      orb: ["#f6eeda", "#eef0ff", "#ffe8c2", "#fff2b8", "#fff8d8", "#ffc070"],
      lamp: ["#ffd98a", "#ffd98a", "#ffcf80", "#fff6d8", "#ffffff", "#ffe6b0"],
    };
    const KEYS = Object.keys(TABLE);
    Object.values(TABLE).forEach((row) => row.forEach((s, i) => { row[i] = hex(s); }));
    const WALLS = ["#ef7d6a", "#f2c14e", "#4fb3a5", "#f7ead1", "#b39ddb", "#6aa9e9", "#e896b4", "#f4a259"].map(hex);
    const palette = (light, tod) => {
      const t = clamp(tod) * 1.999, a = Math.floor(t), f = t - a, o = (light ? 3 : 0) + a, P = {};
      for (const k of KEYS) P[k] = mix(TABLE[k][o], TABLE[k][o + 1], f);
      return P;
    };

    const layer = (V, p) => ({ p, X: (x) => V.W / 2 + (x - V.cam * p) * V.U, j: (x) => x / (p * Z), a: V.cam * p - V.W / 2 / V.U, b: V.cam * p + V.W / 2 / V.U });
    const cells = (lay, size, pad, fn) => { for (let i = Math.floor((lay.a - pad) / size), n = Math.ceil((lay.b + pad) / size); i <= n; i++) fn(i, (i + 0.5) * size); };

    function sky(V) {
      const { g, W, y0, U, P, S } = V;
      if (S.light) {
        const gr = g.createLinearGradient(0, 0, 0, y0);
        gr.addColorStop(0, rgb(P.skyTop)); gr.addColorStop(0.6, rgb(mix(P.skyTop, P.skyLow, 0.5))); gr.addColorStop(1, rgb(mix(P.skyLow, P.glow, 0.35)));
        g.fillStyle = gr; g.fillRect(0, 0, W, y0 + 2);
        return;
      }
      const top = y0 - 0.66 * U, gr = g.createLinearGradient(0, top, 0, y0);
      gr.addColorStop(0, rgb(P.skyLow, 0)); gr.addColorStop(0.5, rgb(P.skyLow, 0.46)); gr.addColorStop(0.86, rgb(mix(P.skyLow, P.glow, 0.34), 0.8)); gr.addColorStop(1, rgb(mix(P.skyLow, P.glow, 0.6), 0.92));
      g.fillStyle = gr; g.fillRect(0, top, W, y0 - top + 2);
    }

    /* The moon at night, the sun by day. */
    function orb(V) {
      const { g, P, S } = V, o = S.orb;
      if (!o || o.a <= 0.01) return;
      g.save(); g.globalAlpha = o.a;
      const halo = g.createRadialGradient(o.x, o.y, o.r * 0.8, o.x, o.y, o.r * (S.light ? 3.4 : 2.6));
      halo.addColorStop(0, rgb(P.orb, S.light ? 0.5 : 0.28)); halo.addColorStop(1, rgb(P.orb, 0));
      g.fillStyle = halo; g.beginPath(); g.arc(o.x, o.y, o.r * 3.4, 0, 6.2832); g.fill();
      const disc = g.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.4, o.r * 0.1, o.x, o.y, o.r);
      disc.addColorStop(0, rgb(mix(P.orb, [255, 255, 255], 0.5))); disc.addColorStop(1, rgb(S.light ? P.orb : mix(P.orb, P.farShade, 0.3)));
      g.fillStyle = disc; g.beginPath(); g.arc(o.x, o.y, o.r, 0, 6.2832); g.fill();
      if (!S.light) { /* seas and craters */
        g.fillStyle = rgb(mix(P.orb, P.farShade, 0.55), 0.3);
        [[-0.3, -0.25, 0.26], [0.28, -0.38, 0.15], [0.1, 0.22, 0.3], [-0.46, 0.3, 0.13], [0.5, 0.12, 0.11], [-0.05, -0.62, 0.09]].forEach(([x, y, r]) => { g.beginPath(); g.arc(o.x + x * o.r, o.y + y * o.r, r * o.r, 0, 6.2832); g.fill(); });
      }
      g.restore();
    }

    function clouds(V) {
      const { g, W, U, y0, P, S } = V, lay = layer(V, 0.07), wild = S.storm || 0, coast = B.sea(V.cam / Z) > 0.5; /* clouds are far and slow: the weather is the camera's, not theirs */
      cells(lay, 0.62, 0.5, (i, xc) => {
        const k = hash(i * 3.17 + 5), storm = coast && hash(i * 7.7) > 0.35 - 0.3 * wild;
        if (k < 0.38 && !storm) return;
        const x = lay.X(xc + (hash(i * 1.3) - 0.5) * 0.3), y = y0 - (storm ? 0.4 + 0.04 * wild : 0.46 + 0.3 * hash(i * 9.1)) * U, s = (0.09 + 0.1 * hash(i * 5.3)) * U * (storm ? 1.2 + 0.7 * wild : 1);
        const c = !storm ? P.cloud : S.light ? mix(P.cloud, P.midShade, 0.45 + 0.4 * wild) : mix(P.cloud, P.snowShade, 0.3 + 0.25 * wild); /* by day a storm is dark; by night the moon lights it */
        g.fillStyle = rgb(c, S.light ? (storm ? 0.9 : 0.86) : storm ? 0.42 + 0.3 * wild : 0.3);
        g.beginPath();
        [[-1.1, 0.1, 0.62], [-0.45, -0.22, 0.8], [0.3, -0.34, 0.92], [0.95, -0.02, 0.66], [0, 0.16, 1.25]].forEach(([dx, dy, r], n) => { g.ellipse(x + dx * s, y + dy * s, r * s * (n === 4 ? 1.1 : 0.72), r * s * (n === 4 ? 0.34 : 0.56), 0, 0, 6.2832); });
        g.fill();
        if (storm) { /* rain, leaning with the wind: a shower, or a downpour when the storm is on */
          g.strokeStyle = rgb(S.light ? P.midShade : P.snowLit, (S.light ? 0.55 : 0.4) * (0.55 + 0.7 * wild)); g.lineWidth = Math.max(1, U * 0.0016); g.beginPath();
          for (let n = 0, m = 10 + 30 * wild; n < m; n++) { const rx = x + (hash(i * 31 + n) - 0.5) * 2.4 * s, ry = y + 0.32 * s + hash(i * 17 + n) * (0.5 + 0.5 * wild) * s; g.moveTo(rx, ry); g.lineTo(rx - (0.09 + 0.06 * wild) * s, ry + (0.3 + 0.25 * wild) * s); }
          g.stroke();
        }
      });
      if (S.flash > 0.01) { /* lightning over the bay: one bolt, and the sky answers */
        const x = W * 0.68, top = y0 - 0.44 * U;
        g.fillStyle = rgb([255, 255, 255], 0.16 * S.flash); g.fillRect(0, 0, W, y0);
        g.strokeStyle = rgb(P.lamp, S.flash); g.lineWidth = Math.max(1.5, U * 0.004); g.lineJoin = "miter"; g.beginPath(); g.moveTo(x, top);
        [[0.03, 0.1], [-0.015, 0.17], [0.045, 0.27], [0.005, 0.34], [0.04, 0.44]].forEach(([dx, dy]) => g.lineTo(x + dx * U, top + dy * U));
        g.stroke(); g.lineJoin = "round";
      }
    }

    /* One mountain: a lit face and a shaded face meeting on a ridge, with snow on the high ones. */
    function peak(V, x, base, w, h, o, k) {
      const { g, P } = V, ax = x + (k - 0.5) * w * 0.34, ay = base - h, Lx = x - w, Rx = x + w * (0.92 + 0.3 * k);
      const ridge = [];
      for (let i = 0; i <= 5; i++) { const t = i / 5, wob = i && i < 5 ? (i % 2 ? 1 : -1) * w * 0.07 * (1 - t * 0.5) : 0; ridge.push([ax + (Rx - ax) * 0.3 * t + wob, ay + h * t]); }
      const shoulder = [lerp(Lx, ax, 0.52) - w * 0.05, lerp(base, ay, 0.56)];
      const lit = g.createLinearGradient(0, ay, 0, base), dark = g.createLinearGradient(0, ay, 0, base);
      lit.addColorStop(0, rgb(o.lit)); lit.addColorStop(1, rgb(mix(o.lit, P.haze, o.fade)));
      dark.addColorStop(0, rgb(o.shade)); dark.addColorStop(1, rgb(mix(o.shade, P.haze, o.fade * 0.8)));
      g.fillStyle = dark; g.beginPath(); g.moveTo(ax, ay); g.lineTo(lerp(ax, Rx, 0.5) + w * 0.06, lerp(ay, base, 0.46)); g.lineTo(Rx, base); g.lineTo(ridge[5][0], base);
      for (let i = 4; i >= 0; i--) g.lineTo(ridge[i][0], ridge[i][1]);
      g.fill();
      g.fillStyle = lit; g.beginPath(); g.moveTo(Lx, base); g.lineTo(shoulder[0], shoulder[1]); g.lineTo(ax, ay);
      ridge.forEach((p) => g.lineTo(p[0], p[1]));
      g.fill();
      if (!o.snow || h < o.snow) return;
      const ts = clamp(0.2 + 0.2 * (h - o.snow) / o.snow, 0.2, 0.42), yS = ay + h * ts, onL = lerp(ax, shoulder[0], ts / 0.44), onR = lerp(ax, lerp(ax, Rx, 0.5) + w * 0.06, ts / 0.46), mid = ax + (Rx - ax) * 0.3 * ts;
      g.fillStyle = rgb(P.snowShade); g.beginPath(); g.moveTo(ax, ay); g.lineTo(onR, yS); g.lineTo(lerp(mid, onR, 0.55), yS - h * 0.05); g.lineTo(mid + w * 0.02, yS + h * 0.03); g.lineTo(mid, yS - h * 0.02); g.fill();
      g.fillStyle = rgb(P.snowLit); g.beginPath(); g.moveTo(ax, ay); g.lineTo(mid, yS - h * 0.02); g.lineTo(lerp(onL, mid, 0.66), yS + h * 0.035); g.lineTo(lerp(onL, mid, 0.4), yS - h * 0.03); g.lineTo(lerp(onL, mid, 0.16), yS + h * 0.03); g.lineTo(onL, yS - h * 0.01); g.fill();
    }

    function range(V, o) {
      const lay = layer(V, o.p), { U } = V;
      for (const pass of [0, 1]) cells(lay, o.cell, 1.2, (i, xc0) => {
        const hf = hash(i * 3.71 + o.seed);
        if ((hf > 0.55 ? 0 : 1) !== pass) return;
        const xc = xc0 + (hash(i * 1.93 + o.seed) - 0.5) * 0.7 * o.cell, h = B.alp(lay.j(xc)) * lerp(o.min, o.max, hf);
        if (h < 0.022) return;
        peak(V, lay.X(xc), o.base, h * lerp(0.95, 1.45, hash(i * 5.13 + o.seed)) * U, h * U, o, hash(i * 7.31 + o.seed));
      });
    }

    /* The engine's mountain is its result. The crest of this ridge is the growth of one dollar from 1960 to 2026 (the same
       line as the chapter's chart, read from the page's own picture, on the same log scale): it climbs to the right, every
       fall of the crest is a real drawdown and throws a shadow, and the snow line is a round number of dollars. A reader
       who scrolls the chapter rides along it. S.ridge is [[share of the way across, share of the full height], ...]. */
    function ridge(V) {
      const { g, W, U, y0, P, S } = V, pts = S.ridge;
      if (!pts || pts.length < 8) return;
      const lay = layer(V, 0.45), xa = 1.0 * 0.45 * Z, xb = 1.84 * 0.45 * Z, base = y0 + 0.03 * U;
      if (lay.X(xb) < -U * 0.2 || lay.X(xa) > W + U * 0.2) return;
      const X = (s) => lay.X(xa + (xb - xa) * s), Y = (h) => base - (0.03 + 0.27 * h) * U;
      const crest = () => { g.beginPath(); g.moveTo(X(0) - U * 0.06, base); pts.forEach(([s, h]) => g.lineTo(X(s), Y(h))); g.lineTo(X(1) + U * 0.1, base); };
      const fill = g.createLinearGradient(0, Y(1), 0, base);
      fill.addColorStop(0, rgb(mix(P.farLit, P.midLit, 0.35))); fill.addColorStop(1, rgb(mix(P.midLit, P.haze, 0.5)));
      g.fillStyle = fill; crest(); g.fill();
      g.fillStyle = rgb(P.midShade, 0.62); g.beginPath(); /* a gully under every real fall of the crest, as deep as the fall */
      for (let i = 0; i < pts.length - 1; i++) {
        let j = i;
        while (j < pts.length - 1 && pts[j + 1][1] < pts[j][1]) j++;
        const drop = pts[i][1] - pts[j][1];
        if (j > i && drop > 0.012) {
          const x0 = X(pts[i][0]), x1 = X(pts[j][0]), y1 = Y(pts[j][1]);
          g.moveTo(x0, Y(pts[i][1])); g.lineTo(x1, y1); g.lineTo(x1 + U * 0.012, y1 + (base - y1) * Math.min(0.9, 0.25 + drop * 5)); g.lineTo(x0 + (x1 - x0) * 0.3, Y(pts[i][1]) + U * 0.004); g.closePath();
        }
        i = Math.max(i, j);
      }
      g.fill();
      g.save(); g.beginPath(); g.rect(0, 0, W, Y(S.snow == null ? 0.74 : S.snow)); g.clip(); g.fillStyle = rgb(P.snowLit); crest(); g.fill(); g.restore();
      g.strokeStyle = rgb(P.rim, S.light ? 0.9 : 0.75); g.lineWidth = Math.max(1.2, U * 0.0026); g.lineJoin = "round"; g.beginPath();
      pts.forEach(([s, h], i) => (i ? g.lineTo(X(s), Y(h)) : g.moveTo(X(s), Y(h)))); g.stroke();
      g.fillStyle = rgb(S.light ? P.midShade : P.snowLit, 0.9); g.font = `600 ${Math.max(9, U * 0.017)}px ${S.font || "sans-serif"}`; g.textBaseline = "alphabetic";
      g.textAlign = "left"; g.fillText("1960", X(0) + U * 0.01, Y(pts[0][1]) - U * 0.016);
      g.textAlign = "right"; g.fillText(S.ridgeNote || "2026", X(1) - U * 0.004, Y(pts[pts.length - 1][1]) - U * 0.02);
    }

    function water(V) {
      const { g, W, H, U, y0, P, S } = V, lay = layer(V, 0.22), gr = g.createLinearGradient(0, y0, 0, y0 + 0.2 * U);
      gr.addColorStop(0, rgb(P.waterTop)); gr.addColorStop(1, rgb(P.waterLow));
      g.fillStyle = gr;
      for (let x = 0; x < W; x += 24) { const a = B.sea(lay.j(lay.a + (x + 12) / U)); if (a > 0.02) { g.globalAlpha = a; g.fillRect(x, y0 - 1, 25, H - y0 + 1); } }
      g.fillStyle = rgb(P.spark);
      cells(lay, 0.05, 0.1, (i, xc) => {
        const a = B.sea(lay.j(xc));
        if (a < 0.2) return;
        for (let r = 0; r < 4; r++) { const k = hash(i * 13.7 + r * 5.1); if (k > 0.5) continue; g.globalAlpha = a * (S.light ? 0.75 : 0.42) * (0.4 + k); g.fillRect(lay.X(xc + (k - 0.25) * 0.08), y0 + (0.012 + r * 0.011 + k * 0.006) * U, (0.012 + 0.03 * k) * U, Math.max(1, U * 0.0022)); }
      });
      g.globalAlpha = 1;
      /* sails on the bay */
      const far = layer(V, 0.3);
      cells(far, 0.34, 0.2, (i, xc) => {
        if (B.sea(far.j(xc)) < 0.6 || hash(i * 4.4) > 0.6) return;
        const x = far.X(xc), y = y0 + (0.02 + 0.016 * hash(i * 2.2)) * U + Math.sin(S.spin * 2.6 + i * 1.7) * U * 0.004 * (1 + 4 * (S.storm || 0)), s = (0.016 + 0.01 * hash(i * 8.8)) * U;
        g.fillStyle = rgb(P.body); g.beginPath(); g.moveTo(x, y - s * 2.3); g.lineTo(x + s * 1.1, y - s * 0.3); g.lineTo(x, y - s * 0.3); g.fill();
        g.fillStyle = rgb(P.band); g.beginPath(); g.moveTo(x - s * 0.15, y - s * 1.8); g.lineTo(x - s * 0.9, y - s * 0.3); g.lineTo(x - s * 0.15, y - s * 0.3); g.fill();
        g.fillStyle = rgb(P.tree); g.beginPath(); g.moveTo(x - s * 1.1, y - s * 0.2); g.lineTo(x + s * 1.2, y - s * 0.2); g.lineTo(x + s * 0.8, y + s * 0.2); g.lineTo(x - s * 0.8, y + s * 0.2); g.fill();
      });
    }

    const hillH = (x, j) => Math.max(0.004, B.hill(j) * (0.056 + 0.032 * Math.sin(x * 2.1 + 1.3) + 0.02 * Math.sin(x * 5.3 + 0.7) + 0.009 * Math.sin(x * 12.7)));

    function tree(V, x, y, s, kind, k) {
      const { g, P } = V;
      if (kind === 0) { /* pine */
        g.fillStyle = rgb(P.tree);
        for (let n = 0; n < 3; n++) { const w = s * (0.34 - n * 0.07), top = y - s * (0.42 + n * 0.29), bot = y - s * (0.12 + n * 0.25); g.beginPath(); g.moveTo(x, top); g.lineTo(x + w, bot); g.lineTo(x - w, bot); g.fill(); }
        g.fillStyle = rgb(P.treeLit, 0.8);
        for (let n = 0; n < 3; n++) { const w = s * (0.34 - n * 0.07), top = y - s * (0.42 + n * 0.29), bot = y - s * (0.12 + n * 0.25); g.beginPath(); g.moveTo(x, top); g.lineTo(x - w, bot); g.lineTo(x - w * 0.2, bot); g.fill(); }
        g.fillStyle = rgb(P.tree); g.fillRect(x - s * 0.03, y - s * 0.14, s * 0.06, s * 0.16);
      } else if (kind === 1) { /* cypress */
        g.fillStyle = rgb(P.tree); g.beginPath(); g.ellipse(x, y - s * 0.52, s * 0.13, s * 0.5, 0, 0, 6.2832); g.fill();
        g.fillStyle = rgb(P.treeLit, 0.75); g.beginPath(); g.ellipse(x - s * 0.04, y - s * 0.56, s * 0.06, s * 0.4, 0, 0, 6.2832); g.fill();
      } else { /* a round tree */
        g.fillStyle = rgb(P.tree); g.fillRect(x - s * 0.03, y - s * 0.3, s * 0.06, s * 0.32);
        g.beginPath(); g.arc(x, y - s * 0.52, s * 0.3, 0, 6.2832); g.arc(x + s * 0.2, y - s * 0.38, s * 0.2, 0, 6.2832); g.arc(x - s * 0.22, y - s * 0.4, s * 0.2, 0, 6.2832); g.fill();
        g.fillStyle = rgb(P.treeLit, 0.8); g.beginPath(); g.arc(x - s * 0.08, y - s * 0.6, s * 0.17 * (0.8 + 0.4 * k), 0, 6.2832); g.fill();
      }
    }

    function house(V, x, y, s, k) {
      const { g, P, S } = V, wall = S.light ? WALLS[3] : mix(WALLS[3], P.hillLow, 0.62), roofc = S.light ? WALLS[0] : mix(WALLS[0], P.hillLow, 0.6);
      g.fillStyle = rgb(wall); g.fillRect(x - s * 0.5, y - s * 0.62, s, s * 0.64);
      g.fillStyle = rgb(roofc); g.beginPath(); g.moveTo(x - s * 0.62, y - s * 0.6); g.lineTo(x, y - s * 1.08); g.lineTo(x + s * 0.62, y - s * 0.6); g.fill();
      g.fillStyle = rgb(P.pane, S.light ? 0.85 : k < (S.lit == null ? 1 : S.lit) ? 0.95 : 0.14); g.fillRect(x - s * 0.3, y - s * 0.45, s * 0.2, s * 0.22); /* at night the windows come on as the chapter is read */
      if (k > 0.4) g.fillRect(x + s * 0.1, y - s * 0.45, s * 0.2, s * 0.22);
    }

    /* Things that stand at one place of the journey. Each is drawn on the hills, at its own stop. */
    const PROPS = [
      { j: 3.36, draw(V, x, y, s) { /* the lighthouse, and its beam at night */
        const { g, P, S } = V, h = s * 1.9;
        if (!S.light) {
          const a = Math.sin(S.spin * 1.7) * 0.55 - 0.15, beam = g.createLinearGradient(x, y - h, x + Math.cos(a) * s * 9, y - h + Math.sin(a) * s * 9);
          beam.addColorStop(0, rgb(P.lamp, 0.42)); beam.addColorStop(1, rgb(P.lamp, 0));
          g.fillStyle = beam; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + Math.cos(a - 0.09) * s * 9, y - h + Math.sin(a - 0.09) * s * 9); g.lineTo(x + Math.cos(a + 0.09) * s * 9, y - h + Math.sin(a + 0.09) * s * 9); g.fill();
        }
        g.fillStyle = rgb(P.body); g.beginPath(); g.moveTo(x - s * 0.3, y); g.lineTo(x - s * 0.19, y - h + s * 0.2); g.lineTo(x + s * 0.19, y - h + s * 0.2); g.lineTo(x + s * 0.3, y); g.fill();
        g.fillStyle = rgb(P.band);
        [0.22, 0.56].forEach((t) => { const w0 = lerp(0.3, 0.19, t), w1 = lerp(0.3, 0.19, t + 0.17); g.beginPath(); g.moveTo(x - s * w0, y - h * t * 0.89); g.lineTo(x - s * w1, y - h * (t + 0.17) * 0.89); g.lineTo(x + s * w1, y - h * (t + 0.17) * 0.89); g.lineTo(x + s * w0, y - h * t * 0.89); g.fill(); });
        g.fillStyle = rgb(P.lamp); g.fillRect(x - s * 0.15, y - h + s * 0.02, s * 0.3, s * 0.18);
        g.fillStyle = rgb(P.roof); g.beginPath(); g.moveTo(x - s * 0.24, y - h + s * 0.03); g.lineTo(x, y - h - s * 0.22); g.lineTo(x + s * 0.24, y - h + s * 0.03); g.fill(); g.fillRect(x - s * 0.27, y - h + s * 0.19, s * 0.54, s * 0.04);
      } },
      { j: 3.68, draw(V, x, y, s) { /* the weather station: a mast, cups that turn in the wind, a wind sock */
        const { g, P, S } = V, h = s * 1.5;
        g.strokeStyle = rgb(P.body); g.lineWidth = Math.max(1.2, s * 0.045); g.lineCap = "round";
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.moveTo(x - s * 0.34, y); g.lineTo(x, y - h * 0.45); g.lineTo(x + s * 0.34, y); g.stroke();
        for (let n = 0; n < 3; n++) { const a = S.spin * 3 + n * 2.0944, cx = x + Math.cos(a) * s * 0.3, cy = y - h + Math.sin(a) * s * 0.06; g.beginPath(); g.moveTo(x, y - h); g.lineTo(cx, cy); g.stroke(); g.fillStyle = rgb(P.band); g.beginPath(); g.arc(cx, cy, s * 0.075, 0, 6.2832); g.fill(); }
        g.fillStyle = rgb(P.band); g.beginPath(); g.moveTo(x, y - h * 0.78); g.lineTo(x + s * 0.5, y - h * 0.74 + Math.sin(S.spin * 2.3) * s * 0.05); g.lineTo(x, y - h * 0.66); g.fill();
        g.fillStyle = rgb(P.body); g.fillRect(x - s * 0.52, y - s * 0.3, s * 0.36, s * 0.3);
        g.fillStyle = rgb(P.roof); g.fillRect(x - s * 0.56, y - s * 0.34, s * 0.44, s * 0.06);
      } },
      { j: 4.62, draw(V, x, y, s) { /* the observatory: a dome with its slit open to the sky */
        const { g, P, S } = V;
        if (S.beam > 0.01) { /* what it sees ahead: one line that widens into a range, like a forecast */
          const a = -0.6, len = s * (3 + 12 * S.beam), half = 0.03 + 0.2 * S.beam, ox = x + s * 0.34, oy = y - s * 0.98, ink = S.light ? [40, 110, 200] : P.lamp;
          const fan = g.createLinearGradient(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
          fan.addColorStop(0, rgb(ink, S.light ? 0.32 : 0.44)); fan.addColorStop(1, rgb(ink, 0));
          g.fillStyle = fan; g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a - half) * len, oy + Math.sin(a - half) * len); g.lineTo(ox + Math.cos(a + half) * len, oy + Math.sin(a + half) * len); g.fill();
          g.strokeStyle = rgb(ink, S.light ? 0.75 : 0.9); g.lineWidth = Math.max(1.2, s * 0.03); g.setLineDash([s * 0.14, s * 0.12]); g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + Math.cos(a) * len * 0.92, oy + Math.sin(a) * len * 0.92); g.stroke(); g.setLineDash([]);
        }
        g.fillStyle = rgb(S.light ? WALLS[3] : mix(WALLS[3], P.hillLow, 0.55)); g.fillRect(x - s * 0.62, y - s * 0.5, s * 1.24, s * 0.52);
        g.fillStyle = rgb(S.light ? [236, 240, 248] : mix([236, 240, 248], P.hillLow, 0.45)); g.beginPath(); g.arc(x, y - s * 0.5, s * 0.6, Math.PI, 0); g.fill();
        g.fillStyle = rgb(S.light ? P.roof : P.lamp, S.light ? 1 : 0.9); g.beginPath(); g.moveTo(x + s * 0.05, y - s * 0.5); g.arc(x, y - s * 0.5, s * 0.6, -1.25, -0.95); g.fill();
        g.fillStyle = rgb(P.pane); g.fillRect(x - s * 0.42, y - s * 0.32, s * 0.16, s * 0.18); g.fillRect(x + s * 0.26, y - s * 0.32, s * 0.16, s * 0.18);
      } },
    ];

    function turbine(V, x, y, s, k) {
      const { g, P, S } = V, hub = y - s;
      g.strokeStyle = rgb(S.light ? mix(P.roof, P.body, 0.25) : P.body); g.lineCap = "round"; g.lineWidth = Math.max(1.2, s * 0.035);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, hub); g.stroke();
      g.lineWidth = Math.max(1, s * 0.03);
      for (let n = 0; n < 3; n++) { const a = S.spin * (2.2 + k) + k * 6 + n * 2.0944; g.beginPath(); g.moveTo(x, hub); g.lineTo(x + Math.cos(a) * s * 0.46, hub + Math.sin(a) * s * 0.46); g.stroke(); }
      g.fillStyle = rgb(P.band); g.beginPath(); g.arc(x, hub, s * 0.045, 0, 6.2832); g.fill();
    }

    function hills(V) {
      const { g, W, H, U, y0, P, S, cam } = V, lay = layer(V, 0.5), base = y0 + 0.05 * U, top = [];
      for (let x = -12; x <= W + 12; x += 8) { const xl = cam * 0.5 + (x - W / 2) / U; top.push([x, base - hillH(xl, lay.j(xl)) * U, xl]); }
      const gr = g.createLinearGradient(0, base - 0.12 * U, 0, base + 0.16 * U);
      gr.addColorStop(0, rgb(P.hillTop)); gr.addColorStop(1, rgb(P.hillLow));
      g.fillStyle = gr; g.beginPath(); g.moveTo(-12, H); top.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(W + 12, H); g.fill();
      g.strokeStyle = rgb(P.rim, S.light ? 0.9 : 0.55); g.lineWidth = Math.max(1.2, U * 0.003); g.beginPath(); top.forEach((p, n) => (n ? g.lineTo(p[0], p[1] + 1) : g.moveTo(p[0], p[1] + 1))); g.stroke();
      /* rows of a field, following the slope */
      g.lineWidth = Math.max(1, U * 0.0018);
      for (let r = 1; r <= 5; r++) {
        g.beginPath(); let open = false;
        top.forEach((p) => { const a = B.farm(lay.j(p[2])); if (a > 0.35 && Math.sin(p[2] * 3.1) > -0.2) { const y = p[1] + r * U * 0.011; open ? g.lineTo(p[0], y) : g.moveTo(p[0], y); open = true; } else open = false; });
        g.strokeStyle = rgb(P.rim, (S.light ? 0.55 : 0.3) * (1 - r * 0.12)); g.stroke();
      }
      const at = (xl) => base - hillH(xl, lay.j(xl)) * U;
      cells(lay, 0.062, 0.2, (i, xc0) => {
        const k = hash(i * 2.39 + 3), xc = xc0 + (k - 0.5) * 0.05, j = lay.j(xc), sea = B.sea(j), city = B.city(j), farm = B.farm(j), alp = B.alp(j);
        if (k > 0.62 - 0.3 * sea - 0.45 * city + 0.12 * farm || hillH(xc, j) < 0.012) return;
        tree(V, lay.X(xc), at(xc) + U * 0.004, U * (0.045 + 0.04 * hash(i * 6.1)), farm > 0.5 ? (hash(i * 4.7) > 0.45 ? 1 : 2) : alp > 0.55 ? 0 : hash(i * 4.7) > 0.5 ? 2 : 0, hash(i * 8.3));
      });
      cells(lay, 0.33, 0.3, (i, xc0) => {
        const k = hash(i * 5.77 + 1), xc = xc0 + (k - 0.5) * 0.2, j = lay.j(xc);
        if (B.farm(j) > 0.45 && k < 0.8) { house(V, lay.X(xc), at(xc) + U * 0.006, U * 0.042, k); if (k > 0.3) house(V, lay.X(xc + 0.05), at(xc + 0.05) + U * 0.006, U * 0.034, 1 - k); }
        if (B.plain(j) > 0.45 && k < 0.85) turbine(V, lay.X(xc), at(xc), U * (0.1 + 0.07 * k), k);
      });
      PROPS.forEach((pr) => { const xl = pr.j * 0.5 * Z, x = lay.X(xl); if (x > -U && x < W + U) pr.draw(V, x, at(xl) + U * 0.004, U * 0.07); });
    }

    /* The city: blocks of colour with lit windows. Two rows, the far one paler. */
    function town(V, o) {
      const { g, U, P, S } = V, lay = layer(V, o.p), share = 0.1 + 0.44 * (S.lit == null ? 1 : S.lit); /* how many windows are lit */
      cells(lay, o.cell, 0.3, (i, xc) => {
        const c = B.city(lay.j(xc));
        if (c < 0.06) return;
        const k = hash(i * 3.3 + o.seed), k2 = hash(i * 9.1 + o.seed), k3 = hash(i * 5.9 + o.seed);
        const jc = lay.j(xc), rise = (0.55 + 0.45 * ss(5.6, 6.3, jc)) * (1 - 0.5 * ss(6.95, 7.3, jc));
      const w = o.cell * (0.74 + 0.4 * k) * U, h = c * rise * lerp(o.min, o.max, k2 * k2) * U, x = lay.X(xc) - w / 2, y = o.base - h;
        let wall = WALLS[Math.floor(k3 * WALLS.length)];
        wall = S.light ? mix(wall, P.haze, o.fade) : mix(mix(wall, P.hillLow, 0.66), P.haze, o.fade * 0.5);
        g.fillStyle = rgb(wall); g.fillRect(x, y, w, h + U * 0.2);
        g.fillStyle = rgb(mix(wall, S.light ? [40, 50, 90] : [0, 0, 20], 0.2)); g.fillRect(x + w * 0.72, y, w * 0.28, h + U * 0.2);
        if (k < 0.24) { g.fillStyle = rgb(S.light ? mix(WALLS[0], P.haze, o.fade) : mix(WALLS[0], P.hillLow, 0.6)); g.beginPath(); g.moveTo(x - w * 0.06, y); g.lineTo(x + w / 2, y - w * 0.42); g.lineTo(x + w * 1.06, y); g.fill(); }
        else if (k < 0.44) { g.fillStyle = rgb(wall); g.fillRect(x + w * 0.2, y - h * 0.12, w * 0.6, h * 0.13); }
        else if (k > 0.88) { g.strokeStyle = rgb(P.roof); g.lineWidth = Math.max(1, U * 0.002); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y - h * 0.3); g.stroke(); if (!S.light) { g.fillStyle = rgb(P.band); g.beginPath(); g.arc(x + w / 2, y - h * 0.3, U * 0.003, 0, 6.2832); g.fill(); } }
        const cw = Math.max(5, U * o.win), cols = Math.max(1, Math.floor((w * 0.86) / cw)), rows = Math.min(40, Math.floor((h + U * o.deep) / (cw * 1.35))), pad = (w - cols * cw) / 2;
        const inks = S.light ? [rgb(P.pane, 0.4), rgb(P.pane, 0.62)] : [rgb(P.pane, 0.95), rgb(P.pane, 0.62), "rgba(140,220,255,0.9)", "rgba(255,150,190,0.9)"], panes = inks.map(() => []);
        for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
          const lit = hash(i * 131 + r * 17 + q * 7.3 + o.seed);
          if (S.light) panes[lit > 0.5 ? 1 : 0].push(q, r); else if (lit < share) panes[lit < 0.03 ? 2 : lit < 0.055 ? 3 : lit < share * 0.6 ? 1 : 0].push(q, r);
        }
        panes.forEach((list, n) => { /* one path for each shade of window, not one fill for each window */
          if (!list.length) return;
          g.fillStyle = inks[n]; g.beginPath();
          for (let m = 0; m < list.length; m += 2) g.rect(x + pad + list[m] * cw + cw * 0.2, y + cw * 0.5 + list[m + 1] * cw * 1.35, cw * 0.6, cw * 0.78);
          g.fill();
        });
      });
    }

    /* The big wheel by the water, the lattice dome, the leaning tower: a city seen from its river. */
    function sights(V) {
      const { g, U, P, S, y0 } = V, lay = layer(V, 0.6), base = y0 + 0.1 * U, dim = (c) => (S.light ? c : mix(c, P.hillLow, 0.5));
      const put = (j, fn) => { const x = lay.X(j * 0.6 * Z); if (x > -U * 0.6 && x < V.W + U * 0.6) fn(x); };
      put(6.08, (x) => { /* the wheel turns with the scroll */
        const r = U * 0.15, cy = base - r * 1.2;
        g.strokeStyle = rgb(dim(WALLS[3])); g.lineWidth = Math.max(1.2, U * 0.0035);
        g.beginPath(); g.arc(x, cy, r, 0, 6.2832); g.moveTo(x - r * 0.5, base); g.lineTo(x, cy); g.lineTo(x + r * 0.5, base); g.stroke();
        g.lineWidth = Math.max(1, U * 0.0016); g.beginPath();
        for (let n = 0; n < 12; n++) { const a = S.spin * 0.9 + n * 0.5236; g.moveTo(x, cy); g.lineTo(x + Math.cos(a) * r, cy + Math.sin(a) * r); }
        g.stroke();
        for (let n = 0; n < 12; n++) { const a = S.spin * 0.9 + n * 0.5236; g.fillStyle = rgb(S.light ? WALLS[n % WALLS.length] : n % 2 ? P.lamp : dim(WALLS[n % WALLS.length])); g.beginPath(); g.arc(x + Math.cos(a) * r, cy + Math.sin(a) * r + U * 0.006, U * 0.0085, 0, 6.2832); g.fill(); }
      });
      put(5.82, (x) => { /* the lattice dome */
        const r = U * 0.06, cy = base - r * 0.9;
        g.fillStyle = rgb(S.light ? [214, 236, 246] : mix([150, 190, 230], P.hillLow, 0.45), 0.92); g.beginPath(); g.arc(x, cy, r, 0, 6.2832); g.fill();
        g.strokeStyle = rgb(S.light ? [120, 160, 190] : P.rim, 0.8); g.lineWidth = Math.max(1, U * 0.0014); g.beginPath();
        for (let n = -2; n <= 2; n++) { g.ellipse(x, cy, Math.abs(r * Math.sin(n * 0.52)) || 0.01, r, 0, 0, 6.2832); g.moveTo(x - r * Math.cos(n * 0.5), cy + r * Math.sin(n * 0.5)); g.lineTo(x + r * Math.cos(n * 0.5), cy + r * Math.sin(n * 0.5)); }
        g.stroke();
      });
      put(6.62, (x) => { /* the leaning tower over its stadium */
        const h = U * 0.3, c = dim([238, 234, 226]);
        g.fillStyle = rgb(mix(c, P.hillLow, 0.18)); g.beginPath(); g.ellipse(x - h * 0.5, base, h * 0.5, h * 0.2, 0, Math.PI, 0); g.fill();
        g.fillStyle = rgb(c); g.beginPath(); g.moveTo(x + h * 0.16, base); g.lineTo(x - h * 0.04, base); g.quadraticCurveTo(x - h * 0.1, base - h * 0.62, x - h * 0.46, base - h); g.lineTo(x - h * 0.39, base - h * 1.02); g.quadraticCurveTo(x + h * 0.06, base - h * 0.6, x + h * 0.16, base); g.fill();
        g.strokeStyle = rgb(c, 0.75); g.lineWidth = Math.max(1, U * 0.0013); g.beginPath();
        for (let n = 0; n < 6; n++) { g.moveTo(x - h * 0.43, base - h * 1.0); g.lineTo(x - h * (0.92 - n * 0.14), base - h * 0.17); }
        g.stroke();
      });
    }

    /* Hot-air balloons over the high country, drifting the other way. */
    function balloons(V) {
      const { g, U, y0, P, S } = V, lay = layer(V, 0.12);
      cells(lay, 0.8, 0.3, (i, xc0) => {
        const k = hash(i * 6.13 + 2), xc = xc0 + (k - 0.5) * 0.4;
        if (k > 0.55 || B.city(lay.j(xc)) > 0.3) return;
        const x = lay.X(xc), y = y0 - (0.3 + 0.26 * hash(i * 2.9)) * U - Math.sin(S.spin + i) * U * 0.012 - (S.rise || 0) * U * 0.14, s = U * (0.022 + 0.014 * hash(i * 4.1)), c = WALLS[Math.floor(hash(i * 8.7) * WALLS.length)];
        const tint = (col) => (S.light ? col : mix(col, P.farShade, 0.5));
        g.fillStyle = rgb(tint(c)); g.beginPath(); g.arc(x, y, s, Math.PI * 0.86, Math.PI * 0.14); g.lineTo(x + s * 0.2, y + s * 1.18); g.lineTo(x - s * 0.2, y + s * 1.18); g.fill();
        g.fillStyle = rgb(tint(WALLS[3])); g.beginPath(); g.ellipse(x, y, s * 0.36, s, 0, Math.PI, 0); g.lineTo(x + s * 0.09, y + s * 1.18); g.lineTo(x - s * 0.09, y + s * 1.18); g.fill();
        g.fillStyle = rgb(tint([120, 80, 60])); g.fillRect(x - s * 0.14, y + s * 1.32, s * 0.28, s * 0.2);
      });
    }

    const deck = (xl) => { const j = xl / (0.8 * Z); return 0.034 + 0.104 * B.span(j) + 0.05 * B.city(j) + 0.008 * Math.sin(xl * 1.7); };

    function track(V) {
      const { g, W, U, y0, P, S, cam } = V, lay = layer(V, 0.8), yT = y0 + 0.1 * U, foot = yT + 0.16 * U, Y = (xl) => yT - deck(xl) * U;
      /* the embankment where the line runs on the ground */
      const gr = g.createLinearGradient(0, yT - 0.1 * U, 0, foot); gr.addColorStop(0, rgb(mix(P.hillTop, P.hillLow, 0.35))); gr.addColorStop(1, rgb(P.hillLow));
      g.fillStyle = gr; g.beginPath(); let open = false;
      const flush = (x) => { if (open) { g.lineTo(x, foot); g.closePath(); g.fill(); g.beginPath(); open = false; } };
      for (let x = -12; x <= W + 12; x += 8) {
        const xl = cam * 0.8 + (x - W / 2) / U, j = lay.j(xl);
        if (B.span(j) < 0.5 && B.city(j) < 0.5) { if (!open) { g.moveTo(x, foot); open = true; } g.lineTo(x, Y(xl) + U * 0.012); } else flush(x);
      }
      flush(W + 12);
      /* the viaduct: stone arches across the valleys of the high country */
      const span = 0.17;
      cells(lay, span, 0.2, (i, xc) => {
        const j = lay.j(xc);
        if (B.span(j) < 0.5) return;
        const x0 = lay.X(xc - span / 2), x1 = lay.X(xc + span / 2), w = x1 - x0, top = Math.min(Y(xc - span / 2), Y(xc + span / 2)) + U * 0.012, pier = w * 0.13, spring = top + U * 0.03 + w * 0.3;
        for (const [dx, col] of [[w * 0.035, P.stoneShade], [0, P.stoneLit]]) {
          g.fillStyle = rgb(col); g.beginPath(); g.moveTo(x0 - 1, top); g.lineTo(x1 + 1, top); g.lineTo(x1 + 1, foot); g.lineTo(x1 - pier + dx, foot); g.lineTo(x1 - pier + dx, spring);
          g.bezierCurveTo(x1 - pier + dx, spring - w * 0.42, x0 + pier + dx, spring - w * 0.42, x0 + pier + dx, spring); g.lineTo(x0 + pier + dx, foot); g.lineTo(x0 - 1, foot); g.fill();
        }
        g.fillStyle = rgb(P.stoneShade, 0.55); g.fillRect(x0 - 1, top + U * 0.016, w + 2, Math.max(1, U * 0.003));
      });
      /* through the city the line rides on slim piers */
      cells(lay, 0.24, 0.2, (i, xc) => { if (B.city(lay.j(xc)) < 0.5) return; const x = lay.X(xc); g.fillStyle = rgb(P.stoneShade); g.fillRect(x - U * 0.006, Y(xc), U * 0.012, foot - Y(xc)); g.fillStyle = rgb(P.stoneLit); g.fillRect(x - U * 0.006, Y(xc), U * 0.005, foot - Y(xc)); });
      /* the deck and the rail, all the way */
      g.lineJoin = "round";
      [[P.stoneLit, 0.006, 0.013], [S.light ? P.roof : P.rim, -0.0015, 0.0028]].forEach(([c, dy, lw]) => {
        g.strokeStyle = rgb(c); g.lineWidth = Math.max(1.5, U * lw); g.beginPath();
        for (let x = -12; x <= W + 12; x += 12) { const y = Y(cam * 0.8 + (x - W / 2) / U) + U * dy; x === -12 ? g.moveTo(x, y) : g.lineTo(x, y); }
        g.stroke();
      });
      return { lay, Y };
    }

    function station(V, T) {
      const { g, U, P, S } = V, xl = S.end * 0.8 * Z, x = T.lay.X(xl), y = T.Y(xl), s = U * 0.062;
      if (x < -U || x > V.W + U) return;
      g.fillStyle = rgb(P.stoneShade); g.fillRect(x - s * 7, y - s * 0.02, s * 11, s * 0.34);
      g.fillStyle = rgb(P.stoneLit); g.fillRect(x - s * 7, y - s * 0.02, s * 11, s * 0.1);
      g.fillStyle = rgb(P.roof);
      for (let n = 0; n < 6; n++) g.fillRect(x - s * 6.4 + n * s * 1.9, y - s * 1.9, s * 0.1, s * 1.9);
      g.fillStyle = rgb(S.light ? WALLS[2] : mix(WALLS[2], P.hillLow, 0.4)); g.beginPath(); g.moveTo(x - s * 7, y - s * 1.9); g.lineTo(x - s * 6.6, y - s * 2.25); g.lineTo(x + s * 3.6, y - s * 2.25); g.lineTo(x + s * 4, y - s * 1.9); g.fill();
      g.fillStyle = rgb(P.body); g.fillRect(x - s * 2.5, y - s * 1.72, s * 3.6, s * 0.52);
      g.fillStyle = rgb(S.light ? [30, 40, 70] : [20, 24, 50]); g.font = `600 ${Math.max(7, s * 0.34)}px ${S.font || "sans-serif"}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("M O N T R É A L", x - s * 0.7, y - s * 1.45);
      g.fillStyle = rgb(P.lamp, S.light ? 0.9 : 1); for (let n = 0; n < 5; n++) { g.beginPath(); g.arc(x - s * 5.5 + n * s * 1.9, y - s * 1.8, s * 0.07, 0, 6.2832); g.fill(); }
    }

    /* A halt for each chapter: a short platform and a board with the place's name and, where the page has it, the
       project's headline number. S.stops is [{ j, name, value }]. */
    function halts(V, T) {
      const { g, U, P, S } = V;
      (S.stops || []).forEach((st) => {
        const xl = st.j * 0.8 * Z, x = T.lay.X(xl), y = T.Y(xl), s = U * 0.05;
        if (x < -U * 0.5 || x > V.W + U * 0.5 || st.j > 6.5) return;
        g.fillStyle = rgb(P.stoneShade); g.fillRect(x - s * 3.2, y, s * 6.4, s * 0.2);
        g.fillStyle = rgb(P.stoneLit); g.fillRect(x - s * 3.2, y - s * 0.03, s * 6.4, s * 0.08);
        g.fillStyle = rgb(P.roof); g.fillRect(x - s * 1.7, y - s * 2.5, s * 0.08, s * 2.5); g.fillRect(x + s * 1.62, y - s * 2.5, s * 0.08, s * 2.5);
        const w = s * 3.9, h = s * (st.value ? 1.24 : 0.74), bx = x - w / 2, by = y - s * 2.58 - h;
        g.fillStyle = rgb(S.light ? [252, 248, 238] : [16, 20, 44], 0.96); g.fillRect(bx, by, w, h);
        g.strokeStyle = rgb(S.light ? P.roof : P.rim, 0.9); g.lineWidth = Math.max(1, U * 0.0018); g.strokeRect(bx, by, w, h);
        g.fillStyle = rgb(P.band); g.fillRect(bx, by, w, Math.max(2, s * 0.09));
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = rgb(S.light ? [60, 66, 90] : [176, 186, 220]); g.font = `600 ${Math.max(7, s * 0.27)}px ${S.font || "sans-serif"}`;
        g.fillText(st.name.toUpperCase().split("").join("\u200a"), x, by + s * 0.42);
        if (st.value) { g.fillStyle = rgb(S.light ? [17, 18, 22] : [244, 245, 247]); g.font = `600 ${Math.max(10, s * 0.5)}px ${S.font || "sans-serif"}`; g.fillText(st.value, x, by + s * 0.9); }
        g.fillStyle = rgb(P.lamp, S.light ? 0.9 : 1); g.beginPath(); g.arc(x - s * 1.66, y - s * 2.56, s * 0.09, 0, 6.2832); g.arc(x + s * 1.66, y - s * 2.56, s * 0.09, 0, 6.2832); g.fill();
      });
    }

    /* The train: an engine and three carriages, cream over red, windows lit at night. */
    function train(V, T) {
      const { g, U, P, S, cam } = V, len = 0.15, gap = 0.008, h = U * 0.036, head = cam * 0.8 + (S.train - 0.5) * V.W / U;
      for (let n = 3; n >= 0; n--) {
        const xc = head - len / 2 - n * (len + gap), x = T.lay.X(xc), y = T.Y(xc) - U * 0.002, w = len * U, slope = Math.atan2(T.Y(xc + 0.03) - T.Y(xc - 0.03), 0.06 * U);
        if (x < -w || x > V.W + w) continue;
        g.save(); g.translate(x, y); g.rotate(slope);
        g.fillStyle = rgb([24, 24, 40]); [-0.34, -0.22, 0.22, 0.34].forEach((d) => { g.beginPath(); g.arc(w * d, -h * 0.1, h * 0.14, 0, 6.2832); g.fill(); });
        const nose = n === 0 ? h * 0.55 : 0, r = h * 0.2;
        const shape = () => { g.beginPath(); g.moveTo(-w / 2 + r, -h); g.lineTo(w / 2 - nose - r, -h); g.quadraticCurveTo(w / 2 - nose * 0.2, -h, w / 2, -h * 0.34); g.lineTo(w / 2, -h * 0.18); g.lineTo(-w / 2, -h * 0.18); g.lineTo(-w / 2, -h + r); g.quadraticCurveTo(-w / 2, -h, -w / 2 + r, -h); };
        g.fillStyle = rgb(P.body); shape(); g.fill();
        g.save(); shape(); g.clip();
        g.fillStyle = rgb(P.band); g.fillRect(-w / 2, -h * 0.5, w, h * 0.34);
        g.fillStyle = rgb(P.roof); g.fillRect(-w / 2, -h * 1.02, w, h * 0.12);
        g.fillStyle = rgb(P.pane, S.light ? 0.95 : 1);
        const cw = w * 0.085, n0 = n === 0 ? 7 : 9;
        for (let q = 0; q < n0; q++) g.fillRect(-w / 2 + w * 0.05 + q * cw * 1.18, -h * 0.84, cw, h * 0.26);
        if (n === 0) { g.beginPath(); g.moveTo(w / 2 - nose - r * 1.5, -h * 0.86); g.lineTo(w / 2 - nose * 0.42, -h * 0.86); g.lineTo(w / 2 - h * 0.04, -h * 0.52); g.lineTo(w / 2 - nose - r * 1.5, -h * 0.52); g.fill(); }
        g.restore();
        if (n === 0) {
          g.fillStyle = rgb(P.lamp); g.beginPath(); g.arc(w / 2 - h * 0.05, -h * 0.3, h * 0.08, 0, 6.2832); g.fill();
          if (!S.light) { const beam = g.createLinearGradient(w / 2, 0, w / 2 + h * 5, 0); beam.addColorStop(0, rgb(P.lamp, 0.4)); beam.addColorStop(1, rgb(P.lamp, 0)); g.fillStyle = beam; g.beginPath(); g.moveTo(w / 2, -h * 0.34); g.lineTo(w / 2 + h * 5, -h * 0.9); g.lineTo(w / 2 + h * 5, h * 0.25); g.lineTo(w / 2, -h * 0.26); g.fill(); }
        }
        g.restore();
      }
    }

    function fore(V) {
      const { g, W, H, U, y0, P, S, cam } = V, lay = layer(V, 1.3), base = y0 + 0.215 * U, top = [];
      if (base - 0.09 * U > H) return;
      const fh = (xl) => 0.03 + 0.022 * Math.sin(xl * 1.3 + 2) + 0.012 * Math.sin(xl * 3.7 + 1);
      for (let x = -12; x <= W + 12; x += 10) { const xl = cam * 1.3 + (x - W / 2) / U; top.push([x, base - fh(xl) * U]); }
      g.fillStyle = rgb(P.fore); g.beginPath(); g.moveTo(-12, H + 2); top.forEach((p) => g.lineTo(p[0], p[1])); g.lineTo(W + 12, H + 2); g.fill();
      g.strokeStyle = rgb(P.foreRim, 0.7); g.lineWidth = Math.max(1.2, U * 0.003); g.beginPath(); top.forEach((p, n) => (n ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      const keep = { tree: P.tree, treeLit: P.treeLit };
      P.tree = P.fore; P.treeLit = mix(P.fore, P.foreRim, 0.45);
      cells(lay, 0.21, 0.3, (i, xc0) => {
        const k = hash(i * 4.21 + 9), xc = xc0 + (k - 0.5) * 0.14, j = lay.j(xc), city = B.city(j);
        if (k > 0.6 - 0.3 * B.sea(j)) return;
        if (city > 0.5) { /* a street lamp */
          const x = lay.X(xc), y = base - fh(xc) * U, s = U * 0.1;
          g.strokeStyle = rgb(P.fore); g.lineWidth = Math.max(1.5, U * 0.004); g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x, y - s); g.lineTo(x + s * 0.18, y - s); g.stroke();
          g.fillStyle = rgb(P.lamp, S.light ? 0.9 : 1); g.beginPath(); g.arc(x + s * 0.18, y - s * 0.96, s * 0.05, 0, 6.2832); g.fill();
          if (!S.light) { const gl = g.createRadialGradient(x + s * 0.18, y - s * 0.96, 0, x + s * 0.18, y - s * 0.96, s * 0.7); gl.addColorStop(0, rgb(P.lamp, 0.3)); gl.addColorStop(1, rgb(P.lamp, 0)); g.fillStyle = gl; g.beginPath(); g.arc(x + s * 0.18, y - s * 0.96, s * 0.7, 0, 6.2832); g.fill(); }
          return;
        }
        tree(V, lay.X(xc), base - fh(xc) * U + U * 0.01, U * (0.11 + 0.1 * hash(i * 6.6)), B.farm(j) > 0.5 ? 1 : B.alp(j) > 0.5 ? 0 : hash(i * 3.9) > 0.5 ? 2 : 0, k);
      });
      P.tree = keep.tree; P.treeLit = keep.treeLit;
    }

    function draw(g, W, H, S) {
      const U = H * S.zoom, V = { g, W, H, U, S, cam: S.J * Z, y0: H * S.horizon, P: palette(S.light, S.tod) };
      g.clearRect(0, 0, W, H);
      if (V.y0 - 0.7 * U > H) return;
      sky(V); orb(V); clouds(V);
      range(V, { p: 0.09, cell: 0.6, seed: 83, min: 0.2, max: 0.5, base: V.y0 + 1, lit: mix(V.P.farLit, V.P.haze, 0.62), shade: mix(V.P.farShade, V.P.haze, 0.62), fade: 0.5, snow: 0 });
      range(V, { p: 0.16, cell: 0.42, seed: 11, min: 0.13, max: 0.36, base: V.y0 + 1, lit: V.P.farLit, shade: V.P.farShade, fade: 0.62, snow: 0.2 });
      balloons(V);
      range(V, { p: 0.3, cell: 0.36, seed: 47, min: 0.06, max: 0.17, base: V.y0 + 0.02 * U, lit: V.P.midLit, shade: V.P.midShade, fade: 0.4, snow: 0 });
      ridge(V);
      water(V);
      town(V, { p: 0.44, cell: 0.085, seed: 5, min: 0.07, max: 0.36, base: V.y0 + 0.03 * U, fade: 0.38, win: 0.0075, deep: 0 });
      hills(V);
      sights(V);
      town(V, { p: 0.6, cell: 0.1, seed: 23, min: 0.07, max: 0.2, base: V.y0 + 0.1 * U, fade: 0, win: 0.0095, deep: 0.1 });
      const T = track(V);
      halts(V, T); station(V, T); train(V, T);
      fore(V);
    }
    return { draw, Z };
  })();

  /* The land follows the scroll. Each stretch of a page is a stretch of the journey: the master page
     rides the whole line (a place for each chapter, the city for the work below them, the station at
     the end); a project page stays in its own country. Between two marks the camera eases, so it
     slows as a chapter arrives.

     While a chapter is pinned, the page stands still and its place answers the scroll: the train
     crosses the viaduct; windows come on in the farmhouses and a balloon climbs; a storm builds over
     the bay, breaks, and clears; the observatory throws a line that widens into a range; the city
     lights up floor by floor. The land also arrives once when the page opens (it comes up, the moon
     rises, the train rolls in), leans a little with the pointer, and takes the last screen of every
     page: the footer stands on the ground. Under reduced motion one still frame is drawn.

     The route on the right edge is the whole line at a glance: a stop for each place, a marker where
     the reader is, and a link on each stop (to its chapter here, to its page from a project page). */
  const land = { on: false };
  safe(() => {
    const canvas = el("canvas", "fx-land");
    canvas.setAttribute("aria-hidden", "true");
    const g = canvas.getContext("2d");
    if (!g) return;
    const below = [...document.querySelectorAll(".fx-stars")].pop() || document.querySelector(".fx-field");
    if (below) below.after(canvas); else body.prepend(canvas);
    land.on = true;
    html.classList.add("land");
    const mixn = (a, b, t) => a + (b - a) * t;
    const ZONE = { dpc: 1, pension: 2, wsl: 3, tsfm: 4, aurvane: 5 };
    const END = 7.4; /* where the station stands */
    const font = getComputedStyle(body).fontFamily;
    const stories = [...document.querySelectorAll("[data-story]")];
    const scene = document.querySelector("[data-cs-scene] .scene"), here = ZONE[scene && scene.dataset.scene] || 0;
    let W = 0, H = 0, d = 1, soft = 0, keys = [], chapters = [], end = 1, seen = "", cost = 0, heroBox = null, stacked = false, born = 0, lx = 0, ly = 0;

    /* The route: seven stops on a rail. */
    const root = body.dataset.root || "", pages = [...document.querySelectorAll("[data-site-nav] a")].filter((a) => /projects\/|aurvane\//.test(a.getAttribute("href") || ""));
    const ROLES = ["The engine", "The promise", "The weather station", "The navigator", "The shield"];
    const stops = [{ j: 0.32, name: "The start", href: isHome ? "#main" : root || "./" }];
    ROLES.forEach((role, i) => {
      const st = stories[i], said = st && st.querySelector(".st-role");
      stops.push({ j: i + 1.4, name: said ? said.textContent : role, href: isHome ? (st ? `#${st.id}` : "#work") : pages[i] ? pages[i].getAttribute("href") : root });
    });
    stops.push({ j: 7.36, name: "Montréal", href: isHome ? "#contact" : `${root}#contact` });
    const route = el("nav", "fx-route", body), rail = el("ol", "", route), car = el("i", "fx-route-train", rail);
    route.setAttribute("aria-label", "The journey, stop by stop");
    car.setAttribute("aria-hidden", "true");
    const links = stops.map((s, i) => {
      const li = el("li", "", rail), a = el("a", "", li);
      li.style.top = `${(i / (stops.length - 1)) * 100}%`;
      a.href = s.href;
      el("span", "", a).textContent = s.name;
      return a;
    });
    /* What the land shows that is data: each stop's headline number (from the strip under the opening screen), and the
       engine's ridge (the line of the growth chart in the page's own picture: x is the year, y is dollars on a log scale). */
    const signs = stops.slice(1, 6).map((s, i) => {
      const st = stories[i], fig = st && document.querySelector(`[data-headline="${st.dataset.story}"] .fig`);
      return { j: s.j, name: s.name, value: fig ? fig.textContent.trim() : "" };
    });
    let ridge = null, ridgeNote = "";
    safe(() => {
      const line = document.querySelector('.scene[data-scene="dpc"] [data-layer="chart"] path.sc-line:not(.is-dim)');
      const nums = line ? (line.getAttribute("d").match(/-?\d+(\.\d+)?/g) || []).map(Number) : [];
      if (nums.length < 40) return;
      const xy = [];
      for (let i = 0; i + 1 < nums.length; i += 2) xy.push([nums[i], nums[i + 1]]);
      const x0 = xy[0][0], x1 = xy[xy.length - 1][0], yb = xy[0][1], yt = Math.min(...xy.map((q) => q[1]));
      ridge = xy.filter((q, i) => i % 2 === 0 || i === xy.length - 1).map(([x, y]) => [(x - x0) / (x1 - x0), clamp((yb - y) / (yb - yt))]);
      const fig = document.querySelector('[data-headline="deep-portfolio-constructor"] .fig');
      ridgeNote = fig ? `2026 \u00b7 ${fig.textContent.trim()}` : "2026";
    });
    let nowAt = -1;
    const mark = (J) => {
      let i = 0;
      while (i < stops.length - 2 && J > stops[i + 1].j) i++;
      const f = (i + clamp((J - stops[i].j) / (stops[i + 1].j - stops[i].j))) / (stops.length - 1);
      car.style.top = `${(f * 100).toFixed(2)}%`;
      const at = Math.round(f * (stops.length - 1));
      if (at !== nowAt) { if (links[nowAt]) links[nowAt].removeAttribute("aria-current"); links[at].setAttribute("aria-current", "step"); nowAt = at; }
    };

    const size = () => {
      W = window.innerWidth; H = window.innerHeight;
      d = Math.max(0.75, Math.min(window.devicePixelRatio || 1, W > 900 ? 1.5 : 2) - soft);
      canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
      seen = "";
    };
    const plan = () => {
      size();
      end = Math.max(1, document.documentElement.scrollHeight - H);
      const narrow = W < 760, k = [], HIDE = [1.3, 0.5, 0, 0, 0, 0];
      stacked = false;
      /* For each kind of screen: the horizon (the share of the screen above the land), the zoom, a veil from the left (where
         a chapter's words are), a wash over everything (where words run the full width), whether the moon is out, and a
         lighter sky above the land (behind the name on the last screen). A mark adds where the train is across the screen. */
      const OPEN = [0.78, 0.9, 0.8, 0, 1, 0], STORY = narrow ? [0.95, 0.5, 0, 0.6, 0, 0] : [0.9, 0.66, 0.86, 0.12, 0, 0];
      const FLOW = narrow ? [0.95, 0.5, 0, 0.66, 0, 0] : [0.9, 0.66, 0, 0.64, 0, 0], LAST = narrow ? [0.74, 0.62, 0, 0, 1, 0.4] : [0.66, 0.96, 0, 0, 1, 0.5];
      const T0 = narrow ? 0.5 : 0.5, T1 = narrow ? 0.76 : 0.78; /* a chapter moves the train from here to there */
      if (isHome) {
        const hero = document.querySelector(".hero"), heroEnd = hero ? docTop(hero) + hero.offsetHeight : H;
        const space = document.querySelector(".hero-space"), r = space ? space.getBoundingClientRect() : null;
        heroBox = r && r.width > 40 && r.height > 40 ? { x: r.left, top: r.top + window.scrollY, w: r.width, h: r.height } : null; /* no box when the stage is not running */
        stacked = !!heroBox && !reduced && heroBox.w > W * 0.7;
        const quiet = !!document.querySelector(".hero-lean"); /* the home page opens on the ride: the land waits, washed back and low, with no moon over the words */
        if (quiet) k.push([0, 0.32, ...FLOW, 0.6]); /* and from there the whole line passes evenly under a short page */
        else k.push([0, 0.32, ...(stacked ? HIDE : OPEN), 0.76], [heroEnd - H * 0.75, 0.6, ...(stacked ? HIDE : OPEN), 0.8], [heroEnd + H * 0.15, 0.9, ...FLOW, 0.66]);
        const route = document.querySelector(".sky"); /* the five worlds: the land stays washed back until they have passed */
        if (route && !quiet) k.push([docTop(route) + route.offsetHeight - H * 0.85, 0.97, ...FLOW, 0.7]);
        chapters = stories.map((st, i) => ({ top: docTop(st), h: st.offsetHeight, zone: i + 1 }));
        chapters.forEach((c) => k.push([c.top - H * 0.15, c.zone + 0.06, ...STORY, T0], [c.top + c.h - H, c.zone + 0.74, ...STORY, T1]));
        const last = chapters[chapters.length - 1], after = last ? last.top + last.h : heroEnd;
        if (!quiet) k.push([after + H * 0.4, 6.0, ...FLOW, 0.6]);
        k.push([end - H * 0.95, 7.02, ...FLOW, 0.66], [end, 7.36, ...LAST, 0.7]);
      } else {
        const z = here + 0.12;
        k.push([0, z, ...(narrow ? HIDE : [0.82, 0.84, 0.8, 0, 1, 0]), 0.62], [H * 0.9, z + 0.12, ...FLOW, 0.64], [end - H * 0.95, z + 0.5, ...FLOW, 0.68], [end, z + 0.62, ...LAST, 0.7]);
      }
      keys = k;
      for (let i = 1; i < keys.length; i++) keys[i][0] = Math.max(keys[i][0], keys[i - 1][0] + 1);
      if (reduced) paint();
    };
    const at = (y) => {
      let i = 0;
      while (i < keys.length - 2 && y > keys[i + 1][0]) i++;
      const a = keys[i], b = keys[i + 1], t = inOut(clamp((y - a[0]) / (b[0] - a[0])));
      return [1, 2, 3, 4, 5, 6, 7, 8].map((n) => mixn(a[n], b[n], t));
    };
    const blink = (t, at0) => Math.max(0, 1 - Math.abs(t - at0) / 0.008);
    const paint = (dt, now = 0) => {
      if (keys.length < 2) return;
      const y = reduced ? 0 : Math.max(0, window.scrollY), light = html.dataset.theme === "light", narrow = W < 760;
      if (!born) born = now || 0.001;
      const come = reduced ? 1 : ease(clamp((now - born) / 1.8)); /* the arrival, once: 0 to 1 over the first seconds */
      if (!reduced && !narrow && pointer.active) { lx += (pointer.x / W - 0.5 - lx) * 0.06; ly += (pointer.y / H - 0.5 - ly) * 0.06; }
      const stamp = `${Math.round(y * 2)}|${light}|${come.toFixed(3)}|${Math.round(lx * 300)}|${Math.round(ly * 300)}`;
      if (stamp === seen) return;
      seen = stamp;
      const t0 = performance.now(), p = clamp(y / end);
      let [J, horizon, zoom, veil, wash, out, crown, train] = at(y), floor = false;
      if (reduced) { horizon = narrow ? 0.95 : 0.9; zoom = narrow ? 0.5 : 0.66; veil = 0; wash = 0.5; out = 0; crown = 0; } /* one quiet strip of land that stays put */
      if (stacked && heroBox) { /* the box above the words holds the land, and leaves with it */
        const edge = heroBox.top + heroBox.h - y;
        if (edge > -H * 0.12) { horizon = (edge - heroBox.h * 0.12) / H; zoom = (heroBox.h * 1.45) / H; veil = wash = crown = 0; out = 1; floor = true; }
      }
      mark(J);
      const still = 1 - come, arriving = still > 0.001 && y < H;
      if (arriving) { horizon += still * (floor ? 0.1 : 0.22); train -= still * 0.55; } /* the land comes up and the train rolls in */
      J += lx * 0.022; horizon += floor ? 0 : ly * 0.006; /* a little depth under the pointer */
      const U = H * zoom;
      /* what the place does while its chapter is read */
      const beat = { storm: 0, flash: 0, beam: 0, lit: 1, rise: 0 };
      if (isHome) {
        chapters.forEach((c) => {
          if (y < c.top - H * 0.6 || y > c.top + c.h - H * 0.4) return;
          const t = clamp((y - c.top) / Math.max(1, c.h - H));
          if (c.zone === 2) { beat.lit = 0.08 + 0.92 * inOut(seg(t, 0.05, 0.8)); beat.rise = t; }
          if (c.zone === 3) { beat.storm = Math.pow(Math.sin(Math.PI * t), 0.7); beat.flash = Math.max(blink(t, 0.42), blink(t, 0.47), blink(t, 0.63)); }
          if (c.zone === 4) beat.beam = inOut(seg(t, 0.1, 0.8));
          if (c.zone === 5) beat.lit = 0.08 + 0.92 * inOut(seg(t, 0.05, 0.85));
        });
      } else {
        if (here === 3) beat.storm = 0.12 + 0.3 * Math.sin(Math.PI * p);
        if (here === 4) beat.beam = inOut(seg(p, 0, 0.3));
        beat.rise = p;
      }
      /* the moon, or the sun: large behind the name on the opening screen, then small and high for the rest of the way */
      const orb = { x: W * mixn(0.86, 0.74, p), y: Math.max(H * 0.2, 120), r: Math.max(16, U * 0.06), a: out };
      if (isHome && heroBox && !reduced) {
        const wideNow = W > 900, big = { x: heroBox.x + heroBox.w * (wideNow ? 0.54 : 0.5), y: heroBox.top + heroBox.h * 0.47 - y * 0.62, r: Math.min(heroBox.w * (wideNow ? 0.31 : 0.22), heroBox.h * 0.32) * 0.8 };
        const t = inOut(seg(y, H * 0.3, H * 1.25));
        orb.x = mixn(big.x, orb.x, t); orb.y = mixn(big.y, orb.y, t); orb.r = mixn(big.r, orb.r, t);
      }
      if (arriving) orb.y += still * H * 0.34; /* moonrise */
      g.setTransform(d, 0, 0, d, 0, 0);
      Land.draw(g, W, H, { J, horizon, zoom, light, orb, font, train, ridge, ridgeNote, stops: signs, end: END, tod: isHome ? p : clamp((J - 0.4) / 7), spin: y / Math.max(1, H) * 1.15, ...beat });
      if (floor) { /* the banner ends in a soft edge, and the page shows through below it */
        const y1 = H * horizon + U * 0.1, cut = g.createLinearGradient(0, y1, 0, y1 + U * 0.13);
        cut.addColorStop(0, "rgba(0,0,0,0)"); cut.addColorStop(1, "rgba(0,0,0,1)");
        g.globalCompositeOperation = "destination-out"; g.fillStyle = cut; g.fillRect(0, y1, W, H - y1); g.globalCompositeOperation = "source-over";
      }
      /* words are read over the land: it steps back behind them */
      const ink = light ? "251,251,253" : "3,4,12";
      if (wash > 0.01) { g.fillStyle = `rgba(${ink},${wash})`; g.fillRect(0, 0, W, H); }
      if (veil > 0.01) {
        const gr = g.createLinearGradient(0, 0, W * 0.7, 0);
        gr.addColorStop(0, `rgba(${ink},${veil})`); gr.addColorStop(0.55, `rgba(${ink},${veil * 0.55})`); gr.addColorStop(1, `rgba(${ink},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
      if (crown > 0.01) { /* and the sky above the last skyline clears for the name */
        const gr = g.createLinearGradient(0, 0, 0, H * horizon);
        gr.addColorStop(0, `rgba(${ink},${crown})`); gr.addColorStop(0.7, `rgba(${ink},${crown * 0.4})`); gr.addColorStop(1, `rgba(${ink},0)`);
        g.fillStyle = gr; g.fillRect(0, 0, W, H * horizon);
      }
      /* a slow device gets a softer picture, never a slower page */
      cost += (performance.now() - t0 - cost) * 0.12;
      if (cost > 13 && d > 0.76) { soft += 0.25; cost = 0; size(); }
    };
    measures.push(plan);
    new MutationObserver(() => { seen = ""; if (reduced) paint(); }).observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    if (!reduced) tasks.push((dt, now) => { if (!document.hidden) paint(dt, now); });
  });

  /* ---- The ride: one dollar, January 1960, and three trains to today. ---------------------------
     The first thing under the opening screen, and the one thing the reader does rather than reads:
     pick a train (hold the market, a momentum rule, or the wealth study's neural network), board,
     and ride it through every month since 1960. The ground under each train is what its dollar had
     become, on a scale where equal growth is an equal climb; the camera follows the reader's train,
     so a crash is felt as a fall. The market's real falls of a fifth or more arrive as storms, with
     their depth; past today there is only fog. At the end stand the three results and the verdicts
     of the test that was fixed in advance. The months come in the page (data-ride, written by
     scripts/ride.py from data/dpc_wealth.json), and the final figures are the published ones. It
     plays only when asked, can be paused and dragged, and under reduced motion "Board" goes
     straight to the arrival. Without it the section is its words and the three results. */
  safe(() => {
    const stage = document.querySelector("[data-ride]");
    if (!stage) return;
    const D = JSON.parse(stage.dataset.ride), S = D.series, KEYS = ["market", "momentum", "deep"];
    const view = stage.querySelector(".ride-view"), play = stage.querySelector("[data-ride-play]"), scrub = stage.querySelector("[data-ride-scrub]");
    const dateEl = stage.querySelector("[data-ride-date]"), note = stage.querySelector("[data-ride-note]");
    const vals = {}, rows = {};
    KEYS.forEach((k) => { vals[k] = stage.querySelector(`[data-ride-val="${k}"]`); rows[k] = stage.querySelector(`.ride-hud [data-train="${k}"]`); });
    const arrival = document.querySelector("[data-ride-arrival]");
    if (!view || !play || !scrub || KEYS.some((k) => !S[k] || !vals[k])) return;
    const canvas = el("canvas", "ride-canvas");
    canvas.setAttribute("aria-hidden", "true");
    const g = canvas.getContext("2d");
    if (!g) return;
    view.prepend(canvas);
    stage.classList.add("is-live");
    if (arrival) arrival.classList.add("is-waiting");

    const N = S.market.length - 1, Y0 = +D.start.slice(0, 4), M0 = +D.start.slice(5, 7) - 1;
    const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const INK = { market: [158, 166, 194], momentum: [247, 184, 77], deep: [142, 197, 255] }, DEEP = { market: [84, 92, 120], momentum: [158, 100, 8], deep: [22, 96, 176] };
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const mixc = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
    const hash = (x) => { const v = Math.sin(x * 127.1) * 43758.5453; return v - Math.floor(v); };
    const lv = (k, m) => { const c = clamp(m, 0, N), i = Math.floor(c), f = c - i; return (S[k][i] + (S[k][Math.min(N, i + 1)] - S[k][i]) * f) / 10000; };
    const peak = []; /* the market's high so far, month by month: how far below it we are is the weather */
    S.market.forEach((v, i) => { peak.push(i ? Math.max(peak[i - 1], v) : v); });
    const below = (m) => { const i = Math.round(clamp(m, 0, N)); return 1 - Math.pow(10, (S.market[i] - peak[i]) / 10000); };
    const when = (i) => { if (i <= 0) return `${MONTH[M0]} ${Y0}`; const n = M0 + i - 1; return `${MONTH[n % 12]} ${Y0 + Math.floor(n / 12)}`; };
    const money = (v) => (v < 10 ? `$${v.toFixed(2)}` : v < 100 ? `$${v.toFixed(1)}` : `$${Math.round(v).toLocaleString("en-US")}`);

    const noise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) + (hash(i + 1) - hash(i)) * u; };
    const passed = {}; /* the first month each train's dollar is worth ten, a hundred, a thousand */
    KEYS.forEach((k) => { passed[k] = [1, 2, 3].map((d) => S[k].findIndex((v) => v >= d * 10000)); });
    const smoke = [];
    let W = 0, H = 0, dpr = 1, font = "sans-serif", light = false;
    let sel = (stage.querySelector('input[name="ride-train"]:checked') || {}).value || "deep";
    let month = 0, playing = false, started = false, arrived = false, clock = 0, noteKey = "", shownMonth = -1, dirty = true;
    const RUN = 27; /* seconds for the whole journey */

    const measure = () => {
      const b = view.getBoundingClientRect();
      if (b.width < 10) return;
      W = b.width; H = b.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      font = getComputedStyle(stage).fontFamily || font;
      dirty = true;
      if (reduced) paint(0);
    };

    const say = () => { /* the words beside the picture: only rewritten when what they say changes */
      const i = Math.round(month), storm = D.storms.find((s) => i >= s.from + 1 && i <= s.back), d = below(month);
      let key = "calm", text = "";
      if (!started && i === 0) { key = "wait"; text = "Pick a train, then board."; }
      else if (i >= N) { key = "end"; text = `Today. Past here there are no returns, only forecasts. <a href="${D.links.fog}">The navigator</a>`; }
      else if (storm && d >= 0.08) { key = `storm${storm.from}`; text = `${storm.name ? storm.name[0].toUpperCase() + storm.name.slice(1) : "A storm"}, ${storm.years}: the market falls ${storm.depth}% from its high. <a href="${D.links.storm}">What a shock does to markets</a>`; }
      else if (i < 30) { key = "guard"; text = `On board, a guard checks every order an AI gives. <a href="${D.links.guard}">The shield</a>`; }
      else if (i > N - 70) { key = "promise"; text = `The line ends at a promise: pensions to pay. <a href="${D.links.promise}">What keeping it costs</a>`; }
      if (key !== noteKey) { noteKey = key; note.innerHTML = text; }
    };
    const readout = () => {
      const i = Math.round(month);
      if (i === shownMonth) return;
      shownMonth = i;
      dateEl.textContent = when(i);
      let lead = KEYS[0];
      KEYS.forEach((k) => { vals[k].textContent = i >= N ? D.end[k] : money(Math.pow(10, S[k][i] / 10000)); if (S[k][i] > S[lead][i]) lead = k; });
      KEYS.forEach((k) => { rows[k].classList.toggle("is-you", k === sel); rows[k].classList.toggle("is-ahead", i > 0 && k === lead); });
      scrub.value = String(i);
      scrub.setAttribute("aria-valuetext", when(i));
    };
    const arrive = () => {
      if (arrived) return;
      arrived = true;
      if (arrival) arrival.classList.remove("is-waiting");
      stage.classList.add("is-arrived");
    };
    const label = () => { play.textContent = playing ? "Pause" : month >= N ? "Ride again" : started ? "Continue" : "Board"; };

    function paint(dt) {
      if (!W) return;
      light = html.dataset.theme === "light";
      const narrow = W < 620, span = narrow ? 84 : 150, xNow = W * (narrow ? 0.56 : 0.6), k = xNow / span, sc = H * 0.56, yMid = H * 0.56;
      let cam = 0; for (let j = 0; j <= 36; j += 6) cam += lv(sel, month - j); cam /= 7; /* the camera lags the train: a fall is felt */
      const X = (m) => xNow + (m - month) * k, Yl = (l) => yMid - (l - cam) * sc;
      const st = clamp(below(month) / 0.36), m0 = Math.floor(month - span - 3); /* before the first month the line is level at one dollar: the platform */
      const pr = month / N, mi = Math.floor(clamp(month, 1, N)), drop = (S.market[mi] - S.market[mi - 1]) / 10000, jolt = playing && drop < -0.04 ? (1 - (month - Math.floor(month))) : 0;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* the sky: night when the train leaves, first light when it arrives, and as dark as the fall is deep in between */
      const sky = g.createLinearGradient(0, 0, 0, H);
      const clearTop = light ? mixc([198, 218, 250], [214, 228, 250], pr) : mixc([6, 8, 24], [20, 24, 62], pr), clearLow = light ? mixc([240, 236, 248], [255, 228, 204], pr * pr) : mixc([40, 30, 80], [150, 86, 104], pr * pr);
      const top = mixc(clearTop, light ? [142, 150, 168] : [15, 16, 23], st), low = mixc(clearLow, light ? [176, 180, 190] : [36, 38, 52], st);
      sky.addColorStop(0, rgba(top, 1)); sky.addColorStop(1, rgba(low, 1));
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      if (jolt) g.translate((hash(clock * 31) - 0.5) * 7 * jolt, (hash(clock * 17 + 4) - 0.5) * 5 * jolt);
      if (!light) for (let i = 0; i < 80; i += 1) { /* stars drift a little as the years pass, and go out toward morning */
        const sx = ((hash(i) * (W + 60) - month * 0.22) % (W + 60) + W + 60) % (W + 60) - 30;
        g.fillStyle = `rgba(226,234,255,${(0.25 + 0.6 * hash(i + 9)) * (1 - st) * (1 - pr * 0.75)})`; g.fillRect(sx, hash(i + 40) * H * 0.6, 1.3, 1.3);
      }
      if (!light && st < 0.9) { /* the moon, setting slowly over the whole journey */
        const mx = W * (0.86 - pr * 0.5), my = H * (0.16 + pr * pr * 0.34), mr = Math.max(9, H * 0.036);
        const halo = g.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 4); halo.addColorStop(0, `rgba(214,222,250,${0.2 * (1 - st)})`); halo.addColorStop(1, "rgba(214,222,250,0)");
        g.fillStyle = halo; g.beginPath(); g.arc(mx, my, mr * 4, 0, 6.2832); g.fill();
        g.fillStyle = `rgba(226,230,246,${0.92 * (1 - st)})`; g.beginPath(); g.arc(mx, my, mr, 0, 6.2832); g.fill();
      }
      /* far mountains, two ranges, passing more slowly than the line */
      [[0.5, 0.62, 0.15, light ? [202, 210, 234] : [24, 21, 56], 37], [0.82, 0.74, 0.13, light ? [184, 194, 224] : [32, 27, 70], 91]].forEach(([par, base, amp, c, seed]) => {
        g.fillStyle = rgba(mixc(c, light ? [150, 156, 172] : [20, 21, 30], st * 0.7), 1); g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W + 12; x += 12) {
          const wx = (x + month * k * par) / (W * 0.16) + seed;
          g.lineTo(x, H * base - H * amp * (noise(wx) * 0.65 + noise(wx * 2.7 + 9) * 0.35));
        }
        g.lineTo(W, H); g.closePath(); g.fill();
      });
      /* heights: each line is ten times the one below it */
      g.font = `500 11px ${font}`; g.textBaseline = "middle"; g.lineWidth = 1;
      [1, 10, 100, 1000].forEach((v) => {
        const y = Yl(Math.log10(v));
        if (y < 14 || y > H - 8) return;
        g.strokeStyle = light ? "rgba(20,22,30,0.12)" : "rgba(206,214,232,0.12)"; g.setLineDash([2, 6]); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = light ? "rgba(20,22,30,0.55)" : "rgba(206,214,232,0.55)"; g.textAlign = "right"; g.fillText(`$${v.toLocaleString("en-US")}`, W - 10, y - 9);
      });
      /* years: a post every five, a name every ten */
      for (let yr = Y0; yr <= Y0 + Math.ceil(N / 12) + 1; yr += 5) {
        const x = X((yr - Y0) * 12 - M0 + 1);
        if (x < -20 || x > xNow + 4) continue;
        g.strokeStyle = light ? "rgba(20,22,30,0.14)" : "rgba(206,214,232,0.14)"; g.beginPath(); g.moveTo(x, H * 0.12); g.lineTo(x, H); g.stroke();
        if (yr % 10 === 0) { g.fillStyle = light ? "rgba(20,22,30,0.6)" : "rgba(206,214,232,0.6)"; g.textAlign = "left"; g.fillText(String(yr), x + 6, H - 14); }
      }
      /* the ground each train has covered: the reader's last, in front */
      const order = KEYS.filter((key) => key !== sel).concat(sel);
      order.forEach((key) => {
        const mine = key === sel, c = light ? DEEP[key] : INK[key];
        g.beginPath(); g.moveTo(X(m0), H);
        for (let m = m0; m < month; m += 1) g.lineTo(X(m), Yl(lv(key, m)));
        g.lineTo(xNow, Yl(lv(key, month))); g.lineTo(xNow, H); g.closePath();
        const fill = g.createLinearGradient(0, Yl(lv(key, month)) - 30, 0, H);
        fill.addColorStop(0, rgba(c, mine ? (light ? 0.3 : 0.34) : 0.1)); fill.addColorStop(1, rgba(c, mine ? 0.04 : 0.01));
        g.fillStyle = fill; g.fill();
        g.beginPath();
        for (let m = m0; m < month; m += 1) { const px = X(m), py = Yl(lv(key, m)); if (m === m0) g.moveTo(px, py); else g.lineTo(px, py); }
        g.lineTo(xNow, Yl(lv(key, month)));
        g.strokeStyle = rgba(c, mine ? 0.98 : 0.5); g.lineWidth = mine ? 2.2 : 1.2; g.lineJoin = "round"; g.stroke();
      });
      /* the storms already lived through, each with its depth */
      D.storms.forEach((s) => {
        if (s.low > month) return;
        const x = X(s.low), y = Yl(S.market[s.low] / 10000);
        if (x < 46 || x > xNow) return;
        const ty = Math.min(y + 22, H - 52); /* clear of the year names along the bottom */
        g.textAlign = "center"; g.font = `600 12px ${font}`; g.fillStyle = light ? "rgba(170,40,60,0.95)" : "rgba(255,128,150,0.95)";
        g.fillText(`−${s.depth}%`, x, ty);
        g.font = `500 10.5px ${font}`; g.fillStyle = light ? "rgba(20,22,30,0.66)" : "rgba(206,214,232,0.66)";
        g.fillText(s.name ? `${s.name}, ${s.years}` : s.years, x, ty + 15);
      });
      /* rain, and a flash in the worst months */
      if (st > 0.12) {
        g.strokeStyle = light ? `rgba(60,70,96,${0.3 * st})` : `rgba(190,204,236,${0.34 * st})`; g.lineWidth = 1;
        const drops = Math.round(st * (narrow ? 60 : 130));
        for (let i = 0; i < drops; i += 1) {
          const rx = (hash(i) * (W + 80) + clock * 90 * (0.7 + hash(i + 3))) % (W + 80) - 40, ry = (hash(i + 7) * H + clock * 520 * (0.7 + hash(i + 5))) % H;
          g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 5, ry + 15); g.stroke();
        }
        for (let i = 0; i < 7; i += 1) { /* clouds as heavy as the fall is deep */
          const cx = ((hash(i + 60) * (W + 300) + clock * 14 * (0.6 + hash(i + 61))) % (W + 300)) - 150, cy = H * (0.04 + hash(i + 62) * 0.16), cw = W * (0.1 + hash(i + 63) * 0.1);
          g.fillStyle = light ? `rgba(96,102,120,${0.5 * st})` : `rgba(44,46,62,${0.85 * st})`;
          g.beginPath(); g.ellipse(cx, cy, cw, cw * 0.3, 0, 0, 6.2832); g.ellipse(cx + cw * 0.55, cy + cw * 0.08, cw * 0.7, cw * 0.24, 0, 0, 6.2832); g.ellipse(cx - cw * 0.5, cy + cw * 0.1, cw * 0.6, cw * 0.2, 0, 0, 6.2832); g.fill();
        }
        if (jolt > 0.45) { /* lightning in the months the market lost most: the same bolt every time that month is played */
          let bx = W * (0.18 + hash(mi * 3.1) * 0.5), by = H * 0.1;
          g.strokeStyle = `rgba(255,250,224,${Math.min(1, jolt * 1.3)})`; g.lineWidth = 2; g.lineJoin = "miter"; g.beginPath(); g.moveTo(bx, by);
          for (let q = 1; q <= 7; q += 1) { bx += (hash(mi * 7.3 + q) - 0.5) * W * 0.07; by += H * 0.065; g.lineTo(bx, by); }
          g.stroke();
          g.fillStyle = `rgba(255,255,255,${jolt * 0.2})`; g.fillRect(-10, -10, W + 20, H + 20);
        }
      }
      /* what lies ahead is not known */
      const fog = g.createLinearGradient(xNow + 14, 0, W, 0), fc = light ? [236, 238, 244] : [10, 11, 22];
      fog.addColorStop(0, rgba(fc, 0)); fog.addColorStop(0.55, rgba(fc, 0.78)); fog.addColorStop(1, rgba(fc, 0.96));
      g.fillStyle = fog; g.fillRect(xNow + 14, 0, W - xNow - 14, H);
      if (pr > 0.5) { /* first light, low on the right, as the arrival nears */
        const dawn = g.createRadialGradient(W * 0.9, H * 0.86, 0, W * 0.9, H * 0.86, H * 0.9), a = Math.pow((pr - 0.5) * 2, 2) * (1 - st) * (light ? 0.5 : 0.42);
        dawn.addColorStop(0, `rgba(255,196,140,${a})`); dawn.addColorStop(0.5, `rgba(255,150,120,${a * 0.4})`); dawn.addColorStop(1, "rgba(255,150,120,0)");
        g.fillStyle = dawn; g.fillRect(xNow, 0, W - xNow, H);
      }
      if (!narrow) { g.font = `500 11px ${font}`; g.textAlign = "left"; g.fillStyle = light ? "rgba(20,22,30,0.5)" : "rgba(206,214,232,0.5)"; g.fillText(month >= N ? "today" : "not yet known", xNow + (W - xNow) * 0.42, H * 0.3); }
      /* the trains */
      const car = clamp(W * 0.022, 13, 24), hgt = car * 0.46, gap = car * 0.16;
      order.forEach((key) => {
        const mine = key === sel, cars = mine ? 4 : 3, c = INK[key];
        for (let n = cars - 1; n >= 0; n -= 1) {
          const back = (n * (car + gap)) / k, px = X(month - back), py = Yl(lv(key, month - back)), a = clamp(Math.atan2(Yl(lv(key, month - back)) - Yl(lv(key, month - back - 6)), 6 * k), -0.62, 0.62); /* the grade of the last half year: never a look ahead */
          g.save(); g.translate(px, py); g.rotate(a); g.globalAlpha = mine ? 1 : 0.62;
          if (n === 0 && mine && !light) { const beam = g.createLinearGradient(car * 0.5, 0, car * 3.6, 0); beam.addColorStop(0, "rgba(255,226,150,0.5)"); beam.addColorStop(1, "rgba(255,226,150,0)"); g.fillStyle = beam; g.beginPath(); g.moveTo(car * 0.5, -hgt * 0.3); g.lineTo(car * 3.6, -hgt * 1.7); g.lineTo(car * 3.6, hgt * 1.0); g.closePath(); g.fill(); }
          g.fillStyle = rgba(light ? DEEP[key] : mixc(c, [20, 22, 40], 0.25), 1); g.beginPath();
          if (g.roundRect) g.roundRect(-car / 2, -hgt, car, hgt, [hgt * 0.34, n === 0 ? hgt * 0.9 : hgt * 0.34, 2, 2]); else g.rect(-car / 2, -hgt, car, hgt);
          g.fill();
          g.fillStyle = mine ? (light ? "#fff4d6" : "#ffe3a0") : (light ? "rgba(255,255,255,0.7)" : "rgba(226,234,255,0.5)");
          for (let q = 0; q < 4; q += 1) g.fillRect(-car / 2 + car * (0.1 + q * 0.2), -hgt * 0.78, car * 0.12, hgt * 0.3);
          g.fillStyle = light ? "rgba(30,32,44,0.85)" : "rgba(8,9,18,0.9)";
          [-0.3, 0.3].forEach((q) => { g.beginPath(); g.arc(car * q, 0, hgt * 0.2, 0, 6.2832); g.fill(); });
          g.restore();
        }
      });
      g.globalAlpha = 1;
      /* smoke behind the reader's engine while it runs */
      if (playing && dt) {
        if (smoke.length < 26 && hash(clock * 53) < 0.5) smoke.push({ m: month, up: 0, age: 0, drift: hash(clock * 11) - 0.5 });
        for (let i = smoke.length - 1; i >= 0; i -= 1) { const q = smoke[i]; q.age += dt; q.up += dt * (26 + q.drift * 14); if (q.age > 1.5) smoke.splice(i, 1); }
      } else if (!playing && smoke.length) smoke.length = 0;
      smoke.forEach((q) => {
        const a = (1 - q.age / 1.5) * (light ? 0.3 : 0.24), r = car * (0.22 + q.age * 0.5);
        g.fillStyle = light ? `rgba(90,96,116,${a})` : `rgba(220,226,244,${a})`;
        g.beginPath(); g.arc(X(q.m) + car * 0.2, Yl(lv(sel, q.m)) - hgt * 1.3 - q.up, r, 0, 6.2832); g.fill();
      });
      /* a word when the reader's dollar becomes ten, a hundred, a thousand */
      passed[sel].forEach((at, d) => {
        const since = month - at;
        if (at < 0 || since < 0 || since > 34) return;
        const a = Math.min(1, since / 4) * (1 - Math.max(0, (since - 22) / 12)), lift = Math.min(1, since / 10) * H * 0.07;
        g.textAlign = "center"; g.font = `600 ${Math.round(clamp(W * 0.02, 15, 24))}px ${font}`;
        g.fillStyle = light ? `rgba(22,96,176,${a})` : `rgba(238,245,255,${a})`;
        g.fillText(["Ten dollars", "A hundred dollars", "A thousand dollars"][d], xNow - car, Yl(lv(sel, month)) - hgt * 2.6 - lift);
      });
      readout(); say();
      dirty = false;
    }

    const go = (m, stop) => { month = clamp(m, 0, N); if (stop) playing = false; if (month >= N) { playing = false; arrive(); } label(); dirty = true; if (reduced) paint(0); };
    play.addEventListener("click", () => {
      started = true;
      if (reduced) { go(N, true); return; } /* no motion: straight to the arrival */
      if (month >= N) month = 0;
      playing = !playing; label(); dirty = true;
    });
    scrub.addEventListener("input", () => { started = true; go(+scrub.value, true); });
    const radios = [...stage.querySelectorAll('input[name="ride-train"]')];
    const picked = () => radios.forEach((r) => r.closest(".ride-train").classList.toggle("is-picked", r.checked));
    radios.forEach((r) => {
      r.addEventListener("change", () => { if (r.checked) { sel = r.value; shownMonth = -1; dirty = true; picked(); if (reduced) paint(0); } });
      r.addEventListener("focus", () => r.closest(".ride-train").classList.toggle("is-focused", r.matches(":focus-visible")));
      r.addEventListener("blur", () => r.closest(".ride-train").classList.remove("is-focused"));
    });
    picked();
    measures.push(measure);
    tasks.push((dt) => {
      const b = view.getBoundingClientRect(), on = b.bottom > -40 && b.top < vh + 40;
      if (playing) { clock += dt; month = Math.min(N, month + (N / RUN) * dt); if (month >= N) go(N, true); if (!on) { playing = false; label(); } }
      else if (on && below(month) > 0.04) clock += dt; /* the rain keeps falling while a storm is on screen */
      if (on && (playing || dirty || below(month) > 0.04)) paint(dt);
    });
    new MutationObserver(() => { dirty = true; if (reduced) paint(0); }).observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    label();
  });

  /* ---- The route: five worlds on one line, each drawn from its project's results. ---------------
     Under the opening screen the reader sees the whole voyage at once: five worlds hanging over the
     land, a railway running past them, and the train on it, wherever the page is. Nothing on a
     world is decoration. The ridge around the first is the growth of one dollar from 1960 (the dim
     ridge is the market's). The rings of the second are simulated pension plans, each placed by
     where it stands after twenty years. The third is the Earth, lit where the sun is at this
     minute, with a wave leaving Washington. The fourth's ring sits inside the standard method's
     by exactly its forecast error, and is as wide as its interval. Thirty attacks fall on the
     fifth, and the ones that land are the ones the benchmark says land. The numbers arrive in the
     page (data-sky, written by scripts/worlds.py from the files the chapters use). It is one 2D
     canvas, drawn only while it is on screen, with a pause button; under reduced motion it is one
     still frame, and without it the section is five cards. */
  safe(() => {
    const stage = document.querySelector("[data-sky]");
    if (!stage) return;
    const D = JSON.parse(stage.dataset.sky);
    const worlds = [...stage.querySelectorAll(".sky-world")].map((li) => ({ li, kind: li.dataset.world, orb: li.querySelector(".w-orb"), x: 0, y: 0, r: 0, hot: 0, u: 0 }));
    if (worlds.length !== 5 || worlds.some((w) => !w.orb)) return;
    const canvas = el("canvas", "sky-canvas");
    canvas.setAttribute("aria-hidden", "true");
    const g = canvas.getContext("2d");
    if (!g) return;
    stage.prepend(canvas);
    stage.classList.add("is-live");

    const TAU = Math.PI * 2, RAD = Math.PI / 180;
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const mixc = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
    const INK = { ice: [142, 197, 255], white: [238, 245, 255], violet: [168, 148, 255], amber: [247, 184, 77], teal: [107, 230, 199], rose: [255, 118, 142], night: [6, 8, 22] };
    const rnd = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    /* How much of its box a world's body takes: the rest is for what surrounds it (a ridge, rings, orbits, a shield). */
    const BODY = { dpc: 0.52, pension: 0.38, wsl: 0.66, tsfm: 0.44, aurvane: 0.5 };
    const ARC = [0.13, 0.01, -0.09, 0.01, 0.13]; /* in a row, the five sit on a shallow arch */
    let W = 0, H = 0, dpr = 1, mode = "row", top = 0, light = false, font = "sans-serif";
    let rail = [], railLen = 1;

    /* The railway: one smooth line that passes behind the lower edge of every world. */
    const layRail = () => {
      const stops = worlds.map((w) => [w.x, w.y + w.r * 0.62]);
      const first = stops[0], last = stops[stops.length - 1];
      const pts = mode === "stack"
        ? [[first[0], first[1] - worlds[0].r * 3.2], ...stops, [last[0], last[1] + worlds[4].r * 3.2]]
        : [[-60, first[1] + worlds[0].r * 0.9], ...stops, [W + 60, last[1] + worlds[4].r * 0.9]];
      const P = [pts[0], ...pts, pts[pts.length - 1]];
      rail = [];
      for (let i = 1; i < P.length - 2; i += 1) {
        const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
        const n = Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 6));
        for (let k = 0; k < n; k += 1) {
          const t = k / n, t2 = t * t, t3 = t2 * t;
          rail.push([
            0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
            0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3), 0]);
        }
      }
      rail.push([pts[pts.length - 1][0], pts[pts.length - 1][1], 0]);
      for (let i = 1; i < rail.length; i += 1) rail[i][2] = rail[i - 1][2] + Math.hypot(rail[i][0] - rail[i - 1][0], rail[i][1] - rail[i - 1][1]);
      railLen = rail[rail.length - 1][2] || 1;
      worlds.forEach((w, n) => { /* where along the line each world is */
        let best = 0, bd = Infinity;
        rail.forEach((p, i) => { const d = Math.hypot(p[0] - stops[n][0], p[1] - stops[n][1]); if (d < bd) { bd = d; best = i; } });
        w.u = rail[best][2] / railLen;
      });
    };
    const onRail = (u) => {
      const d = clamp(u) * railLen;
      let lo = 0, hi = rail.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rail[mid][2] <= d) lo = mid; else hi = mid; }
      const a = rail[lo], b = rail[hi], f = (d - a[2]) / Math.max(1e-6, b[2] - a[2]);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])];
    };

    const measure = () => {
      const box = stage.getBoundingClientRect();
      if (box.width < 10) return;
      W = box.width; H = box.height; top = box.top + window.scrollY;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const cs = getComputedStyle(stage);
      mode = cs.getPropertyValue("--sky-mode").trim() || "row";
      font = cs.fontFamily || font;
      worlds.forEach((w, i) => {
        const b = w.orb.getBoundingClientRect(), size = Math.min(b.width, b.height);
        w.x = b.left - box.left + b.width / 2;
        w.y = b.top - box.top + b.height / 2 + (mode === "row" ? ARC[i] * b.height : 0);
        w.r = size * 0.5 * BODY[w.kind];
      });
      layRail();
      if (reduced) paint(0);
    };

    /* ---------------------------------------------------------------- the pieces every world shares */
    const body = (x, y, r, hi, mid, lo, glow) => {
      if (!light) { /* a little air around it */
        const air = g.createRadialGradient(x, y, r * 0.86, x, y, r * 1.55);
        air.addColorStop(0, rgba(glow, 0.3)); air.addColorStop(1, rgba(glow, 0));
        g.fillStyle = air; g.beginPath(); g.arc(x, y, r * 1.55, 0, TAU); g.fill();
      }
      const gr = g.createRadialGradient(x - r * 0.42, y - r * 0.46, r * 0.08, x - r * 0.1, y - r * 0.1, r * 1.12);
      gr.addColorStop(0, rgba(hi, 1)); gr.addColorStop(0.5, rgba(mid, 1)); gr.addColorStop(1, rgba(lo, 1));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    };
    const bands = (x, y, r, list, drift) => { /* latitude bands, seen from a little above */
      g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
      list.forEach(([lat, thick, c, a]) => {
        const yy = y + lat * r + Math.sin(drift + lat * 7) * r * 0.012, half = Math.sqrt(Math.max(0, 1 - lat * lat)) * r;
        g.fillStyle = rgba(c, a); g.beginPath(); g.ellipse(x, yy, half * 1.04, thick * r, 0, 0, TAU); g.fill();
      });
      g.restore();
    };
    const shade = (x, y, r, a = 0.5) => { /* the night side, lower right, and a thin lit rim upper left */
      g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
      const sh = g.createRadialGradient(x - r * 0.5, y - r * 0.55, r * 0.7, x - r * 0.2, y - r * 0.25, r * 1.5);
      sh.addColorStop(0, rgba(INK.night, 0)); sh.addColorStop(1, rgba(INK.night, light ? a * 0.5 : a));
      g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
      g.restore();
      g.strokeStyle = rgba(INK.white, light ? 0.5 : 0.34); g.lineWidth = Math.max(1, r * 0.022);
      g.beginPath(); g.arc(x, y, r - g.lineWidth / 2, 195 * RAD, 300 * RAD); g.stroke();
    };
    const label = (text, x, y, align, a = 0.75, size = 10.5) => {
      g.font = `500 ${size}px ${font}`; g.textAlign = align; g.textBaseline = "middle";
      g.fillStyle = light ? `rgba(20,22,30,${a})` : `rgba(206,214,232,${a})`;
      const wd = g.measureText(text).width; /* a label never leaves the picture */
      g.fillText(text, align === "center" ? clamp(x, wd / 2 + 4, W - wd / 2 - 4) : align === "left" ? Math.min(x, W - wd - 4) : Math.max(x, wd + 4), y);
    };
    /* Things that go round a world lie on tilted circles: an ellipse on the screen, half of it behind the world. */
    const tilted = (x, y, rot, k) => ({
      at: (rho, th) => { const ex = rho * Math.cos(th), ey = rho * k * Math.sin(th), c = Math.cos(rot), s = Math.sin(rot); return [x + ex * c - ey * s, y + ex * s + ey * c]; },
      arc: (rho, a0, a1) => { g.beginPath(); g.ellipse(x, y, rho, rho * k, rot, a0, a1); },
    });

    /* ---------------------------------------------------------------- 01.1 the engine: a dollar's growth is its ridge */
    const dpc = (() => {
      const top2000 = Math.log10(2000), A0 = 112 * RAD, A1 = 318 * RAD, n = D.dpc.deep.length;
      const ridge = (x, y, r, series, upto, lift) => {
        const m = Math.max(2, Math.round((n - 1) * upto) + 1), pts = [];
        for (let i = 0; i < m; i += 1) {
          const a = A0 + (A1 - A0) * i / (n - 1), rho = r * (1.035 + lift * Math.max(0, Math.log10(Math.max(series[i], 0.5))) / top2000);
          pts.push([x + rho * Math.cos(a), y + rho * Math.sin(a), a]);
        }
        return pts;
      };
      const fill = (x, y, r, pts) => {
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        pts.forEach((p) => g.lineTo(p[0], p[1]));
        g.arc(x, y, r * 0.99, pts[pts.length - 1][2], pts[0][2], true); g.closePath();
      };
      return (w, t, app) => {
        const { x, y } = w, r = w.r * (1 + w.hot * 0.07), upto = reduced ? 1 : ease(seg(app, 0.05, 0.95));
        const mk = ridge(x, y, r, D.dpc.market, upto, 0.74), dp = ridge(x, y, r, D.dpc.deep, upto, 0.74);
        const tip = dp[dp.length - 1], far = g.createRadialGradient(x, y, r, x, y, r * 1.78);
        far.addColorStop(0, "rgba(74,60,168,0.96)"); far.addColorStop(0.45, "rgba(104,128,232,0.96)"); far.addColorStop(1, rgba(INK.ice, 0.98));
        fill(x, y, r, dp); g.fillStyle = far; g.fill();
        g.strokeStyle = rgba(INK.night, 0.34); g.lineWidth = 1; /* a seam every ten years */
        for (let i = 40; i < dp.length; i += 40) { g.beginPath(); g.moveTo(x + r * Math.cos(dp[i][2]), y + r * Math.sin(dp[i][2])); g.lineTo(dp[i][0], dp[i][1]); g.stroke(); }
        g.strokeStyle = light ? "rgba(20,22,30,0.7)" : rgba(INK.white, 0.7); g.lineWidth = 1.1; g.setLineDash([3, 3.5]); /* the market, just inside */
        g.beginPath(); mk.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]);
        g.strokeStyle = rgba(INK.white, 0.9); g.lineWidth = Math.max(1, r * 0.02); g.lineJoin = "round";
        g.beginPath(); dp.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
        body(x, y, r, [176, 160, 240], [104, 86, 190], [38, 30, 92], INK.ice);
        bands(x, y, r, [[-0.42, 0.07, INK.white, 0.1], [0.08, 0.11, INK.night, 0.14], [0.5, 0.06, INK.white, 0.07]], t * 0.2);
        shade(x, y, r);
        if (!reduced && upto >= 1) { /* a light runs the crest, from 1960 to today */
          const k = Math.floor(((t * 0.11) % 1) * (dp.length - 1)), p = dp[k];
          const sp = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 0.2);
          sp.addColorStop(0, rgba(INK.white, 0.9)); sp.addColorStop(1, rgba(INK.white, 0));
          g.fillStyle = sp; g.beginPath(); g.arc(p[0], p[1], r * 0.2, 0, TAU); g.fill();
        }
        g.fillStyle = rgba(INK.white, 1); g.beginPath(); g.arc(tip[0], tip[1], Math.max(1.6, r * 0.045), 0, TAU); g.fill();
        const s0 = dp[0];
        label(D.dpc.from, s0[0] - r * 0.1, s0[1] + r * 0.2, "center", 0.7);
        if (upto > 0.97) label(D.dpc.to, tip[0] + r * 0.13, tip[1] - r * 0.02, "left", 0.9);
      };
    })();

    /* ---------------------------------------------------------------- 01.2 the promise: its rings are simulated futures */
    const pension = (() => {
      const lo = Math.log(0.6), hi = Math.log(5), place = (f) => 1.22 + 1.25 * clamp((Math.log(f) - lo) / (hi - lo));
      const r0 = rnd(712), FULL = place(1);
      const plans = [];
      [["glide", 0], ["learned", 1]].forEach(([key, bright]) => D.pension[key].forEach((f) => plans.push({ rho: place(f) + (r0() - 0.5) * 0.012, th: r0() * TAU, short: f < 1, bright })));
      return (w, t) => {
        const { x, y } = w, r = w.r * (1 + w.hot * 0.07), T = tilted(x, y, -15 * RAD, 0.3);
        const pass = (front) => {
          g.lineCap = "round";
          g.strokeStyle = light ? "rgba(20,22,30,0.5)" : rgba(INK.white, 0.6); g.lineWidth = Math.max(1, r * 0.014);
          T.arc(r * FULL, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
          plans.forEach((p) => {
            const th = (p.th + t * 0.22 * Math.pow(1.5 / p.rho, 1.5)) % TAU;
            if ((Math.sin(th) >= 0) !== front) return;
            const c = p.short ? INK.amber : p.bright ? (light ? [26, 92, 170] : INK.white) : (light ? [110, 96, 190] : INK.violet);
            g.strokeStyle = rgba(c, p.bright ? 0.95 : 0.6); g.lineWidth = Math.max(1.1, r * (p.bright ? 0.036 : 0.028));
            T.arc(r * p.rho, th - 0.11, th); g.stroke();
          });
        };
        pass(false);
        body(x, y, r, [250, 220, 160], [224, 160, 72], [96, 56, 20], INK.amber);
        bands(x, y, r, [[-0.55, 0.06, [120, 70, 20], 0.26], [-0.2, 0.1, INK.white, 0.16], [0.16, 0.07, [120, 70, 20], 0.24], [0.46, 0.09, INK.white, 0.1]], t * 0.15);
        shade(x, y, r);
        pass(true);
        const ly = y + r * 1.34; /* a sample of the line, and its name, under the world */
        g.strokeStyle = light ? "rgba(20,22,30,0.5)" : rgba(INK.white, 0.6); g.lineWidth = Math.max(1, r * 0.014);
        g.beginPath(); g.moveTo(x - 44, ly); g.lineTo(x - 30, ly); g.stroke();
        label("fully funded", x - 24, ly, "left", 0.78);
      };
    })();

    /* ---------------------------------------------------------------- 01.3 the weather station: the Earth, as it is lit now */
    const wsl = (() => {
      const raw = atob(D.wsl.bits), lw = D.wsl.w, lh = D.wsl.h, r0 = rnd(53), cells = [];
      const vec = (lon, lat) => { const f = lat * RAD, l = lon * RAD; return [Math.cos(f) * Math.sin(l), Math.sin(f), Math.cos(f) * Math.cos(l)]; };
      const dc = vec(-77.04, 38.9), ottawa = vec(-75.7, 45.42);
      for (let j = 0; j < lh; j += 1) for (let i = 0; i < lw; i += 1) {
        const k = j * lw + i;
        if (!((raw.charCodeAt(k >> 3) >> (7 - (k & 7))) & 1)) continue;
        const lat = 90 - (j + 0.5) * 180 / lh;
        if (r0() > Math.cos(lat * RAD) + 0.08) continue; /* the grid crowds the poles: keep the dots even */
        const v = vec(-180 + (i + 0.5) * 360 / lw, lat);
        cells.push([v[0], v[1], v[2], Math.acos(clamp(v[0] * dc[0] + v[1] * dc[1] + v[2] * dc[2], -1, 1))]);
      }
      /* Where the sun is overhead at this moment: its latitude from the day of the year, its longitude from the hour. */
      const sunNow = () => {
        const d = new Date(), start = Date.UTC(d.getUTCFullYear(), 0, 0), day = (d.getTime() - start) / 864e5;
        const b = TAU * (day - 81) / 364, eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); /* minutes */
        const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
        return vec(-15 * (hours - 12 + eot / 60), -23.44 * Math.cos(TAU * (day + 10) / 365.24));
      };
      let sun = sunNow(), read = 0;
      return (w, t) => {
        const { x, y } = w, r = w.r * (1 + w.hot * 0.07);
        if (t - read > 20 || t < read) { sun = sunNow(); read = t; }
        const lon0 = (-60 + 24 * Math.sin(t * 0.07)) * RAD, lat0 = 22 * RAD, cl = Math.cos(lon0), sl = Math.sin(lon0), cp = Math.cos(lat0), sp = Math.sin(lat0);
        const view = (v) => { const x1 = v[0] * cl - v[2] * sl, z1 = v[0] * sl + v[2] * cl; return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp]; };
        body(x, y, r, [92, 156, 240], [36, 84, 184], [10, 24, 78], INK.teal);
        const S = view(sun), front = ((t % 7.5) / 7.5) * 2.9, dot = Math.max(1.1, r * 0.03);
        cells.forEach((c) => {
          const p = view(c);
          if (p[2] <= 0.02) return;
          const lit = c[0] * sun[0] + c[1] * sun[1] + c[2] * sun[2], wave = reduced ? 0 : Math.max(0, 1 - Math.abs(c[3] - front) / 0.085) * (1 - front / 2.9);
          const col = wave > 0.02 ? mixc(lit > 0 ? [176, 246, 224] : [120, 150, 214], INK.amber, Math.min(1, wave * 1.4)) : lit > 0.06 ? [176, 246, 224] : lit > -0.06 ? [150, 200, 222] : [120, 150, 214];
          const s = dot * (0.7 + 0.5 * p[2]) * (1 + wave * 0.7);
          g.fillStyle = rgba(col, lit > 0 || wave > 0.02 ? 0.97 : 0.82);
          g.fillRect(x + p[0] * r - s / 2, y - p[1] * r - s / 2, s, s);
        });
        /* night falls on the side away from the sun; the edge of it is half an ellipse */
        const al = Math.atan2(-S[1], S[0]), sz = Math.abs(S[2]);
        g.fillStyle = rgba(INK.night, light ? 0.3 : 0.4); g.beginPath();
        g.arc(x, y, r, al + Math.PI / 2, al + Math.PI * 1.5);
        if (S[2] > 0) g.ellipse(x, y, r * sz, r, al, Math.PI * 1.5, Math.PI / 2, true); else g.ellipse(x, y, r * sz, r, al, Math.PI * 1.5, Math.PI * 2.5, false);
        g.closePath(); g.fill();
        [[dc, 1], [ottawa, 0.7]].forEach(([v, k], i) => {
          const p = view(v);
          if (p[2] <= 0.05) return;
          const px = x + p[0] * r, py = y - p[1] * r, beat = reduced ? 0.4 : (t * 0.5 + i * 0.5) % 1;
          g.strokeStyle = rgba(INK.amber, (1 - beat) * 0.9); g.lineWidth = 1.2;
          g.beginPath(); g.arc(px, py, r * (0.04 + beat * 0.16) * k, 0, TAU); g.stroke();
          g.fillStyle = rgba(INK.amber, 1); g.beginPath(); g.arc(px, py, Math.max(1.6, r * 0.032 * k), 0, TAU); g.fill();
        });
        g.strokeStyle = rgba(INK.white, light ? 0.5 : 0.3); g.lineWidth = Math.max(1, r * 0.018);
        g.beginPath(); g.arc(x, y, r - g.lineWidth / 2, 0, TAU); g.stroke();
      };
    })();

    /* ---------------------------------------------------------------- 02 the navigator: its ring sits inside the standard's */
    const tsfm = (w, t) => {
      const { x, y } = w, r = w.r * (1 + w.hot * 0.07), T = tilted(x, y, 13 * RAD, 0.36), R1 = r * 2.12;
      const pass = (front) => {
        const a0 = front ? 0 : Math.PI, a1 = front ? Math.PI : TAU;
        g.lineCap = "butt";
        g.strokeStyle = light ? "rgba(20,22,30,0.5)" : "rgba(206,214,232,0.55)"; g.lineWidth = Math.max(1, r * 0.016); g.setLineDash([r * 0.09, r * 0.08]);
        T.arc(R1, a0, a1); g.stroke(); g.setLineDash([]);
        g.strokeStyle = rgba(INK.violet, light ? 0.28 : 0.3); g.lineWidth = R1 * (D.tsfm.hi - D.tsfm.lo); /* as wide as the 95% interval */
        T.arc(R1 * (D.tsfm.hi + D.tsfm.lo) / 2, a0, a1); g.stroke();
        g.strokeStyle = light ? "rgba(70,52,170,0.95)" : rgba(INK.white, 0.92); g.lineWidth = Math.max(1.2, r * 0.026);
        T.arc(R1 * D.tsfm.ratio, a0, a1); g.stroke();
        [[R1 * D.tsfm.ratio, t * 0.5 + 1, INK.white, 0.075], [R1, t * 0.27 + 3.6, [150, 156, 180], 0.05]].forEach(([rho, th0, c, size]) => {
          const th = th0 % TAU;
          if ((Math.sin(th) >= 0) !== front) return;
          const p = T.at(rho, th);
          if (!light) { const gl = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * size * 3.4); gl.addColorStop(0, rgba(c, 0.55)); gl.addColorStop(1, rgba(c, 0)); g.fillStyle = gl; g.beginPath(); g.arc(p[0], p[1], r * size * 3.4, 0, TAU); g.fill(); }
          g.fillStyle = light ? rgba(mixc(c, INK.night, 0.55), 1) : rgba(c, 1); g.beginPath(); g.arc(p[0], p[1], Math.max(1.8, r * size), 0, TAU); g.fill();
        });
      };
      pass(false);
      body(x, y, r, [206, 190, 255], [128, 104, 226], [40, 28, 104], INK.violet);
      bands(x, y, r, [[-0.6, 0.05, INK.white, 0.16], [-0.3, 0.09, [60, 40, 150], 0.3], [0.02, 0.06, INK.white, 0.14], [0.3, 0.1, [60, 40, 150], 0.26], [0.62, 0.05, INK.white, 0.1]], t * 0.25);
      shade(x, y, r);
      pass(true);
      const ly = y + r * 1.42;
      g.strokeStyle = light ? "rgba(20,22,30,0.5)" : "rgba(206,214,232,0.55)"; g.lineWidth = Math.max(1, r * 0.016); g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(x - 58, ly); g.lineTo(x - 40, ly); g.stroke(); g.setLineDash([]);
      label("standard method", x - 34, ly, "left", 0.78);
    };

    /* ---------------------------------------------------------------- 03 the shield: thirty attacks, and the ones that land */
    const aurvane = (() => {
      const r0 = rnd(303), list = [];
      D.aurvane.attacks.forEach(([, n, landed]) => { for (let i = 0; i < n; i += 1) list.push({ lands: i < landed }); });
      for (let i = list.length - 1; i > 0; i -= 1) { const j = Math.floor(r0() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
      const FROM = 214 * RAD, SPAN = 60 * RAD, SHIELD = 1.56, GAP = 0.25, FLY = 1.15, LOOP = list.length * GAP + FLY + 2.6;
      list.forEach((m, i) => { m.a = FROM + (r0() - 0.5) * 2 * SPAN; m.at = 0.5 + i * GAP; });
      const total = list.length;
      return (w, t) => {
        const { x, y } = w, r = w.r * (1 + w.hot * 0.07), tt = reduced ? LOOP - 0.01 : t % LOOP;
        let stopped = 0, landed = 0, flash = 0;
        body(x, y, r, [255, 170, 186], [214, 78, 112], [70, 20, 44], INK.rose);
        bands(x, y, r, [[-0.44, 0.08, INK.white, 0.12], [0.1, 0.1, [90, 20, 50], 0.24], [0.52, 0.06, INK.white, 0.08]], t * 0.2);
        shade(x, y, r);
        list.forEach((m) => {
          const k = (tt - m.at) / FLY, ca = Math.cos(m.a), sa = Math.sin(m.a), far = 3.5, stop = m.lands ? 1.0 : SHIELD;
          if (k <= 0) return;
          const hit = [x + ca * r * stop, y + sa * r * stop];
          if (k < 1) { /* on its way in */
            const d = far - (far - stop) * k * k, hx = x + ca * r * d, hy = y + sa * r * d, tail = Math.min(0.75, far - d), c = m.lands ? INK.amber : INK.ice;
            const tr = g.createLinearGradient(hx + ca * r * tail, hy + sa * r * tail, hx, hy);
            tr.addColorStop(0, rgba(c, 0)); tr.addColorStop(1, rgba(c, 0.9));
            g.strokeStyle = tr; g.lineWidth = Math.max(1.2, r * 0.03); g.lineCap = "round";
            g.beginPath(); g.moveTo(hx + ca * r * tail, hy + sa * r * tail); g.lineTo(hx, hy); g.stroke();
            g.fillStyle = rgba(light ? mixc(c, INK.night, 0.4) : INK.white, 1); g.beginPath(); g.arc(hx, hy, Math.max(1.4, r * 0.035), 0, TAU); g.fill();
            return;
          }
          if (m.lands) { /* it got through: a mark that stays until the next round */
            landed += 1;
            const age = (tt - m.at - FLY), ring = Math.min(1, age / 0.5);
            g.strokeStyle = rgba(INK.amber, (1 - ring) * 0.9); g.lineWidth = 1.4; g.beginPath(); g.arc(hit[0], hit[1], r * 0.26 * ring, 0, TAU); g.stroke();
            g.fillStyle = rgba(INK.amber, 1); g.beginPath(); g.arc(hit[0], hit[1], Math.max(2, r * 0.05), 0, TAU); g.fill();
          } else { /* stopped at the shield */
            stopped += 1;
            const age = (tt - m.at - FLY) / 0.5;
            if (age < 1) {
              flash = Math.max(flash, 1 - age);
              g.strokeStyle = rgba(light ? [30, 90, 170] : INK.white, (1 - age) * 0.95); g.lineWidth = 1.4;
              g.beginPath(); g.arc(hit[0], hit[1], r * 0.3 * age, 0, TAU); g.stroke();
            }
          }
        });
        g.lineCap = "round";
        g.strokeStyle = rgba(light ? [30, 90, 170] : INK.ice, 0.16 + flash * 0.3); g.lineWidth = r * 0.16;
        g.beginPath(); g.arc(x, y, r * SHIELD, FROM - SPAN - 0.22, FROM + SPAN + 0.22); g.stroke();
        g.strokeStyle = rgba(light ? [30, 90, 170] : INK.white, 0.6 + flash * 0.4); g.lineWidth = Math.max(1.2, r * 0.028);
        g.beginPath(); g.arc(x, y, r * (SHIELD + 0.08), FROM - SPAN - 0.22, FROM + SPAN + 0.22); g.stroke();
        label(`${stopped + landed} of ${total} arrived · ${stopped} stopped · ${landed} landed`, x + r * 0.1, y + r * 1.78, "center", 0.8);
      };
    })();
    const DRAW = { dpc, pension, wsl, tsfm, aurvane };

    /* ---------------------------------------------------------------- the line and the train on it */
    const line = () => {
      g.strokeStyle = light ? "rgba(20,22,30,0.26)" : "rgba(206,214,232,0.26)"; g.lineWidth = 1.2; g.setLineDash([2, 7]); g.lineCap = "round";
      g.beginPath(); rail.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke(); g.setLineDash([]);
    };
    const train = (u) => {
      const car = clamp(W * 0.021, 15, 26), hgt = car * 0.44, gap = car * 0.16;
      for (let i = 3; i >= 0; i -= 1) {
        const [px, py, a] = onRail(u - (i * (car + gap)) / railLen);
        g.save(); g.translate(px, py); g.rotate(a);
        if (i === 0 && !light) { /* the lamp */
          const beam = g.createLinearGradient(car * 0.5, 0, car * 3.4, 0);
          beam.addColorStop(0, "rgba(255,226,150,0.5)"); beam.addColorStop(1, "rgba(255,226,150,0)");
          g.fillStyle = beam; g.beginPath(); g.moveTo(car * 0.5, -hgt * 0.2); g.lineTo(car * 3.4, -hgt * 1.5); g.lineTo(car * 3.4, hgt * 1.1); g.closePath(); g.fill();
        }
        g.fillStyle = "#c8443c"; g.beginPath();
        if (g.roundRect) g.roundRect(-car / 2, -hgt, car, hgt, [hgt * 0.34, i === 0 ? hgt * 0.9 : hgt * 0.34, 2, 2]); else g.rect(-car / 2, -hgt, car, hgt);
        g.fill();
        g.fillStyle = "#f3e2c0"; g.fillRect(-car / 2 + 1, -hgt * 0.88, car - (i === 0 ? car * 0.2 : 2), hgt * 0.4);
        g.fillStyle = light ? "#6c7890" : "#ffd98a";
        for (let k = 0; k < 4; k += 1) g.fillRect(-car / 2 + car * (0.1 + k * 0.2), -hgt * 0.8, car * 0.12, hgt * 0.26);
        g.restore();
      }
    };

    /* ---------------------------------------------------------------- one frame */
    let clock = 0, paused = false, pick = -1, at = 0.04, shown = false, nextDone = false;
    function paint(dt) {
      if (!W || !rail.length) return;
      const y = window.scrollY, on = y + vh > top - 80 && y < top + H + 80;
      if (!on && !reduced) return;
      if (!paused) clock += dt;
      light = html.dataset.theme === "light";
      const p = reduced ? 1 : clamp((y + vh * 0.86 - top) / (H + vh * 0.42)), app = reduced ? 1 : seg(p, 0.03, 0.42);
      const goal = pick >= 0 ? worlds[pick].u - (worlds[pick].r * 1.5) / railLen : reduced ? (worlds[3].u + worlds[4].u) / 2 : 0.05 + 0.9 * seg(p, 0.1, 0.92); /* still: between two stops, in full view */
      at += (goal - at) * (reduced ? 1 : 1 - Math.pow(1 - 0.07, dt * 60));
      worlds.forEach((w, i) => { w.hot += ((i === pick ? 1 : 0) - w.hot) * (reduced ? 1 : 1 - Math.pow(1 - 0.14, dt * 60)); });
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.globalAlpha = app;
      line(); train(at);
      const lx = reduced || !pointer.active ? 0 : (pointer.x / window.innerWidth - 0.5), ly = reduced || !pointer.active ? 0 : (pointer.y / vh - 0.5);
      worlds.forEach((w, i) => {
        const rise = (1 - ease(seg(app, i * 0.1, 0.6 + i * 0.1))) * 46, depth = [0.7, 1, 1.4, 1, 0.7][i];
        g.globalAlpha = ease(seg(app, i * 0.1, 0.5 + i * 0.1)) * (pick >= 0 && pick !== i ? 0.5 + 0.5 * w.hot : 1);
        g.save(); g.translate(-lx * 9 * depth, rise - ly * 6 * depth);
        DRAW[w.kind](w, clock, app);
        g.restore();
      });
      g.globalAlpha = 1;
      if (!shown) { shown = true; stage.classList.add("is-drawn"); }
      if (!nextDone) { /* the next decision, counted in days from today */
        nextDone = true;
        const slot = stage.querySelector("[data-sky-next]"), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(D.wsl.next || "");
        if (slot && m) {
          const day = Date.UTC(+m[1], +m[2] - 1, +m[3]), now = new Date(), today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()), n = Math.round((day - today) / 864e5);
          const when = new Date(day).toLocaleDateString("en-CA", { day: "numeric", month: "long", timeZone: "UTC" });
          if (n > 0) slot.textContent = `The next forecast is for ${when}, in ${n} day${n === 1 ? "" : "s"}.`;
          else if (n === 0) slot.textContent = `The next forecast is for today, ${when}.`;
          else slot.textContent = "";
        }
      }
    }

    worlds.forEach((w, i) => {
      const a = w.li.querySelector("a");
      const set = (v) => { pick = v; if (reduced) paint(0); };
      a.addEventListener("pointerenter", () => set(i));
      a.addEventListener("pointerleave", () => { if (pick === i) set(-1); });
      a.addEventListener("focus", () => set(i));
      a.addEventListener("blur", () => { if (pick === i) set(-1); });
    });
    const pause = stage.querySelector("[data-sky-pause]");
    if (pause && !reduced) {
      pause.hidden = false;
      pause.addEventListener("click", () => { paused = !paused; pause.setAttribute("aria-pressed", String(paused)); pause.textContent = paused ? "Play" : "Pause"; });
    }
    measures.push(measure);
    tasks.push((dt) => paint(dt));
    if (reduced) new MutationObserver(() => paint(0)).observe(html, { attributes: true, attributeFilter: ["data-theme"] });
  });

  if (reduced) { startClock(); return; }

  /* ---- Grain, scroll progress, and a header that steps aside while you read down. ------------ */
  safe(() => {
    el("div", "fx-grain", body).setAttribute("aria-hidden", "true");
    const bar = el("div", "fx-progress", body);
    bar.setAttribute("aria-hidden", "true");
    const header = document.querySelector(".site-header");
    const nav = document.querySelector("[data-site-nav]");
    let dir = 0, lastP = -1;
    tasks.push(() => {
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      const p = Math.round((window.scrollY / max) * 1000) / 1000;
      if (p !== lastP) { bar.style.setProperty("--p", p); lastP = p; }
      if (isHome && header) {
        if (Math.abs(scrollV) > 40) dir = Math.sign(scrollV);
        header.classList.toggle("is-tucked", dir > 0 && window.scrollY > vh * 0.6 && !nav?.classList.contains("open") && !header.matches(":focus-within"));
      }
    });
  });

  /* A little helper: write a CSS variable only when its value really changed. */
  const setVar = (node, name, value, digits = 3) => {
    const v = value.toFixed(digits);
    if (node["_" + name] !== v) { node["_" + name] = v; node.style.setProperty(name, v); }
  };

  /* ---- Titles split into characters whose rise is tied to the scroll. ------------------------ */
  const splitText = (node) => {
    if (node.dataset.split || node.children.length) return false;
    const text = node.textContent.trim();
    if (!text) return false;
    node.dataset.split = "1";
    const sr = el("span", "visually-hidden");
    sr.textContent = text;
    const vis = el("span", "fx-split");
    vis.setAttribute("aria-hidden", "true");
    let i = 0;
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { vis.append(document.createTextNode(" ")); return; }
      const word = el("span", "w", vis);
      for (const ch of part) { const c = el("span", "ch", word); c.textContent = ch; c.style.setProperty("--i", i++); }
    });
    vis.style.setProperty("--n", Math.max(1, i - 1));
    node.replaceChildren(sr, vis);
    return true;
  };

  safe(() => {
    const heads = [...document.querySelectorAll(".section-head h2, .contact h2, .cs-hero h1, .st-title")].filter(splitText)
      .map((n) => ({ n, top: 0 }));
    measures.push(() => heads.forEach((h) => { h.top = docTop(h.n); }));
    tasks.push(() => {
      const y = window.scrollY;
      heads.forEach((h) => {
        const rel = h.top - y;
        if (rel > vh * 1.2 || rel < -vh) return;
        setVar(h.n, "--r", clamp((vh * 0.98 - rel) / (vh * 0.42)));
      });
    });
  });

  /* ---- The hero: the name is there at once, then leaves letter by letter as you scroll. ------ */
  safe(() => {
    const hero = document.querySelector(".hero");
    const h1 = hero?.querySelector("h1");
    if (!hero || !h1) return;
    splitText(h1);
    const copy = [...hero.querySelectorAll(".hero-copy > :not(h1)")];
    const viz = hero.querySelector(".hero-stage");
    let hh = 1;
    measures.push(() => { hh = hero.offsetHeight; });
    tasks.push(() => {
      const p = clamp(window.scrollY / (hh * 1.1));
      if (p > 1 && h1._done) return;
      h1._done = p >= 1;
      setVar(h1, "--hx", p);
      copy.forEach((c, i) => {
        const q = clamp(p * 1.6 - i * 0.12);
        c.style.opacity = (1 - q).toFixed(3);
        c.style.transform = q ? `translate3d(0, ${(-q * 50).toFixed(1)}px, 0)` : "";
      });
      if (viz) {
        viz.style.opacity = (1 - clamp(p * 1.3)).toFixed(3);
        viz.style.transform = p ? `translate3d(0, ${(p * 90).toFixed(1)}px, 0) scale(${(1 - p * 0.14).toFixed(3)})` : "";
      }
    });

    /* Kinetic name: letters thicken and light up where the pointer goes. */
    if (!finePointer) return;
    const chars = [...h1.querySelectorAll(".ch")];
    const f = chars.map(() => 0);
    let rects = [];
    const measureChars = () => { rects = chars.map((c) => { const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 + window.scrollY, r.height]; }); };
    setTimeout(measureChars, 1000); /* after the name has landed */
    measures.push(measureChars);
    tasks.push(() => {
      if (!wide() || window.scrollY > vh || !rects.length) return;
      chars.forEach((c, i) => {
        const [cx, cy, h] = rects[i];
        const d = Math.hypot(pointer.x - cx, (pointer.y - (cy - window.scrollY)) * 1.4);
        const want = pointer.active ? Math.exp(-(d * d) / (2 * Math.pow(h * 0.9, 2))) : 0;
        const next = f[i] + (want - f[i]) * 0.16;
        if (Math.abs(next - f[i]) > 0.002) { f[i] = next; c.style.setProperty("--f", next.toFixed(3)); }
      });
    });
  });

  /* ---- Telemetry figures count up to their exact published text, straight away. ------------- */
  safe(() => {
    document.querySelectorAll(".telemetry .fig").forEach((node, k) => {
      const final = node.textContent;
      const m = final.match(/([−-]?)(\d[\d,]*)(\.\d+)?/);
      if (!m) return;
      const target = parseFloat((m[2] + (m[3] || "")).replace(/,/g, ""));
      const decimals = m[3] ? m[3].length - 1 : 0;
      const fmt = (v) => {
        let s = v.toFixed(decimals);
        if (m[2].includes(",")) { const [a, b] = s.split("."); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (b ? "." + b : ""); }
        return final.slice(0, m.index) + m[1] + s + final.slice(m.index + m[0].length);
      };
      node.setAttribute("aria-label", final);
      const start = performance.now() + k * 70, dur = 1300;
      const step = (now) => {
        const q = clamp((now - start) / dur);
        node.textContent = q < 1 ? fmt(target * ease(q)) : final;
        if (q < 1) requestAnimationFrame(step); else node.removeAttribute("aria-label");
      };
      requestAnimationFrame(step);
    });
  });

  /* ---- Blocks rise into place with the scroll; rows of siblings arrive one after another. ---- */
  safe(() => {
    const groups = [".rules", ".toolkit", ".certs-block", ".facts", ".pipeline", ".cards"];
    const items = [];
    const add = (n, idx) => items.push({ n, idx, top: 0, done: false });
    document.querySelectorAll("[data-reveal]").forEach((n) => {
      if (n.closest(".hero")) return;
      const host = groups.find((g) => n.matches(g));
      if (host) [...n.querySelectorAll(":scope > li, :scope > article, :scope > div, :scope .certs > article")].forEach((c, i) => add(c, i));
      else add(n, n.matches(".card") ? [...n.parentElement.children].indexOf(n) : 0);
    });
    document.querySelectorAll(".facts > div, .pipeline > li, .split > *").forEach((n, i) => add(n, n.parentElement.matches(".facts, .pipeline") ? [...n.parentElement.children].indexOf(n) : 0));
    const roles = [...document.querySelectorAll(".role")];
    measures.push(() => items.forEach((it) => { it.top = docTop(it.n); }));
    tasks.push(() => {
      const y = window.scrollY;
      const atEnd = y >= document.documentElement.scrollHeight - vh - 4;
      items.forEach((it) => {
        const rel = it.top - y;
        let r = atEnd ? 1 : clamp((vh * 1.02 - rel - it.idx * vh * 0.045) / (vh * 0.3));
        if (r >= 1) {
          if (!it.done) { it.done = true; it.n.style.opacity = ""; it.n.style.transform = ""; }
          return;
        }
        it.done = false;
        const e = ease(r);
        it.n.style.opacity = e.toFixed(3);
        it.n.style.transform = `translate3d(0, ${((1 - e) * 70).toFixed(1)}px, 0) scale(${(0.965 + 0.035 * e).toFixed(4)})`;
      });
      roles.forEach((n) => {
        const rel = n.getBoundingClientRect().top;
        setVar(n, "--line-p", clamp((vh * 0.95 - rel) / (vh * 0.5)));
      });
    });
  });

  /* ---- The statement lights up word by word. ------------------------------------------------- */
  safe(() => {
    const st = document.querySelector("[data-statement]");
    if (!st) return;
    const words = [...st.querySelectorAll(".sw")];
    words.forEach((w, i) => w.style.setProperty("--i", i));
    st.style.setProperty("--n", words.length);
    let top = 0, h = 1;
    measures.push(() => { top = docTop(st); h = st.offsetHeight; });
    tasks.push(() => {
      const rel = top - window.scrollY;
      if (rel > vh * 1.2 || rel + h < -vh) return;
      setVar(st, "--r", clamp((vh * 0.88 - rel) / (h + vh * 0.32)), 4);
    });
  });

  /* ---- Stories: each chapter holds the screen while its steps and picture play out. ---------- */
  const fmtMoney = (v) => "$" + (v >= 10 ? Math.round(v).toLocaleString("en-US") : v.toFixed(2));
  const lenOf = (n) => { if (!n._len) n._len = n.getTotalLength(); return n._len; };
  const drawLine = (n, d) => {
    const L = lenOf(n);
    if (!n._dash) { n.style.strokeDasharray = `${L} ${L}`; n._dash = true; }
    n.style.strokeDashoffset = (L * (1 - d)).toFixed(1);
  };
  const show = (n, o, transform) => {
    if (!n) return;
    const v = o.toFixed(3);
    if (n._o !== v) { n._o = v; n.style.opacity = v; n.style.visibility = o <= 0.001 ? "hidden" : ""; }
    if (transform !== undefined) n.style.transform = transform;
  };
  const finals = new WeakMap();
  const finalOf = (n) => { if (!finals.has(n)) finals.set(n, n.textContent); return finals.get(n); };
  const setText = (n, text) => { if (n && n._t !== text) { n._t = text; n.textContent = text; } };

  const SCENES = {
    dpc(svg) {
      const L = (k) => svg.querySelector(`[data-layer="${k}"]`);
      const coin = L("coin"), bars = L("bars"), chart = L("chart"), verdict = L("verdict");
      const barEls = [...bars.querySelectorAll(".sc-bar")];
      const [mLine, dLine] = chart.querySelectorAll("[data-draw]");
      const head = chart.querySelector("[data-head]");
      const year = chart.querySelector("[data-year]");
      const [dVal, mVal] = chart.querySelectorAll("[data-bind]");
      const data = JSON.parse(svg.dataset.series);
      const N = data.deep.length;
      return (s) => {
        show(coin, 1 - seg(s, 0.55, 0.95), `scale(${(1 - 0.35 * seg(s, 0.45, 0.95)).toFixed(3)})`);
        show(bars, seg(s, 0.7, 1.0) * (1 - seg(s, 1.75, 2.05)));
        barEls.forEach((b, k) => { b.style.transform = `scaleY(${ease(seg(s, 0.75 + k * 0.014, 1.2 + k * 0.014)).toFixed(3)})`; });
        show(chart, seg(s, 1.85, 2.15));
        const d = inOut(seg(s, 2.0, 3.35));
        drawLine(mLine, d);
        drawLine(dLine, d);
        const pt = dLine.getPointAtLength(lenOf(dLine) * d);
        head.setAttribute("cx", pt.x.toFixed(1));
        head.setAttribute("cy", pt.y.toFixed(1));
        const i = Math.round(d * (N - 1));
        setText(year, String(data.year[i]));
        setText(dVal, d >= 1 ? finalOf(dVal) : fmtMoney(data.deep[i]));
        setText(mVal, d >= 1 ? finalOf(mVal) : fmtMoney(data.market[i]));
        show(verdict, seg(s, 3.2, 3.5));
      };
    },
    pension(svg) {
      const L = (k) => svg.querySelector(`[data-layer="${k}"]`);
      const promise = L("promise"), axes = L("axes"), f60 = L("fan60"), fGlide = L("fanGlide"), fLearned = L("fanLearned"), result = L("result");
      return (s) => {
        show(promise, 1 - seg(s, 0.75, 1.0));
        show(axes, seg(s, 0.8, 1.1));
        show(f60, seg(s, 0.85, 1.15) * (1 - seg(s, 1.85, 2.1)));
        show(fGlide, seg(s, 1.95, 2.2) * (1 - seg(s, 2.85, 3.1)));
        show(fLearned, seg(s, 2.95, 3.2));
        show(result, seg(s, 3.1, 3.4));
      };
    },
    tsfm(svg) {
      const L = (k) => svg.querySelector(`[data-layer="${k}"]`);
      const many = L("many"), fan = L("fan"), audit = L("audit"), result = L("result");
      const sparks = [...many.querySelectorAll(".sc-spark")].map((n) => { const b = n.getBBox(); return { n, dx: 300 - (b.x + b.width / 2), dy: 200 - (b.y + b.height / 2) }; });
      const hist = fan.querySelector("[data-draw]"), fut = fan.querySelector("[data-draw2]"), poly = fan.querySelector("[data-fan]");
      const scan = audit.querySelector("[data-scan]");
      const squares = [...audit.querySelectorAll(".sc-sq")].map((n) => ({ n, x: +n.getAttribute("x") }));
      const removed = audit.querySelector('[data-bind$="flagged.display"]');
      const [g1, g2] = result.querySelectorAll("[data-grow]");
      const big = result.querySelector("[data-bind]");
      const target = parseFloat(finalOf(big));
      const removedN = parseInt(finalOf(removed).replace(/,/g, ""), 10);
      return (s) => {
        show(many, 1 - seg(s, 0.8, 1.05));
        const m = ease(seg(s, 0.3, 0.95)) * 0.85;
        sparks.forEach((p, k) => { p.n.style.transform = `translate(${(p.dx * m).toFixed(1)}px, ${(p.dy * m).toFixed(1)}px)`; p.n.style.opacity = (0.75 * (1 - m * 0.6)).toFixed(3); });
        show(fan, seg(s, 0.9, 1.15) * (1 - seg(s, 1.85, 2.1)));
        drawLine(hist, inOut(seg(s, 0.95, 1.45)));
        drawLine(fut, inOut(seg(s, 1.4, 1.7)));
        show(poly, seg(s, 1.4, 1.8));
        show(audit, seg(s, 1.9, 2.15) * (1 - seg(s, 2.85, 3.1)));
        const a = seg(s, 2.12, 2.75);
        const sx = 40 + 520 * a;
        scan.setAttribute("x1", sx.toFixed(1)); scan.setAttribute("x2", sx.toFixed(1));
        squares.forEach((q) => q.n.classList.toggle("is-on", q.x + 17 < sx));
        setText(removed, a >= 1 ? finalOf(removed) : Math.round(removedN * a).toLocaleString("en-US"));
        show(result, seg(s, 2.9, 3.15));
        g1.style.transform = `scaleX(${ease(seg(s, 3.0, 3.4)).toFixed(3)})`;
        const g = ease(seg(s, 3.15, 3.7));
        g2.style.transform = `scaleX(${g.toFixed(3)})`;
        setText(big, g >= 1 ? finalOf(big) : (g * target).toFixed(3) + "×");
      };
    },
    wsl(svg) {
      const L = (k) => svg.querySelector(`[data-layer="${k}"]`);
      const ripple = L("ripple"), tsx = L("tsx"), record = L("record");
      const ring = ripple.querySelector("[data-ring]"), ring2 = ripple.querySelector("[data-ring2]");
      const core = ripple.querySelector(".sc-core");
      const dots = [...ripple.querySelectorAll(".sc-dot")].map((n) => ({ n, r: +n.dataset.r }));
      const band = tsx.querySelector("[data-grow]");
      const big = tsx.querySelector("[data-bind]");
      const target = parseFloat(finalOf(big).replace("−", "-"));
      const runner = record.querySelector("[data-grow]");
      return (s) => {
        const pulse = 1 + 0.12 * Math.sin(s * Math.PI * 5) * (1 - seg(s, 0.8, 1.1));
        core.style.transform = `scale(${pulse.toFixed(3)})`;
        const rr = 210 * inOut(seg(s, 0.95, 1.85));
        const rr2 = 210 * inOut(seg(s, 1.1, 2.0));
        const fade = 1 - seg(s, 1.8, 2.05);
        [[ring, rr, fade], [ring2, rr2, fade * 0.7]].forEach(([n, r, o]) => {
          n.setAttribute("rx", r.toFixed(1)); n.setAttribute("ry", (r * 0.82).toFixed(1));
          n.style.opacity = r > 2 ? o.toFixed(3) : "0";
        });
        dots.forEach((d) => d.n.classList.toggle("is-lit", rr >= d.r - 4 || s >= 2));
        setVar(ripple, "--dim", seg(s, 2.0, 2.3) * (1 - seg(s, 3.0, 3.3) * 0.5));
        show(tsx, seg(s, 2.0, 2.3));
        const g = ease(seg(s, 2.2, 2.75));
        band.style.transform = `scaleX(${g.toFixed(3)})`;
        setText(big, g >= 1 ? finalOf(big) : (g * target).toFixed(2).replace("-", "−") + "%");
        show(record, seg(s, 2.95, 3.2));
        runner.style.transform = `scaleX(${inOut(seg(s, 3.05, 3.7)).toFixed(3)})`;
      };
    },
    aurvane(svg) {
      const L = (k) => svg.querySelector(`[data-layer="${k}"]`);
      const msg = L("msg"), slip = L("slip"), attacks = L("attacks");
      const typed = msg.querySelector("[data-type]");
      const text = typed.dataset.type;
      const rows = [...slip.querySelectorAll(".sc-row")];
      const seal = slip.querySelector(".sc-seal"), sealT = slip.querySelector(".sc-seal-t");
      const sq = [...attacks.querySelectorAll(".sc-atk")].map((n) => ({ n, x: +n.getAttribute("x"), kept: n.classList.contains("is-kept") }));
      sq.forEach((q) => { if (q.kept) q.n.dataset.kept = "1"; });
      const scan = attacks.querySelector("[data-scan]");
      const [count, loss] = attacks.querySelectorAll("[data-bind]");
      const cap = attacks.querySelector(".sc-cap");
      const total = sq.length;
      svg.querySelectorAll(".is-kept").forEach((n) => n.classList.remove("is-kept"));
      return (s) => {
        show(msg, 1 - seg(s, 0.85, 1.05));
        const nType = Math.round(text.length * seg(s, 0.05, 0.75));
        setText(typed, text.slice(0, nType) + (nType < text.length ? "▍" : ""));
        show(slip, seg(s, 0.95, 1.2) * (1 - seg(s, 1.85, 2.05)));
        rows.forEach((r, k) => { r.style.opacity = seg(s, 1.1 + k * 0.14, 1.3 + k * 0.14).toFixed(3); });
        const sk = ease(seg(s, 1.5, 1.72));
        seal.style.transform = sealT.style.transform = `scale(${sk.toFixed(3)})`;
        show(attacks, seg(s, 1.9, 2.1));
        const a = seg(s, 2.1, 2.8), g = seg(s, 3.0, 3.75);
        const landed = Math.round(total * a);
        const sx = 70 + 480 * g;
        scan.setAttribute("x1", sx.toFixed(1)); scan.setAttribute("x2", sx.toFixed(1));
        scan.style.opacity = g > 0 && g < 1 ? "1" : "0";
        let worked = 0;
        sq.forEach((q, k) => {
          const blocked = g > 0 && !q.kept && q.x + 18 < sx;
          const isLanded = k < landed && !blocked;
          q.n.classList.toggle("is-landed", isLanded);
          q.n.classList.toggle("is-blocked", blocked);
          if (isLanded) worked++;
        });
        cap.textContent = g >= 0.5 ? "Attacks that worked, with Aurvane" : "Attacks that worked, without Aurvane";
        setText(count, g >= 1 ? finalOf(count) : `${worked} of ${total}`);
        const lossFrom = 12135, lossTo = parseInt(finalOf(loss).replace(/,/g, ""), 10);
        const money = g > 0 ? lossFrom + (lossTo - lossFrom) * g : lossFrom * a;
        setText(loss, g >= 1 ? finalOf(loss) : `${Math.round(money).toLocaleString("en-US")} CAD`);
      };
    },
  };

  let storyList = [];
  safe(() => {
    const storyEls = [...document.querySelectorAll("[data-story]")];
    if (!storyEls.length) return;
    const pinned = () => getComputedStyle(storyEls[0].querySelector(".story-stage")).position === "sticky";
    const list = storyEls.map((st) => {
      const svg = st.querySelector(".scene");
      svg.querySelectorAll("[data-bind]").forEach(finalOf); /* remember each published figure before counting to it */
      let run = null;
      safe(() => { run = SCENES[svg.dataset.scene](svg); svg.classList.add("is-live"); });
      const steps = [...st.querySelectorAll(".st-step")];
      const tabs = [...st.querySelectorAll("[data-step-go]")];
      const bar = st.querySelector(".st-bar i");
      const num = st.querySelector(".st-num");
      const item = { st, svg, stage: st.querySelector(".story-stage"), run, steps, tabs, bar, num, n: steps.length, top: 0, h: 1, lastS: null };
      tabs.forEach((b, i) => b.addEventListener("click", () => {
        const span = item.h - vh;
        window.scrollTo({ top: item.top + span * ((i + (i ? 0.45 : 0.05)) / item.n), behavior: "smooth" });
      }));
      return item;
    });
    storyList = list;
    measures.push(() => list.forEach((it) => { it.top = docTop(it.st); it.h = it.st.offsetHeight; it.lastS = null; }));
    tasks.push(() => {
      const y = window.scrollY;
      let tint = null;
      const isPinned = pinned();
      list.forEach((it) => {
        if (y + vh * 0.5 >= it.top && y + vh * 0.5 < it.top + it.h) tint = it.st.dataset.tint;
        if (y + vh < it.top - vh * 0.2 || y > it.top + it.h + vh * 0.2) return;
        const span = Math.max(1, it.h - vh);
        const p = isPinned ? clamp((y - it.top) / span) : 1;
        const s = p * it.n;
        if (it.lastS !== null && Math.abs(it.lastS - s) < 0.0005) return;
        it.lastS = s;
        if (it.run) it.run(s);
        if (it.bar) it.bar.style.setProperty("--p", p.toFixed(4));
        if (it.num) it.num.style.transform = `translate3d(0, ${((0.5 - p) * 60).toFixed(1)}px, 0)`;
        const active = Math.min(it.n - 1, Math.floor(s));
        it.tabs.forEach((b, i) => {
          b.style.setProperty("--t", clamp(s - i).toFixed(3));
          if (i === active) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
        });
        if (!isPinned) return;
        it.steps.forEach((node, i) => {
          const local = s - i;
          const enter = i === 0 ? 1 : inOut(clamp(local / 0.13));
          const leave = i === it.n - 1 ? 1 : inOut(clamp((1 - local) / 0.13));
          const o = Math.min(enter, leave);
          show(node, o, `translate3d(0, ${((1 - enter) * 46 - (1 - leave) * 46).toFixed(1)}px, 0)`);
        });
      });
      field.want = tints[tint] || tints.ice;
    });
  });

  /* ---- The stage: one sculpture of points that re-forms for every chapter. --------------------
     A fixed WebGL canvas behind the page. On the master page its points fly in as a neural network
     behind the name, then become each story's picture in turn: "$1", thirty industry bars, the
     growth of that dollar, a forecast and its range, a globe taking a shock, thirty attacks landing
     and being stopped, and finally the name. On a project page they draw that project's picture
     beside its title. Every shape is sampled from the page's own SVG (so it carries the same data),
     each change is a function of the scroll, and the SVG keeps its words and numbers on top. The
     points part around the pointer, trail a little behind a fast scroll, and thin themselves out
     if a device cannot keep up. Without WebGL nothing here runs and the SVG pictures stay. */
  safe(() => {
    const home = isHome && storyList.length > 0;
    const pageScene = home ? null : document.querySelector("[data-cs-scene] .scene");
    if (!home && !pageScene) return;
    const items = {};
    if (home) storyList.forEach((it) => { items[it.svg.dataset.scene] = it; });
    else items[pageScene.dataset.scene] = { svg: pageScene, stage: pageScene.closest("[data-cs-scene]"), n: 1, top: 0, h: 1, stageH: 1, flow: true };
    if (home && !Object.keys(items).every((name) => ["dpc", "pension", "tsfm", "wsl", "aurvane"].includes(name))) return;
    const all = Object.values(items);
    const canvas = el("canvas", "fx-stage");
    canvas.setAttribute("aria-hidden", "true");
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, depth: false, powerPreference: "high-performance" });
    if (!gl) return;
    const vs = `attribute vec4 aFrom,aTo,aCF,aCT;attribute vec2 aSeed;
uniform vec4 uFA,uRA,uDA,uFB,uRB,uDB,uMix,uPtr;uniform vec2 uView,uTime,uFx,uOc;uniform mediump float uLight;varying vec4 vC;
vec3 rot(vec3 p,vec2 a){float c=cos(a.y),s=sin(a.y);p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);c=cos(a.x);s=sin(a.x);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
vec4 place(vec3 p,vec4 F,vec4 R,vec4 D,float oc,float t){
  vec3 q=rot(p*F.z,R.xy);float k=F.w/(F.w-q.z);
  vec2 s=F.xy+q.xy*k+D.z*vec2(sin(t*.31+aSeed.x*50.),cos(t*.27+aSeed.y*50.));
  float seen=(q.z<0.&&length(q.xy*k)<oc)?0.:1.; /* behind the planet's disc */
  return vec4(s,k,seen*mix(D.y,1.,clamp(q.z/D.x*.5+.5,0.,1.)));}
void main(){
  float t=uTime.x;
  float o=mix(aSeed.x,aTo.w,uMix.y);
  float m=clamp((uMix.x*(1.+uMix.z)-o)/uMix.z,0.,1.);m=m*m*(3.-2.*m);
  vec4 a=place(aFrom.xyz,uFA,uRA,uDA,uOc.x,t),b=place(aTo.xyz,uFB,uRB,uDB,uOc.y,t);
  float arc=sin(3.14159265*m);
  vec2 d=b.xy-a.xy;float len=length(d);
  vec2 nrm=len>.5?vec2(-d.y,d.x)/len:vec2(0.);
  vec2 p=mix(a.xy,b.xy,m)+nrm*arc*(aSeed.y-.5)*uMix.w*min(len,700.)*.55
    +arc*uMix.w*14.*vec2(sin(aSeed.x*40.+t*1.3),cos(aSeed.y*37.+t*1.1));
  p.y+=uFx.x*aSeed.y;
  vec2 dp=p-uPtr.xy;float dd=length(dp);
  p+=dp/max(dd,1.)*uPtr.w*exp(-dd*dd/(uPtr.z*uPtr.z));
  vec4 c=mix(aCF,aCT,m);
  float u=mix(aFrom.w,aTo.w,m),pulse=mix(uDA.w,uDB.w,m);
  float f1=pow(max(0.,1.-abs(fract(u-t*.21)-.5)*2.),14.);
  float f2=pow(max(0.,1.-abs(fract(u+t*.12+.37)-.5)*2.),18.);
  vec3 rgb=c.rgb*(1.+pulse*f1*2.2)+vec3(.97,.72,.30)*(pulse*f2*1.1+arc*uFx.y);
  float tw=.9+.1*sin(t*1.7+aSeed.x*90.);
  gl_Position=vec4(p.x/uView.x*2.-1.,1.-p.y/uView.y*2.,0.,1.);
  gl_PointSize=max(1.,c.a*mix(a.z,b.z,m)*uTime.y*mix(uRA.w,uRB.w,m)*(1.+arc*.5));
  float alpha=mix(uRA.z,uRB.z,m)*mix(a.w,b.w,m)*tw;
  if(uLight>.5&&c.a>8.)alpha=0.; /* the soft glows only read on a dark page */
  vC=vec4(rgb*(1.+arc*.7),alpha);}`;
    const fs = `precision mediump float;varying vec4 vC;uniform float uLight;
void main(){float d=length(gl_PointCoord-.5)*2.;float h=max(0.,1.-d*d);float a=min(1.,smoothstep(.62,.08,d)*.85+h*h*.3)*vC.a;vec3 c=vC.rgb;
  if(uLight>.5){float k=clamp(max(c.r,max(c.g,c.b)),.001,1.);c=c/k;c=c*c*.6;a*=k;gl_FragColor=vec4(c*a,a)*.9;}else gl_FragColor=vec4(c*a,a*.1);}`;
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    ["aFrom", "aTo", "aCF", "aCT", "aSeed"].forEach((name, i) => gl.bindAttribLocation(prog, i, name));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    /* Worlds: each is one quad shaded as a lit sphere with cloud bands, a soft limb and a little air around it. */
    const wvs = `attribute vec2 a;uniform vec4 uQ;uniform vec2 uView;varying vec2 vq;
void main(){vq=vec2(a.x,-a.y)*uQ.w;vec2 p=uQ.xy+a*uQ.z*uQ.w;gl_Position=vec4(p.x/uView.x*2.-1.,1.-p.y/uView.y*2.,0.,1.);}`;
    const wfs = `precision mediump float;varying vec2 vq;
uniform vec4 uL,uK;uniform vec3 uCa,uCb;uniform vec2 uAx;uniform float uT,uLight;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  float d=length(vq);vec3 Ld=normalize(uL.xyz);
  float facing=clamp(dot(vq/max(d,.001),Ld.xy)*.5+.5,0.,1.);
  float air=exp(-max(d-1.,0.)*16.)*step(1.,d)*(.04+.42*facing*facing);
  vec3 col=uCa*air;float alpha=air*.2;
  if(d<1.){
    float z=sqrt(1.-d*d);vec3 nn=vec3(vq,z);
    float lit=clamp(dot(nn,Ld),0.,1.);
    float lat=dot(nn.xy,uAx);
    float b=fbm(vec2(lat*4.+uK.x,atan(nn.x,z)*.9+uK.x*3.+uT*.004));
    float bands=mix(b,sin(lat*(13.+uK.x*3.)+b*5.)*.5+.5,uK.y);
    bands=clamp(bands+(sin(lat*(47.+uK.x*9.)+b*11.)*.5+.5-.5)*.16*(.4+uK.y),0.,1.);
    vec3 body=mix(uCb,uCa,bands)*(pow(lit,.8)*1.2+.008);
    body+=uCa*pow(1.-z,3.)*(.1+.9*facing*lit);
    if(uLight>.5)body=mix(vec3(.9,.92,.96),mix(uCb,uCa,bands)*.6+.35,.6)*(.82+.18*lit);
    float e=smoothstep(1.,1.-uK.z,d);
    col=mix(col,body,e);alpha=mix(alpha,1.,e);
  }
  if(uLight>.5&&d>=1.){col=vec3(0.);alpha=0.;}
  gl_FragColor=vec4(col,alpha)*uL.w;}`;
    const wprog = gl.createProgram();
    gl.attachShader(wprog, sh(gl.VERTEX_SHADER, wvs));
    gl.attachShader(wprog, sh(gl.FRAGMENT_SHADER, wfs));
    gl.bindAttribLocation(wprog, 5, "a");
    gl.linkProgram(wprog);
    if (!gl.getProgramParameter(wprog, gl.LINK_STATUS)) return;
    const WU = {};
    ["uQ", "uView", "uL", "uK", "uCa", "uCb", "uAx", "uT", "uLight"].forEach((name) => { WU[name] = gl.getUniformLocation(wprog, name); });
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    const before = document.querySelector(".fx-land") || [...document.querySelectorAll(".fx-stars")].pop() || document.querySelector(".fx-field");
    if (before) before.after(canvas); else body.prepend(canvas);

    const N = window.innerWidth > 900 ? 18000 : 8000;
    const C = { ice: [0.56, 0.77, 1.0], white: [0.93, 0.96, 1.0], violet: [0.66, 0.58, 1.0], amber: [0.97, 0.72, 0.30], teal: [0.42, 0.9, 0.78], rose: [1.0, 0.45, 0.55], deep: [0.2, 0.36, 0.85], dim: [0.40, 0.46, 0.60], faint: [0.20, 0.24, 0.33] };
    const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const mk = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    const hash = (x) => { const v = Math.sin(x * 12.9898) * 43758.5453; return v - Math.floor(v); };

    /* A shape is N places (x, y, z and an order key u) and N looks (colour and size). */
    const shape = (seed, fill) => {
      const pos = new Float32Array(N * 4), col = new Float32Array(N * 4), tag = new Uint8Array(N);
      const r = mk(seed);
      let i = 0;
      const g = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * r()); };
      const put = (x, y, z, u, c, size, k = 1, t = 0) => {
        if (i >= N) return;
        const o = i * 4;
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; pos[o + 3] = u;
        col[o] = c[0] * k; col[o + 1] = c[1] * k; col[o + 2] = c[2] * k; col[o + 3] = size;
        tag[i] = t; i += 1;
      };
      const many = (count, fn) => { const m = Math.min(count, N - i); for (let k = 0; k < m; k += 1) fn(k, m); };
      fill({ put, r, g, many, n: (f) => Math.round(N * f), left: () => N - i });
      return { pos, col, tag };
    };
    /* The same places with new looks (and, if given, a new order key): for changes that sweep across a picture. */
    const relook = (base, fn) => {
      const pos = base.pos.slice(), col = new Float32Array(N * 4);
      for (let i = 0; i < N; i += 1) {
        const o = i * 4;
        const [c, size, k, u] = fn(base.tag[i], pos[o], pos[o + 1], pos[o + 3]);
        col[o] = c[0] * k; col[o + 1] = c[1] * k; col[o + 2] = c[2] * k; col[o + 3] = size;
        if (u !== undefined) pos[o + 3] = u;
      }
      return { pos, col, tag: base.tag };
    };

    /* Geometry read straight from the SVG pictures. */
    const nums = (str) => (str.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const ptsOf = (n) => { const a = nums(n.getAttribute("points") || n.getAttribute("d") || ""); const out = []; for (let i = 0; i + 1 < a.length; i += 2) out.push([a[i], a[i + 1]]); return out; };
    const rectOf = (n) => [+n.getAttribute("x"), +n.getAttribute("y"), +n.getAttribute("width"), +n.getAttribute("height")];
    const line = (pts) => {
      const cum = [0];
      for (let i = 1; i < pts.length; i += 1) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1] || 1;
      return (t) => {
        const d = clamp(t) * L;
        let lo = 0, hi = cum.length - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
        const f = (d - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]);
        return [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f];
      };
    };
    const onRect = (q, r) => {
      let d = r() * 2 * (q[2] + q[3]);
      if (d < q[2]) return [q[0] + d, q[1]];
      d -= q[2];
      if (d < q[3]) return [q[0] + q[2], q[1] + d];
      d -= q[3];
      if (d < q[2]) return [q[0] + q[2] - d, q[1] + q[3]];
      return [q[0], q[1] + q[3] - (d - q[2])];
    };
    const inRect = (q, r) => [q[0] + r() * q[2], q[1] + r() * q[3]];
    const sampleText = (text, weight, spacing) => {
      const size = 200, cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
      const setFont = () => { cx.font = `${weight} ${size}px "Inter Tight", "Helvetica Neue", Arial, sans-serif`; if ("letterSpacing" in cx) cx.letterSpacing = `${spacing * size}px`; };
      setFont();
      const w = Math.ceil(cx.measureText(text).width + size * 0.4), h = Math.ceil(size * 1.3);
      cv.width = w; cv.height = h;
      setFont();
      cx.fillStyle = "#fff";
      cx.fillText(text, size * 0.2, size);
      const data = cx.getImageData(0, 0, w, h).data, px = [];
      let x0 = w, x1 = 0, y0 = h, y1 = 0;
      for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
        if (data[(y * w + x) * 4 + 3] > 128) { px.push(x, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      }
      if (!px.length) throw new Error("no glyphs");
      const iw = Math.max(1, x1 - x0), ih = Math.max(1, y1 - y0);
      return { aspect: iw / ih, pick: (r) => { const k = ((r() * (px.length / 2)) | 0) * 2; return [(px[k] + r() * 2 - x0) / iw, (px[k + 1] + r() * 2 - y0) / ih]; } };
    };

    const shapes = {};
    const WASHINGTON = [-77.04, 38.9], TORONTO = [-79.38, 43.65];
    const globe = { x: 0, y: 0, r: 200 };
    const sphere = (lon, lat, rad) => { const f = lat * Math.PI / 180, l = lon * Math.PI / 180; return [rad * Math.cos(f) * Math.sin(l), -rad * Math.sin(f), rad * Math.cos(f) * Math.cos(l)]; };
    let nameText = null;

    /* One builder per picture; a page builds only the pictures it has. */
    const BUILD = {
      /* "$1", thirty industry bars, then the growth of that dollar. */
      dpc(it) {
        const svg = it.svg, ox = 300, oy = it.vbH / 2;
        const [mPath, dPath] = svg.querySelectorAll('[data-layer="chart"] [data-draw]');
        const mAt = line(ptsOf(mPath)), dAt = line(ptsOf(dPath));
        const one = sampleText("$1", 300, 0);
        shapes.coin = shape(11, ({ put, r, g, many, left }) => many(left(), () => {
          const [nx, ny] = one.pick(r);
          put((nx - 0.5) * 176 * one.aspect, (ny - 0.5) * 176 - 38, (r() - 0.5) * 44, r(), mixC(C.white, C.ice, ny), 1.3 + r() * 1.1, 0.5);
        }));
        const bars = [...svg.querySelectorAll(".sc-bar")].map(rectOf), outlines = [...svg.querySelectorAll(".sc-bar-m")].map(rectOf);
        shapes.bars = shape(12, ({ put, r, g, many, n, left }) => {
          const total = bars.reduce((s, q) => s + q[3] + 8, 0), fillN = N - n(0.22);
          bars.forEach((q, k) => many(Math.round(fillN * (q[3] + 8) / total), () => {
            const up = r();
            put(q[0] + r() * q[2] - ox, q[1] + q[3] * (1 - up) - oy, (r() - 0.5) * 30, (k + up) / bars.length, mixC(C.violet, C.ice, Math.min(1, up * q[3] / 90)), 1.3 + r() * 1.1, 0.5);
          }));
          many(left(), () => {
            const k = (r() * outlines.length) | 0, [x, y] = onRect(outlines[k], r);
            put(x - ox, y - oy, -16 + g() * 3, (k + 0.5) / outlines.length, C.dim, 1.1, 0.8);
          });
        });
        const p0 = dAt(0);
        shapes.seed = shape(13, ({ put, r, g, many, left }) => many(left(), () => put(p0[0] - ox + g() * 8, p0[1] - oy + g() * 8, g() * 8, r(), r() < 0.3 ? C.white : C.ice, 1.2 + r(), 0.08)));
        shapes.chart = shape(14, ({ put, r, g, many, n, left }) => {
          many(n(0.56), () => { const t = r(), p = dAt(t); put(p[0] - ox + g() * 1.1, p[1] - oy + g() * 1.1, 14 + g() * 5, t, r() < 0.1 ? C.white : mixC(C.ice, C.white, t * 0.35), 1.3 + r() * 1.1, 0.4); });
          many(n(0.22), () => { const t = r(), p = mAt(t); put(p[0] - ox + g() * 0.9, p[1] - oy + g() * 0.9, -26 + g() * 4, t, C.dim, 1.1 + r() * 0.7, 0.6); });
          many(left(), () => { const t = r(), p = dAt(t), drop = r() * r() * 90; put(p[0] - ox + g() * 2, p[1] - oy + 3 + drop, 14 - drop * 0.45 + g() * 4, t, mixC(C.ice, C.violet, Math.min(1, drop / 60)), 1 + r() * 0.8, 0.26 * (1 - drop / 100)); });
        });
      },
      /* $90 in the fund for $100 promised, then the same 60 futures under three policies. */
      pension(it) {
        const svg = it.svg, ox = 300, oy = it.vbH / 2;
        const promised = rectOf(svg.querySelector(".sc-promise")), fund = rectOf(svg.querySelector(".sc-fund")), gap = rectOf(svg.querySelector(".sc-gap"));
        shapes.pBars = shape(81, ({ put, r, g, many, n, left }) => {
          many(n(0.24), () => { const [x, y] = onRect(promised, r); put(x - ox, y - oy, g() * 5, (x - promised[0]) / promised[2], C.dim, 1.3 + r() * 0.6, 0.7); });
          many(n(0.12), () => { const [x, y] = inRect(gap, r); put(x - ox, y - oy, g() * 8, (x - promised[0]) / promised[2], mixC(C.amber, C.rose, r() * 0.5), 1.3 + r() * 0.9, 0.5); });
          many(left(), () => { const [x, y] = inRect(fund, r); put(x - ox, y - oy, (r() - 0.5) * 26, (x - promised[0]) / promised[2], r() < 0.1 ? C.white : mixC(C.amber, C.ice, 0.75), 1.5 + r() * 1.1, 0.4); });
        });
        /* The same draws for each policy, so a point stays on the same future as the policy changes under it. */
        const fanOf = (layer) => {
          const lines = [...svg.querySelectorAll(`[data-layer="${layer}"] .sc-path`)].map((n) => ({ at: line(ptsOf(n)), short: n.classList.contains("is-short") }));
          return shape(82, ({ put, r, g, many, left }) => many(left(), (k) => {
            const path = lines[k % lines.length], t = Math.pow(r(), 0.85), p = path.at(t), jx = g() * 0.8, jy = g() * 0.8, z = ((k % lines.length) / lines.length - 0.5) * 70, bright = r() < 0.08;
            put(p[0] - ox + jx, p[1] - oy + jy, z, t, bright ? C.white : path.short ? mixC(C.amber, C.rose, 0.35) : mixC(C.ice, C.teal, 0.3), 1.1 + r() * 0.9, path.short ? 0.6 : 0.42);
          }));
        };
        shapes.p6040 = fanOf("fan60");
        shapes.pGlide = fanOf("fanGlide");
        shapes.pLearned = fanOf("fanLearned");
      },
      /* Many series, one forecast with its range, the audit, the sealed test. */
      tsfm(it) {
        const svg = it.svg, ox = 300, oy = it.vbH / 2;
        const sparks = [...svg.querySelectorAll(".sc-spark")].map((n) => line(ptsOf(n)));
        shapes.many = shape(21, ({ put, r, g, many, left }) => many(left(), (k) => {
          const j = k % sparks.length, t = r(), p = sparks[j](t);
          put(p[0] - ox + g() * 0.7, p[1] - oy + g() * 0.7, g() * 6 + ((j % 6) - 2.5) * 16, t, j % 3 === 2 ? C.ice : mixC(C.violet, C.ice, (j % 6) / 8), 1.2 + r() * 1, 0.6);
        }));
        const histAt = line(ptsOf(svg.querySelector('[data-layer="fan"] [data-draw]'))), futAt = line(ptsOf(svg.querySelector("[data-draw2]")));
        const fan = ptsOf(svg.querySelector("[data-fan]")), half = fan.length / 2;
        const upAt = line(fan.slice(0, half)), loAt = line(fan.slice(half).reverse()), tip = histAt(1);
        const past = (api, key) => api.many(api.n(0.5), () => {
          const t = api.r(), p = histAt(t);
          api.put(p[0] - ox + api.g() * 1, p[1] - oy + api.g() * 1, api.g() * 6, key(t), api.r() < 0.12 ? C.white : mixC(C.violet, C.ice, 0.45), 1.3 + api.r() * 1.1, 0.45);
        });
        shapes.hist = shape(22, (api) => { past(api, (t) => t); api.many(api.left(), () => api.put(tip[0] - ox + api.g() * 5, tip[1] - oy + api.g() * 5, api.g() * 5, 1, C.amber, 1.2, 0.08)); });
        shapes.fan = shape(22, (api) => {
          const { put, r, g, many, n, left } = api;
          past(api, () => 0);
          many(n(0.14), () => { const t = r(), p = futAt(t); put(p[0] - ox + g() * 1, p[1] - oy + g() * 1, g() * 6, t, C.amber, 1.4 + r() * 1.1, 0.7); });
          many(left(), () => { const t = Math.pow(r(), 0.8), a = upAt(t), b = loAt(t), v = r(); put(a[0] + (b[0] - a[0]) * v - ox, a[1] + (b[1] - a[1]) * v - oy, (v - 0.5) * 50 * t, t, mixC(C.amber, C.rose, Math.abs(v - 0.5) * 1.2), 1.2 + r() * 0.9, 0.22); });
        });
        const squares = [...svg.querySelectorAll(".sc-sq")].map(rectOf);
        const grid = shape(23, ({ put, r, g, many, left }) => many(left(), (k) => {
          const q = squares[k % squares.length], edge = r() < 0.62, [x, y] = edge ? onRect(q, r) : inRect(q, r);
          put(x - ox, y - oy, g() * 5, clamp((x - 40) / 520), C.dim, 1.2, 1, edge ? 1 : 2);
        }));
        shapes.gridOff = relook(grid, (t) => (t === 1 ? [C.dim, 1.3, 0.7] : [C.faint, 1.2, 0.2]));
        shapes.gridOn = relook(grid, (t, x) => (t === 1 ? [mixC(C.violet, C.ice, clamp(x / 520 + 0.5)), 1.5, 0.8] : [C.violet, 1.6, 0.22]));
        const [std, ours] = [...svg.querySelectorAll('[data-layer="result"] [data-grow]')].map(rectOf);
        shapes.result = shape(24, ({ put, r, g, many, n, left }) => {
          many(n(0.42), () => { const [x, y] = inRect(std, r); put(x - ox, y - oy, -12 + g() * 5, (x - std[0]) / std[2], C.dim, 2 + r() * 0.8, 0.3); });
          many(left(), () => { const [x, y] = inRect(ours, r); const f = (x - std[0]) / std[2]; put(x - ox, y - oy, 12 + g() * 5, f, r() < 0.08 ? C.white : mixC(C.violet, C.ice, clamp(f * 1.5)), 2 + r() * 0.9, 0.34); });
        });
      },
      /* The world, and a surprise spreading out from Washington. */
      wsl(it) {
        const svg = it.svg;
        const [gx, gy, gr] = nums(svg.dataset.globe || "300,235,165");
        globe.x = gx - 300; globe.y = gy - it.vbH / 2; globe.r = gr;
        const R = gr;
        const [dims, bits] = (svg.dataset.land || "").split(":"), [lw, lh] = dims.split("x").map(Number);
        const raw = atob(bits), cells = [], cum = [];
        const facing = sphere(-88, 32, 1); /* the side of the globe that faces the reader gets most of the points */
        let total = 0;
        for (let j = 0; j < lh; j += 1) for (let i = 0; i < lw; i += 1) {
          const k = j * lw + i;
          if ((raw.charCodeAt(k >> 3) >> (7 - (k & 7))) & 1) {
            const lat = 90 - (j + 0.5) * 180 / lh, lon = -180 + (i + 0.5) * 360 / lw, p = sphere(lon, lat, 1);
            total += Math.cos(lat * Math.PI / 180) * (p[0] * facing[0] + p[1] * facing[1] + p[2] * facing[2] > -0.2 ? 1 : 0.1);
            cells.push([lon, lat]);
            cum.push(total);
          }
        }
        const pickCell = (r) => { const v = r() * total; let lo = 0, hi = cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < v) lo = mid + 1; else hi = mid; } return cells[lo]; };
        const w0 = sphere(WASHINGTON[0], WASHINGTON[1], 1);
        const away = (p, rad) => Math.acos(clamp((p[0] * w0[0] + p[1] * w0[1] + p[2] * w0[2]) / rad, -1, 1)) / Math.PI;
        const base = shape(31, ({ put, r, g, many, n, left }) => {
          const add = (p, rad, t) => put(p[0], p[1], p[2], away(p, rad), C.ice, 1, 1, t);
          many(10, () => put(0, 0, 0, 0.5, C.deep, 1, 1, 8));
          many(40, () => add(sphere(WASHINGTON[0], WASHINGTON[1], R * 1.01), R * 1.01, 6));
          many(30, () => add(sphere(TORONTO[0], TORONTO[1], R * 1.02), R * 1.02, 7));
          many(n(0.68), () => { const c = pickCell(r); add(sphere(c[0] + (r() - 0.5) * 360 / lw, c[1] + (r() - 0.5) * 180 / lh, R), R, 1); });
          many(n(0.12), () => add(r() < 0.5 ? sphere(r() * 360 - 180, -80 + 20 * ((r() * 9) | 0), R) : sphere(-180 + 20 * ((r() * 18) | 0), r() * 170 - 85, R), R, 2));
          many(n(0.035), () => { const rad = R * (1 + Math.abs(g()) * 0.03); add(sphere(WASHINGTON[0] + g() * 0.7, WASHINGTON[1] + g() * 0.7, rad), rad, 3); });
          many(n(0.03), () => { const rad = R * (1.01 + Math.abs(g()) * 0.02); add(sphere(TORONTO[0] + g() * 0.6, TORONTO[1] + g() * 0.6, rad), rad, 4); });
          many(left(), () => { const rad = R * (1.03 + r() * 0.13); add(sphere(r() * 360 - 180, Math.asin(r() * 2 - 1) * 180 / Math.PI, rad), rad, 5); });
        });
        /* looks by kind: 1 land, 2 grid lines, 3 Washington, 4 Toronto, 5 halo, 6 glow over Washington, 7 glow over Toronto, 8 the air around the globe */
        const land = (y) => mixC(C.teal, C.ice, clamp(Math.abs(y) / R * 1.2));
        shapes.gDim = relook(base, (t) => [0, [mixC(C.dim, C.ice, 0.3), 2, 0.7], [C.faint, 1.2, 0.5], [C.white, 1.8, 0.5], [C.dim, 1.6, 0.7], [C.faint, 1.2, 0.3], [C.ice, 26, 0.1], [C.amber, 4, 0], [C.deep, 150, 0.03]][t]);
        shapes.gLit = relook(base, (t, x, y) => [0, [land(y), 2.4, 0.8], [C.deep, 1.3, 0.7], [C.white, 2, 0.6], [C.teal, 2, 0.85], [C.teal, 1.3, 0.3], [C.ice, 34, 0.16], [C.amber, 4, 0], [C.deep, 150, 0.06]][t]);
        shapes.gFocus = relook(base, (t) => [0, [mixC(C.dim, C.ice, 0.3), 2, 0.75], [C.faint, 1.2, 0.5], [C.ice, 1.5, 0.3], [C.amber, 2.4, 0.9], [C.faint, 1.2, 0.3], [C.ice, 10, 0.03], [C.amber, 18, 0.12], [C.deep, 150, 0.04]][t]);
      },
      /* A poisoned email, the permission slip, thirty attacks landing and being stopped. */
      aurvane(it) {
        const svg = it.svg, ox = 300, oy = it.vbH / 2;
        const card = rectOf(svg.querySelector(".sc-card")), texts = [...svg.querySelectorAll(".sc-txt")].map(rectOf);
        shapes.msg = shape(41, ({ put, r, g, many, n, left }) => {
          many(n(0.45), () => { const [x, y] = onRect(card, r); put(x - ox + g() * 0.6, y - oy + g() * 0.6, g() * 6, r(), C.dim, 1.2 + r() * 0.6, 0.3); });
          many(n(0.2), () => { const [x, y] = inRect(texts[r() < 0.43 ? 0 : 1], r); put(x - ox, y - oy, g() * 4, r(), C.dim, 1.4, 0.16); });
          many(n(0.2), () => put(84 + r() * 390 - ox, 172 + Math.abs(g()) * 3 - oy, g() * 8, r(), mixC(C.amber, C.rose, r() * 0.6), 1.1 + r() * 0.8, 0.3));
          many(left(), () => { const [x, y] = inRect(card, r); put(x - ox, y - oy, -30 + g() * 14, r(), C.dim, 1 + r() * 0.6, 0.1); });
        });
        shapes.slip = shape(42, ({ put, r, g, many, n, left }) => {
          many(n(0.45), () => { const [x, y] = onRect(card, r); put(x - ox + g() * 0.6, y - oy + g() * 0.6, g() * 6, r(), C.teal, 1.2 + r() * 0.7, 0.34); });
          many(n(0.2), () => { const a = r() * 6.2831853, rad = 26 + g() * 0.9; put(490 + Math.cos(a) * rad - ox, 130 + Math.sin(a) * rad - oy, 14 + g() * 4, r(), r() < 0.2 ? C.white : C.teal, 1.3 + r() * 0.8, 0.5); });
          many(n(0.15), () => put(84 + r() * 300 - ox, 118 + 28 * ((r() * 3) | 0) + g() * 0.4 - oy, g() * 5, r(), C.dim, 1, 0.22));
          many(left(), () => { const [x, y] = inRect(card, r); put(x - ox, y - oy, -30 + g() * 14, r(), C.teal, 1 + r() * 0.6, 0.08); });
        });
        const atk = [...svg.querySelectorAll(".sc-atk")].map((n) => ({ q: rectOf(n), kept: n.dataset.kept === "1" || n.classList.contains("is-kept") }));
        const tiles = shape(43, ({ put, r, g, many, left }) => many(left(), (k) => {
          const j = k % atk.length, edge = r() < 0.45, [x, y] = edge ? onRect(atk[j].q, r) : inRect(atk[j].q, r);
          put(x - ox, y - oy, g() * 5, (j + r()) / atk.length, C.dim, 1.2, 1, (edge ? 1 : 2) + (atk[j].kept ? 2 : 0));
        }));
        const hot = (x, y) => mixC(C.amber, C.rose, hash(x * 3.1 + y * 7.7) * 0.55);
        shapes.idle = relook(tiles, (t) => (t % 2 ? [C.dim, 1.2, 0.8] : [C.faint, 1, 0.2]));
        shapes.landed = relook(tiles, (t, x, y) => (t % 2 ? [hot(x, y), 1.5, 0.8] : [hot(x, y), 1.9, 0.38]));
        shapes.guarded = relook(tiles, (t, x, y) => [...(t > 2 ? (t === 3 ? [hot(x, y), 1.5, 0.8] : [hot(x, y), 1.9, 0.38]) : t === 1 ? [C.teal, 1.4, 0.8] : [C.teal, 1.7, 0.14]), clamp((x + ox - 70) / 480)]);
      },
    };

    const build = () => {
      all.forEach((it) => { it.vbH = nums(it.svg.getAttribute("viewBox"))[3]; });
      shapes.ambient = shape(71, ({ put, r, many, left }) => many(left(), () => {
        const far = r() < 0.72;
        put((r() * 2 - 1) * 1.2, (r() * 2 - 1) * 1.2, (r() * 2 - 1) * 0.3, r(), r() < 0.7 ? C.dim : C.ice, far ? 0.9 + r() * 0.5 : 1.3 + r() * 1.2, far ? 0.16 : 0.5);
      }));
      Object.keys(items).forEach((name) => BUILD[name](items[name]));
      if (home) {
        /* The rings around the giant behind the name: dense bright bands, a dark gap, a thin outer strand. In planet radii. */
        shapes.ring = shape(61, ({ put, r, g, many, n, left }) => {
          const roll = -0.3, cr = Math.cos(roll), sr = Math.sin(roll);
          const at = (rho, th, lift) => { const x = rho * Math.cos(th), z = rho * Math.sin(th); return [x * cr - lift * sr, x * sr + lift * cr, z]; };
          const band = (count, r0, r1, c0, c1, size, k) => many(count, () => {
            const f = r(), rho = r0 + (r1 - r0) * f, th = r() * 6.2831853, p = at(rho, th, g() * 0.006);
            put(p[0], p[1], p[2], th / 6.2831853, mixC(c0, c1, f), size * (0.8 + r() * 0.6), k * (0.7 + 0.3 * Math.sin(rho * 60)));
          });
          many(3, () => { const th = r() * 6.2831853, p = at(2.75 + r() * 0.6, th, g() * 0.05); put(p[0], p[1], p[2], r(), C.white, 18, 0.5); });
          many(n(0.035), () => { const th = r() * 6.2831853, p = at(2.6 + r() * 1.4, th, g() * 0.25); put(p[0], p[1], p[2], r(), C.dim, 1 + r(), 0.5); });
          band(n(0.14), 1.26, 1.5, C.deep, C.violet, 1.2, 0.5);
          band(n(0.5), 1.52, 1.94, C.white, C.ice, 1.5, 0.62);
          band(n(0.03), 1.94, 2.02, C.dim, C.dim, 1, 0.3);
          band(n(0.22), 2.02, 2.27, C.ice, C.violet, 1.3, 0.55);
          band(left(), 2.32, 2.36, C.amber, C.rose, 1.2, 0.6);
        });
        /* The last word. */
        nameText = sampleText("SHERIF MORSI", 700, -0.02);
        shapes.name = shape(51, ({ put, r, g, many, left }) => many(left(), () => {
          const [nx, ny] = nameText.pick(r);
          put((nx - 0.5) * nameText.aspect, ny - 0.5, (r() - 0.5) * 0.14, nx, nx < 0.45 ? mixC(C.ice, C.violet, nx / 0.45) : mixC(C.violet, C.amber, (nx - 0.45) / 0.55), 1.3 + r() * 1.2, 0.62);
        }));
      }
      /* One shuffle for every shape, so drawing only the first part of the points thins every picture evenly. */
      const perm = new Uint32Array(N), pr = mk(99);
      for (let i = 0; i < N; i += 1) perm[i] = i;
      for (let i = N - 1; i > 0; i -= 1) { const j = (pr() * (i + 1)) | 0, tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp; }
      const shuffled = (src) => { const out = new Float32Array(N * 4); for (let i = 0; i < N; i += 1) out.set(src.subarray(perm[i] * 4, perm[i] * 4 + 4), i * 4); return out; };
      Object.values(shapes).forEach((s) => {
        s.posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, s.posBuf); gl.bufferData(gl.ARRAY_BUFFER, shuffled(s.pos), gl.STATIC_DRAW);
        s.colBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, s.colBuf); gl.bufferData(gl.ARRAY_BUFFER, shuffled(s.col), gl.STATIC_DRAW);
        s.pos = s.col = s.tag = null;
      });
      const seeds = new Float32Array(N * 2), r = mk(7);
      for (let i = 0; i < N * 2; i += 1) seeds[i] = r();
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 2, gl.FLOAT, false, 0, 0);
    };

    /* Where each shape stands on screen: a centre, a scale, a tilt and a depth, recomputed every frame. */
    const A = [0, 1, 2, 3];
    A.forEach((loc) => gl.enableVertexAttribArray(loc));
    const U = {};
    ["uFA", "uRA", "uDA", "uFB", "uRB", "uDB", "uMix", "uPtr", "uView", "uTime", "uFx", "uOc", "uLight"].forEach((name) => { U[name] = gl.getUniformLocation(prog, name); });
    const heroSpace = document.querySelector("[data-hero-stage]");
    const giant = document.querySelector("[data-giant]"), giantLine = document.querySelector(".giant-line");
    const tilt = { x: 0, y: 0 };
    const lay = { hero: null, name: null, segs: [] };
    const DPR_MAX = Math.min(window.devicePixelRatio || 1, 2), DPR_MIN = Math.min(DPR_MAX, 1.5);
    const quality = { dpr: DPR_MAX, count: N, sum: 0, frames: -40, calm: 0 };
    const stageTop = (it, y) => (y < it.top ? it.top - y : y > it.top + it.h - it.stageH ? it.top + it.h - it.stageH - y : 0);
    const svgFrame = (it, y) => ({ cx: it.svgCx, cy: stageTop(it, y) + it.svgCy, s: it.svgS, d: 1400, rx: tilt.x, ry: tilt.y, alpha: 1, size: clamp(it.svgS * 1.1, 0.75, 1.6), depth: 1e5, back: 1, drift: 0.5, pulse: 0 });
    const globeFrame = (it, y, t) => ({ ...svgFrame(it, y), cx: it.svgCx + globe.x * it.svgS, cy: stageTop(it, y) + it.svgCy + globe.y * it.svgS, rx: -0.56 + tilt.x * 0.8, ry: 1.52 + tilt.y * 1.3 + Math.sin(t * 0.25) * 0.09, depth: globe.r * it.svgS, back: 0.2 });
    const FRAMES = {
      ambient: (y) => { const s = Math.max(window.innerWidth, vh) * 0.6; return { cx: window.innerWidth / 2, cy: vh / 2, s, d: 1400, rx: tilt.x * 0.5, ry: y * 0.00012 + tilt.y * 0.5, alpha: 0.85, size: 1, depth: s * 0.3, back: 0.5, drift: 5, pulse: 0 }; },
      ring: (y, t) => { const g = giantAt(y); return { cx: g.x, cy: g.y, s: g.r, d: 1400, rx: 0.42 + tilt.x * 1.2, ry: tilt.y * 1.6 + Math.sin(t * 0.17) * 0.05, alpha: 1, size: wide() ? 1.05 : 0.85, depth: g.r * 2.3, back: 0.4, drift: 0.3, pulse: 0.55, oc: g.r * 0.985 }; },
      name: (y) => { const g = lay.name, s = g.w * 0.985 / nameText.aspect; return { cx: g.x + g.w / 2, cy: g.top - y + g.font * 0.41, s, d: 1400, rx: tilt.x * 0.6, ry: tilt.y * 0.6, alpha: 1, size: clamp(s / 110, 0.7, 1.3), depth: 1e5, back: 1, drift: 0.4, pulse: 0 }; },
    };
    const OWNER = { coin: "dpc", bars: "dpc", seed: "dpc", chart: "dpc", pBars: "pension", p6040: "pension", pGlide: "pension", pLearned: "pension", many: "tsfm", hist: "tsfm", fan: "tsfm", gridOff: "tsfm", gridOn: "tsfm", result: "tsfm", msg: "aurvane", slip: "aurvane", idle: "aurvane", landed: "aurvane", guarded: "aurvane" };
    /* The giant behind the name: it sits in the hero's free space and falls behind the page a little slower than the scroll. */
    const giantAt = (y) => { const h = lay.hero, r = Math.min(h.w * (wide() ? 0.31 : 0.22), h.h * 0.32); return { x: h.x + h.w * (wide() ? 0.54 : 0.5), y: h.top + h.h * 0.47 - y * 0.62, r }; };
    const frameOf = (name, y, t) => (FRAMES[name] ? FRAMES[name](y, t) : OWNER[name] ? svgFrame(items[OWNER[name]], y) : globeFrame(items.wsl, y, t));

    /* Each chapter's shapes: the one it opens on, the one it ends on, and the changes between (in steps of its story). */
    const CHAPTER = {
      dpc: { first: "coin", last: "chart", steps: [[0.5, 0.98, "coin", "bars", { order: 1, w: 0.5 }], [1.72, 1.98, "bars", "seed", { swirl: 0.3 }], [2.0, 3.35, "seed", "chart", { order: 1, w: 0.05, swirl: 0.25, ease: true }]] },
      pension: { first: "pBars", last: "pLearned", steps: [[0.6, 1.5, "pBars", "p6040", { order: 1, w: 0.08, swirl: 0.3, ease: true }], [1.82, 2.2, "p6040", "pGlide", { swirl: 0.12 }], [2.82, 3.2, "pGlide", "pLearned", { swirl: 0.12 }]] },
      tsfm: { first: "many", last: "result", steps: [[0.45, 1.4, "many", "hist", { order: 1, w: 0.3 }], [1.4, 1.8, "hist", "fan", { order: 1, w: 0.25, swirl: 0.2 }], [1.85, 2.1, "fan", "gridOff", {}], [2.12, 2.75, "gridOff", "gridOn", { order: 1, w: 0.03, swirl: 0 }], [2.9, 3.6, "gridOn", "result", { order: 1, w: 0.3 }]] },
      wsl: { first: "gDim", last: "gFocus", steps: [[0.95, 1.85, "gDim", "gLit", { order: 1, w: 0.07, swirl: 0.6, ease: true, front: 1 }], [2.0, 2.3, "gLit", "gFocus", { swirl: 0 }]] },
      aurvane: { first: "msg", last: "guarded", steps: [[0.88, 1.12, "msg", "slip", { swirl: 0.3 }], [1.85, 2.08, "slip", "idle", {}], [2.1, 2.8, "idle", "landed", { order: 1, w: 0.02, swirl: 0 }], [3.0, 3.75, "landed", "guarded", { order: 1, w: 0.02, swirl: 0.5 }]] },
    };

    /* The timeline: which two shapes the points are between at each scroll position, and how they travel. */
    let intro = null;
    const measure = () => {
      const w = Math.round(window.innerWidth * quality.dpr), h = Math.round(window.innerHeight * quality.dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      all.forEach((it) => {
        const keep = it.svg.style.transform;
        it.svg.style.transform = "none";
        const a = it.svg.getBoundingClientRect(), b = it.stage.getBoundingClientRect();
        it.svg.style.transform = keep;
        it.svgS = Math.min(a.width / 600, a.height / it.vbH); /* the picture is fitted inside its box, centred */
        it.svgCx = a.left + a.width / 2; it.svgCy = a.top - b.top + a.height / 2;
        if (it.flow) { it.top = b.top + window.scrollY; it.h = it.stageH = b.height; } else it.stageH = it.stage.offsetHeight;
      });
      const segs = [];
      const cross = (y0, y1, a, b, o = {}) => segs.push({ y0, y1, a, b, order: 0, w: 0.6, swirl: 1, front: 0, ...o });
      if (!home) {
        const it = all[0], name = it.svg.dataset.scene;
        const last = { dpc: "chart", pension: "pLearned", tsfm: "result", wsl: "gLit", aurvane: "guarded" }[name];
        intro = { dpc: { a: "seed", b: "chart", order: 1, w: 0.05, swirl: 0.25, dur: 2.4 }, pension: { a: "ambient", b: "pLearned", order: 1, w: 0.12, swirl: 0.5, dur: 2.4 }, tsfm: { a: "ambient", b: "result", order: 1, w: 0.4, swirl: 0.8, dur: 1.8 }, wsl: { a: "gDim", b: "gLit", order: 1, w: 0.07, swirl: 0.6, front: 1, dur: 2.6 }, aurvane: { a: "landed", b: "guarded", order: 1, w: 0.02, swirl: 0.5, dur: 2.6 } }[name];
        cross(it.top + it.h * 0.3, it.top + it.h * 1.05, last, "ambient", { swirl: 0.8 });
        lay.segs = segs;
        return;
      }
      const hr = heroSpace.getBoundingClientRect();
      lay.hero = { x: hr.left, top: hr.top + window.scrollY, w: hr.width, h: hr.height };
      const gr = giantLine.getBoundingClientRect();
      lay.name = { x: gr.left, top: gr.top + window.scrollY, w: gr.width, font: parseFloat(getComputedStyle(giant).fontSize) };
      intro = { a: "ambient", b: "ring", order: 0, w: 0.7, swirl: 0.9, dur: 1.6 };
      const at = (it, s) => it.top + (s / it.n) * (it.h - it.stageH);
      const heroTop = lay.hero.top, heroH = Math.max(lay.hero.h, vh * 0.6);
      cross(heroTop + heroH * 0.12, heroTop + heroH * 1.0, "ring", "ambient", { swirl: 0.7 });
      const order = storyList.map((it) => it.svg.dataset.scene);
      order.forEach((name, i) => {
        const it = items[name], ch = CHAPTER[name], before = i ? CHAPTER[order[i - 1]].last : "ambient";
        cross(it.top - vh * (i ? 0.85 : 0.8), it.top - vh * (i ? 0.08 : 0.04), before, ch.first);
        ch.steps.forEach(([s0, s1, a, b, o]) => segs.push({ y0: at(it, s0), y1: at(it, s1), a, b, order: 0, w: 0.6, swirl: 0.5, front: 0, ...o }));
      });
      const lastIt = items[order[order.length - 1]];
      const out = lastIt.top + lastIt.h - lastIt.stageH;
      cross(out + vh * 0.05, out + vh * 0.8, CHAPTER[order[order.length - 1]].last, "ambient");
      const end = document.documentElement.scrollHeight - vh;
      const nameStart = Math.max(out + vh, lay.name.top - vh * 1.05);
      cross(nameStart, Math.max(nameStart + 1, end - vh * 0.08), "ambient", "name", { order: 1, w: 0.5, swirl: 0.8 });
      lay.segs = segs.sort((p, q) => p.y0 - q.y0);
    };

    /* The sky: up to two worlds in view at once. Each chapter has its own, low in the corner; it rises as the chapter
       arrives, drifts while the chapter plays, and falls away above as the next one comes up. The page ends on a horizon. */
    const WORLDS = {
      giant: { ca: [0.66, 0.76, 1.0], cb: [0.13, 0.17, 0.5], bands: 1, seed: 0.3, light: [-0.55, 0.55, 0.62], axis: [0.32, 0.95] },
      dpc: { ca: [0.5, 0.76, 1.0], cb: [0.05, 0.16, 0.46], bands: 0.85, seed: 1.1, light: [-0.5, 0.45, -0.74], axis: [0.2, 0.98] },
      pension: { ca: [1.0, 0.8, 0.46], cb: [0.42, 0.22, 0.05], bands: 0.9, seed: 1.7, light: [-0.5, 0.45, -0.74], axis: [0.3, 0.95] },
      tsfm: { ca: [0.78, 0.62, 1.0], cb: [0.2, 0.08, 0.46], bands: 1, seed: 2.3, light: [-0.5, 0.45, -0.74], axis: [-0.25, 0.97] },
      moon: { ca: [0.78, 0.8, 0.86], cb: [0.26, 0.28, 0.33], bands: 0, seed: 3.7, light: [-0.6, 0.5, 0.55], axis: [0, 1] },
      aurvane: { ca: [1.0, 0.5, 0.46], cb: [0.36, 0.08, 0.13], bands: 0.3, seed: 4.9, light: [-0.5, 0.45, -0.74], axis: [0.1, 0.99] },
      home: { ca: [0.5, 0.82, 1.0], cb: [0.03, 0.16, 0.36], bands: 0.35, seed: 6.1, light: [0, 0.56, -0.83], axis: [0, 1] },
    };
    const corner = (it, kind, y) => { /* a chapter's world: a back-lit crescent low in the right corner, clear of the picture */
      const span = it.h + vh, q = (y - (it.top - vh)) / Math.max(1, span), vw = window.innerWidth; /* from the chapter coming into view to its last line leaving */
      if (!wide() || q <= 0 || q >= 1) return null; /* a phone has no free corner: the words sit there */
      const lead = vh / Math.max(1, span); /* the share of that spent arriving, and again leaving */
      const cy = q < lead ? 1.86 - 0.56 * (q / lead) : q > 1 - lead ? 1.14 - 1.9 * inOut((q - (1 - lead)) / lead) : 1.3 - 0.16 * ((q - lead) / (1 - 2 * lead));
      return { ...WORLDS[kind], x: vw * 1.04, y: vh * cy, r: vh * 0.46, o: 1 };
    };
    const sky = (y, t) => {
      const out = [], vw = window.innerWidth;
      if (land.on) return out; /* on Earth the sky holds one moon or one sun, drawn with the land */
      if (!home) {
        const kind = { dpc: "dpc", pension: "pension", tsfm: "tsfm", wsl: "moon", aurvane: "aurvane" }[all[0].svg.dataset.scene], o = 1 - seg(y, vh * 0.35, vh * 0.95);
        if (o > 0) out.push(kind === "moon" ? { ...WORLDS.moon, x: vw * 0.9, y: vh * 0.24 - y * 0.2, r: vh * 0.05, o } : { ...WORLDS[kind], x: vw * 1.0, y: vh * 1.12 - y * 0.25, r: vh * 0.42, o: o * 0.9 });
        return out;
      }
      const g = giantAt(y), open = clamp((t - introStart) / 1.2);
      if (g.y + g.r * 1.6 > 0) {
        out.push({ ...WORLDS.giant, x: g.x, y: g.y, r: g.r, o: ease(open) });
        if (wide()) out.push({ ...WORLDS.moon, x: g.x + g.r * 2.15, y: g.y - g.r * 1.5 + y * 0.25, r: g.r * 0.1, o: ease(open) });
        return out;
      }
      ["dpc", "pension", "tsfm", "aurvane"].forEach((kind) => { const w = items[kind] && corner(items[kind], kind, y); if (w && out.length < 2) out.push(w); });
      const m = items.wsl, mq = m ? (y - (m.top - vh)) / Math.max(1, m.h + vh) : -1;
      if (out.length < 2 && mq > 0 && mq < 1) out.push({ ...WORLDS.moon, x: vw * (wide() ? 0.95 : 0.86), y: vh * (0.42 - 0.3 * mq), r: vh * 0.045, o: seg(mq, 0, 0.12) * (1 - seg(mq, 0.88, 1)) });
      const end = document.documentElement.scrollHeight - vh, rise = seg(y, end - vh * 1.3, end);
      if (rise > 0 && out.length < 2) { const r = Math.max(vw * 1.15, vh * 1.2); out.push({ ...WORLDS.home, x: vw * 0.5, y: vh * (1.08 - 0.21 * inOut(rise)) + r, r, o: 1 }); }
      return out;
    };
    const drawWorlds = (y, t, light) => {
      const list = sky(y, t);
      if (!list.length) return;
      gl.useProgram(wprog);
      gl.uniform2f(WU.uView, window.innerWidth, window.innerHeight);
      gl.uniform1f(WU.uT, t);
      gl.uniform1f(WU.uLight, light);
      list.forEach((w) => {
        if (w.o <= 0 || w.y - w.r * 1.5 > vh || w.y + w.r * 1.5 < 0) return;
        gl.uniform4f(WU.uQ, w.x, w.y, w.r, 1.45);
        gl.uniform4f(WU.uL, w.light[0], w.light[1], w.light[2], w.o);
        gl.uniform4f(WU.uK, w.seed, w.bands, 1.4 / Math.max(8, w.r * quality.dpr), 0);
        gl.uniform3f(WU.uCa, w.ca[0], w.ca[1], w.ca[2]);
        gl.uniform3f(WU.uCb, w.cb[0], w.cb[1], w.cb[2]);
        gl.uniform2f(WU.uAx, w.axis[0], w.axis[1]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      });
      gl.useProgram(prog);
    };

    /* Labels that ride on the globe: "Fed" over Washington, and the line out to Toronto's stock index. */
    const wslIt = items.wsl;
    const fedLabel = wslIt?.svg.querySelector(".sc-core-t"), tsxLine = wslIt?.svg.querySelector('[data-layer="tsx"] .is-dashed');
    const project = (p, F) => {
      let x = p[0] * F.s, y = p[1] * F.s, z = p[2] * F.s;
      let c = Math.cos(F.ry), s = Math.sin(F.ry);
      [x, z] = [c * x + s * z, -s * x + c * z];
      c = Math.cos(F.rx); s = Math.sin(F.rx);
      [y, z] = [c * y - s * z, s * y + c * z];
      const k = F.d / (F.d - z);
      return [F.cx + x * k, F.cy + y * k];
    };

    let pair = "", ready = false, introStart = 0, ptr = 0;
    const bind = (a, b) => {
      if (pair === a + ">" + b) return;
      pair = a + ">" + b;
      [[A[0], shapes[a].posBuf], [A[1], shapes[b].posBuf], [A[2], shapes[a].colBuf], [A[3], shapes[b].colBuf]].forEach(([loc, buf]) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 0, 0);
      });
    };
    const send = (F, f, r, d) => {
      gl.uniform4f(U[f], F.cx, F.cy, F.s, F.d);
      gl.uniform4f(U[r], F.rx, F.ry, F.alpha, F.size);
      gl.uniform4f(U[d], F.depth, F.back, F.drift, F.pulse);
    };
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const draw = (dt, t) => {
      if (!ready || document.hidden) return;
      /* If the device cannot hold the frame rate, thin the points first, then give up sharpness a quarter step at a
         time and never below a floor that keeps the planets crisp. When frames come easily again, it takes both back.
         A stall (a tab switch, a page still loading) counts as one slow frame, not as a slow device. */
      quality.frames += 1;
      if (quality.frames > 0) {
        quality.sum += Math.min(dt, 0.05);
        if (quality.frames >= 80) {
          const avg = quality.sum / quality.frames;
          if (avg > 0.030) {
            quality.calm = 0;
            if (quality.count > N * 0.45) quality.count = Math.round(quality.count * 0.7);
            else if (quality.dpr > DPR_MIN) { quality.dpr = Math.max(DPR_MIN, quality.dpr - 0.25); measure(); }
          } else if (avg < 0.0175 && (quality.calm += 1) >= 2) {
            quality.calm = 0;
            if (quality.dpr < DPR_MAX) { quality.dpr = Math.min(DPR_MAX, quality.dpr + 0.25); measure(); }
            else if (quality.count < N) quality.count = Math.min(N, Math.round(quality.count / 0.7));
          }
          quality.sum = 0; quality.frames = -20;
        }
      }
      const y = window.scrollY;
      const k = 1 - Math.pow(1 - 0.06, dt * 60);
      const live = pointer.active && finePointer;
      const px = live ? pointer.x / window.innerWidth - 0.5 : 0, py = live ? pointer.y / vh - 0.5 : 0;
      tilt.x += (-py * 0.18 + Math.sin(t * 0.43) * 0.035 - tilt.x) * k;
      tilt.y += (px * 0.3 + Math.sin(t * 0.31) * 0.09 - tilt.y) * k;
      ptr += ((live ? 1 : 0) - ptr) * k;

      let sg = lay.segs[0];
      for (const s of lay.segs) { if (y >= s.y0) sg = s; else break; }
      let a = sg.a, b = sg.b, mix = clamp((y - sg.y0) / Math.max(1, sg.y1 - sg.y0)), order = sg.order, w = sg.w, swirl = sg.swirl, front = sg.front;
      if (sg.ease) mix = inOut(mix);
      const opening = intro ? clamp((t - introStart) / intro.dur) : 1;
      if (opening < 1 && sg === lay.segs[0] && mix === 0) { a = intro.a; b = intro.b; mix = intro.order ? inOut(opening) : ease(opening); order = intro.order; w = intro.w; swirl = intro.swirl; front = intro.front || 0; }
      const light = html.dataset.theme === "light" ? 1 : 0;
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawWorlds(y, t, light);
      bind(a, b);
      const FA = frameOf(a, y, t), FB = frameOf(b, y, t);
      send(FA, "uFA", "uRA", "uDA");
      send(FB, "uFB", "uRB", "uDB");
      gl.uniform2f(U.uOc, FA.oc || 0, FB.oc || 0);
      gl.uniform4f(U.uMix, mix, order, w, swirl);
      gl.uniform4f(U.uPtr, pointer.x, pointer.y, 95, 42 * ptr);
      gl.uniform2f(U.uView, window.innerWidth, window.innerHeight);
      gl.uniform2f(U.uTime, t, quality.dpr < 1.5 ? 1.7 : quality.dpr * 1.12); /* points stay visible on standard-density screens */
      gl.uniform2f(U.uFx, clamp(scrollV, -2200, 2200) * 0.006, front); /* a fast scroll leaves the points a little behind */
      gl.uniform1f(U.uLight, light);
      gl.drawArrays(gl.POINTS, 0, quality.count);

      /* The words on top lean with the points; the globe carries its own two labels. */
      all.forEach((it) => {
        if (y + vh < it.top - vh * 0.2 || y > it.top + it.h + vh * 0.2) return;
        if (it === wslIt) {
          const F = globeFrame(it, y, t), left = it.svgCx - 300 * it.svgS, top = stageTop(it, y) + it.svgCy - (it.vbH / 2) * it.svgS;
          const toSvg = (p) => [(p[0] - left) / it.svgS, (p[1] - top) / it.svgS];
          const fed = toSvg(project(sphere(WASHINGTON[0], WASHINGTON[1], globe.r), F)), tsx = toSvg(project(sphere(TORONTO[0], TORONTO[1], globe.r * 1.02), F));
          fedLabel.setAttribute("x", (fed[0] + 14).toFixed(1)); fedLabel.setAttribute("y", (fed[1] + 18).toFixed(1));
          tsxLine.setAttribute("x1", tsx[0].toFixed(1)); tsxLine.setAttribute("y1", tsx[1].toFixed(1));
        } else {
          it.svg.style.transform = `perspective(1400px) rotateX(${tilt.x.toFixed(4)}rad) rotateY(${tilt.y.toFixed(4)}rad)`;
        }
      });
    };

    const start = () => safe(() => {
      build();
      if (fedLabel) fedLabel.setAttribute("text-anchor", "start");
      html.classList.add("stage");
      measures.push(measure);
      measure();
      introStart = window.scrollY > 40 ? -10 : performance.now() / 1000 + 0.05;
      ready = true;
      requestAnimationFrame(remeasure); /* the hero and the pictures change size once the stage is on */
      tasks.push(draw);
    });
    if (document.fonts?.ready) document.fonts.ready.then(start); else start();
  });

  /* ---- Marquee: drifts on its own, runs with the scroll and leans into it. ------------------- */
  safe(() => {
    const track = document.querySelector("[data-marquee]");
    if (!track) return;
    let x = 0, skew = 0, dir = -1, width = 0;
    measures.push(() => { width = track.firstElementChild.getBoundingClientRect().width; });
    tasks.push((dt) => {
      if (!width) return;
      if (Math.abs(scrollV) > 30) dir = scrollV > 0 ? -1 : 1;
      x += dir * (60 + Math.min(1600, Math.abs(scrollV)) * 0.45) * dt;
      x = ((x % width) - width) % width;
      skew += (clamp(-scrollV * 0.004, -10, 10) - skew) * 0.1;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    });
  });

  /* ---- The closing wordmark fills as the page ends, and is sized to its line. ---------------- */
  safe(() => {
    const giant = document.querySelector("[data-giant]");
    if (!giant) return;
    const line = giant.querySelector(".giant-line");
    let startY = 0;
    measures.push(() => {
      giant.style.fontSize = "";
      const avail = giant.clientWidth - parseFloat(getComputedStyle(giant).paddingLeft) * 2;
      const now = line.getBoundingClientRect().width;
      if (now > 0) giant.style.fontSize = `${(parseFloat(getComputedStyle(giant).fontSize) * avail / now * 0.99).toFixed(2)}px`;
      startY = docTop(giant) - vh;
    });
    tasks.push(() => {
      const y = window.scrollY;
      const endY = Math.max(startY + 1, document.documentElement.scrollHeight - vh - 2);
      setVar(giant, "--g", clamp((y - startY) / (endY - startY)), 4);
    });
  });

  /* ---- Surfaces that answer the pointer: lit borders, tilting tiles, magnetic buttons. ------- */
  if (finePointer) {
    safe(() => {
      const sel = ".card, .feature, .telemetry a, .rules li, .toolkit article, .certs article, .role, .facts div, .project-switch a, .plain";
      document.querySelectorAll(sel).forEach((p) => { if (getComputedStyle(p).position === "static") p.style.position = "relative"; el("span", "fx-glow", p).setAttribute("aria-hidden", "true"); });
      let lit = null;
      document.addEventListener("pointermove", (e) => {
        const p = e.target.closest?.(sel);
        if (lit && lit !== p) { lit.classList.remove("is-lit"); if (lit.matches(".telemetry a")) { lit.style.removeProperty("--rx"); lit.style.removeProperty("--ry"); } }
        lit = p;
        if (!p) return;
        const r = p.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        p.style.setProperty("--mx", `${mx}px`);
        p.style.setProperty("--my", `${my}px`);
        p.classList.add("is-lit");
        if (p.matches(".telemetry a")) {
          p.style.setProperty("--ry", `${((mx / r.width - 0.5) * 10).toFixed(2)}deg`);
          p.style.setProperty("--rx", `${((0.5 - my / r.height) * 10).toFixed(2)}deg`);
        }
      }, { passive: true });
    });
    safe(() => {
      document.querySelectorAll(".button, .nav-resume, .theme-toggle, .viz-pause").forEach((b) => {
        b.addEventListener("pointermove", (e) => {
          const r = b.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          b.classList.add("is-magnet");
          b.style.transform = `translate(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.32).toFixed(1)}px)`;
        });
        b.addEventListener("pointerleave", () => { b.classList.remove("is-magnet"); b.style.transform = ""; });
      });
    });
    safe(() => {
      const ring = el("div", "fx-cursor", body);
      const dot = el("div", "fx-dot", body);
      ring.setAttribute("aria-hidden", "true");
      dot.setAttribute("aria-hidden", "true");
      let rx = pointer.x, ry = pointer.y;
      document.addEventListener("pointerover", (e) => {
        const t = e.target;
        ring.classList.toggle("is-link", !!t.closest?.("a, button, summary, label, [role='button'], [data-lab] li, [data-attack] [role='radio']"));
        ring.classList.toggle("is-fine", !!t.closest?.("canvas, input[type='range'], .lab-plot, .chart-track"));
      });
      document.addEventListener("pointerdown", () => ring.classList.add("is-down"));
      document.addEventListener("pointerup", () => ring.classList.remove("is-down"));
      html.addEventListener("pointerleave", () => html.classList.remove("fx-pointer"));
      window.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") html.classList.add("fx-pointer"); }, { passive: true });
      tasks.push((dt) => {
        const k = 1 - Math.pow(1 - 0.2, dt * 60);
        rx += (pointer.x - rx) * k;
        ry += (pointer.y - ry) * k;
        ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
        dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      });
    });
  }

  startClock();
})();
