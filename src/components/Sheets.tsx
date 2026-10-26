import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Category, Item } from '../lib/content';
import { money } from '../lib/content';
import type { Line } from '../lib/cart';
import { Art, Price, priceRange, sceneImage, ShoreScene, SHADE, type Add } from './Menu';
import { CloseButton, Sheet } from './Sheet';

// ---------- bottom dock: always under the thumb ----------
export function Dock({ count, total, bump, onSearch, onTide, onCart, onCats, show }: { count: number; total: number; bump: number; onSearch: () => void; onTide: () => void; onCart: () => void; onCats: () => void; show: boolean }) {
  const still = useReducedMotion();
  return (
    <div ref={(el) => { if (el) el.inert = !show; }}
      className={'fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 transition-transform duration-300 ' + (show ? 'translate-y-0' : 'translate-y-[140%]')}
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="flex w-full max-w-[520px] items-center gap-1.5 glass3d rounded-[26px] p-1.5 text-[#F6EFDF] [--color-glass3d:hsl(200_70%_8%/.55)]">
        <div className="flex flex-1 items-center justify-around">
        <DockBtn label="All categories" onClick={onCats}><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></DockBtn>
        <DockBtn label="Search the menu" onClick={onSearch}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></DockBtn>
        <DockBtn label="Let the tide choose for me" onClick={onTide}><path d="M2 14c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 19c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M12 3l1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4z" /></DockBtn>
        </div>
        <motion.button key={bump} onClick={onCart} data-cart-target
          initial={still || !bump ? false : { scale: 0.9 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          className="flex h-12 shrink-0 items-center gap-2.5 rounded-[20px] bg-[var(--amber)] pl-3.5 pr-4 font-extrabold text-[var(--amber-ink)]"
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
export function ItemSheet({ item, onClose, onAdd, qty }: { item: Item; onClose: () => void; onAdd: Add; qty: number }) {
  return (
    <Sheet label={item.name} onClose={onClose}>
      <div className="relative mx-4 mt-1 aspect-[4/3] overflow-hidden rounded-[24px]">
        <Art item={item} w={1000} className={'size-full ' + (item.soldOut ? 'grayscale' : '')} />
        <div className="absolute right-3 top-3"><CloseButton onClick={onClose} /></div>
      </div>
      <div className="px-6 pt-5">
        <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--ink-soft)]">{item.cat}</p>
        <h2 className="mt-1 font-serif text-[38px] font-semibold leading-[1]" data-autofocus tabIndex={-1}>{item.name}</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-[var(--ink-soft)]">{item.soldOut ? 'Sold out today — back soon.' : item.desc}</p>
        {(item.signature || item.tags.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.signature && <span className="rounded-full bg-[var(--amber)]/20 px-3 py-1.5 text-[13px] font-bold">House favourite</span>}
            {item.tags.map((t) => <span key={t} className="rounded-full bg-[var(--paper-2)] px-3 py-1.5 text-[13px] font-bold">{t === 'Nuts' ? 'Contains nuts' : t}</span>)}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between gap-4">
          <Price item={item} className="text-[28px]" />
          <button disabled={item.soldOut} onClick={(e) => onAdd(item, e.currentTarget)}
            className="flex h-14 items-center gap-2 rounded-full bg-[var(--amber)] px-7 text-[17px] font-extrabold text-[var(--amber-ink)] shadow-[0_12px_26px_rgba(232,164,76,.4)] active:scale-[.97] transition-transform disabled:bg-[var(--paper-2)] disabled:text-[var(--ink-soft)] disabled:shadow-none">
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
            <button onClick={onWhatsApp} className="flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#1F8F5F] text-[17px] font-extrabold text-white shadow-[0_12px_26px_rgba(31,143,95,.35)] active:scale-[.98] transition-transform">
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

// ---------- counter ticket: a postcard to hold up at the till ----------
export function Ticket({ lines, total, unpriced, onClose }: { lines: Line[]; total: number; unpriced: boolean; onClose: () => void }) {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Beirut', hour: '2-digit', minute: '2-digit' }).format(new Date());
  return (
    <Sheet label="Counter ticket" onClose={onClose}>
      <div className="px-5 pb-2">
        <div className="relative rounded-[22px] border-2 border-dashed border-[#1F7A8C]/35 bg-[#FBF8EE] p-6 text-[#14586B]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-serif text-[30px] font-semibold italic leading-none" data-autofocus tabIndex={-1}>La Playa Blanca</p>
              <p className="mt-2 text-[13px] font-extrabold uppercase tracking-[.16em] text-[#14586B]/70">Beach pickup · {time}</p>
            </div>
            <img src="/assets/logo.jpg" alt="" className="size-14 rotate-6 rounded-lg border-2 border-white object-cover shadow-md" />
          </div>
          <ul className="mt-5 border-y-2 border-dashed border-[#1F7A8C]/25 py-2">
            {lines.map((l) => (
              <li key={l.item.id} className="flex items-baseline gap-3 py-2">
                <span className="text-[20px] font-extrabold text-[#C9842F] tabular-nums">{l.qty}×</span>
                <span className="flex-1 font-serif text-[24px] font-semibold leading-tight">{l.item.name}<span className="block text-[13px] font-sans font-bold uppercase tracking-[.12em] text-[#14586B]/60">{l.item.cat}</span></span>
                {l.item.price != null && <span className="text-[17px] font-bold tabular-nums">{money(l.item.price * l.qty)}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-baseline justify-between"><span className="text-[15px] font-bold">Total</span><span className="font-serif text-[30px] font-semibold tabular-nums">{money(total) || '$0'}{unpriced ? ' +' : ''}</span></p>
          <p className="mt-3 text-center text-[15px] font-bold">Show this at the counter — we’ll take it from there.</p>
        </div>
        <button onClick={onClose} className="mt-4 h-12 w-full rounded-full bg-[var(--paper-2)] font-extrabold">Done</button>
      </div>
    </Sheet>
  );
}

// ---------- categories as a mosaic ----------
export function CategoriesSheet({ cats, onPick, onClose }: { cats: Category[]; onPick: (k: string) => void; onClose: () => void }) {
  return (
    <Sheet label="All categories" onClose={onClose}>
      <div className="flex items-center justify-between px-6 pt-1">
        <h2 className="font-serif text-[32px] font-semibold" data-autofocus tabIndex={-1}>The whole lake</h2>
        <CloseButton onClick={onClose} />
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pt-3">
        {cats.map((c, i) => {
          return (
            <button key={c.key} onClick={() => onPick(c.key)} className={'relative overflow-hidden rounded-[22px] text-left ' + (i % 5 === 0 ? 'col-span-2 h-36' : 'h-40')}>
              {sceneImage(c, 600)
                ? <img src={sceneImage(c, 600)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                : <ShoreScene seed={c.name} w={600} />}
              <span className="absolute inset-0" style={{ background: SHADE, opacity: 0.9 }} />
              <span className="absolute bottom-3 left-4 right-3 text-[#FBF6EA]">
                <span className="block font-serif text-[24px] font-semibold leading-none">{c.name}</span>
                <span className="mt-1 block text-[13px] font-bold opacity-90">{c.items.length} · {priceRange(c.items)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

// ---------- search ----------
export function SearchSheet({ items, onOpen, onClose }: { items: Item[]; onOpen: (i: Item) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hits = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return [];
    return items.filter((i) => norm(i.name + ' ' + i.cat + ' ' + i.desc).includes(t)).slice(0, 40);
  }, [q, items]);
  return (
    <Sheet label="Search the menu" onClose={onClose} tall>
      <div className="flex items-center gap-2 px-4 pt-1">
        <label className="flex h-13 flex-1 items-center gap-2 rounded-full bg-[var(--paper-2)] px-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span className="sr-only">Search the menu</span>
          <input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" placeholder="Nutella, mango, boba…"
            className="h-12 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--ink-soft)]" />
        </label>
        <CloseButton onClick={onClose} />
      </div>
      <div aria-live="polite" className="px-4 pt-2">
        {q.trim() && !hits.length && (
          <div className="px-2 pt-6">
            <p className="font-serif text-[22px] font-semibold">Nothing by that name.</p>
            <button onClick={() => setQ('')} className="mt-3 h-11 rounded-full bg-[var(--paper-2)] px-5 font-bold">Clear search</button>
          </div>
        )}
        <ul className="divide-y divide-[var(--line)]">
          {hits.map((i) => (
            <li key={i.id}>
              <button onClick={() => onOpen(i)} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="size-14 shrink-0 overflow-hidden rounded-xl"><Art item={i} w={140} className="size-full" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[18px] font-semibold">{i.name}</span>
                  <span className="block text-[13px] text-[var(--ink-soft)]">{i.cat}{i.soldOut ? ' · sold out today' : ''}</span>
                </span>
                <Price item={i} className="text-[17px]" />
              </button>
            </li>
          ))}
        </ul>
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

