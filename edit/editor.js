// Visual website builder ("Developer Mode"). Runs entirely in the browser; GitHub is the only backend.
import { renderBody, themeCSS, fontsHref, validateSite, pagePath, sanitizeHTML, rebase, uid, FONT_LIST } from '../assets/render.js';
import { initSite } from '../assets/site.js';
import { THEMES, BLOCKS, PAGE_TEMPLATES, newEl, sec as mkSec } from '../assets/blocks.js';
import { $, $$, h, ctx, toast, modal, confirmDlg, promptDlg, fld, getPath, setPath, pickMedia, fixMedia, mediaSrc } from './ui.js';
import { GhClient, Vault } from './github.js';
import { contentFields, styleFields, advancedFields, sectionFields, THEME_FIELDS, TYPE_LABEL } from './panels.js';
import * as Settings from './settings.js';

const J = x => JSON.stringify(x, null, 1);
const S = { gh: null, cfg: {}, site: null, pageId: null, sel: null, tab: 'insert', device: 'desktop', past: [], future: [], lastJson: '', remoteDraft: '', publishedText: '', shaDraft: null, shaSite: null, shaState: null, live: true, drag: null, drop: null, run: null, lastPush: 0, syncing: false, lk: '', ptab: 'content' };
let win, doc, root, ov, ro;

// ------------------------------------------------------------------ boot & login
async function boot() {
  S.cfg = await fetch('../config.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
  ctx.base = S.cfg.base || '';
  showLogin(Vault.exists() ? 'unlock' : 'setup');
}
function showLogin(mode, msg = '') {
  $('#app').hidden = true; const box = $('#login'); box.hidden = false; box.innerHTML = '';
  const meta = Vault.meta(), err = h('div', { class: 'err', role: 'alert' }, msg);
  const card = h('div', { class: 'lcard' });
  if (mode === 'unlock') {
    const pass = h('input', { class: 'inp', type: 'password', placeholder: 'Your editor passcode', autocomplete: 'current-password' });
    card.append(h('h1', {}, 'Developer Mode'), h('p', {}, `Unlock the editor for ${meta.owner}/${meta.repo}.`), h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Passcode'), pass), err,
      h('button', { class: 'btn primary', style: { width: '100%' }, onclick: go }, 'Unlock'),
      h('p', { style: { marginTop: '14px', fontSize: '12px' } }, 'Forgot the passcode, or want to use another token? ', h('a', { href: '#', onclick: e => { e.preventDefault(); Vault.clear(); showLogin('setup'); } }, 'Reconnect with a GitHub token')));
    pass.addEventListener('keydown', e => e.key === 'Enter' && go());
    async function go() { err.textContent = ''; try { const v = await Vault.open(pass.value); await start(new GhClient(v)); } catch (e) { err.textContent = e.message; } }
    setTimeout(() => pass.focus(), 50);
  } else {
    const repo = h('input', { class: 'inp', value: S.cfg.owner && S.cfg.repo ? `${S.cfg.owner}/${S.cfg.repo}` : '', placeholder: 'owner/repository' });
    const branch = h('input', { class: 'inp', value: S.cfg.branch || 'main' });
    const tok = h('input', { class: 'inp', type: 'password', placeholder: 'github_pat_…', autocomplete: 'off' });
    const p1 = h('input', { class: 'inp', type: 'password', placeholder: 'Choose a passcode (min 8 characters)', autocomplete: 'new-password' });
    const p2 = h('input', { class: 'inp', type: 'password', placeholder: 'Repeat passcode', autocomplete: 'new-password' });
    card.append(h('h1', {}, 'Connect Developer Mode'), h('p', {}, 'This editor saves straight to your GitHub repository. Nothing else is used — no other service, no database.'),
      h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Repository'), repo), h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Branch'), branch),
      h('label', { class: 'f' }, h('span', { class: 'fl' }, 'GitHub fine-grained access token'), tok),
      h('details', {}, h('summary', {}, 'How do I get a token? (one time, 2 minutes)'), h('ol', {},
        h('li', {}, 'Open ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'GitHub → Settings → Developer settings → Fine-grained tokens → Generate'), '.'),
        h('li', {}, 'Repository access: “Only select repositories” → choose this website’s repository.'),
        h('li', {}, 'Repository permissions: Contents = Read and write, Pages = Read and write, Actions = Read and write (so publishing progress can be shown), Metadata = Read.'),
        h('li', {}, 'Set an expiry you are comfortable with, generate, and paste the token above.'))),
      h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Editor passcode (protects the token stored in this browser)'), p1, p2), err,
      h('button', { class: 'btn primary', style: { width: '100%' }, onclick: go }, 'Connect & open editor'),
      h('p', { style: { marginTop: '12px', fontSize: '12px' } }, 'The token is encrypted with your passcode and kept only in this browser. It is never written to the repository or the public website.'));
    async function go() {
      err.textContent = '';
      const m = /^([\w.-]+)\/([\w.-]+)$/.exec(repo.value.trim()); if (!m) return (err.textContent = 'Enter the repository as owner/name');
      if (tok.value.trim().length < 20) return (err.textContent = 'Paste your GitHub token');
      if (p1.value.length < 8) return (err.textContent = 'Passcode must be at least 8 characters');
      if (p1.value !== p2.value) return (err.textContent = 'Passcodes do not match');
      const gh = new GhClient({ token: tok.value.trim(), owner: m[1], repo: m[2], branch: branch.value.trim() || 'main' });
      try {
        const info = await gh.repoInfo();
        if (!info.permissions?.push) throw new Error('This token can read the repository but not write to it. Give it “Contents: Read and write”.');
        await Vault.save({ token: gh.token, owner: gh.owner, repo: gh.repo, branch: gh.branch }, p1.value);
        await start(gh);
      } catch (e) { err.textContent = e.message; }
    }
  }
  box.append(card);
}

async function start(gh) {
  S.gh = ctx.gh = gh; S.lk = `wf_local_${gh.slug}`;
  $('#login').hidden = true; $('#app').hidden = false;
  document.title = 'Developer Mode — ' + gh.slug;
  let files;
  try { files = await Promise.all(['content/site.json', 'content/draft.json', 'content/state.json'].map(p => gh.getFile(p))); }
  catch (e) { $('#app').hidden = true; return showLogin('unlock', e.message); }
  const [pub, dr, st] = files;
  if (!pub) { $('#app').hidden = true; return showLogin('unlock', 'content/site.json was not found in this repository. Upload the complete project files first.'); }
  S.publishedText = pub.text; S.shaSite = pub.sha; S.shaDraft = dr?.sha || null; S.remoteDraft = dr?.text ?? pub.text;
  S.shaState = st?.sha || null; try { S.live = JSON.parse(st.text).live !== false; } catch { S.live = true; }
  let text = S.remoteDraft;
  try { // recover unsaved work from an accidental refresh
    const loc = JSON.parse(localStorage.getItem(S.lk) || 'null');
    if (loc?.unsynced && loc.text && loc.text !== S.remoteDraft) {
      const ok = await confirmDlg('Unsaved work found', `This browser has changes from ${new Date(loc.ts).toLocaleString()} that were not saved to GitHub yet. Restore them?`, 'Restore my changes');
      if (ok) text = loc.text; else localStorage.removeItem(S.lk);
    }
  } catch {}
  try { S.site = validateSite(JSON.parse(text)); } catch (e) { toast('Draft was invalid, using published version: ' + e.message, 'err', 6000); S.site = JSON.parse(S.publishedText); }
  S.lastJson = J(S.site); S.pageId = S.site.homeId; S.past = []; S.future = [];
  S.site.reusable ||= []; S.site.customThemes ||= [];
  await canvasReady; applyBrand(); render(); renderPanel(); updatePubUI(); updateUndo();
  if (S.lastJson !== S.remoteDraft) { setChip('Unsaved changes', 'busy'); scheduleSync(); } else setChip('All changes saved', 'ok');
  checkSetup();
}

// ------------------------------------------------------------------ canvas
let canvasReadyRes; const canvasReady = new Promise(r => { canvasReadyRes = r; });
const frame = $('#canvas');
function onFrameLoad() {
  win = frame.contentWindow; doc = frame.contentDocument; root = doc.getElementById('root'); ov = doc.getElementById('ov');
  attachCanvasEvents(); ro = new ResizeObserver(() => drawOverlay()); ro.observe(root); win.addEventListener('resize', drawOverlay);
  canvasReadyRes();
}
if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.getElementById('root')) onFrameLoad(); else frame.addEventListener('load', onFrameLoad, { once: true });

