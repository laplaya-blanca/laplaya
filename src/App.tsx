import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { loadContent, type Content, type Item } from './lib/content';
import { lightAt, openState, type Light } from './lib/time';
import { orderText, useCart } from './lib/cart';
import { flavourColours } from './lib/flavor';
import { Shore } from './components/Shore';
import { Art, CategoryBar, Scene, type View } from './components/Menu';
import { CartSheet, CategoriesSheet, Dock, ItemSheet, SearchSheet, Ticket, TideWave } from './components/Sheets';
import { Events, Footer } from './components/Shoreline';
import { Water } from './components/Water';

type Open = null | { t: 'item'; item: Item } | { t: 'cart' } | { t: 'ticket' } | { t: 'cats' } | { t: 'search' };

function useLight() {
  const [light, setLight] = useState<Light>(() => lightAt());
  useEffect(() => { const id = setInterval(() => setLight(lightAt()), 60_000); return () => clearInterval(id); }, []);
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(light.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    root.toggleAttribute('data-dark', light.dark);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', light.vars['--sky-1']);
  }, [light]);
  return light;
}

export function App() {
  const light = useLight();
  const [content, setContent] = useState<Content | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<Open>(null);
  const [tide, setTide] = useState(false);
  const [active, setActive] = useState('');
  const [inMenu, setInMenu] = useState(false);
  const [bump, setBump] = useState(0);
  const [view, setViewState] = useState<View>(() => { try { return (localStorage.getItem('lpb-view') as View) || 'rail'; } catch { return 'rail'; } });
  const { cart, lines, count, total, unpriced, dispatch } = useCart();
  const menuRef = useRef<HTMLDivElement>(null);
  const tideTimer = useRef(0);
  const markRef = useRef<HTMLDivElement>(null);
  const openItem = useCallback((item: Item) => setOpen({ t: 'item', item }), []);

  const load = useCallback(() => {
    setFailed(false);
    loadContent().then(setContent).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const cats = content?.categories || [];
  const all = useMemo(() => cats.flatMap((c) => c.items), [cats]);
  const picks = useMemo(() => all.filter((i) => i.signature && !i.soldOut), [all]);
  useEffect(() => { if (all.length) dispatch({ type: 'sync', items: new Map(all.map((i) => [i.id, i])) }); }, [all, dispatch]);

  // which category is under the reading line, and whether we've left the shore
  useEffect(() => {
    if (!cats.length) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.cat!); }), { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('[data-cat]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [cats, view]);
  useEffect(() => {
    // a 1px marker at the top of the menu: once it passes under the top 80px we're in the menu.
    // An observer, not a scroll listener, so scrolling never forces a layout or a React render.
    const el = markRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setInMenu(!e.isIntersecting && e.boundingClientRect.top < 80), { rootMargin: '-80px 0px 0px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const setView = (v: View) => { setViewState(v); try { localStorage.setItem('lpb-view', v); } catch { /* not remembered */ } };
  const goTo = (key: string) => { setOpen(null); requestAnimationFrame(() => document.getElementById('cat-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
  const enter = () => menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // the add: a drop in the item's flavour colour arcs into the order button, which springs
  const add = useCallback((item: Item, from?: HTMLElement | null) => {
    if (item.soldOut) return;
    dispatch({ type: 'add', item });
    navigator.vibrate?.(12);
    const to = document.querySelector('[data-cart-target]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (from && to && !reduced) {
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const dot = document.createElement('div');
      const col = flavourColours(item.name, item.kind)[0];
      dot.style.cssText = `position:fixed;z-index:70;left:${a.left + a.width / 2 - 11}px;top:${a.top + a.height / 2 - 11}px;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${col};box-shadow:0 0 0 3px #fff8,0 8px 18px rgba(0,0,0,.25);pointer-events:none`;
      document.body.appendChild(dot);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const anim = dot.animate([
        { transform: 'translate(0,0) rotate(-45deg) scale(1)' },
        { transform: `translate(${dx * 0.45}px,${Math.min(dy * 0.45, 0) - 90}px) rotate(-45deg) scale(1.15)`, offset: 0.45 },
        { transform: `translate(${dx}px,${dy}px) rotate(-45deg) scale(.35)`, opacity: 0.6 }
      ], { duration: 620, easing: 'cubic-bezier(.45,0,.2,1)' });
      let landed = false;
      const land = () => { if (landed) return; landed = true; dot.remove(); setBump((n) => n + 1); };
      anim.onfinish = land;
      setTimeout(land, 900); // background tabs may never finish the animation
    } else setBump((n) => n + 1);
  }, [dispatch]);

  const surprise = () => {
    const pool = all.filter((i) => !i.soldOut);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setOpen({ t: 'item', item: pick }); return; }
    if (tideTimer.current) return; // a wave is already on its way
    setTide(true);
    tideTimer.current = window.setTimeout(() => { tideTimer.current = 0; setOpen({ t: 'item', item: pick }); }, 620);
  };

  useEffect(() => () => clearTimeout(tideTimer.current), []);

  const whatsapp = () => {
    const num = String(content?.site.contact.whatsapp || '96171245911').replace(/\D/g, '');
    window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(orderText(lines, total, unpriced)), '_blank', 'noopener');
  };

  const site = content?.site || null;
  const os = site ? openState(site.hours.weekly) : null;

  return (
    <>
      <Shore light={light} open={os} hours={site?.hours.headline || 'Daily, in season'} count={all.length} onEnter={enter} />
      <CategoryBar cats={cats} active={active} onPick={goTo} view={view} setView={setView} visible={inMenu && cats.length > 0} />

      <Water dark={light.dark} className="pointer-events-none fixed inset-0 -z-10 h-lvh w-full" />
      <main ref={menuRef} id="menu" aria-label="Menu" className="on-water relative pb-6">
        <div ref={markRef} aria-hidden className="absolute top-0 h-px w-px" />
        <div className="px-6 pt-8">
          <h2 className="font-serif text-[34px] font-semibold leading-[1.02]">{greeting(light)}</h2>
          <p className="mt-2 text-[16px] text-[var(--ink-soft)]">Swipe through each stretch of the lake, tap anything to see it closer.</p>
        </div>

        {failed && (
          <div role="alert" className="paper mx-4 mt-6 rounded-[24px] bg-[var(--paper)] p-6">
            <p className="font-serif text-[24px] font-semibold">The menu is washing back in…</p>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">We couldn’t load it just now. You can still order by phone or WhatsApp.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={load} className="h-12 rounded-full bg-[var(--accent)] px-6 font-extrabold text-[var(--accent-ink)]">Try again</button>
              <a href="https://wa.me/96171245911" className="flex h-12 items-center rounded-full bg-[var(--paper-2)] px-5 font-bold">WhatsApp us</a>
            </div>
          </div>
        )}

        {!content && !failed && (
          <div aria-busy="true" aria-label="Loading the menu" className="mt-6">
            <div className="skeleton mx-4 h-[30svh] rounded-[28px]" />
            <div className="mt-4 flex gap-3.5 overflow-hidden px-5">
              {[0, 1].map((i) => <div key={i} className="skeleton aspect-[5/8] w-[min(72vw,290px)] shrink-0 rounded-[26px]" />)}
            </div>
          </div>
        )}

        {picks.length > 0 && (
          <section aria-labelledby="picks-h" className="pt-6">
            <h2 id="picks-h" className="px-6 text-[13px] font-extrabold uppercase tracking-[.2em] text-[var(--ink-soft)]">House favourites</h2>
            <div className="rail mt-3">
              {picks.map((p) => (
                <button key={p.id} onClick={() => setOpen({ t: 'item', item: p })} className="w-[132px] text-left">
                  <span className="block aspect-square overflow-hidden rounded-[22px] shadow-[0_10px_24px_rgba(6,20,29,.12)]">
                    <PickArt item={p} />
                  </span>
                  <span className="mt-2 block font-serif text-[17px] font-semibold leading-tight">{p.name}</span>
                  <span className="block text-[13px] text-[var(--ink-soft)]">{p.cat}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {content && !cats.length && (
          <div role="status" className="paper mx-4 mt-6 rounded-[24px] bg-[var(--paper)] p-6">
            <p className="font-serif text-[24px] font-semibold">Fresh menu on its way</p>
            <p className="mt-1 text-[15px] text-[var(--ink-soft)]">We’re updating it right now. Ask at the counter, or message us on WhatsApp.</p>
            <a href="https://wa.me/96171245911" className="mt-4 inline-flex h-12 items-center rounded-full bg-[var(--accent)] px-6 font-extrabold text-[var(--accent-ink)]">WhatsApp us</a>
          </div>
        )}

        {cats.map((c) => (
          <Scene key={c.key} cat={c} view={view} onOpen={openItem} onAdd={add} />
        ))}
      </main>

      {content && <Events site={site} />}
      <Footer site={site} />

      <Dock count={count} total={total} bump={bump} show={inMenu}
        onCats={() => setOpen({ t: 'cats' })} onSearch={() => setOpen({ t: 'search' })} onTide={surprise} onCart={() => setOpen({ t: 'cart' })} />

      <AnimatePresence>
        {open?.t === 'item' && <ItemSheet key={'i' + open.item.id} item={open.item} qty={cart[open.item.id]?.qty || 0} onAdd={add} onClose={() => setOpen(null)} />}
        {open?.t === 'cart' && <CartSheet key="cart" lines={lines} total={total} unpriced={unpriced} picks={picks} onOpen={(item) => setOpen({ t: 'item', item })}
          onQty={(id, d) => dispatch({ type: 'qty', id, d })} onClose={() => setOpen(null)} onWhatsApp={whatsapp} onTicket={() => setOpen({ t: 'ticket' })} />}
        {open?.t === 'ticket' && <Ticket key="ticket" lines={lines} total={total} unpriced={unpriced} onClose={() => setOpen(null)} />}
        {open?.t === 'cats' && <CategoriesSheet key="cats" cats={cats} onPick={goTo} onClose={() => setOpen(null)} />}
        {open?.t === 'search' && <SearchSheet key="search" items={all} onOpen={(item) => setOpen({ t: 'item', item })} onClose={() => setOpen(null)} />}
      </AnimatePresence>
      {tide && <TideWave onDone={() => setTide(false)} />}
    </>
  );
}

function PickArt({ item }: { item: Item }) { return <Art item={item} w={280} className="size-full" />; }

function greeting(l: Light) {
  switch (l.phase) {
    case 'morning': return 'Good morning from the lake.';
    case 'afternoon': return 'The water’s warm. What are you having?';
    case 'golden': return 'Golden hour. Something sweet?';
    case 'sunset': return 'Sunset’s on. Pick your dessert.';
    default: return 'The lake is dark, the counter isn’t.';
  }
}
