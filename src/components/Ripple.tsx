import { useEffect, useRef } from 'react';

// Touch the lake: the hero photo redrawn in WebGL, with rings spreading wherever a finger lands on the water.
// One full-screen pass, up to 10 rings, drawn only while a ring is alive and the hero is on screen, so it costs
// nothing at rest. No WebGL, or reduced motion → this renders nothing and the plain <img> underneath stays.

type Shot = { src: string; water: number }; // water: where the lake starts, as a fraction of the photo's height

const MAX = 10, LIFE = 2.6;

const VERT = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; uv.y = 1. - uv.y; gl_Position = vec4(p, 0., 1.); }`;
const FRAG = `precision mediump float;
varying vec2 uv;
uniform sampler2D img;
uniform vec2 cover;   // photo-space size of the visible window (object-fit: cover, centred)
uniform float aspect; // canvas width / height
uniform float water;  // lake line in photo space
uniform vec4 rings[${MAX}]; // x, y (canvas 0..1), age in seconds (computed on the CPU, so mediump stays precise), strength
void main() {
  vec2 photo = (uv - .5) * cover + .5;
  float lake = smoothstep(water, water + .03, photo.y);
  vec2 shift = vec2(0.); float light = 0.;
  for (int i = 0; i < ${MAX}; i++) {
    vec4 r = rings[i];
    float age = r.z;
    if (age < 0. || age > ${LIFE.toFixed(1)}) continue;
    vec2 d = uv - r.xy; d.x *= aspect; d.y *= 2.4;           // flatten: rings lie on the water, seen at an angle
    float dist = length(d), front = age * .34;
    float band = exp(-pow((dist - front) * 11., 2.));          // energy rides on the expanding front
    float wave = sin((dist - front) * 95.) * band * r.w * exp(-age * 1.5);
    shift += (dist > .0001 ? d / dist : vec2(0.)) * wave;
    light += max(wave, 0.);
  }
  vec3 c = texture2D(img, (uv + shift * .011 * lake - .5) * cover + .5).rgb;
  c += vec3(1., .97, .9) * light * lake * .22;               // a glint on each crest
  gl_FragColor = vec4(c, 1.);
}`;

export function Ripple({ tall, wide, className = '' }: { tall: Shot; wide: Shot; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl || gl.isContextLost()) return;
    const shot = matchMedia('(min-width: 768px)').matches ? wide : tall;

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
    const uCover = u('cover'), uAspect = u('aspect'), uWater = u('water'), uRings = u('rings');
    gl.uniform1f(uWater, shot.water);

    const rings = new Float32Array(MAX * 4).fill(-99), born = new Float64Array(MAX).fill(-99);
    let next = 0, raf = 0, ready = false, visible = true, imgAspect = 1, alive = 0, dead = false, hint = 0;
    const t0 = performance.now();
    const now = () => (performance.now() - t0) / 1000;

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const ca = w / h;
      gl.uniform1f(uAspect, ca);
      gl.uniform2f(uCover, ca > imgAspect ? 1 : ca / imgAspect, ca > imgAspect ? imgAspect / ca : 1);
    };
    const draw = () => {
      raf = 0;
      if (!ready || dead) return;
      const t = now();
      for (let i = 0; i < MAX; i++) rings[i * 4 + 2] = t - born[i];
      gl.uniform4fv(uRings, rings);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (t < alive && visible) raf = requestAnimationFrame(draw);
    };
    const kick = () => { if (!raf && !dead) raf = requestAnimationFrame(draw); };

    const drop = (x: number, y: number, strength: number) => {
      if (dead) return;
      const t = now();
      rings.set([x, y, 0, strength], next * 4); born[next] = t; next = (next + 1) % MAX;
      alive = t + LIFE; kick();
    };

    const photo = new Image();
    photo.decoding = 'async';
    photo.onload = () => {
      if (dead) return;
      try {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, photo);
      imgAspect = photo.naturalWidth / photo.naturalHeight;
      size(); ready = true;
      } catch { return; } // texture upload failed: leave the canvas hidden, the photo shows instead
      canvas.style.opacity = '1';
      // one ring on arrival, so people discover the water moves
      hint = window.setTimeout(() => drop(0.5, 0.86, 0.9), 500);
      kick();
    };
    photo.src = shot.src;

    // which point of the canvas is on the water? (the lake line, mapped from photo space to canvas space)
    const onWater = (cy: number) => {
      const ca = canvas.clientWidth / canvas.clientHeight;
      const coverY = ca > imgAspect ? imgAspect / ca : 1;
      return (cy - 0.5) * coverY + 0.5 > shot.water + 0.02;
    };
    let lastMove = 0;
    const at = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height] as const;
    };
    const host = canvas.parentElement!;
    const down = (e: PointerEvent) => { const [x, y] = at(e); if (onWater(y)) drop(x, y, 1); };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && !e.buttons && e.timeStamp - lastMove < 140) return;
      if (e.timeStamp - lastMove < 70) return;
      const [x, y] = at(e);
      if (onWater(y)) { lastMove = e.timeStamp; drop(x, y, e.pointerType === 'mouse' && !e.buttons ? 0.35 : 0.7); }
    };
    host.addEventListener('pointerdown', down, { passive: true });
    host.addEventListener('pointermove', move, { passive: true });

    // the phone may take the GPU back (tab in background, memory pressure): hide rather than show black
    const lost = (e: Event) => { e.preventDefault(); dead = true; canvas.style.opacity = '0'; };
    canvas.addEventListener('webglcontextlost', lost);

    const ro = new ResizeObserver(() => { if (ready) { size(); kick(); } });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(canvas);

    return () => {
      dead = true; photo.onload = null; clearTimeout(hint);
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [tall.src, wide.src, tall.water, wide.water]);

  return <canvas ref={ref} aria-hidden className={className} style={{ opacity: 0, transition: 'opacity .4s' }} />;
}
