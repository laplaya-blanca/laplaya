import { useState, type FormEvent } from 'react';
import type { Site } from '../lib/content';
import { Ripple, useAfloat } from './Menu';
import { Hello, Signature, TreasureMap } from './Ashore';

// Web3Forms inbox key (same form the previous site used); submissions are emailed to the owner.
const WEB3FORMS_KEY = '19a9ec05-db69-4d4a-8f08-ef419353d7ab';

const OFFERS = [
  ['Weddings & engagements', 'Lakeside receptions and after-parties styled around your palette.'],
  ['Birthdays & private parties', 'A dessert spread that steals the night.'],
  ['Corporate & catering', 'Live crepe and waffle stations and boba bars, anywhere in the Bekaa.']
];

export function Events({ site }: { site: Site | null }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState('');
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    setState('sending'); setErr('');
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) });
      const j = await r.json();
      if (j && j.success) setState('sent');
      else { setState('error'); setErr((j && j.message) || 'Something went wrong — please try again.'); }
    } catch {
      setState('error'); setErr('Network hiccup — please try again, or message us on WhatsApp.');
    }
  };
  const ig = site?.contact.instagram;
  // fields are panes of the same glass: a little clearer than the card, the water still moving through them
  const field = 'pane mt-1.5 h-13 w-full rounded-2xl px-4 text-[17px] font-semibold normal-case tracking-normal text-[#F9F6E3] [text-shadow:none] placeholder:font-normal placeholder:text-[#F9F6E3]/75 outline-none';
  const label = 'text-[13px] font-extrabold uppercase tracking-[.14em] text-[#F9F6E3]/85';
  const glass = useAfloat<HTMLDivElement>();
  return (
    <section id="events" aria-labelledby="events-h" className="on-water mt-16">
      <div className="relative h-[52svh] min-h-[340px] overflow-hidden">
        <img src="/assets/events-aisle.jpg" alt="A wedding aisle set up on the white sand by the lake" loading="lazy" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,20,29,.1), rgba(6,20,29,.75))' }} />
        <div className="absolute inset-x-0 bottom-0 p-6 text-[#FBF6EA]">
          <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--glint)]">Events & catering</p>
          <h2 id="events-h" className="mt-2 font-brand text-[clamp(34px,10vw,52px)] font-extrabold uppercase leading-[.95] tracking-[.02em] text-[#F9F6E3]">Celebrate on the shore</h2>
          <p className="mt-2 max-w-[34ch] text-[16px] leading-snug text-[#FBF6EA]/90">Tell us about your day and we’ll build something sweet around it.</p>
        </div>
      </div>
      <div className="px-5">
        <ul className="mt-6 divide-y divide-[var(--line)]">
          {OFFERS.map(([t, d]) => (
            <li key={t} className="py-4">
              <p className="font-serif text-[22px] font-semibold leading-tight">{t}</p>
              <p className="mt-1 text-[15px] leading-snug text-[var(--ink-soft)]">{d}</p>
            </li>
          ))}
        </ul>
        <div ref={glass}>
        {state === 'sent' ? (
          <div role="status" className="tidepool glass3d mt-6 rounded-[28px] p-7 text-center">
            <span aria-hidden className="sheen" />
            <p tabIndex={-1} ref={(el) => el?.focus()} className="font-brand text-[28px] font-extrabold uppercase leading-none tracking-[.02em] text-[#F9F6E3]">Gracias!</p>
            <p className="mt-3 text-[16px] text-[#F9F6E3]/85">Inquiry sent. We’ll be in touch soon to plan it with you.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="tidepool glass3d mt-6 rounded-[28px] p-5 pt-6">
            <span aria-hidden className="sheen" />
            <p className="mb-5 font-brand text-[22px] font-extrabold uppercase leading-none tracking-[.03em] text-[#F9F6E3]">Plan it with us</p>
            <input type="hidden" name="access_key" value={WEB3FORMS_KEY} />
            <input type="hidden" name="subject" value="New Events & Catering inquiry — La Playa Blanca" />
            <input type="hidden" name="from_name" value="La Playa Blanca website" />
            <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
            <div className="grid gap-4">
              <label className={label}>Your name<input className={field} name="name" required autoComplete="name" /></label>
              <label className={label}>Phone / WhatsApp<input className={field} name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="+961 …" /></label>
              <label className={label}>Email <span className="font-semibold normal-case tracking-normal text-[#F9F6E3]/85">(optional)</span><input className={field} name="email" type="email" autoComplete="email" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>Event
                  <select className={field + ' pick pr-10 [&>option]:text-[#123F4D]'} name="event_type" defaultValue="Wedding">
                    {['Wedding', 'Engagement', 'Birthday', 'Private party', 'Corporate event', 'Something else'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
                <label className={label}>Guests<input className={field} name="guests" type="number" min="1" inputMode="numeric" placeholder="80" /></label>
              </div>
              <label className={label}>Date<input className={field + ' [color-scheme:dark]'} name="event_date" type="date" /></label>
              <label className={label}>Tell us about it<textarea className={field + ' h-28 py-3'} name="message" placeholder="Location, vibe, crepe station, boba bar…" /></label>
            </div>
            {state === 'error' && <p role="alert" className="mt-4 rounded-2xl bg-[#D9566B]/25 px-4 py-3 text-[15px] font-semibold text-[#FFE3E6]">{err}</p>}
            <button disabled={state === 'sending'} className="splash mt-6 h-14 w-full rounded-full bg-[#F9F6E3] font-brand text-[17px] font-extrabold uppercase tracking-[.06em] text-[#007385] [text-shadow:none] shadow-[0_10px_26px_rgba(3,20,26,.35)] transition-transform active:scale-[.98] disabled:opacity-60">
              {state === 'sending' ? 'Sending…' : 'Send inquiry'}
            </button>
            <p className="mt-3 text-center text-[14px] text-[#F9F6E3]/75">We usually reply within a day{ig ? <> — or reach us on <a className="font-bold underline" href={'https://instagram.com/' + encodeURIComponent(ig)} target="_blank" rel="noopener">Instagram</a></> : null}.</p>
          </form>
        )}
        </div>
      </div>
    </section>
  );
}

