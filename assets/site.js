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
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const wide = () => window.innerWidth > 900;
  const isHome = !!document.querySelector(".hero");
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
    const before = [...document.querySelectorAll(".fx-stars")].pop() || document.querySelector(".fx-field");
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
        const last = { dpc: "chart", pension: "pLearned", tsfm: "result", wsl: "gLit" }[name];
        intro = { dpc: { a: "seed", b: "chart", order: 1, w: 0.05, swirl: 0.25, dur: 2.4 }, pension: { a: "ambient", b: "pLearned", order: 1, w: 0.12, swirl: 0.5, dur: 2.4 }, tsfm: { a: "ambient", b: "result", order: 1, w: 0.4, swirl: 0.8, dur: 1.8 }, wsl: { a: "gDim", b: "gLit", order: 1, w: 0.07, swirl: 0.6, front: 1, dur: 2.6 } }[name];
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
      if (!home) {
        const kind = { dpc: "dpc", pension: "pension", tsfm: "tsfm", wsl: "moon" }[all[0].svg.dataset.scene], o = 1 - seg(y, vh * 0.35, vh * 0.95);
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
      const opening = clamp((t - introStart) / intro.dur);
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
