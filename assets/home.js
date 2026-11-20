/* The home page's motion: one dotted Earth behind everything, flying to each section's place as the
   reader scrolls, plus counters, countdowns and arrivals. Everything it moves is already on the page.
   Without this file the page reads in full; under prefers-reduced-motion the Earth holds still. */
(() => {
  "use strict";
  const doc = document.documentElement;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = Math.PI / 180;

  /* ---------------------------------------------------------- the name, letter by letter */
  const h1 = $("[data-split]");
  if (h1) {
    const text = h1.textContent.trim();
    h1.setAttribute("aria-label", text);
    let i = 0;
    h1.innerHTML = text.split(" ").map((word) =>
      `<span class="w" aria-hidden="true">${[...word].map((c) => `<span class="ch" style="--i:${i++}">${c}</span>`).join("")}</span>`).join("");
  }
  const loaded = () => requestAnimationFrame(() => doc.classList.add("is-loaded"));
  (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]) : Promise.resolve()).then(loaded);

  /* ---------------------------------------------------------- where the Earth goes for each section
     lon, lat: the point that faces the reader. x, y: the centre, as shares of the screen. r: the radius, as a
     share of the screen's shorter side. horizon: the centre sits below the screen and only the curve of the
     Earth shows. fx: what is drawn over it. spin: degrees a second it keeps turning on its own. */
  const MTL = [45.5, -73.57], CAIRO = [30.04, 31.24];
  const PLACES = {
    fed: [38.9, -77.04, "Federal Reserve"], boc: [45.42, -75.7, "Bank of Canada"], opec: [48.21, 16.37, "OPEC, Vienna"],
  };
  const wide = () => window.innerWidth > 1000;
  const SCENES = {
    horizon:   { lon: -73.6, lat: -22, x: 0.5, y: 0, r: 0, horizon: 1, fx: { home: 1 }, spin: 0 },
    rise:      { lon: -40, lat: 18, x: 0.72, y: 0.5, r: 0.4, fx: {}, spin: 4 },
    dpc:       { lon: -97, lat: 36, x: 0.7, y: 0.5, r: 0.44, fx: { dpc: 1 }, spin: 0 },
    pension:   { lon: -30, lat: 22, x: 0.72, y: 0.5, r: 0.3, fx: { futures: 1 }, spin: 2 },
    wsl:       { lon: -38, lat: 40, x: 0.7, y: 0.5, r: 0.46, fx: { rings: 1 }, spin: 0 },
    tsfm:      { lon: 25, lat: 12, x: 0.7, y: 0.5, r: 0.42, fx: { scan: 1 }, spin: 0 },
    aurvane:   { lon: 95, lat: 22, x: 0.7, y: 0.5, r: 0.36, fx: { shield: 1 }, spin: 3 },
    epicentre: { lon: -73.6, lat: 45.5, x: 0.7, y: 0.5, r: 0.56, fx: { ripple: 1 }, spin: 0 },
    drift:     { lon: 0, lat: 20, x: 0.82, y: 0.55, r: 0.32, fx: {}, spin: 5, dim: 0.45 },
    log:       { lon: -22, lat: 34, x: 0.8, y: 0.5, r: 0.34, fx: { arcs: 1 }, spin: 0, dim: 0.5 },
    home:      { lon: -73.6, lat: -22, x: 0.5, y: 0, r: 0, horizon: 1, fx: { home: 1 }, spin: 0 },
  };

  /* ---------------------------------------------------------- the Earth */
  const canvas = $("[data-globe]");
  const earth = { ready: false, dots: null, n: 0 };
  const view = { lon: -73.6, lat: -12, cx: 0, cy: 0, R: 0, dim: 1, fx: {}, spin: 0 };
  const want = { lon: -73.6, lat: -12, cx: 0, cy: 0, R: 0, dim: 1, fx: {} };
  let W = 0, H = 0, dpr = 1, gl = null, fxc = null, g = null, prog = null, back = null, buf = null, spinLon = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function place(s) {
    const m = Math.min(W, H);
    if (s.horizon) {
      const R = Math.max(W, H) * (wide() ? 0.95 : 1.5);
      return { cx: W * (wide() ? 0.62 : 0.5), cy: H * (wide() ? 0.64 : 0.9) + R, R };
    }
    if (!wide()) return { cx: W * 0.5, cy: H * 0.3, R: m * s.r * 1.25 };
    return { cx: W * s.x, cy: H * s.y, R: m * s.r * 1.18 };
  }

  /* rotation that brings (lat0, lon0) to the front, as rows of a 3x3 matrix */
  function rotation(lat0, lon0) {
    const t = -lon0 * rad, p = lat0 * rad;
    const ct = Math.cos(t), st = Math.sin(t), cp = Math.cos(p), sp = Math.sin(p);
    // Ry(t) then Rx(p): x' = x ct + z st ; z1 = -x st + z ct ; y' = y cp - z1 sp ; z' = y sp + z1 cp
    return [[ct, 0, st], [st * sp, cp, -ct * sp], [-st * cp, sp, ct * cp]];
  }
  const unit = (lat, lon) => { const c = Math.cos(lat * rad); return [c * Math.sin(lon * rad), Math.sin(lat * rad), c * Math.cos(lon * rad)]; };
  const apply = (M, p) => [M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2], M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2], M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2]];

  function initGL() {
    gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    if (!gl) return false;
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const link = (vs, fs) => {
      const p = gl.createProgram();
      gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    };
    prog = link(`
      attribute vec2 a; uniform mat3 M; uniform vec2 C; uniform float S; uniform vec2 V; uniform float P; uniform vec3 L;
      varying float vA;
      void main(){
        float cl=cos(a.x); vec3 q=M*vec3(cl*sin(a.y),sin(a.x),cl*cos(a.y));
        vec2 s=C+q.xy*S; gl_Position=vec4(s/V*2.-1.,0.,1.);
        float lit=.3+.7*max(dot(q,L),0.);
        vA=smoothstep(-.02,.16,q.z)*lit;
        gl_PointSize=P*(.6+.4*q.z);
      }`, `
      precision mediump float; varying float vA; uniform vec3 K; uniform float D;
      void main(){ float r=length(gl_PointCoord-.5); float a=smoothstep(.5,.15,r)*vA*D; if(a<.01) discard; gl_FragColor=vec4(K*a,a); }`);
    back = link(`attribute vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`, `
      precision mediump float; uniform vec2 C; uniform float S; uniform vec3 L; uniform float D;
      void main(){
        vec2 d=(gl_FragCoord.xy-C)/S; float r=length(d);
        vec3 glow=vec3(.33,.6,1.);
        if(r<1.){
          vec3 n=vec3(d,sqrt(1.-r*r));
          float lit=max(dot(n,L),0.);
          vec3 body=mix(vec3(.004,.008,.02),vec3(.03,.06,.13),lit);
          float rim=pow(1.-n.z,3.)*.9;
          gl_FragColor=vec4((body+glow*rim*.55)*D,1.);
        } else {
          float k=exp(-(r-1.)*14.)*.55+exp(-(r-1.)*4.)*.12;
          gl_FragColor=vec4(glow*k*D,k*D);
        }
      }`);
    if (!prog || !back) return false;
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, earth.dots, gl.STATIC_DRAW);
    back.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, back.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    for (const c of [canvas, fxc]) { if (!c) continue; c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // A light from the upper left, a little in front: the side facing the reader is day.
  const LIGHT = (() => { const v = [-0.55, 0.55, 0.62]; const n = Math.hypot(...v); return v.map((x) => x / n); })();

  function drawGL(M, dim) {
    const C = [view.cx * dpr, (H - view.cy) * dpr], S = view.R * dpr;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(back);
    gl.bindBuffer(gl.ARRAY_BUFFER, back.quad);
    const ab = gl.getAttribLocation(back, "a");
    gl.enableVertexAttribArray(ab); gl.vertexAttribPointer(ab, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(back, "C"), C[0], C[1]);
    gl.uniform1f(gl.getUniformLocation(back, "S"), S);
    gl.uniform3f(gl.getUniformLocation(back, "L"), LIGHT[0], LIGHT[1], LIGHT[2]);
    gl.uniform1f(gl.getUniformLocation(back, "D"), dim);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const a = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    // GLSL wants the matrix by columns
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, "M"), false, new Float32Array([M[0][0], M[1][0], M[2][0], M[0][1], M[1][1], M[2][1], M[0][2], M[1][2], M[2][2]]));
    gl.uniform2f(gl.getUniformLocation(prog, "C"), C[0], C[1]);
    gl.uniform1f(gl.getUniformLocation(prog, "S"), S);
    gl.uniform2f(gl.getUniformLocation(prog, "V"), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(prog, "P"), clamp(view.R / 190, 1.1, 3.4) * dpr);
    gl.uniform3f(gl.getUniformLocation(prog, "L"), LIGHT[0], LIGHT[1], LIGHT[2]);
    gl.uniform3f(gl.getUniformLocation(prog, "K"), 0.86, 0.92, 1.0);
    gl.uniform1f(gl.getUniformLocation(prog, "D"), dim);
    gl.drawArrays(gl.POINTS, 0, earth.n);
  }

  /* the same Earth on a 2D canvas, for a browser without WebGL */
  function draw2D(M, dim) {
    const sx = view.cx, sy = view.cy, S = view.R, d = earth.dots;
    const glow = g.createRadialGradient(sx, sy, S * 0.9, sx, sy, S * 1.25);
    glow.addColorStop(0, `rgba(84,153,255,${0.25 * dim})`); glow.addColorStop(1, "rgba(84,153,255,0)");
    g.fillStyle = glow; g.beginPath(); g.arc(sx, sy, S * 1.25, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#02050c"; g.beginPath(); g.arc(sx, sy, S, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(220,235,255,${0.85 * dim})`;
    const s = clamp(S / 260, 0.8, 2.2);
    for (let i = 0; i < earth.n; i += 1) {
      const la = d[i * 2], lo = d[i * 2 + 1], c = Math.cos(la);
      const p = [c * Math.sin(lo), Math.sin(la), c * Math.cos(lo)];
      const z = M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2];
      if (z < 0.05) continue;
      g.fillRect(sx + (M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2]) * S, sy - (M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2]) * S, s, s);
    }
  }

  /* ---------------------------------------------------------- what is drawn over the Earth */
  const stars = Array.from({ length: 240 }, (_, i) => {
    const h = (n) => { const s = Math.sin(n * 12.9898 + i * 78.233) * 43758.5453; return s - Math.floor(s); };
    return { x: h(1), y: h(2), r: 0.35 + h(3) * 1.1, a: 0.25 + h(4) * 0.6, tw: h(5) * 6.28 };
  });
  const futures = Array.from({ length: 34 }, (_, i) => {
    const h = (n) => { const s = Math.sin(n * 91.17 + i * 13.37) * 43758.5453; return s - Math.floor(s); };
    const inc = (h(1) - 0.5) * 2.4, node = h(2) * Math.PI * 2, rr = 1.12 + h(3) * 0.62;
    const u = [Math.cos(node), 0, Math.sin(node)], v0 = [-Math.sin(node) * Math.cos(inc), Math.sin(inc), Math.cos(node) * Math.cos(inc)];
    return { u, v: v0, rr, speed: 0.08 + h(4) * 0.22, phase: h(5) * 6.28 };
  });
  const shots = Array.from({ length: 30 }, (_, i) => {
    const h = (n) => { const s = Math.sin(n * 33.71 + i * 7.13) * 43758.5453; return s - Math.floor(s); };
    return { ang: h(1) * Math.PI * 2, start: h(2), land: false };
  });

  function project(M, p) {
    const q = apply(M, p);
    return { x: view.cx + q[0] * view.R, y: view.cy - q[1] * view.R, z: q[2] };
  }
  function circleOnSphere(M, lat, lon, theta, lift = 1) {
    const out = [], p1 = lat * rad, l1 = lon * rad;
    for (let k = 0; k <= 72; k += 1) {
      const b = (k / 72) * Math.PI * 2;
      const la = Math.asin(Math.sin(p1) * Math.cos(theta) + Math.cos(p1) * Math.sin(theta) * Math.cos(b));
      const lo = l1 + Math.atan2(Math.sin(b) * Math.sin(theta) * Math.cos(p1), Math.cos(theta) - Math.sin(p1) * Math.sin(la));
      const u = unit(la / rad, lo / rad);
      out.push(project(M, [u[0] * lift, u[1] * lift, u[2] * lift]));
    }
    return out;
  }
  function strokeFront(pts, minZ = 0) {
    g.beginPath();
    let on = false;
    for (const p of pts) {
      if (p.z > minZ) { on ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); on = true; } else on = false;
    }
    g.stroke();
  }
  function marker(M, lat, lon, label, w, t, side = 1) {
    const p = project(M, unit(lat, lon));
    if (p.z < 0.08 || w < 0.02) return;
    const a = w * clamp(p.z * 3);
    const pulse = (t * 0.6) % 1;
    g.strokeStyle = `rgba(142,197,255,${a * (1 - pulse)})`; g.lineWidth = 1;
    g.beginPath(); g.arc(p.x, p.y, 4 + pulse * 18, 0, Math.PI * 2); g.stroke();
    g.fillStyle = `rgba(142,197,255,${a})`;
    g.beginPath(); g.arc(p.x, p.y, 3.2, 0, Math.PI * 2); g.fill();
    if (label && W >= 640) {
      g.font = "500 11px Barlow, Arial, sans-serif";
      g.fillStyle = `rgba(244,245,247,${a})`;
      g.textAlign = side > 0 ? "left" : "right";
      g.fillText(label.toUpperCase().split("").join(String.fromCharCode(8202)), p.x + side * 14, p.y + 4);
    }
  }

  function drawFx(M, t, scrollY) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // stars, a little parallax with the scroll
    for (const s of stars) {
      const y = ((s.y * H - scrollY * 0.04 * s.r) % H + H) % H;
      const tw = still ? 1 : 0.65 + 0.35 * Math.sin(t * 1.3 + s.tw);
      g.fillStyle = `rgba(255,255,255,${s.a * tw * 0.75})`;
      g.fillRect(s.x * W, y, s.r, s.r);
    }
    const f = view.fx;
    if (!gl && earth.ready) draw2D(M, view.dim);
    // Montréal, home
    if (f.home > 0.02) marker(M, MTL[0], MTL[1], "Montréal", f.home, t);
    if (f.dpc > 0.02) marker(M, 39.5, -98.35, "30 US industries, 1960 to 2026", f.dpc, t);
    // World Shock Lab: rings leave the three announcers
    if (f.rings > 0.02) {
      for (const [lat, lon, name] of Object.values(PLACES)) {
        for (let k = 0; k < 3; k += 1) {
          const ph = still ? (k + 1) / 4 : ((t * 0.22 + k / 3) % 1);
          g.strokeStyle = `rgba(142,197,255,${f.rings * (1 - ph) * 0.8})`; g.lineWidth = 1.2;
          strokeFront(circleOnSphere(M, lat, lon, ph * 32 * rad));
        }
        marker(M, lat, lon, name, f.rings, t, name === "Bank of Canada" ? -1 : 1);
      }
    }
    // Pension Lab: simulated futures as futures
    if (f.futures > 0.02) {
      for (const o of futures) {
        const pts = [];
        for (let k = 0; k <= 96; k += 1) {
          const a = (k / 96) * Math.PI * 2;
          pts.push([o.rr * (Math.cos(a) * o.u[0] + Math.sin(a) * o.v[0]), o.rr * (Math.cos(a) * o.u[1] + Math.sin(a) * o.v[1]), o.rr * (Math.cos(a) * o.u[2] + Math.sin(a) * o.v[2])]);
        }
        const proj = pts.map((p) => { const x = view.cx + p[0] * view.R, y = view.cy - p[1] * view.R; const hidden = p[2] < 0 && Math.hypot(p[0], p[1]) < 1; return { x, y, z: hidden ? -1 : 1 }; });
        g.strokeStyle = `rgba(200,220,255,${0.13 * f.futures})`; g.lineWidth = 1;
        strokeFront(proj);
        const a = o.phase + (still ? 0 : t * o.speed);
        const p = [o.rr * (Math.cos(a) * o.u[0] + Math.sin(a) * o.v[0]), o.rr * (Math.cos(a) * o.u[1] + Math.sin(a) * o.v[1]), o.rr * (Math.cos(a) * o.u[2] + Math.sin(a) * o.v[2])];
        if (!(p[2] < 0 && Math.hypot(p[0], p[1]) < 1)) {
          g.fillStyle = `rgba(142,197,255,${0.9 * f.futures})`;
          g.beginPath(); g.arc(view.cx + p[0] * view.R, view.cy - p[1] * view.R, 2, 0, Math.PI * 2); g.fill();
        }
      }
    }
    // The forecasting model: a sweep across the Earth
    if (f.scan > 0.02) {
      const lon0 = still ? 20 : ((t * 24) % 360) - 180;
      for (let k = 0; k < 10; k += 1) {
        const pts = [];
        for (let j = -88; j <= 88; j += 4) pts.push(project(M, unit(j, lon0 - k * 2.2)));
        g.strokeStyle = `rgba(142,197,255,${f.scan * (1 - k / 10) * 0.75})`; g.lineWidth = k === 0 ? 2 : 1;
        strokeFront(pts);
      }
    }
    // Aurvane: a shell around the Earth, and thirty attempts that meet it
    if (f.shield > 0.02) {
      const lift = 1.14;
      g.strokeStyle = `rgba(142,197,255,${0.22 * f.shield})`; g.lineWidth = 1;
      for (let la = -60; la <= 60; la += 30) { const pts = []; for (let lo = -180; lo <= 180; lo += 5) { const u = unit(la, lo); pts.push(project(M, u.map((x) => x * lift))); } strokeFront(pts); }
      for (let lo = -180; lo < 180; lo += 30) { const pts = []; for (let la = -90; la <= 90; la += 5) { const u = unit(la, lo); pts.push(project(M, u.map((x) => x * lift))); } strokeFront(pts); }
      g.strokeStyle = `rgba(142,197,255,${0.5 * f.shield})`; g.beginPath(); g.arc(view.cx, view.cy, view.R * lift, 0, Math.PI * 2); g.stroke();
      const hits = Number(canvas.dataset.landed || 7);
      shots.forEach((s, i) => {
        const ph = still ? 0.6 : ((t * 0.16 + s.start) % 1);
        const passes = i < hits;
        const dist = lerp(2.2, passes ? 1.0 : lift, smooth(clamp(ph / 0.7)));
        const x = view.cx + Math.cos(s.ang) * dist * view.R, y = view.cy + Math.sin(s.ang) * dist * view.R;
        const arrived = ph > 0.7;
        const a = f.shield * (arrived ? 1 - (ph - 0.7) / 0.3 : clamp(ph * 4));
        g.fillStyle = passes ? `rgba(255,140,120,${a})` : `rgba(244,245,247,${a})`;
        g.beginPath(); g.arc(x, y, arrived && !passes ? 2 + (ph - 0.7) * 20 : 2, 0, Math.PI * 2);
        if (arrived && !passes) { g.strokeStyle = `rgba(142,197,255,${a})`; g.stroke(); } else g.fill();
      });
    }
    // ÉPICENTRE: the shock that spreads from one place
    if (f.ripple > 0.02) {
      for (let k = 0; k < 5; k += 1) {
        const ph = still ? (k + 1) / 6 : ((t * 0.3 + k / 5) % 1);
        g.strokeStyle = `rgba(142,197,255,${f.ripple * (1 - ph) * 0.9})`; g.lineWidth = 1.3;
        strokeFront(circleOnSphere(M, MTL[0], MTL[1], ph * 26 * rad));
      }
      marker(M, MTL[0], MTL[1], "Montréal", f.ripple, t);
    }
    // the flight log: Montréal to Cairo and back
    if (f.arcs > 0.02) {
      const a = unit(...MTL), b = unit(...CAIRO);
      const omega = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
      const pts = [];
      for (let k = 0; k <= 80; k += 1) {
        const s = k / 80, w1 = Math.sin((1 - s) * omega) / Math.sin(omega), w2 = Math.sin(s * omega) / Math.sin(omega);
        const h = 1 + 0.22 * Math.sin(Math.PI * s);
        pts.push(project(M, [(w1 * a[0] + w2 * b[0]) * h, (w1 * a[1] + w2 * b[1]) * h, (w1 * a[2] + w2 * b[2]) * h]));
      }
      g.strokeStyle = `rgba(142,197,255,${0.75 * f.arcs})`; g.lineWidth = 1.4; strokeFront(pts, -0.2);
      const at = still ? 40 : Math.floor(((t * 0.25) % 1) * 80);
      const p = pts[at];
      if (p.z > -0.2) { g.fillStyle = `rgba(244,245,247,${f.arcs})`; g.beginPath(); g.arc(p.x, p.y, 3, 0, Math.PI * 2); g.fill(); }
      marker(M, MTL[0], MTL[1], "Montréal", f.arcs, t, -1);
      marker(M, CAIRO[0], CAIRO[1], "Cairo", f.arcs, t);
    }
  }

  /* ---------------------------------------------------------- the scroll decides the scene */
  const scenes = $$("[data-scene]").map((el) => ({ el, name: el.dataset.scene, mid: 0 }));
  const measure = () => scenes.forEach((s) => { const r = s.el.getBoundingClientRect(); s.mid = r.top + window.scrollY + Math.min(r.height, H) / 2; });
  function target() {
    const y = window.scrollY + H / 2;
    let i = 0;
    while (i < scenes.length - 1 && scenes[i + 1].mid <= y) i += 1;
    const a = scenes[i], b = scenes[Math.min(i + 1, scenes.length - 1)];
    let t = a === b ? 0 : clamp((y - a.mid) / (b.mid - a.mid));
    t = smooth(clamp((t - 0.25) / 0.5));  // hold each scene, then move
    const A = SCENES[a.name] || SCENES.rise, B = SCENES[b.name] || SCENES.rise;
    const pa = place(A), pb = place(B);
    let dl = ((B.lon - A.lon + 540) % 360) - 180;
    want.lon = A.lon + dl * t; want.lat = lerp(A.lat, B.lat, t);
    want.cx = lerp(pa.cx, pb.cx, t); want.cy = lerp(pa.cy, pb.cy, t); want.R = lerp(pa.R, pb.R, t);
    want.dim = lerp(A.dim || 1, B.dim || 1, t) * (wide() || A.horizon || B.horizon ? 1 : 0.62);
    want.spin = lerp(A.spin, B.spin, t);
    const fx = {};
    for (const k of new Set([...Object.keys(A.fx), ...Object.keys(B.fx)])) fx[k] = (A.fx[k] || 0) * (1 - t) + (B.fx[k] || 0) * t;
    want.fx = fx;
  }

  let last = performance.now(), first = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    target();
    const k = first || still ? 1 : 1 - Math.exp(-dt * 3.2);
    first = false;
    if (!still) spinLon = (spinLon + (want.spin || 0) * dt) % 360;
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    const lonT = want.lon - spinLon + pointer.x * 6, latT = want.lat - pointer.y * 4;
    view.lon += ((((lonT - view.lon) + 540) % 360) - 180) * k;
    view.lat += (latT - view.lat) * k;
    for (const key of ["cx", "cy", "R", "dim"]) view[key] += (want[key] - view[key]) * k;
    const fx = {};
    for (const key of new Set([...Object.keys(view.fx), ...Object.keys(want.fx)])) fx[key] = lerp(view.fx[key] || 0, want.fx[key] || 0, k);
    view.fx = fx;
    const M = rotation(view.lat, view.lon);
    if (gl && earth.ready) drawGL(M, view.dim);
    if (g) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fxc.width, fxc.height); drawFx(M, now / 1000, window.scrollY); }
    if (!still && !document.hidden) requestAnimationFrame(frame);
  }
  const redraw = () => requestAnimationFrame((now) => { last = now; frame(now); });

  if (canvas) {
    fxc = document.createElement("canvas");
    fxc.className = "globe";
    fxc.setAttribute("aria-hidden", "true");
    canvas.after(fxc);
    g = fxc.getContext("2d");
    const aur = $("#p-aurvane .m-fig");
    const m = aur && aur.textContent.match(/(\d+)\s+of\s+(\d+)/);
    if (m) canvas.dataset.landed = m[1];  // the attacks that landed with Aurvane, from the page's own figure
    size();
    fetch("assets/earth.bin")
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const view16 = new DataView(buf), n = buf.byteLength / 4;
        earth.dots = new Float32Array(n * 2);
        for (let i = 0; i < n; i += 1) {
          earth.dots[i * 2] = (view16.getInt16(i * 4, true) / 100) * rad;
          earth.dots[i * 2 + 1] = (view16.getInt16(i * 4 + 2, true) / 100) * rad;
        }
        earth.n = n;
        if (!initGL()) { gl = null; canvas.style.display = "none"; }
        earth.ready = true;
        measure();
        redraw();
      })
      .catch(() => { /* no Earth: the page still reads in full */ });
    window.addEventListener("resize", () => { size(); measure(); if (still) redraw(); });
    window.addEventListener("load", measure);
    if (still) window.addEventListener("scroll", redraw, { passive: true });
    else {
      document.addEventListener("visibilitychange", () => { if (!document.hidden) redraw(); });
      window.addEventListener("pointermove", (ev) => { pointer.tx = ev.clientX / W - 0.5; pointer.ty = ev.clientY / H - 0.5; }, { passive: true });
    }
    measure();
    redraw();
  }

  /* ---------------------------------------------------------- numbers that count up */
  const NUM = /[−-]?\d[\d,]*(?:\.\d+)?/;
  function countUp(el, dur = 1600) {
    const final = el.textContent;
    const m = final.match(NUM);
    if (!m || still) return;
    const raw = m[0], neg = /^[−-]/.test(raw), body = raw.replace(/^[−-]/, "");
    const dec = (body.split(".")[1] || "").length, comma = body.includes(","), goal = parseFloat(body.replace(/,/g, ""));
    const fmt = (v) => {
      let s = v.toFixed(dec);
      if (comma) s = Number(s).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return final.replace(raw, (neg ? "−" : "") + s);
    };
    const t0 = performance.now();
    const step = (now) => { const p = clamp((now - t0) / dur); el.textContent = p < 1 ? fmt(goal * ease(p)) : final; if (p < 1) requestAnimationFrame(step); };
    el.textContent = fmt(0);
    requestAnimationFrame(step);
  }

  /* ---------------------------------------------------------- arrivals */
  const reveal = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    el.classList.add("is-in");
    $$(".count, .m-fig, .m-facts dd", el).forEach((f) => countUp(f));
    if (el.matches(".count")) countUp(el);
    reveal.unobserve(el);
  }), { rootMargin: "0px 0px -10% 0px", threshold: 0.15 });
  $$("[data-reveal], .telemetry").forEach((el, i) => {
    const sibs = el.parentElement ? $$(":scope > [data-reveal]", el.parentElement) : [];
    const k = sibs.indexOf(el);
    if (k > 0 && !el.matches(".m-copy")) el.style.setProperty("--d", `${Math.min(k, 5) * 0.09}s`);
    still ? el.classList.add("is-in") : reveal.observe(el);
  });

  /* ---------------------------------------------------------- countdowns */
  const cds = $$("[data-countdown]");
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    const now = Date.now();
    cds.forEach((el) => {
      const out = el.matches("[data-cd-time]") ? el : ($("[data-cd-time]", el) || el);
      const left = Date.parse(el.dataset.countdown) - now;
      if (!(left > 0)) return;
      const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
      out.innerHTML = `<b>${d}</b><small>d</small><b>${pad(h)}</b><small>h</small><b>${pad(m)}</b><small>m</small><b>${pad(s % 60)}</b><small>s</small>`;
      out.setAttribute("aria-label", `${d} days, ${h} hours and ${m} minutes`);
    });
  }
  if (cds.length) { tick(); setInterval(tick, 1000); }

  /* ---------------------------------------------------------- header */
  const top = $(".top");
  const links = $$(".top-nav a");
  const targets = links.map((a) => $(a.getAttribute("href")));
  let lastY = window.scrollY, ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    top.classList.toggle("is-scrolled", y > 10);
    if (!still && y > lastY + 6 && y > 500) top.classList.add("is-hidden");
    if (y < lastY - 6) top.classList.remove("is-hidden");
    lastY = y;
    let here = null;
    targets.forEach((s, i) => { if (s && s.getBoundingClientRect().top < H * 0.45) here = links[i]; });
    links.forEach((a) => a.classList.toggle("is-here", a === here));
  };
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------------------------------------------------------- copy the email, back to top */
  const toast = $("[data-toast]");
  let toastTimer = 0;
  const say = (msg) => { if (!toast) return; toast.textContent = msg; toast.classList.add("is-on"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2200); };
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); say("Email copied"); } catch (e) { say(`Copy failed. The address is ${b.dataset.copy}`); }
  }));
  $$("[data-top]").forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault(); window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" }); }));
})();
