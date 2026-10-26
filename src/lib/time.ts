// The lake at the hour you're looking at it. Everything is computed in Lebanon time (Asia/Beirut),
// so a visitor abroad still sees the light that is on the water right now.

export type Phase = 'morning' | 'afternoon' | 'golden' | 'sunset' | 'night';

export type Light = {
  phase: Phase;
  label: string;
  hour: number; // fractional hour, Beirut
  clock: string; // "16:42"
  dark: boolean;
  sun: { x: number; y: number } | null; // 0..1 across / up the sky; null at night
  vars: Record<string, string>;
};

export function beirutHour(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Beirut', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')!.value);
  const m = Number(parts.find((p) => p.type === 'minute')!.value);
  return { hour: h + m / 60, clock: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') };
}

export function beirutDay(d = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Beirut', weekday: 'long' }).format(d);
}

const PALETTES: Record<Phase, Record<string, string>> = {
  morning: {
    '--grade': '#E3EEF0',
    '--sky-1': '#F6E5D2', '--sky-2': '#CFE7E4', '--sky-3': '#A9D6D6',
    '--sea-1': '#7FC2C4', '--sea-2': '#3E9AA4', '--sea-3': '#1F7A8C',
    '--sun': '#FFE2B0', '--glow': 'rgba(255,214,160,.55)', '--hills': '#9DB9B3'
  },
  afternoon: {
    '--grade': '#F4FBFB',
    '--sky-1': '#BFE6E8', '--sky-2': '#DDF2EF', '--sky-3': '#F5F3E6',
    '--sea-1': '#4FB6BF', '--sea-2': '#1F8A99', '--sea-3': '#14586B',
    '--sun': '#FFF4D6', '--glow': 'rgba(255,248,220,.6)', '--hills': '#8FB0A9'
  },
  golden: {
    '--grade': '#FFFFFF',
    '--sky-1': '#F2C784', '--sky-2': '#F7DFAE', '--sky-3': '#F6EBD0',
    '--sea-1': '#5FA9A6', '--sea-2': '#2A7F8A', '--sea-3': '#1A5466',
    '--sun': '#FFD27A', '--glow': 'rgba(255,190,100,.6)', '--hills': '#B39A73'
  },
  sunset: {
    '--grade': '#F0A889',
    '--sky-1': '#7D6A9C', '--sky-2': '#E58A6E', '--sky-3': '#F6BE87',
    '--sea-1': '#B67F7E', '--sea-2': '#4E6A86', '--sea-3': '#24405A',
    '--sun': '#FFB27A', '--glow': 'rgba(255,140,100,.55)', '--hills': '#6D5A72'
  },
  night: {
    '--grade': '#FFFFFF',
    '--sky-1': '#08131F', '--sky-2': '#0F2436', '--sky-3': '#1B3A52',
    '--sea-1': '#1A3A50', '--sea-2': '#0F2A3B', '--sea-3': '#081A26',
    '--sun': '#F3EBD6', '--glow': 'rgba(220,230,255,.35)', '--hills': '#16293A'
  }
};

// paper/ink the menu is printed on: cream by day, deep lake by night
const SURFACES = {
  // two colours per light: lake-teal on cream by day, gold on navy by night. --glint is the accent on dark
  // surfaces (photo overlays, footer, dock): cream by day, gold by night. --pill is the order button on the dark dock.
  // --w-* is text set straight on the moving water, --p-* is text on paper (cards, forms) inside it.
  day: { '--paper': '#FBF7EE', '--paper-2': '#F3ECDC', '--ink': '#123F4D', '--ink-soft': '#456570', '--line': 'rgba(18,63,77,.14)', '--water': '#24343B',
    '--w-ink': '#FBF7EE', '--w-ink-soft': 'rgba(251,247,238,.84)', '--w-line': 'rgba(251,247,238,.2)',
    '--p-ink': '#123F4D', '--p-ink-soft': '#456570', '--p-line': 'rgba(18,63,77,.14)',
    '--accent': '#123F4D', '--accent-ink': '#FBF7EE', '--accent-glow': 'rgba(18,63,77,.28)', '--glint': '#F3E9D2', '--pill': '#FBF7EE', '--pill-ink': '#123F4D' },
  night: { '--paper': '#132B3B', '--paper-2': '#0F2331', '--ink': '#F3ECDD', '--ink-soft': '#B9C6C9', '--line': 'rgba(243,236,221,.14)', '--water': '#0B1E2B',
    '--w-ink': '#F3ECDD', '--w-ink-soft': '#B9C6C9', '--w-line': 'rgba(243,236,221,.14)',
    '--p-ink': '#F3ECDD', '--p-ink-soft': '#B9C6C9', '--p-line': 'rgba(243,236,221,.14)',
    '--accent': '#E2C27A', '--accent-ink': '#0B1E2B', '--accent-glow': 'rgba(226,194,122,.3)', '--glint': '#E2C27A', '--pill': '#E2C27A', '--pill-ink': '#0B1E2B' }
};

