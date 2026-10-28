#!/usr/bin/env node
// The events photo with a bride and groom in it, with Nano Banana Pro through Vertex AI (same sign-in and Cloud project as
// scripts/replate.mjs), so scripts/hero-video.mjs can bring it to life the way it does the hero. They stand under the
// arch, small and from behind, looking out at the water: nobody's face to get wrong, and they stay where the phone's crop
// of the picture keeps them. Takes go to replated/events/ (ignored by git); the chosen one is copied over
// assets/events-aisle.jpg by hand.
//
//   node scripts/aisle-couple.mjs        two takes
//   node scripts/aisle-couple.mjs 4      as many as asked
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = process.env.LAPLAYA_GCP_PROJECT || 'gen-lang-client-0746888173'; // "Choco Crepe"
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/gemini-3-pro-image:generateContent`;
const signIn = () => { try { return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
if (!signIn()) { console.error('Not signed in to Google. Run: gcloud auth application-default login'); process.exit(1); }

const PROMPT = `Add a bride and groom to this photograph of a beach wedding aisle at golden hour, and change nothing else: the same framing, the same chairs, flowers, arch, palms, sea, sky and light, pixel for pixel wherever the couple is not.
They stand together under the wooden arch at the far end of the aisle, small in the frame as they would be from where the camera is, seen from behind, facing the sea, hand in hand. The bride wears a flowing white gown with a long, light veil; the groom a light beige linen suit. Their faces are not visible.
Light them exactly as the scene is lit: warm low sun from the left, soft rim light on the veil and the gown, their shadows falling across the sand like the chairs' shadows do. A real photograph, not an illustration; no text, no other people.`;

const takes = Number(process.argv[2]) || 2;
mkdirSync(join(ROOT, 'replated/events'), { recursive: true });
const photo = readFileSync(join(ROOT, 'assets/events-aisle.jpg')).toString('base64');

for (let i = 1; i <= takes; i++) {
  for (let tries = 0; ; tries++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + signIn(), 'x-goog-user-project': PROJECT },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: PROMPT }, { inlineData: { mimeType: 'image/jpeg', data: photo } }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9', imageSize: '2K' } },
      }),
    });
    // about one picture a minute on this project
    if (res.status === 429 && tries < 8) { console.log(`take ${i}: busy, waiting a minute`); await new Promise((r) => setTimeout(r, 65_000)); continue; }
    const body = await res.json().catch(() => ({}));
    const part = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!res.ok || !part) { console.log(`take ${i}: failed: ${body.error?.message || res.status + ' ' + (body.candidates?.[0]?.finishReason || '')}`); break; }
    const out = `replated/events/couple-${i}.${part.inlineData.mimeType === 'image/png' ? 'png' : 'jpg'}`;
    writeFileSync(join(ROOT, out), Buffer.from(part.inlineData.data, 'base64'));
    console.log(`take ${i}: saved ${out}`);
    break;
  }
}
