# La Orilla — design direction for the public menu site

## Why
The owner wants the menu to be an experience: people should feel *inside* the menu, see something they
haven't seen anywhere else, and still find what they want fast. Most visitors are on a phone, often
standing at the counter or sitting on the sand.

The critique of the previous site (Oct 2026) found:
- no prices anywhere in the menu
- every card in a category looked the same (one repeated icon, no photos)
- about 30 scroll steps of intro before reaching the menu
- small text (under 12px) and small "+" buttons
- Build-your-own felt childish ("Play-Doh")

## Concept: the menu is the lake, right now
Lake Qaraoun at the hour you are looking at it. The page is lit by the real time in Lebanon
(Asia/Beirut). The palettes are:
- morning haze
- afternoon turquoise
- golden hour
- sunset coral
- night lake with a moon

You arrive on the shore and wade in, and the menu is the water. Each category is its own stretch of water
with its own flavour colour. Visit at 9pm and the menu is a night lake. That one idea is the memorable detail.

## Purpose, audience, tone
- **Job:** pick something and order it (WhatsApp, or show a ticket at the counter); secondarily, book an event.
- **Audience:** phone-first (360–430px wide), one thumb, outdoors (bright sun → big type, strong contrast).
- **Tone:** editorial and grown-up, never cartoonish. The serif (Fraunces) carries the voice, a handwritten
  script only for the Spanish phrases, Manrope for UI. Restraint: thin strokes, grain, generous space.

## Contract (checkable)
1. **Under 2 seconds to the menu.** No preloader. One shore screen; the menu starts right under it, and
   "Wade in" scrolls there. No scroll-jacking: native scroll and scroll-snap only.
2. **Every item shows its price.** Items with no price say "Ask at the counter".
3. **Every item looks different.** The owner's photo when there is one; otherwise generated "flavour art":
   - seeded by the item name
   - coloured by its flavour words (nutella, lotus, mango…)
   - drawn as fine drizzle lines, not blobs
4. **Thumb reach.** A bottom dock holds categories, search and cart; every tap target is at least 44px.
5. **Readable.** Body text at least 14px, prices at least 18px, contrast at least 4.5:1 on all text over imagery.
6. **Motion clarifies:**
   - the dock cart springs when an item lands
   - the add animation arcs into the cart
   - sheets slide from the bottom
   - all of it is off with prefers-reduced-motion
7. **Phones first for performance:**
   - transforms and opacity only
   - no WebGL, no full-screen blur filters while scrolling
   - long categories render lazily
8. **Kept features:**
   - swipe browsing (horizontal snap rails)
   - cart → WhatsApp (bilingual message, now with prices)
   - counter ticket
   - "let the tide choose" surprise
   - events inquiry (Web3Forms)
   - owner content from `/content/*.json`, photos through the Netlify Image CDN
9. **Owner-driven content:** sold-out items stay visible, are greyed and can't be added. Hours come from
   `site.json`; the "Open now" badge appears only when weekly hours are filled in.

## Content states
| State | Trigger | Behaviour |
|---|---|---|
| Loading | content JSON in flight | the shore renders immediately (it needs no data); the menu shows shimmering rails with fixed card size |
| Empty | category with 0 items / empty cart / no search match | the category is hidden; cart: "Nothing in the net yet" plus top picks; search: "No match" plus clear |
| Error | content fetch fails | "The menu is washing back in…" with Retry, plus the phone and WhatsApp links so ordering still works |
| Partial | gallery missing, hours not filled, no photos | each piece hides or falls back on its own (flavour art, hours headline) |
| Success | added to cart / inquiry sent | the dock springs with the new total; the inquiry form is replaced by a thank-you |
| Permission | n/a | public site, no login; the /admin login is a separate app |

## Not doing (now)
- Build-your-own stays hidden until it has a grown-up visual (owner found the old one childish).
- Arabic/RTL, LBP toggle: later phase (`lbpRate` is already in content).

## Stack
Vite + React + TypeScript + Tailwind v4 + Motion (`motion/react`). It builds to `dist/`; the build copies
`admin/`, `content/`, `uploads/` and `assets/` across, so the owner dashboard and its live check keep working.
