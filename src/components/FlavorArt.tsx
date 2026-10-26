import { memo } from 'react';
import type { Kind } from '../lib/content';
import { flavourColours, isDrink, luminance, seeded, tint } from '../lib/flavor';

// Generated stand-in for a photo: a fine-line editorial drawing of the dish, with drizzles / liquid
// layers in the item's own flavour colours. Deterministic per name. Thin strokes and lots of paper —
// deliberately not blobby or cartoonish.
function FlavorArtImpl({ name, kind, className = '' }: { name: string; kind: Kind; className?: string }) {
  const cols = flavourColours(name, kind);
  const rnd = seeded(name + kind);
  const c0 = cols[0];
  const dark = cols.find((c) => luminance(c) < 0.45) || '#5A3A2E';
  const line = luminance(c0) < 0.45 ? c0 : '#3B4A4F';
  const id = 'fa' + Math.floor(rnd() * 1e9).toString(36);

  return (
    <svg viewBox="0 0 300 360" className={className} role="img" aria-label={name} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={id + 'bg'} cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor={tint(c0, 0.9)} />
          <stop offset="1" stopColor={tint(cols[1] || c0, 0.78)} />
        </radialGradient>
      </defs>
      <rect width="300" height="360" fill={`url(#${id}bg)`} />
      {/* faint concentric ripples: the lake under everything */}
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx="150" cy="292" rx={92 + i * 34} ry={16 + i * 7} fill="none" stroke={line} strokeOpacity={0.09 - i * 0.02} strokeWidth="1" />
      ))}
      {isDrink(kind) ? <Drink kind={kind} cols={cols} line={line} dark={dark} rnd={rnd} /> : <Plate kind={kind} cols={cols} line={line} dark={dark} rnd={rnd} />}
    </svg>
  );
}

type P = { kind: Kind; cols: string[]; line: string; dark: string; rnd: () => number };

function Plate({ kind, cols, line, dark, rnd }: P) {
  const base = kind === 'waffle' ? '#E7C07E' : kind === 'scoop' ? tint(cols[0], 0.35) : '#EED3A2';
  const sw = 1.6;
  return (
    <g>
      {/* plate */}
      <ellipse cx="150" cy="250" rx="118" ry="34" fill="#FFFDF7" stroke={line} strokeOpacity=".35" strokeWidth={sw} />
      <ellipse cx="150" cy="246" rx="92" ry="22" fill="none" stroke={line} strokeOpacity=".15" strokeWidth="1" />
      {kind === 'pancake' && [0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={72 + i * 4} y={206 - i * 22} width={156 - i * 8} height="26" rx="13" fill={tint(base, 0.15 + i * 0.08)} stroke={line} strokeOpacity=".55" strokeWidth={sw} />
        </g>
      ))}
      {kind === 'crepe' && (
        <g>
          <path d="M58 228 C 90 176, 210 168, 244 214 C 214 236, 96 244, 58 228 Z" fill={tint(base, 0.2)} stroke={line} strokeOpacity=".55" strokeWidth={sw} />
          <path d="M84 222 C 120 196, 196 192, 226 214" fill="none" stroke={line} strokeOpacity=".3" strokeWidth="1.2" />
        </g>
      )}
      {kind === 'waffle' && (
        <g>
          <rect x="76" y="150" width="148" height="88" rx="18" fill={tint(base, 0.15)} stroke={line} strokeOpacity=".55" strokeWidth={sw} transform="rotate(-6 150 194)" />
          <g transform="rotate(-6 150 194)" stroke={line} strokeOpacity=".22" strokeWidth="1.2">
            {[1, 2, 3, 4, 5].map((i) => <line key={'v' + i} x1={76 + i * 24.6} y1="156" x2={76 + i * 24.6} y2="232" />)}
            {[1, 2, 3].map((i) => <line key={'h' + i} x1="82" y1={150 + i * 22} x2="218" y2={150 + i * 22} />)}
          </g>
        </g>
      )}
      {kind === 'scoop' && (
        <g>
          <path d="M104 214 L196 214 L178 250 L122 250 Z" fill="#FFFDF7" stroke={line} strokeOpacity=".5" strokeWidth={sw} />
          <circle cx="132" cy="190" r="34" fill={tint(cols[0], 0.3)} stroke={line} strokeOpacity=".5" strokeWidth={sw} />
          <circle cx="170" cy="184" r="32" fill={tint(cols[1] || cols[0], 0.25)} stroke={line} strokeOpacity=".5" strokeWidth={sw} />
        </g>
      )}
      <Drizzles cols={cols} dark={dark} rnd={rnd} top={kind === 'pancake' ? 150 : kind === 'scoop' ? 156 : 160} />
      <Crumbs cols={cols} rnd={rnd} y0={kind === 'pancake' ? 140 : 150} />
    </g>
  );
}

