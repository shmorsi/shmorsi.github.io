/* Theme, header, menu, one calm reveal, and every figure from data/projects.json.
   The page heading, experience, and contact work if this file fails to run. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.body.dataset.root || "";
  const html = document.documentElement;

  /* Theme: OS preference by default, the toggle overrides it for this browser. */
  const store = {
    get() { try { return localStorage.getItem("theme"); } catch { return null; } },
    set(value) { try { localStorage.setItem("theme", value); } catch { /* private mode */ } }
  };
  const osLight = window.matchMedia("(prefers-color-scheme: light)");
  const currentTheme = () => html.dataset.theme || (osLight.matches ? "light" : "dark");
  const toggle = document.querySelector("[data-theme-toggle]");
  const paintToggle = () => {
    if (!toggle) return;
    const next = currentTheme() === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-label", `Switch to ${next} theme`);
    toggle.dataset.mode = currentTheme();
  };
  const listeners = [];
  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      html.dataset.theme = next;
      store.set(next);
      paintToggle();
      listeners.forEach((fn) => fn());
    });
  }
  osLight.addEventListener?.("change", () => { paintToggle(); listeners.forEach((fn) => fn()); });
  paintToggle();

  /* A still field of stars, dark theme only. It never moves. */
  const canvas = document.querySelector("[data-stars]");
  if (canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const mobile = w < 700;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (currentTheme() !== "dark") return;
      const count = mobile ? 60 : 130;
      for (let i = 0; i < count; i += 1) {
        const x = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const y = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
        const z = 0.2 + (i % 7) / 10;
        ctx.fillStyle = `rgba(255,255,255,${0.18 + z * 0.45})`;
        const s = z > 0.7 ? 1.5 : 1;
        ctx.fillRect(x * w, y * h, s, s);
      }
    };
    draw();
    let resizeTimer;
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(draw, 120); }, { passive: true });
    listeners.push(draw);
  }

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
    window.matchMedia("(min-width: 1181px)").addEventListener?.("change", close);
  }

  const status = document.querySelector("[data-copy-status]");
  let copyTimer;
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(button.dataset.copyEmail); } catch { /* still announce */ }
      if (!status) return;
      status.textContent = "Email copied";
      status.classList.add("show");
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => status.classList.remove("show"), 1800);
    });
  });

  const reveal = (scope) => {
    const nodes = [...(scope || document).querySelectorAll("[data-reveal]:not(.in)")];
    if (!nodes.length) return;
    if (reduce || !("IntersectionObserver" in window)) {
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

  const links = new Map();
  document.querySelectorAll("[data-section]").forEach((anchor) => links.set(anchor.dataset.section, anchor));
  if (links.size && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = links.get(entry.target.id);
        if (!link || !entry.isIntersecting) return;
        links.forEach((item) => item.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    links.forEach((_, id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  /* Video slots: a screenshot stands in until a walkthrough video is added with data-video-src. */
  document.querySelectorAll("[data-video-src]").forEach((slot) => {
    const src = slot.dataset.videoSrc;
    const poster = slot.dataset.videoPoster || "";
    if (!src) return;
    const video = document.createElement("video");
    video.muted = true; video.loop = true; video.playsInline = true; video.preload = "none";
    if (poster) video.poster = poster;
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
    const holder = slot.querySelector("[data-video-holder]") || slot;
    holder.replaceChildren(video, button);
  });

  const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  const href = (link) => (link.external || /^(https?:|mailto:)/.test(link.href) ? link.href : `${root}${link.href}`);
  const ext = (link) => (link.external ? ` target="_blank" rel="noopener noreferrer"` : "");
  const arrow = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
  const github = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z"/></svg>`;

  const linkHtml = (link) => {
    if (link.kind === "site") return `<a class="button button-solid" href="${esc(href(link))}"${ext(link)}>${esc(link.label)}${link.external ? arrow : ""}</a>`;
    if (link.kind === "repo") return `<a class="button" href="${esc(href(link))}"${ext(link)}>${github}${esc(link.label)}</a>`;
    return `<a class="text-link" href="${esc(href(link))}"${ext(link)}>${esc(link.label)}</a>`;
  };

  const isText = (value) => !/[0-9]/.test(String(value));

  const figureHtml = (project, tag = "p") => {
    const stat = project.stats[project.headline.stat];
    return `<div class="figure-block">
      <${tag} class="hero-fig${isText(stat.display) ? " is-text" : String(stat.display).length > 7 ? " is-long" : ""}">${esc(stat.display)}</${tag}>
      <p class="fig-label">${esc(stat.label)}</p>
      <p class="qualifier">${esc(project.headline.qualifier)}</p>
    </div>`;
  };

  const specHtml = (project, ids) => `<dl class="spec">${ids.map((id) => project.stats[id]).filter(Boolean)
    .map((stat) => `<div><dt>${esc(stat.label)}</dt><dd>${esc(stat.display)}</dd></div>`).join("")}</dl>`;

  const mediaHtml = (project) => {
    const site = project.links.find((link) => link.kind === "site") || project.links[0];
    const img = `<img src="${esc(root + project.image.src)}" alt="${esc(project.image.alt)}" width="${project.image.width}" height="${project.image.height}" decoding="async" loading="lazy">`;
    const chip = project.badge ? `<span class="chip${project.badge === "Live site" ? " is-live" : ""}">${esc(project.badge)}</span>` : "";
    const fit = project.image.fit === "contain" ? " contain" : "";
    return `<a class="frame${fit}" href="${esc(href(site))}"${ext(site)} tabindex="-1" aria-hidden="true">${img}${chip}</a>`;
  };

  /* Display order is a presentation choice. projects.json mission codes stay as stored. */
  const PRESENT = ["orbit", "tsfm", "world-shock-lab", "atlas"];
  const presentOrder = (id) => {
    const index = PRESENT.indexOf(id);
    return index === -1 ? PRESENT.length : index;
  };
  const presentNo = (id) => String(presentOrder(id) + 1).padStart(2, "0");

  const missionHtml = (project) => `<article class="mission" id="${esc(project.id)}" aria-labelledby="${esc(project.id)}-title" data-reveal>
      <header class="mission-head">
        <p class="label mission-num">${esc(presentNo(project.id))} / ${esc(project.kicker)}</p>
        <h2 id="${esc(project.id)}-title">${esc(project.title)}</h2>
        <p class="purpose">${esc(project.purpose)}</p>
        ${project.proves ? `<p class="proves"><span class="label">What it proves</span>${esc(project.proves)}</p>` : ""}
      </header>
      <div class="mission-media">${mediaHtml(project)}</div>
      <div class="mission-body">
        ${figureHtml(project)}
        ${specHtml(project, project.factIds || [])}
        <div class="actions">${(project.links || []).map(linkHtml).join("")}</div>
        <p class="caveat"><span class="label">Read this</span>${esc(project.caveat)}</p>
        <p class="label">Stack</p>
        <ul class="tags" aria-label="Stack">${(project.tags || []).map((tag) => `<li>${esc(tag)}</li>`).join("")}</ul>
      </div>
    </article>`;

  const tableHtml = (table) => {
    const head = table.headers.map((cell) => `<th scope="col">${esc(cell)}</th>`).join("");
    const body = table.rows.map((row, r) => `<tr${table.highlightRow === r ? ` class="is-best"` : ""}>${row.map((cell, index) => (index === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`)).join("")}</tr>`).join("");
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
    document.querySelectorAll("[data-mission-list]").forEach((mount) => {
      if (mount.dataset.static === "true") return;
      const featured = data.projects
        .filter((project) => project.role === "featured")
        .sort((a, b) => presentOrder(a.id) - presentOrder(b.id));
      mount.innerHTML = featured.map(missionHtml).join("");
    });
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
      node.textContent = value == null ? "" : String(value);
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
      .catch(() => {
        document.querySelectorAll("[data-mission-list]").forEach((mount) => {
          if (mount.dataset.static === "true") return;
          mount.innerHTML = `<p class="caveat">Measured results could not be loaded from data/projects.json. The project links below still work.</p>`;
        });
      });
  }

  /* Decorative packet on the Orbit schematic. Lines are redrawn from the nodes, so the picture tracks the layout. */
  const mountSchematic = () => {
    const root = document.querySelector("[data-schematic]");
    if (!root) return;
    const stage = root.querySelector(".schematic-stage");
    const svg = root.querySelector(".schematic-links");
    const packet = root.querySelector("[data-packet]");
    const nodes = {};
    root.querySelectorAll("[data-node]").forEach((el) => { nodes[el.dataset.node] = el; });
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let points = [];
    let centers = {};
    let raf = 0;
    let running = false;
    let resizeTimer = 0;

    const anchor = (el, which) => {
      const s = stage.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const x = b.left - s.left;
      const y = b.top - s.top;
      if (which === "left") return [x, y + b.height / 2];
      if (which === "right") return [x + b.width, y + b.height / 2];
      if (which === "top") return [x + b.width / 2, y];
      return [x + b.width / 2, y + b.height];
    };
    const samples = (a, b, n = 16) => {
      const pts = [];
      for (let i = 0; i <= n; i += 1) {
        const t = i / n;
        pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
      return pts;
    };
    const curve = (a, b, c, n = 22) => {
      const pts = [];
      for (let i = 0; i <= n; i += 1) {
        const t = i / n;
        const u = 1 - t;
        pts.push([
          u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
          u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]
        ]);
      }
      return pts;
    };
    const pathOf = (pts) => `M ${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ")}`;
    const place = (pt, hot) => {
      packet.style.transform = `translate(${pt[0]}px, ${pt[1]}px) translate(-50%, -50%)`;
      packet.classList.add("is-on");
      root.querySelectorAll("[data-node]").forEach((el) => {
        el.classList.toggle("is-hot", el.dataset.node === hot);
      });
    };
    const nearest = (pt) => {
      let best = "gate";
      let bestD = Infinity;
      Object.entries(centers).forEach(([name, c]) => {
        const d = (c[0] - pt[0]) ** 2 + (c[1] - pt[1]) ** 2;
        if (d < bestD) { bestD = d; best = name; }
      });
      return best;
    };
    const draw = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const stacked = w < 640;
      const parts = [];
      points = [];
      if (stacked) {
        const seq = ["planner", "worker", "tools", "critic", "gate"];
        for (let i = 0; i < seq.length - 1; i += 1) {
          const a = anchor(nodes[seq[i]], "bottom");
          const b = anchor(nodes[seq[i + 1]], "top");
          const pts = samples(a, b, 12);
          parts.push(`<path d="${pathOf(pts)}"></path>`);
          points.push(...pts);
        }
      } else {
        const pr = anchor(nodes.planner, "right");
        const wl = anchor(nodes.worker, "left");
        const wb = anchor(nodes.worker, "bottom");
        const tt = anchor(nodes.tools, "top");
        const wr = anchor(nodes.worker, "right");
        const cl = anchor(nodes.critic, "left");
        const cb = anchor(nodes.critic, "bottom");
        const gt = anchor(nodes.gate, "top");
        const ct = anchor(nodes.critic, "top");
        const wt = anchor(nodes.worker, "top");
        const rev = curve(ct, wt, [(ct[0] + wt[0]) / 2, Math.min(ct[1], wt[1]) - 28]);
        [
          [pr, wl],
          [wb, tt],
          [wr, cl],
          [cb, gt]
        ].forEach(([a, b]) => {
          const pts = samples(a, b);
          parts.push(`<path d="${pathOf(pts)}"></path>`);
        });
        parts.push(`<path class="revise" d="${pathOf(rev)}"></path>`);
        points.push(
          ...samples(pr, wl),
          ...samples(wb, tt),
          ...samples(tt, wb),
          ...samples(wr, cl),
          ...rev,
          ...samples(wr, cl),
          ...samples(cb, gt)
        );
      }
      svg.innerHTML = parts.join("");
      const stageBox = stage.getBoundingClientRect();
      centers = {};
      Object.entries(nodes).forEach(([name, el]) => {
        const b = el.getBoundingClientRect();
        centers[name] = [b.left - stageBox.left + b.width / 2, b.top - stageBox.top + b.height / 2];
      });
      if (!motion.matches && points.length) place(points[points.length - 1], "gate");
    };
    const tick = (now) => {
      if (!running) return;
      if (!points.length) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const duration = 10000;
      const idx = Math.min(points.length - 1, Math.floor(((now % duration) / duration) * points.length));
      const pt = points[idx];
      place(pt, nearest(pt));
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running || !motion.matches) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    draw();
    requestAnimationFrame(draw);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) start();
        else stop();
      });
    }, { threshold: 0.12 });
    io.observe(stage);
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(draw, 60);
    }, { passive: true });
    motion.addEventListener?.("change", () => {
      draw();
      if (motion.matches) start();
      else stop();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
  };
  /* Clips stay on a still frame until they are on screen, and they never autoplay when motion is reduced. */
  document.querySelectorAll(".clip").forEach((clip) => {
    const img = clip.querySelector("img[data-gif]");
    const button = clip.querySelector("[data-clip-toggle]");
    if (!img || !button) return;
    const gif = img.dataset.gif;
    const poster = img.dataset.poster;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let userPaused = false;
    let active = false;
    const paint = (playing) => {
      const next = playing ? gif : poster;
      if (next && img.getAttribute("src") !== next) img.setAttribute("src", next);
      active = playing;
      button.textContent = playing ? "Pause clip" : "Play clip";
      button.setAttribute("aria-pressed", playing ? "true" : "false");
    };
    button.addEventListener("click", () => {
      if (active) { userPaused = true; paint(false); }
      else { userPaused = false; paint(true); }
    });
    if ("IntersectionObserver" in window) {
      let primed = false;
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting && entry.intersectionRatio >= 0.4;
          /* A clip already on screen stays a still frame so the first paint is not a large GIF. */
          if (!primed) { primed = true; if (visible) return; }
          if (visible && motion.matches && !userPaused) paint(true);
          else if (!entry.isIntersecting && active && !userPaused) paint(false);
        });
      }, { threshold: [0, 0.4] });
      io.observe(clip);
    }
    motion.addEventListener?.("change", () => {
      if (!motion.matches && active && !userPaused) paint(false);
    });
  });

  mountSchematic();
  reveal(document);
})();
