/* Portfolio interactions: the hero's shock field, the mobile menu, the active section in the
   navigation and copy-to-clipboard for the email address. Everything works without it. */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------ shock field
     A grid of sensors. A "shock" starts at a point and a damped wave spreads outward,
     like an impulse response decaying over time. Sensors near the front glow amber, then
     relax to ice blue. Clicks send new shocks; one also arrives every few seconds. */
  const canvas = document.querySelector("[data-shock-field]");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const shocks = [];
    let width = 0, height = 0, points = [], running = false, frame = 0, nextAuto = 0;
    const SPEED = 0.16;     // wavefront speed, px per ms
    const DECAY = 3800;     // amplitude half-life scale, ms
    const WAVELENGTH = 150; // px
    const TRAIL = 420;      // how far behind the front the ripples persist, px

    function layout() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width; height = rect.height;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const step = width < 640 ? 16 : 18;
      points = [];
      for (let y = step / 2; y < height; y += step) for (let x = step / 2; x < width; x += step) points.push(x, y);
    }

    function addShock(x, y, t, amp = 1) {
      shocks.push({ x, y, t, amp });
      if (shocks.length > 5) shocks.shift();
    }

    function draw(t) {
      ctx.clearRect(0, 0, width, height);
      // Wavefront rings: the shock itself, then two fading ripples behind it.
      for (const s of shocks) {
        const age = t - s.t;
        if (age < 0) continue;
        const fade = s.amp * Math.exp(-age / DECAY);
        if (fade < 0.02) continue;
        for (let k = 0; k < 3; k++) {
          const r = age * SPEED - k * WAVELENGTH;
          if (r <= 0) continue;
          ctx.beginPath();
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = k === 0 ? `rgba(255,181,71,${0.5 * fade})` : `rgba(143,211,255,${(0.22 / k) * fade})`;
          ctx.lineWidth = k === 0 ? 1.4 : 1;
          ctx.stroke();
        }
      }
      // Sensors displaced by the passing waves: amber at the crests, ice blue at rest.
      for (let i = 0; i < points.length; i += 2) {
        const px = points[i], py = points[i + 1];
        let d = 0;
        for (const s of shocks) {
          const age = t - s.t;
          if (age < 0) continue;
          const front = age * SPEED;
          const r = Math.hypot(px - s.x, py - s.y);
          if (r > front || front - r > TRAIL * 2) continue;
          const phase = ((front - r) / WAVELENGTH) * Math.PI * 2;
          d += s.amp * Math.exp(-age / DECAY) * Math.cos(phase) * Math.exp(-(front - r) / TRAIL);
        }
        const a = Math.min(1, Math.abs(d));
        if (a > 0.05) {
          const rr = Math.round(143 + 112 * a), gg = Math.round(211 - 30 * a), bb = Math.round(255 - 184 * a);
          const size = 1.3 + 2.2 * a;
          ctx.fillStyle = `rgba(${rr},${gg},${bb},${0.25 + 0.7 * a})`;
          ctx.fillRect(px - size / 2, py - d * 4 - size / 2, size, size);
        } else {
          ctx.fillStyle = "rgba(143,211,255,0.17)";
          ctx.fillRect(px - 0.65, py - 0.65, 1.3, 1.3);
        }
      }
    }

    function loop(t) {
      if (!running) return;
      if (t > nextAuto) {
        // Land in the open area to the right of the name and above the project panel.
        const wide = width > 960;
        const x = width * (wide ? 0.52 + Math.random() * 0.4 : 0.3 + Math.random() * 0.6);
        const y = height * (wide ? 0.1 + Math.random() * 0.3 : 0.06 + Math.random() * 0.35);
        addShock(x, y, t, 0.9 + Math.random() * 0.3);
        nextAuto = t + 4200 + Math.random() * 2200;
      }
      draw(t);
      frame = requestAnimationFrame(loop);
    }

    function start() { if (running || reduceMotion) return; running = true; frame = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(frame); }
    const still = () => { shocks.length = 0; addShock(width * 0.7, height * 0.24, 0, 1.1); draw(1500); };

    layout();
    // The hero's height settles once web fonts load; follow the canvas's real box.
    new ResizeObserver(() => { layout(); if (reduceMotion) still(); }).observe(canvas);
    if (reduceMotion) {
      still(); // one still frame: a single shock caught mid-propagation
    } else {
      nextAuto = performance.now();
      start();
      const hero = canvas.closest(".hero");
      hero.addEventListener("pointerdown", (e) => {
        if (e.target.closest("a, button, .signal-log")) return;
        const rect = canvas.getBoundingClientRect();
        addShock(e.clientX - rect.left, e.clientY - rect.top, performance.now(), 1.2);
      });
      new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    }
  }

  /* ------------------------------------------------------------- mobile menu */
  const menuButton = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-site-nav]");
  if (menuButton && nav) {
    const close = () => { nav.classList.remove("open"); menuButton.setAttribute("aria-expanded", "false"); };
    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  /* --------------------------------------------------- active nav section */
  const links = new Map();
  document.querySelectorAll("[data-section]").forEach((a) => links.set(a.dataset.section, a));
  if (links.size && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = links.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((l) => l.removeAttribute("aria-current"));
          link.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
  }

  /* ------------------------------------------------------------ copy email */
  const status = document.querySelector("[data-copy-status]");
  let statusTimer;
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", async () => {
      const email = button.dataset.copyEmail;
      let message = "Email copied";
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        message = email;
      }
      if (status) {
        status.textContent = message;
        status.classList.add("show");
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => status.classList.remove("show"), 2200);
      }
    });
  });
})();
