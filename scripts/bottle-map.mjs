#!/usr/bin/env node
// The two ends of the footer's message in a bottle (scripts/hero-video.mjs turns them into the clip): the bottle, corked,
// a rolled-up paper inside, lying on the white sand; and the same sand with our own treasure map lying open on it, so the
// clip ends on the map the page then shows. Nano Banana Pro through Vertex AI, same sign-in and project as
// scripts/replate.mjs. Everything goes to replated/bottle/ (ignored by git) until it is chosen.
//
//   node scripts/bottle-map.mjs sand            the empty sand, seen from straight above
//   node scripts/bottle-map.mjs bottle          the bottle on that sand
//   node scripts/bottle-map.mjs map card.png    the map card (a transparent screenshot of .parchment) laid on that sand
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'replated/bottle');
const PROJECT = process.env.LAPLAYA_GCP_PROJECT || 'gen-lang-client-0746888173'; // "Choco Crepe"
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/gemini-3-pro-image:generateContent`;
const signIn = () => { try { return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
mkdirSync(OUT, { recursive: true });

async function picture(text, photo) {
  for (let tries = 0; ; tries++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + signIn(), 'x-goog-user-project': PROJECT },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }, ...(photo ? [{ inlineData: { mimeType: 'image/jpeg', data: readFileSync(photo).toString('base64') } }] : [])] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9', imageSize: '2K' } },
      }),
    });
    // about one picture a minute on this project
    if (res.status === 429 && tries < 8) { console.log('busy, waiting a minute'); await new Promise((r) => setTimeout(r, 65_000)); continue; }
    const body = await res.json().catch(() => ({}));
    const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!res.ok || !part) throw new Error(body.error?.message || res.status + ' ' + (body.candidates?.[0]?.finishReason || ''));
    return Buffer.from(part.inlineData.data, 'base64');
  }
}
// every frame the clip uses is a 1920×1080 jpeg, as Veo takes it
const jpeg = (src, out, vf = '') => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', (vf ? vf + ',' : '') + 'scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080', '-q:v', '3', out]);

const [what, card] = process.argv.slice(2);
if (what === 'sand') {
  writeFileSync(join(OUT, 'sand.png'), await picture(`A photograph looking straight down at fine white sand on a lake beach in warm golden-hour light: soft wind ripples across it, a few tiny shells and pebbles near the edges only, the middle of the frame clear and even. Low sun from the upper left casting long soft shadows in the ripples. Overhead, flat-lay, no horizon, no water, no footprints, no objects in the middle, no text. A real photograph.`));
  jpeg(join(OUT, 'sand.png'), join(OUT, 'sand.jpg'));
  console.log('saved replated/bottle/sand.jpg');
} else if (what === 'bottle') {
  writeFileSync(join(OUT, 'bottle.png'), await picture(`Place one old glass message bottle lying on its side in the middle of this photograph of sand, and change nothing else. The bottle is clear, slightly green, weathered glass with a cork in its neck and a rolled-up sheet of old cream parchment tied with twine inside it. It lies horizontally across the centre, about a third of the frame's width long, half sunk into the sand, lit by the same low warm sun from the upper left, its shadow falling to the lower right like the ripples' shadows. Seen from straight above. A real photograph, no text.`, join(OUT, 'sand.jpg')));
  jpeg(join(OUT, 'bottle.png'), join(OUT, 'bottle.jpg'));
  console.log('saved replated/bottle/bottle.jpg');
} else if (what === 'map' && card) {
  // the map in the middle, 86% of the frame's height, with a soft shadow down and to the right like the sun's
  const h = 929;
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(OUT, 'sand.jpg'), '-i', card, '-filter_complex',
    `[1]scale=-1:${h}:flags=lanczos,split[c][s];[s]colorchannelmixer=rr=0:gg=0:bb=0:aa=.45,boxblur=18[sh];` +
    `[0][sh]overlay=(W-w)/2+14:(H-h)/2+18[b];[b][c]overlay=(W-w)/2:(H-h)/2`, '-q:v', '3', join(OUT, 'map.jpg')]);
  console.log('saved replated/bottle/map.jpg');
} else {
  console.log('node scripts/bottle-map.mjs sand | bottle | map <card.png>');
}
