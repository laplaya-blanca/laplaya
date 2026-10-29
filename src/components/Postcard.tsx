import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { img, money } from '../lib/content';
import type { Line } from '../lib/cart';
import { Sheet } from './Sheet';

// The order as a postcard from the lake. It arrives picture side up (the shore as it looks right now, by day or by
// night) and turns over by itself to the back: the order in ink, the logo as the stamp, postmarked Qaraaoun with the
// date and time. That side is what you hold up at the counter. "Keep the postcard" draws both sides side by side into
// an image to share (WhatsApp, Instagram…) or save.

const INK = '#14586B';
const when = () => {
  const d = new Date(), tz = { timeZone: 'Asia/Beirut' } as const;
  return {
    time: new Intl.DateTimeFormat('en-GB', { ...tz, hour: '2-digit', minute: '2-digit' }).format(d),
    date: new Intl.DateTimeFormat('en-GB', { ...tz, day: 'numeric', month: 'short', year: 'numeric' }).format(d).toUpperCase()
  };
};
const photoFor = (night: boolean) => img('/assets/hero-' + (night ? 'night' : 'lake') + '-wide.jpg', 1200);

export function Postcard({ lines, total, unpriced, night, onClose, onPlay }: { lines: Line[]; total: number; unpriced: boolean; night: boolean; onClose: () => void; onPlay: () => void }) {
  const still = useReducedMotion();
  const [back, setBack] = useState(!!still);
  const [saving, setSaving] = useState(false);
  const { time, date } = when();
  // turn over on its own once it has landed, so you see both sides
  useEffect(() => { if (still) return; const t = setTimeout(() => setBack(true), 900); return () => clearTimeout(t); }, [still]);

  const keep = async () => {
    setSaving(true);
    try {
      const blob = await draw({ lines, total, unpriced, night, time, date });
      const file = new File([blob], 'la-playa-blanca-postcard.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'La Playa Blanca', text: 'Nos vemos en la playa 🌴' }).catch(() => {});
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } finally { setSaving(false); }
  };

  return (
    <Sheet label="Your postcard" onClose={onClose}>
      <div className="px-5 pb-2">
        <p className="sr-only" data-autofocus tabIndex={-1}>Your order, as a postcard to show at the counter</p>
        <button onClick={() => setBack((b) => !b)} aria-label={back ? 'Turn the postcard to the picture' : 'Turn the postcard to the order'}
          className="block w-full text-left [perspective:1400px]">
          <div className="grid transition-transform duration-700 [transform-style:preserve-3d] [transition-timing-function:cubic-bezier(.3,1.25,.5,1)]"
            style={{ transform: back ? 'rotateY(180deg)' : 'none' }}>
            <Front night={night} />
            <Back lines={lines} total={total} unpriced={unpriced} time={time} date={date} />
          </div>
        </button>
        <p className="mt-3 text-center text-[14px] font-semibold text-[var(--ink-soft)]">{back ? 'Show this side at the counter. Tap the card to turn it over.' : 'Tap the card to turn it over.'}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={keep} disabled={saving} className="h-12 rounded-full bg-[var(--accent)] font-extrabold text-[var(--accent-ink)] shadow-[0_10px_24px_var(--accent-glow)] transition-transform active:scale-[.98] disabled:opacity-60">
            {saving ? 'Drawing it…' : 'Keep the postcard'}
          </button>
          <button onClick={onClose} className="h-12 rounded-full bg-[var(--paper-2)] font-extrabold">Done</button>
        </div>
        {/* the order's in: something for the table while it's made */}
        <button onClick={onPlay} className="mx-auto mt-3 flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-bold text-[var(--ink-soft)] active:scale-[.98] transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden><rect x="4" y="4" width="16" height="16" rx="4.5" /><g fill="currentColor" stroke="none"><circle cx="8.6" cy="8.6" r="1.45" /><circle cx="12" cy="12" r="1.45" /><circle cx="15.4" cy="15.4" r="1.45" /></g></svg>
          While you wait: a game for the table
        </button>
      </div>
    </Sheet>
  );
}

// picture side: the shore in a cream border, "Greetings from" over it in the logo's lettering
function Front({ night }: { night: boolean }) {
  return (
    <div className="[grid-area:1/1] [backface-visibility:hidden] rounded-[14px] bg-[#FBF8EE] p-2.5 shadow-[0_18px_40px_rgba(6,20,29,.28)]">
      <div className="relative h-full min-h-[210px] overflow-hidden rounded-[8px]">
        <img src={photoFor(night)} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(6,20,29,.35), rgba(6,20,29,0) 45%, rgba(6,20,29,.45))' }} />
        <div className="relative flex h-full flex-col justify-between p-4 text-[#F9F6E3] [text-shadow:0_2px_10px_rgba(3,20,26,.5)]">
          <div>
            <p className="font-serif text-[20px] italic leading-none">Greetings from</p>
            <p className="mt-1 font-brand text-[clamp(30px,9vw,44px)] font-extrabold uppercase leading-[.9] tracking-[.02em] [text-shadow:3px_3px_0_#007385,0_4px_14px_rgba(3,20,26,.5)]">La Playa<br />Blanca</p>
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.22em]">Qaraaoun · West Bekaa</p>
        </div>
      </div>
    </div>
  );
}