// flecks of light down the glitter path: sideways offset and width (px), wider and looser toward the viewer
const GLITTER = [[2, 10], [-4, 16], [5, 12], [-2, 24], [7, 18], [-8, 30], [3, 22], [-5, 38], [9, 26], [-3, 46], [6, 34], [-9, 52]];

export function Footer({ site }: { site: Site | null }) {
  const c = site?.contact, h = site?.hours;
  const filled = h?.weekly?.some((w) => w.closed || (w.open && w.close));
  const shore = useAfloat<HTMLElement>();
  const maps = 'https://www.google.com/maps/search/?api=1&query=La+Playa+Blanca+Qaraoun';
  // The page comes ashore: the tide rolls in over the moving water (two swells drifting out of step, foam on the
  // front one) and the deep water beneath carries the sign-off. Light lies on it in a glittering path, the sun's by
  // day and the moon's after dark. Everything moves only while the footer is on screen.
  return (
    <footer ref={shore} className="shore relative mt-28 px-6 pb-[calc(var(--dock-h)+48px)] pt-16"
      style={{ background: 'linear-gradient(180deg, var(--sea-2) 0, var(--sea-3) 180px, color-mix(in srgb, var(--sea-3) 55%, #06141d) 100%)' }}>
      <div aria-hidden className="tide">
        <svg className="swell back" viewBox="0 0 1200 80" preserveAspectRatio="none"><path d="M0 46 C150 16 300 16 450 46 S750 76 900 46 S1050 16 1200 46 V80 H0Z" /></svg>
        <svg className="swell front" viewBox="0 0 1200 80" preserveAspectRatio="none">
          <path d="M0 52 C100 30 200 30 300 52 S500 74 600 52 S800 30 900 52 S1100 74 1200 52 V80 H0Z" />
          <path className="foam" d="M0 52 C100 30 200 30 300 52 S500 74 600 52 S800 30 900 52 S1100 74 1200 52" />
        </svg>
      </div>
      <div aria-hidden className="glitter">{GLITTER.map(([x, w], i) => <span key={i} style={{ ['--g' as string]: i, ['--x' as string]: x, ['--w' as string]: w }} />)}</div>
      <p className="relative font-brand text-[clamp(38px,11.5vw,60px)] font-extrabold uppercase leading-[.92] tracking-[.015em] text-[#F9F6E3]"><Ripple text="Nos vemos en la playa" /></p>
      <p className="relative mt-3 text-[16px] text-[#F9F6E3]">See you at the beach.</p>
      <div className="relative mt-10 grid gap-8 text-[#F3ECDD]">
        <TreasureMap href={maps} />
        <div className="drift" style={{ ['--i' as string]: 1 }}>
          <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--glint)]">Hours</p>
          {filled ? (
            <ul className="mt-2 text-[16px]">
              {h!.weekly.map((w) => <li key={w.day} className="flex justify-between py-0.5"><span>{w.day}</span><span className="tabular-nums">{w.closed ? 'Closed' : w.open + ' – ' + w.close}</span></li>)}
            </ul>
          ) : (
            <p className="mt-2 font-serif text-[22px] font-semibold">{h?.headline || 'Daily, in season'}<span className="block font-sans text-[16px] font-normal">{h?.subline}</span></p>
          )}
          {h?.note && <p className="mt-2 text-[14px] opacity-80">{h.note}</p>}
        </div>
        {c && <Hello c={c} />}
      </div>
      {/* sign-off: the house, then the maker's signature, set apart by a hairline */}
      <div className="relative mt-14 flex flex-col items-center text-center text-[#F3ECDD]">
        <img src="/assets/logo.jpg" alt="" className="size-12 rounded-[14px] object-cover opacity-90" loading="lazy" />
        <p className="mt-3 text-[12px] font-bold uppercase tracking-[.22em] text-[#F3ECDD]/90">© {new Date().getFullYear()} La Playa Blanca · Qaraaoun</p>
        <div aria-hidden className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[var(--glint)]/60 to-transparent" />
        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[.3em] text-[var(--glint)]/80">Crafted by</p>
        <Signature />
      </div>
    </footer>
  );
}