const LABELS: Record<Phase, string> = {
  morning: 'Morning haze', afternoon: 'Afternoon on the lake', golden: 'Golden hour', sunset: 'Sunset on the water', night: 'Night lake'
};

// When the sun rises and sets over Lake Qaraoun on this date, as Beirut clock hours (NOAA's short formula, good to a
// couple of minutes). So golden hour and night follow the season and the clock change instead of fixed summer times:
// late October the sun is down before five, in June not until nearly eight.
const LAT = 33.56, LON = 35.69;
export function sunTimes(d = new Date()) {
  const rad = Math.PI / 180;
  const day = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5;
  const g = (2 * Math.PI / 365) * (day - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(LAT * rad) * Math.cos(decl)) - Math.tan(LAT * rad) * Math.tan(decl)) / rad;
  // Beirut's offset from UTC right now (+2 in winter, +3 in summer)
  const offset = ((beirutHour(d).hour - (d.getUTCHours() + d.getUTCMinutes() / 60) + 36) % 24) - 12;
  const at = (min: number) => min / 60 + offset;
  return { rise: at(720 - 4 * (LON + ha) - eq), set: at(720 - 4 * (LON - ha) - eq) };
}

// golden hour runs into the sunset, which lasts until the afterglow is gone; morning starts just before sunrise
export function phaseFor(hour: number, { rise, set } = sunTimes()): Phase {
  if (hour >= rise - 0.25 && hour < 11) return 'morning';
  if (hour >= 11 && hour < set - 1.75) return 'afternoon';
  if (hour >= set - 1.75 && hour < set - 0.25) return 'golden';
  if (hour >= set - 0.25 && hour < set + 0.5) return 'sunset';
  return 'night';
}

// ?at=21 (or ?at=6.5) previews the lake at another hour — handy for showing the owner the night look
function previewHour() {
  const v = Number(new URLSearchParams(location.search).get('at'));
  return location.search.includes('at=') && v >= 0 && v < 24 ? v : null;
}

export function lightAt(d = new Date()): Light {
  const real = beirutHour(d), forced = previewHour();
  const hour = forced ?? real.hour;
  const clock = forced == null ? real.clock : String(Math.floor(forced)).padStart(2, '0') + ':' + String(Math.round((forced % 1) * 60)).padStart(2, '0');
  const sky = sunTimes(d);
  const phase = phaseFor(hour, sky);
  const dark = phase === 'night';
  // sun arcs from sunrise (left horizon) to sunset (right horizon); the moon takes its place after dark
  const t = (hour - sky.rise) / (sky.set - sky.rise);
  const sun = t > 0 && t < 1 ? { x: 0.12 + t * 0.76, y: Math.sin(t * Math.PI) } : null;
  return { phase, label: LABELS[phase], hour, clock, dark, sun, vars: { ...PALETTES[phase], ...(dark ? SURFACES.night : SURFACES.day) } };
}

// "Open now" only when the owner has filled in weekly hours; times are "HH:MM", close may pass midnight
export function openState(weekly: { day: string; open: string; close: string; closed: boolean }[] = [], d = new Date()) {
  const toH = (s: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? Number(m[1]) + Number(m[2]) / 60 : null; };
  const today = beirutDay(d);
  const idx = weekly.findIndex((w) => w.day === today);
  if (idx < 0) return null;
  const { hour } = beirutHour(d);
  const check = (w: (typeof weekly)[number], shift: number) => {
    if (!w || w.closed) return false;
    const o = toH(w.open), c = toH(w.close);
    if (o == null || c == null) return null;
    const close = c <= o ? c + 24 : c;
    const h = hour + shift;
    return h >= o && h < close ? close : false;
  };
  // yesterday's late shift may still be running after midnight
  const yesterday = check(weekly[(idx + 6) % 7], 24);
  const now = check(weekly[idx], 0);
  if (now === null && yesterday === null) return null; // hours not filled in
  const fmt = (h: number) => { const x = h % 24; return String(Math.floor(x)).padStart(2, '0') + ':' + String(Math.round((x % 1) * 60)).padStart(2, '0'); };
  if (typeof now === 'number') return { open: true as const, until: fmt(now) };
  if (typeof yesterday === 'number') return { open: true as const, until: fmt(yesterday - 24) };
  const w = weekly[idx];
  return { open: false as const, opens: !w.closed && w.open ? w.open : '' };
}
