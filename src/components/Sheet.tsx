import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useDragControls, useReducedMotion, type PanInfo } from 'motion/react';

// open sheets, newest last: only the top one reacts to Escape / Tab, and focus goes back where it came from
const stack: object[] = [];
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

// Bottom sheet for phones (item, cart, categories, search). Drag down or tap outside to close.
export function Sheet({ label, onClose, children, tall = false }: { label: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const controls = useDragControls();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const me = {}, prev = document.activeElement as HTMLElement | null;
    stack.push(me);
    document.body.classList.add('locked');
    const first = ref.current?.querySelector<HTMLElement>('[data-autofocus]') || ref.current;
    first?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me || !ref.current) return;
      if (e.key === 'Escape') { e.preventDefault(); close.current(); return; }
      if (e.key !== 'Tab') return;
      const f = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!f.length) return;
      const list = Array.from(f), at = document.activeElement as HTMLElement;
      // focus may sit on the tabindex=-1 heading, which isn't in the list — wrap from there too
      if (e.shiftKey && (at === f[0] || !list.includes(at))) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    addEventListener('keydown', key);
    return () => {
      removeEventListener('keydown', key);
      stack.splice(stack.indexOf(me), 1);
      // when another sheet replaced this one, leave focus in the new sheet
      if (!stack.length) { document.body.classList.remove('locked'); prev?.focus?.({ preventScroll: true }); }
    };
  }, []);

  const drag = (_: unknown, i: PanInfo) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <motion.div className="absolute inset-0 bg-[#06141d]/55" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
      <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        className={'grain relative w-full max-w-[560px] overflow-hidden rounded-t-[30px] bg-[var(--paper)] text-[var(--ink)] shadow-[0_-20px_60px_rgba(0,0,0,.25)] outline-none flex flex-col ' + (tall ? 'h-[92svh]' : 'max-h-[92svh]')}
        initial={still ? { opacity: 0 } : { y: '100%' }} animate={still ? { opacity: 1 } : { y: 0 }} exit={still ? { opacity: 0 } : { y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        drag={still ? false : 'y'} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={drag} dragListener={false} dragControls={controls}>
        {/* drag from the top strip only, so the content inside can scroll normally */}
        <div className="shrink-0 touch-none pt-2.5 pb-1" onPointerDown={(e) => controls.start(e)}>
          <div aria-hidden className="mx-auto h-1.5 w-11 rounded-full bg-[var(--ink)]/20" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(20px,env(safe-area-inset-bottom))]">{children}</div>
      </motion.div>
    </div>
  );
}

export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--paper-2)] text-[var(--ink)] active:scale-95 transition-transform">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
}