// the stamp: the logo on perforated paper
function Stamp() {
  return (
    <span className="relative block rotate-3 p-[5px] [filter:drop-shadow(0_2px_3px_rgba(6,20,29,.25))]"
      style={{ background: 'radial-gradient(circle at 4px 4px, transparent 2.6px, #fff 3px) -4px -4px / 8px 8px' }}>
      <img src="/assets/logo.jpg" alt="" className="block size-14 object-cover" />
    </span>
  );
}

// the postmark: a ring with the place and date, and wavy cancel lines running off it across the stamp
function Postmark({ date, time }: { date: string; time: string }) {
  return (
    <svg viewBox="0 0 150 76" className="pointer-events-none absolute left-0 top-9 w-[124px] opacity-75" aria-hidden>
      <g fill="none" stroke={INK} strokeWidth="1.6">
        <circle cx="38" cy="38" r="33" /><circle cx="38" cy="38" r="24" strokeWidth="1" />
        {[26, 34, 42, 50].map((y) => <path key={y} d={`M76 ${y} q8 -5 16 0 t16 0 t16 0 t16 0`} />)}
      </g>
      <defs><path id="pm-top" d="M10 38 a28 28 0 0 1 56 0" /><path id="pm-bot" d="M12 40 a26 26 0 0 0 52 0" /></defs>
      <g fill={INK} fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="7.4" letterSpacing="1.4">
        <text><textPath href="#pm-top" startOffset="50%" textAnchor="middle">QARAAOUN</textPath></text>
        <text><textPath href="#pm-bot" startOffset="50%" textAnchor="middle" dominantBaseline="hanging">{date}</textPath></text>
        <text x="38" y="41" textAnchor="middle" fontSize="9">{time}</text>
      </g>
    </svg>
  );
}

