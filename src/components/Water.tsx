import { useEffect, useRef } from 'react';

// The lake behind the menu: a slow rolling swell with light skating over the crests, drawn live so the glass
// bars have real water moving under them. Pale lake by day (text stays dark-on-light), dark water with silver
// light by night. Drawn at a fraction of screen resolution (water is soft anyway), ~30fps, and only while the
// menu is on screen. No WebGL or reduced motion → nothing renders and the plain --water colour stays.

const VERT = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; uv.y = 1. - uv.y; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform float t, aspect, drift;
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
void main(){
  float depth = mix(.45, 1.15, uv.y);                       // a low angle: the top of the screen is further away
  vec2 p = vec2((uv.x - .5) * aspect / depth, 1. / depth + drift) * 3.3;
  float h = swell(p);
  vec2 e = vec2(.03, 0.);
  vec3 n = normalize(vec3(h - swell(p + e.xy), h - swell(p + e.yx), .09));
  vec3 L = normalize(vec3(-.25, .75, .6)), V = vec3(0., .45, .9);
  float spec = pow(max(dot(reflect(-L, n), normalize(V)), 0.), 70.);
  float sheen = pow(max(dot(reflect(-L, n), normalize(V)), 0.), 5.);
  vec3 c = mix(deep, shallow, smoothstep(-.9, .9, h));
  c += shine * (spec * gloss + sheen * gloss * .18);
  gl_FragColor = vec4(c, 1.);
}`;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const LOOKS = {
  day: { deep: hex('#CFE1DE'), shallow: hex('#EEF4EF'), shine: hex('#FFFFFF'), gloss: 0.55 },
  night: { deep: hex('#050F17'), shallow: hex('#123245'), shine: hex('#D3DEE2'), gloss: 1.15 }
};

export function Water({ dark, className = '' }: { dark: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const look = useRef(LOOKS.day);
  const repaint = useRef<() => void>(() => {});

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
    const uT = u('t'), uAspect = u('aspect'), uDrift = u('drift'), uDeep = u('deep'), uShallow = u('shallow'), uShine = u('shine'), uGloss = u('gloss');

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
      gl.uniform3fv(uDeep, l.deep); gl.uniform3fv(uShallow, l.shallow); gl.uniform3fv(uShine, l.shine); gl.uniform1f(uGloss, l.gloss);
      gl.uniform1f(uT, ((now - t0) / 1000) % 3600);
      gl.uniform1f(uDrift, scrollY * 0.00035); // the water slides a little as you scroll, like walking along the shore
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now: number) => {
      raf = 0;
      if (dead || !visible || document.hidden) return;
      if (now - last > 32) { last = now; paint(now); }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && !dead && visible && !document.hidden) raf = requestAnimationFrame(loop); };
    repaint.current = () => { if (!dead) paint(performance.now()); };

    size(); paint(t0);
    canvas.style.opacity = '1';

    const lost = (e: Event) => { e.preventDefault(); dead = true; canvas.style.opacity = '0'; };
    canvas.addEventListener('webglcontextlost', lost);
    const ro = new ResizeObserver(() => { if (!dead) { size(); paint(performance.now()); } });
    ro.observe(canvas);
    // only while the menu itself is on screen: the hero and footer cover the water anyway
    const menu = document.getElementById('menu');
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
    if (menu) io.observe(menu); else { visible = true; kick(); }
    const vis = () => kick();
    document.addEventListener('visibilitychange', vis);

    return () => {
      dead = true; repaint.current = () => {};
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', vis);
      canvas.removeEventListener('webglcontextlost', lost);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} style={{ opacity: 0, transition: 'opacity .6s' }} />;
}
