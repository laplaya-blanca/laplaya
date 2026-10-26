#!/usr/bin/env node
// Re-plate the owner's dish photos with Google's Nano Banana Pro (gemini-3-pro-image), through Vertex AI.
//
// The owner shoots on white, from above, on whatever plate is to hand, so no plate sits right on the beach tables
// behind the menu cards. This keeps the food exactly as photographed and asks the model to set it on one house plate,
// on the same table the site gives that dish, from the table's own low angle, in the table's light.
//
// The model redraws the whole frame and the sea comes back faintly posterised, so only its dish is kept, laid over the
// clean table photo. Results go to replated/ (ignored by git) for a look side by side with the original; nothing in uploads/ or the
// menu changes. It runs on your own Google sign-in (no API key): Vertex AI bills the Cloud project below, which is
// linked to the billing account with the trial credit, apart from any other project on the account.
//
//   gcloud auth application-default login           (once; sign in with the account that owns the project)
//   node scripts/replate.mjs nutella                 one dish, by name
//   node scripts/replate.mjs nutella oreo --night    the lantern-lit night version
//   node scripts/replate.mjs --all                   every dish that has a photo
//   options: --table a|b|c|d|night   --size 1K|2K (default 2K)
//   node scripts/replate.mjs --all --use            put the finished pictures on the menu (no new generations): each
//                                                   goes to assets/plated/, listed in assets/plated.json by the photo it
//                                                   was made from, so a new upload from the owner falls back on its own
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODEL = 'gemini-3-pro-image';
const PROJECT = process.env.LAPLAYA_GCP_PROJECT || 'gen-lang-client-0746888173'; // "Choco Crepe"
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${MODEL}:generateContent`;
let token = '';
try { token = execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* reported below */ }
if (!token) { console.error('Not signed in to Google. Run: gcloud auth application-default login'); process.exit(1); }

// the same four day tables and night table as src/components/Menu.tsx, chosen the same way per dish
const TABLES = { a: 'assets/plate-table.jpg', b: 'assets/plate-table-b.jpg', c: 'assets/plate-table-c.jpg', d: 'assets/plate-table-d.jpg', night: 'assets/plate-table-night.jpg' };
const DAY = ['a', 'b', 'c', 'd'];
function seeded(text) { // src/lib/flavor.ts
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); // src/lib/content.ts

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf('--' + name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const night = args.includes('--night'); if (night) args.splice(args.indexOf('--night'), 1);
const all = args.includes('--all'); if (all) args.splice(args.indexOf('--all'), 1);
const use = args.includes('--use'); if (use) args.splice(args.indexOf('--use'), 1);
const forced = flag('table'), size = flag('size') || '2K';
const wanted = args.map((a) => a.toLowerCase());

// every dish with a photo, with the id the site gives it (src/lib/content.ts)
const menu = JSON.parse(readFileSync(join(ROOT, 'content/menu.json'), 'utf8'));
const dishes = [];
for (const c of menu.categories || []) {
  const idBase = c.name.toLowerCase().replace(/[^a-z]/g, '') || slug(c.name);
  (c.items || []).forEach((row, i) => {
    if (!row?.photo || !row.name) return;
    dishes.push({ id: idBase + '-' + (slug(row.name) || 'item') + '-' + i, name: row.name, cat: c.name, photo: row.photo.replace(/^\//, '') });
  });
}
const todo = all ? dishes : dishes.filter((d) => wanted.includes(d.name.toLowerCase()));
if (!todo.length) { console.error('No dish matched. Dishes with photos: ' + dishes.map((d) => d.name).join(', ')); process.exit(1); }

if (use) {
  // replated/<dish>-<table>.jpg → assets/plated/<upload name>.jpg (phone sized), keyed by photo and day or night
  const LIST = join(ROOT, 'assets/plated.json');
  const list = existsSync(LIST) ? JSON.parse(readFileSync(LIST, 'utf8')) : {};
  mkdirSync(join(ROOT, 'assets/plated'), { recursive: true });
  for (const d of todo) {
    const table = forced || (night ? 'night' : DAY[Math.floor(seeded(d.id)() * DAY.length)]);
    const from = join(ROOT, 'replated', `${slug(d.name)}-${table}.jpg`);
    if (!existsSync(from)) { console.log(`${d.name}: no replated/${slug(d.name)}-${table}.jpg yet, left as it is`); continue; }
    const to = `assets/plated/${basename(d.photo).replace(/\.\w+$/, '')}${table === 'night' ? '-night' : ''}.jpg`;
    execFileSync('python3', ['-c', 'import sys; from PIL import Image; im = Image.open(sys.argv[1]); im.thumbnail((1200, 1600), Image.LANCZOS); im.save(sys.argv[2], quality=82, optimize=True, progressive=True)', from, join(ROOT, to)]);
    list['/' + d.photo] = { ...list['/' + d.photo], [table === 'night' ? 'night' : 'day']: '/' + to };
    console.log(`${d.name}: on the menu as ${to}`);
  }
  writeFileSync(LIST, JSON.stringify(list, null, 2) + '\n');
  process.exit(0);
}

const PLATE = 'a plain round matte off-white stoneware plate with a thin raw-clay rim, about 26 cm across';
const prompt = (d, isNight) => `Image 1 is a photo of a ${d.cat.toLowerCase()} dish called "${d.name}", shot on a white background. Image 2 is an empty beach-bar table.

