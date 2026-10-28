import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Light } from '../lib/time';
import { wet, type Weather } from '../lib/weather';
import { SkyOver } from './Weather';
import { img } from '../lib/content';
import { Ripple } from './Ripple';
import { useAfloat } from './Menu';

// where the lake begins in each photo, as a fraction of its height
const WATER = { lake: { tall: 0.57, wide: 0.6 }, night: { tall: 0.49, wide: 0.62 } } as const;

// The photo, alive: an 8-second loop of the same shot (scripts/hero-video.mjs) in which only the water, the light on it and
// the breeze move, so it takes over from the photo without a jump. It fades in once it is actually playing, and plays only
// while it is on screen. No video for reduced motion or a data saver; where a phone won't autoplay (Low Power Mode) it
// simply never starts and the photo stays. It loads only once it is within a screen of the window, so a video further
// down the page costs nothing until the visitor gets near it. The hero and the events photo both use it, each with a cut
// for laptops and one for phones.
export function Moving({ wide, tall, video }: { wide: string; tall: string; video?: RefObject<HTMLVideoElement> }) {
  const own = useRef<HTMLVideoElement>(null);
  const ref = video || own;
  const [skip] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches
    || !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const [src] = useState(() => (matchMedia('(min-width: 768px)').matches ? wide : tall));
  const [near, setNear] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setNear(true); v.play().catch(() => {}); } else v.pause();
    }, { rootMargin: '100% 0px' });
    io.observe(v);
    return () => io.disconnect();
  }, [ref, skip]);
  if (skip) return null;
  return (
    <video ref={ref} src={near ? src : undefined} aria-hidden muted loop playsInline autoPlay preload="auto" disablePictureInPicture
      onPlaying={() => setOn(true)} className="absolute inset-0 size-full object-cover transition-opacity duration-700" style={{ opacity: on ? 1 : 0 }} />
  );
}

type Open ={ open: true; until: string } | { open: false; opens: string } | null;

