import { useEffect, useRef, useState } from 'react';
import { CloseButton, Sheet } from './Sheet';

// Games for the table while the order is on its way: Crab Pop, Four in a Row and Snakes & Ladders. They are plain
// pages of their own in play/ (also open at /play, e.g. from a QR code on the tables), shown here in a tall sheet and
// loaded only when it opens, so the menu carries none of their weight. A game opens in the menu's light and follows it
// when dusk falls while it's open, without reloading; Escape pressed inside a game closes the sheet.
export function GameSheet({ night, onClose }: { night: boolean; onClose: () => void }) {
  const [src] = useState(() => '/play/?in=site' + (night ? '&night' : ''));
  const frame = useRef<HTMLIFrameElement>(null);
  const top = useRef<HTMLHeadingElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const dark = useRef(night);
  dark.current = night;
  // the page in the frame hears of the light when it loads (each game is a page of its own) and whenever it changes
  const light = () => frame.current?.contentWindow?.postMessage(dark.current ? 'lpb-game:night' : 'lpb-game:day', location.origin);
  useEffect(() => { light(); }, [night]);
  useEffect(() => {
    const msg = (e: MessageEvent) => { if (e.origin === location.origin && e.source === frame.current?.contentWindow && e.data === 'lpb-game:close') close.current(); };
    addEventListener('message', msg);
    return () => removeEventListener('message', msg);
  }, []);
  // Shift+Tab from the top of the sheet goes into the game, to the last thing there that takes focus
  const intoGame = () => {
    const doc = frame.current?.contentDocument;
    const all = doc ? Array.from(doc.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((el) => el.getClientRects().length) : [];
    (all[all.length - 1] ?? frame.current)?.focus();
  };
  return (
    <Sheet label="Games while you wait" onClose={onClose} tall flush>
      {/* a phone on its side has no height to spare: the title goes (still read out) and the close button stands beside the game */}
      <div className="flex h-full flex-col [@media(max-height:500px)]:flex-row">
        {/* lined up with the list and the games below it, which sit in a 440px column with 14px either side */}
        <div ref={head} className="mx-auto flex w-full max-w-[468px] items-center justify-between px-3.5 pt-1 [@media(max-height:500px)]:order-last [@media(max-height:500px)]:mx-0 [@media(max-height:500px)]:w-auto [@media(max-height:500px)]:max-w-none [@media(max-height:500px)]:items-start [@media(max-height:500px)]:pl-1 [@media(max-height:500px)]:pr-3 [@media(max-height:500px)]:pt-0">
          <h2 ref={top} className="font-brand text-[26px] font-extrabold uppercase leading-none tracking-[.02em] outline-none [@media(max-height:500px)]:sr-only" data-autofocus tabIndex={-1}>While you wait</h2>
          <CloseButton onClick={onClose} />
        </div>
        <iframe ref={frame} src={src} title="Games for the table" onLoad={light} className="mt-2 block min-h-0 w-full flex-1 border-0 bg-transparent [@media(max-height:500px)]:mt-0 [@media(max-height:500px)]:min-w-0" />
        {/* Tab leaving the game comes back to the top of the sheet instead of the page behind it; Shift+Tab from
            the top (which the sheet wraps round to here) goes into the game */}
        <span tabIndex={0} onFocus={(e) => (head.current?.contains(e.relatedTarget as Node | null) ? intoGame() : top.current?.focus())} />
      </div>
    </Sheet>
  );
}
