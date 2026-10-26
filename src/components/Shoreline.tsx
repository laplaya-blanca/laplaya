import { useState, type FormEvent } from 'react';
import type { Site } from '../lib/content';

// Web3Forms inbox key (same form the previous site used); submissions are emailed to the owner.
const WEB3FORMS_KEY = '19a9ec05-db69-4d4a-8f08-ef419353d7ab';

const OFFERS = [
  ['Weddings & engagements', 'Lakeside receptions and after-parties styled around your palette.'],
  ['Birthdays & private parties', 'A dessert spread that steals the night.'],
  ['Corporate & catering', 'Live crêpe and waffle stations and boba bars, anywhere in the Bekaa.']
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
  const field = 'mt-1.5 h-13 w-full rounded-2xl border border-[var(--line)] bg-[var(--paper)] px-4 text-[17px] outline-none focus:border-[var(--sea-2)] focus:ring-2 focus:ring-[var(--sea-2)]/30';
  return (
    <section id="events" aria-labelledby="events-h" className="mt-16">
      <div className="relative h-[52svh] min-h-[340px] overflow-hidden">
        <img src="/assets/events-aisle.jpg" alt="A wedding aisle set up on the white sand by the lake" loading="lazy" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,20,29,.1), rgba(6,20,29,.75))' }} />
        <div className="absolute inset-x-0 bottom-0 p-6 text-[#FBF6EA]">
          <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--glint)]">Events & catering</p>
          <h2 id="events-h" className="mt-2 font-serif text-[42px] font-semibold leading-[.98]">Celebrate on the shore</h2>
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
        {state === 'sent' ? (
          <div role="status" className="mt-6 rounded-[26px] bg-[var(--paper)] p-6 text-center">
            <p className="font-serif text-[30px] font-semibold">Inquiry sent — gracias!</p>
            <p className="mt-2 text-[16px] text-[var(--ink-soft)]">We’ll be in touch soon to plan it with you.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 rounded-[26px] bg-[var(--paper-2)] p-5">
            <input type="hidden" name="access_key" value={WEB3FORMS_KEY} />
            <input type="hidden" name="subject" value="New Events & Catering inquiry — La Playa Blanca" />
            <input type="hidden" name="from_name" value="La Playa Blanca website" />
            <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden />
            <div className="grid gap-4">
              <label className="text-[14px] font-bold">Your name<input className={field} name="name" required autoComplete="name" /></label>
              <label className="text-[14px] font-bold">Phone / WhatsApp<input className={field} name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="+961 …" /></label>
              <label className="text-[14px] font-bold">Email <span className="font-normal text-[var(--ink-soft)]">(optional)</span><input className={field} name="email" type="email" autoComplete="email" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-[14px] font-bold">Event
                  <select className={field} name="event_type" defaultValue="Wedding">
                    {['Wedding', 'Engagement', 'Birthday', 'Private party', 'Corporate event', 'Something else'].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </label>
                <label className="text-[14px] font-bold">Guests<input className={field} name="guests" type="number" min="1" inputMode="numeric" placeholder="80" /></label>
              </div>
              <label className="text-[14px] font-bold">Date<input className={field} name="event_date" type="date" /></label>
              <label className="text-[14px] font-bold">Tell us about it<textarea className={field + ' h-28 py-3'} name="message" placeholder="Location, vibe, crêpe station, boba bar…" /></label>
            </div>
            {state === 'error' && <p role="alert" className="mt-4 rounded-2xl bg-[var(--coral)]/12 px-4 py-3 text-[15px] font-semibold text-[var(--coral)]">{err}</p>}
            <button disabled={state === 'sending'} className="mt-5 h-14 w-full rounded-full bg-[var(--accent)] text-[17px] font-extrabold text-[var(--accent-ink)] disabled:opacity-60">
              {state === 'sending' ? 'Sending…' : 'Send inquiry'}
            </button>
            <p className="mt-3 text-center text-[14px] text-[var(--ink-soft)]">We usually reply within a day{ig ? <> — or reach us on <a className="font-bold underline" href={'https://instagram.com/' + encodeURIComponent(ig)} target="_blank" rel="noopener">Instagram</a></> : null}.</p>
          </form>
        )}
      </div>
    </section>
  );
}

export function Footer({ site }: { site: Site | null }) {
  const c = site?.contact, h = site?.hours;
  const filled = h?.weekly?.some((w) => w.closed || (w.open && w.close));
  return (
    <footer className="mt-10 px-6 pb-[calc(var(--dock-h)+48px)] pt-28"
      style={{ background: 'linear-gradient(180deg, var(--water) 0, var(--sea-2) 96px, var(--sea-3) 220px, color-mix(in srgb, var(--sea-3) 55%, #06141d) 100%)' }}>
      <p className="font-script text-[58px] leading-none text-[var(--glint)]">Nos vemos en la playa</p>
      <p className="mt-2 text-[16px] text-[#F3ECDD]/85">See you at the beach.</p>
      <div className="mt-10 grid gap-8 text-[#F3ECDD]">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--glint)]">Find us</p>
          <p className="mt-2 font-serif text-[22px] font-semibold">Qaraaoun, West Bekaa</p>
          <a className="mt-1 inline-block text-[16px] font-bold underline underline-offset-4" href="https://www.google.com/maps/search/?api=1&query=La+Playa+Blanca+Qaraoun" target="_blank" rel="noopener">Open in Maps</a>
        </div>
        <div>
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
        {c && (
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--glint)]">Say hello</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a className="flex h-11 items-center rounded-full bg-white/12 px-4 font-bold" href={'tel:' + c.phone.replace(/[^\d+]/g, '')}>{c.phone}</a>
              <a className="flex h-11 items-center rounded-full bg-white/12 px-4 font-bold" href={'https://wa.me/' + String(c.whatsapp).replace(/\D/g, '')} target="_blank" rel="noopener">WhatsApp</a>
              <a className="flex h-11 items-center rounded-full bg-white/12 px-4 font-bold" href={'https://instagram.com/' + encodeURIComponent(c.instagram)} target="_blank" rel="noopener">@{c.instagram}</a>
            </div>
          </div>
        )}
      </div>
      {/* sign-off: the house, then the maker's signature, set apart by a hairline */}
      <div className="mt-14 flex flex-col items-center text-center text-[#F3ECDD]">
        <img src="/assets/logo.jpg" alt="" className="size-12 rounded-[14px] object-cover opacity-90" loading="lazy" />
        <p className="mt-3 text-[12px] font-bold uppercase tracking-[.22em] text-[#F3ECDD]/70">© {new Date().getFullYear()} La Playa Blanca · Qaraaoun</p>
        <div aria-hidden className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[var(--glint)]/60 to-transparent" />
        <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[.3em] text-[var(--glint)]/80">Crafted by</p>
        <p className="mt-1 font-serif text-[24px] italic font-medium tracking-[-.01em]">Mohammad Yassin</p>
      </div>
    </footer>
  );
}
