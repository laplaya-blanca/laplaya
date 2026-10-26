import { useEffect, useRef, useState } from 'react';

// The lake behind the menu. First choice is real filmed water (a 6s Pexels loop of open water with light on it),
// shown as filmed, a touch dimmer at night. It only starts loading as the menu comes near,
// plays only while the menu is on screen, and if a phone won't autoplay it (iOS Low Power Mode, data saver) the
// drawn water below stays instead.
//
// The drawn water, so the glass bars always have something moving under them. By day: clear
// shallows over sand, light rippling across the bottom and sun glitter on top. At night: a slow dark swell with
// silver light skating over the crests. Drawn at a fraction of screen resolution (water is soft anyway), ~30fps, and only while the
// menu is on screen. No WebGL or reduced motion → nothing renders and the plain --water colour stays.

const VERT = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; uv.y = 1. - uv.y; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform float t, aspect, drift, beach;
uniform vec3 deep, shallow, shine;
uniform float gloss;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float swell(vec2 p){
  vec2 q = p + .45 * vec2(noise(p * .7 + t * .06), noise(p * .7 - t * .05 + 5.2));
  float s = sin(dot(q, vec2(.8, 1.7)) * 2. + t * .5) * .5;
  s += sin(dot(q, vec2(-1.4, 1.1)) * 2.6 + t * .38) * .3;
  s += sin(dot(q, vec2(.3, 2.4)) * 3.8 - t * .62) * .16;
  return s + noise(q * 3. + t * .12) * .22;
}
// light focused by the surface onto the sand: bright where moving cells meet
float caustic(vec2 p){
  vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = .5 + .42 * sin(t * .6 + 6.2831 * vec2(hash(i + g), hash(i + g + 19.7)));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return pow(1. - smoothstep(0., .2, d2 - d1), 2.2);
}
void main(){
  // night looks out over open water at a low angle; by day you look straight down into the shallows
  float depth = mix(.45, 1.15, uv.y);
  vec2 far = vec2((uv.x - .5) * aspect / depth, 1. / depth + drift) * 3.3;
  vec2 down = vec2((uv.x - .5) * aspect, uv.y + drift * 2.) * 2.6;
  vec2 p = mix(far, down, beach);
  float h = swell(p);
  vec2 e = vec2(.03, 0.);
  vec3 n = normalize(vec3(h - swell(p + e.xy), h - swell(p + e.yx), .09));
  vec3 L = normalize(vec3(-.25, .75, .6)), V = normalize(vec3(0., .45, .9));
  vec3 R = reflect(-L, n);
  float spec = pow(max(dot(R, V), 0.), 70.), sheen = pow(max(dot(R, V), 0.), 5.);
  vec3 c = mix(deep, shallow, smoothstep(-.9, .9, h));
  if (beach > .5) {
    // pale sand under clear water: deeper patches drift past as you scroll, the light net moves over the sand,
    // bent by the surface above it, and the sun glitters on the small ripples
    float floorDepth = smoothstep(.25, .8, noise(p * .35 + vec2(0., drift * 2.)));
    c = mix(shallow, deep, floorDepth);
    vec2 bend = n.xy * 1.6;
    float light = caustic(p * 1.5 + bend) * .65 + caustic(p * 2.4 - bend * .7 + 3.1) * .35;
    c += vec3(.78, 1., .95) * light * mix(.42, .16, floorDepth);
    vec3 m = normalize(n + .5 * vec3(noise(p * 16. + t * 1.3) - .5, noise(p * 16. - t * 1.1 + 7.) - .5, 0.));
    float glitter = pow(max(dot(reflect(-L, m), V), 0.), 260.);
    c += shine * (glitter * 1.4 + sheen * .07);
  } else {
    c += shine * (spec * gloss + sheen * gloss * .18);
  }
  gl_FragColor = vec4(c, 1.);
}`;

// the menu starts exactly at the bottom edge of the hero; trim 1px so merely touching the edge reads as off screen
const EDGE = { rootMargin: '0px 0px -1px 0px' };

// everything set on the water, and an observer that says whether any of it is on screen right now
const onWater = () => [...document.querySelectorAll<HTMLElement>('#menu, #events, footer')];
function watch(els: HTMLElement[], tell: (on: boolean) => void) {
  const on = new Set<Element>();
  const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? on.add(e.target) : on.delete(e.target))); tell(on.size > 0); }, EDGE);
  els.forEach((el) => io.observe(el));
  return io;
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const LOOKS = {
  day: { deep: hex('#13222A'), shallow: hex('#3B505A'), shine: hex('#E4ECEF'), gloss: 1.15, beach: 0 },
  night: { deep: hex('#050F17'), shallow: hex('#123245'), shine: hex('#D3DEE2'), gloss: 1.15, beach: 0 }
};

// ready: the page's content is in, so Events & Catering and the footer exist to be watched as well
export function Water({ dark, ready = false, className = '' }: { dark: boolean; ready?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const look = useRef(LOOKS.day);
  const repaint = useRef<() => void>(() => {});
  const film = useRef<HTMLVideoElement>(null);
  const filming = useRef(false);
  const [rolling, setRolling] = useState(false);

  useEffect(() => { look.current = dark ? LOOKS.night : LOOKS.day; repaint.current(); }, [dark]);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl || gl.isContextLost()) return;

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl.getExtension('WEBGL_lose_context')?.loseContext(); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uBeach = u('beach'), uT = u('t'), uAspect = u('aspect'), uDrift = u('drift'), uDeep = u('deep'), uShallow = u('shallow'), uShine = u('shine'), uGloss = u('gloss');

    let raf = 0, last = 0, visible = false, dead = false;
    const t0 = performance.now();

    const size = () => {
      // water has no sharp edges, so half the screen's pixels is plenty and keeps phones cool
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * 0.5)); canvas.height = Math.max(1, Math.round(h * 0.5));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uAspect, w / h);
    };
    const paint = (now: number) => {
      const l = look.current;
      gl.uniform3fv(uDeep, l.deep); gl.uniform3fv(uShallow, l.shallow); gl.uniform3fv(uShine, l.shine); gl.uniform1f(uGloss, l.gloss); gl.uniform1f(uBeach, l.beach);
      gl.uniform1f(uT, ((now - t0) / 1000) % 3600);
      gl.uniform1f(uDrift, scrollY * 0.00035); // the water slides a little as you scroll, like walking along the shore
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now: number) => {
      raf = 0;
      if (dead || !visible || document.hidden || filming.current) return;
      if (now - last > 32) { last = now; paint(now); }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !dead && visible && !document.hidden && !filming.current) raf = requestAnimationFrame(loop); };
    repaint.current = () => { if (!dead) paint(performance.now()); };

    size(); paint(t0);
    canvas.style.opacity = '1';

    const lost = (e: Event) => { e.preventDefault(); dead = true; canvas.style.opacity = '0'; };
    canvas.addEventListener('webglcontextlost', lost);
    const ro = new ResizeObserver(() => { if (!dead) { size(); paint(performance.now()); } });
    ro.observe(canvas);
    // only while the menu, Events & Catering or the footer (all set on the water) is on screen: the hero covers it anyway
    const parts = onWater();
    const io = watch(parts, (on) => { visible = on; kick(); });
    if (!parts.length) { visible = true; kick(); }
    const vis = () => kick();
    document.addEventListener('visibilitychange', vis);

    return () => {
      dead = true; repaint.current = () => {};
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', vis);
      canvas.removeEventListener('webglcontextlost', lost);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [ready]);

  // the filmed water: load as the menu nears, play while it's on screen, hand over from the drawn water once it rolls
  useEffect(() => {
    const v = film.current, menu = document.getElementById('menu');
    if (!v || !menu || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const parts = onWater();
    let seen = false;
    const play = () => { if (seen && !document.hidden) v.play().catch(() => {}); else v.pause(); };
    // start fetching a little before the menu arrives; play only while it is actually on screen
    const soon = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !v.getAttribute('src')) { v.src = '/assets/water.mp4'; v.load(); soon.disconnect(); }
    }, { rootMargin: '60% 0px' });
    const io = watch(parts, (on) => { seen = on; play(); });
    soon.observe(menu);
    const rolls = () => { filming.current = true; setRolling(true); };
    v.addEventListener('playing', rolls);
    document.addEventListener('visibilitychange', play);
    return () => { soon.disconnect(); io.disconnect(); v.removeEventListener('playing', rolls); document.removeEventListener('visibilitychange', play); v.pause(); };
  }, [ready]);

  return (
    <div aria-hidden className={'isolate overflow-hidden ' + className}>
      <canvas ref={ref} className="absolute inset-0 size-full" style={{ opacity: 0, transition: 'opacity .6s' }} />
      <video ref={film} muted loop playsInline preload="none" disablePictureInPicture tabIndex={-1}
        className="absolute inset-0 size-full object-cover transition-opacity duration-700"
        style={{ opacity: rolling ? 1 : 0, filter: dark ? 'brightness(.85) saturate(.9)' : 'none' }} />
      {/* a light veil so the brightest glints never wash out the text set on the water */}
      {rolling && <div className={'absolute inset-0 ' + (dark ? 'bg-[#03121A]/28' : 'bg-[#0A1A20]/22')} />}
    </div>
  );
}
