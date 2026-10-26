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
  day: { '--paper': '#FBF7EE', '--paper-2': '#F3ECDC', '--ink': '#123F4D', '--ink-soft': '#456570', '--line': 'rgba(18,63,77,.14)', '--water': '#E9F1EC' },
  night: { '--paper': '#132B3B', '--paper-2': '#0F2331', '--ink': '#F3ECDD', '--ink-soft': '#B9C6C9', '--line': 'rgba(243,236,221,.14)', '--water': '#0B1E2B' }
};

const LABELS: Record<Phase, string> = {
  morning: 'Morning haze', afternoon: 'Afternoon on the lake', golden: 'Golden hour', sunset: 'Sunset on the water', night: 'Night lake'
};

export function phaseFor(hour: number): Phase {
  if (hour >= 5.5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  if (hour >= 16 && hour < 18.25) return 'golden';
  if (hour >= 18.25 && hour < 20) return 'sunset';
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
  const phase = phaseFor(hour);
  const dark = phase === 'night';
  // sun arcs from 6:00 (left horizon) to 19:30 (right horizon); the moon takes its place after dark
  const t = (hour - 6) / 13.5;
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
