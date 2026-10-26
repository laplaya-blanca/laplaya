# Handoff: La Playa Blanca — Cocktails & Desserts (immersive one-page site)

## Owner dashboard & content
All editable content lives in `content/` and is edited at **`/admin`** (Decap CMS). Saving there commits to `main` and Netlify redeploys in about a minute.

| File | What it holds |
|---|---|
| `content/menu.json` | Categories → items (name, price, description, photo, "available today", tags) |
| `content/builder.json` | Build-your-own bases, sauces, toppings, finish — with prices |
| `content/site.json` | Hours text, weekly opening times, phone / WhatsApp / Instagram, LBP rate |
| `content/gallery.json` | Event photos (rendered after the redesign) |

`menu-data.js` fetches these files and exposes `window.LPB_MENU` / `LPB_BUILDER` / `LPB_SITE` / `LPB_GALLERY`, then fires `lpb-menu-ready`. Uploads go to `uploads/` and are served resized through Netlify Image CDN via `window.lpbImg(src, width)`.

**One-time Netlify setup** (site must deploy from this GitHub repo):
1. Site configuration → Identity → **Enable Identity**.
2. Identity → Registration → **Invite only**.
3. Identity → Services → **Enable Git Gateway**.
4. Identity → **Invite users** → the owner's email. The invite link opens the site, they set a password, and land on `/admin`.

**Local editing without logging in:** run `npx decap-server@3.11.3` and a static server (e.g. `python3 -m http.server 8787`), then open `http://localhost:8787/admin/`. Edits write straight to `content/`.

## Overview
A single-page, scroll-driven marketing + ordering site for **La Playa Blanca**, a beachside dessert & drinks spot in Qaraaoun, West Bekaa. The experience runs as one continuous vertical journey:

1. **Scroll-expand intro** — a small framed crêpe image on a beach photo; scrolling expands it to full-bleed, the title splits apart, then it crossfades ("morphs") into the live hero. Scrolling back up at the very top collapses it again.
2. **WebGL video hero** — three looping food videos (crêpe → waffle → smoothie) rendered through a full-screen WebGL shader with a liquid/wave crossfade between scenes as you scroll.
3. **Three "chapter" sections** (Crêpe / Waffle / Smoothie) that pin while scrolling and drive the video scene transitions, each surfacing a few highlight cards.
4. **The Menu** — an interactive **fan-card carousel**: category pills fan that category's items into an arc; hover lifts a card, click adds to cart, arrows + dots paginate 7-at-a-time through the full list.
5. **Outro / Visit** — closing section with location, hours, contact, and footer.
6. **Cart drawer** — slide-in cart with quantity steppers and a running total.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype demonstrating the intended look, motion, and behavior. **They are not production code to copy directly.** The `.dc.html` file is authored in a bespoke "Design Component" runtime (a small React-like layer in `support.js` that reads inline-styled markup + a logic class); it is **not** a normal React/Vue app and should not be shipped as-is.

The task is to **recreate these designs in the target codebase's existing environment** (React, Vue, Svelte, SwiftUI, etc.) using its established component patterns, styling system, and animation libraries. If no codebase exists yet, choose an appropriate stack — the design leans on **GSAP + ScrollTrigger** (scroll pinning/animation), **Lenis** (smooth scroll), and **three.js** (the WebGL hero); a React + GSAP + three.js (or @react-three/fiber) setup would map cleanly.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, motion, and copy are all present and intended. Recreate the UI to match. The one deliberately rough element is imagery: food photos are represented by video loops / placeholders and each card has a commented "image slot" showing where a real photo drops in.

## Tech / Libraries the prototype uses
- **three.js r128** — full-screen WebGL plane with a custom fragment shader that samples 3 `VideoTexture`s and crossfades them with a wave/foam distortion driven by scroll progress (`uScene` 0→2). Also does a mouse-ripple on the hero and a vignette/warm color grade.
- **GSAP 3.12 + ScrollTrigger** — section pinning, card entrances, the chapter→scene mapping, price roll, outro reveals.
- **Lenis 1.0** — smooth scroll; its RAF is driven off the GSAP ticker.
- No CSS framework — everything is inline styles. Recreate with the target app's styling system (CSS modules, Tailwind, styled-components, etc.).

## Screens / Views

