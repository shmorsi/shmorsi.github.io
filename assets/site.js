/* Starfield, scroll progress, reveals, menu, copy. The page is complete without it. */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.querySelector("[data-stars]");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, stars = [], raf = 0, running = false, scrollBoost = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 1.4 + 0.2,
        r: Math.random() * 1.2 + 0.2
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const speed = reduce ? 0 : 0.15 + scrollBoost;
      for (const s of stars) {
        s.y += speed * s.z * 8;
        if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
        const alpha = 0.25 + s.z * 0.45;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        const len = reduce ? s.r : s.r + scrollBoost * s.z * 14;
        ctx.fillRect(s.x, s.y, s.r, len);
      }
      scrollBoost *= 0.92;
    };
    const loop = () => { if (!running) return; draw(); raf = requestAnimationFrame(loop); };
    resize();
    if (reduce) draw();
    else {
      running = true; loop();
      let last = window.scrollY;
      window.addEventListener("scroll", () => {
        const next = window.scrollY;
        scrollBoost = Math.min(6, scrollBoost + Math.min(4, Math.abs(next - last) / 40));
        last = next;
      }, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) { running = false; cancelAnimationFrame(raf); }
        else if (!running) { running = true; loop(); }
      });
    }
    window.addEventListener("resize", () => { resize(); if (reduce) draw(); });
  }

  const bar = document.querySelector("[data-scroll-progress]");
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    if (bar) bar.style.transform = `scaleX(${ratio})`;
  };
  onScroll();
  document.addEventListener("scroll", onScroll, { passive: true });

  const reveal = document.querySelectorAll("[data-reveal]");
  if (reduce || !("IntersectionObserver" in window)) {
    reveal.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.18 });
    reveal.forEach((el) => io.observe(el));
  }

  const tech = document.querySelectorAll(".tech li");
  if (tech.length && !reduce && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        tech.forEach((li, i) => setTimeout(() => li.classList.add("on"), i * 70));
        io.disconnect();
      });
    }, { threshold: 0.3 });
    io.observe(tech[0].parentElement);
  }

  const links = new Map();
  document.querySelectorAll("[data-section]").forEach((a) => links.set(a.dataset.section, a));
  if (links.size && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = links.get(entry.target.id);
        if (!link || !entry.isIntersecting) return;
        links.forEach((l) => l.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

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

  const status = document.querySelector("[data-copy-status]");
  let timer;
  document.querySelectorAll("[data-copy-email]").forEach((button) => {
    button.addEventListener("click", async () => {
      const email = button.dataset.copyEmail;
      try { await navigator.clipboard.writeText(email); } catch { /* show the address anyway */ }
      if (!status) return;
      status.textContent = "Email copied";
      status.classList.add("show");
      clearTimeout(timer);
      timer = setTimeout(() => status.classList.remove("show"), 1800);
    });
  });
})();
