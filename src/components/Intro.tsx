import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';

// The front door, once per visit, with nothing to tap: the logo badge assembles on deep lake teal (arch, name
// around the arch, fork and spoon, "Cocktails & Desserts"), its window already looking out on the real lake photo
// of the hero underneath. Then the window swells past the edges of the screen and you are standing on the shore.
// About three seconds, then it removes itself. Skipped on a deep link (#menu from the printed QR), on reduced
// motion, and on the second load of a visit.

const DEEP = '#04414C', TEAL = '#007385', CREAM = '#F9F6E3';
const KEY = 'lpb-intro';

export function shouldIntro() {
  // index.html makes the same call before first paint and marks <html data-intro="boot">
  return document.documentElement.dataset.intro === 'boot';
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [vp, setVp] = useState(() => ({ w: innerWidth, h: innerHeight }));
  const [go, setGo] = useState(false);
  const grow = useMotionValue(1);
  const fade = useMotionValue(1);
  const hole = useRef<SVGGElement>(null), badge = useRef<SVGGElement>(null);

  // the badge, in units of W, drawn around the centre of its window
  const W = Math.min(vp.w * 0.74, vp.h * 0.5, 360);
  const w = W * 0.62, h = W * 0.85, b = W * 0.13, o = W * 0.035, P = W * 0.42;
  const cy = -h / 2 + w / 2; // centre of the arch's curve
  const R = w / 2 + b, Ro = R + o, rT = w / 2 + b / 2;
  const arch = (r: number, bottom: number) => `M${-r},${bottom}L${-r},${cy}A${r},${r} 0 0 1 ${r},${cy}L${r},${bottom}Z`;
  const win = arch(w / 2, h / 2);
  const ox = vp.w / 2, oy = vp.h / 2 - (P - b - o) / 2;
  // big enough that the window's straight sides and arch clear every corner of the screen
  const wide = 2.6 * Math.max(vp.w / w, vp.h / h);

  // the window and the badge grow together about the window's centre (SVG attributes: no CSS transform-origin quirks)
  useLayoutEffect(() => {
    const set = (g: number) => [hole.current, badge.current].forEach((el) => el?.setAttribute('transform', `translate(${ox} ${oy}) scale(${g})`));
    set(grow.get());
    return grow.on('change', set);
  }, [ox, oy, grow]);

  useEffect(() => {
    const html = document.documentElement;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* shows again next load */ }
    html.style.overflow = 'hidden';
    // the page underneath can't take focus while the overlay is up
    document.querySelectorAll('#root > :not([data-intro-overlay])').forEach((el) => el.setAttribute('inert', ''));
    const free = () => document.querySelectorAll('#root > [inert]').forEach((el) => el.removeAttribute('inert'));
    html.dataset.intro = 'on'; // our own overlay is up: drop the boot cover, keep the hero's titles waiting
    const resize = () => setVp({ w: innerWidth, h: innerHeight });
    addEventListener('resize', resize);

    // start once the lettering has arrived (or soon anyway), hold until the lake photo is in (or soon anyway)
    const fonts = Promise.race([document.fonts?.load(`800 20px Rubik`).catch(() => {}), wait(1200)]);
    const photo = document.querySelector<HTMLImageElement>('header picture img');
    const lake = Promise.race([photo && !photo.complete ? new Promise((r) => { photo.onload = photo.onerror = r; }) : null, wait(2600)]);
    let live = true;
    fonts.then(() => { if (live) setGo(true); });
    Promise.all([fonts.then(() => wait(1900)), lake]).then(() => {
      if (!live) return;
      // the hero's titles rise once the window has all but cleared the screen
      setTimeout(() => { if (live) delete html.dataset.intro; }, 700);
      free();
      animate(fade, 0, { duration: 0.25, ease: 'easeOut' });
      animate(grow, wide, { duration: 1.1, ease: [0.7, 0, 0.2, 1] }).then(() => {
        html.style.overflow = '';
        if (live) onDone();
      });
    });
    return () => { live = false; free(); removeEventListener('resize', resize); html.style.overflow = ''; delete html.dataset.intro; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const letters = 'LA PLAYA BLANCA'.split('');
  return (
    <div aria-hidden data-intro-overlay className="fixed inset-0 z-[100] touch-none">
      <svg width={vp.w} height={vp.h} viewBox={`0 0 ${vp.w} ${vp.h}`} className="block">
        <defs>
          <mask id="intro-hole" maskUnits="userSpaceOnUse" x="0" y="0" width={vp.w} height={vp.h}>
            <rect width={vp.w} height={vp.h} fill="#fff" />
            <g ref={hole}><path d={win} fill="#000" /></g>
          </mask>
          <path id="intro-arc" d={`M${-rT},${cy}A${rT},${rT} 0 0 1 ${rT},${cy}`} />
        </defs>
        <rect width={vp.w} height={vp.h} fill={DEEP} mask="url(#intro-hole)" />
        <g ref={badge}>
          <g>
            <motion.g initial={{ opacity: 0, scale: 0.9 }} animate={go ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
              {/* teal badge and cream band, each with the window cut out of it */}
              <path fillRule="evenodd" fill={TEAL} d={`M${-Ro},${h / 2 + P - 18}L${-Ro},${cy}A${Ro},${Ro} 0 0 1 ${Ro},${cy}L${Ro},${h / 2 + P - 18}Q${Ro},${h / 2 + P} ${Ro - 18},${h / 2 + P}L${-Ro + 18},${h / 2 + P}Q${-Ro},${h / 2 + P} ${-Ro},${h / 2 + P - 18}Z ${win}`} />
              <path fillRule="evenodd" fill={CREAM} d={`${arch(R, h / 2)} ${win}`} />
            </motion.g>
            <motion.g style={{ opacity: fade }}>
              <text fill={TEAL} fontFamily="Rubik, sans-serif" fontWeight={800} fontSize={b * 0.56} letterSpacing={b * 0.06} dominantBaseline="central" textAnchor="middle">
                <textPath href="#intro-arc" startOffset="50%">
                  {letters.map((c, i) => (
                    <motion.tspan key={i} initial={{ opacity: 0 }} animate={go ? { opacity: 1 } : {}} transition={{ delay: 0.35 + i * 0.045, duration: 0.3 }}>{c}</motion.tspan>
                  ))}
                </textPath>
              </text>
              <motion.g fill={TEAL} initial={{ opacity: 0 }} animate={go ? { opacity: 1 } : {}} transition={{ delay: 1, duration: 0.5 }}>
                {[-1, 1].map((s) => (
                  <g key={s}>
                    <circle cx={s * rT} cy={cy + b * 0.42} r={b * 0.1} />
                    <circle cx={s * rT} cy={h / 2 - b * 0.42} r={b * 0.1} />
                  </g>
                ))}
                {/* fork */}
                <g transform={`translate(${-rT} ${(cy + h / 2) / 2})`}>
                  <path d={`M${-b * .2},${-b * .9}V${-b * .45}Q${-b * .2},${-b * .22} 0,${-b * .2}Q${b * .2},${-b * .22} ${b * .2},${-b * .45}V${-b * .9}`} fill="none" stroke={TEAL} strokeWidth={b * 0.06} strokeLinecap="round" />
                  <path d={`M0,${-b * .9}V${-b * .3}`} stroke={TEAL} strokeWidth={b * 0.06} strokeLinecap="round" />
                  <rect x={-b * .055} y={-b * .25} width={b * .11} height={b * 1.15} rx={b * .055} />
                </g>
                {/* spoon */}
                <g transform={`translate(${rT} ${(cy + h / 2) / 2})`}>
                  <ellipse cx="0" cy={-b * .58} rx={b * .17} ry={b * .32} />
                  <rect x={-b * .055} y={-b * .3} width={b * .11} height={b * 1.2} rx={b * .055} />
                </g>
              </motion.g>
              <motion.g fill={CREAM} fontFamily="Rubik, sans-serif" fontWeight={800} fontSize={P * 0.2} letterSpacing={P * 0.012} textAnchor="middle"
                initial={{ opacity: 0, y: 10 }} animate={go ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
                <text x="0" y={h / 2 + P * 0.43}>COCKTAILS &amp;</text>
                <text x="0" y={h / 2 + P * 0.75}>DESSERTS</text>
              </motion.g>
            </motion.g>
          </g>
        </g>
      </svg>
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
