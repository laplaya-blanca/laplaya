import { memo, useEffect, useRef, type MouseEvent } from 'react';
import type { Category, Item } from '../lib/content';
import { img, money } from '../lib/content';
import { FlavorArt } from './FlavorArt';

// photographed categories get their own scene; the rest open on their signature item's flavour art
const SCENES: Record<string, string> = { crepe: '/assets/scene-crepe.jpg', waffle: '/assets/scene-waffle.jpg', 'bubble-waffle': '/assets/scene-waffle.jpg', smoothies: '/assets/scene-smoothie.jpg' };

export type Add = (item: Item, from?: HTMLElement | null) => void;
export type View = 'rail' | 'list';

// a category's picture: its scene photo, else the owner's photo of its signature (or any) item
export function sceneImage(cat: Category, w: number) {
  const shot = cat.items.find((i) => i.photo && i.signature) || cat.items.find((i) => i.photo);
  return SCENES[cat.key] || (shot ? img(shot.photo, w) : '');
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
      <div className="flex items-center gap-2 glass3d mx-2 mt-2 rounded-[24px] py-1.5 pl-1.5 pr-1.5 text-[#F6EFDF] [--color-glass3d:hsl(200_70%_8%/.45)]">
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
export const Scene = memo(function Scene({ cat, index, view, onOpen, onAdd }: { cat: Category; index: number; view: View; onOpen: (i: Item) => void; onAdd: Add }) {
  const lead = cat.items.find((i) => i.signature && !i.soldOut) || cat.items[0];
  const hero = sceneImage(cat, 1000);
  return (
    <section id={'cat-' + cat.key} data-cat={cat.key} aria-labelledby={'h-' + cat.key} className="scene scroll-mt-16 pt-6">
      <div className="relative mx-4 overflow-hidden rounded-[28px]">
        <div className="relative h-[34svh] min-h-[220px] max-h-[340px]">
          {hero
            ? <img src={hero} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
            : <FlavorArt name={lead.name} kind={cat.kind} className="absolute inset-0 size-full" />}
          <div className="absolute inset-0" style={{ background: SHADE, opacity: 0.92 }} />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 text-[#FBF6EA]">
          <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[#F2D79E]">
            {String(index + 1).padStart(2, '0')} · {cat.temp || 'Fresh'}
          </p>
          <h2 id={'h-' + cat.key} className="mt-1 font-serif text-[44px] font-semibold leading-[.95] tracking-[-.01em]">{cat.name}</h2>
          <p className="mt-1.5 text-[15px] leading-snug text-[#FBF6EA]/90">{cat.description}</p>
          <p className="mt-2 text-[13px] font-bold text-[#FBF6EA]/80">{cat.items.length} to choose · {priceRange(cat.items)}</p>
        </div>
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

function Art({ item, w, className }: { item: Item; w: number; className: string }) {
  return item.photo
    ? <img src={img(item.photo, w)} alt={item.name} loading="lazy" className={className + ' object-cover'} />
    : <FlavorArt name={item.name} kind={item.kind} className={className} />;
}

function AddButton({ item, onAdd, big = false }: { item: Item; onAdd: Add; big?: boolean }) {
  const click = (e: MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onAdd(item, e.currentTarget); };
  return (
    <button onClick={click} disabled={item.soldOut} aria-label={item.soldOut ? item.name + ' is sold out' : 'Add ' + item.name + ' to your order'}
      className={'grid shrink-0 place-items-center rounded-full bg-[var(--amber)] text-[var(--amber-ink)] shadow-[0_8px_18px_rgba(232,164,76,.35)] transition-transform active:scale-90 disabled:bg-[var(--paper-2)] disabled:text-[var(--ink-soft)] disabled:shadow-none ' + (big ? 'size-12' : 'size-11')}>
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
    <article role="listitem" className={'grain w-[min(72vw,290px)] overflow-hidden rounded-[26px] bg-[var(--paper)] shadow-[0_14px_34px_rgba(6,20,29,.12)] ' + (item.soldOut ? 'opacity-70' : '')}>
      <button onClick={() => onOpen(item)} className="block w-full text-left" aria-label={item.name + (item.price != null ? ', ' + money(item.price) : '') + (item.soldOut ? ', sold out today' : '') + '. Details'}>
        <div className="relative aspect-[5/6] overflow-hidden">
          <Art item={item} w={600} className={'size-full ' + (item.soldOut ? 'grayscale' : '')} />
          {item.signature && !item.soldOut && <span className="absolute left-3 top-3 rounded-full bg-[var(--paper)]/92 px-3 py-1 text-[12px] font-extrabold text-[var(--ink)]">House favourite</span>}
          {item.soldOut && <span className="absolute left-3 top-3 rounded-full bg-[var(--coral)] px-3 py-1 text-[12px] font-extrabold text-white">Sold out today</span>}
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
