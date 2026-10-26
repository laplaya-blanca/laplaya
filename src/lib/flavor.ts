import type { Kind } from './content';

// Flavour colours, picked from the words in an item's name. They paint the generated "flavour art"
// that stands in for a photo until the owner uploads one — so Nutella, Oreo and Mango never look alike.
const FLAVOURS: [RegExp, string[]][] = [
  [/white choc/, ['#F3E9D2', '#E2D2B0']],
  [/nutella|choco|cocoa|hot choc|mocha/, ['#5A3A2E', '#8B5A3C']],
  [/oreo|cookies/, ['#2B2A2E', '#F3EFE6']],
  [/kinder/, ['#7A4A2A', '#F6EBD8', '#D9473E']],
  [/snickers|peanut/, ['#9C6B3E', '#D8B07A', '#5A3A2E']],
  [/brownie/, ['#4A2C22', '#7A4B34']],
  [/lotus|biscoff|speculoos/, ['#C88A4A', '#E9C79A']],
  [/arequipe|dulce|caramel|toffee/, ['#C98A3C', '#E7B76A']],
  [/pistach/, ['#9DB86B', '#D9E3B5']],
  [/red velvet/, ['#A8323E', '#F1E3DA']],
  [/strawberr/, ['#D8617F', '#F4B7C5']],
  [/raspberr|berry|berries/, ['#C2405D', '#E68AA0']],
  [/blueberr/, ['#4E5BA6', '#9FA9D9']],
  [/cherry/, ['#A8233A', '#E26A7C']],
  [/mango/, ['#F2A93B', '#F7D06B']],
  [/passion/, ['#E9A23B', '#6E4A6F']],
  [/pineapple/, ['#F2C94C', '#C9B25A']],
  [/banana/, ['#F3D46B', '#E8C34E']],
  [/lemon|lime/, ['#F1DE5C', '#B9CF54']],
  [/orange/, ['#F29A3A', '#F7C27A']],
  [/carrot/, ['#E9822F', '#F2B36A']],
  [/apple/, ['#B7C95A', '#E3E7A6']],
  [/kiwi/, ['#8DB14A', '#2E2A22']],
  [/watermelon/, ['#E85C64', '#8DBF68']],
  [/melon/, ['#F2C38B', '#BFD39A']],
  [/peach/, ['#F4B183', '#F7D3B5']],
  [/lychee/, ['#F3D5DA', '#E7B2BC']],
  [/grape/, ['#6E4A8C', '#B99BD0']],
  [/coconut/, ['#EFE8DA', '#B79C7C']],
  [/avocado/, ['#9BB25A', '#E3E7B8']],
  [/mint/, ['#9CD3B8', '#E3F2EA']],
  [/matcha/, ['#8DB36A', '#CFE0A8']],
  [/vanilla|cheesecake|blanca|cream/, ['#F3E6C4', '#E8D3A6']],
  [/honey/, ['#E1A93A', '#F2D07A']],
  [/cinnamon/, ['#A8663A', '#E2B98E']],
  [/croissant/, ['#D9A35E', '#F0D3A0']],
  [/coffee|espresso|americano|latte|cappuccino|macchiato|nescaf|turkish/, ['#6B4A36', '#C9A27E']],
  [/tea/, ['#C98E4A', '#E8C48C']],
  [/fruit|mix|cocktail|tropical/, ['#D8617F', '#F2A93B', '#8DB14A']]
];

const KIND_BASE: Record<Kind, string[]> = {
  pancake: ['#E2B36F', '#F2D9A8'],
  crepe: ['#E9CFA0', '#F5E6C8'],
  waffle: ['#D9A35E', '#F0D3A0'],
  glass: ['#E8B9A6', '#F6E3D6'],
  juice: ['#F2A93B', '#F7D06B'],
  shake: ['#E7C6A8', '#F6E6D6'],
  coffee: ['#6B4A36', '#C9A27E'],
  boba: ['#C98E4A', '#2E2A2C'],
  scoop: ['#F3E6C4', '#E8B9A6']
};

export function flavourColours(name: string, kind: Kind): string[] {
  const n = name.toLowerCase();
  const hits: string[] = [];
  for (const [re, cols] of FLAVOURS) if (re.test(n)) hits.push(...cols);
  const uniq = [...new Set(hits)];
  return uniq.length ? uniq.slice(0, 4) : KIND_BASE[kind];
}

// small deterministic PRNG so an item's art is the same on every visit
export function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// blend a hex colour toward white (amt 0..1) — for the soft paper behind the art
export function tint(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * amt);
  return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
}

export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export const isDrink = (k: Kind) => k === 'glass' || k === 'juice' || k === 'shake' || k === 'coffee' || k === 'boba';
