// Shared renderer: used by the server (SSR for the public site + preview) AND by the visual editor canvas.
// Pure functions, no DOM access, so it runs in Cloudflare Workers and in the browser.
export const ASSET_V = '1';
const clamp = (n, a, b) => Math.min(b, Math.max(a, Number.isFinite(+n) ? +n : a));
const num = (v, d) => (v !== '' && v !== null && v !== undefined && Number.isFinite(+v) ? +v : d);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = 'n') => p + Math.random().toString(36).slice(2, 9);

export const FONT_LIST = ['Inter', 'Space Grotesk', 'Poppins', 'Montserrat', 'DM Sans', 'Manrope', 'Outfit', 'Playfair Display', 'Lora', 'Merriweather', 'Roboto Slab', 'System'];
export function fontStack(f) {
  if (!f || f === 'System') return 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  return `'${String(f).replace(/[^\w ]/g, '')}',system-ui,sans-serif`;
}
export function fontsHref(site) {
  const set = new Set([site.theme?.headingFont, site.theme?.bodyFont]);
  const json = JSON.stringify(site);
  for (const m of json.matchAll(/"font":"([^"]+)"/g)) set.add(m[1]);
  for (const f of FONT_LIST) if (f !== 'System' && new RegExp('font-family:[^;]*' + f).test(json)) set.add(f);
  const fams = [...set].filter(f => f && f !== 'System' && FONT_LIST.includes(f));
  if (!fams.length) return '';
  return '/assets/fonts.css'; // self-hosted in the repository — no request leaves your own website
}
export function cssVal(v, d = '') {
  v = String(v ?? '').trim();
  return v && v.length < 140 && /^[#\w\s%.,()\-'"/]+$/.test(v) && !/url\(|expression|javascript/i.test(v) ? v : d;
}
export function safeUrl(u) {
  u = String(u ?? '').trim();
  if (/^(https?:|mailto:|tel:|sms:|whatsapp:)/i.test(u) || /^(\/(?!\/)|#|page:)/.test(u)) return u;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) return 'https://' + u;
  return '';
}
export const safeSrc = u => (/^(https?:\/\/|\/(?!\/))/.test(String(u ?? '').trim()) ? String(u).trim() : '');

// Root-absolute URLs ("/assets/..", "/services/") are rewritten when the site lives under /repo-name/ (GitHub project pages).
export function rebase(html, base) {
  if (!base) return html;
  return html.replace(/\b(href|src|action)="\/(?!\/)/g, `$1="${base}/`).replace(/url\('\/(?!\/)/g, `url('${base}/`);
}
export const absUrl = (origin, u) => (u && u.startsWith('/') ? origin + u : u);
const RESERVED = new Set(['edit', 'assets', 'media', 'content', 'tools', 'docs', 'sitemap.xml', 'robots.txt', 'favicon.ico', '404', 'cname']);
export function validateSite(site) {
  if (!site || typeof site !== 'object' || !Array.isArray(site.pages) || !site.pages.length) throw new Error('Invalid site data');
  if (!site.settings || !site.theme || !site.globals) throw new Error('Invalid site data');
  if (!site.pages.some(p => p.id === site.homeId)) throw new Error('A Home page must exist');
  const ids = new Set(), paths = new Set(), byId = Object.fromEntries(site.pages.map(p => [p.id, p]));
  for (const p of site.pages) {
    if (!p.id || ids.has(p.id)) throw new Error('Duplicate page id');
    ids.add(p.id);
    if (p.id !== site.homeId && (!/^[a-z0-9][a-z0-9-]*$/.test(p.slug || '') || RESERVED.has(p.slug))) throw new Error(`Page "${p.title}" has an invalid or reserved URL slug`);
  }
  for (const p of site.pages) {
    const parts = []; let c = p, g = 0;
    while (c && g++ < 6) { if (c.id !== site.homeId) parts.unshift(c.slug); c = byId[c.parent]; }
    const path = '/' + parts.join('/');
    if (paths.has(path)) throw new Error(`Two pages share the URL ${path}`);
    paths.add(path);
  }
  return site;
}

// ---------- pages / navigation ----------
export const homePage = s => s.pages.find(p => p.id === s.homeId) || s.pages[0];
export function pagePath(s, p) {
  if (!p) return '/';
  if (p.id === s.homeId) return '/';
  const parts = []; let c = p, g = 0;
  while (c && g++ < 6) { if (c.id !== s.homeId) parts.unshift(c.slug); c = s.pages.find(x => x.id === c.parent); }
  return '/' + parts.join('/') + '/';
}
export function findPageByPath(s, path) {
  const n = x => x.replace(/\/+$/, '') || '/';
  path = n(path);
  return s.pages.find(p => n(pagePath(s, p)) === path);
}
export function resolveHref(site, u) {
  u = String(u || '');
  if (u.startsWith('page:')) {
    const [id, hash] = u.slice(5).split('#');
    const p = site.pages.find(x => x.id === id);
    return p ? pagePath(site, p) + (hash ? '#' + hash : '') : '/';
  }
  return safeUrl(u);
}
export function navItems(site) {
  const vis = site.pages.filter(p => p.visible !== false && p.inNav);
  const roots = vis.filter(p => !p.parent || !vis.some(x => x.id === p.parent));
  return roots.map(r => ({ page: r, kids: vis.filter(p => p.parent === r.id) }));
}
export function* walkSections(site) {
  for (const k of ['header', 'footer']) for (const s of site.globals?.[k] || []) yield s;
  for (const p of site.pages) for (const s of p.sections || []) yield s;
}
export function* walkEls(site) { for (const s of walkSections(site)) for (const e of s.items || []) yield e; }

// ---------- sanitiser for rich text (works without a DOM) ----------
const OK_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'sub', 'sup', 'mark', 'blockquote']);
const OK_STYLE = new Set(['color', 'background-color', 'font-weight', 'font-style', 'text-decoration', 'font-size', 'font-family', 'text-align', 'letter-spacing', 'line-height', 'margin-left', 'padding-left', 'text-transform', 'text-indent']);
function cleanStyle(s) {
  return s.split(';').map(x => x.trim()).filter(Boolean).map(d => {
    const i = d.indexOf(':'); if (i < 0) return '';
    const k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim();
    return OK_STYLE.has(k) && /^[\w\s#%.,()\-'"]+$/.test(v) && !/url\(|expression|javascript/i.test(v) ? `${k}:${v.replace(/"/g, "'")}` : '';
  }).filter(Boolean).join(';');
}
export function sanitizeHTML(html) {
  html = String(html ?? '');
  let out = '', last = 0;
  const text = t => t.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const m of html.matchAll(/<[^<>]*>/g)) {
    out += text(html.slice(last, m.index)); last = m.index + m[0].length;
    const t = /^<(\/?)([a-z][a-z0-9]*)\b([\s\S]*?)\/?>$/i.exec(m[0]);
    if (!t || !OK_TAGS.has(t[2].toLowerCase())) continue;
    const tag = t[2].toLowerCase();
    if (t[1]) { out += `</${tag}>`; continue; }
    let attrs = '';
    for (const a of t[3].matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      const k = a[1].toLowerCase(), v = (a[2] ?? a[3] ?? '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      if (k === 'style') { const c = cleanStyle(v); if (c) attrs += ` style="${esc(c)}"`; }
      else if (tag === 'a' && k === 'href') { const u = safeUrl(v); if (u) attrs += ` href="${esc(u)}"`; }
      else if (tag === 'a' && k === 'target' && v === '_blank') attrs += ' target="_blank" rel="noopener noreferrer"';
    }
    out += `<${tag}${attrs}>`;
  }
  return out + text(html.slice(last));
}
export function rich(site, html) {
  return sanitizeHTML(html).replace(/href="page:([^"]+)"/g, (m, id) => {
    const [pid, hash] = id.split('#');
    const p = site.pages.find(x => x.id === pid);
    return `href="${esc(p ? pagePath(site, p) + (hash ? '#' + hash : '') : '/')}"`;
  });
}

// In the editor, rich text keeps its original 'page:' link targets so edits round-trip unchanged.
const richC = (c, html) => (c.ed ? sanitizeHTML(html) : rich(c.site, html));

// ---------- theme ----------
const SHADOWS = { none: 'none', soft: '0 10px 40px rgba(0,0,0,.25)', strong: '0 20px 60px rgba(0,0,0,.45)', glow: '0 0 40px rgba(139,92,246,.35)' };
export const SHADOW_KEYS = Object.keys(SHADOWS);
export function themeCSS(site) {
  const t = site.theme || {}, v = (k, d) => cssVal(t[k], d);
  const primary = v('primary', '#8B5CF6');
  return `:root{--primary:${primary};--secondary:${v('secondary', '#22D3EE')};--accent:${v('accent', '#A855F7')};--bg:${v('bg', '#09090D')};--bg2:${v('bg2', '#171722')};--text:${v('text', '#F8FAFC')};--muted:${v('muted', '#A1A1AA')};--heading:${v('heading', v('text', '#F8FAFC'))};--glass:${v('glass', 'rgba(255,255,255,.06)')};--glass-border:${v('glassBorder', 'rgba(255,255,255,.14)')};--link:${v('link', primary)};--btn-text:${v('btnText', '#ffffff')};--hfont:${fontStack(t.headingFont)};--bfont:${fontStack(t.bodyFont)};--radius:${num(t.radius, 18)}px;--blur:${num(t.blur, 18)}px;--space:${num(t.space, 80)}px;--gap:${num(t.gap, 24)}px;--maxw:${num(t.maxw, 1180)}px;--fs:${num(t.fontSize, 16)}px;--shadow:${SHADOWS[t.shadow] || SHADOWS.soft};--grad:linear-gradient(135deg,${primary},${v('secondary', '#22D3EE')})}`;
}

// ---------- elements ----------
const F = (c, p, rich_, ph) => (c.ed ? ` data-f="${p}"${rich_ ? ' data-rich="1"' : ''}${ph ? ` data-ph="${esc(ph)}"` : ''} contenteditable="true" spellcheck="true"` : '');
const ratioCss = r => (r && r !== 'auto' && /^\d+:\d+$/.test(r) ? `aspect-ratio:${r.replace(':', '/')};` : '');
const shadowCss = s => (s && s !== 'none' && SHADOWS[s] ? `box-shadow:${SHADOWS[s]};` : '');
const linkAttr = (c, href, newTab) => `href="${esc(resolveHref(c.site, href) || '#')}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}`;
const EMBED_OK = /^https:\/\/(www\.youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/|www\.google\.com\/maps\/embed|maps\.google\.com\/|docs\.google\.com\/(forms|presentation|document)\/|calendly\.com\/)/i;
export function embedUrl(u) {
  u = String(u || '').trim(); let m;
  if ((m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/))([\w-]{11})/.exec(u))) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u))) return `https://player.vimeo.com/video/${m[1]}`;
  return EMBED_OK.test(u) ? u : '';
}
const placeholder = (c, txt) => (c.ed ? `<div class="wf-ph">${txt}</div>` : '');

