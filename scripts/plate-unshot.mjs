#!/usr/bin/env node
// Stand-in pictures for the dishes the owner hasn't photographed yet, with Google's Nano Banana Pro
// (gemini-3-pro-image) through Vertex AI, the same way as scripts/replate.mjs (read its header for the sign-in).
//
// replate.mjs keeps the owner's own food and only changes the plate. Here there is no photo, so the model makes the
// dish from its name, its category and the menu's line about it, served the way that category is served, on the same
// beach table the site gives that dish, by day or under the lantern. The clean table photo is kept everywhere but the
// dish (scripts/replate_blend.py). They are placeholders: the moment the owner uploads a real photo of a dish, the
// site shows that instead (assets/plated.json keys these by category and name, not by photo).
//
//   node scripts/plate-unshot.mjs crepe/nutella boba/peach      a few dishes, as category/name
//   node scripts/plate-unshot.mjs --all [--night]               every dish without a photo
//   node scripts/plate-unshot.mjs --all --use [--night]         put the finished pictures on the menu (no new generations)
//   options: --size 1K|2K (default 2K)
//            --api   go through the Gemini API with your AI Studio key instead of Vertex AI, which has its own quota, so
//                    a run with --api beside one without makes about twice as many pictures a minute. The key goes in
//                    LAPLAYA_GEMINI_STUDIO_KEY, in your shell or in .env.local (ignored by git)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'gemini-3-pro-image';
const PROJECT = process.env.LAPLAYA_GCP_PROJECT || 'gen-lang-client-0746888173'; // "Choco Crepe"
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${MODEL}:generateContent`;

// the same tables, chosen the same way per dish, as src/components/Menu.tsx
const TABLES = { a: 'assets/plate-table.jpg', b: 'assets/plate-table-b.jpg', c: 'assets/plate-table-c.jpg', d: 'assets/plate-table-d.jpg', night: 'assets/plate-table-night.jpg' };
const DAY = ['a', 'b', 'c', 'd'];
function seeded(text) { // src/lib/flavor.ts
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); // src/lib/content.ts

// how each kind of dish comes to the table (the category's icon in content/menu.json)
const PLATE = 'a plain round matte off-white stoneware plate with a thin raw-clay rim, about 26 cm across';
const SERVED = {
  pancake: `a stack of three thick fluffy pancakes on ${PLATE}`,
  crepe: `a thin golden French crepe folded into quarters on ${PLATE}`,
  waffle: `a crisp golden Belgian waffle on ${PLATE}`,
  glass: 'a small clear glass dessert cup with visible layers, a long spoon beside it',
  smoothie: 'a tall clear glass, thick and blended, with a paper straw',
  juice: 'a tall clear glass of freshly pressed juice with a paper straw, a little condensation on the glass',
  shake: 'a tall clear glass of thick milkshake topped with whipped cream, with a wide paper straw',
  coffee: 'a matte off-white ceramic cup on a matching saucer',
  boba: 'a clear plastic boba cup with a sealed domed lid and a wide straw, tapioca pearls or jellies at the bottom',
  scoop: `scoops of creamy ice cream on ${PLATE}`,
};
const servedAs = (cat, icon) => (cat === 'bubble waffle' ? `a golden Hong Kong bubble waffle rolled into a cone, standing in a paper sleeve on ${PLATE}`
  : cat === 'smoothies' ? SERVED.smoothie : SERVED[icon] || SERVED.glass);

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf('--' + name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const has = (name) => { const i = args.indexOf('--' + name); if (i >= 0) args.splice(i, 1); return i >= 0; };
const night = has('night'), all = has('all'), use = has('use'), api = has('api');
const size = flag('size') || '2K';
const wanted = args.map((a) => a.toLowerCase());

// every dish without a photo of its own, with the id and key the site gives it (src/lib/content.ts)
const menu = JSON.parse(readFileSync(join(ROOT, 'content/menu.json'), 'utf8'));
const dishes = [];
for (const c of menu.categories || []) {
  const idBase = c.name.toLowerCase().replace(/[^a-z]/g, '') || slug(c.name);
  (c.items || []).forEach((row, i) => {
    if (!row?.name || /^\/?(uploads|assets)\/[\w.\-]+$/.test(row.photo || '')) return;
    const key = slug(c.name) + '/' + slug(row.name);
    dishes.push({ id: idBase + '-' + (slug(row.name) || 'item') + '-' + i, key, file: key.replace('/', '--'), name: row.name, cat: c.name, icon: c.icon, about: row.description || c.description || '' });
  });
}
const todo = all ? dishes : dishes.filter((d) => wanted.includes(d.key));
if (!todo.length) { console.error('No dish matched. Dishes without photos: ' + dishes.map((d) => d.key).join(' ')); process.exit(1); }
const tableOf = (d) => (night ? 'night' : DAY[Math.floor(seeded(d.id)() * DAY.length)]);

if (use) {
  // replated/unshot/<category--dish>-<table>.jpg → assets/plated/<category--dish>[-night].jpg, listed under dish:<key>
  const LIST = join(ROOT, 'assets/plated.json');
  const list = existsSync(LIST) ? JSON.parse(readFileSync(LIST, 'utf8')) : {};
  mkdirSync(join(ROOT, 'assets/plated'), { recursive: true });
  for (const d of todo) {
    const table = tableOf(d);
    const from = join(ROOT, 'replated/unshot', `${d.file}-${table}.jpg`);
    if (!existsSync(from)) { console.log(`${d.key}: not generated yet, left as it is`); continue; }
    const to = `assets/plated/${d.file}${night ? '-night' : ''}.jpg`;
    execFileSync('python3', ['-c', 'import sys; from PIL import Image; im = Image.open(sys.argv[1]); im.thumbnail((1200, 1600), Image.LANCZOS); im.save(sys.argv[2], quality=82, optimize=True, progressive=True)', from, join(ROOT, to)]);
    list['dish:' + d.key] = { ...list['dish:' + d.key], [night ? 'night' : 'day']: '/' + to };
    console.log(`${d.key}: on the menu as ${to}`);
  }
  writeFileSync(LIST, JSON.stringify(list, null, 2) + '\n');
  process.exit(0);
}

// a sign-in token lasts an hour and a full run takes longer, so a new one is fetched whenever Google turns the old one away
const signIn = () => { try { return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
let token = '', key = '';
if (api) {
  key = process.env.LAPLAYA_GEMINI_STUDIO_KEY || (existsSync(join(ROOT, '.env.local')) && readFileSync(join(ROOT, '.env.local'), 'utf8').match(/^LAPLAYA_GEMINI_STUDIO_KEY=(.+)$/m)?.[1].trim()) || '';
  if (!key) { console.error('No AI Studio key. Put LAPLAYA_GEMINI_STUDIO_KEY=… in .env.local'); process.exit(1); }
} else {
  token = signIn();
  if (!token) { console.error('Not signed in to Google. Run: gcloud auth application-default login'); process.exit(1); }
}
const url = api ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent' : ENDPOINT;
const headersFor = () => api ? { 'content-type': 'application/json', 'x-goog-api-key': key }
  : { 'content-type': 'application/json', authorization: 'Bearer ' + token, 'x-goog-user-project': PROJECT };

const prompt = (d, isNight) => `The image is an empty beach-bar table by a lake.