const curPage = () => S.site.pages.find(p => p.id === S.pageId) || S.site.pages[0];
const zoneArr = z => (z === 'header' ? S.site.globals.header : z === 'footer' ? S.site.globals.footer : curPage().sections);
function findSec(sid) { for (const z of ['header', 'main', 'footer']) { const arr = zoneArr(z), i = arr.findIndex(s => s.id === sid); if (i >= 0) return { zone: z, arr, i, s: arr[i] }; } return null; }
function findEl(eid) { for (const z of ['header', 'main', 'footer']) for (const s of zoneArr(z)) { const i = s.items.findIndex(e => e.id === eid); if (i >= 0) return { zone: z, sec: s, i, e: s.items[i] }; } return null; }
const clone = (o, isSec) => { const c = JSON.parse(JSON.stringify(o)); if (isSec) { c.id = uid('s'); c.items.forEach(e => { e.id = uid('e'); }); } else c.id = uid('e'); return c; };

let rafR = 0;
function renderSoon() { cancelAnimationFrame(rafR); rafR = requestAnimationFrame(render); }
function render() {
  if (!doc) return;
  const y = win.scrollY, page = curPage();
  doc.getElementById('theme').textContent = themeCSS(S.site);
  let fl = doc.getElementById('fontsL'); const fh0 = fontsHref(S.site), fh = fh0 && (ctx.base || '') + fh0;
  if (fh) { if (!fl) { fl = doc.createElement('link'); fl.id = 'fontsL'; fl.rel = 'stylesheet'; doc.head.append(fl); } if (fl.getAttribute('href') !== fh) fl.setAttribute('href', fh); }
  root.innerHTML = rebase(renderBody(S.site, page, { ed: true }), ctx.base);
  for (const z of $$('[data-zone]', root)) {
    const name = z.dataset.zone; if (name === 'header' && page.landing) continue;
    z.append(h('div', { class: 'zone-add' }, h('button', { type: 'button', 'data-add': name }, name === 'main' ? '＋ Add section' : `＋ Add ${name} layout`)));
  }
  initSite(root, { editor: true }); fixMedia(root);
  win.scrollTo(0, y); drawOverlay();
}

function drawOverlay() {
  if (!ov) return; ov.innerHTML = ''; ov.style.height = doc.documentElement.scrollHeight + 'px';
  const sel = S.sel; if (!sel) return;
  const node = sel.eid ? root.querySelector(`[data-eid="${sel.eid}"]`) : root.querySelector(`[data-sid="${sel.sid}"]`);
  if (!node) { S.sel = null; return; }
  const r = node.getBoundingClientRect(), top = r.top + win.scrollY, left = r.left + win.scrollX;
  const box = h('div', { class: 'ov-box ' + (sel.eid ? '' : 'sec'), style: { left: left + 'px', top: top + 'px', width: r.width + 'px', height: r.height + 'px' } },
    h('div', { class: 'ov-tag' }, sel.eid ? TYPE_LABEL[node.dataset.type] || 'Element' : 'Section'));
  const B = (t, title, fn, cls = '') => h('button', { type: 'button', title, 'aria-label': title, class: cls, onclick: e => { e.stopPropagation(); fn(); } }, t);
  const bar = h('div', { class: 'ov-bar' });
  // a <div>, not a <button>: Chromium does not start native drags from draggable buttons
  const drag = h('div', { role: 'button', class: 'drag', title: 'Drag to move', 'aria-label': 'Drag to move (or use the arrow buttons)', draggable: 'true' }, '⠿');
  drag.addEventListener('dragstart', e => { S.drag = sel.eid ? { kind: 'el', eid: sel.eid } : { kind: 'sec', sid: sel.sid }; e.dataTransfer.setData('text/plain', 'wf'); e.dataTransfer.effectAllowed = 'move'; });
  drag.addEventListener('dragend', () => { S.drag = null; clearDrop(); });
  bar.append(drag);
  if (sel.eid) {
    const t = node.dataset.type;
    bar.append(B('↑', 'Move up', () => moveEl(sel.eid, -1)), B('↓', 'Move down', () => moveEl(sel.eid, 1)));
    if (['image', 'card', 'video'].includes(t)) bar.append(B('🖼', 'Replace media', () => replaceMedia(sel.eid)));
    bar.append(B('⬒', 'Select section', () => select({ sid: sel.sid })), B('⧉', 'Duplicate', () => dupEl(sel.eid)), B('🗑', 'Delete', () => delEl(sel.eid), 'danger'));
  } else bar.append(B('↑', 'Move up', () => moveSec(sel.sid, -1)), B('↓', 'Move down', () => moveSec(sel.sid, 1)), B('⧉', 'Duplicate section', () => dupSec(sel.sid)), B('🗑', 'Delete section', () => delSec(sel.sid), 'danger'));
  ov.append(box); ov.append(bar);
  const bw = bar.offsetWidth || 170; let bt = top - 34; if (bt < win.scrollY + 2) bt = top + 4;
  Object.assign(bar.style, { top: bt + 'px', left: Math.max(4, Math.min(left + r.width - bw, doc.documentElement.clientWidth - bw - 4)) + 'px' });
}

function select(sel, { keepTab = false } = {}) {
  S.sel = sel; drawOverlay();
  const pt = $('#propsTab'); pt.hidden = !sel;
  if (sel) { S.tab = 'props'; } else if (S.tab === 'props') S.tab = 'insert';
  renderTabs(); renderPanel();
}
function selectElementInDOM(node) { const secN = node.closest('.sec'); if (!secN) return null; const e = node.closest('.el'); return e ? { sid: secN.dataset.sid, eid: e.dataset.eid } : { sid: secN.dataset.sid }; }

// ------------------------------------------------------------------ mutations
function updateUndo() { $('#undo').disabled = !S.past.length; $('#redo').disabled = !S.future.length; }
function commit(coalesce = false) {
  const j = J(S.site); if (j === S.lastJson) return;
  const now = Date.now();
  if (!(coalesce && now - S.lastPush < 700)) { S.past.push(S.lastJson); if (S.past.length > 120) S.past.shift(); }
  S.lastPush = now; S.lastJson = j; S.future = [];
  persistLocal(); scheduleSync(); updateUndo(); updatePubUI(); applyBrand();
}
const changed = (coalesce = false) => { render(); commit(coalesce); };
function restore(j) { S.site = JSON.parse(j); S.site.reusable ||= []; S.site.customThemes ||= []; S.lastJson = j; if (!S.site.pages.some(p => p.id === S.pageId)) S.pageId = S.site.homeId; S.sel = null; $('#propsTab').hidden = true; if (S.tab === 'props') S.tab = 'insert'; persistLocal(); scheduleSync(); render(); renderTabs(); renderPanel(); updateUndo(); updatePubUI(); applyBrand(); }
function undo() { if (!S.past.length) return; S.future.push(S.lastJson); restore(S.past.pop()); }
function redo() { if (!S.future.length) return; S.past.push(S.lastJson); restore(S.future.pop()); }
$('#undo').onclick = undo; $('#redo').onclick = redo;

function moveEl(eid, d) { const f = findEl(eid); if (!f) return; const j = f.i + d; if (j < 0 || j >= f.sec.items.length) return; [f.sec.items[f.i], f.sec.items[j]] = [f.sec.items[j], f.sec.items[f.i]]; changed(); }
function moveSec(sid, d) { const f = findSec(sid); if (!f) return; const j = f.i + d; if (j < 0 || j >= f.arr.length) return; [f.arr[f.i], f.arr[j]] = [f.arr[j], f.arr[f.i]]; changed(); }
function dupEl(eid) { const f = findEl(eid); if (!f) return; const c = clone(f.e); f.sec.items.splice(f.i + 1, 0, c); changed(); select({ sid: f.sec.id, eid: c.id }); }
function dupSec(sid) { const f = findSec(sid); if (!f) return; const c = clone(f.s, true); f.arr.splice(f.i + 1, 0, c); changed(); select({ sid: c.id }); }
function delEl(eid) { const f = findEl(eid); if (!f) return; f.sec.items.splice(f.i, 1); select(null); changed(); toast('Element deleted — press Undo to bring it back'); }
function delSec(sid) { const f = findSec(sid); if (!f) return; f.arr.splice(f.i, 1); select(null); changed(); toast('Section deleted — press Undo to bring it back'); }
async function replaceMedia(eid) { const f = findEl(eid); if (!f) return; const u = await pickMedia(f.e.type === 'video' ? 'video' : 'image'); if (!u) return; setPath(f.e, f.e.type === 'card' ? 'props.image' : 'props.src', u); changed(); renderPanel(); }

