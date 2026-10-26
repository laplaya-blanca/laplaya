/* La Playa Blanca owner dashboard — data layer.
   Reads and writes the repo through Netlify Git Gateway (/.netlify/git/github/…), authenticated with
   the owner's Netlify Identity login. Every Save becomes ONE commit on main, so Netlify deploys once. */

export const BRANCH = 'main';
export const FILES = {
  menu: 'content/menu.json',
  builder: 'content/builder.json',
  site: 'content/site.json',
  gallery: 'content/gallery.json'
};
const LABELS = { menu: 'menu', builder: 'build-your-own', site: 'hours & contact', gallery: 'event photos' };
const EMPTY = { gallery: { photos: [] } };

// on localhost there is no Identity: the dev mock server (see admin/README) stands in for Git Gateway
export const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export class ConflictError extends Error { constructor(key) { super(LABELS[key] || key); this.key = key; } }

// ---------- auth ----------
const auth = LOCAL || !window.GoTrue ? null : new window.GoTrue({ APIUrl: '/.netlify/identity', setCookie: false });
const localUser = { email: 'Local preview', jwt: async () => 'local', logout: async () => {} };

export function currentUser() { return LOCAL ? localUser : auth ? auth.currentUser() : null; }
export function login(email, password) { return auth.login(email, password, true); }
export function requestReset(email) { return auth.requestPasswordRecovery(email); }

// ---------- encoding ----------
export function b64encode(text) {
  var bytes = new TextEncoder().encode(text), bin = '';
  for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  var bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, function (c) { return c.charCodeAt(0); }));
}

// keys starting with "_" are dashboard-only (list keys) and never written to the repo
export function serialize(data) {
  return JSON.stringify(data, function (k, v) { return k.charAt(0) === '_' ? undefined : v; }, 2) + '\n';
}

// ---------- Git Gateway ----------
async function gw(user, path, opts) {
  opts = opts || {};
  var token;
  try { token = await user.jwt(); }
  catch (e) { var expired = new Error('Your login expired'); expired.status = 401; throw expired; } // refresh failed
  var r = await fetch('/.netlify/git/github/' + path, {
    method: opts.method || 'GET',
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
  });
  if (r.status === 404 && opts.allow404) return null;
  if (!r.ok) {
    var msg = '';
    try { msg = (await r.json()).message || ''; } catch (e) {}
    var err = new Error(msg || ('Request failed (' + r.status + ')'));
    err.status = r.status;
    throw err;
  }
  return r.status === 204 ? null : r.json();
}

export async function loadOne(user, key) {
  var f = await gw(user, 'contents/' + FILES[key] + '?ref=' + BRANCH, { allow404: true });
  return f ? { data: JSON.parse(b64decode(f.content)), sha: f.sha } : { data: structuredClone(EMPTY[key] || {}), sha: null };
}

// loads every content file: { key: { data, sha } } — sha is the file's blob sha, used to detect clashes on save
export async function loadAll(user) {
  var out = {};
  await Promise.all(Object.keys(FILES).map(async function (key) { out[key] = await loadOne(user, key); }));
  return out;
}

/* Saves changed files + pending photo uploads in one commit.
   files: [{ key, data, sha }]   uploads: [{ path, base64 }]
   Returns { key: newSha } for the saved files. Throws ConflictError if someone else saved one of
   these files since it was loaded (the dashboard then reloads instead of overwriting their edit). */
export async function saveAll(user, files, uploads) {
  var ref = await gw(user, 'git/refs/heads/' + BRANCH);
  var head = ref.object.sha;
  var headCommit = await gw(user, 'git/commits/' + head);

  for (var i = 0; i < files.length; i++) {
    var cur = await gw(user, 'contents/' + FILES[files[i].key] + '?ref=' + head, { allow404: true });
    if ((cur ? cur.sha : null) !== files[i].sha) throw new ConflictError(files[i].key);
  }

  var tree = [], shas = {};
  for (var u = 0; u < uploads.length; u++) {
    var img = await gw(user, 'git/blobs', { method: 'POST', body: { content: uploads[u].base64, encoding: 'base64' } });
    tree.push({ path: uploads[u].path, mode: '100644', type: 'blob', sha: img.sha });
  }
  for (var j = 0; j < files.length; j++) {
    var blob = await gw(user, 'git/blobs', { method: 'POST', body: { content: b64encode(serialize(files[j].data)), encoding: 'base64' } });
    tree.push({ path: FILES[files[j].key], mode: '100644', type: 'blob', sha: blob.sha });
    shas[files[j].key] = blob.sha;
  }

  var parts = files.map(function (f) { return LABELS[f.key]; });
  if (uploads.length) parts.push(uploads.length + (uploads.length > 1 ? ' photos' : ' photo'));
  var newTree = await gw(user, 'git/trees', { method: 'POST', body: { base_tree: headCommit.tree.sha, tree: tree } });
  var commit = await gw(user, 'git/commits', { method: 'POST', body: { message: 'Owner update: ' + parts.join(', '), tree: newTree.sha, parents: [head] } });
  try { await gw(user, 'git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: commit.sha } }); }
  catch (e) { if (e.status === 422) throw new ConflictError(files[0] ? files[0].key : 'the site'); throw e; } // someone committed in between
  return shas;
}

// ---------- photos ----------
// Phone photos are often 4000px / 5MB+: shrink to 1600px JPEG in the browser before upload.
// The live site resizes again per screen through Netlify Image CDN.
export function preparePhoto(file, name) {
  return new Promise(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { try {
      var max = 1600, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
      var c = document.createElement('canvas');
      c.width = Math.round(w * s); c.height = Math.round(h * s);
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); // transparent PNGs: white, not black
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (blob) {
        if (!blob) return reject(new Error('Could not read that photo'));
        var reader = new FileReader();
        reader.onload = function () {
          var slug = String(name || 'photo').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'photo';
          resolve({
            path: 'uploads/' + slug + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg',
            base64: String(reader.result).split(',')[1],
            preview: URL.createObjectURL(blob)
          });
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.85);
    } catch (e) { URL.revokeObjectURL(url); reject(new Error('Could not read that photo')); } };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('That file isn’t a photo this browser can open — try a JPG or PNG.')); };
    img.src = url;
  });
}
