import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';

// The front door, once per visit: the logo badge assembles on deep lake teal (arch, name around the arch, fork and
// spoon, "Cocktails & Desserts"), a striped beach blind pulled down over its window while the beach gets ready, a line
// at a time under it (sun cream, towels, the flamingo). It waits only for the page itself: the hero photo, the first
// of the hero's moving lake and the menu, at least long enough to read a line and never more than a few seconds. Then
// the blind rolls up on the moving lake, the window swells past the edges of the screen and you are standing on the
// shore. A tap tugs the blind and hurries the next line along, or, once everything is in, opens it straight away.
// Skipped on a deep link (#menu from the printed QR), on reduced motion, and on the second load of a visit.

const DEEP = '#04414C', TEAL = '#007385', CREAM = '#F9F6E3';
const KEY = 'lpb-intro', WOOD = '#B98A52';
const PREP = ['Applying SPF 50…', 'Shaking the sand out of the towels…', 'Inflating the flamingo…', 'Chilling the boba…',
  'Folding the crêpes…', 'Raking the sand smooth…', 'Opening the umbrellas…', 'Waking the lifeguard…'];
const LINE = 1300, LEAST = 1500, MOST = 4500;

export function shouldIntro() {
  // index.html makes the same call before first paint and marks <html data-intro="boot">
  return document.documentElement.dataset.intro === 'boot';
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [vp, setVp] = useState(() => ({ w: innerWidth, h: innerHeight }));
  const [go, setGo] = useState(false);
  const grow = useMotionValue(1);
  const fade = useMotionValue(1);
  const roll = useMotionValue(0); // 0 the blind is down, 1 rolled up out of the window
  const [line, setLine] = useState(0);
  const tap = useRef(() => {});
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
  // the blind hangs from the top of the arch to the sill, its hem a row of scallops on a wooden roll bar
  const top = cy - w / 2, drop = h / 2 - top, stripe = w / 7;
  const lift = useTransform(roll, (r) => -r * (drop + b * 0.5));

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

    // start once the lettering has arrived (or soon anyway); open once the page underneath is ready: the hero photo,
    // enough of the hero's moving lake to play, and the menu
    const fonts = Promise.race([document.fonts?.load(`800 20px Rubik`).catch(() => {}), wait(1200)]);
    const t0 = performance.now();
    const ready = () => {
      const photo = document.querySelector<HTMLImageElement>('header picture img');
      const film = document.querySelector<HTMLVideoElement>('header video');
      return (!photo || photo.complete) && (!film || film.readyState >= 3) && !!document.getElementById('menu');
    };
    let live = true, opened = false, lines = 0, next = 0;
    const say = () => { setLine((n) => (n + 1) % PREP.length); lines = performance.now(); clearTimeout(next); next = window.setTimeout(say, LINE); };
    const open = () => {
      if (opened || !live) return;
      opened = true; clearTimeout(next); clearInterval(poll);
      // the blind rolls up on the lake, then the window takes you through it
      animate(roll, 1, { duration: 0.75, ease: [0.5, 0, 0.2, 1] }).then(() => {
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
    };
    let poll = 0;
    fonts.then(() => {
      if (!live) return;
      setGo(true);
      lines = performance.now(); next = window.setTimeout(say, LINE);
      poll = window.setInterval(() => {
        const t = performance.now() - t0;
        if (t > MOST || (ready() && t > LEAST && performance.now() - lines > 700)) open();
      }, 100);
    });
    // a tap: open now if the beach is ready, otherwise tug the blind and hurry the next line along
    tap.current = () => {
      if (opened) return;
      if (ready()) { open(); return; }
      animate(roll, [0, -0.06, 0], { duration: 0.45, ease: 'easeOut' });
      say();
    };
    return () => { live = false; clearTimeout(next); clearInterval(poll); free(); removeEventListener('resize', resize); html.style.overflow = ''; delete html.dataset.intro; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const letters = 'LA PLAYA BLANCA'.split('');
  return (
    <div aria-hidden data-intro-overlay className="fixed inset-0 z-[100] touch-none select-none" onPointerDown={() => tap.current()}>
      <svg width={vp.w} height={vp.h} viewBox={`0 0 ${vp.w} ${vp.h}`} className="block">
        <defs>
          <mask id="intro-hole" maskUnits="userSpaceOnUse" x="0" y="0" width={vp.w} height={vp.h}>
            <rect width={vp.w} height={vp.h} fill="#fff" />
            <g ref={hole}><path d={win} fill="#000" /></g>
          </mask>
          <path id="intro-arc" d={`M${-rT},${cy}A${rT},${rT} 0 0 1 ${rT},${cy}`} />
          <linearGradient id="intro-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity=".28" /><stop offset=".25" stopColor="#000" stopOpacity="0" />
            <stop offset=".7" stopColor="#fff" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".18" />
          </linearGradient>
          <clipPath id="intro-win"><path d={win} /></clipPath>
          <pattern id="intro-stripes" patternUnits="userSpaceOnUse" x={-w / 2} y="0" width={stripe * 2} height={drop}>
            <rect width={stripe} height={drop} fill={TEAL} /><rect x={stripe} width={stripe} height={drop} fill={CREAM} />
          </pattern>
        </defs>
        <rect width={vp.w} height={vp.h} fill={DEEP} mask="url(#intro-hole)" />
        <g ref={badge}>
          {/* the beach blind over the window, rolling up out of it when the beach is ready */}
          <g clipPath="url(#intro-win)">
            <motion.g style={{ y: lift }}>
              <rect x={-w / 2} y={top} width={w} height={drop - b * 0.4} fill="url(#intro-stripes)" />
              {/* a soft fold of shade across the canvas, so it reads as cloth */}
              <rect x={-w / 2} y={top} width={w} height={drop - b * 0.4} fill="url(#intro-shade)" />
              {/* the roll bar, and a scalloped valance hanging from it in the stripes' colours */}
              {Array.from({ length: 7 }, (_, i) => (
                <path key={i} fill={i % 2 ? CREAM : TEAL} d={`M${-w / 2 + i * stripe},${h / 2 - b * 0.3}a${stripe / 2},${b * 0.24} 0 0 0 ${stripe},0Z`} />
              ))}
              <rect x={-w / 2 - 4} y={h / 2 - b * 0.44} width={w + 8} height={b * 0.15} rx={b * 0.075} fill={WOOD} />
            </motion.g>
          </g>
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
      {/* the beach getting ready, a line at a time, under the badge */}
      <motion.div style={{ opacity: fade, top: oy + h / 2 + P + 26 }} className="pointer-events-none absolute inset-x-0 px-6 text-center">
        <AnimatePresence mode="wait">
          {go && (
            <motion.p key={line} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
              className="font-serif text-[19px] italic text-[#F9F6E3]/90">{PREP[line]}</motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
