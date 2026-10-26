import { useEffect, useReducer } from 'react';
import type { Item } from './content';
import { money } from './content';

export type Line = { item: Item; qty: number };
type Cart = Record<string, Line>;
type Action = { type: 'add'; item: Item } | { type: 'qty'; id: string; d: number } | { type: 'clear' } | { type: 'sync'; items: Map<string, Item> };

const KEY = 'lpb-cart-v2';

function reducer(cart: Cart, a: Action): Cart {
  switch (a.type) {
    case 'add': {
      if (a.item.soldOut) return cart;
      const ex = cart[a.item.id];
      return { ...cart, [a.item.id]: { item: a.item, qty: (ex ? ex.qty : 0) + 1 } };
    }
    case 'qty': {
      const ex = cart[a.id];
      if (!ex) return cart;
      const next = { ...cart };
      if (ex.qty + a.d <= 0) delete next[a.id];
      else next[a.id] = { item: ex.item, qty: ex.qty + a.d };
      return next;
    }
    case 'clear':
      return {};
    case 'sync': {
      // refresh saved lines with today's menu (price changes, sold out, removed items)
      const next: Cart = {};
      for (const [id, l] of Object.entries(cart)) {
        const fresh = a.items.get(id);
        if (fresh && !fresh.soldOut) next[id] = { item: fresh, qty: l.qty };
      }
      return next;
    }
  }
}

function restore(): Cart {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const out: Cart = {};
    // keep only well-formed lines; anything else in storage is dropped rather than crashing the page
    for (const [id, l] of Object.entries(raw && typeof raw === 'object' ? raw : {}) as [string, any][]) {
      if (typeof l?.item?.id === 'string' && typeof l.item.name === 'string' && Number.isFinite(l.qty) && l.qty > 0) out[id] = l;
    }
    return out;
  } catch { return {}; }
}

export function useCart() {
  const [cart, dispatch] = useReducer(reducer, undefined, restore);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* private mode: cart just isn't remembered */ } }, [cart]);
  const lines = Object.values(cart);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + (l.item.price || 0) * l.qty, 0);
  const unpriced = lines.some((l) => l.item.price == null);
  return { cart, lines, count, total, unpriced, dispatch };
}

// Bilingual WhatsApp order (Arabic / English labels, item names as on the menu), now with prices.
export function orderText(lines: Line[], total: number, unpriced: boolean) {
  const rows = lines.map((l, i) => (i + 1) + '. ' + l.item.name + ' (' + l.item.cat + ') ×' + l.qty + (l.item.price != null ? ' — ' + money(l.item.price * l.qty) : ''));
  let msg = 'مرحبا لا بلايا بلانكا! 🌴🍧 / Hi La Playa Blanca!\n\nأودّ أن أطلب / I’d like to order:\n\n' + rows.join('\n');
  msg += '\n\nالمجموع / Total: ' + money(total) + (unpriced ? ' + items priced at the counter' : '');
  msg += '\n\nالاسم / Name: \nوقت الاستلام / Pickup time: \n\nشكراً! 🙏 / Thank you!';
  return msg;
}
