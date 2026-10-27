import type { Site } from '../lib/content';

// The footer's richer pieces: a treasure map to the shop, contact tiles with their own marks, and the maker's
// signature. Everything moves only while the footer is on screen (.afloat on the footer), and stays still on reduced
// motion.

const INK = '#6B4A26', SEA = '#0B7285';

const Ship = (p: { className?: string }) => (
  <g className={p.className}>
    <path d="M-13 3 H13 L8 10 H-8 Z" fill={INK} />
    <path d="M0 -16 V3" stroke={INK} strokeWidth="1.6" />
    <path d="M1.5 -15 L12 0 H1.5 Z" fill="#FBF4E2" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M-1.5 -11 L-9 0 H-1.5 Z" fill="#FBF4E2" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M0 -16 L6 -18.5 L0 -20" fill="#B5452F" />
  </g>
);

// a chest whose lid swings open when the map is pressed (.lid turns about its back hinge)
export const Chest = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="-18 -18 36 36" aria-hidden className="chest overflow-visible">
    <rect x="-14" y="-3" width="28" height="17" rx="2.5" fill="#8A5A2B" stroke="#3E2A14" strokeWidth="1.4" />
    <path d="M-14 4 H14" stroke="#3E2A14" strokeWidth="1.2" />
    <rect x="-8" y="-3" width="3" height="17" fill="#D9A441" /><rect x="5" y="-3" width="3" height="17" fill="#D9A441" />
    <path className="glow" d="M-11 -4 Q0 -14 11 -4 Z" fill="#FFD66B" opacity="0" />
    <g className="lid">
      <path d="M-14 -3 V-7 Q0 -17 14 -7 V-3 Z" fill="#A06A34" stroke="#3E2A14" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M-8 -3 V-11.4 M-5 -3 V-12.6 M5 -3 V-12.6 M8 -3 V-11.4" stroke="#D9A441" strokeWidth="1.6" />
      <rect x="-2.6" y="-5.5" width="5.2" height="6" rx="1" fill="#E8C35A" stroke="#3E2A14" strokeWidth="1" />
    </g>
  </svg>
);

// a box on the map, in the map's own 320×210 units
const onMap = (x: number, y: number, w: number, h: number) => ({ left: (x / 320) * 100 + '%', top: (y / 210) * 100 + '%', width: (w / 320) * 100 + '%', height: (h / 210) * 100 + '%' });

// Find us, as a treasure map: Lake Qaraoun drawn in ink on old paper, a little ship sailing at the top, a dotted
// course down the water to an X on the east shore where the chest is buried. The whole map opens Google Maps.
export function TreasureMap({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener" className="treasure drift block" style={{ ['--i' as string]: 0 }}>
      <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--glint)]">Find us · X marks the spot</p>
      <div className="parchment mt-3">
        <div className="relative">
        <svg viewBox="0 0 320 210" className="block w-full" aria-hidden>
          <defs>
            <pattern id="ripples" width="22" height="12" patternUnits="userSpaceOnUse">
              <path d="M2 7 q3 -3 6 0 t6 0" fill="none" stroke={SEA} strokeOpacity=".35" strokeWidth="1" />
            </pattern>
          </defs>
          {/* the Bekaa's hills either side of the lake */}
          <g fill="none" stroke={INK} strokeOpacity=".55" strokeWidth="1.3" strokeLinejoin="round">
            <path d="M30 70 l10 -14 l10 14 M46 70 l8 -10 l8 10" /><path d="M52 118 l10 -14 l10 14" /><path d="M262 54 l10 -14 l10 14 M278 54 l8 -10 l8 10" />
            <path d="M258 112 l9 -12 l9 12" /><path d="M36 176 l8 -10 l8 10" />
          </g>
          {/* Lake Qaraoun: long and narrow, north to south */}
          <path d="M150 16 C182 24 194 58 186 90 C180 118 202 148 184 178 C170 200 140 196 132 172 C124 148 108 124 116 94 C122 66 118 30 150 16 Z"
            fill="#7CC0C4" fillOpacity=".45" stroke={SEA} strokeWidth="1.6" />
          <path d="M150 16 C182 24 194 58 186 90 C180 118 202 148 184 178 C170 200 140 196 132 172 C124 148 108 124 116 94 C122 66 118 30 150 16 Z" fill="url(#ripples)" />
          <text x="0" y="0" transform="translate(140 132) rotate(-78)" fill={SEA} fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="11" letterSpacing="1.2">Lake Qaraoun</text>
          <text x="224" y="136" fill={INK} fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="12">La Playa Blanca</text>
          {/* compass rose */}
          <g transform="translate(282 182)" fill={INK}>
            <circle r="15" fill="none" stroke={INK} strokeOpacity=".5" />
            <path d="M0 -17 L3 -3 L0 0 L-3 -3 Z" fill="#B5452F" /><path d="M0 17 L3 3 L0 0 L-3 3 Z" />
            <path d="M17 0 L3 3 L0 0 L3 -3 Z" /><path d="M-17 0 L-3 3 L0 0 L-3 -3 Z" />
            <text y="-20" textAnchor="middle" fontSize="8" fontFamily="Manrope, sans-serif" fontWeight="800">N</text>
          </g>
          <text x="22" y="200" fill={INK} fillOpacity=".7" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="8" letterSpacing="2">WEST BEKAA · LEBANON</text>
        </svg>
        {/* The moving parts sit on layers of their own over the still map. Animated inside the map's svg they made the
            browser repaint the whole parchment (clip-path, blended grain) every frame, which stuttered the scroll past
            the catering form. The ship and the ring are animated on plain spans (the GPU won't take an animation on an
            svg element), and the dots, which can only move by repainting, repaint just this layer. */}
        <svg viewBox="0 0 320 210" aria-hidden className="absolute inset-0 size-full [will-change:transform]">
          {/* the course: dots marching from the ship to the X */}
          <path className="course" d="M154 54 C142 78 170 92 160 116 C152 136 176 146 204 150" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 7" />
        </svg>
        <span aria-hidden className="sail absolute" style={onMap(142, 19, 28, 32)}><svg viewBox="-14 -21 28 32" className="block size-full"><Ship /></svg></span>
        {/* X on the east shore, with the chest beside it */}
        <span aria-hidden className="absolute" style={onMap(199, 137, 26, 26)}>
          <span className="ping absolute inset-0"><svg viewBox="-13 -13 26 26" className="block size-full overflow-visible"><circle r="12" fill="none" stroke="#B5452F" strokeWidth="1.5" /></svg></span>
          <svg viewBox="-13 -13 26 26" className="absolute inset-0 size-full"><path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#B5452F" strokeWidth="3.2" strokeLinecap="round" /></svg>
        </span>
        </div>
        <div className="flex items-center gap-3 px-4 pb-4 pt-1">
          <Chest size={42} />
          <div className="min-w-0 flex-1">
            <p className="font-brand text-[19px] font-extrabold uppercase leading-none tracking-[.02em] text-[#3E2A14]">Qaraaoun, West Bekaa</p>
            <p className="mt-1 text-[13px] font-semibold text-[#6B4A26]">On the white sand by the lake</p>
          </div>
          <span className="grid h-10 shrink-0 place-items-center rounded-full bg-[#3E2A14] px-4 text-[14px] font-extrabold text-[#F4E9CF]">Open map<span className="sr-only"> (opens in a new tab)</span></span>
        </div>
      </div>
    </a>
  );
}