// ------------------------------------------------------------------ inserting
function targetSectionForElement() {
  if (S.sel?.sid) { const f = findSec(S.sel.sid); if (f) return { f, idx: S.sel.eid ? f.s.items.findIndex(e => e.id === S.sel.eid) + 1 : f.s.items.length }; }
  const arr = zoneArr('main'); if (arr.length) { const s = arr[arr.length - 1]; return { f: { zone: 'main', arr, i: arr.length - 1, s }, idx: s.items.length }; }
  return null;
}
function insertElement(el) {
  const t = targetSectionForElement();
  if (t) { t.f.s.items.splice(t.idx, 0, el); changed(); select({ sid: t.f.s.id, eid: el.id }); }
  else { const s = mkSec([el], { cols: 1 }); curPage().sections.push(s); changed(); select({ sid: s.id, eid: el.id }); }
  scrollToSel();
}
function insertSection(section, kind) {
  let zone = kind === 'header' ? 'header' : kind === 'footer' ? 'footer' : 'main', arr = zoneArr(zone), at = arr.length;
  if (zone === 'main' && S.sel?.sid) { const f = findSec(S.sel.sid); if (f && f.zone === 'main') at = f.i + 1; }
  if (zone !== 'main') { arr.length = 0; at = 0; toast((zone === 'header' ? 'Header' : 'Footer') + ' replaced — press Undo to restore the old one'); }
  arr.splice(at, 0, section); changed(); select({ sid: section.id }); scrollToSel();
}
function scrollToSel() { setTimeout(() => { const n = S.sel && root.querySelector(S.sel.eid ? `[data-eid="${S.sel.eid}"]` : `[data-sid="${S.sel.sid}"]`); n?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 60); }
const BASIC = [['text', 'Text box', '▭'], ['heading', 'Heading', 'H'], ['paragraph', 'Paragraph', '¶'], ['image', 'Image', '🖼'], ['video', 'Video', '▶'], ['button', 'Button', '⬭'], ['hyperlink', 'Hyperlink', '🔗'], ['divider', 'Divider', '—'], ['spacer', 'Spacer', '↕'], ['embed', 'Embed', '⧉']];
const MORE = [['gallery', 'Image gallery', '▦'], ['carousel', 'Slider / carousel', '⇄'], ['card', 'Card / product', '🛍'], ['faq', 'FAQ list', '❓'], ['form', 'Contact form', '✉'], ['stat', 'Stat number', '#'], ['logo', 'Logo', '◎'], ['nav', 'Navigation menu', '☰'], ['payresult', 'Payment result', '✅']];
function makeElement(type) {
  if (type === 'paragraph') return newEl('text');
  if (type === 'text') { const e = newEl('text'); e.style = { bg: 'var(--glass)', pad: 20, radius: 16 }; return e; }
  return newEl(type);
}

// ------------------------------------------------------------------ canvas events
function isEditing(t) { return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))); }
function attachCanvasEvents() {
  const d = doc;
  d.addEventListener('click', e => {
    if (e.target.closest('#ov')) return;
    const add = e.target.closest('[data-add]'); if (add) { e.preventDefault(); S.addZone = add.dataset.add; S.tab = 'insert'; select(null); toast('Choose a layout in the Insert tab (or drag one in)'); return; }
    if (e.target.closest('a,button,summary')) e.preventDefault();
    const sel = selectElementInDOM(e.target); select(sel);
  });
  d.addEventListener('dblclick', e => { const el = e.target.closest('.el'); if (el && ['image', 'video'].includes(el.dataset.type)) replaceMedia(el.dataset.eid); });
  d.addEventListener('input', e => { const f = e.target.closest?.('[data-f]'); if (f) fieldInput(f, false); });
  d.addEventListener('focusout', e => { const f = e.target.closest?.('[data-f]'); if (f) { fieldInput(f, true); setTimeout(() => { if (!doc.activeElement?.closest?.('[data-rich]') && !$('#rtb')?.contains(document.activeElement)) hideRtb(); }, 120); } });
  d.addEventListener('focusin', e => { const f = e.target.closest?.('[data-rich]'); if (f) showRtb(f); });
  d.addEventListener('keydown', e => {
    const f = e.target.closest?.('[data-f]');
    if (f && !f.dataset.rich && e.key === 'Enter') { e.preventDefault(); f.blur(); return; }
    globalKeys(e, true);
  });
  d.addEventListener('paste', e => { const f = e.target.closest?.('[data-f]'); if (!f) return; e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); d.execCommand('insertText', false, f.dataset.rich ? t : t.replace(/\n+/g, ' ')); });
  d.addEventListener('selectionchange', () => updateRtbState());
  d.addEventListener('scroll', () => { if (S.rtField) placeRtb(); }, true);
  d.addEventListener('dragover', e => { if (!S.drag && !hasFiles(e)) return; e.preventDefault(); S.drop = computeDrop(e); drawDrop(S.drop); autoScroll(e); });
  d.addEventListener('drop', e => { e.preventDefault(); handleDrop(e); });
  d.addEventListener('dragleave', e => { if (!e.relatedTarget) clearDrop(); });
}
function fieldInput(f, final) {
  const elN = f.closest('.el'); if (!elN) return; const found = findEl(elN.dataset.eid); if (!found) return;
  let v = f.dataset.rich ? f.innerHTML : f.textContent;
  if (f.dataset.rich) { if (/^(<br>|<p><br><\/p>|<div><br><\/div>)?$/.test(v)) v = ''; if (final) v = sanitizeHTML(v); }
  if (getPath(found.e, f.dataset.f) === v) return;
  setPath(found.e, f.dataset.f, v); commit(true);
}
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
function globalKeys(e, inFrame) {
  const mod = e.ctrlKey || e.metaKey, ed = isEditing(e.target);
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); syncDraft(true); return; }
  if (mod && !ed && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && !ed && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (ed) return;
  if (e.key === 'Escape') select(null);
  else if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel) { e.preventDefault(); S.sel.eid ? delEl(S.sel.eid) : delSec(S.sel.sid); }
  else if (mod && e.key.toLowerCase() === 'd' && S.sel) { e.preventDefault(); S.sel.eid ? dupEl(S.sel.eid) : dupSec(S.sel.sid); }
}
document.addEventListener('keydown', e => globalKeys(e, false));