Make one photorealistic photograph: the food from image 1 served on ${PLATE}, set on the table in image 2.

The food must stay exactly as it is in image 1: the same number of pieces stacked the same way, the same toppings in the same places, the same sauces and drizzle pattern, the same colours and the same portion size. Do not add, remove, tidy or improve anything on the food. Only the plate changes, to the one described.

Use image 2 as the scene and keep it as it is: the same table, background, water and sky. Seen from a seated eye level, looking down at the table at about 25 degrees, matching image 2's perspective so the plate sits flat on the tabletop. Centre the plate on the table, filling about two thirds of the frame's width, slightly below the middle of the picture. ${isNight ? "Light the food warmly from the hanging lantern above, matching image 2's night light." : "Light the food with the same daylight as image 2, from the same direction."} Give the plate a soft, natural contact shadow on the wood.

No cutlery, no extra props, no hands, no text, no logos. Portrait 3:4 food photograph, natural colours, shallow depth of field.`;

const b64 = (p) => readFileSync(join(ROOT, p)).toString('base64');
const mime = (p) => (extname(p).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg');
mkdirSync(join(ROOT, 'replated'), { recursive: true });

for (const d of todo) {
  const table = forced || (night ? 'night' : DAY[Math.floor(seeded(d.id)() * DAY.length)]);
  const isNight = table === 'night';
  // already done: delete the file in replated/ to make it again
  if (existsSync(join(ROOT, 'replated', `${slug(d.name)}-${table}.jpg`))) { console.log(`${d.name}: replated/${slug(d.name)}-${table}.jpg already there, skipped`); continue; }
  process.stdout.write(`${d.name} (${d.cat}) on table ${table}… `);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token, 'x-goog-user-project': PROJECT },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [
        { text: prompt(d, isNight) },
        { text: 'Image 1:' }, { inlineData: { mimeType: mime(d.photo), data: b64(d.photo) } },
        { text: 'Image 2:' }, { inlineData: { mimeType: 'image/jpeg', data: b64(TABLES[table]) } },
      ] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:4', imageSize: size } },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { console.log('failed: ' + (body.error?.message || res.status)); continue; }
  const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) { console.log('no image came back (' + (body.candidates?.[0]?.finishReason || 'unknown reason') + ')'); continue; }
  // keep the model's frame as it came, then lay only its dish over the clean table photo (scripts/replate_blend.py)
  const raw = join('replated', `${slug(d.name)}-${table}.raw${part.inlineData.mimeType === 'image/png' ? '.png' : '.jpg'}`);
  const out = join('replated', `${slug(d.name)}-${table}.jpg`);
  writeFileSync(join(ROOT, raw), Buffer.from(part.inlineData.data, 'base64'));
  execFileSync('python3', [join(ROOT, 'scripts/replate_blend.py'), join(ROOT, TABLES[table]), join(ROOT, raw), join(ROOT, out)], { stdio: 'ignore' });
  console.log('saved ' + out);
}
