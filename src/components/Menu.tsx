import { memo, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type SyntheticEvent } from 'react';
import type { Category, Item } from '../lib/content';
import { img, money } from '../lib/content';
import { flavourColours, seeded } from '../lib/flavor';

// category headers with a photo of their own; the rest (and any category the owner adds) open on the shore
const SCENES: Record<string, string> = { crepe: '/assets/scene-crepe.jpg', waffle: '/assets/scene-waffle.jpg', smoothies: '/assets/scene-smoothie.jpg',
  'fresh-juice': '/assets/cat-fresh-juice.jpg', matcha: '/assets/cat-matcha.jpg', 'hot-drinks': '/assets/cat-hot-drinks.jpg', boba: '/assets/cat-boba.jpg' };

export type Add = (item: Item, from?: HTMLElement | null) => void;
export type View = 'rail' | 'list';

// a category's picture: its scene photo, else the owner's photo of its signature (or any) item
export function sceneImage(cat: Category, w: number) {
  const shot = cat.items.find((i) => i.photo && i.signature) || cat.items.find((i) => i.photo);
  return SCENES[cat.key] ? img(SCENES[cat.key], w) : shot ? img(shot.photo, w) : '';
}

export const SHADE = 'linear-gradient(180deg, transparent 28%, color-mix(in srgb, var(--sea-3) 55%, #06141d) 100%)';

export function priceRange(items: Item[]) {
  const p = items.map((i) => i.price).filter((x): x is number => x != null);
  return p.length ? 'from ' + money(Math.min(...p)) : 'priced at the counter';
}

// ---------- sticky category bar ----------
export function CategoryBar({ cats, active, onPick, view, setView, visible }: { cats: Category[]; active: string; onPick: (k: string) => void; view: View; setView: (v: View) => void; visible: boolean }) {
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>('[aria-current="true"]');
    if (el && rail.current) rail.current.scrollTo({ left: el.offsetLeft - rail.current.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
  }, [active]);
  return (
    <nav aria-label="Menu categories" ref={(el) => { if (el) el.inert = !visible; }}
      className={'fixed inset-x-0 top-0 z-30 transition-transform duration-300 ' + (visible ? 'translate-y-0' : '-translate-y-full')}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center gap-2 glass3d mx-2 mt-2 rounded-[24px] py-1.5 pl-1.5 pr-1.5 text-[#F6EFDF] [--glass-tint:hsl(200_70%_8%/.68)]">
        <div ref={rail} className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-2 [scrollbar-width:none]">
          {cats.map((c) => (
            <button key={c.key} onClick={() => onPick(c.key)} aria-current={c.key === active ? 'true' : undefined}
              className={'h-11 shrink-0 rounded-full px-4 text-[15px] font-bold transition-colors ' + (c.key === active ? 'bg-[#F6EFDF] text-[#0B2532]' : 'text-[#F6EFDF]/80')}>
              {c.name}
            </button>
          ))}
        </div>
        <button onClick={() => setView(view === 'rail' ? 'list' : 'rail')} aria-label={view === 'rail' ? 'Show as a quick list' : 'Show as swipe cards'}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white/12">
          {view === 'rail'
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="8" height="16" rx="2" /><rect x="14" y="4" width="7" height="16" rx="2" /></svg>}
        </button>
      </div>
    </nav>
  );
}

// ---------- one category = one stretch of water ----------
// as big as the longest word allows on a phone (uppercase Fraunces Black runs ~0.72em a letter)
function titleSize(name: string) {
  // the brand capitals run wide (about .75em a letter), so the longest word sets the size
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length), 3);
  return `min(${Math.min(14, 112 / longest).toFixed(1)}vw, 84px)`;
}
// the owner may type a category in capitals; titles read as words, not signage
const titleCase = (s: string) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) : s);

// Afloat: only the stretches of menu on or near the screen move (cards bobbing on the swell, the title's letters
// riding a ripple), so a phone never animates more than two or three sections at once. One observer for all.
let floats: IntersectionObserver | null = null;
export function useAfloat<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    floats ??= new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('afloat', e.isIntersecting)), { rootMargin: '15% 0px' });
    floats.observe(el);
    return () => floats?.unobserve(el);
  }, []);
  return ref;
}

// the title set letter by letter so a ripple can run through it; read aloud as the plain word
function Ripple({ text }: { text: string }) {
  let n = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {text.split(' ').map((word, w) => (
          <span key={w}>{w > 0 && ' '}<span className="inline-block whitespace-nowrap">
            {[...word].map((c, i) => <span key={i} className="letter" style={{ ['--n' as string]: n++ }}>{c}</span>)}
          </span></span>
        ))}
      </span>
    </>
  );
}

export const Scene = memo(function Scene({ cat, view, onOpen, onAdd }: { cat: Category; view: View; onOpen: (i: Item) => void; onAdd: Add }) {
  const ref = useAfloat<HTMLElement>();
  return (
    <section ref={ref} id={'cat-' + cat.key} data-cat={cat.key} aria-labelledby={'h-' + cat.key} className="scene scroll-mt-20 pt-10">
      {/* the category's name in the logo's lettering and cream, like "La Playa Blanca" on the shore */}
      <div className="px-5">
        <p className="flex items-center gap-2.5 text-[14px] font-semibold text-[var(--ink-soft)]">
          <span className="rounded-full bg-[#007385] px-2.5 py-0.5 font-brand text-[11px] font-bold uppercase tracking-[.16em] text-[#F9F6E3] [text-shadow:none]">{cat.temp || 'Fresh'}</span>
          {cat.items.length} items, {priceRange(cat.items)}
        </p>
        <div className="reveal mt-2"><h2 id={'h-' + cat.key} className="font-brand font-extrabold uppercase leading-[.95] tracking-[.02em] text-[#F9F6E3]"
          style={{ fontSize: titleSize(cat.name) }}>
          <Ripple text={titleCase(cat.name)} />
        </h2></div>
        <p className="mt-3 max-w-[34ch] text-[16px] leading-snug text-[var(--ink-soft)]">{cat.description}</p>
      </div>
      {view === 'rail' ? (
        <div className="rail mt-4" role="list" aria-label={cat.name}>
          {cat.items.map((it, i) => <Card key={it.id} item={it} i={i} air={air(cat.temp)} onOpen={onOpen} onAdd={onAdd} />)}
          <div aria-hidden className="w-1" />
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--line)] px-4">
          {cat.items.map((it) => <Row key={it.id} item={it} onOpen={onOpen} onAdd={onAdd} />)}
        </ul>
      )}
    </section>
  );
});

