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
    return `<table><caption>${esc(table.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
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

  /* ---- Hero illustration: end-to-end learning for a long-short book. -------------------------
     Prices stream in on the left, a small network attends across them, and its outputs set the
     long and short weights on the right. Amber pulses run backwards: the gradient of the result.
     A seeded random walk, not market data. Paused off screen and in background tabs; a single
     still frame when the reader prefers reduced motion. */
  const canvas = document.querySelector("[data-market]");
  if (canvas) {
    const g = canvas.getContext("2d");
    const N = 6;           /* assets */
    const H = 7;           /* hidden units per layer */
    const LEN = 96;        /* points on screen per price path */
    let seed = 20261108;
    const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
    const gauss = () => { let u = 0; while (u === 0) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); };
    const assets = Array.from({ length: N }, () => ({ drift: (rand() - 0.5) * 0.008, vol: 0.012 + rand() * 0.014, path: [] }));
    const tick = (a) => {
      const last = a.path.length ? a.path[a.path.length - 1] : 0;
      a.path.push(last + a.drift + a.vol * gauss());
      if (a.path.length > LEN) a.path.shift();
    };
    assets.forEach((a) => { for (let i = 0; i < LEN; i += 1) tick(a); });

    /* The "model": 24-step momentum, demeaned across assets so the book is dollar-neutral. */
    const signal = () => {
      const m = assets.map((a) => a.path[a.path.length - 1] - a.path[Math.max(0, a.path.length - 25)]);
      const mean = m.reduce((s, x) => s + x, 0) / N;
      const d = m.map((x) => x - mean);
      const gross = d.reduce((s, x) => s + Math.abs(x), 0) || 1;
      return d.map((x) => (2 * x) / gross);
    };
    let target = signal();
    const shown = target.slice();

    /* Attention: each hidden-to-hidden edge brightens on its own slow cycle. */
    const phase = Array.from({ length: H * H }, () => [0.25 + rand() * 0.6, rand() * Math.PI * 2]);
    const route = () => [Math.floor(rand() * N), Math.floor(rand() * H), Math.floor(rand() * H), Math.floor(rand() * N)];
    const pulses = Array.from({ length: 16 }, (_, i) => ({ path: route(), t: (i / 16) * 3, speed: 0.55 + rand() * 0.35, back: false }));
    for (let i = 0; i < 3; i += 1) pulses.push({ path: route(), t: i, speed: 0.4 + rand() * 0.15, back: true });

    let W = 0; let Hc = 0; let geo = null;
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
      geo.zero = (geo.b0 + geo.b1) / 2;
    };
    const nodeXY = (layer, index) => {
      if (layer === 0) return [geo.xIn, geo.row(index)];
      if (layer === 1) return [geo.xH1, geo.hid(index)];
      if (layer === 2) return [geo.xH2, geo.hid(index)];
      return [geo.xOut, geo.row(index)];
    };
    const label = (text, x, y, align) => {
      g.font = `600 ${geo.small ? 9.5 : 10.5}px "Inter Tight", Arial, sans-serif`;
      if ("letterSpacing" in g) g.letterSpacing = "1.6px";
      g.fillStyle = rgba(colors.dim, 1);
      g.textAlign = align;
      g.fillText(text, x, y);
      if ("letterSpacing" in g) g.letterSpacing = "0px";
    };
    const paint = (time) => {
      if (!geo) return;
      const { row, hid, top, bottom } = geo;
      g.clearRect(0, 0, W, Hc);

      /* Column titles and the zero line of the book. */
      label("PRICES", geo.p0, top - 18, "left");
      label("MODEL", (geo.xIn + geo.xOut) / 2, top - 18, "center");
      label("WEIGHTS", geo.b1, top - 18, "right");
      label("SHORT", geo.zero - 8, bottom + 20, "right");
      label("LONG", geo.zero + 8, bottom + 20, "left");
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
        g.strokeStyle = rgba(colors.ink, 0.62);
        g.lineWidth = 1.1;
        g.beginPath();
        a.path.forEach((v, k) => (k ? g.lineTo(x(k), y(v)) : g.moveTo(x(k), y(v))));
        g.stroke();
        const lx = x(a.path.length - 1); const ly = y(a.path[a.path.length - 1]);
        g.strokeStyle = rgba(colors.ink, 0.12);
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(geo.xIn, y0); g.stroke();
        g.fillStyle = colors.accent;
        g.beginPath(); g.arc(lx, ly, 2, 0, Math.PI * 2); g.fill();
      });

      /* Edges: a faint mesh, with attention picking out a few at a time. */
      g.lineWidth = 1;
      g.strokeStyle = rgba(colors.ink, 0.06);
      g.beginPath();
      for (let i = 0; i < N; i += 1) for (let j = 0; j < H; j += 1) { g.moveTo(geo.xIn, row(i)); g.lineTo(geo.xH1, hid(j)); }
      for (let j = 0; j < H; j += 1) for (let k = 0; k < H; k += 1) { g.moveTo(geo.xH1, hid(j)); g.lineTo(geo.xH2, hid(k)); }
      for (let k = 0; k < H; k += 1) for (let m = 0; m < N; m += 1) { g.moveTo(geo.xH2, hid(k)); g.lineTo(geo.xOut, row(m)); }
      g.stroke();
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
      const node = (x, y, r, fill) => {
        g.fillStyle = fill || colors.bg;
        g.strokeStyle = rgba(colors.ink, 0.55);
        g.lineWidth = 1;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
      };
      for (let i = 0; i < N; i += 1) node(geo.xIn, row(i), 3);
      for (let j = 0; j < H; j += 1) { node(geo.xH1, hid(j), 3.4); node(geo.xH2, hid(j), 3.4); }
      const peak = Math.max(...shown.map(Math.abs)) || 1;
      for (let m = 0; m < N; m += 1) node(geo.xOut, row(m), 3.6, shown[m] > 0 ? rgba(colors.accent, 0.25 + 0.75 * (shown[m] / peak)) : null);

      /* The book: longs to the right in accent, shorts to the left in ink. */
      const half = (geo.b1 - geo.b0) / 2 - 4;
      shown.forEach((w, m) => {
        const y = row(m);
        const len = (Math.abs(w) / peak) * half;
        const h = Math.max(6, Math.min(14, geo.band * 0.42));
        g.fillStyle = w >= 0 ? colors.accent : rgba(colors.ink, 0.42);
        if (w >= 0) g.fillRect(geo.zero + 1, y - h / 2, len, h);
        else g.fillRect(geo.zero - len, y - h / 2, len, h);
        g.strokeStyle = rgba(colors.ink, 0.1);
        g.beginPath(); g.moveTo(geo.xOut + 4, y); g.lineTo(geo.zero - (w < 0 ? len : 0) - 2, y); g.stroke();
      });
    };

    let raf = 0; let last = 0; let clock = 0; let since = 0; let steps = 0;
    let onScreen = true;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now; clock += dt; since += dt;
      if (since > 0.14) {                         /* a new price every 140 ms */
        since = 0; steps += 1;
        assets.forEach(tick);
        if (steps % 220 === 0) assets.forEach((a) => { a.drift = (rand() - 0.5) * 0.008; });
        if (steps % 12 === 0) target = signal(); /* rebalance */
      }
      shown.forEach((w, m) => { shown[m] = w + (target[m] - w) * Math.min(1, dt * 2.2); });
      pulses.forEach((p) => {
        p.t += dt * p.speed;
        if (p.t >= 3) { p.t = 0; p.path = route(); }
      });
      paint(clock);
      raf = onScreen && !document.hidden && !reduce() ? requestAnimationFrame(frame) : 0;
    };
    const start = () => { if (!raf && onScreen && !document.hidden && !reduce()) { last = 0; raf = requestAnimationFrame(frame); } };
    const still = () => { layout(); paint(4); };
    readColors();
    still();
    themeListeners.push(() => { readColors(); if (!raf) paint(clock || 4); });
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { layout(); paint(clock || 4); }, 120);
    }, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; start(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", start);
    reduceQuery.addEventListener?.("change", () => { if (reduce()) still(); else start(); });
    document.fonts?.ready.then(() => { if (!raf) paint(clock || 4); });
    start();
  }

  reveal(document);
})();
