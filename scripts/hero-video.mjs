#!/usr/bin/env node
// The hero photos brought to life with Google's Veo 3.1 through Vertex AI (same sign-in and Cloud project as
// scripts/replate.mjs): each photo becomes an 8-second clip in which only nature moves, the lake, the light on it, the
// palm and the umbrella's fringe in a breeze; the camera never moves, so the photo the page shows first and the video
// are the same picture. Clips go to replated/hero/ (ignored by git). The site plays them as small H.264 loops, the
// duplicate last frame dropped (it is the first frame again) and no sound:
//   ffmpeg -i replated/hero/lake-wide.mp4 -t 7.958 -an -vf "scale=1600:900:flags=lanczos,format=yuv420p" \
//     -c:v libx264 -preset slow -crf 27 -profile:v high -movflags +faststart assets/hero-lake-wide.mp4
//   (the tall ones at scale=720:1280)
//
//   node scripts/hero-video.mjs                 all of them (the hero by day and night, wide for desktop and tall for phones, and events)
//   node scripts/hero-video.mjs lake-wide       one of them: lake-wide lake-tall night-wide night-tall events-wide sand-wide sand-tall bottle-wide
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = process.env.LAPLAYA_GCP_PROJECT || 'gen-lang-client-0746888173'; // "Choco Crepe"
const MODEL = 'veo-3.1-generate-001';
const BASE = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/us-central1/publishers/google/models/${MODEL}`;
const signIn = () => { try { return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
if (!signIn()) { console.error('Not signed in to Google. Run: gcloud auth application-default login'); process.exit(1); }
const call = async (url, body) => {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + signIn(), 'x-goog-user-project': PROJECT }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || String(res.status));
  return json;
};

const STILL = 'The camera is completely still: a locked-off tripod shot, no pan, no zoom, no dolly, no change of framing. Nothing new enters the picture and nothing leaves it; no people, no boats, no birds, no text.';
const SHOTS = {
  'lake-wide': { photo: 'assets/hero-lake-wide.jpg', ratio: '16:9', night: false },
  'lake-tall': { photo: 'assets/hero-lake-tall.jpg', ratio: '9:16', night: false },
  'night-wide': { photo: 'assets/hero-night-wide.jpg', ratio: '16:9', night: true },
  'night-tall': { photo: 'assets/hero-night-tall.jpg', ratio: '9:16', night: true },
  // the events photo (scripts/aisle-couple.mjs): the couple stays where they stand, only the breeze and the sea move
  'events-wide': { photo: 'assets/events-aisle.jpg', ratio: '16:9', people: true,
    prompt: `This photograph of a beach wedding at golden hour comes gently to life. The bride and groom stand still under the arch, hand in hand, seen from behind; they do not turn around or walk. A light warm sea breeze lifts and ripples the bride's long veil and the hem of her gown, and stirs the sheer curtains on the arch and the ribbons on the chairs. The palm fronds sway slowly; the sea's small waves roll in and sparkle in the low sun. Calm, romantic, slow, natural motion. ${STILL}`.replace('no people, ', '') },
  // the footer's beach from above (scripts/beach-sand.mjs): the water laps up the sand and draws back, the wind moves
  // the dry sand's grains; it loops, so the wash ends where it began
  ...Object.fromEntries(['wide', 'tall'].map((f) => ['sand-' + f, { photo: 'replated/sand/' + f + '.jpg', ratio: f === 'wide' ? '16:9' : '9:16',
    prompt: `This overhead photograph of a calm lake beach comes gently to life. The deep teal water at the top moves softly, small ripples running across it; a gentle wave washes up onto the sand in a thin lacy sheet of white foam, glistens on the wet sand, and slowly draws back to where it began. Across the dry sand below, a light breeze drifts a faint veil of fine grains along the wind ripples. Calm, slow, soothing, natural motion. ${STILL}` }])),
  // the footer's message in a bottle (scripts/bottle-map.mjs): it plays once and ends on our map lying open on the sand,
  // the frame the page's own map takes over from
  'bottle-wide': { photo: 'replated/bottle/bottle.jpg', last: 'replated/bottle/map.jpg', ratio: '16:9',
    prompt: `Seen from straight above, an old glass message bottle lies on white sand in warm golden light, its neck pointing to the right. The cork pops out of the neck by itself and drops onto the sand. Then the rolled-up parchment inside slides out of the bottle through its open neck, the narrow end where the cork was, emerging to the right; the base of the bottle stays closed and nothing comes out of it. Once the paper is fully out, the empty bottle rolls gently away out of the frame to the left. The twine falls loose and the parchment unrolls and flattens out by itself, opening into a hand-drawn treasure map that settles flat in the middle of the sand. Smooth, gentle, magical, physically correct motion. The camera is completely still: a locked-off overhead shot, no pan, no zoom, no rotation. No hands, no people, no text other than what is drawn on the map.` },
};
const prompt = (night) => night
  ? `This photograph of a lake shore at night comes gently to life. The lake's surface moves softly, the moonlight's reflection shimmering and breaking up on small ripples; tiny waves lap the white sand at the water's edge. The lights along the far shore twinkle faintly. If there are palm leaves or a thatched umbrella, their fringes stir slightly in a light night breeze. Calm, quiet, slow, peaceful. ${STILL}`
  : `This photograph of a white-sand beach on a lake at golden hour comes gently to life. The water moves softly, sunlight glinting and sparkling on its small ripples; small, slow waves wash up the sand at the water's edge and draw back. The straw fringe of the thatched umbrella and any palm leaves sway slightly in a light warm breeze. Calm, slow, peaceful, natural motion. ${STILL}`;

