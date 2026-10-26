import { useEffect, useRef } from 'react';
import { wet, type Sky, type Weather } from '../lib/weather';

// The sky over the shore photo: the real weather at the lake, and fireflies over the sand on a clear night.
// Veils, clouds and fireflies are plain layers moved by CSS (the GPU's job). Only falling rain and snow are drawn, on
// one canvas at screen resolution (no more), at 30fps, and only while the shore is on screen. Reduced motion: the veils
// stay, nothing falls or flies.

const FALL = { drizzle: 70, rain: 150, storm: 240, snow: 110 } as Partial<Record<Sky, number>>; // per 1000×1000px

export function SkyOver({ weather, night }: { weather: Weather; night: boolean }) {
  const { sky } = weather;
  const cloudy = sky !== 'clear' && sky !== 'fog';
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the overcast: a grey that settles on the sky and takes the stars and the glare off the water */}
      {cloudy && <div className="absolute inset-0" style={{ background: night
        ? 'linear-gradient(180deg, rgba(14,22,30,.72) 0%, rgba(14,22,30,.35) 45%, rgba(14,22,30,.15) 100%)'
        : 'linear-gradient(180deg, rgba(96,110,118,.5) 0%, rgba(120,134,140,.22) 45%, rgba(40,52,60,.12) 100%)' }} />}
      {cloudy && [0, 1, 2].map((i) => (
        <span key={i} className="cloud absolute" style={{ ['--i' as string]: i, top: [-6, 4, -2][i] + '%', left: [-10, 30, 62][i] + '%', width: [60, 55, 58][i] + '%', height: '34%',
          background: `radial-gradient(closest-side, ${night ? 'rgba(46,60,72,.55)' : 'rgba(236,240,242,.42)'}, transparent)` }} />
      ))}
      {/* fog lies on the water and blurs the far shore */}
      {sky === 'fog' && <div className="fog absolute inset-y-0 -inset-x-[6%]" style={{ background: night
        ? 'linear-gradient(180deg, transparent 25%, rgba(120,138,150,.38) 50%, rgba(120,138,150,.22) 72%, transparent 100%)'
        : 'linear-gradient(180deg, rgba(232,236,236,.25) 0%, rgba(232,236,236,.6) 48%, rgba(232,236,236,.35) 72%, transparent 100%)' }} />}
      {FALL[sky] && <Fall sky={sky} wind={weather.wind} night={night} />}
      {sky === 'storm' && <div className="flash absolute inset-0 bg-[#EEF3FF]" />}
      {night && !wet(sky) && sky !== 'snow' && <Fireflies />}
    </div>
  );
}

// fireflies drift low over the sand and the water's edge, each glowing on and off on its own beat
const FLIES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 53 + 11) % 96 + 2, y: 52 + ((i * 37) % 38), // % across, % down: below the hills, over the shore
  dx: ((i * 29) % 50) - 25, dy: -(((i * 17) % 30) + 10), // px they wander
  d: 9 + (i % 5) * 2.3, b: 2.6 + (i % 4) * .9, s: 2.5 + (i % 3) * .8
}));
function Fireflies() {
  return <>{FLIES.map((f, i) => (
    <span key={i} className="firefly absolute rounded-full" style={{ left: f.x + '%', top: f.y + '%', width: f.s, height: f.s,
      ['--dx' as string]: f.dx + 'px', ['--dy' as string]: f.dy + 'px', ['--d' as string]: f.d + 's', ['--b' as string]: f.b + 's', ['--i' as string]: i }} />
  ))}</>;
}

function Fall({ sky, wind, night }: { sky: Sky; wind: number; night: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const snow = sky === 'snow';
    const slant = Math.min(.35, wind / 90) * (snow ? 2 : 1); // sideways px per px fallen
    let w = 0, h = 0, parts: { x: number; y: number; v: number; l: number; a: number; p: number }[] = [];
    const seed = (p: (typeof parts)[number], top: boolean) => {
      p.x = Math.random() * (w + h * slant) - h * slant; p.y = top ? -20 - Math.random() * 40 : Math.random() * h;
      p.v = snow ? 35 + Math.random() * 55 : 850 + Math.random() * 500;
      p.l = snow ? 1 + Math.random() * 2.2 : 9 + Math.random() * 14;
      p.a = snow ? .5 + Math.random() * .4 : .16 + Math.random() * .26; p.p = Math.random() * 6.28;
    };
    const size = () => {
      w = c.width = c.clientWidth; h = c.height = c.clientHeight; // 1× is enough for streaks and flakes
      const n = Math.round((FALL[sky]! * w * h) / 1e6);
      parts = Array.from({ length: n }, () => { const p = { x: 0, y: 0, v: 0, l: 0, a: 0, p: 0 }; seed(p, false); return p; });
    };
    size();
    const col = snow ? '255,255,255' : night ? '190,205,215' : '236,242,244';
    let raf = 0, last = performance.now(), on = true;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = (now - last) / 1000; if (dt < 1 / 31) return; // 30fps is plenty for weather
      last = now;
      ctx.clearRect(0, 0, w, h);
      if (snow) {
        ctx.fillStyle = `rgb(${col})`;
        for (const p of parts) {
          p.y += p.v * Math.min(dt, .1); p.p += dt; p.x += (Math.sin(p.p) * 14 + p.v * slant) * Math.min(dt, .1);
          if (p.y > h + 4) seed(p, true);
          ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.l, 0, 6.283); ctx.fill();
        }
      } else {
        ctx.lineWidth = 1; ctx.lineCap = 'round';
        for (const p of parts) {
          const step = p.v * Math.min(dt, .1);
          p.y += step; p.x += step * slant;
          if (p.y > h + 20) seed(p, true);
          ctx.strokeStyle = `rgba(${col},${p.a})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.l * slant, p.y - p.l); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    const start = () => { if (!raf && on && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; on ? start() : stop(); });
    io.observe(c);
    const vis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', vis);
    const ro = new ResizeObserver(size); ro.observe(c);
    start();
    return () => { stop(); io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, [sky, wind, night]);
  return <canvas ref={ref} className="absolute inset-0 size-full" />;
}
