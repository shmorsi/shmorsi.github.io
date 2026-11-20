/* The home page's motion. Everything it moves is already on the page: without this file, or when the
   reader prefers reduced motion, the page shows its final frame. */
(() => {
  "use strict";
  const doc = document.documentElement;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) doc.classList.add("still");
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------------------------------------------------------- theme */
  const toggle = $("[data-theme-toggle]");
  const dark = () => doc.dataset.theme ? doc.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  toggle && toggle.addEventListener("click", () => {
    const next = dark() ? "light" : "dark";
    doc.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) { /* private window: the choice lasts this visit */ }
  });

  /* ---------------------------------------------------------- the name, letter by letter */
  const h1 = $("[data-split]");
  if (h1) {
    const text = h1.textContent.trim();
    h1.setAttribute("aria-label", text);
    let i = 0;
    h1.innerHTML = text.split(" ").map((word) =>
      `<span class="w" aria-hidden="true">${[...word].map((c) => `<span class="ch" style="--i:${i++}">${c}</span>`).join("")}</span>`
    ).join(" ");
  }
  const start = () => requestAnimationFrame(() => doc.classList.add("is-loaded"));
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]) : Promise.resolve()).then(start);

  /* ---------------------------------------------------------- the rosette: a guilloche, engraved live */
  const canvas = $("[data-rosette]");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, visible = true, born = performance.now();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const size = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (still) draw(0, 1);
    };
    const RINGS = 30, STEPS = 420;
    function draw(t, intro) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const color = getComputedStyle(canvas).color;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 * 0.96;
      const ph = t * 0.00016 + pointer.x * 0.9, amp = 1 + pointer.y * 0.6;
      ctx.strokeStyle = color; ctx.lineWidth = 0.75; ctx.lineJoin = "round";
      // the wave rings: two waves beating against each other, as on a banknote's border
      for (let k = 0; k < RINGS; k++) {
        const share = clamp(intro * (RINGS + 6) / 6 - k / 6);
        if (share <= 0) continue;
        const base = R * (0.3 + 0.7 * k / RINGS);
        const a = 0.028 * amp * (0.6 + 0.4 * Math.sin(k * 0.45 + ph * 2));
        ctx.globalAlpha = 0.18 + 0.42 * (k / RINGS);
        ctx.beginPath();
        const end = Math.ceil(STEPS * ease(share));
        for (let s = 0; s <= end; s++) {
          const th = (s / STEPS) * Math.PI * 2;
          const r = base * (1 + a * Math.sin(18 * th + ph + k * 0.21) + 0.018 * Math.sin(7 * th - ph * 1.3 - k * 0.12));
          const x = cx + r * Math.cos(th), y = cy + r * Math.sin(th);
          s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      // the centre: a hypotrochoid whose pen breathes
      const share = clamp((intro - 0.15) / 0.85);
      if (share > 0) {
        const Rr = 1, rr = 7 / 24, d = 0.62 + 0.12 * Math.sin(t * 0.0004) + pointer.x * 0.05;
        const scale = R * 0.29 / (Rr - rr + d);
        const turns = 7, N = 2600, end = Math.ceil(N * ease(share));
        ctx.globalAlpha = 0.75; ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let s = 0; s <= end; s++) {
          const th = (s / N) * Math.PI * 2 * turns + t * 0.00005;
          const x = cx + scale * ((Rr - rr) * Math.cos(th) + d * Math.cos(((Rr - rr) / rr) * th));
          const y = cy + scale * ((Rr - rr) * Math.sin(th) - d * Math.sin(((Rr - rr) / rr) * th));
          s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    const frame = (now) => {
      if (!visible || document.hidden) { raf = 0; return; }
      pointer.x += (pointer.tx - pointer.x) * 0.04; pointer.y += (pointer.ty - pointer.y) * 0.04;
      draw(now, clamp((now - born) / 2600));
      raf = requestAnimationFrame(frame);
    };
    let raf = 0;
    const run = () => { if (!still && !raf) raf = requestAnimationFrame(frame); };
    new ResizeObserver(size).observe(canvas);
    size();
    if (!still) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; run(); }).observe(canvas);
      document.addEventListener("visibilitychange", run);
      window.addEventListener("pointermove", (ev) => {
        pointer.tx = (ev.clientX / window.innerWidth - 0.5) * 2;
        pointer.ty = (ev.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
      run();
    }
    // a matching redraw when the theme changes (the ink colour comes from CSS)
    new MutationObserver(() => still && draw(0, 1)).observe(doc, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ---------------------------------------------------------- numbers that count up */
  const NUM = /[−-]?\d[\d,]*(?:\.\d+)?/;
  function countUp(el, dur = 1400) {
    const final = el.textContent;
    const m = final.match(NUM);
    if (!m || still) return;
    const raw = m[0], neg = /^[−-]/.test(raw), body = raw.replace(/^[−-]/, "");
    const dec = (body.split(".")[1] || "").length, comma = body.includes(","), target = parseFloat(body.replace(/,/g, ""));
    const fmt = (v) => {
      let s = v.toFixed(dec);
      if (comma) s = Number(s).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return final.replace(raw, (neg ? "−" : "") + s);
    };
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / dur);
      el.textContent = p < 1 ? fmt(target * ease(p)) : final;
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = fmt(0);
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------- reveal on scroll */
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add("is-in");
      $$(".work-fig .fig", el).forEach((f) => countUp(f));
      reveal.unobserve(el);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
  $$("[data-reveal]").forEach((el) => {
    const sibs = $$(":scope > [data-reveal]", el.parentElement);
    const i = sibs.indexOf(el);
    if (i > 0 && el.parentElement.matches(".rules, .timeline")) el.style.setProperty("--d", `${(i % 2) * 0.12}s`);
    still ? el.classList.add("is-in") : reveal.observe(el);
  });

  /* ---------------------------------------------------------- the work: open a row */
  $$(".work-more").forEach((btn) => btn.addEventListener("click", () => {
    const row = btn.closest(".work-row"), open = !row.classList.contains("is-open");
    row.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.querySelector("span").textContent = open ? "Less" : "More";
  }));

  /* ---------------------------------------------------------- the ride: one dollar from 1960, drawn by the scroll */
  const ride = $("[data-ride]");
  let rideTick = () => {};
  // A screen too short to hold the chart and its words (a phone on its side) gets the plain layout: the whole chart, nothing pinned.
  const plain = window.matchMedia("(max-height: 600px) and (orientation: landscape), (max-height: 580px)");
  if (plain.matches) doc.classList.add("ride-plain");
  if (ride && !still && !plain.matches) {
    const data = JSON.parse($("[data-ride-series]", ride).textContent);
    const keys = ["market", "momentum", "deep"];
    const n = data.series.market.length - 1;
    const clip = $("[data-ride-clip]", ride);
    const year = $("[data-ride-year]", ride);
    const heads = Object.fromEntries(keys.map((k) => [k, $(`.head-${k}`, ride)]));
    const vals = Object.fromEntries(keys.map((k) => { const el = $(`[data-count="${k}"] [data-bind]`, ride); return [k, { el, final: el.textContent }]; }));
    const steps = $$(".ride-step", ride), storms = $$(".storm", ride);
    const y0 = parseInt(data.start.slice(0, 4), 10), m0 = parseInt(data.start.slice(5, 7), 10) - 1;
    const Y = (v) => data.h - (v / 10000 - data.lo) / (data.hi - data.lo) * data.h;
    const money = (v) => v >= 10 ? `$${Math.round(v).toLocaleString("en-US")}` : `$${v.toFixed(2)}`;
    let shown = 0, target = 0, live = false;
    const paint = () => {
      shown += (target - shown) * 0.14;
      if (Math.abs(target - shown) < 0.02) shown = target;
      const f = shown, i = Math.min(n, Math.floor(f)), j = Math.min(n, i + 1), frac = f - i;
      clip.setAttribute("width", String((f / n) * data.w));
      keys.forEach((k) => {
        const s = data.series[k], v = s[i] + (s[j] - s[i]) * frac;
        heads[k].setAttribute("cx", String((f / n) * data.w));
        heads[k].setAttribute("cy", String(Y(v)));
        vals[k].el.textContent = f >= n - 0.01 ? vals[k].final : money(Math.pow(10, v / 10000));
      });
      const month = Math.max(0, i - 1) + m0;
      year.textContent = String(y0 + Math.floor(month / 12));
      const p = f / n;
      steps.forEach((s) => s.classList.toggle("is-on", Number(s.dataset.step) === (p < 0.12 ? 0 : p < 0.86 ? 1 : 2)));
      storms.forEach((s) => s.classList.toggle("is-on", p >= Number(s.dataset.at)));
      ride.classList.toggle("is-done", p > 0.985);
      if (shown !== target) requestAnimationFrame(paint); else live = false;
    };
    rideTick = () => {
      const r = ride.getBoundingClientRect();
      const span = ride.offsetHeight - window.innerHeight;
      const p = clamp((-r.top + window.innerHeight * 0.05) / (span * 0.88));
      target = p * n;
      if (!live) { live = true; requestAnimationFrame(paint); }
    };
    rideTick();
  }

  /* ---------------------------------------------------------- header, progress, timeline, giant name */
  const top = $(".top"), bar = $("[data-progress]"), timeline = $("[data-timeline]");
  const giant = $(".giant");
  const links = $$(".top-nav a");
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY, max = doc.scrollHeight - window.innerHeight;
    top.classList.toggle("is-scrolled", y > 8);
    top.classList.toggle("is-hidden", !still && y > lastY + 4 && y > 400 && !(ride && ride.getBoundingClientRect().top < 0 && ride.getBoundingClientRect().bottom > window.innerHeight));
    if (y < lastY - 4) top.classList.remove("is-hidden");
    lastY = y;
    bar && bar.style.setProperty("--p", String(max > 0 ? y / max : 0));
    let here = null;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) here = links[i]; });
    links.forEach((a) => a.classList.toggle("is-here", a === here));
    if (timeline && !still) {
      const r = timeline.getBoundingClientRect();
      timeline.style.setProperty("--t", String(clamp((window.innerHeight * 0.7 - r.top) / r.height)));
    }
    if (canvas && !still) {
      const p = clamp(y / window.innerHeight);
      canvas.style.transform = `translateY(calc(-54% + ${p * 18}vh)) rotate(${p * 40}deg) scale(${1 - p * 0.12})`;
    }
    rideTick();
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
  if (giant && !still) {
    const contact = giant.closest(".contact");
    contact.addEventListener("pointermove", (ev) => {
      const r = giant.getBoundingClientRect();
      giant.style.setProperty("--gx", `${((ev.clientX - r.left) / r.width) * 100}%`);
      giant.style.setProperty("--gy", `${((ev.clientY - r.top) / r.height) * 100}%`);
    });
  }

  /* ---------------------------------------------------------- copy the email */
  const toast = $("[data-toast]");
  let toastTimer = 0;
  const say = (msg) => {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2200);
  };
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); say("Email copied"); }
    catch (e) { say(`Copy failed. The address is ${b.dataset.copy}`); }
  }));
  $$("[data-top]").forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault(); window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" }); }));
})();