// ------------------------------------------------------------------ drag & drop
function computeDrop(e) {
  const t = e.target, elN = t.closest?.('.el'), secN = t.closest?.('.sec'), k = S.drag?.kind;
  if (k === 'block' || k === 'sec' || k === 'reuse') {
    if (secN) { const r = secN.getBoundingClientRect(); return { mode: 'sec', sid: secN.dataset.sid, before: e.clientY < r.top + r.height / 2, rect: r }; }
    const z = t.closest?.('[data-zone]'); return { mode: 'zone', zone: z?.dataset.zone || 'main', rect: z?.getBoundingClientRect() };
  }
  if (elN && secN && elN.dataset.eid !== S.drag?.eid) {
    const r = elN.getBoundingClientRect(), cols = +secN.dataset.cols, span = +elN.dataset.span, horiz = cols > 1 && span < cols;
    return { mode: 'el', eid: elN.dataset.eid, horiz, before: horiz ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2, rect: r };
  }
  if (secN) return { mode: 'secend', sid: secN.dataset.sid, rect: secN.getBoundingClientRect() };
  const z = t.closest?.('[data-zone]'); return { mode: 'zone', zone: z?.dataset.zone || 'main', rect: z?.getBoundingClientRect() };
}
function clearDrop() { S.drop = null; ov?.querySelectorAll('.ov-drop,.ov-dropzone').forEach(n => n.remove()); }
function drawDrop(t) {
  ov.querySelectorAll('.ov-drop,.ov-dropzone').forEach(n => n.remove()); if (!t?.rect) return;
  const r = t.rect, sy = win.scrollY, sx = win.scrollX;
  if (t.mode === 'el') ov.append(h('div', { class: 'ov-drop', style: t.horiz ? { left: (t.before ? r.left : r.right) + sx - 2 + 'px', top: r.top + sy + 'px', width: '4px', height: r.height + 'px' } : { left: r.left + sx + 'px', top: (t.before ? r.top : r.bottom) + sy - 2 + 'px', width: r.width + 'px', height: '4px' } }));
  else if (t.mode === 'sec') ov.append(h('div', { class: 'ov-drop', style: { left: sx + 'px', top: (t.before ? r.top : r.bottom) + sy - 2 + 'px', width: doc.documentElement.clientWidth + 'px', height: '4px' } }));
  else ov.append(h('div', { class: 'ov-dropzone', style: { left: r.left + sx + 'px', top: r.top + sy + 'px', width: r.width + 'px', height: Math.max(r.height, 40) + 'px' } }));
}
function autoScroll(e) { const H = win.innerHeight; if (e.clientY < 70) win.scrollBy(0, -18); else if (e.clientY > H - 70) win.scrollBy(0, 18); }
function placeElement(el, t) {
  if (t.mode === 'el') { const f = findEl(t.eid); if (!f) return false; f.sec.items.splice(f.i + (t.before ? 0 : 1), 0, el); return f.sec.id; }
  if (t.mode === 'secend') { const f = findSec(t.sid); if (!f) return false; f.s.items.push(el); return f.s.id; }
  const s = mkSec([el], { cols: 1 }); zoneArr(t.zone).push(s); return s.id;
}
async function handleDrop(e) {
  const t = S.drop, drag = S.drag; clearDrop(); S.drag = null; if (!t) return;
  if (!drag && hasFiles(e)) { // files dropped from the computer
    const { uploadFile } = await import('./ui.js'); const imgs = [...e.dataTransfer.files];
    for (const f of imgs) { try { const u = await uploadFile(f); const el = newEl(/^video/.test(f.type) ? 'video' : 'image'); el.props.src = u.url; if (el.type === 'image') el.props.alt = f.name.replace(/\.[^.]+$/, ''); placeElement(el, t); } catch {} }
    return changed();
  }
  if (!drag) return;
  if (drag.kind === 'el' || drag.kind === 'new') {
    let el;
    if (drag.kind === 'el') { const f = findEl(drag.eid); if (!f) return; if (t.mode === 'el' && t.eid === drag.eid) return; el = f.e; f.sec.items.splice(f.i, 1); } else el = makeElement(drag.type);
    const sid = placeElement(el, t); changed(); select({ sid, eid: el.id }); return;
  }
  let section;
  if (drag.kind === 'sec') { const f = findSec(drag.sid); if (!f) return; if (t.mode === 'sec' && t.sid === drag.sid) return; section = f.s; f.arr.splice(f.i, 1); }
  else if (drag.kind === 'block') section = BLOCKS.find(b => b.id === drag.id).make();
  else section = clone(S.site.reusable.find(r => r.id === drag.id).section, true);
  const kind = drag.kind === 'block' && ['header', 'footer'].includes(drag.id) ? drag.id : null;
  if (kind) return insertSection(section, kind);
  if (t.mode === 'sec') { const f = findSec(t.sid); f.arr.splice(f.i + (t.before ? 0 : 1), 0, section); } else zoneArr(t.zone === 'main' || !t.zone ? 'main' : t.zone).push(section);
  changed(); select({ sid: section.id });
}

// ------------------------------------------------------------------ rich-text toolbar (floating, appears when a text field is active)
let rtb, savedRange = null;
function buildRtb() {
  if (rtb) return rtb;
  const cmd = (c, v) => { const dd = doc; dd.execCommand('styleWithCSS', false, true); dd.execCommand(c, false, v); syncRt(); };
  const btn = (t, title, fn, cls = '') => h('button', { type: 'button', title, 'aria-label': title, class: cls, onmousedown: e => e.preventDefault(), onclick: fn }, t);
  const sel = (opts, title, fn) => { const s = h('select', { title, 'aria-label': title, onchange: () => { fn(s.value); s.value = ''; } }, h('option', { value: '' }, title), opts.map(([v, l]) => h('option', { value: v }, l))); return s; };
  const color = (icon, title, fn) => { const i = h('input', { type: 'color', value: '#8b5cf6', 'aria-label': title }); i.addEventListener('mousedown', saveSel); i.oninput = () => { restoreSel(); fn(i.value); }; return h('label', { class: 'c', title }, icon, i); };
  const size = h('input', { type: 'number', min: 8, max: 160, placeholder: 'px', title: 'Font size (px)', 'aria-label': 'Font size in pixels' });
  size.addEventListener('mousedown', saveSel); size.onchange = () => { restoreSel(); applySize(+size.value); };
  rtb = h('div', { id: 'rtb', role: 'toolbar', 'aria-label': 'Text formatting', hidden: true },
    sel([['p', 'Paragraph'], ['h1', 'Heading 1'], ['h2', 'Heading 2'], ['h3', 'Heading 3'], ['h4', 'Heading 4'], ['blockquote', 'Quote']], 'Style', v => cmd('formatBlock', v)),
    sel(FONT_LIST.filter(f => f !== 'System').map(f => [f, f]), 'Font', v => cmd('fontName', v)), size,
    h('span', { class: 'sep' }), btn('B', 'Bold (Ctrl+B)', () => cmd('bold'), 'b'), btn('I', 'Italic (Ctrl+I)', () => cmd('italic'), 'i'), btn('U', 'Underline (Ctrl+U)', () => cmd('underline'), 'u'), btn('S', 'Strikethrough', () => cmd('strikeThrough'), 's'),
    color('A', 'Text colour', v => cmd('foreColor', v)), color('🖍', 'Highlight colour', v => cmd('hiliteColor', v)),
    h('span', { class: 'sep' }), btn('⟸', 'Align left', () => cmd('justifyLeft')), btn('↔', 'Align centre', () => cmd('justifyCenter')), btn('⟹', 'Align right', () => cmd('justifyRight')), btn('☰', 'Justify', () => cmd('justifyFull')),
    h('span', { class: 'sep' }), btn('• ≡', 'Bulleted list', () => cmd('insertUnorderedList')), btn('1. ≡', 'Numbered list', () => cmd('insertOrderedList')), btn('→', 'Indent', () => indent(32)), btn('←', 'Outdent', () => indent(-32)),
    h('span', { class: 'sep' }), btn('🔗', 'Add or edit link', linkDialog), btn('⛓︎', 'Remove link', () => cmd('unlink')), btn('Tx', 'Clear formatting', () => cmd('removeFormat')));
  document.body.append(rtb); return rtb;
}
function syncRt() { if (S.rtField) fieldInput(S.rtField, false); }
function saveSel() { const s = win.getSelection(); if (s.rangeCount) savedRange = s.getRangeAt(0).cloneRange(); }
function restoreSel() { if (!savedRange) return; S.rtField?.focus(); const s = win.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
function showRtb(field) { buildRtb(); S.rtField = field; rtb.hidden = false; placeRtb(); updateRtbState(); }
function hideRtb() { if (rtb) rtb.hidden = true; S.rtField = null; }
function placeRtb() {
  if (!rtb || !S.rtField) return; const fr = frame.getBoundingClientRect(), r = S.rtField.getBoundingClientRect();
  const bw = rtb.offsetWidth, bh = rtb.offsetHeight; let top = fr.top + r.top - bh - 8; if (top < fr.top + 4) top = Math.min(fr.top + r.bottom + 8, window.innerHeight - bh - 8);
  rtb.style.top = Math.max(4, top) + 'px'; rtb.style.left = Math.max(4, Math.min(fr.left + r.left, window.innerWidth - bw - 8)) + 'px';
}
function updateRtbState() {
  if (!rtb || rtb.hidden || !S.rtField) return;
  const q = c => { try { return doc.queryCommandState(c); } catch { return false; } };
  rtb.querySelector('.b')?.classList.toggle('on', q('bold')); rtb.querySelector('.i')?.classList.toggle('on', q('italic')); rtb.querySelector('.u')?.classList.toggle('on', q('underline')); rtb.querySelector('.s')?.classList.toggle('on', q('strikeThrough'));
  placeRtb();
}
function applySize(px) {
  if (!px) return; doc.execCommand('styleWithCSS', false, true); doc.execCommand('fontSize', false, '7');
  S.rtField.querySelectorAll('font[size="7"],span[style*="xxx-large"],span[style*="-webkit-xxx-large"]').forEach(n => { n.removeAttribute('size'); n.style.fontSize = px + 'px'; if (n.tagName === 'FONT') { const sp = doc.createElement('span'); sp.style.cssText = n.style.cssText; sp.innerHTML = n.innerHTML; n.replaceWith(sp); } });
  syncRt();
}
function indent(delta) {
  const s = win.getSelection(); if (!s.rangeCount) return; let n = s.anchorNode; n = n.nodeType === 3 ? n.parentNode : n;
  while (n && n.parentNode !== S.rtField) n = n.parentNode;
  if (!n || n === S.rtField) { S.rtField.innerHTML = `<div>${S.rtField.innerHTML}</div>`; n = S.rtField.firstChild; }
  const cur = parseInt(n.style.paddingLeft || '0', 10) || 0; n.style.paddingLeft = Math.max(0, cur + delta) + 'px'; syncRt();
}
function linkDialog() {
  saveSel(); const s = win.getSelection(); let a = s.anchorNode; a = a && (a.nodeType === 3 ? a.parentNode : a).closest?.('a');
  const cur = a?.getAttribute('href') || '', pages = S.site.pages;
  const type = h('select', { class: 'inp' }, h('option', { value: '' }, 'Web address / email / phone'), pages.map(p => h('option', { value: 'page:' + p.id, selected: cur === 'page:' + p.id }, 'Page: ' + p.title)));
  const url = h('input', { class: 'inp', value: cur.startsWith('page:') ? '' : cur, placeholder: 'https://…  mailto:…  tel:…  #section', disabled: cur.startsWith('page:') });
  const tab = h('input', { type: 'checkbox', checked: a?.getAttribute('target') === '_blank' });
  type.onchange = () => { url.disabled = !!type.value; if (!type.value) url.focus(); };
  const m = modal(a ? 'Edit link' : 'Add link', h('div', {}, h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Link to'), type), h('label', { class: 'f' }, h('span', { class: 'fl' }, 'URL'), url), h('label', { class: 'f-bool' }, tab, h('span', {}, 'Open in a new tab'))), {
    buttons: [a ? { label: 'Remove link', kind: 'danger', onclick: () => { restoreSel(); doc.execCommand('unlink'); syncRt(); } } : null, { label: 'Cancel' }, { label: 'Apply', kind: 'primary', onclick: () => {
      const href = type.value || url.value.trim(); if (!href) return false; restoreSel();
      if (win.getSelection().isCollapsed && !a) doc.execCommand('insertHTML', false, `<a href="#wf-tmp">${href.replace(/[<>&"]/g, '')}</a>`); else doc.execCommand('createLink', false, '#wf-tmp');
      S.rtField.querySelectorAll('a[href="#wf-tmp"]').forEach(n => { n.setAttribute('href', href); tab.checked ? n.setAttribute('target', '_blank') : n.removeAttribute('target'); });
      if (a) { a.setAttribute('href', href); tab.checked ? a.setAttribute('target', '_blank') : a.removeAttribute('target'); }
      syncRt(); } }].filter(Boolean) });
}

// ------------------------------------------------------------------ side panel
function renderTabs() { $$('#tabs button').forEach(b => { b.classList.toggle('on', b.dataset.tab === S.tab); b.setAttribute('aria-selected', b.dataset.tab === S.tab); }); }
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.tab = b.dataset.tab; renderTabs(); renderPanel(); });
function renderPanel() {
  const p = $('#panel'), top = p.scrollTop; p.innerHTML = '';
  ({ insert: panelInsert, pages: panelPages, themes: panelThemes, props: panelProps }[S.tab] || panelInsert)(p);
  p.scrollTop = top;
}
const dragTile = (cls, icon, label, drag, click) => { const t = h('div', { class: 'tile ' + cls, draggable: 'true', tabindex: '0', role: 'button', title: 'Click to add, or drag onto the page', onclick: click, onkeydown: e => { if (e.key === 'Enter') click(); } }, h('b', {}, icon), h('span', {}, label)); t.addEventListener('dragstart', e => { S.drag = drag; e.dataTransfer.setData('text/plain', 'wf'); e.dataTransfer.effectAllowed = 'copy'; }); t.addEventListener('dragend', () => { S.drag = null; clearDrop(); }); return t; };

function panelInsert(p) {
  p.append(h('p', { class: 'note' }, 'Click to add at the selected spot, or drag onto the page.'));
  p.append(h('div', { class: 'sub' }, 'Basic elements'), h('div', { class: 'grid2' }, BASIC.map(([t, l, i]) => dragTile('', i, l, { kind: 'new', type: t }, () => insertElement(makeElement(t))))));
  p.append(h('div', { class: 'sub' }, 'Content blocks & layouts'), h('div', { class: 'list' }, BLOCKS.map(b => dragTile('wide', b.icon, b.name, { kind: 'block', id: b.id }, () => insertSection(b.make(), b.id)))));
  p.append(h('div', { class: 'sub' }, 'More components'), h('div', { class: 'grid2' }, MORE.map(([t, l, i]) => dragTile('', i, l, { kind: 'new', type: t }, () => insertElement(makeElement(t))))));
  p.append(h('div', { class: 'sub' }, 'My reusable blocks'));
  const rb = S.site.reusable;
  if (!rb.length) p.append(h('p', { class: 'note' }, 'Select any section, then choose “Save as reusable block” in Properties. It will appear here for use on any page.'));
  else p.append(h('div', { class: 'list' }, rb.map(r => h('div', { class: 'pgrow' }, dragTile('wide', '♻', r.name, { kind: 'reuse', id: r.id }, () => insertSection(clone(r.section, true))).cloneNode(false) && h('div', { class: 'nm', onclick: () => insertSection(clone(r.section, true)), title: 'Click to insert' }, '♻ ' + r.name), h('button', { class: 'mini', title: 'Delete', onclick: () => { rb.splice(rb.indexOf(r), 1); commit(); renderPanel(); } }, '🗑')))));
}

