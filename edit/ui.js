// Small UI toolkit for the editor: DOM helper, API client, toasts, modals, form-field builders, media upload/picker.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export function h(tag, a, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat(3)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
  return e;
}
export const ctx = { pages: () => [], base: '', gh: null };

// ---- local cache of uploaded media (so images look right in the editor/preview before the site is rebuilt) ----
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('wf-media', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export const mediaPut = async (path, blob) => { try { const d = await idb(); d.transaction('f', 'readwrite').objectStore('f').put(blob, path); } catch {} };
export const mediaGet = async path => { try { const d = await idb(); return await new Promise(res => { const q = d.transaction('f').objectStore('f').get(path); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch { return null; } };
export const mediaDel = async path => { try { const d = await idb(); d.transaction('f', 'readwrite').objectStore('f').delete(path); } catch {} };
export const mediaSrc = u => (u && u.startsWith('/') ? ctx.base + u : u);
/** For every /media/ image or video inside root: if the file is not on the live site yet, fall back to the local copy. */
export function fixMedia(root) {
  root.querySelectorAll('img[src*="/media/"],video[src*="/media/"]').forEach(n => {
    if (n.dataset.fx) return; n.dataset.fx = '1';
    n.addEventListener('error', async () => {
      const m = /\/media\/.+$/.exec(new URL(n.getAttribute('src'), location.href).pathname); if (!m) return;
      const b = await mediaGet(m[0]); if (b) n.src = URL.createObjectURL(b);
    }, { once: true });
    if (n.complete && n.naturalWidth === 0 && n.tagName === 'IMG') n.dispatchEvent(new Event('error'));
  });
}

export function toast(msg, kind = 'info', ms = 3200) {
  let box = $('#toasts'); if (!box) { box = h('div', { id: 'toasts' }); document.body.append(box); }
  const t = h('div', { class: 'toast ' + kind, role: 'status' }, msg); box.append(t);
  setTimeout(() => t.classList.add('out'), ms); setTimeout(() => t.remove(), ms + 400);
  return t;
}

export function modal(title, body, { wide = false, buttons = [], onClose, className = '' } = {}) {
  const back = h('div', { class: 'modal-back' });
  const close = () => { back.remove(); document.removeEventListener('keydown', esc); onClose?.(); };
  const esc = e => { if (e.key === 'Escape') close(); };
  const box = h('div', { class: 'modal ' + (wide ? 'wide ' : '') + className, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-h' }, h('strong', {}, title), h('button', { class: 'ico', 'aria-label': 'Close', onclick: close }, '✕')),
    h('div', { class: 'modal-b' }, body),
    buttons.length ? h('div', { class: 'modal-f' }, buttons.map(b => h('button', { class: 'btn ' + (b.kind || ''), onclick: async e => { const r = b.onclick ? await b.onclick(e, close) : undefined; if (r !== false && !b.keep) close(); } }, b.label))) : null);
  back.append(box); back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  document.body.append(back); document.addEventListener('keydown', esc);
  (box.querySelector('input,select,textarea') || box).focus?.();
  return { close, box, back };
}
export const confirmDlg = (title, text, okLabel = 'Confirm', danger = false) => new Promise(res => {
  let done = false; const fin = v => { if (!done) { done = true; res(v); } };
  modal(title, h('p', {}, text), { buttons: [{ label: 'Cancel', onclick: () => fin(false) }, { label: okLabel, kind: danger ? 'danger' : 'primary', onclick: () => fin(true) }], onClose: () => fin(false) });
});
export const promptDlg = (title, label, value = '', ok = 'Save') => new Promise(res => {
  let done = false; const inp = h('input', { type: 'text', value, class: 'inp' }); const fin = v => { if (!done) { done = true; res(v); } };
  const m = modal(title, h('label', { class: 'f' }, h('span', { class: 'fl' }, label), inp), { buttons: [{ label: 'Cancel', onclick: () => fin(null) }, { label: ok, kind: 'primary', onclick: () => fin(inp.value.trim()) }], onClose: () => fin(null) });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { fin(inp.value.trim()); m.close(); } }); inp.select();
});

// ---------- path helpers ----------
export const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
export function setPath(o, p, v) {
  const ks = p.split('.'); let c = o;
  for (let i = 0; i < ks.length - 1; i++) { if (typeof c[ks[i]] !== 'object' || c[ks[i]] === null) c[ks[i]] = {}; c = c[ks[i]]; }
  if (v === undefined) delete c[ks.at(-1)]; else c[ks.at(-1)] = v;
}

// ---------- media: upload + library (files are committed to the repo's media/ folder) ----------
const OPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MEDIA_EXT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/x-icon', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
export const mediaKind = name => { const t = MEDIA_EXT[(name.split('.').pop() || '').toLowerCase()] || ''; return t.startsWith('video/') ? 'video' : t ? 'image' : ''; };
async function optimizeImage(file) {
  if (!OPT_TYPES.includes(file.type) || file.size < 350 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file); const max = 2400, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/webp', 0.86));
    if (blob && blob.size < file.size) return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {}
  return file;
}
export async function uploadFile(file0) {
  const ext = (file0.name.split('.').pop() || '').toLowerCase(), type = MEDIA_EXT[ext];
  if (!type) { toast('Unsupported file type. Use PNG, JPG, WebP, GIF, AVIF, SVG, ICO, MP4, WebM or MOV.', 'err', 6000); throw new Error('type'); }
  const file = await optimizeImage(file0), isVid = type.startsWith('video/'), max = isVid ? 25 : 15;
  if (file.size > max * 1024 * 1024) { toast(`File too large (max ${max} MB on GitHub). ${isVid ? 'For longer videos paste a YouTube or Vimeo link instead.' : 'Please compress the image.'}`, 'err', 7000); throw new Error('size'); }
  const t = toast(`Uploading ${file.name}…`, 'info', 120000);
  try {
    const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
    const name = `${base}-${Math.random().toString(36).slice(2, 7)}.${file.name.split('.').pop().toLowerCase()}`;
    await ctx.gh.putFile('media/' + name, new Uint8Array(await file.arrayBuffer()), 'Upload ' + name);
    await mediaPut('/media/' + name, file);
    t.remove(); toast('Uploaded ' + name, 'ok');
    return { url: '/media/' + name, name, type, size: file.size };
  } catch (e) { t.remove(); toast('Upload failed: ' + e.message, 'err', 7000); throw e; }
}
export function pickFiles(accept, multiple = false) {
  return new Promise(res => { const i = h('input', { type: 'file', accept, multiple, style: { display: 'none' } }); i.onchange = () => res([...i.files]); document.body.append(i); i.click(); setTimeout(() => i.remove(), 60000); });
}
export async function pickMedia(kind = 'image') {
  const list = (await ctx.gh.listDir('media')).filter(f => f.type === 'file' && f.name !== '.gitkeep' && (kind === 'any' || mediaKind(f.name) === kind));
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    const grid = h('div', { class: 'media-grid' }, list.length ? list.map(m => h('button', { class: 'media-item', title: m.name, onclick: () => { fin('/media/' + m.name); mm.close(); } }, mediaKind(m.name) === 'video' ? h('div', { class: 'vid' }, '🎬') : h('img', { src: mediaSrc('/media/' + m.name), loading: 'lazy', alt: m.name }), h('span', {}, m.name))) : h('p', { class: 'muted' }, 'No files yet. Upload one first.'));
    const mm = modal('Choose from library', h('div', {}, h('button', { class: 'btn primary', onclick: async () => { const fs = await pickFiles(kind === 'video' ? 'video/*' : 'image/*'); if (fs[0]) { try { const u = await uploadFile(fs[0]); fin(u.url); mm.close(); } catch {} } } }, '⬆ Upload new'), grid), { wide: true, onClose: () => fin(null) });
    fixMedia(grid);
  });
}

// ---------- form fields ----------
const norm = o => o.map(x => (Array.isArray(x) ? x : [x, x]));
export function fld(def, obj, cb = () => {}) {
  const get = () => (def.k ? getPath(obj, def.k) : undefined);
  const emit = (v, live) => { if (!def.k) return; setPath(obj, def.k, v); cb(def.k, v, { live, def }); };
  const lab = def.l ? h('span', { class: 'fl' }, def.l) : null;
  const wrap = (...c) => h('div', { class: 'f f-' + def.t + (def.half ? ' half' : '') }, lab, ...c);
  let v = get();
  switch (def.t) {
    case 'note': return h('p', { class: 'note' }, def.l);
    case 'button': return h('button', { class: 'btn ' + (def.kind || ''), onclick: def.onclick }, def.l);
    case 'text': { const i = h('input', { class: 'inp', type: 'text', value: v ?? '', placeholder: def.ph || '', maxlength: def.max || 300 }); i.oninput = () => emit(i.value, true); i.onchange = () => emit(i.value, false); return wrap(i); }
    case 'area': { const i = h('textarea', { class: 'inp', rows: def.rows || 4, placeholder: def.ph || '' }); i.value = v ?? ''; i.oninput = () => emit(i.value, true); i.onchange = () => emit(i.value, false); return wrap(i); }
    case 'num': { const i = h('input', { class: 'inp', type: 'number', value: v ?? '', placeholder: def.ph ?? 'auto', min: def.min, max: def.max, step: def.step || 1 }); const f = live => { const x = i.value === '' ? undefined : +i.value; emit(def.empty0 && !x ? undefined : x, live); }; i.oninput = () => f(true); i.onchange = () => f(false); return wrap(i); }
    case 'range': { const out = h('output', {}, v ?? def.def ?? ''); const i = h('input', { type: 'range', min: def.min, max: def.max, step: def.step || 1, value: v ?? def.def ?? def.min }); i.oninput = () => { out.textContent = i.value; emit(+i.value, true); }; i.onchange = () => emit(+i.value, false); return wrap(h('div', { class: 'range' }, i, out, v !== undefined && def.clear !== false ? h('button', { class: 'mini', title: 'Reset', onclick: () => { emit(undefined, false); i.value = def.def ?? def.min; out.textContent = ''; } }, '↺') : null)); }
    case 'sel': { const s = h('select', { class: 'inp' }, norm(def.o).map(([a, b]) => h('option', { value: a, selected: String(v ?? '') === String(a) }, b))); s.onchange = () => emit(s.value === '' ? undefined : def.num ? +s.value : s.value, false); return wrap(s); }
    case 'seg': { const box = h('div', { class: 'seg' }); const draw = () => { box.innerHTML = ''; norm(def.o).forEach(([a, b]) => box.append(h('button', { class: (getPath(obj, def.k) ?? def.def ?? 'left') === a ? 'on' : '', title: a, onclick: () => { emit(a, false); draw(); } }, b))); }; draw(); return wrap(box); }
    case 'bool': { const i = h('input', { type: 'checkbox', checked: !!v }); i.onchange = () => emit(i.checked, false); return h('label', { class: 'f f-bool' }, i, h('span', {}, def.l)); }
    case 'color': {
      const t = h('input', { class: 'inp', type: 'text', value: v ?? '', placeholder: def.ph || 'default' });
      const hex = x => (/^#[0-9a-f]{6}$/i.test(x || '') ? x : /^#[0-9a-f]{3}$/i.test(x || '') ? '#' + [...x.slice(1)].map(c => c + c).join('') : '#888888');
      const c = h('input', { type: 'color', value: hex(v) });
      c.oninput = () => { t.value = c.value; emit(c.value, true); }; c.onchange = () => emit(c.value, false);
      t.onchange = () => { c.value = hex(t.value); emit(t.value.trim() || undefined, false); };
      return wrap(h('div', { class: 'colorrow' }, c, t, v ? h('button', { class: 'mini', title: 'Clear', onclick: () => { t.value = ''; emit(undefined, false); } }, '✕') : null));
    }
    case 'img': case 'video': {
      const kind = def.t === 'video' ? 'video' : 'image', prev = h('div', { class: 'imgprev' });
      const draw = () => { const s = getPath(obj, def.k); prev.innerHTML = ''; if (s) { prev.append(kind === 'video' || /\.(mp4|webm|mov)$/i.test(s) ? h('div', { class: 'vid' }, '🎬') : h('img', { src: mediaSrc(s), alt: '' })); fixMedia(prev); } else prev.append(h('span', { class: 'muted' }, 'None')); };
      const set = u => { emit(u, false); draw(); url.value = u || ''; };
      const url = h('input', { class: 'inp', type: 'text', value: v ?? '', placeholder: kind === 'video' ? 'Paste a YouTube/Vimeo link or file URL' : 'https://… or upload' }); url.onchange = () => set(url.value.trim() || undefined);
      draw();
      return wrap(h('div', { class: 'imgrow' }, prev, h('div', { class: 'imgbtns' },
        h('button', { class: 'btn sm', onclick: async () => { const [f] = await pickFiles(kind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'); if (f) { try { set((await uploadFile(f)).url); } catch {} } } }, '⬆ Upload'),
        h('button', { class: 'btn sm', onclick: async () => { const u = await pickMedia(kind); if (u) set(u); } }, '🗂 Library'),
        v ? h('button', { class: 'btn sm', onclick: () => set(undefined) }, 'Remove') : null)), url);
    }
    case 'link': {
      const pg = ctx.pages(), cur = v || ''; const isPage = cur.startsWith('page:');
      const t = h('input', { class: 'inp', type: 'text', value: isPage ? '' : cur, placeholder: 'https://… , mailto:… , tel:… or #section', disabled: isPage });
      const s = h('select', { class: 'inp' }, h('option', { value: '' }, 'External / custom URL'), pg.map(p => h('option', { value: 'page:' + p.id, selected: cur === 'page:' + p.id }, 'Page: ' + p.title)));
      s.onchange = () => { if (s.value) { t.value = ''; t.disabled = true; emit(s.value, false); } else { t.disabled = false; t.focus(); emit('', false); } };
      t.oninput = () => emit(t.value.trim(), true); t.onchange = () => emit(t.value.trim(), false);
      return wrap(s, t);
    }
    case 'list': return listField(def, obj, cb, lab);
  }
}

export function listField(def, obj, cb, lab) {
  const arr = getPath(obj, def.k) || (setPath(obj, def.k, []), getPath(obj, def.k));
  const box = h('div', { class: 'f f-list' }, lab, h('div', { class: 'rows' }), h('div', { class: 'row-actions' }));
  const rows = box.querySelector('.rows');
  const ping = () => cb(def.k, arr, { live: false, def, structural: true });
  let drag = null;
  const draw = () => {
    rows.innerHTML = '';
    arr.forEach((row, i) => {
      const r = h('div', { class: 'row', draggable: false },
        h('div', { class: 'row-h' }, h('span', { class: 'grip', title: 'Drag to reorder', draggable: true, ondragstart: e => { drag = i; r.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'row'); e.dataTransfer.setDragImage(r, 10, 10); }, ondragend: () => { drag = null; r.classList.remove('dragging'); } }, '⠿'), h('span', { class: 'row-t' }, (def.title ? def.title(row, i) : '#' + (i + 1))),
          h('button', { class: 'mini', title: 'Move up', onclick: () => { if (i) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; draw(); ping(); } } }, '↑'), h('button', { class: 'mini', title: 'Move down', onclick: () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; draw(); ping(); } } }, '↓'),
          h('button', { class: 'mini', title: 'Remove', onclick: () => { arr.splice(i, 1); draw(); ping(); } }, '🗑')),
        def.item.map(sub => fld(sub, row, (k, v, m) => cb(def.k + '.' + i + '.' + k, v, m))));
      r.addEventListener('dragover', e => { if (drag !== null) { e.preventDefault(); r.classList.add('over'); } }); r.addEventListener('dragleave', () => r.classList.remove('over'));
      r.addEventListener('drop', e => { e.preventDefault(); r.classList.remove('over'); if (drag === null || drag === i) return; const [m] = arr.splice(drag, 1); arr.splice(i, 0, m); drag = null; draw(); ping(); });
      rows.append(r);
    });
  };
  draw();
  const ra = box.querySelector('.row-actions');
  ra.append(h('button', { class: 'btn sm', onclick: () => { arr.push(def.blank()); draw(); ping(); } }, '＋ ' + (def.addLabel || 'Add')));
  if (def.bulkImages) ra.append(h('button', { class: 'btn sm', onclick: async () => { const fs = await pickFiles('image/*', true); for (const f of fs) { try { const u = await uploadFile(f); arr.push({ src: u.url, alt: f.name.replace(/\.[^.]+$/, '') }); } catch {} } draw(); ping(); } }, '⬆ Upload several images'), h('button', { class: 'btn sm', onclick: async () => { const u = await pickMedia('image'); if (u) { arr.push({ src: u, alt: '' }); draw(); ping(); } } }, '🗂 From library'));
  return box;
}