Make one photorealistic food photograph: "${d.name}" from the ${d.cat} menu of a beach dessert and drinks bar (the menu says: "${d.about}"), served as ${servedAs(d.cat.toLowerCase(), d.icon)}, set on this table. Make it look like what a customer would really be served for that name: generous, fresh, appetising, with the toppings, sauces or fruit the name suggests, but not overdone.

Keep the image as the scene, exactly as it is: the same table, background, water and sky. Seen from a seated eye level, looking down at the table at about 25 degrees, matching the image's perspective so the dish sits flat on the tabletop. Centre the dish on the table, filling about half of the frame's width, slightly below the middle of the picture. ${isNight ? "Light it warmly from the hanging lantern above, matching the image's night light." : 'Light it with the same daylight as the image, from the same direction.'} Give it a soft, natural contact shadow on the wood.

No cutlery other than what is described, no extra props, no hands, no text, no logos, no brand packaging. Portrait 3:4 food photograph, natural colours, shallow depth of field.`;

mkdirSync(join(ROOT, 'replated/unshot'), { recursive: true });
async function make(d) {
  const table = tableOf(d), isNight = table === 'night';
  const out = join('replated/unshot', `${d.file}-${table}.jpg`);
  // already done: delete the file to make it again
  if (existsSync(join(ROOT, out)) || existsSync(join(ROOT, out + '.busy'))) { console.log(`${d.key}: ${out} already there or being made, skipped`); return; }
  writeFileSync(join(ROOT, out + '.busy'), ''); // so a second run beside this one takes another dish
  try { await draw(d, table, isNight, out); } finally { rmSync(join(ROOT, out + '.busy'), { force: true }); }
}
async function draw(d, table, isNight, out) {
  // the project allows only a few pictures a minute: when it says so, wait a minute and ask again
  let res, body;
  for (let tries = 0; ; tries++) {
    res = await fetch(url, {
      method: 'POST',
      headers: headersFor(),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt(d, isNight) }, { inlineData: { mimeType: 'image/jpeg', data: readFileSync(join(ROOT, TABLES[table])).toString('base64') } }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:4', imageSize: size } },
      }),
    });
    body = await res.json().catch(() => ({}));
    if (res.status === 401 && !api && tries < 8) { token = signIn(); continue; }
    if (res.status !== 429 || tries >= 8) break;
    await new Promise((r) => setTimeout(r, 65_000));
  }
  if (!res.ok) { console.log(`${d.key}: failed: ` + (body.error?.message || res.status)); return; }
  const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) { console.log(`${d.key}: no image came back (` + (body.candidates?.[0]?.finishReason || 'unknown reason') + ')'); return; }
  const raw = join('replated/unshot', `${d.file}-${table}.raw${part.inlineData.mimeType === 'image/png' ? '.png' : '.jpg'}`);
  writeFileSync(join(ROOT, raw), Buffer.from(part.inlineData.data, 'base64'));
  execFileSync('python3', [join(ROOT, 'scripts/replate_blend.py'), join(ROOT, TABLES[table]), join(ROOT, raw), join(ROOT, out)], { stdio: 'ignore' });
  console.log(`${d.key}: saved ${out} on table ${table}`);
}
// two at a time: one picture takes the better part of a minute, and the quota is per minute
const queue = [...todo];
await Promise.all(Array.from({ length: 2 }, async () => { while (queue.length) await make(queue.shift()); }));