function Back({ lines, total, unpriced, time, date }: { lines: Line[]; total: number; unpriced: boolean; time: string; date: string }) {
  return (
    <div className="grain relative [grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-[14px] bg-[#FBF8EE] p-5 text-[#14586B] shadow-[0_18px_40px_rgba(6,20,29,.28)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-extrabold uppercase tracking-[.18em] text-[#14586B]/65">Beach pickup · {time}</p>
          <p className="mt-1.5 font-serif text-[22px] italic leading-tight">Wish you were here.<br />Here’s what I’m having:</p>
        </div>
        <div className="relative shrink-0 pl-9 pb-6"><Stamp /><Postmark date={date} time={time} /></div>
      </div>
      <ul className="mt-4">
        {lines.map((l) => (
          <li key={l.item.id} className="flex items-baseline gap-3 border-b border-[#14586B]/20 py-1.5">
            <span className="w-8 shrink-0 text-[18px] font-extrabold tabular-nums">{l.qty}×</span>
            <span className="min-w-0 flex-1 font-serif text-[21px] font-semibold leading-tight">{l.item.name}<span className="block font-sans text-[12px] font-bold uppercase tracking-[.12em] text-[#14586B]/60">{l.item.cat}</span></span>
            {l.item.price != null && <span className="text-[16px] font-bold tabular-nums">{money(l.item.price * l.qty)}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline justify-between"><span className="text-[15px] font-bold">Total</span><span className="font-serif text-[28px] font-semibold tabular-nums">{money(total) || '$0'}{unpriced ? ' +' : ''}</span></p>
      <div className="mt-3 border-t-2 border-dashed border-[#14586B]/25 pt-3 text-right font-serif text-[15px] italic leading-relaxed">
        To the beach counter, La Playa Blanca<br />Qaraaoun, West Bekaa
      </div>
    </div>
  );
}

// ---------- the keepsake image: both sides side by side, drawn on a canvas ----------
const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

async function draw({ lines, total, unpriced, night, time, date }: { lines: Line[]; total: number; unpriced: boolean; night: boolean; time: string; date: string }) {
  await document.fonts.ready;
  const [photo, logo] = await Promise.all([load(photoFor(night)), load('/assets/logo.jpg')]);
  const S = 900, H = Math.max(600, 330 + lines.length * 62); // each side
  const c = document.createElement('canvas');
  c.width = S * 2 + 60; c.height = H + 60;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0F2A3B'; g.fillRect(0, 0, c.width, c.height);
  const card = (x: number) => { g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 30; g.shadowOffsetY = 12; g.fillStyle = '#FBF8EE'; round(g, x, 30, S, H, 22); g.fill(); g.restore(); };

  // picture side
  card(20);
  g.save(); round(g, 38, 48, S - 36, H - 36, 12); g.clip();
  const r = Math.max((S - 36) / photo.width, (H - 36) / photo.height), pw = photo.width * r, ph = photo.height * r;
  g.drawImage(photo, 38 + (S - 36 - pw) / 2, 48 + (H - 36 - ph) / 2, pw, ph);
  const v = g.createLinearGradient(0, 48, 0, H + 12); v.addColorStop(0, 'rgba(6,20,29,.35)'); v.addColorStop(.45, 'rgba(6,20,29,0)'); v.addColorStop(1, 'rgba(6,20,29,.45)');
  g.fillStyle = v; g.fillRect(38, 48, S - 36, H - 36);
  g.restore();
  g.fillStyle = '#F9F6E3'; g.shadowColor = 'rgba(3,20,26,.5)'; g.shadowBlur = 14;
  g.font = 'italic 400 44px Fraunces, Georgia, serif'; g.fillText('Greetings from', 74, 118);
  g.font = '800 104px Rubik, Manrope, sans-serif';
  for (const [t, y] of [['LA PLAYA', 222], ['BLANCA', 316]] as const) { g.shadowBlur = 0; g.fillStyle = '#007385'; g.fillText(t, 80, y + 6); g.fillStyle = '#F9F6E3'; g.fillText(t, 74, y); }
  g.font = '800 22px Manrope, sans-serif'; g.shadowBlur = 10; spaced(g, 'QARAAOUN · WEST BEKAA', 74, H - 10, 5);
  g.shadowBlur = 0;

  // order side
  const x0 = S + 40;
  card(x0);
  g.fillStyle = INK;
  g.font = '800 20px Manrope, sans-serif'; g.globalAlpha = .65; spaced(g, 'BEACH PICKUP · ' + time, x0 + 44, 104, 3.5); g.globalAlpha = 1;
  g.font = 'italic 400 38px Fraunces, Georgia, serif'; g.fillText('Wish you were here.', x0 + 44, 158); g.fillText('Here’s what I’m having:', x0 + 44, 204);
  // stamp and postmark
  const sx = x0 + S - 170, sy = 62;
  g.save(); g.translate(sx + 60, sy + 60); g.rotate(.05);
  g.fillStyle = '#fff'; g.fillRect(-62, -62, 124, 124);
  g.fillStyle = '#FBF8EE'; for (let i = -62; i <= 62; i += 12) for (const [px, py] of [[i, -62], [i, 62], [-62, i], [62, i]]) { g.beginPath(); g.arc(px, py, 4.5, 0, 6.283); g.fill(); }
  g.drawImage(logo, -50, -50, 100, 100); g.restore();
  g.save(); g.strokeStyle = INK; g.fillStyle = INK; g.globalAlpha = .7; g.lineWidth = 3;
  g.beginPath(); g.arc(sx - 64, sy + 66, 62, 0, 6.283); g.stroke(); g.lineWidth = 1.8; g.beginPath(); g.arc(sx - 64, sy + 66, 46, 0, 6.283); g.stroke();
  g.lineWidth = 3; for (const y of [40, 56, 72, 88]) { g.beginPath(); g.moveTo(sx + 34, sy + y); for (let k = 0; k < 8; k++) g.quadraticCurveTo(sx + 42 + k * 16, sy + y + (k % 2 ? 8 : -8), sx + 50 + k * 16, sy + y); g.stroke(); }
  g.textAlign = 'center'; g.font = '800 15px Manrope, sans-serif'; g.fillText('QARAAOUN', sx - 64, sy + 50); g.font = '800 20px Manrope, sans-serif'; g.fillText(time, sx - 64, sy + 74); g.font = '800 13px Manrope, sans-serif'; g.fillText(date, sx - 64, sy + 94);
  g.restore(); g.textAlign = 'left';
  // the order
  let y = 270;
  for (const l of lines) {
    g.fillStyle = INK; g.font = '800 30px Manrope, sans-serif'; g.fillText(l.qty + '×', x0 + 44, y + 10);
    g.font = '600 36px Fraunces, Georgia, serif'; g.fillText(fit(g, l.item.name, S - 300), x0 + 110, y + 10);
    if (l.item.price != null) { g.font = '700 28px Manrope, sans-serif'; g.textAlign = 'right'; g.fillText(money(l.item.price * l.qty), x0 + S - 44, y + 10); g.textAlign = 'left'; }
    g.globalAlpha = .2; g.fillRect(x0 + 44, y + 28, S - 88, 2); g.globalAlpha = 1;
    y += 62;
  }
  g.font = '700 26px Manrope, sans-serif'; g.fillText('Total', x0 + 44, y + 22);
  g.font = '600 46px Fraunces, Georgia, serif'; g.textAlign = 'right'; g.fillText((money(total) || '$0') + (unpriced ? ' +' : ''), x0 + S - 44, y + 26);
  g.font = 'italic 400 26px Fraunces, Georgia, serif'; g.fillText('To the beach counter, La Playa Blanca', x0 + S - 44, H - 22); g.textAlign = 'left';
  return new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('no image'))), 'image/png'));
}

function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function spaced(g: CanvasRenderingContext2D, t: string, x: number, y: number, s: number) { for (const ch of t) { g.fillText(ch, x, y); x += g.measureText(ch).width + s; } }
function fit(g: CanvasRenderingContext2D, t: string, w: number) { if (g.measureText(t).width <= w) return t; while (t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }
