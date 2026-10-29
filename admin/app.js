/* La Playa Blanca owner dashboard — UI (Preact + htm, no build step).
   Screens: Menu · Build your own · Hours & contact · Event photos · Photo templates. Edits stay local until "Save changes".
   Libraries are vendored in admin/vendor (htm@3.1.1 preact standalone, gotrue-js@1.0.1) so /admin loads no third-party script. */
import { html, render, useState, useEffect, useRef } from './vendor/htm-preact-3.1.1.js';
import { FILES, LOCAL, ConflictError, currentUser, login, requestReset, loadAll, loadOne, saveAll, serialize, preparePhoto } from './store.js';

const TAGS = ['Signature', 'Nuts', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free'];
const ICONS = ['pancake', 'crepe', 'waffle', 'bubble', 'glass', 'juice', 'shake', 'matcha', 'boba', 'scoop', 'coffee'];
const TEMPS = ['', 'Warm', 'Hot', 'Cold', 'Iced', 'Fresh'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const VIEWS = [
  { id: 'menu', label: 'Menu', icon: 'menu' },
  { id: 'builder', label: 'Build your own', short: 'Build', icon: 'layers' },
  { id: 'hours', label: 'Hours & contact', short: 'Hours', icon: 'clock' },
  { id: 'photos', label: 'Event photos', short: 'Photos', icon: 'image' },
  { id: 'templates', label: 'Photo templates', short: 'Templates', icon: 'table' }
];

// ---------- small helpers ----------
let K = 0;
const nk = () => 'k' + (++K);
// give every list row a stable dashboard-only key (_k) so reordering and editing never mix rows up
function keyify(key, d) {
  if (key === 'menu') (d.categories || (d.categories = [])).forEach((c) => { c._k = nk(); (c.items || (c.items = [])).forEach((i) => { i._k = nk(); }); });
  if (key === 'builder') ['bases', 'sauces', 'toppings'].forEach((s) => (d[s] || (d[s] = [])).forEach((o) => { o._k = nk(); }));
  if (key === 'gallery') (d.photos || (d.photos = [])).forEach((p) => { p._k = nk(); });
  return d;
}
const money = (p) => (p === null || p === undefined || p === '' ? 'Ask at the counter' : '$' + (Number.isInteger(+p) ? +p : (+p).toFixed(2)));
const toPrice = (v) => (v === '' || isNaN(parseFloat(v)) ? null : Math.round(parseFloat(v) * 100) / 100);
const move = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; };
const findItem = (d, k) => { for (const c of d.categories) { const i = c.items.findIndex((x) => x._k === k); if (i >= 0) return { cat: c, i, item: c.items[i] }; } return null; };

function Icon({ name, size = 20 }) {
  const P = {
    menu: html`<path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 7h4M17 3c-1.7 1.2-2.5 3-2.5 5.5S15.5 13 17 13v8"/>`,
    layers: html`<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>`,
    clock: html`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    image: html`<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>`,
    plus: html`<path d="M12 5v14M5 12h14"/>`,
    search: html`<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>`,
    trash: html`<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>`,
    up: html`<path d="m6 15 6-6 6 6"/>`,
    down: html`<path d="m6 9 6 6 6-6"/>`,
    left: html`<path d="m15 6-6 6 6 6"/>`,
    right: html`<path d="m9 6 6 6-6 6"/>`,
    x: html`<path d="M6 6l12 12M18 6 6 18"/>`,
    camera: html`<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>`,
    gear: html`<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>`,
    out: html`<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>`,
    ext: html`<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>`,
    check: html`<path d="m5 12 5 5 9-10"/>`,
    table: html`<path d="M3 9h18M5 9l-1 11M19 9l1 11M8 9v6h8V9M7 5h10l2 4H5z"/>`,
    download: html`<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>`,
    copy: html`<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>`
  };
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;
}

// open dialogs, newest last: only the top one reacts to Escape / Tab, and focus returns to where it came from
const dialogs = [];
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function useDialog(ref, onClose, focusSel) {
  useEffect(() => {
    const prev = document.activeElement, me = { onClose };
    dialogs.push(me); document.body.classList.add('locked');
    const first = ref.current && ref.current.querySelector(focusSel);
    if (first) first.focus();
    const key = (e) => {
      if (dialogs[dialogs.length - 1] !== me) return;
      if (e.key === 'Escape') { e.preventDefault(); me.onClose(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const f = ref.current.querySelectorAll(FOCUSABLE);
      if (!f.length) return;
      if (e.shiftKey && (document.activeElement === f[0] || !ref.current.contains(document.activeElement))) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    addEventListener('keydown', key);
    return () => {
      removeEventListener('keydown', key);
      dialogs.splice(dialogs.indexOf(me), 1);
      if (!dialogs.length) document.body.classList.remove('locked');
      if (prev && prev.focus && document.contains(prev)) prev.focus();
    };
  }, []);
}

// a real button that opens the (hidden) file picker, so keyboards and switch control can reach it
function PhotoButton({ label, multiple, onFiles, className = 'btn' }) {
  const input = useRef();
  return html`<button type="button" class=${className} onClick=${() => input.current.click()}>
    <${Icon} name=${multiple ? 'plus' : 'camera'} size=${18}/> ${label}
    <input ref=${input} type="file" accept="image/*" multiple=${multiple} hidden tabindex="-1"
      onChange=${(e) => { const f = Array.from(e.target.files); e.target.value = ''; if (f.length) onFiles(f); }}/>
  </button>`;
}

function Switch({ on, onChange, label }) {
  return html`<button type="button" role="switch" aria-checked=${on} aria-label=${label} class=${'switch' + (on ? ' on' : '')}
    onClick=${(e) => { e.stopPropagation(); onChange(!on); }}><span></span></button>`;
}

function Field({ label, hint, children }) {
  return html`<label class="field"><span class="label">${label}</span>${children}${hint && html`<span class="hint">${hint}</span>`}</label>`;
}

// ---------- login ----------
function Login({ onIn, expired }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { onIn(await login(email.trim(), pw)); }
    catch (err) { setMsg({ bad: true, text: 'That email and password don’t match. Check them and try again.' }); }
    setBusy(false);
  };
  const reset = async () => {
    if (!email.trim()) { setMsg({ bad: true, text: 'Type your email first, then tap “Forgot password”.' }); return; }
    try { await requestReset(email.trim()); setMsg({ text: 'Check your email for a link to set a new password.' }); }
    catch (err) { setMsg({ bad: true, text: 'Couldn’t send the email. Check the address and try again.' }); }
  };
  return html`<div class=${'login' + (expired ? ' over' : '')}>
    <form class="login-card" onSubmit=${submit} role=${expired ? 'dialog' : undefined} aria-modal=${expired ? 'true' : undefined} aria-labelledby="login-title">
      <img src="/assets/logo.jpg" alt="" class="login-logo"/>
      <h1 id="login-title">${expired ? 'Log in again' : 'Owner dashboard'}</h1>
      <p class="muted">${expired ? 'Your login timed out. Your unsaved changes are still here.' : 'La Playa Blanca · Qaraaoun'}</p>
      <${Field} label="Email"><input type="email" autocomplete="username" required value=${email} onInput=${(e) => setEmail(e.target.value)}/></${Field}>
      <${Field} label="Password"><input type="password" autocomplete="current-password" required value=${pw} onInput=${(e) => setPw(e.target.value)}/></${Field}>
      ${msg && html`<p class=${'note' + (msg.bad ? ' bad' : '')} role=${msg.bad ? 'alert' : 'status'}>${msg.text}</p>`}
      <button class="btn primary wide" disabled=${busy}>${busy ? 'Logging in…' : 'Log in'}</button>
      <button type="button" class="link" onClick=${reset}>Forgot password?</button>
    </form>
  </div>`;
}

// ---------- menu ----------
function ItemCard({ item, cat, photo, onOpen, onToggle }) {
  const off = item.available === false;
  return html`<div class=${'item' + (off ? ' off' : '')}>
    <button type="button" class="item-open" onClick=${onOpen} aria-label=${'Edit ' + (item.name || 'item') + ', ' + money(item.price) + (off ? ', sold out' : '')}>
      <span class="thumb">${item.photo ? html`<img src=${photo(item.photo)} alt="" loading="lazy"/>` : html`<span aria-hidden="true">${(item.name || '?').charAt(0)}</span>`}</span>
      <span class="item-body">
        ${cat && html`<span class="eyebrow">${cat}</span>`}
        <strong>${item.name || 'Untitled'}</strong>
        <span class="price">${money(item.price)}</span>
        ${off && html`<span class="pill coral">Sold out</span>`}
      </span>
    </button>
    <div class="item-switch">
      <${Switch} on=${!off} onChange=${onToggle} label=${'Available: ' + item.name}/>
      <span>${off ? 'Off' : 'On'}</span>
    </div>
  </div>`;
}

function ItemEditor({ data, itemKey, photo, edit, onPhoto, onClose, ask }) {
  const found = findItem(data, itemKey);
  const nameRef = useRef();
  useEffect(() => { if (found && found.item.name === 'New item' && nameRef.current) { nameRef.current.focus(); nameRef.current.select(); } }, [itemKey]);
  if (!found) return null;
  const { cat, i, item } = found;
  const set = (fn) => edit((d) => fn(findItem(d, itemKey).item));
  return html`<${Panel} title="Edit item" onClose=${onClose}>
    <div class="photo-pair">
      <div class="photo-edit">
        <span class="label">Day photo</span>
        ${item.photo ? html`<img src=${photo(item.photo)} alt=""/>` : html`<div class="photo-empty"><${Icon} name="camera" size=${30}/><span>No photo yet</span></div>`}
        <div class="row">
          <${PhotoButton} label=${item.photo ? 'Change' : 'Add photo'} onFiles=${(f) => onPhoto(f[0], item.name, (path) => set((it) => { it.photo = path; }))}/>
          ${item.photo && html`<button class="btn ghost" onClick=${() => set((it) => { it.photo = ''; })}>Remove</button>`}
        </div>
      </div>
      <div class="photo-edit">
        <span class="label">Night photo</span>
        ${item.photoNight ? html`<img src=${photo(item.photoNight)} alt=""/>` : html`<div class="photo-empty"><${Icon} name="camera" size=${30}/><span>Shown after dark</span></div>`}
        <div class="row">
          <${PhotoButton} label=${item.photoNight ? 'Change' : 'Add photo'} onFiles=${(f) => onPhoto(f[0], item.name + ' night', (path) => set((it) => { it.photoNight = path; }))}/>
          ${item.photoNight && html`<button class="btn ghost" onClick=${() => set((it) => { delete it.photoNight; })}>Remove</button>`}
        </div>
      </div>
    </div>
    <p class="hint photo-hint">After dark the menu shows the night photo, or the day photo if there isn’t one. To make them, see <a href="#templates">Photo templates</a>.</p>
    <div class="avail">
      <div><strong>Available today</strong><span class="muted">${item.available === false ? 'Shows “Sold out” and can’t be ordered' : 'Customers can order it'}</span></div>
      <${Switch} on=${item.available !== false} label="Available today" onChange=${(v) => set((it) => { it.available = v; })}/>
    </div>
    <${Field} label="Name"><input ref=${nameRef} value=${item.name} onInput=${(e) => set((it) => { it.name = e.target.value; })}/></${Field}>
    <${Field} label="Price ($)" hint="Leave empty to show “Ask at the counter”.">
      <input type="number" inputmode="decimal" min="0" step="0.25" value=${item.price ?? ''} placeholder="Ask at the counter"
        onInput=${(e) => set((it) => { it.price = toPrice(e.target.value); })}/>
    </${Field}>
    <${Field} label="Description" hint=${'Empty = uses the category text: “' + (cat.description || '—') + '”'}>
      <textarea rows="2" value=${item.description} onInput=${(e) => set((it) => { it.description = e.target.value; })}></textarea>
    </${Field}>
    <div class="field"><span class="label">Tags</span>
      <div class="chips">${TAGS.map((t) => {
        const on = (item.tags || []).includes(t);
        return html`<button type="button" class=${'chip' + (on ? ' on' : '')} onClick=${() => set((it) => { it.tags = on ? it.tags.filter((x) => x !== t) : [...(it.tags || []), t]; })}>${on && html`<${Icon} name="check" size=${14}/>`}${t}</button>`;
      })}</div>
    </div>
    <div class="field"><span class="label">Position</span>
      <div class="row">
        <button class="btn ghost" disabled=${i === 0} onClick=${() => edit((d) => { const f = findItem(d, itemKey); move(f.cat.items, f.i, -1); })}><${Icon} name="up" size=${18}/> Earlier</button>
        <button class="btn ghost" disabled=${i === cat.items.length - 1} onClick=${() => edit((d) => { const f = findItem(d, itemKey); move(f.cat.items, f.i, 1); })}><${Icon} name="down" size=${18}/> Later</button>
        <select aria-label="Move to category" value=${cat._k} onChange=${(e) => edit((d) => { const f = findItem(d, itemKey); f.cat.items.splice(f.i, 1); d.categories.find((c) => c._k === e.target.value).items.push(f.item); })}>
          ${data.categories.map((c) => html`<option value=${c._k}>${c._k === cat._k ? 'In ' + c.name : 'Move to ' + c.name}</option>`)}
        </select>
      </div>
    </div>
    <button class="btn danger" onClick=${() => ask('Delete “' + item.name + '”?', 'It disappears from the menu when you save.', () => { edit((d) => { const f = findItem(d, itemKey); f.cat.items.splice(f.i, 1); }); onClose(); })}><${Icon} name="trash" size=${18}/> Delete item</button>
  </${Panel}>`;
}

function CategoryEditor({ data, catKey, edit, onClose, ask }) {
  const ci = data.categories.findIndex((c) => c._k === catKey);
  if (ci < 0) return null;
  const c = data.categories[ci];
  const set = (fn) => edit((d) => fn(d.categories.find((x) => x._k === catKey)));
  return html`<${Panel} title="Category settings" onClose=${onClose}>
    <${Field} label="Category name"><input value=${c.name} onInput=${(e) => set((x) => { x.name = e.target.value; })}/></${Field}>
    <${Field} label="Default description" hint="Shown on items that don’t have their own description.">
      <input value=${c.description} onInput=${(e) => set((x) => { x.description = e.target.value; })}/>
    </${Field}>
    <div class="two">
      <${Field} label="Icon"><select value=${c.icon} onChange=${(e) => set((x) => { x.icon = e.target.value; })}>${ICONS.map((o) => html`<option value=${o}>${o}</option>`)}</select></${Field}>
      <${Field} label="Temperature tag"><select value=${c.temp || ''} onChange=${(e) => set((x) => { x.temp = e.target.value; })}>${TEMPS.map((o) => html`<option value=${o}>${o || 'None'}</option>`)}</select></${Field}>
    </div>
    <div class="field"><span class="label">Order on the menu</span>
      <div class="row">
        <button class="btn ghost" disabled=${ci === 0} onClick=${() => edit((d) => move(d.categories, ci, -1))}><${Icon} name="left" size=${18}/> Earlier</button>
        <button class="btn ghost" disabled=${ci === data.categories.length - 1} onClick=${() => edit((d) => move(d.categories, ci, 1))}>Later <${Icon} name="right" size=${18}/></button>
      </div>
    </div>
    <button class="btn danger" onClick=${() => ask('Delete the “' + c.name + '” category?', c.items.length ? 'Its ' + c.items.length + ' items will be deleted too.' : 'It has no items.', () => { edit((d) => { d.categories.splice(d.categories.findIndex((x) => x._k === catKey), 1); }); onClose(); })}>
      <${Icon} name="trash" size=${18}/> Delete category
    </button>
  </${Panel}>`;
}

function MenuView({ data, edit, photo, onPhoto, ask }) {
  const [active, setActive] = useState(data.categories[0] && data.categories[0]._k);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null); // { item: key } | { cat: key }
  const cat = data.categories.find((c) => c._k === active) || data.categories[0];
  const query = q.trim().toLowerCase();
  const toggle = (k) => (v) => edit((d) => { findItem(d, k).item.available = v; });
  const addItem = () => {
    const k = nk();
    edit((d) => { d.categories.find((c) => c._k === cat._k).items.push({ name: 'New item', price: null, description: '', photo: '', available: true, tags: [], _k: k }); });
    setOpen({ item: k });
  };
  const addCat = () => {
    const k = nk();
    edit((d) => { d.categories.push({ name: 'New category', description: '', icon: 'glass', temp: '', items: [], _k: k }); });
    setActive(k); setOpen({ cat: k });
  };
  const results = query ? data.categories.flatMap((c) => c.items.filter((i) => (i.name || '').toLowerCase().includes(query)).map((i) => ({ i, c }))) : [];
  const soldOut = (c) => c.items.filter((i) => i.available === false).length;

  return html`<div>
    <header class="view-head">
      <div><h1 tabindex="-1">Menu</h1><p class="muted">Tap an item to edit it. Flip the switch to mark it sold out.</p></div>
      <div class="search"><${Icon} name="search" size=${18}/><input type="search" aria-label="Find an item" placeholder="Find an item" value=${q} onInput=${(e) => setQ(e.target.value)}/></div>
    </header>
    ${query ? html`
      <p class="muted">${results.length} ${results.length === 1 ? 'item' : 'items'} matching “${q.trim()}”</p>
      <div class="items">${results.map(({ i, c }) => html`<${ItemCard} key=${i._k} item=${i} cat=${c.name} photo=${photo} onOpen=${() => setOpen({ item: i._k })} onToggle=${toggle(i._k)}/>`)}</div>
    ` : html`
      <nav class="tabs" aria-label="Categories">
        ${data.categories.map((c) => html`<button key=${c._k} class=${'tab' + (c._k === (cat && cat._k) ? ' on' : '')} aria-current=${c._k === (cat && cat._k) ? 'true' : undefined} onClick=${() => setActive(c._k)}>
          ${c.name || 'Untitled'} <span class="count">${c.items.length}<span class="sr-only"> items</span></span>${soldOut(c) > 0 && html`<span class="dot" aria-hidden="true"></span><span class="sr-only">, ${soldOut(c)} sold out</span>`}
        </button>`)}
        <button class="tab add" onClick=${addCat}><${Icon} name="plus" size=${16}/> Category</button>
      </nav>
      ${cat ? html`
        <div class="cat-bar">
          <div><h2>${cat.name}</h2><span class="muted">${cat.items.length} items${soldOut(cat) ? ' · ' + soldOut(cat) + ' sold out' : ''}</span></div>
          <div class="row">
            <button class="btn ghost" onClick=${() => setOpen({ cat: cat._k })}><${Icon} name="gear" size=${18}/> Settings</button>
            <button class="btn primary" onClick=${addItem}><${Icon} name="plus" size=${18}/> Add item</button>
          </div>
        </div>
        <div class="items">${cat.items.map((i) => html`<${ItemCard} key=${i._k} item=${i} photo=${photo} onOpen=${() => setOpen({ item: i._k })} onToggle=${toggle(i._k)}/>`)}</div>
        ${!cat.items.length && html`<p class="empty">No items yet. Tap “Add item”.</p>`}
      ` : html`<p class="empty">No categories yet.</p>`}
    `}
    ${open && open.item && html`<${ItemEditor} data=${data} itemKey=${open.item} photo=${photo} edit=${edit} onPhoto=${onPhoto} ask=${ask} onClose=${() => setOpen(null)}/>`}
    ${open && open.cat && html`<${CategoryEditor} data=${data} catKey=${open.cat} edit=${edit} ask=${ask} onClose=${() => setOpen(null)}/>`}
  </div>`;
}

// ---------- build your own ----------
function OptionList({ title, hint, list, color, edit, field, ask }) {
  const set = (k, fn) => edit((d) => fn(d[field].find((o) => o._k === k)));
  return html`<section class="card">
    <div class="card-head"><div><h2>${title}</h2>${hint && html`<span class="muted">${hint}</span>`}</div>
      <button class="btn ghost" onClick=${() => edit((d) => { d[field].push(Object.assign({ name: '', price: 0, _k: nk() }, color ? { color: '#E8B25E' } : {})); })}><${Icon} name="plus" size=${18}/> Add</button>
    </div>
    <div class="opts">${list.map((o, i) => { const nm = o.name || title + ' ' + (i + 1); return html`<div class="opt" key=${o._k}>
      ${color && html`<input type="color" class="swatch" aria-label=${'Colour for ' + nm} value=${o.color || '#E8B25E'} onInput=${(e) => set(o._k, (x) => { x.color = e.target.value; })}/>`}
      <input class="grow" aria-label=${title + ' ' + (i + 1) + ' name'} placeholder="Name" value=${o.name} onInput=${(e) => set(o._k, (x) => { x.name = e.target.value; })}/>
      <div class="money"><span>$</span><input type="number" inputmode="decimal" min="0" step="0.25" aria-label=${'Price for ' + nm} value=${o.price ?? ''} onInput=${(e) => set(o._k, (x) => { x.price = toPrice(e.target.value); })} onBlur=${() => o.price == null && set(o._k, (x) => { x.price = 0; })}/></div>
      <button class="icon-btn" aria-label=${'Move ' + nm + ' up'} disabled=${i === 0} onClick=${() => edit((d) => move(d[field], i, -1))}><${Icon} name="up" size=${18}/></button>
      <button class="icon-btn" aria-label=${'Move ' + nm + ' down'} disabled=${i === list.length - 1} onClick=${() => edit((d) => move(d[field], i, 1))}><${Icon} name="down" size=${18}/></button>
      <button class="icon-btn" aria-label=${'Delete ' + nm} onClick=${() => ask('Delete “' + nm + '”?', 'It disappears from Build your own when you save.', () => edit((d) => { d[field].splice(d[field].findIndex((x) => x._k === o._k), 1); }))}><${Icon} name="trash" size=${18}/></button>
    </div>`; })}</div>
  </section>`;
}

function BuilderView({ data, edit, ask }) {
  const cream = data.cream || { name: 'Whipped cream', price: 0 };
  return html`<div>
    <header class="view-head"><div><h1 tabindex="-1">Build your own</h1><p class="muted">The options and prices customers pick from. The colour is what the crepe preview shows.</p></div></header>
    <${OptionList} title="Bases" list=${data.bases} color field="bases" edit=${edit} ask=${ask}/>
    <${OptionList} title="Sauces" list=${data.sauces} color field="sauces" edit=${edit} ask=${ask}/>
    <${OptionList} title="Toppings" hint="Price per topping" list=${data.toppings} field="toppings" edit=${edit} ask=${ask}/>
    <section class="card">
      <div class="card-head"><div><h2>Finish</h2><span class="muted">The optional extra at the end</span></div></div>
      <div class="opt">
        <input class="grow" aria-label="Finish name" value=${cream.name} onInput=${(e) => edit((d) => { d.cream = Object.assign({}, d.cream, { name: e.target.value }); })}/>
        <div class="money"><span>$</span><input type="number" inputmode="decimal" min="0" step="0.25" aria-label="Finish price" value=${cream.price ?? ''} onInput=${(e) => edit((d) => { d.cream = Object.assign({}, d.cream, { price: toPrice(e.target.value) }); })} onBlur=${() => cream.price == null && edit((d) => { d.cream = Object.assign({}, d.cream, { price: 0 }); })}/></div>
      </div>
    </section>
  </div>`;
}

// ---------- hours & contact ----------
function HoursView({ data, edit }) {
  const h = data.hours || {}, c = data.contact || {};
  const setH = (k, v) => edit((d) => { d.hours = Object.assign({}, d.hours, { [k]: v }); });
  const setC = (k, v) => edit((d) => { d.contact = Object.assign({}, d.contact, { [k]: v }); });
  const week = DAYS.map((day) => (h.weekly || []).find((w) => w.day === day) || { day, open: '', close: '', closed: false });
  const setDay = (day, patch) => edit((d) => {
    d.hours = d.hours || {};
    const wk = DAYS.map((x) => ((d.hours.weekly || []).find((w) => w.day === x)) || { day: x, open: '', close: '', closed: false });
    Object.assign(wk.find((w) => w.day === day), patch);
    d.hours = Object.assign({}, d.hours, { weekly: wk });
  });
  return html`<div>
    <header class="view-head"><div><h1 tabindex="-1">Hours & contact</h1><p class="muted">Shown at the top of the menu and in the footer.</p></div></header>
    <section class="card">
      <div class="card-head"><div><h2>Hours on the site</h2><span class="muted">Two short lines plus a small note</span></div></div>
      <div class="two">
        <${Field} label="Line 1"><input value=${h.headline || ''} placeholder="Daily, in season" onInput=${(e) => setH('headline', e.target.value)}/></${Field}>
        <${Field} label="Line 2"><input value=${h.subline || ''} placeholder="Afternoons till late" onInput=${(e) => setH('subline', e.target.value)}/></${Field}>
      </div>
      <${Field} label="Small note"><input value=${h.note || ''} onInput=${(e) => setH('note', e.target.value)}/></${Field}>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Opening times</h2><span class="muted">Sets the “Open now · till …” badge at the top of the menu</span></div></div>
      <div class="week">${week.map((w) => html`<div class=${'day' + (w.closed ? ' closed' : '')} key=${w.day}>
        <strong>${w.day}</strong>
        <input type="time" aria-label=${w.day + ' opens'} value=${w.open} disabled=${w.closed} onInput=${(e) => setDay(w.day, { open: e.target.value })}/>
        <span class="muted">to</span>
        <input type="time" aria-label=${w.day + ' closes'} value=${w.close} disabled=${w.closed} onInput=${(e) => setDay(w.day, { close: e.target.value })}/>
        <label class="closed-toggle"><${Switch} on=${!w.closed} label=${w.day + ' open'} onChange=${(v) => setDay(w.day, { closed: !v })}/><span>${w.closed ? 'Closed' : 'Open'}</span></label>
      </div>`)}</div>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Contact</h2></div></div>
      <div class="two">
        <${Field} label="Phone (as shown)"><input type="tel" value=${c.phone || ''} onInput=${(e) => setC('phone', e.target.value)}/></${Field}>
        <${Field} label="WhatsApp order number" hint="Digits only, with country code — e.g. 96171245911">
          <input inputmode="numeric" value=${c.whatsapp || ''} onInput=${(e) => setC('whatsapp', e.target.value.replace(/\D/g, ''))}/>
        </${Field}>
      </div>
      <${Field} label="Instagram"><div class="prefix"><span>@</span><input value=${(c.instagram || '').replace(/^@/, '')} onInput=${(e) => setC('instagram', e.target.value.replace(/^@/, ''))}/></div></${Field}>
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Lira rate</h2><span class="muted">For the $ / LBP price switch coming later</span></div></div>
      <${Field} label="LBP per $1"><input type="number" inputmode="numeric" min="1" value=${data.lbpRate ?? ''} onInput=${(e) => edit((d) => { d.lbpRate = parseInt(e.target.value, 10) || null; })}/></${Field}>
    </section>
  </div>`;
}

// ---------- event photos ----------
function PhotosView({ data, edit, photo, onPhoto, ask }) {
  const add = async (files) => {
    for (const f of files) await onPhoto(f, 'event', (path) => edit((d) => { d.photos.push({ image: path, caption: '', _k: nk() }); }));
  };
  return html`<div>
    <header class="view-head">
      <div><h1 tabindex="-1">Event photos</h1><p class="muted">These appear on the site once the gallery ships with the redesign.</p></div>
      <${PhotoButton} className="btn primary" label="Add photos" multiple onFiles=${add}/>
    </header>
    ${!data.photos.length && html`<p class="empty">No event photos yet.</p>`}
    <div class="gallery">${data.photos.map((p, i) => html`<figure key=${p._k}>
      <img src=${photo(p.image)} alt="" loading="lazy"/>
      <input aria-label=${'Caption for photo ' + (i + 1)} placeholder="Caption (optional)" value=${p.caption || ''} onInput=${(e) => edit((d) => { d.photos[i].caption = e.target.value; })}/>
      <div class="row">
        <button class="icon-btn" aria-label=${'Move photo ' + (i + 1) + ' earlier'} disabled=${i === 0} onClick=${() => edit((d) => move(d.photos, i, -1))}><${Icon} name="left" size=${18}/></button>
        <button class="icon-btn" aria-label=${'Move photo ' + (i + 1) + ' later'} disabled=${i === data.photos.length - 1} onClick=${() => edit((d) => move(d.photos, i, 1))}><${Icon} name="right" size=${18}/></button>
        <button class="icon-btn" aria-label=${'Delete photo ' + (i + 1)} onClick=${() => ask('Delete this photo?', 'It’s removed from the gallery when you save.', () => edit((d) => { d.photos.splice(d.photos.findIndex((x) => x._k === p._k), 1); }))}><${Icon} name="trash" size=${18}/></button>
      </div>
    </figure>`)}</div>
  </div>`;
}

// ---------- photo templates ----------
// The empty tables every dish on the menu is photographed on (assets/plate-table*.jpg, the same pictures
// scripts/plate-unshot.mjs plates on), to download and give to an image AI with a photo of a new dish.
const TABLES = [
  { file: 'plate-table.jpg', name: 'Day table 1' },
  { file: 'plate-table-b.jpg', name: 'Day table 2' },
  { file: 'plate-table-c.jpg', name: 'Day table 3' },
  { file: 'plate-table-d.jpg', name: 'Day table 4' },
  { file: 'plate-table-night.jpg', name: 'Night table', note: 'For the after-dark menu' }
];
const PLATE_PROMPT = `The first image is an empty beach-bar table by a lake. The second image is a photo of one of our dishes.

Make one photorealistic food photograph of the dish from the second image, served and set on the table from the first image. Keep the dish exactly as it is: the same food, toppings, sauces, plate or cup. Make it look fresh and appetising.

Keep the first image as the scene, exactly as it is: the same table, background, water and sky, and the same light. Seen from a seated eye level, looking down at the table at about 25 degrees, matching the table's perspective so the dish sits flat on the tabletop. Centre the dish on the table, filling about half of the picture's width, slightly below the middle. Light the dish with the same light as the table photo, from the same direction, with a soft, natural shadow on the wood.

No hands, no extra props, no text, no logos. Portrait 3:4 photo, natural colours, shallow depth of field.`;

function TemplatesView() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    let ok = true;
    try { await navigator.clipboard.writeText(PLATE_PROMPT); }
    catch (e) { const t = document.getElementById('plate-prompt'); t.select(); try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } }
    // if the browser wouldn't copy, the text is left selected to copy by hand
    setCopied(ok ? 'yes' : 'no'); setTimeout(() => setCopied(false), ok ? 2500 : 6000);
  };
  return html`<div class="templates">
    <header class="view-head"><div><h1 tabindex="-1">Photo templates</h1><p class="muted">Put a new dish on the same beach table as the rest of the menu, so its photo matches.</p></div></header>
    <ol class="steps">
      <li><strong>Download a table</strong> below. Day for the normal menu, night for the after-dark one. On an iPhone it goes to the Files app (Downloads), and Gemini can attach it from there. Or press and hold the picture and choose <strong>Save to Photos</strong>.</li>
      <li><strong>Take a photo of the dish</strong> with your phone, from above or at a slight angle, in good light.</li>
      <li><strong>Open <a href="https://gemini.google.com" target="_blank" rel="noopener">Gemini</a></strong> (ChatGPT works too). Attach the table first, then the dish photo, and paste the instructions below.</li>
      <li><strong>Save the picture</strong> it makes, then open the dish in <a href="#menu">Menu</a>: a day table goes in <strong>Day photo</strong>, the night table in <strong>Night photo</strong>. Not quite right? Ask it to try again.</li>
    </ol>
    <div class="gallery tables">${TABLES.map((t) => html`<figure key=${t.file}>
      <img src=${'/assets/' + t.file} alt=${t.name} loading="lazy"/>
      <figcaption><span><strong>${t.name}</strong>${t.note && html`<span class="muted">${t.note}</span>`}</span>
        <a class="btn" href=${'/assets/' + t.file} download=${'la-playa-' + t.file}><${Icon} name="download" size=${18}/>Download</a></figcaption>
    </figure>`)}</div>
    <section class="prompt-box">
      <div class="prompt-head"><h2>Instructions for the AI</h2>
        <button class="btn primary" onClick=${copy}><${Icon} name=${copied === 'yes' ? 'check' : 'copy'} size=${18}/>${copied === 'yes' ? 'Copied' : 'Copy'}</button></div>
      ${copied === 'no' && html`<p class="hint" role="status">Couldn’t copy automatically. The text is selected: copy it by hand.</p>`}
      <textarea id="plate-prompt" readonly rows="12" aria-label="Instructions for the AI">${PLATE_PROMPT}</textarea>
    </section>
  </div>`;
}

// ---------- shared chrome ----------
function Panel({ title, onClose, children }) {
  const ref = useRef();
  useDialog(ref, onClose, 'h2');
  return html`<div class="panel-wrap">
    <div class="scrim" onClick=${onClose}></div>
    <aside class="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" ref=${ref}>
      <div class="panel-head"><h2 id="panel-title" tabindex="-1">${title}</h2><button class="btn primary" onClick=${onClose}>Done</button></div>
      <div class="panel-body">${children}</div>
    </aside>
  </div>`;
}

function Confirm({ q, onClose }) {
  const ref = useRef();
  useDialog(ref, onClose, '.cancel');
  return html`<div class="modal-wrap">
    <div class="scrim" onClick=${onClose}></div>
    <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body" ref=${ref}>
      <h2 id="confirm-title">${q.title}</h2><p class="muted" id="confirm-body">${q.body}</p>
      <div class="row end"><button class="btn ghost cancel" onClick=${onClose}>Cancel</button><button class="btn danger solid" onClick=${() => { q.yes(); onClose(); }}>${q.yesLabel || 'Delete'}</button></div>
    </div>
  </div>`;
}

// content file -> dashboard section
const viewOf = (k) => ({ site: 'hours', gallery: 'photos' })[k] || k;

// the site silently skips nameless rows and merges same-named categories, so catch those before saving
function checkContent(files) {
  const cats = (files.menu && files.menu.data.categories) || [], seen = {};
  for (const c of cats) {
    const n = (c.name || '').trim();
    if (!n) return { view: 'menu', text: 'A menu category has no name. Give it a name (or delete it), then save.' };
    if (seen[n.toLowerCase()]) return { view: 'menu', text: 'Two menu categories are both called “' + n + '”. Rename one, then save.' };
    seen[n.toLowerCase()] = 1;
    if (c.items.some((it) => !(it.name || '').trim())) return { view: 'menu', text: 'An item in “' + n + '” has no name. Give it a name (or delete it), then save.' };
  }
  const b = files.builder && files.builder.data;
  if (b && ['bases', 'sauces', 'toppings'].some((f) => (b[f] || []).some((o) => !(o.name || '').trim())))
    return { view: 'builder', text: 'A Build-your-own option has no name. Give it a name (or delete it), then save.' };
  return null;
}

// ---------- app ----------
function App() {
  const [user, setUser] = useState(currentUser());
  const [files, setFiles] = useState(null);       // { key: { data, sha, orig } }
  const [loadErr, setLoadErr] = useState(null);
  const [view, setView] = useState((location.hash.slice(1) || 'menu'));
  const [pending, setPending] = useState({});     // '/uploads/x.jpg' -> { path, base64 }
  const previews = useRef({});                    // '/uploads/x.jpg' -> blob URL (until the deploy serves it)
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);       // { text, tone, action? }
  const [q, setQ] = useState(null);
  const [expired, setExpired] = useState(false);  // login timed out: show login over the work, keep edits
  const [preparing, setPreparing] = useState(0);  // photos still being resized

  const load = async () => {
    setLoadErr(null); setFiles(null);
    try {
      const raw = await loadAll(user);
      const next = {};
      Object.keys(raw).forEach((k) => { next[k] = { data: keyify(k, raw[k].data), sha: raw[k].sha, orig: serialize(raw[k].data) }; });
      setFiles(next); setPending({});
    } catch (e) {
      if (e.status === 401) { await signOut(); return; }
      setLoadErr(e.message);
    }
  };
  useEffect(() => { if (user && !files) load(); }, [user]);
  useEffect(() => { const h = () => setView(location.hash.slice(1) || 'menu'); addEventListener('hashchange', h); return () => removeEventListener('hashchange', h); }, []);
  const navigated = useRef(false);
  useEffect(() => {
    document.title = (VIEWS.find((v) => v.id === view) || VIEWS[0]).label + ' — La Playa Blanca dashboard';
    if (navigated.current) { const h1 = document.querySelector('main h1'); if (h1) h1.focus(); }
    navigated.current = true;
  }, [view]);

  const dirtyKeys = files ? Object.keys(files).filter((k) => serialize(files[k].data) !== files[k].orig) : [];
  const dirty = dirtyKeys.length > 0;
  useEffect(() => { const w = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; addEventListener('beforeunload', w); return () => removeEventListener('beforeunload', w); }, [dirty]);

  const edit = (key) => (fn) => setFiles((prev) => { if (!prev) return prev; const d = structuredClone(prev[key].data); try { fn(d); } catch (e) { return prev; } return Object.assign({}, prev, { [key]: Object.assign({}, prev[key], { data: d }) }); });
  const photo = (p) => previews.current[p] || ('/' + String(p).replace(/^\//, ''));
  const onPhoto = async (file, name, done) => {
    setPreparing((n) => n + 1);
    try {
      setToast({ text: 'Preparing photo…' });
      const ph = await preparePhoto(file, name);
      const pub = '/' + ph.path;
      previews.current[pub] = ph.preview;
      setPending((p) => Object.assign({}, p, { [pub]: ph }));
      done(pub);
      setToast((t) => (t && t.text === 'Preparing photo…' ? null : t));
    } catch (e) { setToast({ text: e.message, tone: 'bad' }); }
    setPreparing((n) => n - 1);
  };
  const ask = (title, body, yes) => setQ({ title, body, yes });

  async function signOut() { try { await (currentUser() && currentUser().logout()); } catch (e) {} setUser(null); setFiles(null); setPending({}); setExpired(false); }
  const askSignOut = () => (dirty
    ? setQ({ title: 'Log out without saving?', body: 'Your unsaved changes will be lost.', yes: signOut, yesLabel: 'Log out' })
    : signOut());
  const relogin = (u) => { setUser(u); setExpired(false); setToast({ text: 'Logged in again. Tap Save to publish your changes.' }); };

  // conflict: reload just the file someone else changed; edits to the other sections stay
  const reloadOne = async (key) => {
    try {
      const f = await loadOne(user, key);
      setFiles((prev) => Object.assign({}, prev, { [key]: { data: keyify(key, f.data), sha: f.sha, orig: serialize(f.data) } }));
      setToast({ text: 'Reloaded the latest ' + VIEWS.find((v) => v.id === viewOf(key)).label.toLowerCase() + '. Make your change there again.' });
    } catch (e) { setToast({ tone: 'bad', text: 'Couldn’t reload: ' + e.message }); }
  };

  const discard = () => {
    setFiles((prev) => { const n = {}; Object.keys(prev).forEach((k) => { n[k] = Object.assign({}, prev[k], { data: keyify(k, JSON.parse(prev[k].orig)) }); }); return n; });
    setPending({}); setToast({ text: 'Changes discarded.' });
  };

  const save = async () => {
    if (preparing) { setToast({ text: 'One moment — a photo is still being prepared.' }); return; }
    const problem = checkContent(files);
    if (problem) { setToast({ tone: 'bad', text: problem.text }); if (problem.view) location.hash = problem.view; return; }
    setSaving(true); setToast(null);
    try {
      // snapshot exactly what is sent: edits made while saving stay unsaved instead of being marked clean
      const sent = {};
      dirtyKeys.forEach((k) => { sent[k] = serialize(files[k].data); });
      const all = serialize(Object.keys(files).map((k) => files[k].data));
      const upPaths = Object.keys(pending).filter((p) => all.includes(JSON.stringify(p))); // skip photos removed again
      const shas = await saveAll(user, dirtyKeys.map((k) => ({ key: k, data: JSON.parse(sent[k]), sha: files[k].sha })), upPaths.map((p) => pending[p]));
      setFiles((prev) => { const n = Object.assign({}, prev); Object.keys(shas).forEach((k) => { n[k] = Object.assign({}, prev[k], { sha: shas[k], orig: sent[k] }); }); return n; });
      setPending((prev) => { const n = Object.assign({}, prev); upPaths.forEach((p) => { delete n[p]; }); return n; });
      setToast({ text: 'Saved! Publishing to the site…', tone: 'good' });
      watchLive(Object.keys(shas), sent);
    } catch (e) {
      if (e instanceof ConflictError) setToast({ tone: 'bad', text: 'Someone else just saved changes to the ' + e.message + '. Reload it to see their version, then make your change again. Your other sections are kept.', action: { label: 'Reload ' + e.message, run: () => reloadOne(e.key) } });
      else if (e.status === 401) { setExpired(true); setToast({ tone: 'bad', text: 'Your login timed out — nothing was saved yet. Log in again, then tap Save.' }); }
      else setToast({ tone: 'bad', text: 'Couldn’t save: ' + e.message + '. Check your connection and try again.' });
    }
    setSaving(false);
  };

  // tells the owner when the deploy is actually serving their change (usually under a minute)
  const watchLive = (keys, text) => {
    const started = Date.now();
    const tick = async () => {
      try {
        const ok = await Promise.all(keys.map(async (k) => (await (await fetch('/' + FILES[k] + '?live=' + Date.now(), { cache: 'no-store' })).text()) === text[k]));
        if (ok.every(Boolean)) { setToast({ text: 'Live on the site now.', tone: 'good', action: { label: 'View site', run: () => open('/', '_blank') } }); return; }
      } catch (e) {}
      if (Date.now() - started < 180000) setTimeout(tick, 5000);
      else setToast({ text: 'Saved. The site is taking longer than usual to update — check again in a few minutes.' });
    };
    setTimeout(tick, 4000);
  };

  if (!user) return html`<${Login} onIn=${setUser}/>`;
  if (expired) return html`<${Login} expired onIn=${relogin}/>`;

  const go = (id) => { location.hash = id; };
  const current = VIEWS.find((v) => v.id === view) || VIEWS[0];
  const body = current.id === 'templates' ? html`<${TemplatesView}/>`
    : !files
    ? (loadErr
        ? html`<div class="empty"><p>Couldn’t load the content: ${loadErr}</p><button class="btn primary" onClick=${load}>Try again</button></div>`
        : html`<div class="empty">Loading your content…</div>`)
    : current.id === 'menu' ? html`<${MenuView} data=${files.menu.data} edit=${edit('menu')} photo=${photo} onPhoto=${onPhoto} ask=${ask}/>`
    : current.id === 'builder' ? html`<${BuilderView} data=${files.builder.data} edit=${edit('builder')} ask=${ask}/>`
    : current.id === 'hours' ? html`<${HoursView} data=${files.site.data} edit=${edit('site')}/>`
    : html`<${PhotosView} data=${files.gallery.data} edit=${edit('gallery')} photo=${photo} onPhoto=${onPhoto} ask=${ask}/>`;

  return html`<div class=${'shell' + (dirty ? ' has-bar' : '')}>
    <aside class="side">
      <div class="brand"><img src="/assets/logo.jpg" alt=""/><div><strong>La Playa Blanca</strong><span>Owner dashboard</span></div></div>
      <nav aria-label="Sections">${VIEWS.map((v) => html`<a href=${'#' + v.id} class=${v.id === current.id ? 'on' : ''} aria-current=${v.id === current.id ? 'page' : undefined}><${Icon} name=${v.icon}/>${v.label}</a>`)}</nav>
      <div class="side-foot">
        <a href="/" target="_blank" rel="noopener"><${Icon} name="ext" size=${18}/>View the site</a>
        <button class="link" onClick=${askSignOut}><${Icon} name="out" size=${18}/>Log out</button>
        <span class="who">${user.email}${LOCAL ? ' (not saved to GitHub)' : ''}</span>
      </div>
    </aside>
    <div class="top">
      <img src="/assets/logo.jpg" alt=""/><strong>${current.label}</strong>
      <a href="/" target="_blank" rel="noopener" class="icon-btn" aria-label="View the site"><${Icon} name="ext" size=${19}/></a>
      <button class="icon-btn" aria-label="Log out" onClick=${askSignOut}><${Icon} name="out" size=${19}/></button>
    </div>
    <main>${body}</main>
    <nav class="tabbar" aria-label="Sections">${VIEWS.map((v) => html`<a href=${'#' + v.id} class=${v.id === current.id ? 'on' : ''} aria-current=${v.id === current.id ? 'page' : undefined}><${Icon} name=${v.icon} size=${22}/><span>${v.short || v.label}</span></a>`)}</nav>
    ${dirty && html`<div class="savebar">
      <span><strong>Unsaved changes</strong><span class="muted"> · ${dirtyKeys.map((k) => VIEWS.find((v) => v.id === viewOf(k)).label).join(', ')}</span></span>
      <div class="row"><button class="btn ghost" disabled=${saving} onClick=${() => setQ({ title: 'Discard your changes?', body: 'Everything since your last save goes back to how it was.', yes: discard, yesLabel: 'Discard' })}>Discard</button>
      <button class="btn amber" disabled=${saving || preparing > 0} onClick=${save}>${saving ? 'Saving…' : preparing ? 'Preparing photo…' : 'Save changes'}</button></div>
    </div>`}
    <div class="toast-region" aria-live="polite">${toast && html`<div class=${'toast ' + (toast.tone || '')} role=${toast.tone === 'bad' ? 'alert' : 'status'}>
      <span>${toast.text}</span>
      ${toast.action && html`<button class="link" onClick=${() => { toast.action.run(); }}>${toast.action.label}</button>`}
      <button class="icon-btn" aria-label="Dismiss message" onClick=${() => setToast(null)}><${Icon} name="x" size=${16}/></button>
    </div>`}</div>
    ${q && html`<${Confirm} q=${q} onClose=${() => setQ(null)}/>`}
  </div>`;
}

// invite / password-reset links land on the homepage; anything else that brings a token here goes back there
if (/(invite|recovery|confirmation)_token=/.test(location.hash)) location.replace('/' + location.hash);
else render(html`<${App}/>`, document.getElementById('app'));
