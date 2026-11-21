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
  /* where Canada's pension funds and asset managers work: lat, lon, name, label side, label nudge */
  const HUBS = [[43.65, -79.38, "Toronto", -1, 14], [49.28, -123.12, "Vancouver", -1, 0],
    [51.05, -114.07, "Calgary", 1, 0], [44.65, -63.57, "Halifax", 1, 14]];
  const PLACES = {
    fed: [38.9, -77.04, "Federal Reserve"], boc: [45.42, -75.7, "Bank of Canada"], opec: [48.21, 16.37, "OPEC, Vienna"],
  };
  const wide = () => window.innerWidth > 1000;
  const tall = () => window.innerHeight > window.innerWidth * 0.8;
  const SCENES = {
    horizon:   { lon: -90, lat: 38, mlat: 12, x: 0.7, y: 0.54, r: 0.4, fx: { home: 1, open: 1 }, spin: 0, open: 1 },
    rise:      { lon: -40, lat: 18, x: 0.72, y: 0.5, r: 0.4, fx: {}, spin: 4 },
    dpc:       { lon: -97, lat: 36, x: 0.7, y: 0.5, r: 0.44, fx: { dpc: 1 }, spin: 0 },
    pension:   { lon: -30, lat: 22, x: 0.27, y: 0.5, r: 0.3, fx: { futures: 1 }, spin: 2, flip: 1 },
    wsl:       { lon: -38, lat: 40, x: 0.7, y: 0.5, r: 0.46, fx: { rings: 1 }, spin: 0 },
    tsfm:      { lon: 25, lat: 12, x: 0.27, y: 0.5, r: 0.4, fx: { scan: 1 }, spin: 0, flip: 1 },
    aurvane:   { lon: 95, lat: 22, x: 0.7, y: 0.5, r: 0.36, fx: { shield: 1 }, spin: 3 },
    epicentre: { lon: -73.6, lat: 45.5, x: 0.28, y: 0.5, r: 0.52, fx: { ripple: 1 }, spin: 0, flip: 1 },
    drift:     { lon: 0, lat: 20, x: 0.82, y: 0.55, r: 0.32, fx: {}, spin: 5, dim: 0.45 },
    log:       { lon: -22, lat: 34, x: 0.8, y: 0.5, r: 0.34, fx: { arcs: 1 }, spin: 0, dim: 0.5 },
    home:      { lon: -73.6, lat: -22, x: 0.5, y: 0, r: 0, horizon: 1, fx: { home: 1 }, spin: 0 },
  };

  /* ---------------------------------------------------------- the Earth */
  const canvas = $("[data-globe]");
  const earth = { ready: false, dots: null, n: 0 };
  /* Where the sun is, as seen by the reader: on the right for the missions (day on the right, city lights on
     the left, under the words); behind the Earth's edge for the opening and the close, a dawn along the curve. */
  const SUN = [0.86, 0.32, 0.1], SUN_L = [-0.86, 0.32, 0.1], DAWN = [0.42, 0.3, -0.86], NIGHT = [-0.9, 0.25, -0.35];
  /* the opening: the whole of North America in daylight, the evening reaching the east coast, its cities lit */
  const OPEN = [-0.88, 0.38, 0.0];
  const view = { lon: -73.6, lat: -12, cx: 0, cy: 0, R: 0, dim: 1, fx: {}, spin: 0, sun: SUN.slice() };
  const want = { lon: -73.6, lat: -12, cx: 0, cy: 0, R: 0, dim: 1, fx: {}, sun: SUN.slice() };
  let W = 0, H = 0, dpr = 1, gl = null, fxc = null, g = null, prog = null, back = null, buf = null, spinLon = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const drag = { on: false, lon: 0, lat: 0, vx: 0, vy: 0, x: 0, y: 0, t: 0, at: -1e9 };

  function place(s) {
    const m = Math.min(W, H);
    if (s.open && !wide()) {
      if (!tall()) return { cx: W * 0.74, cy: H * 0.55, R: H * 0.44 };  /* a small landscape window: the Earth beside the words */
      const R = Math.min(W * 0.62, H * 0.3);                              /* a phone: North America rises from the foot of the screen */
      return { cx: W * 0.5, cy: H - R * 0.15, R };
    }
    if (s.horizon) {
      const R = Math.max(W, H) * (wide() ? 0.95 : 1.5);
      return { cx: W * (wide() ? 0.62 : 0.5), cy: H * (wide() ? 0.64 : 0.7) + R, R };
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

  /* The Earth is drawn per pixel: a ray meets the sphere, the hit is turned back into a latitude and longitude,
     and the NASA pictures are read there. WebGL 2 where it exists (mipmaps, anisotropic filtering, and texture
     gradients that do not tear at the date line); WebGL 1 otherwise. */
  let gl2 = false;
  function initGL() {
    const opts = { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" };
    gl = canvas.getContext("webgl2", opts);
    gl2 = !!gl;
    if (!gl) gl = canvas.getContext("webgl", opts);
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
    const head = gl2 ? `#version 300 es
      precision highp float;
      out vec4 fragColor;
      #define TEX(s,uv) textureGrad(s,uv,gx,gy)
      #define OUT fragColor` : `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      #define TEX(s,uv) texture2D(s,uv)
      #define OUT gl_FragColor`;
    const vsBack = gl2 ? `#version 300 es
      in vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }` : `attribute vec2 a; void main(){ gl_Position=vec4(a,0.,1.); }`;
    back = link(vsBack, `${head}
      uniform vec2 C; uniform float S; uniform vec3 L; uniform float D; uniform mat3 M; uniform float T; uniform float U; uniform float B;
      uniform sampler2D tDay, tNight, tWater, tRelief;
      float hh(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
        return mix(mix(mix(hh(i),hh(i+vec3(1,0,0)),f.x),mix(hh(i+vec3(0,1,0)),hh(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hh(i+vec3(0,0,1)),hh(i+vec3(1,0,1)),f.x),mix(hh(i+vec3(0,1,1)),hh(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 p){ float v=0., a=.5; for(int i=0;i<4;i++){ v+=a*vn(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return v; }
      float fbm2(vec3 p){ return .5*vn(p)+.25*vn(p*2.03+vec3(1.7,9.2,3.1)); }
      const vec3 GLOW=vec3(.33,.6,1.);

      vec3 surfaceAt(vec2 d, float r){
        vec3 n=vec3(d,sqrt(max(0.,1.-r*r)));
        float ndl=dot(n,L);
        vec3 base=mix(vec3(.004,.008,.02),vec3(.03,.06,.13),max(ndl,0.));
        vec3 photo=base;
        if(T>0.){
          vec3 w=n*M;                                          /* back to the Earth's own frame */
          float lat=asin(clamp(w.y,-1.,1.)), lon=atan(w.x,w.z);
          vec2 uv=vec2(lon/6.2831853+.5,.5-lat/3.1415927);
          ${gl2 ? `vec2 gx=dFdx(uv), gy=dFdy(uv); gx.x-=floor(gx.x+.5); gy.x-=floor(gy.x+.5);  /* no tear at the date line */` : ""}
          vec3 cDay=TEX(tDay,uv).rgb, cNight=TEX(tNight,uv).rgb;
          float water=TEX(tWater,uv).r;
          float day=smoothstep(-.1,.25,ndl);
          /* relief: the land's height leans the light, on the day side only */
          float lit0=max(ndl,0.);
          if(B>0.){
            vec2 e=vec2(1./2048.,1./1024.);
            float h0=TEX(tRelief,uv).r, hx=TEX(tRelief,uv+vec2(e.x,0.)).r, hy=TEX(tRelief,uv-vec2(0.,e.y)).r;
            vec3 east=vec3(cos(lon),0.,-sin(lon)), north=vec3(-sin(lat)*sin(lon),cos(lat),-sin(lat)*cos(lon));
            vec3 nb=normalize(w-(hx-h0)*east*B-(hy-h0)*north*B);
            lit0=max(dot(M*nb,L),0.);
          }
          vec3 q=w*2.6+vec3(U*.012,0.,U*.004);
          float cl=fbm(q+fbm2(q*1.7)*.8);
          cl=smoothstep(.46,.76,cl)*(.6+.4*abs(w.y))*.92;
          float spec=pow(max(dot(n,normalize(L+vec3(0.,0.,1.))),0.),320.)*water*day*(1.-cl);
          vec3 lit=cDay*(.04+1.05*lit0)+vec3(1.,.92,.8)*spec*.2;
          /* city lights only: the red channel holds the lights, the picture's blue-green landscape stays faint */
          vec3 lights=(vec3(1.,.76,.48)*smoothstep(.05,.5,cNight.r)*1.9+cNight*.14)*(1.-day)*(1.-cl*.75);
          vec3 surface=lit*day+lights+cDay*.018;
          vec3 cloudCol=vec3(.92,.95,1.)*(.03+1.08*max(ndl,0.));
          surface=mix(surface,cloudCol,cl*day+cl*.12*(1.-day));
          float band=exp(-pow(ndl/.075,2.));
          surface+=vec3(1.,.45,.16)*band*.05*(1.-cl*.5);
          photo=mix(base,surface,T);
        }
        float rim=pow(1.-n.z,2.6);
        float dusk=exp(-pow(ndl/.18,2.));
        vec3 atmo=(GLOW*(.18+1.1*smoothstep(-.35,.55,ndl))+vec3(1.,.5,.2)*dusk*.5)*rim;
        return photo+atmo*.62;
      }
      vec4 skyAt(vec2 d, float r){
        vec2 u=normalize(d);
        float side=.25+.75*smoothstep(-.5,.7,dot(vec3(u,0.),L));
        float x=max(r-1.,0.);
        /* a thin bright line at the edge, then the blue that fades into space */
        float k=(exp(-x*70.)*.55+exp(-x*15.)*.45+exp(-x*4.)*.1)*side;
        vec3 c=mix(GLOW,vec3(.62,.8,1.),exp(-x*40.));
        return vec4(c*k,k);
      }
      void main(){
        vec2 d=(gl_FragCoord.xy-C)/S; float r=length(d);
        float px=1./S;                                         /* one pixel, in Earth radii */
        float inside=clamp((1.-r)/(1.6*px)+.5,0.,1.);          /* a soft, anti-aliased edge */
        vec4 c=vec4(0.);
        if(inside<1.) c=skyAt(d,r);
        if(inside>0.){ vec3 s=surfaceAt(d*min(1.,(1.-.5*px)/max(r,1e-4)),min(r,1.-.5*px)); c=mix(c,vec4(s,1.),inside); }
        OUT=c*D;
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
    loadTextures();
    return true;
  }

  /* NASA's Blue Marble (day), Black Marble (city lights), an ocean mask for the sun's glint and a relief map.
     They arrive after the page: until then, and if they never do, the Earth is its dots. A large screen then
     swaps in the 4096 pixel pictures. */
  const tex = { day: null, night: null, water: null, relief: null, mix: 0, ready: false, at: 0 };
  const aniso = () => gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
  function upload(img, unit) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (gl2) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const ext = aniso();
      if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    return t;
  }
  const loadImage = (src) => new Promise((ok, no) => { const img = new Image(); img.decoding = "async"; img.onload = () => ok(img); img.onerror = no; img.src = src; });
  function loadTextures() {
    const names = ["day", "night", "water", "relief"];
    Promise.all(names.map((n) => loadImage(`assets/earth/${n}.jpg`))).then((imgs) => {
      imgs.forEach((img, i) => { tex[names[i]] = upload(img, i); });
      tex.ready = true; tex.at = performance.now();
      if (still) { tex.mix = 1; redraw(); }
      const big = Math.max(window.screen.width, window.screen.height) * (window.devicePixelRatio || 1) >= 1800;
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      if (!coarse && big && max >= 4096) {
        Promise.all([loadImage("assets/earth/day-4k.jpg"), loadImage("assets/earth/night-4k.jpg")]).then(([d, n]) => {
          tex.day = upload(d, 0); tex.night = upload(n, 1);
          if (still) redraw();
        }).catch(() => { /* the 2048 pictures stay */ });
      }
    }).catch(() => { /* no pictures: the Earth stays its dots */ });
  }

  /* The Earth's resolution: up to 2x on a desktop, 1.5x on a phone, and lower again if the frames run slow. */
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  let quality = 1, gdpr = 1;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    gdpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2) * quality);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * gdpr); canvas.height = Math.round(H * gdpr);
    if (fxc) { fxc.width = Math.round(W * dpr); fxc.height = Math.round(H * dpr); }
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  const times = [];
  function pace(dt) {
    if (still || quality <= 0.5) return;
    times.push(dt);
    if (times.length < 90) return;
    const sorted = times.slice().sort((a, b) => a - b), median = sorted[45];
    times.length = 0;
    if (median > 0.024) { quality = Math.max(0.5, quality * 0.75); size(); }
  }


  function drawGL(M, dim) {
    const C = [view.cx * gdpr, (H - view.cy) * gdpr], S = view.R * gdpr;
    const cols = new Float32Array([M[0][0], M[1][0], M[2][0], M[0][1], M[1][1], M[2][1], M[0][2], M[1][2], M[2][2]]);
    const sl = Math.hypot(...view.sun) || 1, sun = view.sun.map((x) => x / sl);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(back);
    gl.bindBuffer(gl.ARRAY_BUFFER, back.quad);
    const ab = gl.getAttribLocation(back, "a");
    gl.enableVertexAttribArray(ab); gl.vertexAttribPointer(ab, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(gl.getUniformLocation(back, "C"), C[0], C[1]);
    gl.uniform1f(gl.getUniformLocation(back, "S"), S);
    gl.uniform1f(gl.getUniformLocation(back, "D"), dim);
    gl.uniformMatrix3fv(gl.getUniformLocation(back, "M"), false, cols);
    gl.uniform3f(gl.getUniformLocation(back, "L"), sun[0], sun[1], sun[2]);
    gl.uniform1f(gl.getUniformLocation(back, "T"), tex.mix);
    gl.uniform1f(gl.getUniformLocation(back, "U"), still ? 0 : performance.now() / 1000);
    ["tDay", "tNight", "tWater", "tRelief"].forEach((u, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, [tex.day, tex.night, tex.water, tex.relief][i]);
      gl.uniform1i(gl.getUniformLocation(back, u), i);
    });
    gl.uniform1f(gl.getUniformLocation(back, "B"), tex.relief ? 2.4 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const a = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    // GLSL wants the matrix by columns
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, "M"), false, cols);
    gl.uniform2f(gl.getUniformLocation(prog, "C"), C[0], C[1]);
    gl.uniform1f(gl.getUniformLocation(prog, "S"), S);
    gl.uniform2f(gl.getUniformLocation(prog, "V"), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(prog, "P"), clamp(view.R / 190, 1.1, 3.4) * gdpr);
    gl.uniform3f(gl.getUniformLocation(prog, "L"), sun[0], sun[1], sun[2]);
    gl.uniform3f(gl.getUniformLocation(prog, "K"), 0.86, 0.92, 1.0);
    gl.uniform1f(gl.getUniformLocation(prog, "D"), dim * (1 - tex.mix));  /* once the photograph is in, the dots are a faint data layer */
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
    const k = h(6);  /* colour temperature: most white, some blue, a few warm */
    return { x: h(1), y: h(2), r: 0.35 + h(3) * 1.1, a: 0.25 + h(4) * 0.6, tw: h(5) * 6.28, c: k < 0.18 ? "255,226,196" : k < 0.45 ? "200,220,255" : "255,255,255" };
  });
  /* the Milky Way: a faint band of dust and thousands of small stars, painted once per size and slid with the scroll */
  let milky = null;
  function paintMilky() {
    const c = document.createElement("canvas"), w = Math.round(W * dpr), h = Math.round(H * 1.6 * dpr);
    c.width = w; c.height = h;
    const m = c.getContext("2d");
    const rnd = (() => { let x = 7; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
    const ang = -0.52, cx = w * 0.55, cy = h * 0.42, len = Math.hypot(w, h);
    const along = (t, off) => [cx + Math.cos(ang) * t * len - Math.sin(ang) * off, cy + Math.sin(ang) * t * len + Math.cos(ang) * off];
    m.globalCompositeOperation = "lighter";
    for (let i = 0; i < 70; i += 1) {           // dust glow
      const [x, y] = along(rnd() - 0.5, gauss() * h * 0.06);
      const r = (40 + rnd() * 140) * dpr;
      const gr = m.createRadialGradient(x, y, 0, x, y, r);
      const warm = rnd() < 0.35;
      gr.addColorStop(0, warm ? "rgba(255,220,190,0.035)" : "rgba(150,180,255,0.04)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      m.fillStyle = gr; m.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 5200; i += 1) {         // the band's stars
      const [x, y] = along(rnd() - 0.5, gauss() * h * 0.08);
      const a = 0.08 + rnd() * 0.35;
      m.fillStyle = `rgba(230,238,255,${a})`;
      const r = (rnd() < 0.96 ? 0.6 : 1.2) * dpr;
      m.fillRect(x, y, r, r);
    }
    milky = c;
  }
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
  function arc(M, from, to, rise) {
    const a = unit(...from), b = unit(...to);
    const omega = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)), so = Math.sin(omega);
    const pts = [];
    for (let k = 0; k <= 64; k += 1) {
      const s = k / 64, w1 = Math.sin((1 - s) * omega) / so, w2 = Math.sin(s * omega) / so, h = 1 + rise * omega * Math.sin(Math.PI * s);
      pts.push(project(M, [(w1 * a[0] + w2 * b[0]) * h, (w1 * a[1] + w2 * b[1]) * h, (w1 * a[2] + w2 * b[2]) * h]));
    }
    return pts;
  }
  function marker(M, lat, lon, label, w, t, side = 1, dy = 0) {
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
      g.fillText(label.toUpperCase().split("").join(String.fromCharCode(8202)), p.x + side * 14, p.y + 4 + dy);
    }
  }

  function drawFx(M, t, scrollY) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the sky: the Milky Way and the stars, a little parallax with the scroll, never in front of the Earth
    g.save();
    g.beginPath(); g.rect(0, 0, W, H); g.arc(view.cx, view.cy, view.R * 1.01, 0, Math.PI * 2, true); g.clip("evenodd");
    if (!milky || milky.width !== Math.round(W * dpr)) paintMilky();
    const my = -((scrollY * 0.03) % (H * 0.6));
    g.globalAlpha = 0.9; g.drawImage(milky, 0, my * 1, W, H * 1.6); g.globalAlpha = 1;
    for (const s of stars) {
      const y = ((s.y * H - scrollY * 0.04 * s.r) % H + H) % H;
      const tw = still ? 1 : 0.65 + 0.35 * Math.sin(t * 1.3 + s.tw);
      g.fillStyle = `rgba(${s.c},${s.a * tw * 0.8})`;
      g.fillRect(s.x * W, y, s.r, s.r);
      if (s.r > 1.3) { g.fillStyle = `rgba(${s.c},${s.a * tw * 0.12})`; g.beginPath(); g.arc(s.x * W + s.r / 2, y + s.r / 2, s.r * 2.6, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
    const f = view.fx;
    if (!gl && earth.ready) draw2D(M, view.dim);
    // Montréal, home, and a satellite crossing over the Earth
    if (f.home > 0.02) {
      marker(M, MTL[0], MTL[1], "Montréal", f.home, t, 1, -8);
      const inc = 0.9, a0 = (still ? 0.4 : t * 0.045) % (Math.PI * 2);
      const at = (a) => { const r = 1.035; const p = [Math.cos(a) * r, Math.sin(a) * Math.sin(inc) * r, Math.sin(a) * Math.cos(inc) * r]; return { x: view.cx + p[0] * view.R, y: view.cy - p[1] * view.R, hide: p[2] < 0 && Math.hypot(p[0], p[1]) < 1 }; };
      const Mx = rotation(view.lat * 0.2, 0);
      const sat = (a) => { const r = 1.035; const p0 = [Math.cos(a) * r, Math.sin(a) * Math.sin(inc) * r, Math.sin(a) * Math.cos(inc) * r]; const p = apply(Mx, p0); return { x: view.cx + p[0] * view.R, y: view.cy - p[1] * view.R, hide: p[2] < 0 && Math.hypot(p[0], p[1]) < 1 }; };
      void at;
      for (let k = 0; k < 40; k += 1) {
        const p = sat(a0 - k * 0.0022);
        if (p.hide || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
        g.fillStyle = `rgba(220,235,255,${f.home * (1 - k / 40) * (k ? 0.35 : 1)})`;
        g.beginPath(); g.arc(p.x, p.y, k ? 1 : 1.8, 0, Math.PI * 2); g.fill();
      }
    }
    // the opening: from Montréal to every city that runs Canada's pensions and investments
    if (f.open > 0.02) {
      HUBS.forEach(([lat, lon, name, side, dy], i) => {
        const pts = arc(M, MTL, [lat, lon], 0.14);
        g.strokeStyle = `rgba(142,197,255,${0.75 * f.open})`; g.lineWidth = 1.4; strokeFront(pts, 0.05);
        if (!still) {
          const k = Math.floor((((t * 0.18) + i * 0.21) % 1) * (pts.length - 1)), q = pts[k];
          if (q.z > 0.05) { g.fillStyle = `rgba(244,245,247,${0.9 * f.open})`; g.beginPath(); g.arc(q.x, q.y, 2.2, 0, Math.PI * 2); g.fill(); }
        }
        marker(M, lat, lon, name, f.open, t + i * 0.37, side, dy);
      });
    }
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
    const la = (S) => (!wide() && tall() && S.mlat != null ? S.mlat : S.lat);
    want.lon = A.lon + dl * t; want.lat = lerp(la(A), la(B), t);
    want.cx = lerp(pa.cx, pb.cx, t); want.cy = lerp(pa.cy, pb.cy, t); want.R = lerp(pa.R, pb.R, t);
    want.dim = lerp(A.dim || 1, B.dim || 1, t) * (wide() || A.horizon || B.horizon || A.open || B.open ? 1 : 0.62);
    want.spin = lerp(A.spin, B.spin, t);
    want.flip = wide() ? lerp(A.flip || 0, B.flip || 0, t) : 0;
    const hz = (S) => (S.horizon ? 1 : S.open ? 0.55 : 0);
    want.hz = lerp(hz(A), hz(B), t);
    const sun = (S) => (S.open ? OPEN : S.horizon ? DAWN : S.flip && wide() ? SUN_L : SUN);  // the night side always sits under the words
    const sa = sun(A), sb = sun(B);
    want.sun = [0, 1, 2].map((i) => lerp(sa[i], sb[i], t));
    const fx = {};
    for (const k of new Set([...Object.keys(A.fx), ...Object.keys(B.fx)])) fx[k] = (A.fx[k] || 0) * (1 - t) + (B.fx[k] || 0) * t;
    want.fx = fx;
  }

  /* The opening shot: the camera starts over Montréal at night and pulls back until the whole of Canada and the
     United States is in view, at dusk, with an arc from Montréal to each city where Canada's pensions are run. */
  let last = performance.now(), first = true, introFrom = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (tex.ready && now - introFrom > 2000) pace(dt);
    target();
    if (first) {
      first = false;
      if (still) Object.assign(view, { ...want, sun: want.sun.slice(), lon: want.lon, lat: want.lat });
      else {
        Object.assign(view, { lon: MTL[1], lat: MTL[0], cx: W * 0.5, cy: H * 0.5, R: Math.max(W, H) * 2.6, dim: 1, sun: NIGHT.slice() });
        introFrom = now;
      }
    }
    if (tex.ready) tex.mix = still ? 1 : clamp((now - tex.at) / 1400);
    // hold the close shot until the photograph is in (or 2.4 s have passed), then pull back slowly
    const held = !still && !tex.ready && now - introFrom < 2400;
    const intro = !still && now - introFrom < 6500;
    const rate = held ? 0 : intro ? 1.15 : 3.2;
    const k = still ? 1 : 1 - Math.exp(-dt * rate);
    if (!still) spinLon = (spinLon + (want.spin || 0) * dt) % 360;
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
    if (!drag.on) {
      drag.lon += drag.vx * dt; drag.lat += drag.vy * dt;               // momentum after the release
      drag.vx *= Math.exp(-dt * 2.2); drag.vy *= Math.exp(-dt * 2.2);
      if (now - drag.at > 2200) { const back = Math.exp(-dt * 0.9); drag.lon *= back; drag.lat *= back; }  // then home to the scene
    }
    drag.lat = clamp(drag.lat, -55, 55);
    const lonT = want.lon - spinLon + pointer.x * 6 + drag.lon, latT = want.lat - pointer.y * 4 + drag.lat;
    view.lon += ((((lonT - view.lon) + 540) % 360) - 180) * k;
    view.lat += (latT - view.lat) * k;
    for (const key of ["cx", "cy", "R", "dim"]) view[key] += (want[key] - view[key]) * k;
    for (let i = 0; i < 3; i += 1) view.sun[i] += (want.sun[i] - view.sun[i]) * k * (intro ? 0.8 : 1);
    const fx = {};
    for (const key of new Set([...Object.keys(view.fx), ...Object.keys(want.fx)])) fx[key] = lerp(view.fx[key] || 0, want.fx[key] || 0, k);
    view.fx = fx;
    view.flip = lerp(view.flip || 0, want.flip || 0, k);
    view.hz = lerp(view.hz || 0, want.hz || 0, k);
    const M = rotation(view.lat, view.lon);
    if (gl && earth.ready) drawGL(M, view.dim);
    if (g) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, fxc.width, fxc.height); drawFx(M, now / 1000, window.scrollY); }
    hud();
    if (!still && !document.hidden) requestAnimationFrame(frame);
  }
  const redraw = () => requestAnimationFrame((now) => { last = now; frame(now); });

  /* ---------------------------------------------------------- the webcast strip: where the camera is, and the
     timeline of the page with a node for each mission. The readouts describe the picture, not a real flight:
     the altitude is the height a camera with a 50 degree view would need to see the Earth this size. */
  const hudEl = $("[data-hud]"), veil = $(".veil");
  const hudOut = hudEl ? {
    name: $("[data-hud-name]", hudEl), code: $("[data-hud-code]", hudEl), lat: $("[data-hud-lat]", hudEl), lon: $("[data-hud-lon]", hudEl),
    alt: $("[data-hud-alt]", hudEl), clock: $("[data-hud-clock]", hudEl), fill: $("[data-hud-fill]", hudEl),
    nodes: $$("[data-node]", hudEl).map((a) => ({ a, el: $(a.getAttribute("href")) })),
  } : null;
  const born = performance.now();
  const put = (el, text) => { if (el && el.textContent !== text) el.textContent = text; };
  function hud() {
    if (veil) { veil.style.setProperty("--flip", (view.flip || 0).toFixed(3)); veil.style.setProperty("--hz", (view.hz || 0).toFixed(3)); }
    if (!hudOut) return;
    const y = window.scrollY + H * 0.5;
    const tops = hudOut.nodes.map((n) => (n.el ? n.el.getBoundingClientRect().top + window.scrollY : 0));
    let i = 0;
    while (i < tops.length - 1 && tops[i + 1] <= y) i += 1;
    const frac = i < tops.length - 1 ? clamp((y - tops[i]) / Math.max(1, tops[i + 1] - tops[i])) : 0;
    hudOut.fill.style.transform = `scaleX(${((i + frac) / (tops.length - 1)).toFixed(4)})`;
    hudOut.nodes.forEach((n, k) => { n.a.classList.toggle("is-past", k <= i); n.a.classList.toggle("is-now", k === i); });
    const cur = hudOut.nodes[i].a;
    put(hudOut.code, cur.dataset.code || ""); put(hudOut.name, cur.dataset.name || "");
    const la = view.lat, lo = ((((view.lon + spinLon) % 360) + 540) % 360) - 180;
    put(hudOut.lat, `${Math.abs(la).toFixed(2)}° ${la >= 0 ? "N" : "S"}`);
    put(hudOut.lon, `${Math.abs(lo).toFixed(2)}° ${lo >= 0 ? "E" : "W"}`);
    const a = Math.atan(view.R / (H * 1.07)), alt = Math.max(0, (1 / Math.sin(a) - 1) * 6371);
    put(hudOut.alt, `${Math.round(alt).toLocaleString("en-US")} km`);
    const sec = Math.floor((performance.now() - born) / 1000);
    put(hudOut.clock, `T+ ${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor(sec / 60) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`);
    const contact = $("#contact .facts");  // step aside for the contact details at the end
    hudEl.classList.toggle("is-on", window.scrollY > H * 0.55 && !(contact && contact.getBoundingClientRect().top < H - 40));
  }

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
      /* Grab the Earth and turn it (a mouse or a pen, not a finger: on a phone the page scrolls). Words, links and
         buttons keep their own clicks; the Earth answers only where it is, and only where nothing else is. */
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
      const onEarth = (ev) => fine.matches && earth.ready && Math.hypot(ev.clientX - view.cx, ev.clientY - view.cy) < view.R * 1.02
        && !ev.target.closest("a, button, input, textarea, select, label, p, h1, h2, h3, li, dd, dt, figure, .hud, .top");
      window.addEventListener("pointermove", (ev) => {
        if (drag.on) {
          const dt = Math.max(1, ev.timeStamp - drag.t) / 1000;
          const dl = ((ev.clientX - drag.x) / view.R) * (180 / Math.PI) * 0.9, dp = ((ev.clientY - drag.y) / view.R) * (180 / Math.PI) * 0.9;
          drag.lon -= dl; drag.lat += dp;
          drag.vx = -dl / dt; drag.vy = dp / dt;
          drag.x = ev.clientX; drag.y = ev.clientY; drag.t = ev.timeStamp; drag.at = performance.now();
          return;
        }
        doc.classList.toggle("can-grab", onEarth(ev));
      }, { passive: true });
      window.addEventListener("pointerdown", (ev) => {
        if (ev.button !== 0 || !onEarth(ev)) return;
        ev.preventDefault();
        Object.assign(drag, { on: true, x: ev.clientX, y: ev.clientY, t: ev.timeStamp, vx: 0, vy: 0, at: performance.now() });
        doc.classList.add("is-grabbing");
      });
      const release = () => { if (!drag.on) return; drag.on = false; drag.at = performance.now(); doc.classList.remove("is-grabbing"); };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
      window.addEventListener("blur", release);
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

  /* ---------------------------------------------------------- titles rise word by word from behind a mask */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const wd = document.createElement("span"), wi = document.createElement("span");
            wd.className = "wd"; wi.className = "wi"; wi.style.setProperty("--i", i++); wi.textContent = part;
            wd.append(wi); frag.append(wd);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(el);
    el.classList.add("split");
  }
  if (!still) $$("main h2, .mission h3").forEach(splitWords);

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

  /* ---------------------------------------------------------- smooth scroll (Lenis, assets/vendor), with a wheel
     that glides; touch keeps the phone's own scrolling. Not under reduced motion. */
  let lenis = null;
  if (!still && window.Lenis) {
    try {
      lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true });
      const lr = (t) => { lenis.raf(t); requestAnimationFrame(lr); };
      requestAnimationFrame(lr);
    } catch (e) { lenis = null; }
  }
  const go = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -72, duration: 1.6 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: still ? "auto" : "smooth" });
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (ev) => {
    const id = a.getAttribute("href");
    if (id === "#main" || id.length < 2) return;
    const el = $(id);
    if (!el) return;
    ev.preventDefault();
    go(id === "#top" ? 0 : el);
    history.replaceState(null, "", id);
  }));

  /* ---------------------------------------------------------- copy the email, back to top */
  const toast = $("[data-toast]");
  let toastTimer = 0;
  const say = (msg) => { if (!toast) return; toast.textContent = msg; toast.classList.add("is-on"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-on"), 2200); };
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); say("Email copied"); } catch (e) { say(`Copy failed. The address is ${b.dataset.copy}`); }
  }));
})();