### 1. Scroll-Expand Intro (front door)
- **Purpose**: Cinematic entry that transitions into the site.
- **Layout**: Fixed full-viewport overlay (`z-index` above everything). Beach background image (`assets/hero-bg-beach.png`) covers the screen with a `rgba(12,44,54,.12)` scrim. A centered "media" card starts at **300×400px** and grows to `min(1550px, 95vw) × min(800px, 85vh)` as scroll progresses 0→1. Title ("La Playa" / "Blanca") is centered and its two lines translate apart horizontally (up to ±150vw) as it expands. A "Qaraaoun · West Bekaa" kicker + "Scroll to enter" cue sit under the media and drift apart too.
- **Media**: currently the crêpe still image (`assets/hero-poster-crepe.png`) inside a rounded (20px) card with shadow `0 0 50px rgba(0,0,0,.3)`; corners square off to 0 as it reaches full-bleed.
- **Behavior**: Custom wheel/touch handler accumulates progress (does NOT natively scroll until fully expanded). At progress ≥ ~0.82 the whole intro **crossfades out** to reveal the hero beneath; at progress = 1 it's dismissed and native/Lenis scroll takes over. Scrolling up when back at `scrollY ≤ 2` re-engages the intro and reverses it. Skipped entirely for `prefers-reduced-motion` or when the URL has a hash (deep links).

