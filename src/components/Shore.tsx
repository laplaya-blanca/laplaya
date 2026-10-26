import type { Light } from '../lib/time';
import { img } from '../lib/content';

type Open = { open: true; until: string } | { open: false; opens: string } | null;

// First screen: a photograph of the shore, graded to the hour it is in Qaraaoun right now
// (cool morning, untouched golden hour, rose sunset, blue night with a moon and stars).
// One tap (or a normal scroll) takes you straight into the menu underneath — no preloader, no scroll-jacking.
export function Shore({ light, open, hours, count, onEnter }: { light: Light; open: Open; hours: string; count: number; onEnter: () => void }) {
  const night = light.dark;
  const shot = night ? 'night' : 'lake'; // a real night photo after dark, the golden-hour shore otherwise
  return (
    <header className="relative min-h-[100svh] overflow-hidden flex flex-col bg-[var(--sea-3)]">
      <picture aria-hidden>
        <source media="(min-width: 768px)" srcSet={img('/assets/hero-' + shot + '-wide.jpg', 2048)} />
        <img src={img('/assets/hero-' + shot + '-tall.jpg', 1080)} alt="" {...{ fetchpriority: 'high' }} decoding="async" className="absolute inset-0 size-full object-cover" />
      </picture>
      {/* the hour's light */}
      <div aria-hidden className="absolute inset-0 mix-blend-multiply transition-colors duration-1000" style={{ background: 'var(--grade)' }} />
      {/* legibility: soft veil behind the title, deeper water behind the button */}
      <div aria-hidden className="absolute inset-0" style={{ background: night
        ? 'linear-gradient(180deg, rgba(6,14,28,.55) 0%, rgba(6,14,28,.15) 45%, rgba(6,14,28,.6) 100%)'
        : 'linear-gradient(180deg, rgba(255,246,230,.55) 0%, rgba(255,246,230,0) 42%, rgba(6,20,29,0) 62%, rgba(6,20,29,.45) 100%)' }} />
      {night && (
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 26 }).map((_, i) => (
            <span key={i} className="glint absolute rounded-full bg-white" style={{ width: (i % 3) + 1.5, height: (i % 3) + 1.5, left: ((i * 37) % 100) + '%', top: 2 + ((i * 23) % 30) + '%', opacity: 0.8, ['--d' as string]: 2.5 + (i % 5) + 's' }} />
          ))}
        </div>
      )}

      {/* top bar: logo and open state */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-5 pt-[max(18px,env(safe-area-inset-top))]">
        <img src="/assets/logo.jpg" alt="La Playa Blanca logo" className="size-12 rounded-[14px] object-cover shadow-[0_8px_24px_rgba(0,0,0,.18)]" />
        <div className="glass3d flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold text-[#F6EFDF] [--color-glass3d:hsl(200_70%_8%/.35)]">
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
      <div className={'relative z-10 px-6 pt-[9svh] ' + (night ? 'text-[#F6EFDF]' : 'text-[#103A47]')}>
        <p style={{ animationDelay: '0.05s' }} className="rise text-[13px] font-bold uppercase tracking-[.22em] opacity-80">Qaraaoun · West Bekaa</p>
        <h1 style={{ animationDelay: '0.12s' }} className="rise mt-3 font-serif font-semibold leading-[.9] tracking-[-.02em] text-[clamp(58px,17vw,112px)]">
          La Playa<br /><em className="font-medium">Blanca</em>
        </h1>
        <p style={{ animationDelay: '0.22s', color: night ? '#E8C98E' : '#A2531F' }} className="rise mt-2 font-script text-[clamp(40px,11vw,64px)] leading-none">
          Nos vemos en la playa
        </p>
        <p style={{ animationDelay: '0.3s' }} className="rise mt-5 max-w-[30ch] text-[17px] font-medium leading-snug">
          Crêpes, waffles, boba and shakes on the white-sand shore of the lake.
        </p>
      </div>

      {/* enter */}
      <div className="absolute inset-x-0 bottom-[max(22px,env(safe-area-inset-bottom))] z-10 flex flex-col items-center gap-2.5 px-6">
        <button onClick={onEnter} className="group flex h-14 items-center gap-3 rounded-full bg-[var(--amber)] pl-7 pr-2 text-[17px] font-extrabold text-[var(--amber-ink)] shadow-[0_14px_34px_rgba(232,164,76,.45)] active:scale-[.97] transition-transform">
          Wade into the menu
          <span className="grid size-10 place-items-center rounded-full bg-[var(--amber-ink)] text-[var(--amber)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
          </span>
        </button>
        <p className="glass3d rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-[#F6EFDF] [--color-glass3d:hsl(200_70%_8%/.3)]">
          <span>{light.label} · {light.clock} on the lake{count ? ' · ' + count + ' things to try' : ''}</span>
        </p>
      </div>
    </header>
  );
}
