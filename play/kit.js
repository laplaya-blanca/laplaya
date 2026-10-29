// Shared by the table games: how the page sits (in the menu's sheet or on its own, by day or after dark), the sound
// switch and its tiny synth, a buzz, emoji stamped from a cache, and the sand puffs, rings and floating words.
// Loaded in <head>, so the page has its light before the first paint.
const Q = new URLSearchParams(location.search);
const EMBED = Q.get('in') === 'site', NIGHT = Q.has('night');
document.documentElement.classList.toggle('embed', EMBED);
document.documentElement.classList.toggle('night', NIGHT);
// Escape inside a game closes the menu's sheet around it (the sheet can't hear keys pressed in here)
addEventListener('keydown', (e) => { if (e.key === 'Escape' && EMBED && parent !== window) parent.postMessage('lpb-game:close', location.origin); });
// links between the games keep ?in and ?night. Inside the menu's sheet they replace the page rather than add to the
// history, so the phone's Back button still leaves the menu once the sheet is closed.
const keepLinks = () => document.querySelectorAll('a[data-keep]').forEach((a) => { a.dataset.to ??= a.getAttribute('href'); a.href = a.dataset.to + location.search; });
// A link pressed in the page's first half second was the second tap of a double tap on whatever opened the page (the
// menu's die, or '‹ Games'), landing on a game nobody picked: it's ignored.
addEventListener('DOMContentLoaded', () => {
  keepLinks();
  document.querySelectorAll('a[data-keep]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.detail && downAt < 500) { e.preventDefault(); return; }
    if (EMBED && !(e.metaKey || e.ctrlKey || e.shiftKey)) { e.preventDefault(); location.replace(a.href); }
  }));
});
// dusk can fall while a game is open: the sheet says so, and the page around the board follows without reloading
if (EMBED) addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.source !== parent || (e.data !== 'lpb-game:night' && e.data !== 'lpb-game:day')) return;
  const night = e.data === 'lpb-game:night';
  if (document.documentElement.classList.contains('night') === night) return;
  document.documentElement.classList.toggle('night', night);
  history.replaceState(history.state, '', location.pathname + '?in=site' + (night ? '&night' : '')); keepLinks();
});
// focus goes to a screen's first button, or to the board as a game starts, only for someone playing with the keyboard:
// on a phone it would only put a focus ring round a button nobody asked for
let keyed = false, touched = false, downAt = -1; // downAt: when the last finger (or mouse button) went down
addEventListener('keydown', () => (keyed = true), true);
addEventListener('pointerdown', (e) => { keyed = false; touched = e.pointerType !== 'mouse'; downAt = performance.now(); }, true);
const focusKeyed = (el) => { if (keyed) el?.focus({ preventScroll: true }); };
// a page that won't zoom in (Crab Pop) still lets a view that's already zoomed in pinch back out. In the menu's sheet
// the zoom is the menu's, so that's the one it watches.
addEventListener('DOMContentLoaded', () => {
  if (!document.body.classList.contains('nozoom')) return;
  try {
    const vp = (EMBED && parent !== window ? parent : window).visualViewport;
    const watch = () => document.body.classList.toggle('zoomed', vp.scale > 1.01);
    vp.addEventListener('resize', watch); watch();
    addEventListener('pagehide', () => vp.removeEventListener('resize', watch)); // the menu's page outlives this one
  } catch { /* no visual viewport: the page simply doesn't zoom */ }
});
// while a screen covers the board, the board is out of the Tab order
addEventListener('DOMContentLoaded', () => document.querySelectorAll('.stage').forEach((st) => {
  const ov = st.querySelector('.overlay'), cv = st.querySelector('canvas');
  if (!ov || !cv) return;
  const sync = () => (cv.tabIndex = ov.hidden ? 0 : -1);
  new MutationObserver(sync).observe(ov, { attributes: true, attributeFilter: ['hidden'] }); sync();
}));