// First screen: a photograph of the shore, graded to the hour it is in Qaraaoun right now
// (cool morning, untouched golden hour, rose sunset, blue night with a moon and stars).
// The menu's water already shows along the bottom edge, and the categories float just above it as bubbles: one tap goes
// straight to that stretch of the menu. Scrolling down, the water rises over the shore (see .sink in styles.css).
// On a first visit the logo intro opens onto it.
export function Shore({ light, weather, open, hours, count, cats, onPick }: { light: Light; weather: Weather; open: Open; hours: string; count: number; cats: { key: string; name: string }[]; onPick: (key: string) => void }) {
  const night = light.dark;
  const ref = useAfloat<HTMLElement>();
  const shot = night ? 'night' : 'lake'; // a real night photo after dark, the golden-hour shore otherwise
  const video = useRef<HTMLVideoElement>(null);
  return (
    <header ref={ref} className="sink relative min-h-[calc(100svh-var(--peek))] overflow-hidden bg-[var(--sea-3)] touch-pan-y">
      <div className="sink-in absolute inset-0 flex flex-col">
      <picture aria-hidden>
        <source media="(min-width: 768px)" srcSet={img('/assets/hero-' + shot + '-wide.jpg', 2048)} />
        <img src={img('/assets/hero-' + shot + '-tall.jpg', 1080)} alt="" {...{ fetchpriority: 'high' }} decoding="async" className="absolute inset-0 size-full object-cover" />
      </picture>
      <Moving key={'video-' + shot} wide={'/assets/hero-' + shot + '-wide.mp4'} tall={'/assets/hero-' + shot + '-tall.mp4'} video={video} />
      {/* touch the lake: rings spread across the water in the photo */}
      <Ripple key={shot} video={video} className="absolute inset-0 size-full"
        tall={{ src: img('/assets/hero-' + shot + '-tall.jpg', 1080), water: WATER[shot].tall }}
        wide={{ src: img('/assets/hero-' + shot + '-wide.jpg', 2048), water: WATER[shot].wide }}
        rain={wet(weather.sky) ? { drizzle: 0.35, rain: 0.7, storm: 1 }[weather.sky as 'drizzle'] : 0} />
      {/* the hour's light */}
      <div aria-hidden className="absolute inset-0 mix-blend-multiply transition-colors duration-1000" style={{ background: 'var(--grade)' }} />
      {/* legibility: soft veil behind the title, deeper water behind the button */}
      <div aria-hidden className="absolute inset-0" style={{ background: night
        ? 'linear-gradient(180deg, rgba(6,14,28,.55) 0%, rgba(6,14,28,.15) 45%, rgba(6,14,28,.6) 100%)'
        : 'linear-gradient(180deg, rgba(255,246,230,.55) 0%, rgba(255,246,230,0) 42%, rgba(6,20,29,0) 62%, rgba(6,20,29,.45) 100%)' }} />
      {night && weather.sky === 'clear' && (
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 26 }).map((_, i) => (
            <span key={i} className="glint absolute rounded-full bg-white" style={{ width: (i % 3) + 1.5, height: (i % 3) + 1.5, left: ((i * 37) % 100) + '%', top: 2 + ((i * 23) % 30) + '%', opacity: 0.8, ['--d' as string]: 2.5 + (i % 5) + 's' }} />
          ))}
        </div>
      )}

      {/* the weather at the lake right now, and fireflies on a clear night */}
      <SkyOver weather={weather} night={night} phase={light.phase} />

      {/* top bar: logo and open state */}
      <div className="edge relative z-10 flex items-center justify-between gap-3 px-5 pt-[max(18px,env(safe-area-inset-top))]">
        <img src="/assets/logo.jpg" alt="La Playa Blanca logo" className="size-12 rounded-[14px] object-cover shadow-[0_8px_24px_rgba(0,0,0,.18)]" />
        <div className="glass3d flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold text-[#F6EFDF] [--glass-tint:hsl(200_70%_8%/.35)]">
          {open ? (
            <span className="flex items-center gap-2">
              <span className={'size-2 rounded-full ' + (open.open ? 'bg-[#3FB37F] shadow-[0_0_0_4px_rgba(63,179,127,.25)]' : 'bg-[#D9566B]')} />
              {open.open ? 'Open now · till ' + open.until : 'Closed now' + (open.opens ? ' · opens ' + open.opens : '')}
            </span>
          ) : (
            <span>{hours}</span>
          )}
        </div>
      </div>

      {/* title, in the open sky */}
      <div className={'edge relative z-10 px-6 pt-[9svh] ' + (night ? 'text-[#F6EFDF]' : 'text-[#103A47]')}>
        <p style={{ animationDelay: '0.05s' }} className="rise text-[13px] font-bold uppercase tracking-[.22em] opacity-80">Qaraaoun · West Bekaa</p>
        <h1 style={{ animationDelay: '0.12s', color: night ? '#F9F6E3' : '#007385' }} className="rise mt-3 font-brand font-extrabold uppercase leading-[.92] tracking-[.02em] text-[clamp(50px,14.5vw,104px)]">
          La Playa<br />Blanca
        </h1>
        <p style={{ animationDelay: '0.22s', color: night ? '#E2C27A' : '#0F4B5C' }} className="rise mt-3 font-serif text-[clamp(24px,6.6vw,34px)] font-medium leading-tight tracking-[-.01em]">
          Nos vemos en la playa
        </p>
        <p style={{ animationDelay: '0.3s' }} className="rise mt-5 max-w-[30ch] text-[17px] font-medium leading-snug">
          Crepes, waffles, boba and shakes on the white-sand shore of the lake.
        </p>
      </div>

      {/* the categories, floating just above the waterline */}
      <div className="absolute inset-x-0 bottom-[34px] z-10 flex flex-col gap-2.5">
        <div className="edge px-5">
          <p className="glass3d inline-block rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[#F6EFDF] [--glass-tint:hsl(200_70%_8%/.3)]">
            <span>{light.clock} · {weather.label || light.label}{count ? ' · ' + count + ' to try' : ''}</span>
          </p>
        </div>
        {cats.length > 0 && (
          <nav aria-label="Jump to a category" className="edge bubbles flex gap-2.5 overflow-x-auto px-5 pb-3 pt-2 [scrollbar-width:none]">
            {cats.map((c, i) => (
              <button key={c.key} onClick={() => onPick(c.key)} style={{ ['--i' as string]: i }}
                className="bubble h-11 shrink-0 rounded-full bg-[#F9F6E3]/92 px-4 font-brand text-[14px] font-bold uppercase tracking-[.06em] text-[#007385] shadow-[0_10px_24px_rgba(3,25,33,.28)] active:scale-95 transition-transform">
                {c.name.toLowerCase().replace(/(^|\s)\p{L}/gu, (m) => m.toUpperCase())}
              </button>
            ))}
          </nav>
        )}
      </div>
      </div>
    </header>
  );
}
