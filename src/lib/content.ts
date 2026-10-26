// Content the owner edits at /admin (content/*.json). Loaded at runtime so a save shows up on the
// next page load once Netlify has redeployed — same files the dashboard's "live on the site" check reads.

export type Item = {
  id: string;
  name: string;
  cat: string;
  catKey: string;
  price: number | null;
  desc: string;
  tags: string[];
  photo: string;
  // the photo already set on its beach table (scripts/replate.mjs), by day and after dark, when there is one
  plated: Plated;
  soldOut: boolean;
  signature: boolean;
  kind: Kind;
};

export type Plated = { day?: string; night?: string };

export type Kind = 'pancake' | 'crepe' | 'waffle' | 'glass' | 'juice' | 'shake' | 'coffee' | 'boba' | 'scoop';

export type Category = {
  key: string;
  name: string;
  description: string;
  temp: string;
  kind: Kind;
  items: Item[];
};

export type Hours = {
  headline: string;
  subline: string;
  note: string;
  weekly: { day: string; open: string; close: string; closed: boolean }[];
};

export type Site = {
  hours: Hours;
  contact: { phone: string; whatsapp: string; instagram: string };
  lbpRate: number;
};

export type Content = { categories: Category[]; site: Site; gallery: { image: string; caption: string }[] };

const KINDS: Kind[] = ['pancake', 'crepe', 'waffle', 'glass', 'juice', 'shake', 'coffee', 'boba', 'scoop'];

export const slug = (s: string) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// an emptied number field may come through as "" — that means "no price yet"
const num = (v: unknown) => (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));

// only repo-relative image paths (uploads/ or assets/) — never arbitrary URLs from content
const safePhoto = (p: unknown) => (typeof p === 'string' && /^\/?(uploads|assets)\/[\w.\-]+$/.test(p) ? '/' + p.replace(/^\//, '') : '');

type RawMenu = { categories?: { name?: string; description?: string; icon?: string; temp?: string; items?: Record<string, unknown>[] }[] };

// assets/plated.json: owner photo → the same dish already set on its beach table. Only our own files in assets/plated/,
// and only for the photo they were made from, so a fresh upload shows on its own until it has been re-plated too.
type RawPlated = Record<string, { day?: unknown; night?: unknown }>;
const safePlated = (p: unknown) => (typeof p === 'string' && /^\/assets\/plated\/[\w.\-]+$/.test(p) ? p : undefined);

function buildMenu(raw: RawMenu, plated: RawPlated = {}): Category[] {
  const out: Category[] = [];
  const seen = new Set<string>();
  (Array.isArray(raw?.categories) ? raw.categories : []).forEach((c, ci) => {
    if (!c || typeof c.name !== 'string' || !c.name.trim()) return;
    const kind = (KINDS.includes(c.icon as Kind) ? c.icon : 'glass') as Kind;
    // Arabic-only names slug to '' — fall back to the position so keys, anchors and cart ids stay unique
    let catKey = slug(c.name) || 'c' + ci;
    while (seen.has(catKey)) catKey += '-2';
    seen.add(catKey);
    const idBase = c.name.toLowerCase().replace(/[^a-z]/g, '') || catKey;
    const items: Item[] = [];
    (Array.isArray(c.items) ? c.items : []).forEach((row, i) => {
      const name = row && typeof row.name === 'string' ? row.name.trim() : '';
      if (!name) return;
      const own = Array.isArray(row.tags) ? (row.tags as string[]) : [];
      items.push({
        // same id scheme as the previous site, so nothing about the cart format changes
        id: idBase + '-' + (slug(name) || 'item') + '-' + i,
        name,
        cat: c.name!,
        catKey,
        price: num(row.price),
        desc: (typeof row.description === 'string' && row.description) || c.description || '',
        tags: own.filter((t) => t !== 'Signature'),
        photo: safePhoto(row.photo),
        plated: { day: safePlated(plated[safePhoto(row.photo)]?.day), night: safePlated(plated[safePhoto(row.photo)]?.night) },
        soldOut: row.available === false,
        signature: own.includes('Signature'),
        kind
      });
    });
    if (items.length) out.push({ key: catKey, name: c.name, description: c.description || '', temp: c.temp || '', kind, items });
  });
  return out;
}

// the page reads these fields unguarded, so a half-filled site.json must still have every one of them
const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
function normaliseSite(raw: any): Site {
  const h = raw?.hours || {}, c = raw?.contact || {};
  return {
    hours: {
      headline: str(h.headline), subline: str(h.subline), note: str(h.note),
      weekly: (Array.isArray(h.weekly) ? h.weekly : []).filter((w: any) => w && typeof w.day === 'string')
        .map((w: any) => ({ day: w.day, open: str(w.open), close: str(w.close), closed: w.closed === true }))
    },
    contact: { phone: str(c.phone), whatsapp: str(c.whatsapp), instagram: str(c.instagram).replace(/^@/, '') },
    lbpRate: Number(raw?.lbpRate) || 0
  };
}

const get = (name: string) =>
  fetch('/content/' + name + '.json', { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error(name + '.json ' + r.status);
    return r.json();
  });

export async function loadContent(): Promise<Content> {
  const plated = fetch('/assets/plated.json').then((r) => (r.ok ? r.json() : {})).then((j: unknown) => (j && typeof j === 'object' ? j as RawPlated : {})).catch(() => ({}));
  const [menu, site, gallery, ready] = await Promise.all([get('menu'), get('site'), get('gallery').catch(() => ({ photos: [] })), plated]);
  return {
    categories: buildMenu(menu, ready),
    site: normaliseSite(site),
    gallery: ((gallery && gallery.photos) || []).map((p: { image?: string; caption?: string }) => ({ image: safePhoto(p.image), caption: p.caption || '' })).filter((p: { image: string }) => p.image)
  };
}

// Netlify Image CDN resizes big phone photos per screen; local preview uses the raw file.
const CDN = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export const img = (src: string, w: number) => (!src ? '' : CDN ? '/.netlify/images?url=' + encodeURIComponent(src) + '&w=' + w + '&q=75' : src);

export const money = (p: number | null) => (p == null ? '' : '$' + (Number.isInteger(p) ? p : p.toFixed(2)));