const store = {
  get: (k) => { try { return +localStorage.getItem('lpb-game-' + k) || 0; } catch { return 0; } },
  set: (k, v) => { try { localStorage.setItem('lpb-game-' + k, v); } catch { /* not remembered */ } }
};
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
// the canvas's size in CSS pixels, its pixel ratio (2 at most: sharp on any phone, and half the pixels of 3×), and
// S: the board's scale against the 560px-tall board it was drawn for
const V = { W: 0, H: 0, S: 1, DPR: 1 };
// the board as big as the room around it allows, keeping its shape (ar = width / height); returns its size
function sizeStage(stage, ar, max = 440) {
  const box = stage.parentElement.getBoundingClientRect();
  const w = Math.floor(Math.min(box.width, max, box.height * ar)), h = Math.floor(w / ar);
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  V.DPR = Math.min(devicePixelRatio || 1, 2); V.W = w; V.H = h; V.S = h / 560;
  return { w, h };
}
// a long press on the board must not bring up the phone's copy / save-image menu, nor one on a game's page or on a
// game in the list its link menu (a right click with a mouse still gets the browser's menu off the board)
addEventListener('contextmenu', (e) => { if (e.target.closest?.('.stage') || (touched && e.target.closest?.('body.game, a[data-keep]'))) e.preventDefault(); });