function imgTag(p, c, extra = '') {
  const src = safeSrc(p.src); if (!src) return '';
  return `<img src="${esc(src)}" alt="${esc(p.alt || '')}" loading="lazy" decoding="async" style="object-fit:${p.fit === 'contain' ? 'contain' : 'cover'};object-position:${num(p.fx, 50)}% ${num(p.fy, 50)}%"${extra}>`;
}

const R = {
  heading: (el, c) => { const l = clamp(el.props.level || 2, 1, 4); return `<h${l} class="wf-h"${F(c, 'props.html', 1, 'Heading')}>${richC(c, el.props.html)}</h${l}>`; },
  text: (el, c) => `<div class="wf-text"${F(c, 'props.html', 1, 'Type your text')}>${richC(c, el.props.html)}</div>`,
  image: (el, c) => {
    const p = el.props, src = safeSrc(p.src);
    if (!src) return placeholder(c, '🖼 Click to add an image');
    let img = imgTag(p, c);
    if (p.link && !c.ed) img = `<a ${linkAttr(c, p.link, p.newTab)}>${img}</a>`;
    const bd = num(p.border, 0) > 0 ? `border:${num(p.border, 0)}px solid ${cssVal(p.borderColor, 'var(--glass-border)')};` : '';
    const st = `${p.width ? `width:${clamp(p.width, 5, 100)}%;` : ''}${ratioCss(p.ratio)}border-radius:${num(p.radius, 0)}px;${shadowCss(p.shadow)}${bd}`;
    return `<figure class="wf-img" style="${st}">${img}</figure>`;
  },
  gallery: (el, c) => {
    const p = el.props, imgs = (p.images || []).filter(i => safeSrc(i.src));
    if (!imgs.length) return placeholder(c, '🖼 Add images in the properties panel');
    const st = `--ratio:${(p.ratio && p.ratio !== 'auto' ? p.ratio : '4:3').replace(':', '/')};--rad:${num(p.radius, 12)}px;--cg:${num(p.gap, 12)}px;`;
    if (p.mode === 'carousel') {
      const cfg = { d: clamp(p.perD || 1, 1, 6), t: clamp(p.perT || 1, 1, 4), m: clamp(p.perM || 1, 1, 2), auto: !!p.auto, interval: clamp(p.interval || 4, 1, 30), effect: p.effect === 'fade' ? 'fade' : 'slide', loop: p.loop !== false, gap: num(p.gap, 12) };
      return `<div class="wf-car" data-cfg="${esc(JSON.stringify(cfg))}" style="${st}"><div class="car-view"><div class="car-track">${imgs.map(i => `<div class="car-slide">${imgTag(i, c)}</div>`).join('')}</div></div>${p.arrows !== false ? '<button type="button" class="car-btn car-prev" aria-label="Previous">‹</button><button type="button" class="car-btn car-next" aria-label="Next">›</button>' : ''}${p.dots !== false ? '<div class="car-dots"></div>' : ''}</div>`;
    }
    return `<div class="wf-gal" style="${st}--gc:${clamp(p.cols || 3, 1, 6)};--gt:${clamp(p.colsT || 2, 1, 4)};--gm:${clamp(p.colsM || 1, 1, 2)}">${imgs.map(i => `<div class="gal-item">${imgTag(i, c)}</div>`).join('')}</div>`;
  },
  video: (el, c) => {
    const p = el.props, src = String(p.src || '').trim(); if (!src) return placeholder(c, '▶ Add a video (upload or YouTube/Vimeo link)');
    const rat = (p.ratio || '16:9').replace(':', '/'), emb = embedUrl(src);
    if (emb && !safeSrc(src).startsWith('/media/')) return `<div class="wf-video" style="aspect-ratio:${rat}"><iframe src="${esc(emb)}" title="${esc(p.title || 'Video')}" loading="lazy" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    const s = safeSrc(src); if (!s) return placeholder(c, 'Invalid video link');
    const poster = safeSrc(p.poster);
    return `<div class="wf-video" style="aspect-ratio:${rat}"><video src="${esc(s)}" ${p.controls !== false ? 'controls' : ''} playsinline preload="metadata" ${poster ? `poster="${esc(poster)}"` : ''} ${p.loop ? 'loop' : ''} ${p.autoplay ? 'muted data-autoplay="1"' : ''}></video></div>`;
  },
  button: (el, c) => {
    const p = el.props, pl = safeUrl(p.payLink);
    return `<a class="btn btn-${esc(p.variant || 'primary')}" ${pl ? `href="${esc(pl)}" target="_blank" rel="noopener noreferrer"` : linkAttr(c, p.href, p.newTab)}><span${F(c, 'props.label', 0, 'Button')}>${esc(p.label)}</span></a>`;
  },
  divider: el => `<hr class="wf-div d-${esc(el.props.look || 'line')}">`,
  spacer: el => `<div class="wf-spacer" style="--h:${clamp(el.props.h || 40, 4, 400)}px"></div>`,
  embed: (el, c) => { const u = embedUrl(el.props.url); if (!u) return placeholder(c, '⧉ Paste a YouTube, Vimeo, Google Maps/Forms or Calendly link'); return `<div class="wf-video" style="aspect-ratio:${(el.props.ratio || '16:9').replace(':', '/')}"><iframe src="${esc(u)}" title="${esc(el.props.title || 'Embedded content')}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`; },
  card: (el, c) => {
    const p = el.props, pl = safeUrl(p.payLink), src = safeSrc(p.image);
    let media = '';
    if (src) media = `<div class="card-media" style="${ratioCss(p.ratio || '16:9')}">${imgTag({ src, alt: p.alt || p.title, fit: p.fit, fx: p.fx, fy: p.fy }, c)}</div>`;
    else if (p.imagePh && c.ed) media = `<div class="card-media wf-ph" style="${ratioCss(p.ratio || '16:9')}">🖼 Add image</div>`;
    else if (p.icon) media = `<div class="card-icon">${esc(p.icon)}</div>`;
    const feats = String(p.features || '').split('\n').map(x => x.trim()).filter(Boolean);
    const showBtn = p.btnLabel || c.ed;
    return `<article class="wf-card${p.featured ? ' featured' : ''}">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}${media}<div class="card-body"><h3 class="card-title"${F(c, 'props.title', 0, 'Title')}>${esc(p.title)}</h3>${p.price || c.ed ? `<div class="card-price"${F(c, 'props.price', 0, 'Price')}>${esc(p.price)}</div>` : ''}<div class="card-desc"${F(c, 'props.desc', 1, 'Description')}>${richC(c, p.desc)}</div>${feats.length ? `<ul class="card-list">${feats.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}${showBtn ? `<a class="btn btn-${esc(p.btnVariant || 'secondary')}" ${pl ? `href="${esc(pl)}" target="_blank" rel="noopener noreferrer"` : linkAttr(c, p.href, p.newTab)}${!p.btnLabel ? ' style="opacity:.5"' : ''}><span${F(c, 'props.btnLabel', 0, 'Button label')}>${esc(p.btnLabel)}</span></a>` : ''}</div></article>`;
  },
  stat: (el, c) => `<div class="wf-stat"><div class="stat-v"${F(c, 'props.value', 0, '100+')}>${esc(el.props.value)}</div><div class="stat-l"${F(c, 'props.label', 0, 'Label')}>${esc(el.props.label)}</div></div>`,
  faq: (el, c) => `<div class="wf-faq">${(el.props.items || []).map(i => `<details><summary>${esc(i.q)}</summary><div class="faq-a">${richC(c, i.a)}</div></details>`).join('')}</div>`,
  form: (el, c) => {
    const p = el.props, st = c.site.settings || {};
    const mode = p.mode === 'whatsapp' ? 'whatsapp' : 'email';
    const dest = mode === 'whatsapp' ? String(st.whatsapp || '').replace(/\D/g, '') : String(st.contactEmail || '').trim();
    return `<form class="wf-form" data-mode="${mode}" data-dest="${esc(dest)}" data-subject="${esc(p.subject || 'New enquiry from ' + (st.name || 'website'))}" novalidate>${(p.fields || []).map((f, i) => {
      const id = `${el.id}_${i}`, req = f.required ? ' required' : '', lab = `<label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}</label>`;
      if (f.type === 'textarea') return `<div class="fld full">${lab}<textarea id="${id}" name="${esc(f.label)}" rows="4"${req}></textarea></div>`;
      if (f.type === 'select') return `<div class="fld">${lab}<select id="${id}" name="${esc(f.label)}"${req}><option value="">Select…</option>${String(f.options || '').split(',').map(o => o.trim()).filter(Boolean).map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`;
      return `<div class="fld">${lab}<input id="${id}" name="${esc(f.label)}" type="${['email', 'tel'].includes(f.type) ? f.type : 'text'}"${req}></div>`;
    }).join('')}<div class="fld full"><button class="btn btn-primary" type="submit"><span${F(c, 'props.btnLabel', 0, 'Send')}>${esc(p.btnLabel || 'Send message')}</span></button></div><p class="form-msg" role="status" data-ok="${esc(p.success || 'Your message is ready — please press Send in the app that opened.')}">${c.ed && !dest ? 'Editor note: add your ' + (mode === 'whatsapp' ? 'WhatsApp number' : 'contact email') + ' in Settings → Website so this form works.' : ''}</p></form>`;
  },
  payresult: (el, c) => `<div class="wf-payres" data-kind="${el.props.kind === 'failure' ? 'failure' : 'success'}"><div class="pr-icon">${el.props.kind === 'failure' ? '⚠️' : '✅'}</div><h3 class="pr-title"${F(c, 'props.title', 0, 'Title')}>${esc(el.props.title)}</h3><p class="pr-msg"${F(c, 'props.msg', 0, 'Message')}>${esc(el.props.msg)}</p></div>`,
  logo: (el, c) => {
    const s = c.site.settings || {}, name = esc(s.name || 'Brand'), logo = safeSrc(s.logo);
    const inner = logo
      ? `<img class="lg-d" src="${esc(logo)}" alt="${name}" style="height:${num(s.logoH, 40)}px"><img class="lg-m" src="${esc(safeSrc(s.logoMobile) || logo)}" alt="${name}" style="height:${num(s.logoHM, 32)}px">`
      : `<span class="logo-mark">${esc((s.name || 'B').trim().charAt(0).toUpperCase())}</span><span class="logo-text">${name}</span>`;
    return `<a class="wf-logo" href="/" aria-label="${name} home">${inner}</a>`;
  },
  nav: (el, c) => {
    const items = navItems(c.site), cur = c.page?.id, extra = c.site.settings?.navExtra || [];
    const a = (p) => `<a href="${esc(pagePath(c.site, p))}"${p.id === cur ? ' aria-current="page"' : ''}>${esc(p.navLabel || p.title)}</a>`;
    return `<nav class="wf-nav" aria-label="Main"><button type="button" class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">☰</button><ul>${items.map(i => `<li${i.kids.length ? ' class="has-sub"' : ''}>${a(i.page)}${i.kids.length ? `<ul class="sub">${i.kids.map(k => `<li>${a(k)}</li>`).join('')}</ul>` : ''}</li>`).join('')}${extra.map(x => `<li><a ${linkAttr(c, x.href, x.newTab)}>${esc(x.label)}</a></li>`).join('')}</ul></nav>`;
  },
};
export const ELEMENT_TYPES = Object.keys(R);

export function renderElement(el, ctx) {
  const fn = R[el.type]; if (!fn) return '';
  const s = el.style || {}, cols = ctx.cols || 1, span = clamp(el.span || 1, 1, cols);
  const css = [`--sp:${span}`];
  if (s.font) css.push(`font-family:${fontStack(s.font)}`);
  if (s.size) css.push(`font-size:${clamp(s.size, 8, 160)}px`);
  if (s.weight) css.push(`font-weight:${clamp(s.weight, 100, 900)}`);
  if (s.color) css.push(`color:${cssVal(s.color)}`);
  if (s.bg) css.push(`background:${cssVal(s.bg)}`);
  if (s.lh) css.push(`line-height:${clamp(s.lh, 0.8, 3)}`);
  if (s.ls !== undefined && s.ls !== '') css.push(`letter-spacing:${clamp(s.ls, -5, 20)}px`);
  if (s.tt && s.tt !== 'none') css.push(`text-transform:${['uppercase', 'lowercase', 'capitalize'].includes(s.tt) ? s.tt : 'none'}`);
  if (s.align && s.align !== 'left') css.push(`text-align:${['center', 'right', 'justify'].includes(s.align) ? s.align : 'left'}`);
  if (s.mt) css.push(`margin-top:${clamp(s.mt, -100, 300)}px`);
  if (s.mb) css.push(`margin-bottom:${clamp(s.mb, -100, 300)}px`);
  if (s.pad) css.push(`padding:${clamp(s.pad, 0, 200)}px`);
  if (s.maxw) css.push(`max-width:${clamp(s.maxw, 5, 100)}%`);
  if (s.radius) css.push(`border-radius:${clamp(s.radius, 0, 100)}px`);
  if (s.anim && s.anim !== 'none') css.push(`--ad:${clamp(s.dur ?? 700, 50, 5000)}ms`, `--adl:${clamp(s.delay ?? 0, 0, 5000)}ms`);
  if (s.trans !== undefined && s.trans !== '') css.push(`--tr:${clamp(s.trans, 0, 2000)}ms`);
  const cls = ['el', `el-${el.type}`];
  if (s.hover && s.hover !== 'none') cls.push(`h-${String(s.hover).replace(/\W/g, '')}`);
  if (s.anim && s.anim !== 'none') cls.push(`a-${String(s.anim).replace(/\W/g, '')}`);
  const al = ['center', 'right'].includes(s.align) ? s.align : 'left';
  return `<div class="${cls.join(' ')}" data-eid="${esc(el.id)}" data-type="${el.type}" data-al="${al}" data-span="${span}"${span >= cols ? ' data-full="1"' : ''} style="${css.join(';')}">${fn(el, { ...ctx, cols })}</div>`;
}

export function renderSection(s, ctx) {
  const p = s.props || {}, cols = clamp(p.cols || 1, 1, 6), bg = p.bg || {};
  const ct = clamp(p.ct || Math.min(cols, 2), 1, 3), cm = clamp(p.cm || 1, 1, 2);
  const css = [];
  if (p.padTop !== undefined && p.padTop !== '') css.push(`padding-top:${clamp(p.padTop, 0, 400)}px`);
  if (p.padBottom !== undefined && p.padBottom !== '') css.push(`padding-bottom:${clamp(p.padBottom, 0, 400)}px`);
  let bgHtml = '';
  if (bg.type === 'color') css.push(`background:${cssVal(bg.color, 'transparent')}`);
  else if (bg.type === 'gradient') css.push(`background:linear-gradient(${clamp(bg.angle ?? 135, 0, 360)}deg,${cssVal(bg.color, '#171722')},${cssVal(bg.color2, '#09090D')})`);
  else if (bg.type === 'glow') css.push('background:radial-gradient(60% 80% at 15% 0%,color-mix(in srgb,var(--primary) 38%,transparent),transparent 70%),radial-gradient(50% 70% at 90% 20%,color-mix(in srgb,var(--secondary) 28%,transparent),transparent 70%)');
  else if (bg.type === 'image' && safeSrc(bg.image)) bgHtml = `<div class="sec-bgimg" style="background-image:url('${esc(safeSrc(bg.image).replace(/'/g, '%27'))}')"></div><div class="sec-ov" style="background:rgba(0,0,0,${clamp(bg.overlay ?? 0.45, 0, 1)})"></div>`;
  const hide = (p.hideOn || []).filter(x => ['d', 't', 'm'].includes(x)).map(x => ` hide-${x}`).join('');
  const inner = (s.items || []).map(e => renderElement(e, { ...ctx, cols })).join('') || (ctx.ed ? '<div class="sec-empty">Empty section — drag elements here</div>' : '');
  const gap = p.gap !== undefined && p.gap !== '' ? `${clamp(p.gap, 0, 120)}px` : 'var(--gap)';
  const anchor = /^[\w-]+$/.test(p.anchor || '') ? ` id="${p.anchor}"` : '';
  return `<section class="sec w-${['narrow', 'full'].includes(p.width) ? p.width : 'wide'}${hide}"${anchor} data-sid="${esc(s.id)}" data-cols="${cols}" data-ct="${ct}" data-cm="${cm}" style="${css.join(';')}">${bgHtml}<div class="sec-in${p.panel ? ' panel' : ''}"><div class="grid" style="--cols:${cols};gap:${gap};align-items:${['center', 'end', 'stretch'].includes(p.valign) ? p.valign : 'start'}">${inner}</div></div></section>`;
}

export function renderBody(site, page, ctx = {}) {
  const c = { ...ctx, site, page }, g = site.globals || {}, t = site.theme || {}, landing = !!page.landing;
  const zone = (arr, name) => (arr || []).map(s => renderSection(s, c)).join('') || (c.ed ? `<div class="zone-empty">Empty ${name} — insert a ${name} layout</div>` : '');
  return `<div class="site${c.ed ? ' ed' : ''} bt-${esc(t.btnStyle || 'gradient')}" data-ls="${esc(t.linkStyle || 'underline')}">${landing ? '' : `<header class="wf-header hs-${esc(t.headerStyle || 'glass')}${t.headerSticky !== false ? ' sticky' : ''}" data-zone="header">${zone(g.header, 'header')}</header>`}<main data-zone="main">${zone(page.sections, 'page')}</main>${landing ? '' : `<footer class="wf-footer fs-${esc(t.footerStyle || 'glass')}" data-zone="footer">${zone(g.footer, 'footer')}</footer>`}</div>`;
}

const jsonLd = o => JSON.stringify(o).replace(/</g, '\\u003c');
export function renderDocument(site, page, { origin = '', preview = false, base = '' } = {}) {
  const s = site.settings || {}, home = page.id === site.homeId;
  const title = page.seo?.title || (home ? (s.seoTitle || s.name) : `${page.title} | ${s.name}`);
  const desc = page.seo?.description || (home ? (s.seoDescription || s.description) : s.description) || '';
  const url = origin + pagePath(site, page), og = absUrl(origin, safeSrc(s.ogImage)), fav = safeSrc(s.favicon), fonts = fontsHref(site);
  const ld = [{ '@context': 'https://schema.org', '@type': 'Organization', name: s.name, url: origin || undefined, logo: og || absUrl(origin, safeSrc(s.logo)) || undefined, description: s.description || undefined, ...(s.owner ? { founder: { '@type': 'Person', name: s.owner } } : {}) }];
  const faqs = (page.sections || []).flatMap(x => x.items || []).filter(e => e.type === 'faq').flatMap(e => e.props.items || []);
  if (faqs.length) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: String(f.a || '').replace(/<[^>]*>/g, '') } })) });
  if (!home) ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: page.title, item: url }] });
  const ga = /^G-[\w]+$/.test(s.analyticsId || '') ? s.analyticsId : '';
  const csp = `default-src 'self'; img-src 'self' data: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'${ga ? ' https://www.googletagmanager.com' : ''}; frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com https://docs.google.com https://calendly.com; connect-src 'self'${ga ? ' https://*.google-analytics.com https://*.googletagmanager.com' : ''}; object-src 'none'; base-uri 'self'`;
  return `<!doctype html><html lang="${esc(s.lang || 'en')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${esc(csp)}"><meta name="referrer" content="strict-origin-when-cross-origin"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}">${preview || page.noindex ? '<meta name="robots" content="noindex,nofollow">' : `<link rel="canonical" href="${esc(url)}">`}<meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}">${og ? `<meta property="og:image" content="${esc(og)}"><meta name="twitter:card" content="summary_large_image">` : ''}${fav ? `<link rel="icon" href="${esc(fav)}">` : ''}${fonts ? `<link rel="stylesheet" href="${esc(fonts)}">` : ''}<link rel="stylesheet" href="/assets/site.css?v=${ASSET_V}"><style>${themeCSS(site)}</style>${ld.map(o => `<script type="application/ld+json">${jsonLd(o)}</script>`).join('')}</head><body data-public="1" data-base="${esc(base)}" data-ga="${esc(ga)}" data-cookie="${s.cookieBanner === false ? '0' : '1'}" data-privacy="${esc(s.privacyPageId ? resolveHref(site, 'page:' + s.privacyPageId) : '')}">${renderBody(site, page, {})}<script type="module" src="/assets/site.js?v=${ASSET_V}"></script></body></html>`;
}