// marks for the three ways to say hello
const PhoneMark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);
const WhatsAppMark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3.5 20.5l1.3-4.2A8.6 8.6 0 1 1 8 19.3z" />
    <path d="M9 8.6c0 3.3 3 6.3 6.4 6.4l1.1-1.3-1.8-1.1-.9.8a5 5 0 0 1-2.8-2.8l.8-.9-1.1-1.8z" fill="currentColor" strokeWidth="1" />
  </svg>
);
export const InstagramMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.4" cy="6.6" r=".6" fill="currentColor" />
  </svg>
);

// Say hello: three glass tiles afloat, each with its mark on a disc in its own colour
export function Hello({ c }: { c: Site['contact'] }) {
  const tiles = [
    { href: 'tel:' + (c.phone || '').replace(/[^\d+]/g, ''), mark: <PhoneMark />, disc: 'bg-[#F9F6E3] text-[#007385]', name: 'Call', sub: c.phone, out: false },
    { href: 'https://wa.me/' + String(c.whatsapp).replace(/\D/g, ''), mark: <WhatsAppMark />, disc: 'bg-[#25D366] text-white', name: 'WhatsApp', sub: 'Message us', out: true },
    { href: 'https://instagram.com/' + encodeURIComponent(c.instagram), mark: <InstagramMark />, disc: 'ig text-white', name: 'Instagram', sub: '@' + c.instagram, out: true }
  ];
  const shown = tiles.filter((_, i) => [c.phone, c.whatsapp, c.instagram][i]);
  if (!shown.length) return null;
  return (
    <div>
      <p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-[var(--glint)]">Say hello</p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {shown.map((t, i) => (
          <div key={t.name} className="slot">
            <a href={t.href} target={t.out ? '_blank' : undefined} rel={t.out ? 'noopener' : undefined}
              className="hello glass3d splash drift flex flex-col items-center rounded-[22px] px-1.5 pb-3 pt-4 text-center" style={{ ['--i' as string]: i + 1 }}>
              <span className={'grid size-12 place-items-center rounded-full shadow-[0_6px_16px_rgba(3,20,26,.3)] ' + t.disc}>{t.mark}</span>
              <span className="mt-2.5 text-[14px] font-extrabold text-[#F9F6E3]">{t.name}</span>
              <span className="mt-0.5 w-full truncate text-[11.5px] text-[#F9F6E3]/90">{t.sub}</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// the maker's signature, linked to his Instagram, in a ring of Instagram's colours turning slowly
export function Signature() {
  return (
    <a href="https://instagram.com/iamohammadyassin" target="_blank" rel="noopener" className="signature group mt-2 flex flex-col items-center lg:mt-0 lg:flex-row lg:gap-4">
      <span className="font-serif text-[24px] font-semibold tracking-[-.01em] text-[#F3ECDD] transition-colors group-active:text-[var(--glint)]">Mohammad Yassin</span>
      <span className="ig-ring mt-3 inline-flex lg:mt-0 rounded-full p-[1.5px]">
        <span className="flex h-9 items-center gap-2 rounded-full bg-[#0B1E26] px-3.5 text-[13px] font-bold text-[#F3ECDD]">
          <InstagramMark size={16} />@iamohammadyassin
        </span>
      </span>
    </a>
  );
}