// ——— sound: tiny synth blips, only after a tap (browsers allow sound from then on), with a switch to turn them off ———
let AC = null, muted = store.get('mute') === 1;
function soundSwitch(btn) {
  // a line-drawn speaker, like the menu's own icons: with sound waves, or crossed out
  const icon = (on) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/>${on ? '<path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"/>' : '<path d="m16 9.5 5 5M21 9.5l-5 5"/>'}</svg>`;
  const show = () => { btn.innerHTML = icon(!muted); btn.setAttribute('aria-label', muted ? 'Sound is off. Turn it on' : 'Sound is on. Turn it off'); };
  btn.onclick = () => { muted = !muted; store.set('mute', muted ? 1 : 0); show(); if (!muted) tone(660, 0.1); };
  show();
}
function tone(f, dur, { type = 'sine', vol = 0.07, to = 0, delay = 0 } = {}) {
  if (muted || !f) return;
  try {
    AC ||= new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.03);
  } catch { /* no sound on this device */ }
}
const chord = (fs, gap = 0.07, o = {}) => fs.forEach((f, i) => tone(f, 0.16, { ...o, delay: i * gap }));
const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch { /* no vibration */ } };
// what a screen reader hears: a polite live region on each page
const tell = (msg) => { const el = document.getElementById('live'); if (el) el.textContent = msg; };

// ——— emoji, drawn once into a little canvas, then stamped ———
const sprites = new Map();
function sprite(e, px) {
  const k = e + px; if (sprites.has(k)) return sprites.get(k);
  const c = document.createElement('canvas'), d = Math.ceil(px * 1.35); c.width = c.height = Math.ceil(d * V.DPR);
  const g = c.getContext('2d'); g.scale(V.DPR, V.DPR); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.fillText(e, d / 2, d / 2 + px * 0.05);
  sprites.set(k, c); return c;
}
function stamp(g, e, px, x, y, { rot = 0, sx = 1, sy = 1, alpha = 1 } = {}) {
  const s = sprite(e, Math.max(4, Math.round(px))), d = s.width / V.DPR;
  g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(rot); g.scale(sx, sy); g.drawImage(s, -d / 2, -d / 2, d, d); g.restore();
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }

// ——— effects: sand puffs, rings, words that float up, a little shake ———
const fx = { parts: [], rings: [], texts: [], shake: 0 };
function burst(x, y, color, n, sp, { g = 700, size = 3, up = 0 } = {}) {
  if (calm) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = sp * rnd(0.35, 1.1);
    fx.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, g: g * V.S, r: size * V.S * rnd(0.6, 1.4), life: 1, decay: rnd(1.2, 2.2), color });
  }
}
const ring = (x, y, r, color) => fx.rings.push({ x, y, r, color, life: 1 });
const say = (x, y, txt, color, size = 20) => fx.texts.push({ x, y: clamp(y, 30 * V.S, V.H - 30 * V.S), txt, color, size, life: 1 });
const clearFx = () => { fx.parts = []; fx.rings = []; fx.texts = []; fx.shake = 0; };
function stepFx(dt) {
  for (const p of fx.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= p.decay * dt; }
  fx.parts = fx.parts.filter((p) => p.life > 0);
  for (const r of fx.rings) r.life -= dt * 3;
  fx.rings = fx.rings.filter((r) => r.life > 0);
  for (const t of fx.texts) { t.life -= dt * 0.8; t.y -= dt * 30 * V.S; }
  fx.texts = fx.texts.filter((t) => t.life > 0);
  fx.shake = Math.max(0, fx.shake - dt);
}
function drawFx(g) {
  const S = V.S;
  for (const p of fx.parts) { g.globalAlpha = Math.min(1, p.life * 1.5); g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }
  for (const r of fx.rings) { g.globalAlpha = r.life; g.strokeStyle = r.color; g.lineWidth = 3 * S * r.life + 1; g.beginPath(); g.arc(r.x, r.y, r.r + (1 - r.life) * 22 * S, 0, 7); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (const t of fx.texts) {
    const pop = t.life > 0.88 ? 1 + (t.life - 0.88) * 3 : 1;
    g.font = `800 ${t.size * S}px Manrope, sans-serif`;
    const hw = g.measureText(t.txt).width / 2 + 8 * S; // a word near the edge is nudged in, never cut off
    g.save(); g.translate(clamp(t.x, hw, V.W - hw), t.y); g.scale(pop, pop); g.globalAlpha = Math.min(1, t.life * 2.5);
    g.lineWidth = 6 * S; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(t.txt, 0, 0); g.fillStyle = t.color; g.fillText(t.txt, 0, 0);
    g.restore();
  }
  g.globalAlpha = 1;
}
// the die: each face drawn once per size with its shadow, and one soft glow, so a die drawn every frame costs an image
// or two, never a live blur (slow on cheaper phones)
const dice = new Map();
function dieFace(size, face) {
  const k = size + ':' + face; if (dice.has(k)) return dice.get(k);
  const S = V.S, pad = Math.ceil(size * 0.45), d = size + pad * 2, c = document.createElement('canvas'); c.width = c.height = Math.ceil(d * V.DPR);
  const g = c.getContext('2d'); g.scale(V.DPR, V.DPR); g.translate(d / 2, d / 2);
  if (face === 0) { // the glow behind a die that's waiting for a tap
    const r = g.createRadialGradient(0, 0, size * 0.3, 0, 0, d / 2); r.addColorStop(0, 'rgba(232,164,76,.75)'); r.addColorStop(1, 'rgba(232,164,76,0)');
    g.fillStyle = r; g.fillRect(-d / 2, -d / 2, d, d);
  } else {
    g.shadowColor = 'rgba(20,60,70,.24)'; g.shadowBlur = 8 * S; g.shadowOffsetY = 3 * S;
    rrect(g, -size / 2, -size / 2, size, size, size * 0.22); g.fillStyle = '#fff'; g.fill(); g.shadowColor = 'transparent';
    g.lineWidth = 1.5 * S; g.strokeStyle = 'rgba(20,88,107,.18)'; g.stroke();
    const P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
    g.fillStyle = face === 1 ? '#E7607A' : '#17323A';
    for (const [px, py] of P[face]) { g.beginPath(); g.arc(px * size * 0.26, py * size * 0.26, size * (face === 1 ? 0.12 : 0.085), 0, 7); g.fill(); }
  }
  const out = { c, d }; dice.set(k, out); return out;
}
function die(g, x, y, size, face, rot = 0, glow = 0) {
  size = Math.round(size);
  g.save(); g.translate(x, y);
  if (glow > 0) { const h = dieFace(size, 0); g.globalAlpha = glow; g.drawImage(h.c, -h.d / 2, -h.d / 2, h.d, h.d); g.globalAlpha = 1; }
  g.rotate(rot); const f = dieFace(size, face); g.drawImage(f.c, -f.d / 2, -f.d / 2, f.d, f.d);
  g.restore();
}
// after a resize the cached drawings are the wrong size
const clearCaches = () => { sprites.clear(); dice.clear(); };

// ——— the screens laid over a board: a heading, a few lines, and buttons ———
function overlay(ov, html, buttons) {
  ov.innerHTML = `<div class="in">${html}<div class="row">${buttons.map((b, i) => `<button type="button" class="go${b.alt ? ' alt' : ''}" data-i="${i}">${b.label}</button>`).join('')}</div></div>`;
  ov.hidden = false; ov.scrollTop = 0; // a screen that had to be scrolled doesn't pass its scroll on to the next one
  // a screen that appears under a finger still on the board, or under the second tap of a double tap, ignores that tap:
  // a button counts a press that began a moment after the screen appeared (or a key pressed on it a moment after)
  const shown = performance.now();
  ov.querySelectorAll('.go').forEach((el) => (el.onclick = (e) => { if ((e.detail ? downAt : performance.now()) < shown + 300) return; tone(660, 0.06, { vol: 0.04 }); buttons[+el.dataset.i].go(); }));
  focusKeyed(ov.querySelector('.go'));
}
// a game redraws its board once its fonts have arrived, so the numbers aren't painted in a stand-in font
const fontsReady = (fn) => document.fonts?.ready.then(fn);