const still = (p) => ({ bytesBase64Encoded: readFileSync(join(ROOT, p)).toString('base64'), mimeType: 'image/jpeg' });
const wanted = process.argv.slice(2);
const todo = Object.keys(SHOTS).filter((k) => !wanted.length || wanted.includes(k));
mkdirSync(join(ROOT, 'replated/hero'), { recursive: true });

await Promise.all(todo.map(async (k) => {
  const s = SHOTS[k], out = join(ROOT, 'replated/hero', k + '.mp4');
  if (existsSync(out)) { console.log(`${k}: replated/hero/${k}.mp4 already there, skipped`); return; }
  try {
    const op = await call(BASE + ':predictLongRunning', {
      // the photo is the first frame and the last: the clip has to come back to exactly where it began, which keeps the
      // camera from drifting (told only in words, Veo still pans) and makes the loop seamless
      instances: [{ prompt: s.prompt || prompt(s.night), image: still(s.photo), lastFrame: still(s.last || s.photo) }],
      parameters: { aspectRatio: s.ratio, durationSeconds: 8, generateAudio: false, sampleCount: 1, resolution: '1080p', personGeneration: s.people ? 'allow_adult' : 'dont_allow',
        negativePrompt: 'camera movement, pan, tilt, zoom, dolly, tracking shot, handheld, parallax, reframing, new objects, ' + (s.people ? 'turning around, walking, faces, extra people' : s.last ? 'people, hands, paper coming out of the base of the bottle, paper passing through glass' : 'people, hands') + ', boats, birds, text' },
    });
    console.log(`${k}: started`);
    // a clip takes a minute or two; ask every 15 seconds until it is ready
    for (;;) {
      await new Promise((r) => setTimeout(r, 15_000));
      const st = await call(BASE + ':fetchPredictOperation', { operationName: op.name });
      if (!st.done) continue;
      if (st.error) throw new Error(st.error.message);
      const v = st.response?.videos?.[0];
      if (!v?.bytesBase64Encoded) throw new Error('no video came back' + (st.response?.raiMediaFilteredReasons ? ': ' + st.response.raiMediaFilteredReasons.join('; ') : ''));
      writeFileSync(out, Buffer.from(v.bytesBase64Encoded, 'base64'));
      console.log(`${k}: saved replated/hero/${k}.mp4`);
      return;
    }
  } catch (e) { console.log(`${k}: failed: ${e.message}`); }
}));