// smooth curve through points (Catmull-Rom → cubic Bézier)
function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// a stream poured from above (the brand photo's gesture), then loose syrup lines with drips
function Drizzles({ cols, dark, rnd, top }: { cols: string[]; dark: string; rnd: () => number; top: number }) {
  const n = 2 + Math.floor(rnd() * 2);
  const pourX = 128 + rnd() * 44;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${pourX} 0 C ${pourX + 2} ${top * 0.4}, ${pourX - 3} ${top * 0.7}, ${pourX + 1} ${top + 4}`} stroke={dark} strokeWidth="4.2" />
      {Array.from({ length: n }).map((_, i) => {
        const col = i === 0 ? dark : cols[i % cols.length];
        const y = top + 4 + i * 8 + rnd() * 5;
        const x0 = 64 + rnd() * 16, x1 = 236 - rnd() * 16;
        const pts: [number, number][] = [];
        const k = 4 + Math.floor(rnd() * 2);
        for (let s = 0; s <= k; s++) pts.push([x0 + ((x1 - x0) * s) / k + (rnd() - 0.5) * 10, y + (rnd() - 0.5) * (9 + i * 2)]);
        const dropAt = pts[1 + Math.floor(rnd() * (k - 2))];
        const len = 14 + rnd() * 24;
        const w = i === 0 ? 4.4 : 2.6 + rnd() * 1;
        return (
          <g key={i} stroke={col} strokeOpacity={luminance(col) > 0.85 ? 0.95 : 0.88}>
            <path d={smooth(pts)} strokeWidth={w} />
            <path d={`M${dropAt[0]} ${dropAt[1]} C ${dropAt[0] + 1} ${dropAt[1] + len * 0.5}, ${dropAt[0] - 1} ${dropAt[1] + len * 0.7}, ${dropAt[0]} ${dropAt[1] + len}`} strokeWidth={w * 0.85} />
            <ellipse cx={dropAt[0]} cy={dropAt[1] + len + 1.5} rx={w * 0.9} ry={w * 1.15} fill={col} stroke="none" />
          </g>
        );
      })}
    </g>
  );
}

function Crumbs({ cols, rnd, y0 }: { cols: string[]; rnd: () => number; y0: number }) {
  return (
    <g>
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 86 + rnd() * 128, y = y0 + rnd() * 50, r = 1.2 + rnd() * 2;
        const col = cols[(i + 1) % cols.length];
        return rnd() > 0.5
          ? <circle key={i} cx={x} cy={y} r={r} fill={col} opacity=".85" />
          : <rect key={i} x={x} y={y} width={r * 2} height={r * 1.4} rx=".6" fill={col} opacity=".8" transform={`rotate(${rnd() * 90} ${x} ${y})`} />;
      })}
    </g>
  );
}

function Drink({ kind, cols, line, dark, rnd }: P) {
  const sw = 1.6;
  if (kind === 'coffee') {
    return (
      <g>
        <ellipse cx="150" cy="262" rx="86" ry="20" fill="#FFFDF7" stroke={line} strokeOpacity=".35" strokeWidth={sw} />
        <path d="M96 170 L204 170 L194 250 Q150 266 106 250 Z" fill="#FFFDF7" stroke={line} strokeOpacity=".55" strokeWidth={sw} />
        <path d="M204 186 C 236 186, 236 226, 198 228" fill="none" stroke={line} strokeOpacity=".55" strokeWidth={sw} />
        <ellipse cx="150" cy="172" rx="54" ry="9" fill={cols[0]} />
        <path d="M128 172 C 140 166, 160 178, 172 170" fill="none" stroke={cols[1] || '#F3E6C4'} strokeWidth="2" strokeLinecap="round" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${130 + i * 20} 150 C ${120 + i * 20} 132, ${144 + i * 20} 122, ${132 + i * 20} 100`} fill="none" stroke={line} strokeOpacity=".25" strokeWidth="1.4" strokeLinecap="round" />
        ))}
      </g>
    );
  }
  // tall glass with poured layers
  const top = 112, bottom = 274, wTop = 64, wBot = 50;
  const xAt = (y: number, side: -1 | 1) => 150 + side * (wBot + ((wTop - wBot) * (bottom - y)) / (bottom - top));
  const layers = kind === 'boba' ? [cols[0], tint(cols[0], 0.35)] : cols.length > 1 ? cols.slice(0, 3) : [cols[0], tint(cols[0], 0.4)];
  const liquidTop = 136;
  const step = (bottom - liquidTop) / layers.length;
  const wave = (y: number) => {
    const l = xAt(y, -1), r = xAt(y, 1), a = 4 + rnd() * 4;
    return `M${l} ${y} C ${l + (r - l) * 0.3} ${y - a}, ${l + (r - l) * 0.6} ${y + a}, ${r} ${y}`;
  };
  return (
    <g>
      <ellipse cx="150" cy={bottom + 6} rx="70" ry="10" fill={line} opacity=".08" />
      <clipPath id={'g' + kind + layers.join('').replace(/#/g, '')}>
        <path d={`M${xAt(top, -1)} ${top} L${xAt(top, 1)} ${top} L${xAt(bottom, 1)} ${bottom} Q150 ${bottom + 8} ${xAt(bottom, -1)} ${bottom} Z`} />
      </clipPath>
      <g clipPath={`url(#${'g' + kind + layers.join('').replace(/#/g, '')})`}>
        {layers.map((c, i) => {
          const y = liquidTop + i * step;
          return <path key={i} d={wave(y) + ` L${xAt(bottom + 20, 1)} ${bottom + 20} L${xAt(bottom + 20, -1)} ${bottom + 20} Z`} fill={i === 0 ? tint(c, 0.12) : c} opacity={i === 0 ? 0.95 : 1} />;
        })}
        {kind === 'boba' && Array.from({ length: 16 }).map((_, i) => (
          <circle key={i} cx={112 + rnd() * 76} cy={248 + rnd() * 22} r="6" fill={dark === cols[0] ? '#2E2A2C' : '#2E2A2C'} opacity=".92" />
        ))}
        {(kind === 'shake' || kind === 'glass' || kind === 'juice') && Array.from({ length: 9 }).map((_, i) => (
          <circle key={i} cx={116 + rnd() * 68} cy={160 + rnd() * 90} r={1.4 + rnd() * 2.2} fill="#fff" opacity=".55" />
        ))}
        {kind !== 'boba' && [0, 1].map((i) => (
          <rect key={'ice' + i} x={122 + i * 28 + rnd() * 6} y={142 + rnd() * 14} width="24" height="22" rx="5" fill="#fff" opacity=".28" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" transform={`rotate(${rnd() * 30 - 15} ${134 + i * 28} 152)`} />
        ))}
      </g>
      {/* glass + straw */}
      <path d={`M${xAt(top, -1)} ${top} L${xAt(bottom, -1)} ${bottom} Q150 ${bottom + 8} ${xAt(bottom, 1)} ${bottom} L${xAt(top, 1)} ${top}`} fill="none" stroke={line} strokeOpacity=".55" strokeWidth={sw} />
      <ellipse cx="150" cy={top} rx={wTop} ry="7" fill="none" stroke={line} strokeOpacity=".45" strokeWidth={sw} />
      <path d={`M${162} ${bottom - 30} L${184} ${top - 36} L${200} ${top - 44}`} fill="none" stroke={kind === 'boba' ? '#E8A44C' : line} strokeOpacity={kind === 'boba' ? 1 : 0.5} strokeWidth={kind === 'boba' ? 7 : 3} strokeLinecap="round" />
      {kind === 'shake' && <path d={`M${xAt(top, -1) + 4} ${top} C 110 ${top - 30}, 190 ${top - 34}, ${xAt(top, 1) - 4} ${top}`} fill="#FFFDF7" stroke={line} strokeOpacity=".4" strokeWidth={sw} />}
    </g>
  );
}

export const FlavorArt = memo(FlavorArtImpl);
