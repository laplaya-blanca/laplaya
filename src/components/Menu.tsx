import { memo, useEffect, useRef, type MouseEvent } from 'react';
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
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length), 3);
  return `min(${Math.min(26, 128 / longest).toFixed(1)}vw, 168px)`;
}

export const Scene = memo(function Scene({ cat, index, view, onOpen, onAdd }: { cat: Category; index: number; view: View; onOpen: (i: Item) => void; onAdd: Add }) {
  const hero = sceneImage(cat, 1000);
  return (
    <section id={'cat-' + cat.key} data-cat={cat.key} aria-labelledby={'h-' + cat.key} className="scene scroll-mt-20 pt-10">
      {/* the category's name, set huge, with its photograph showing through the letters */}
      <div className="px-5">
        <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--ink-soft)]">
          {String(index + 1).padStart(2, '0')} · {cat.temp || 'Fresh'} · {cat.items.length} to choose · {priceRange(cat.items)}
        </p>
        <div className="reveal mt-2"><h2 id={'h-' + cat.key} className="photo-type font-serif font-black uppercase leading-[.86] tracking-[-.02em]"
          style={{ fontSize: titleSize(cat.name), backgroundImage: `linear-gradient(rgba(14,52,64,.42), rgba(14,52,64,.42)), url("${hero || img('/assets/hero-lake-wide.jpg', 1000)}")`,
            backgroundPosition: hero ? 'center 55%' : Math.round(15 + seeded(cat.name)() * 70) + '% 62%' }}>
          {cat.name}
        </h2></div>
        <p className="mt-3 max-w-[34ch] text-[16px] leading-snug text-[var(--ink-soft)]">{cat.description}</p>
      </div>
      {view === 'rail' ? (
        <div className="rail mt-4" role="list" aria-label={cat.name}>
          {cat.items.map((it) => <Card key={it.id} item={it} onOpen={onOpen} onAdd={onAdd} />)}
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
function Art({ item, w, className }: { item: Item; w: number; className: string }) {
  if (item.photo) return <img src={img(item.photo, w)} alt={item.name} loading="lazy" className={className + ' object-cover'} />;
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
        : <span className="absolute inset-x-4 bottom-[14%] text-center font-script text-[clamp(46px,13vw,64px)] leading-[.95] text-[#FBF6EA] [text-shadow:0_2px_14px_rgba(6,20,29,.5)]">{item.name}</span>}
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

const Card = memo(function Card({ item, onOpen, onAdd }: { item: Item; onOpen: (i: Item) => void; onAdd: Add }) {
  return (
    <article role="listitem" className={'w-[min(72vw,290px)] overflow-hidden rounded-[26px] bg-[var(--paper)] shadow-[0_6px_16px_rgba(6,20,29,.10)] ' + (item.soldOut ? 'opacity-70' : '')}>
      <button onClick={() => onOpen(item)} className="block w-full text-left" aria-label={item.name + (item.price != null ? ', ' + money(item.price) : '') + (item.soldOut ? ', sold out today' : '') + '. Details'}>
        <div className="relative aspect-[5/6] overflow-hidden">
          <Art item={item} w={600} className={'size-full ' + (item.soldOut ? 'grayscale' : '')} />
          {item.signature && !item.soldOut && <span className="absolute left-3 top-3 rounded-full bg-[var(--paper)]/92 px-3 py-1 text-[12px] font-extrabold text-[var(--ink)]">House favourite</span>}
          {item.soldOut && <span className="absolute left-3 top-3 rounded-full bg-[var(--ink)] px-3 py-1 text-[12px] font-extrabold text-[var(--paper)]">Sold out today</span>}
        </div>
        <div className="px-4 pt-3.5">
          <h3 className="font-serif text-[23px] font-semibold leading-[1.05]">{item.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-[42px] text-[14px] leading-[1.45] text-[var(--ink-soft)]">{item.desc}</p>
        </div>
      </button>
      <div className="flex items-center justify-between px-4 pb-4 pt-2.5">
        <Price item={item} className="text-[21px]" />
        <AddButton item={item} onAdd={onAdd} />
      </div>
    </article>
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
