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
    "pre-registered": ["Pre-registered", "The test, the metrics and the rule for reading a disappointing answer were fixed in git before the result was computed, so the answer cannot steer the question."]
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
