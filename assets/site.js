/* Starfield, countdown, scroll reveals, and figures from data/projects.json.
   The page heading, experience, and contact work if this file fails to run. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.body.dataset.root || "";

  const canvas = document.querySelector("[data-stars]");
  if (canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    const draw = () => {
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const count = mobile ? 70 : 140;
      for (let i = 0; i < count; i += 1) {
        const x = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
        const y = Math.abs(Math.sin(i * 78.233) * 12345.678) % 1;
        const z = 0.25 + (i % 7) / 10;
        ctx.fillStyle = `rgba(255,255,255,${0.25 + z * 0.5})`;
        ctx.fillRect(x * w, y * h, z > 0.7 ? 1.6 : 1, z > 0.7 ? 1.6 : 1);
      }
    };
    draw();
    window.addEventListener("resize", draw, { passive: true });
  }

  const bar = document.querySelector("[data-scroll-progress]");
  const header = document.querySelector(".site-header");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (bar) bar.style.transform = `scaleX(${ratio})`;
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  document.addEventListener("scroll", onScroll, { passive: true });

  const countdown = document.querySelector("[data-countdown]");
  const countdownState = document.querySelector("[data-countdown-state]");
  const countdownFill = document.querySelector("[data-countdown-bar] span");
  const checks = [...document.querySelectorAll("[data-check]")];
  const TOTAL = 5;
  const paintCountdown = (left) => {
    if (!countdown) return;
    const clamped = Math.max(0, left);
    countdown.textContent = `00:00:0${clamped}`;
    if (countdownFill) countdownFill.style.width = `${((TOTAL - clamped) / TOTAL) * 100}%`;
    if (countdownState) countdownState.textContent = clamped === 0 ? "Window open" : "Stand by";
  };
  if (reduce || !countdown) {
    checks.forEach((item) => item.classList.add("on"));
    paintCountdown(0);
  } else {
    let left = TOTAL;
    paintCountdown(left);
    const timer = window.setInterval(() => {
      left -= 1;
      paintCountdown(left);
      if (left <= 0) window.clearInterval(timer);
    }, 1000);
    checks.forEach((item, index) => {
      window.setTimeout(() => item.classList.add("on"), 350 * (index + 1));
    });
  }

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
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  const status = document.querySelector("[data-copy-status]");
  let copyTimer;
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", async () => {
      const email = button.dataset.copyEmail;
      try { await navigator.clipboard.writeText(email); } catch { /* still announce */ }
      if (!status) return;
      status.textContent = "Email copied";
      status.classList.add("show");
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => status.classList.remove("show"), 1800);
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
    }, { threshold: 0.16 });
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
    }, { rootMargin: "-40% 0px -50% 0px" });
    links.forEach((_, id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));

  const formatCount = (stat, value) => {
    const decimals = stat.decimals || 0;
    const negative = value < 0;
    const abs = Math.abs(value);
    let num = abs.toFixed(decimals);
    if (decimals === 0 && abs >= 1000) num = Math.round(abs).toLocaleString("en-US");
    return `${stat.prefix || ""}${negative ? "−" : ""}${num}${stat.suffix || ""}`;
  };

  const animateCounts = (scope) => {
    const nodes = [...(scope || document).querySelectorAll("[data-count]")];
    if (!nodes.length) return;
    const run = (node) => {
      const target = Number(node.dataset.count);
      const decimals = Number(node.dataset.decimals || 0);
      const stat = {
        decimals,
        prefix: node.dataset.prefix || "",
        suffix: node.dataset.suffix || ""
      };
      const finalText = node.dataset.final;
      if (reduce || !Number.isFinite(target)) {
        node.textContent = finalText;
        return;
      }
      const start = performance.now();
      const duration = 900;
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 3;
        node.textContent = formatCount(stat, target * eased);
        if (t < 1) requestAnimationFrame(step);
        else node.textContent = finalText;
      };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(run);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nodes.forEach((node) => io.observe(node));
  };

  const metricHtml = (stat) => {
    const count = stat.count == null ? "" : ` data-count="${stat.count}" data-decimals="${stat.decimals || 0}" data-prefix="${escapeHtml(stat.prefix || "")}" data-suffix="${escapeHtml(stat.suffix || "")}" data-final="${escapeHtml(stat.display)}"`;
    const shown = stat.count == null || reduce ? stat.display : formatCount(stat, 0);
    return `<div><dt>${escapeHtml(stat.label)}</dt><dd${count} aria-label="${escapeHtml(stat.display)}">${escapeHtml(shown)}</dd></div>`;
  };

  const telemetry = (stats) => `<dl class="telemetry">${stats.map(metricHtml).join("")}</dl>`;

  const linkHtml = (link) => {
    if (link.disabled || !link.href) {
      return `<span class="text-link is-disabled">${escapeHtml(link.label)}</span>`;
    }
    const href = link.external || link.href.startsWith("http") || link.href.startsWith("mailto:")
      ? link.href
      : `${root}${link.href}`;
    const external = link.external ? ` target="_blank" rel="noopener noreferrer"` : "";
    const cls = link.primary ? "button" : "text-link";
    return `<a class="${cls}" href="${escapeHtml(href)}"${external}>${escapeHtml(link.label)}</a>`;
  };

  const badgeClass = (badge) => {
    if (badge === "Live site") return "badge badge-live";
    if (badge === "Placeholder") return "badge badge-placeholder";
    return "badge";
  };

  const mediaHtml = (project) => {
    if (!project.image) {
      return `<div class="pending-frame" aria-hidden="true"><span>Mission ${escapeHtml(project.mission)}</span><strong>Repo link pending</strong><span>No measured results</span></div>`;
    }
    const href = project.links.find((link) => link.href && !link.external)?.href || project.links.find((link) => link.href)?.href;
    const external = project.links.find((link) => link.href === href)?.external;
    const url = href ? (external ? href : `${root}${href}`) : "";
    const img = `<img src="${escapeHtml(root + project.image.src)}" alt="${escapeHtml(project.image.alt)}" width="${project.image.width}" height="${project.image.height}" decoding="async" loading="lazy">`;
    const badge = project.badge ? `<span class="${badgeClass(project.badge)}">${escapeHtml(project.badge)}</span>` : "";
    if (!url) return `<div class="mission-media">${img}${badge}</div>`;
    const ext = external ? ` target="_blank" rel="noopener noreferrer"` : "";
    return `<a class="mission-media" href="${escapeHtml(url)}"${ext}>${img}${badge}</a>`;
  };

  const missionHtml = (project, flip) => {
    const ids = project.homeMetricIds || [];
    const stats = ids.map((id) => project.stats[id]).filter(Boolean);
    const figures = project.role === "placeholder"
      ? `<dl class="telemetry"><div><dt>Repository</dt><dd>Pending</dd></div><div><dt>Measured results</dt><dd>None yet</dd></div><div><dt>Where it runs</dt><dd>Local</dd></div><div><dt>Estimates</dt><dd>None</dd></div></dl>`
      : telemetry(stats);
    return `<article class="mission${project.role === "secondary" ? " mission-secondary" : " mission-feature"}${flip ? " mission-flip" : ""}" id="${escapeHtml(project.id)}">
      ${mediaHtml(project)}
      <div class="mission-copy" data-reveal>
        <h3><span class="mission-code">Mission ${escapeHtml(project.mission)} — ${escapeHtml(project.code)}</span>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.summary)}</p>
        ${figures}
        <p class="caveat">${escapeHtml(project.caveat)}</p>
        <ul class="tags" aria-label="Tools">${(project.tags || []).map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>
        <div class="mission-links">${(project.links || []).map(linkHtml).join("")}</div>
      </div>
    </article>`;
  };

  const tableHtml = (table) => {
    const head = table.headers.map((cell) => `<th scope="col">${escapeHtml(cell)}</th>`).join("");
    const body = table.rows.map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
    return `<table><caption>${escapeHtml(table.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  };

  const lookup = (byId, path) => {
    const [id, ...rest] = path.split(".");
    let cursor = byId[id];
    rest.forEach((key) => {
      cursor = cursor == null ? undefined : cursor[key];
    });
    return cursor;
  };

  const hydrate = (data) => {
    const byId = Object.fromEntries(data.projects.map((project) => [project.id, project]));
    document.querySelectorAll("[data-mission-list]").forEach((mount) => {
      const role = mount.dataset.missionList;
      const projects = data.projects.filter((project) => (role === "secondary" ? project.role === "secondary" : project.role !== "secondary"));
      mount.innerHTML = projects.map((project, index) => missionHtml(project, index % 2 === 1)).join("");
    });
    document.querySelectorAll("[data-bind]").forEach((node) => {
      const value = lookup(byId, node.dataset.bind);
      node.textContent = value == null ? "—" : String(value);
    });
    document.querySelectorAll("[data-table]").forEach((node) => {
      const table = lookup(byId, node.dataset.table);
      node.innerHTML = table ? tableHtml(table) : `<p class="caveat">Missing table ${escapeHtml(node.dataset.table)} in data/projects.json.</p>`;
    });
    document.querySelectorAll("[data-glance]").forEach((node) => {
      const project = byId[node.dataset.glance];
      if (!project) return;
      if (project.role === "placeholder") {
        node.innerHTML = `<dl class="telemetry"><div><dt>Repository</dt><dd>Pending</dd></div><div><dt>Measured results</dt><dd>None yet</dd></div><div><dt>Where it runs</dt><dd>Local</dd></div><div><dt>Estimates</dt><dd>None</dd></div></dl>`;
        return;
      }
      const ids = project.glanceIds?.length ? project.glanceIds : project.homeMetricIds;
      node.innerHTML = telemetry(ids.map((id) => project.stats[id]).filter(Boolean));
    });
    reveal(document);
    animateCounts(document);
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
          mount.innerHTML = `<p class="caveat">Measured results could not be loaded from data/projects.json.</p>`;
        });
      });
  }
  reveal(document);
})();