### 2. WebGL Video Hero
- **Purpose**: Immersive brand moment.
- **Layout**: Fixed full-screen `<canvas>` behind all content (`z-index:0`). Centered logo badge (`assets/logo.jpg`, rounded 26px, floating animation), kicker "Qaraaoun · West Bekaa", giant title **"La Playa" (upright) / "Blanca" (italic, #F0D9A8)** in Fraunces at `clamp(52px,12.5vw,220px)`, an italic Fraunces tagline, and two pill CTAs. A dark top+bottom gradient improves legibility.
- **Shader**: samples `video-crepe/waffle/smoothie.mp4`; `uScene` crossfades them with a wave edge + chromatic-aberration + foam highlight; warm grade `mix(col, col*vec3(1.07,1.0,0.9)…)`; radial vignette. On non-WebGL devices it falls back to stacked `<video>` elements that opacity-crossfade.
- **CTA buttons**: "Explore the Menu" — solid `#1F7A8C`, text `#F5F1E3`, `padding:15px 30px`, `border-radius:999px`, `box-shadow:0 12px 30px rgba(20,58,64,.4)`; magnetic hover (translates toward cursor). (A second "Build Your Own" CTA exists in the code but is currently hidden — see Notes.)

### 3. Chapter sections ×3 (Crêpe / Waffle / Smoothie)
- **Purpose**: Narrative scroll that morphs the hero video from one food to the next.
- **Layout**: Each is a 100vh pinned section. A huge outline title (Fraunces, `-webkit-text-stroke`, gradient wipe on scroll) sits left; a kicker chip ("Chapter One/Two/Three") top-left; an italic intro line top-right; a horizontal row of 3 glass-morphism highlight cards along the bottom that stagger in.
- **Behavior**: Each chapter's scroll progress sets the WebGL `uScene` (0→1→2), so scrolling through them dissolves crêpe→waffle→smoothie. Cards: `background:linear-gradient(158deg, rgba(31,122,140,.36), rgba(20,58,64,.3))`, `backdrop-filter:blur(18px)`, `border:1px solid rgba(245,241,227,.3)`, `border-radius:24px`. Each card has an "Add" button.

### 4. The Menu — fan-card carousel (primary feature)
- **Purpose**: Browse & add every item, by category.
- **Layout**: Lives in an opaque cream world (`#F5F1E3`) that scrolls up over the fixed video. Centered header: kicker chip "The Full Board", `<h2>` "Everything, à la playa" (Fraunces `clamp(38px,6vw,82px)`, `#1F7A8C`), a supporting line. Below it a **sticky pill bar** (top:70px) with the 8 categories. Below that the **fan deck** (`position:relative; height:clamp(380px,52vh,460px)`).
- **Category pills**: `Pancake · Crêpe · Waffle · Smoothies · Fresh Juice · Shakes · BOBA · Ice Cream`. Active pill = solid `#1F7A8C`/`#F5F1E3` with shadow; inactive = `rgba(31,122,140,.06)` bg, `#1F7A8C` text, `1.4px` border `rgba(31,122,140,.22)`; `border-radius:999px`.
- **Fan mechanics**: The selected category's items render as absolutely-positioned cards, all centered (`left/top:50%`, `margin:-150px 0 0 -106px`), then transformed into a fanned arc. Up to **7 visible slots**; positions (desktop, ×responsive multiplier):
  - slot offsets x = [-300,-200,-100, 0, 100, 200, 300]px, y = [44,22,7, 0, 7,22,44]px, rotation = [-21,-14,-7, 0, 7,14,21]°, scale = [.78,.85,.93, 1, .93,.85,.78], z-index = [1,2,3,10,3,2,1].
  - Responsive multiplier on x/y: <480:0.34, <640:0.5, <768:0.66, <1024:0.84, else 1.0.
  - Categories ≤7 items fan symmetrically with no pagination; >7 items paginate: the visible window wraps around the list, centered on a moving `fanCenter` index.
  - **Important implementation note**: positions are applied **declaratively** (each card's transform is computed from state and set as an inline style, animated with a CSS `transition: transform .55s cubic-bezier(.2,.8,.2,1), opacity .45s`). An earlier imperative GSAP version failed because the runtime re-rendered and wiped the tweens — recreate this as state→style, not imperative per-frame mutation.
- **Card (typography, no photo yet)**: outer positioned wrapper (fan transform) → inner hover wrapper (`transition:transform .35s`, hover = `translateY(-16px) scale(1.05)`, and the outer bumps `z-index:40` on hover) → gradient card: `width:212px; height:300px; border-radius:22px; background:linear-gradient(158deg,#FCF9F0 0%,#EFE7D4 46%,#C9DBD8 100%); border:1px solid rgba(31,122,140,.18); box-shadow:0 22px 48px rgba(20,58,64,.20)`. Inside: subtle SVG grain overlay (`mix-blend-mode:multiply; opacity:.5`); content column with category label (Manrope 700, 11px, `letter-spacing:2.6px`, uppercase, `rgba(20,58,64,.5)`), item **name** (Fraunces 600, 32px, `#1F7A8C`), description (13px, `rgba(20,58,64,.6)`), and a bottom row with **price** (Manrope 800, 30px, `#E8A44C`) or "Order now" for price-less items, plus an "Add" pill (`#1F7A8C`/`#F5F1E3`, `border-radius:999px`). There is a commented `<!-- IMAGE SLOT -->` marking where a real food photo replaces the gradient.
- **Pagination controls** (only when a category has >7 items): round prev/next buttons (46px, `1.5px` teal border, hover fills teal) + a row of dots (active dot widens to 22px, `#1F7A8C`; inactive 8px, `rgba(31,122,140,.24)`).
- **Add to cart**: clicking a card (or an Add button) adds that item; a small dot animates flying to the cart FAB and the cart badge bumps.

### 5. Outro / Visit
- **Purpose**: Sign-off + practical info.
- **Layout**: Min-100vh section over the video with a darkening gradient. Centered: kicker "Until next time", big italic Fraunces headline **"Nos vemos en la playa"** (`clamp(46px,9.4vw,140px)`, `line-height:1.06`, `text-wrap:balance`, `#F9F5E9`), a Manrope subtitle. Below, a 3-column info grid (Find us / Hours / Say hello — Fraunces 20px values, `#F0D9A8` labels) and a footer bar (logo + wordmark + copyright, `border-top:1px solid rgba(245,241,227,.18)`).
- **Behavior**: When it enters, the WebGL runs a slow auto "montage" cycling the scenes; outro content staggers in.

### Cart drawer (global)
- Slide-in panel from the right, `width:min(430px,94vw)`, bg `#F7F3E6`, `box-shadow:-24px 0 70px rgba(12,44,54,.32)`, `transform:translateX(105%→0)` with `transition .55s cubic-bezier(.5,0,.1,1)`; dimmed backdrop. Line items with a 44px icon tile, name/category, a rounded qty stepper (− / count / +), and a remove button. Footer: running **Total** (Fraunces 30px, `#1F7A8C`) + Checkout button (`#E8A44C`). Empty state shows a palm illustration + "Nothing here yet". BOBA/Ice-cream (no price) show "In-store".

### Nav (global)
- Fixed top bar, transparent over hero, turns to `rgba(20,58,64,.72)` + `blur(14px)` + subtle border/shadow after ~80px scroll. Left: logo badge + wordmark ("La Playa Blanca" / "Cocktails & Desserts"). Right: links **The Menu · Visit** (a "Signatures" and a "Build Your Own" link were removed) + a Cart FAB (`#E8A44C` pill with count badge `#E7607A`). Custom circular cursor (mix-blend difference) with grow/link states on desktop; hidden on touch.

## Interactions & Behavior
- **Smooth scroll** via Lenis; all scroll-linked animation via GSAP ScrollTrigger.
- **Intro**: wheel/touch-driven progress with a lerp; forward morph is one-way per session, reverse only from the very top. Locks page scroll (stops Lenis) until dismissed.
- **Chapters**: pinned; scroll progress → `uScene` crossfade in the shader; cards stagger in/out.
- **Fan menu**: pill click → set category (+ reset pagination); arrow/dot → move `fanCenter`; cards re-tween to new slots via CSS transition; hover lifts the hovered card and brings it to front; click adds to cart with a fly-to-cart dot.
- **Cart**: open/close (locks scroll while open), inc/dec/remove, total recompute, badge bump, checkout closes drawer.
- **Custom cursor + magnetic buttons** on desktop pointers only.
- **Reduced motion**: intro skipped, animations reduced.

## Performance notes (important for reimplementation)
- The WebGL render loop **skips rendering whenever the canvas is hidden** (menu/cream world covering the viewport, intro fully covering, or tab hidden) — a `_glOff` flag gates `renderer.render`. Do the same; don't burn frames behind opaque content.
- Videos are large (~10 MB each, 1920×1080). They should be **compressed / served with HTTP range support** in production; consider a poster image + lazy load, and pausing offscreen videos. In the prototype all three play continuously while the hero is visible (this was intentional to keep the crossfades smooth); productionize with smaller assets.
- Fan card positions are **state-derived inline styles + CSS transitions**, not per-frame JS — keeps it cheap and re-render-safe.

## State Management
- `menuCat` — selected menu category (default `'Pancake'`).
- `fanCenter` — center index of the fan window (for pagination); reset when category changes.
- `cart` — map of `id → { item, qty }`; derived count + total.
- `cartOpen` — drawer visibility.
- Intro runtime state: `iShown`/`iTarget` (eased progress), `introActive`/`introDone`.
- Build-your-own state exists but the section is currently hidden.
- Data source: `menu-data.js` exposes `window.LPB_MENU = { categories, items }`; each item = `{ id, name, cat, price, priceLabel, desc, tags, icon, signature }`. Prices are per-category (same flavor can cost differently under different categories — keep them separate). BOBA & Ice Cream have `price: null` → render "Order now" / "In-store".

## Design Tokens
**Colors**
- Cream / paper: `#F5F1E3` (page bg), `#F7F3E6` (cart), `#FBF8EE`, `#FCF9F0`, `#F9F5E9`, `#FBF7EC`
- Ocean Teal (primary): `#1F7A8C`; deep teal: `#14586B`
- Dark teal (shadows/overlays): `#123f4d`, `#0e3a47`, `#0b2c34`, `rgba(12,44,54,*)`, `rgba(20,58,64,*)`
- Golden Hour (accent/price): `#E8A44C`; sand/gold: `#F0D9A8`
- Coral (badge/alerts): `#E7607A`; sage: `#A8C686`
- Card gradient: `linear-gradient(158deg,#FCF9F0 0%,#EFE7D4 46%,#C9DBD8 100%)`

**Typography**
- Display / serif: **Fraunces** (weights 600; italics used for accents & the outro). Sizes via `clamp()` — hero up to 220px, section H2 `clamp(38px,6vw,82px)`, card name 32px.
- UI / sans: **Manrope** (400–800). Labels 11px `letter-spacing:2.2–2.6px` uppercase; body 13–17px.

**Radius**: pills `999px`; cards `20–24px`; media 20px; icon tiles `11–14px`.
**Shadows**: cards `0 22px 48px rgba(20,58,64,.20)`; CTAs `0 12px 30px rgba(20,58,64,.4)`; drawer `-24px 0 70px rgba(12,44,54,.32)`.
**Motion**: fan `transform .55s cubic-bezier(.2,.8,.2,1)`; hover lift `.35s`; drawer `.55s cubic-bezier(.5,0,.1,1)`; nav `.5s`.

## Assets
Included in this bundle under `assets/`:
- `logo.jpg` — brand badge (nav / hero / footer).
- `hero-bg-beach.png` — intro background (1672×941).
- `hero-poster-crepe.png` — crêpe still used as the intro media and hero video poster (1672×941).
- `video-crepe.mp4`, `video-waffle.mp4`, `video-smoothie.mp4` — 1920×1080 hero loops (⚠ ~10 MB each; compress for production).
- Menu icons and the palm-frond motif are drawn as inline SVGs in code (no image files) — reproduce as SVG components or your icon system.
Real food photos are NOT included — cards and highlight tiles have commented image slots where they belong.

## Files
- `index.html` — the full prototype (all markup + the logic class), renamed from `La Playa Blanca.dc.html` so it serves as the site entry point. Open it in a browser (needs the sibling files below) to see the live reference.
- `menu-data.js` — the menu dataset (categories, items, prices). Source of truth for content.
- `support.js` — the Design-Component runtime that renders the `.dc.html`. Reference only; do not port.
- `assets/` — images + videos listed above.
- `handoff_screens/` — static renders of the intro, hero, menu, and outro for visual reference.

> Tip: to read the intended behavior, search the `.dc.html` logic class for `_initIntro`, `_initWebGL` (shader), `_initActs` (chapters→scene), `_fanSlotConfig` / `_fanVisibleMap` / `renderVals` (fan positions), and `addToCart` (cart).