// ---- pages
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'page';
function uniqueSlug(slug, parent, skipId) { let s = slug, n = 2; const sibs = S.site.pages.filter(p => p.id !== skipId && (p.parent || '') === (parent || '')); while (sibs.some(p => p.slug === s)) s = slug + '-' + n++; return s; }
function pageRows() { const pages = S.site.pages, out = []; const walk = (parent, depth) => pages.filter(p => (p.parent || '') === parent && p.id !== S.site.homeId || (parent === '' && p.id === S.site.homeId && depth === 0 && false)).forEach(p => { out.push([p, depth]); walk(p.id, depth + 1); }); const home = pages.find(p => p.id === S.site.homeId); out.push([home, 0]); walk('', 0); return out.filter(([p], i, a) => a.findIndex(x => x[0] === p) === i); }
function panelPages(p) {
  p.append(h('div', { class: 'ph' }, h('h3', {}, 'Pages'), h('span', { class: 'sp' }), h('button', { class: 'btn primary sm', onclick: newPageDialog }, '＋ New page')));
  for (const [pg, depth] of pageRows()) {
    const sibs = S.site.pages.filter(x => (x.parent || '') === (pg.parent || '')), isHome = pg.id === S.site.homeId;
    p.append(h('div', { class: 'pgrow' + (pg.id === S.pageId ? ' on' : '') + (pg.visible === false ? ' hid' : ''), style: { marginLeft: depth * 16 + 'px' }, onclick: () => switchPage(pg.id) },
      h('div', { class: 'nm' }, (isHome ? '🏠 ' : pg.landing ? '🚀 ' : '') + pg.title, h('br'), h('small', {}, pagePath(S.site, pg))),
      pg.visible === false ? h('span', { class: 'tag' }, 'hidden') : null, pg.inNav ? h('span', { class: 'tag' }, 'menu') : null,
      h('button', { class: 'mini', title: 'Page settings', onclick: e => { e.stopPropagation(); pageSettings(pg); } }, '⚙'),
      h('button', { class: 'mini', title: 'Move up', onclick: e => { e.stopPropagation(); movePage(pg, -1); } }, '↑'), h('button', { class: 'mini', title: 'Move down', onclick: e => { e.stopPropagation(); movePage(pg, 1); } }, '↓'),
      h('button', { class: 'mini', title: 'Duplicate', onclick: e => { e.stopPropagation(); dupPage(pg); } }, '⧉'),
      isHome ? null : h('button', { class: 'mini', title: 'Delete', onclick: e => { e.stopPropagation(); delPage(pg); } }, '🗑')));
  }
  p.append(h('p', { class: 'note', style: { marginTop: '12px' } }, 'Pages marked “menu” appear in the header navigation (nested pages become a drop-down). Hidden pages are not published. New pages are published at their own URL automatically.'));
}
function switchPage(id) { S.pageId = id; S.sel = null; $('#propsTab').hidden = true; if (S.tab === 'props') S.tab = 'pages'; win.scrollTo(0, 0); render(); renderTabs(); renderPanel(); }
function movePage(pg, d) {
  const arr = S.site.pages, sibs = arr.filter(x => (x.parent || '') === (pg.parent || '')), i = sibs.indexOf(pg), o = sibs[i + d]; if (!o) return;
  const a = arr.indexOf(pg), b = arr.indexOf(o); [arr[a], arr[b]] = [arr[b], arr[a]]; commit(); renderPanel(); render();
}
function newPageDialog() {
  const title = h('input', { class: 'inp', value: 'New page' }), tpl = h('select', { class: 'inp' }, Object.entries(PAGE_TEMPLATES).map(([k, v]) => h('option', { value: k }, v.name)));
  const par = h('select', { class: 'inp' }, h('option', { value: '' }, '— none (top level) —'), S.site.pages.map(x => h('option', { value: x.id }, x.title)));
  modal('New page', h('div', {}, h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Page name'), title), h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Start from'), tpl), h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Parent page (for nested pages)'), par)), { buttons: [{ label: 'Cancel' }, { label: 'Create page', kind: 'primary', onclick: () => {
    const name = title.value.trim(); if (!name) return false; const t = PAGE_TEMPLATES[tpl.value];
    const pg = { id: uid('p'), title: name, slug: uniqueSlug(slugify(name), par.value), navLabel: name, inNav: !t.landing, visible: true, parent: par.value, landing: !!t.landing, seo: { title: '', description: '' }, sections: t.make() };
    S.site.pages.push(pg); S.pageId = pg.id; commit(); S.sel = null; render(); renderPanel(); toast('Page created — start editing it now'); } }] });
}
function dupPage(pg) { const c = JSON.parse(JSON.stringify(pg)); c.id = uid('p'); c.title += ' (copy)'; c.navLabel = c.title; c.slug = uniqueSlug(pg.slug + '-copy', pg.parent, c.id); c.inNav = false; c.sections.forEach(s => { s.id = uid('s'); s.items.forEach(e => { e.id = uid('e'); }); }); S.site.pages.splice(S.site.pages.indexOf(pg) + 1, 0, c); commit(); S.pageId = c.id; render(); renderPanel(); }
async function delPage(pg) {
  if (!(await confirmDlg('Delete page', `Delete “${pg.title}”? Links to it will point to the home page. You can undo this right after.`, 'Delete page', true))) return;
  S.site.pages.forEach(x => { if (x.parent === pg.id) x.parent = pg.parent || ''; }); S.site.pages.splice(S.site.pages.indexOf(pg), 1);
  const fix = o => { for (const k in o) { if (o[k] === 'page:' + pg.id) o[k] = '/'; else if (typeof o[k] === 'string') o[k] = o[k].replace(new RegExp(`href="page:${pg.id}"`, 'g'), 'href="/"'); else if (o[k] && typeof o[k] === 'object') fix(o[k]); } }; fix(S.site);
  if (S.site.settings.privacyPageId === pg.id) S.site.settings.privacyPageId = '';
  if (S.pageId === pg.id) S.pageId = S.site.homeId; commit(); S.sel = null; render(); renderPanel();
}
function pageSettings(pg) {
  const o = { title: pg.title, slug: pg.slug, navLabel: pg.navLabel, inNav: !!pg.inNav, visible: pg.visible !== false, landing: !!pg.landing, noindex: !!pg.noindex, parent: pg.parent || '', seo: { title: pg.seo?.title || '', description: pg.seo?.description || '' } };
  const isHome = pg.id === S.site.homeId, parents = S.site.pages.filter(x => x.id !== pg.id && !isDescendant(x, pg.id));
  const body = h('div', {}, [
    fld({ t: 'text', k: 'title', l: 'Page name' }, o), ...(isHome ? [h('p', { class: 'note' }, 'The home page always lives at the site root “/”.')] : [fld({ t: 'text', k: 'slug', l: 'URL slug (e.g. “about-us”)' }, o), fld({ t: 'sel', k: 'parent', l: 'Parent page', o: [['', '— none —'], ...parents.map(x => [x.id, x.title])] }, o)]),
    fld({ t: 'text', k: 'navLabel', l: 'Menu label' }, o), fld({ t: 'bool', k: 'inNav', l: 'Show in navigation menu' }, o), fld({ t: 'bool', k: 'visible', l: 'Published (untick to hide this page from the live site)' }, o),
    fld({ t: 'bool', k: 'landing', l: 'Standalone landing page (no header/footer)' }, o), h('div', { class: 'sub' }, 'Search engines'), fld({ t: 'text', k: 'seo.title', l: 'SEO title', max: 90 }, o), fld({ t: 'area', k: 'seo.description', l: 'Meta description', rows: 3 }, o), fld({ t: 'bool', k: 'noindex', l: 'Hide from search engines' }, o)]);
  modal('Page settings — ' + pg.title, body, { buttons: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onclick: () => {
    if (!o.title.trim()) { toast('Page name is required', 'err'); return false; }
    if (!isHome) { o.slug = slugify(o.slug || o.title); const t = { ...pg, slug: o.slug, parent: o.parent }; const copy = { ...S.site, pages: S.site.pages.map(x => (x.id === pg.id ? t : x)) }; try { validateSite(copy); } catch (e) { toast(e.message, 'err', 5000); return false; } }
    Object.assign(pg, { title: o.title.trim(), navLabel: o.navLabel || o.title, inNav: o.inNav, visible: o.visible, landing: o.landing, noindex: o.noindex, seo: o.seo }); if (!isHome) Object.assign(pg, { slug: o.slug, parent: o.parent });
    commit(); render(); renderPanel(); } }] });
}
function isDescendant(page, ancestorId) { let c = page, g = 0; while (c && g++ < 8) { if (c.parent === ancestorId) return true; c = S.site.pages.find(x => x.id === c.parent); } return false; }

// ---- themes
function panelThemes(p) {
  p.append(h('div', { class: 'ph' }, h('h3', {}, 'Themes')), h('div', { class: 'presets' }, [...Object.entries(THEMES).map(([k, t]) => [k, t.name, t.v]), ...S.site.customThemes.map((t, i) => ['c' + i, t.name, t.v, i])].map(([k, name, v, ci]) => {
    const b = h('button', { class: 'preset', onclick: () => { S.site.theme = { ...v, preset: k }; changed(); renderPanel(); } }, h('strong', {}, name), h('div', { class: 'sw' }, [v.bg, v.primary, v.secondary, v.accent, v.text].map(c => h('i', { style: { background: c } }))));
    return ci !== undefined ? h('div', { style: { position: 'relative' } }, b, h('button', { class: 'mini', style: { position: 'absolute', right: '4px', top: '4px' }, title: 'Delete preset', onclick: () => { S.site.customThemes.splice(ci, 1); commit(); renderPanel(); } }, '✕')) : b;
  })));
  p.append(h('button', { class: 'btn sm', style: { margin: '10px 0 4px' }, onclick: async () => { const n = await promptDlg('Save custom theme', 'Theme name', 'My brand theme'); if (!n) return; const { preset, ...v } = S.site.theme; S.site.customThemes.push({ name: n, v: JSON.parse(JSON.stringify(v)) }); commit(); renderPanel(); toast('Theme saved'); } }, '💾 Save current as custom theme'));
  p.append(h('p', { class: 'note' }, 'Theme changes apply to the whole website. Anything you styled individually on an element keeps its own override. Layouts adapt at two fixed breakpoints (tablet ≤ 980px, mobile ≤ 700px).'));
  for (const [title, defs] of THEME_FIELDS) p.append(h('details', { class: 'acc', open: title === 'Colours' }, h('summary', {}, title), h('div', {}, defs.map(d => fld(d, S.site.theme, (k, v, m) => { S.site.theme.preset = 'custom'; renderSoon(); commit(m.live); })))));
}