// a category header with no photo: the wide shore, framed a little differently per category
export function ShoreScene({ seed, w }: { seed: string; w: number }) {
  const x = Math.round(15 + seeded(seed)() * 70);
  return <img src={img('/assets/hero-lake-wide.jpg', w)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" style={{ objectPosition: x + '% 60%' }} />;
}

// the owner's own photo when there is one. Until then a general card rather than a stand-in product shot
// (a picture of one shake on every shake reads as a promise): the shore at a slightly different framing,
// washed in the item's flavour colour, with its name written across the water.
// Is this photo shot on white, where is the dish in it, and what is its outline? Read once per photo and remembered.
// The outline: flood in from the edges through white and pale-grey shadow; whatever the flood can't reach is the
// dish (a plate rim, a board's edge or the food stops it). Kept as a small white silhouette, used to lay a white
// "card" under the dish so the table never shows through the food.
type Shot = { white: false } | { white: true; box: [number, number, number, number]; ar: number; mask: string };
const shots = new Map<string, Shot>();
function readShot(im: HTMLImageElement): Shot {
  try {
    const N = 160, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d', { willReadFrequently: true })!;
    x.drawImage(im, 0, 0, N, N);
    const d = x.getImageData(0, 0, N, N).data;
    const lo = (i: number) => Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
    const hi = (i: number) => Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
    let edge = 0, white = 0;
    for (let y = 0; y < N; y++) for (let i = 0; i < N; i++) {
      if (y && y < N - 1 && i && i < N - 1) continue;
      edge++; if (lo(y * N + i) > 226) white++;
    }
    if (white / edge < 0.8) return { white: false };

    const open = (i: number) => lo(i) > 212 && hi(i) - lo(i) < 22; // white, or a soft grey shadow on white
    const out = new Uint8Array(N * N), stack: number[] = [];
    for (let i = 0; i < N; i++) for (const j of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (!out[j] && open(j)) { out[j] = 1; stack.push(j); }
    while (stack.length) {
      const j = stack.pop()!, y = (j / N) | 0, i = j % N;
      for (const k of [i > 0 ? j - 1 : -1, i < N - 1 ? j + 1 : -1, y > 0 ? j - N : -1, y < N - 1 ? j + N : -1])
        if (k >= 0 && !out[k] && open(k)) { out[k] = 1; stack.push(k); }
    }
    let x0 = N, x1 = -1, y0 = N, y1 = -1;
    const m = x.createImageData(N, N);
    for (let j = 0; j < N * N; j++) {
      if (out[j]) continue;
      const y = (j / N) | 0, i = j % N;
      x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      m.data[j * 4] = m.data[j * 4 + 1] = m.data[j * 4 + 2] = m.data[j * 4 + 3] = 255;
    }
    if (x1 < x0 || (x1 - x0) * (y1 - y0) < N * N * 0.02) return { white: false };
    x.putImageData(m, 0, 0);
    return { white: true, box: [x0 / N, y0 / N, (x1 + 1) / N, (y1 + 1) / N], ar: im.naturalHeight / im.naturalWidth, mask: c.toDataURL('image/png') };
  } catch { return { white: false }; }
}

// The owner's studio shots are on white. Once a dish has been re-plated (scripts/replate.mjs) that picture is shown
// as it is. Until then, each one is set on the same beach table: the dish is scaled so it fills the
// same share of the frame at the same height whether he shot it close or far, and multiplied over the table so the
// white turns into the table and the beach while the dish and its own shadow stay. Photos not shot on white are
// shown as they are. Works for whatever he uploads next, without touching the files.
// The table under a plate shot on white: one of four daytime angles on the same beach bar (each dish always gets the
// same one, so a row of cards doesn't repeat itself), and after dark every plate moves to the lantern-lit table.
// Each table says where its top is (surface: the middle of the tabletop, as a fraction of the photo's height) and what
// light falls on it (size: how big a plate looks there; tint: multiplied over the dish only, so a plate at sunset or under the lantern is lit like its table).
type Table = { src: string; surface: number; size?: number; tint?: string };
const TABLES: Table[] = [
  { src: '/assets/plate-table.jpg', surface: 0.705 },
  { src: '/assets/plate-table-b.jpg', surface: 0.75 },
  { src: '/assets/plate-table-c.jpg', surface: 0.66, size: 0.8 },
  { src: '/assets/plate-table-d.jpg', surface: 0.645, tint: 'rgba(246,206,160,.55)' },
];
const NIGHT: Table = { src: '/assets/plate-table-night.jpg', surface: 0.75, size: 0.8, tint: 'rgba(214,160,104,.6)' };
const nightWatch = (tell: () => void) => { const mo = new MutationObserver(tell); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dark'] }); return () => mo.disconnect(); };
const useNight = () => useSyncExternalStore(nightWatch, () => document.documentElement.hasAttribute('data-dark'));
const tableFor = (id: string, night: boolean) => (night ? NIGHT : TABLES[Math.floor(seeded(id)() * TABLES.length)]);
// where a height in the table photo lands in the frame: the 3:4 photo is cover-fitted with its 75% line held in place
const PH = 'max(100cqh, 133.333cqw)';
const onTable = (f: number) => `calc((100cqh - ${PH}) * .75 + ${f} * ${PH})`;

function Photo({ item, w, className }: { item: Item; w: number; className: string }) {
  const night = useNight();
  const [shot, setShot] = useState<Shot | undefined>(() => shots.get(item.photo));
  const read = (e: SyntheticEvent<HTMLImageElement>) => {
    if (!shots.has(item.photo)) shots.set(item.photo, readShot(e.currentTarget));
    setShot(shots.get(item.photo));
  };
  // the dish already re-plated on its table, when there is one for this time of day; if it won't load, the
  // original is set on the table as below
  const [broken, setBroken] = useState(false);
  const ready = !broken && (night ? item.plated.night : item.plated.day);
  if (ready) return (
    <span className={className + ' relative block overflow-hidden bg-[#EFE6D8]'}>
      <img src={img(ready, w)} alt={item.name} loading="lazy" onError={() => setBroken(true)} className="size-full object-cover" style={{ objectPosition: 'center 75%' }} />
    </span>
  );
  const src = img(item.photo, w);
  if (!shot?.white) return (
    <span className={className + ' relative block overflow-hidden bg-[#F4ECDF]'}>
      <img src={src} alt={item.name} loading="lazy" onLoad={read} className={'size-full object-cover' + (shot ? '' : ' opacity-0')} />
    </span>
  );
  const [x0, y0, x1, y1] = shot.box, { ar } = shot;
  const table = tableFor(item.id, night);
  // L is the photo's rendered width: the dish may take 80% of the width or 56% of the height, whichever is smaller.
  // The dish's middle sits on the middle of this table's top.
  const k = table.size ?? 1;
  const L = `min(${(80 * k / (x1 - x0)).toFixed(2)}cqw, ${(56 * k / ((y1 - y0) * ar)).toFixed(2)}cqh)`;
  const top = `calc(${onTable(table.surface)} - ${L} * ${(((y0 + y1) / 2) * ar).toFixed(4)})`;
  const place = { width: L, height: `calc(${L} * ${ar.toFixed(4)})`, left: `calc(50cqw - ${L} * ${((x0 + x1) / 2).toFixed(4)})`, top };
  const mask = { maskImage: `url(${shot.mask})`, WebkitMaskImage: `url(${shot.mask})`, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' };
  // a soft contact shadow where the dish meets the wood, so it rests on the table instead of hovering over it
  const dw = `${L} * ${(x1 - x0).toFixed(4)}`;
  const shadow = { width: `calc(${dw} * 1.02)`, height: `calc(${dw} * .17)`, left: `calc(50cqw - ${dw} * .51)`, top: `calc(${top} + ${L} * ${(y1 * ar).toFixed(4)} - ${dw} * .12)` };
  return (
    <span className={className + ' relative isolate block overflow-hidden bg-[#EFE6D8] [container-type:size]'}>
      <img src={img(table.src, Math.min(Math.max(w, 300), 1200))} alt="" aria-hidden loading="lazy" className="absolute inset-0 size-full object-cover" style={{ objectPosition: 'center 75%' }} />
      <span aria-hidden className="absolute rounded-[50%] mix-blend-multiply" style={{ ...shadow, background: 'radial-gradient(closest-side, rgba(52,34,18,.42), rgba(52,34,18,.18) 55%, rgba(52,34,18,0))' }} />
      <span aria-hidden className="absolute bg-white" style={{ ...place, ...mask }} />
      <img src={src} alt={item.name} loading="lazy" onLoad={read} className="absolute max-w-none mix-blend-multiply [mask:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent),linear-gradient(transparent,#000_5%,#000_95%,transparent)] [mask-composite:intersect]"
        style={place} />
      {table.tint && <span aria-hidden className="absolute mix-blend-multiply" style={{ ...place, ...mask, background: table.tint }} />}
    </span>
  );
}

function Art({ item, w, className }: { item: Item; w: number; className: string }) {
  if (item.photo) return <Photo key={item.photo} item={item} w={w} className={className} />;
  const rnd = seeded(item.name + item.cat);
  const tint = flavourColours(item.name, item.kind)[0];
  const small = w < 300;
  return (
    <span className={className + ' relative block overflow-hidden bg-[var(--sea-2)]'}>
      <img src={img('/assets/hero-lake-tall.jpg', Math.max(w, 200))} alt="" loading="lazy" className="absolute inset-0 size-full object-cover"
        style={{ objectPosition: Math.round(rnd() * 100) + '% ' + Math.round(35 + rnd() * 55) + '%' }} />
      <span className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 20%, color-mix(in srgb, ${tint} 55%, transparent) 100%)` }} />
      {small
        ? <span className="absolute inset-0 grid place-items-center font-serif text-[26px] font-semibold text-[#FBF6EA] [text-shadow:0_2px_10px_rgba(6,20,29,.45)]">{item.name.charAt(0)}</span>
        : <span className="absolute inset-x-4 bottom-[14%] text-center font-serif text-[clamp(28px,8vw,38px)] font-semibold leading-[1.02] tracking-[-.01em] text-[#FBF6EA] [text-shadow:0_2px_14px_rgba(6,20,29,.5)]">{item.name}</span>}
    </span>
  );
}

function AddButton({ item, onAdd, big = false }: { item: Item; onAdd: Add; big?: boolean }) {
  const click = (e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onAdd(item, e.currentTarget); };
  return (
    <button onClick={click} disabled={item.soldOut} aria-label={item.soldOut ? item.name + ' is sold out' : 'Add ' + item.name + ' to your order'}
      className={'grid shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_8px_18px_var(--accent-glow)] transition-transform active:scale-90 disabled:bg-[var(--paper-2)] disabled:text-[var(--ink-soft)] disabled:shadow-none ' + (big ? 'size-12' : 'size-11')}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  );
}

function Price({ item, className = '' }: { item: Item; className?: string }) {
  return item.price != null
    ? <span className={'font-extrabold tabular-nums ' + className}>{money(item.price)}</span>
    : <span className="text-[15px] font-bold text-[var(--ink-soft)]">Ask at the counter</span>;
}

// the card photo that was just tapped, so the item view can lift it out of the water (see Lift in Sheets)
let lifted: HTMLElement | null = null;
export const liftFrom = (el: Element | null) => { lifted = el as HTMLElement | null; };
export const takeLift = () => { const el = lifted; lifted = null; return el; };

// what rises off the plate: steam from anything warm, a slow glint of light across anything cold
type Air = 'steam' | 'chill' | null;
const air = (temp: string): Air => (/warm|hot/i.test(temp) ? 'steam' : /cold|iced|fresh|frozen/i.test(temp) ? 'chill' : null);
function Breath({ air }: { air: Air }) {
  if (air === 'steam') return <span aria-hidden className="steam">{[0, 1, 2].map((k) => <span key={k} style={{ ['--k' as string]: k }} />)}</span>;
  if (air === 'chill') return <span aria-hidden className="chill" />;
  return null;
}

const Card = memo(function Card({ item, i, air, onOpen, onAdd }: { item: Item; i: number; air: Air; onOpen: (i: Item) => void; onAdd: Add }) {
  return (
    // the still slot is what the rail snaps to; only the card inside it moves (a moving snap target makes the rail creep)
    <div className="slot"><article role="listitem" style={{ ['--i' as string]: i }} className={'float paper flex w-[min(72vw,290px)] flex-col overflow-hidden rounded-[26px] bg-[var(--paper)] shadow-[0_6px_16px_rgba(6,20,29,.10)]'}>
      <button onClick={(e) => { liftFrom(e.currentTarget.querySelector('[data-art]')); onOpen(item); }} className="block w-full text-left" aria-label={item.name + (item.price != null ? ', ' + money(item.price) : '') + (item.soldOut ? ', sold out today' : '') + '. Details'}>
        <div data-art className="relative aspect-[5/6] overflow-hidden">
          <Art item={item} w={600} className={'size-full ' + (item.soldOut ? 'opacity-55 grayscale' : '')} />
          {!item.soldOut && <Breath air={air} />}
          {item.signature && !item.soldOut && <span className="absolute left-3 top-3 rounded-full bg-[var(--paper)]/92 px-3 py-1 text-[12px] font-extrabold text-[var(--ink)]">House favourite</span>}
          {item.soldOut && <span className="absolute left-3 top-3 rounded-full bg-[var(--ink)] px-3 py-1 text-[12px] font-extrabold text-[var(--paper)]">Sold out today</span>}
        </div>
        <div className="px-4 pt-3.5">
          <h3 className="font-serif text-[23px] font-semibold leading-[1.05]">{item.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-[42px] text-[14px] leading-[1.45] text-[var(--ink-soft)]">{item.desc}</p>
        </div>
      </button>
      <div className="mt-auto flex items-center justify-between px-4 pb-4 pt-2.5">
        <Price item={item} className="text-[21px]" />
        <AddButton item={item} onAdd={onAdd} />
      </div>
    </article></div>
  );
});

const Row = memo(function Row({ item, onOpen, onAdd }: { item: Item; onOpen: (i: Item) => void; onAdd: Add }) {
  return (
    <li className={'flex items-center gap-3 py-3 ' + (item.soldOut ? 'opacity-60' : '')}>
      <button onClick={() => onOpen(item)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="size-16 shrink-0 overflow-hidden rounded-2xl"><Art item={item} w={160} className={'size-full ' + (item.soldOut ? 'grayscale' : '')} /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[19px] font-semibold leading-tight">{item.name}</span>
          <span className="block truncate text-[14px] text-[var(--ink-soft)]">{item.soldOut ? 'Sold out today' : item.desc}</span>
          <Price item={item} className="mt-0.5 block text-[17px]" />
        </span>
      </button>
      <AddButton item={item} onAdd={onAdd} />
    </li>
  );
});

export { Art, Price, AddButton };
