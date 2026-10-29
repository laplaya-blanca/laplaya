import { useEffect, useRef, useState } from 'react';
import { CloseButton, Sheet } from './Sheet';

// Games for the table while the order is on its way: Crab Pop, Four in a Row and Snakes & Ladders. They are plain
// pages of their own in play/ (also open at /play, e.g. from a QR code on the tables), shown here in a tall sheet and
// loaded only when it opens, so the menu carries none of their weight. The light is the one the sheet opened in, so
// a game is never reloaded halfway when dusk falls; Escape pressed inside a game closes the sheet.
export function GameSheet({ night, onClose }: { night: boolean; onClose: () => void }) {
  const [src] = useState(() => '/play/?in=site' + (night ? '&night' : ''));
  const frame = useRef<HTMLIFrameElement>(null);
  const top = useRef<HTMLHeadingElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const msg = (e: MessageEvent) => { if (e.origin === location.origin && e.source === frame.current?.contentWindow && e.data === 'lpb-game:close') close.current(); };
    addEventListener('message', msg);
    return () => removeEventListener('message', msg);
  }, []);
  return (
    <Sheet label="Games while you wait" onClose={onClose} tall>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-5 pt-1">
          <h2 ref={top} className="font-brand text-[26px] font-extrabold uppercase leading-none tracking-[.02em] outline-none" data-autofocus tabIndex={-1}>While you wait</h2>
          <CloseButton onClick={onClose} />
        </div>
        <iframe ref={frame} src={src} title="Games for the table" className="mt-2 block min-h-0 w-full flex-1 border-0 bg-transparent" />
        {/* Tab leaving the game comes back to the top of the sheet instead of the page behind it */}
        <span tabIndex={0} onFocus={() => top.current?.focus()} />
      </div>
    </Sheet>
  );
}