// ---- properties
function panelProps(p) {
  const sel = S.sel; if (!sel) { p.append(h('p', { class: 'note' }, 'Select something on the page to edit its properties.')); return; }
  const f = sel.eid ? findEl(sel.eid) : null, sf = findSec(sel.sid); if (!sf) return;
  const cb = (k, v, m) => { if (m.def?.redraw || m.structural) { renderPanel(); } renderSoon(); commit(m.live); };
  p.append(h('div', { class: 'crumbs' }, h('button', { onclick: () => select({ sid: sel.sid }) }, 'Section'), f ? ['›', h('span', {}, TYPE_LABEL[f.e.type] || 'Element')] : null));
  if (f) {
    const e = f.e;
    p.append(h('div', { class: 'ptabs' }, ['content', 'style', 'advanced'].map(t => h('button', { class: S.ptab === t ? 'on' : '', onclick: () => { S.ptab = t; renderPanel(); } }, { content: 'Content', style: 'Style', advanced: 'Motion & layout' }[t]))));
    if (S.ptab === 'content') {
      contentFields(e, S.site).forEach(d => p.append(fld(d, e, cb)));
      if (e.type === 'logo') { p.append(h('div', { class: 'sub' }, 'Brand logo (shared)')); logoFields().forEach(d => p.append(fld(d, S.site.settings, (k, v, m) => { renderSoon(); commit(m.live); }))); }
      if (e.type === 'nav') { p.append(h('div', { class: 'sub' }, 'Extra menu links')); p.append(fld({ t: 'list', k: 'navExtra', l: '', addLabel: 'Add link', blank: () => ({ label: 'Link', href: '', newTab: false }), title: r => r.label, item: [{ t: 'text', k: 'label', l: 'Label' }, { t: 'link', k: 'href', l: 'Link' }, { t: 'bool', k: 'newTab', l: 'New tab' }] }, S.site.settings, (k, v, m) => { renderSoon(); commit(false); })); }
    } else if (S.ptab === 'style') styleFields(e).forEach(d => p.append(fld(d, e, cb)));
    else advancedFields(e).forEach(d => p.append(fld(d, e, cb)));
  } else {
    const s = sf.s; s.props ||= {}; s.props.bg ||= {};
    sectionFields(s).forEach(d => p.append(fld(d, s, cb)));
    const hide = (s.props.hideOn ||= []);
    p.append(h('div', { class: 'hidegrp' }, [['d', 'Desktop'], ['t', 'Tablet'], ['m', 'Mobile']].map(([k, l]) => h('label', {}, h('input', { type: 'checkbox', checked: hide.includes(k), onchange: ev => { ev.target.checked ? hide.push(k) : hide.splice(hide.indexOf(k), 1); renderSoon(); commit(); } }), l))));
    p.append(h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      h('button', { class: 'btn sm', onclick: async () => { const n = await promptDlg('Save as reusable block', 'Block name', 'My block'); if (!n) return; S.site.reusable.push({ id: uid('r'), name: n, section: clone(s, true) }); commit(); toast('Saved. Find it under Insert → My reusable blocks'); } }, '♻ Save as reusable block'),
      h('button', { class: 'btn sm', onclick: () => dupSec(s.id) }, '⧉ Duplicate'), h('button', { class: 'btn sm danger', onclick: () => delSec(s.id) }, '🗑 Delete')));
  }
}
const logoFields = () => [{ t: 'img', k: 'logo', l: 'Logo (desktop)' }, { t: 'img', k: 'logoMobile', l: 'Logo (mobile, optional)' }, { t: 'range', k: 'logoH', l: 'Height — desktop (px)', min: 16, max: 120, def: 40, clear: false }, { t: 'range', k: 'logoHM', l: 'Height — mobile (px)', min: 16, max: 100, def: 32, clear: false }, { t: 'text', k: 'name', l: 'Brand name (shown when there is no logo)' }];

// ------------------------------------------------------------------ saving to GitHub (draft) 
const siteUrl = () => (S.cfg.cname ? `https://${S.cfg.cname}/` : `https://${S.gh.owner.toLowerCase()}.github.io${S.gh.repo.toLowerCase() === S.gh.owner.toLowerCase() + '.github.io' ? '' : '/' + S.gh.repo}/`);
function setChip(t, kind = '') { const c = $('#saveChip'); c.textContent = t; c.className = 'chip ' + kind; }
function showBanner(html, kind = '', action) { const b = $('#banner'); b.className = kind; b.hidden = !html; b.innerHTML = ''; if (!html) return; b.append(h('span', { html })); if (action) b.append(h('button', { class: 'btn sm', onclick: action.fn }, action.label)); }
function persistLocal() { try { localStorage.setItem(S.lk, JSON.stringify({ ts: Date.now(), text: S.lastJson, unsynced: true })); } catch {} }
function scheduleSync() { setChip('Unsaved changes', 'busy'); clearTimeout(S.syncT); S.syncT = setTimeout(() => syncDraft(), 12000); }
async function syncDraft(manual) {
  if (S.syncing) { S.again = true; return; }
  clearTimeout(S.syncT); const text = S.lastJson;
  if (text === S.remoteDraft) { setChip('All changes saved', 'ok'); if (manual) toast('Already saved to GitHub', 'ok'); return true; }
  S.syncing = true; setChip('Saving to GitHub…', 'busy');
  try {
    const r = await S.gh.putFile('content/draft.json', text, 'Save draft', S.shaDraft || undefined);
    S.shaDraft = r.sha; S.remoteDraft = text; S.syncErr = null; showBanner('');
    if (S.lastJson === text) { try { localStorage.setItem(S.lk, JSON.stringify({ ts: Date.now(), text, unsynced: false })); } catch {} }
    setChip('Saved ✓ ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 'ok'); if (manual) toast('Draft saved to GitHub', 'ok'); return true;
  } catch (e) {
    if (e.status === 409 || e.status === 422) await resolveConflict(); else { S.syncErr = e; setChip('Not saved — will retry', 'err'); showBanner('⚠ Your latest changes could not be saved to GitHub: ' + e.message + ' They are kept in this browser; do not close this tab.', 'err', { label: 'Retry now', fn: () => syncDraft(true) }); clearTimeout(S.syncT); S.syncT = setTimeout(() => syncDraft(), 20000); }
    return false;
  } finally { S.syncing = false; if (S.again) { S.again = false; if (S.lastJson !== S.remoteDraft) scheduleSync(); } }
}
async function resolveConflict() {
  const cur = await S.gh.getFile('content/draft.json');
  if (cur && cur.text === S.lastJson) { S.shaDraft = cur.sha; S.remoteDraft = cur.text; setChip('Saved ✓', 'ok'); return; }
  S.shaDraft = cur?.sha || null;
  await new Promise(res => modal('Changed elsewhere', h('p', {}, 'The saved draft on GitHub was changed from another device or tab after you opened the editor. What would you like to do?'), { onClose: res, buttons: [
    { label: 'Load their version', onclick: () => { S.remoteDraft = cur.text; restore(cur.text); S.lastJson = cur.text; S.past = []; res(); setChip('Loaded latest', 'ok'); } },
    { label: 'Overwrite with mine', kind: 'primary', onclick: async () => { res(); S.syncing = false; await syncDraft(true); } }] }));
}
window.addEventListener('beforeunload', e => { if (S.site && S.lastJson !== S.remoteDraft) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.hidden && S.site && S.lastJson !== S.remoteDraft) syncDraft(); });

