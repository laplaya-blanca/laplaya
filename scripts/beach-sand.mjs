#!/usr/bin/env node
// The footer's beach, seen from straight above (scripts/hero-video.mjs brings it to life): a band of the same deep teal
// water as the menu's along the top, lapping onto white sand, and dry wind-rippled sand under it, even enough for the
// footer to be read on. One for laptops (16:9) and one for phones (9:16), the tall one made from the wide so they are the
// same beach. Nano Banana Pro through Vertex AI, same sign-in and project as scripts/replate.mjs; everything goes to
// replated/sand/ (ignored by git) until it is chosen.
//
//   node scripts/beach-sand.mjs          both
//   node scripts/beach-sand.mjs tall     the phone one again, from the wide one there
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'replated/sand');
const PROJECT = process.env.LAPLAYA_GCP_PROJECT || 'gen-lang-client-0746888173'; // "Choco Crepe"
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/gemini-3-pro-image:generateContent`;
const signIn = () => { try { return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
mkdirSync(OUT, { recursive: true });

async function picture(text, ratio, photo) {
  for (let tries = 0; ; tries++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + signIn(), 'x-goog-user-project': PROJECT },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }, ...(photo ? [{ inlineData: { mimeType: 'image/jpeg', data: readFileSync(photo).toString('base64') } }] : [])] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ratio, imageSize: '2K' } },
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
const jpeg = (src, out, w, h) => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-vf', `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}`, '-q:v', '3', out]);

const BEACH = `A photograph looking straight down from above at the edge of a calm lake beach in soft late-afternoon light. Along the very top of the frame, a band of deep, dark teal-green lake water, about a sixth of the frame's height, its edge a thin lacy line of white foam lapping onto the sand; just below it a narrow strip of darker wet sand, glistening. The rest of the frame, all the way to the bottom edge, is dry, fine, pale white-cream sand with soft, shallow wind ripples running across it, even and calm, with only a few tiny shells and pebbles scattered sparsely. Overhead, flat-lay, no horizon, no sky, no footprints, no people, no objects, no text. A real photograph.`;

const which = process.argv[2];
if (which !== 'tall') {
  writeFileSync(join(OUT, 'wide.png'), await picture(BEACH, '16:9'));
  jpeg(join(OUT, 'wide.png'), join(OUT, 'wide.jpg'), 1920, 1080);
  console.log('saved replated/sand/wide.jpg');
}
writeFileSync(join(OUT, 'tall.png'), await picture(`Recompose this photograph as a tall portrait frame of the very same beach seen from straight above: the same deep teal-green water along the very top, about a tenth of the frame's height, with the same lacy foam line and strip of wet sand under it, and the same dry, pale, wind-rippled sand filling the rest of the frame down to the bottom edge. Same light, same colours, same scale of ripples and grains. No horizon, no objects, no text. A real photograph.`, '9:16', join(OUT, 'wide.jpg')));
jpeg(join(OUT, 'tall.png'), join(OUT, 'tall.jpg'), 1080, 1920);
console.log('saved replated/sand/tall.jpg');
