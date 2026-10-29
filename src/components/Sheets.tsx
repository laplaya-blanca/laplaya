import { useLayoutEffect, useRef } from 'react';
import { animate, motion, useReducedMotion } from 'motion/react';
import type { Category, Item } from '../lib/content';
import { money } from '../lib/content';
import type { Line } from '../lib/cart';
import { Art, Price, priceRange, sceneImage, ShoreScene, SHADE, takeLift, type Add } from './Menu';
import { CloseButton, Sheet } from './Sheet';

// ---------- bottom dock: always under the thumb ----------
export function Dock({ count, total, bump, onPlay, onTide, onCart, onCats, show }: { count: number; total: number; bump: number; onPlay: () => void; onTide: () => void; onCart: () => void; onCats: () => void; show: boolean }) {
  const still = useReducedMotion();
  return (
    <div ref={(el) => { if (el) el.inert = !show; }}
      className={'fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 transition-transform duration-300 ' + (show ? 'translate-y-0' : 'translate-y-[140%]')}
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="flex w-full max-w-[520px] items-center gap-1.5 glass3d rounded-[26px] p-1.5 text-[#F6EFDF] [--glass-tint:hsl(200_70%_8%/.74)]">
        <div className="flex flex-1 items-center justify-around">
        <DockBtn label="All categories" onClick={onCats}><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></DockBtn>
        <DockBtn label="Let the tide choose for me" onClick={onTide}><path d="M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4z" /></DockBtn>
        {/* a die: games for the table while the order is on its way */}
        <DockBtn label="Games while you wait" onClick={onPlay}><rect x="4" y="4" width="16" height="16" rx="4.5" /><g fill="currentColor" stroke="none"><circle cx="8.6" cy="8.6" r="1.45" /><circle cx="12" cy="12" r="1.45" /><circle cx="15.4" cy="15.4" r="1.45" /></g></DockBtn>
        </div>
        <motion.button key={bump} onClick={onCart} data-cart-target
          initial={still || !bump ? false : { scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          className="flex h-12 shrink-0 items-center gap-2.5 rounded-[20px] bg-[var(--pill)] pl-3.5 pr-4 font-extrabold text-[var(--pill-ink)]"
          aria-label={count ? 'Your order: ' + count + ' items, ' + money(total) : 'Your order is empty'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
          {count ? <><span className="tabular-nums">{count}</span><span className="tabular-nums opacity-80">{money(total) || ''}</span></> : <span>Order</span>}
        </motion.button>
      </div>
    </div>
  );
}

function DockBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid size-12 shrink-0 place-items-center rounded-[20px] active:bg-white/10">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
  );
}

// ---------- item ----------
// The card's photo lifts out of the water into the item view, and sinks back into its card on close: a copy of the
// card photo flies between the two places (one fixed element, so the plate re-frames itself as the box changes shape)
// while the sheet slides up underneath. Opened from search or the order there is no card, and the sheet just slides.
const LIFT = { type: 'spring', stiffness: 380, damping: 38 } as const;
function useLift(target: React.RefObject<HTMLDivElement | null>) {
  const still = useReducedMotion();
  const card = useRef<HTMLElement | null>(null);
  const closing = useRef(false);
  const fly = (from: DOMRect, to: DOMRect, src: HTMLElement, done: () => void) => {
    // the copy is made of an element we may already have hidden, so it is made visible again (and kept from screen readers)
    const ghost = src.cloneNode(true) as HTMLElement;
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, { visibility: 'visible', position: 'fixed', zIndex: '70', margin: '0', pointerEvents: 'none', left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px', borderRadius: '24px', aspectRatio: 'auto', boxShadow: '0 24px 60px rgba(4,20,28,.35)' });
    document.body.appendChild(ghost);
    animate(ghost, { left: to.left, top: to.top, width: to.width, height: to.height }, LIFT).then(() => { ghost.remove(); done(); });
  };
  useLayoutEffect(() => {
    const el = takeLift(), box = target.current;
    if (!el || !box || still || !el.isConnected) return;
    card.current = el;
    const panel = box.closest<HTMLElement>('[role=dialog]')!;
    const shift = new DOMMatrix(getComputedStyle(panel).transform).m42; // the sheet is still below the screen
    const to = box.getBoundingClientRect();
    const end = new DOMRect(to.left, to.top - shift, to.width, to.height);
    el.style.visibility = 'hidden'; box.style.visibility = 'hidden';
    fly(el.getBoundingClientRect(), end, el, () => { box.style.visibility = ''; });
    // however the sheet goes away (another sheet replacing it too), the card never stays empty
    return () => { setTimeout(() => { el.style.visibility = ''; }, 900); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // closing: back down into its card, if that card is still on screen
  return (close: () => void) => {
    if (closing.current) return; // Escape and a tap on the backdrop together close once
    closing.current = true;
    const el = card.current, box = target.current;
    if (el && box && el.isConnected) {
      const back = el.getBoundingClientRect();
      if (back.bottom > 0 && back.top < innerHeight) {
        el.style.visibility = 'hidden';
        fly(box.getBoundingClientRect(), back, box, () => { el.style.visibility = ''; });
        box.style.visibility = 'hidden';
      } else el.style.visibility = '';
    }
    close();
  };
}

export function ItemSheet({ item, onClose: close, onAdd, qty }: { item: Item; onClose: () => void; onAdd: Add; qty: number }) {
  const photo = useRef<HTMLDivElement>(null);
  const sink = useLift(photo);
  const onClose = () => sink(close);
  return (
    <Sheet label={item.name} onClose={onClose}>
      <div className="relative mx-4 mt-1 aspect-[4/3]">
        <div ref={photo} className="absolute inset-0 overflow-hidden rounded-[24px]">
          <Art item={item} w={1000} className={'size-full ' + (item.soldOut ? 'grayscale' : '')} />
        </div>
        <div className="absolute right-3 top-3"><CloseButton onClick={onClose} /></div>
      </div>
      <div className="px-6 pt-5">
        <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--ink-soft)]">{item.cat}</p>
        <h2 className="mt-1 font-serif text-[38px] font-semibold leading-[1]" data-autofocus tabIndex={-1}>{item.name}</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-[var(--ink-soft)]">{item.soldOut ? 'Sold out today — back soon.' : item.desc}</p>
        {(item.signature || item.tags.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.signature && <span className="rounded-full bg-[var(--accent)]/20 px-3 py-1.5 text-[13px] font-bold">House favourite</span>}
            {item.tags.map((t) => <span key={t} className="rounded-full bg-[var(--paper-2)] px-3 py-1.5 text-[13px] font-bold">{t === 'Nuts' ? 'Contains nuts' : t}</span>)}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between gap-4">
          <Price item={item} className="text-[28px]" />
          <button disabled={item.soldOut} onClick={(e) => onAdd(item, e.currentTarget)}
            className="flex h-14 items-center gap-2 rounded-full bg-[var(--accent)] px-7 text-[17px] font-extrabold text-[var(--accent-ink)] shadow-[0_12px_26px_var(--accent-glow)] active:scale-[.97] transition-transform disabled:bg-[var(--paper-2)] disabled:text-[var(--ink-soft)] disabled:shadow-none">
            {item.soldOut ? 'Sold out' : qty ? 'Add another · ' + qty + ' in order' : 'Add to order'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// ---------- cart ----------
export function CartSheet({ lines, total, unpriced, onQty, onClose, onWhatsApp, onTicket, picks, onOpen }: { lines: Line[]; total: number; unpriced: boolean; onQty: (id: string, d: number) => void; onClose: () => void; onWhatsApp: () => void; onTicket: () => void; picks: Item[]; onOpen: (i: Item) => void }) {
  return (
    <Sheet label="Your order" onClose={onClose}>
      <div className="flex items-center justify-between px-6 pt-1">
        <div>
          <h2 className="font-serif text-[32px] font-semibold leading-none" data-autofocus tabIndex={-1}>Your order</h2>
          <p className="mt-1 text-[14px] text-[var(--ink-soft)]">Pick up at the beach counter</p>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      {!lines.length ? (
        <div className="px-6 pb-4 pt-6">
          <p className="font-serif text-[22px] font-semibold">Nothing in the net yet.</p>
          <p className="mt-1 text-[15px] text-[var(--ink-soft)]">Tonight’s house favourites:</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {picks.slice(0, 3).map((p) => (
              <button key={p.id} onClick={() => onOpen(p)} className="text-left">
                <span className="block aspect-square overflow-hidden rounded-2xl"><Art item={p} w={240} className="size-full" /></span>
                <span className="mt-1.5 block text-[14px] font-bold leading-tight">{p.name}</span>
                <span className="block text-[13px] text-[var(--ink-soft)]">{p.cat}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-[var(--line)] px-6">
            {lines.map((l) => (
              <li key={l.item.id} className="flex items-center gap-3 py-3">
                <span className="size-14 shrink-0 overflow-hidden rounded-xl"><Art item={l.item} w={140} className="size-full" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-[18px] font-semibold">{l.item.name}</span>
                  <span className="block text-[13px] text-[var(--ink-soft)]">{l.item.cat}{l.item.price != null ? ' · ' + money(l.item.price) : ' · priced at the counter'}</span>
                </span>
                <span className="flex items-center rounded-full bg-[var(--paper-2)]">
                  <button onClick={() => onQty(l.item.id, -1)} aria-label={'One less ' + l.item.name} className="grid size-11 place-items-center text-[22px] font-bold">−</button>
                  <span className="w-6 text-center font-extrabold tabular-nums" aria-label={l.qty + ' of ' + l.item.name}>{l.qty}</span>
                  <button onClick={() => onQty(l.item.id, 1)} aria-label={'One more ' + l.item.name} className="grid size-11 place-items-center text-[22px] font-bold">+</button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mx-6 mt-2 flex items-baseline justify-between border-t-2 border-dashed border-[var(--line)] pt-4">
            <span className="text-[15px] font-bold text-[var(--ink-soft)]">Total{unpriced ? ' (+ counter-priced items)' : ''}</span>
            <span className="font-serif text-[30px] font-semibold tabular-nums">{money(total) || '$0'}</span>
          </div>
          <div className="mt-5 grid gap-3 px-6">
            <button onClick={onWhatsApp} className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-[var(--accent)] text-[17px] font-extrabold text-[var(--accent-ink)] shadow-[0_12px_26px_var(--accent-glow)] active:scale-[.98] transition-transform">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>
              Send order on WhatsApp
            </button>
            <button onClick={onTicket} className="h-14 rounded-full border-2 border-[var(--ink)]/20 text-[17px] font-extrabold active:scale-[.98] transition-transform">
              Show it at the counter
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

// ---------- categories as a mosaic ----------
export function CategoriesSheet({ cats, onPick, onClose }: { cats: Category[]; onPick: (k: string) => void; onClose: () => void }) {
  // one wide tile, then two rows of pairs. If that would leave the last tile alone on its row, the last wide tile
  // becomes a pair with the one after it instead, so every row ends full
  const wide = cats.map((_, i) => i % 5 === 0);
  const lastWide = cats.length - 1 - ((cats.length - 1) % 5);
  if ((cats.length - 1 - lastWide) % 2) wide[lastWide] = false;
  return (
    <Sheet label="All categories" onClose={onClose}>
      <div className="flex items-center justify-between px-6 pt-1">
        <h2 className="font-brand text-[30px] font-extrabold uppercase leading-none tracking-[.02em]" data-autofocus tabIndex={-1}>The whole lake</h2>
        <CloseButton onClick={onClose} />
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {cats.map((c, i) => {
          return (
            <button key={c.key} onClick={() => onPick(c.key)} className={'relative overflow-hidden rounded-[22px] text-left ' + (wide[i] ? 'col-span-2 h-36' : 'h-40')}>
              {sceneImage(c, 600)
                ? <img src={sceneImage(c, 600)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" style={{ objectPosition: 'center 75%' }} />
                : <ShoreScene seed={c.name} w={600} />}
              <span className="absolute inset-0" style={{ background: SHADE, opacity: 0.9 }} />
              <span className="absolute bottom-3 left-4 right-3 text-[#FBF6EA]">
                <span className="block font-brand text-[22px] font-extrabold uppercase leading-[.95] tracking-[.02em]">{c.name}</span>
                <span className="mt-1 block text-[13px] font-bold opacity-90">{c.items.length} · {priceRange(c.items)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ---------- "let the tide choose": a wave rolls over the screen and leaves one item behind ----------
export function TideWave({ onDone }: { onDone: () => void }) {
  return (
    <motion.div aria-hidden className="pointer-events-none fixed inset-x-0 z-[60] h-[130svh]"
      initial={{ top: '100%' }} animate={{ top: ['100%', '-15%', '-140%'] }} transition={{ duration: 1.3, times: [0, 0.48, 1], ease: 'easeInOut' }}
      onAnimationComplete={onDone}
      style={{ background: 'linear-gradient(180deg, var(--sea-1) 0%, var(--sea-2) 40%, var(--sea-3) 100%)' }}>
      <svg viewBox="0 0 800 60" preserveAspectRatio="none" className="absolute -top-[58px] h-[60px] w-full"><path d="M0 60 L0 30 C 100 0 120 50 220 28 C 320 6 360 52 480 30 C 600 8 640 46 800 24 L800 60 Z" fill="var(--sea-1)" /></svg>
    </motion.div>
  );
}