// ------------------------------------------------------------------ publishing
const isDirty = () => S.lastJson !== S.publishedText;
function updatePubUI() {
  const dot = $('#pubDot'), lab = $('#pubLabel');
  if (!S.live) { dot.className = 'dot off'; lab.textContent = 'Unpublished'; }
  else if (S.run && S.run.status !== 'completed') { dot.className = 'dot draft'; lab.textContent = 'Publishing…'; }
  else if (isDirty()) { dot.className = 'dot draft'; lab.textContent = 'Publish changes'; }
  else { dot.className = 'dot live'; lab.textContent = 'Published'; }
  if (S.gh) { const a = $('#siteLink'); a.href = siteUrl(); a.textContent = siteUrl().replace(/^https:\/\//, ''); }
}
function runLine() {
  const r = S.run; if (!r) return null;
  if (r.status !== 'completed') return `⏳ ${r.status === 'queued' ? 'Waiting for GitHub to start' : 'Building and deploying'}… (about 1 minute)`;
  return r.conclusion === 'success' ? `✅ Deployed ${new Date(r.updated).toLocaleTimeString()}` : `❌ Build ${r.conclusion}. ` + 'Open the GitHub Actions log to see why.';
}
async function trackRun(commitSha) {
  S.run = { status: 'queued', commit: commitSha }; updatePubUI();
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, i < 3 ? 3000 : 5000));
    try {
      const runs = await S.gh.runs(6); const run = runs.find(r => r.head_sha === commitSha) || (i > 4 ? runs[0] : null);
      if (run) { S.run = { status: run.status, conclusion: run.conclusion, url: run.html_url, updated: run.updated_at, commit: commitSha }; updatePubUI(); if (run.status === 'completed') { toast(run.conclusion === 'success' ? 'Your website is live with the latest changes ✓' : 'Build failed — see Publish menu', run.conclusion === 'success' ? 'ok' : 'err', 6000); return; } }
    } catch (e) { S.run = { status: 'completed', conclusion: 'unknown', unknown: true }; updatePubUI(); return; }
  }
}
async function publish() {
  if (!(await syncDraft(true)) && S.lastJson !== S.remoteDraft) return toast('Draft could not be saved, so it was not published.', 'err');
  try { validateSite(S.site); } catch (e) { return toast('Cannot publish: ' + e.message, 'err', 6000); }
  setChip('Publishing…', 'busy');
  try {
    if (!S.live) { const r = await S.gh.putFile('content/state.json', J({ live: true }), 'Publish website', S.shaState || undefined); S.shaState = r.sha; S.live = true; }
    let r;
    try { r = await S.gh.putFile('content/site.json', S.lastJson, 'Publish: ' + new Date().toISOString().slice(0, 16).replace('T', ' '), S.shaSite || undefined); }
    catch (e) { if (e.status !== 409 && e.status !== 422) throw e; const cur = await S.gh.getFile('content/site.json'); if (!(await confirmDlg('Published version changed', 'The live version was changed from another device. Overwrite it with this draft?', 'Overwrite and publish'))) return; r = await S.gh.putFile('content/site.json', S.lastJson, 'Publish (overwrite)', cur?.sha); }
    S.shaSite = r.sha; S.publishedText = S.lastJson; setChip('Published — building…', 'busy'); updatePubUI(); toast('Published. GitHub is now building the live site.', 'ok'); trackRun(r.commit);
  } catch (e) { toast('Publish failed: ' + e.message, 'err', 7000); setChip('Publish failed', 'err'); }
}
async function unpublish() {
  if (!(await confirmDlg('Unpublish website', 'Visitors will see a “currently unpublished” page. Your drafts, pages and media are kept and you can publish again any time.', 'Unpublish', true))) return;
  try { const r = await S.gh.putFile('content/state.json', J({ live: false }), 'Unpublish website', S.shaState || undefined); S.shaState = r.sha; S.live = false; updatePubUI(); toast('Website unpublished', 'ok'); trackRun(r.commit); }
  catch (e) { if (e.status === 409 || e.status === 422) { const c = await S.gh.getFile('content/state.json'); S.shaState = c?.sha; return unpublish(); } toast('Failed: ' + e.message, 'err', 6000); }
}
async function discardChanges() {
  if (!(await confirmDlg('Discard draft changes', 'Reset the editor to the currently published version? Unpublished edits will be lost (you can undo right after).', 'Discard changes', true))) return;
  restore(S.publishedText); toast('Draft reset to the published version');
}
function toggleMenu(btn, menu, build) { const open = menu.hidden; $$('.menu').forEach(m => { m.hidden = true; }); if (open) { menu.innerHTML = ''; build(menu); menu.hidden = false; } }
const mi = (label, fn, extra = {}) => h('button', { type: 'button', ...extra, onclick: () => { $$('.menu').forEach(m => { m.hidden = true; }); fn(); } }, label);
$('#pubBtn').onclick = e => { e.stopPropagation(); toggleMenu($('#pubBtn'), $('#pubMenu'), m => {
  m.append(h('div', { class: 'mi' }, h('strong', {}, S.live ? (isDirty() ? '◐ Live — you have unpublished changes' : '● Live — up to date') : '○ Not published'), h('br'), runLine() || (S.live ? 'Visitors see the last published version.' : 'Visitors see an “unpublished” notice.')));
  if (S.run?.url) m.append(mi('📋 View build log on GitHub', () => window.open(S.run.url, '_blank', 'noopener')));
  m.append(h('hr'), mi(S.live ? '🚀 Publish changes' : '🚀 Publish website', publish, { disabled: S.live && !isDirty() }), mi('👁 Preview draft', openPreview), mi('↩ Discard unpublished changes', discardChanges, { disabled: !isDirty() }));
  const pg = curPage(); m.append(h('hr'), mi(pg.visible === false ? `Show page “${pg.title}” (publish to apply)` : `Hide page “${pg.title}” from live site`, () => { if (pg.id === S.site.homeId) return toast('The home page cannot be hidden', 'err'); pg.visible = pg.visible === false; commit(); renderPanel(); toast(pg.visible ? 'Page will be visible after publishing' : 'Page will be hidden after publishing'); }));
  m.append(mi('🔁 Re-run site build', async () => { try { await S.gh.dispatch(); toast('Build started', 'ok'); setTimeout(async () => { const r = (await S.gh.runs(1))[0]; if (r) trackRun(r.head_sha); }, 4000); } catch (e) { toast(e.message, 'err', 6000); } }), mi('🌐 Open live website', () => window.open(siteUrl(), '_blank', 'noopener')));
  if (S.live) m.append(h('hr'), mi('⛔ Unpublish website…', unpublish));
}); };
async function openPreview() { await syncDraftLocalOnly(); const pg = curPage(); window.open(`preview.html?p=${encodeURIComponent(pagePath(S.site, pg))}`, '_blank'); }
async function syncDraftLocalOnly() { persistLocal(); }
$('#previewBtn').onclick = openPreview;

// ------------------------------------------------------------------ top bar
function applyBrand() {
  const s = S.site.settings; $('#brandName').textContent = s.name || 'Website'; $('#projName').textContent = (s.tagline || 'Developer Mode');
  const l = $('#brandLogo'); l.innerHTML = ''; if (s.logo) l.append(h('img', { src: mediaSrc(s.logo), alt: '' })); else l.textContent = (s.name || 'W').charAt(0).toUpperCase();
  fixMedia(l);
}
$$('[data-dev]').forEach(b => { b.onclick = () => { S.device = b.dataset.dev; $$('[data-dev]').forEach(x => x.classList.toggle('on', x === b)); $('#stage').className = S.device === 'desktop' ? '' : S.device; setTimeout(() => { render(); }, 230); }; });
$('#copyLink').onclick = async () => { try { await navigator.clipboard.writeText(siteUrl()); toast('Link copied', 'ok'); } catch { toast(siteUrl()); } };
$('#settingsBtn').onclick = e => { e.stopPropagation(); toggleMenu($('#settingsBtn'), $('#settingsMenu'), m => {
  [['🌐 Website settings & SEO', 'website'], ['🎨 Logo & brand', 'brand'], ['🔗 Domain', 'domain'], ['💳 Payments', 'payments'], ['🖼 Media library', 'media'], ['🕘 Versions & backup', 'versions'], ['🔐 Account & security', 'account'], ['🧰 Setup & status', 'setup']].forEach(([l, k]) => m.append(mi(l, () => Settings.open(k, api))));
  m.append(h('hr'), mi('⏏ Lock editor', () => { location.reload(); }));
}); };
document.addEventListener('click', e => { if (!e.target.closest('.dd')) $$('.menu').forEach(m => { m.hidden = true; }); });
frame.addEventListener('load', () => { document.addEventListener('click', () => $$('.menu').forEach(m => { m.hidden = true; })); });

async function checkSetup() {
  try {
    const pi = await S.gh.pagesInfo();
    if (!pi) showBanner('⚠ GitHub Pages is not switched on for this repository yet, so your site cannot go live.', '', { label: 'Switch on now', fn: async () => { try { await S.gh.enablePages(); await S.gh.dispatch().catch(() => {}); showBanner(''); toast('GitHub Pages enabled — first build started', 'ok'); } catch (e) { toast(e.message, 'err', 7000); } } });
    else if (pi.build_type !== 'workflow') showBanner('⚠ GitHub Pages must deploy from “GitHub Actions” for publishing to work.', '', { label: 'Fix now', fn: async () => { try { await S.gh.setPagesSource(); await S.gh.dispatch().catch(() => {}); showBanner(''); toast('Fixed — build started', 'ok'); } catch (e) { toast(e.message, 'err', 7000); } } });
  } catch {}
}

// shared with settings.js
const api = { S, gh: () => S.gh, commit, render, renderPanel, changed, siteUrl, syncDraft, restore, trackRun, updatePubUI, applyBrand, logoFields, publish, pageSettings };
boot();
