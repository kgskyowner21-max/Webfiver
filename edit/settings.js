// Settings dialogs. Every action here talks to GitHub only (contents, pages, commits, actions).
import { h, $, modal, toast, confirmDlg, fld, ctx, pickFiles, uploadFile, mediaKind, mediaSrc, fixMedia, mediaDel, getPath } from './ui.js';
import { pagePath, validateSite, walkEls } from '../assets/render.js';
import { Vault, GhClient } from './github.js';

const fmtSize = n => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const fmtDate = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const copy = async t => { try { await navigator.clipboard.writeText(t); toast('Copied', 'ok'); } catch { toast(t); } };
const row = (k, v) => [h('dt', {}, k), h('dd', {}, v)];

export function open(kind, app) { ({ website, brand, domain, payments, media, versions, account, setup }[kind])(app); }

// ---------------------------------------------------------------- website & SEO
function website(app) {
  const st = app.S.site.settings, live = (k, v, m) => { app.render(); app.commit(m.live); };
  const F = (d) => fld(d, st, live);
  const pages = app.S.site.pages.map(p => [p.id, p.title]);
  modal('Website settings & SEO', h('div', {},
    h('div', { class: 'sub' }, 'General'), F({ t: 'text', k: 'name', l: 'Website / brand name' }), F({ t: 'text', k: 'tagline', l: 'Tagline' }), F({ t: 'text', k: 'owner', l: 'Owner / founder name' }), F({ t: 'area', k: 'description', l: 'Website description', rows: 3 }),
    F({ t: 'sel', k: 'lang', l: 'Default language', o: [['en', 'English'], ['hi', 'हिन्दी (Hindi)'], ['mr', 'मराठी'], ['gu', 'ગુજરાતી'], ['ta', 'தமிழ்'], ['bn', 'বাংলা']] }),
    h('div', { class: 'sub' }, 'Contact form destination (no server needed)'), F({ t: 'text', k: 'contactEmail', l: 'Email that receives enquiries' }), F({ t: 'text', k: 'whatsapp', l: 'WhatsApp number with country code (e.g. 919876543210)' }),
    h('p', { class: 'note' }, 'When a visitor submits the contact form, their email app (or WhatsApp) opens with the message filled in. This works on GitHub Pages without any extra service.'),
    h('div', { class: 'sub' }, 'Search & social sharing'), F({ t: 'text', k: 'seoTitle', l: 'Home page SEO title', max: 90 }), F({ t: 'area', k: 'seoDescription', l: 'Home page meta description', rows: 3 }), F({ t: 'img', k: 'ogImage', l: 'Social sharing image (1200×630 recommended)' }), F({ t: 'img', k: 'favicon', l: 'Favicon' }),
    h('p', { class: 'note' }, 'Each page can have its own SEO title and description in Pages → ⚙. A sitemap.xml and robots.txt are generated automatically on every publish.'),
    h('div', { class: 'sub' }, 'Analytics, cookies & privacy'), F({ t: 'text', k: 'analyticsId', l: 'Google Analytics ID (optional, e.g. G-XXXXXXX)' }), F({ t: 'bool', k: 'cookieBanner', l: 'Ask visitors for cookie consent before loading analytics' }), F({ t: 'sel', k: 'privacyPageId', l: 'Privacy policy page', o: [['', '— none —'], ...pages] })),
  { wide: true, buttons: [{ label: 'Done', kind: 'primary' }] });
}

function brand(app) {
  const st = app.S.site.settings, th = app.S.site.theme, live = (k, v, m) => { app.render(); app.commit(m.live); };
  modal('Logo & brand identity', h('div', {}, app.logoFields().map(d => fld(d, st, live)), fld({ t: 'img', k: 'favicon', l: 'Favicon (browser tab icon)' }, st, live),
    h('p', { class: 'note' }, 'The logo always links to the Home page. Position it by moving the Logo element inside the header (drag it, or change the header columns).'),
    h('div', { class: 'sub' }, 'Header'), fld({ t: 'sel', k: 'headerStyle', l: 'Header background', o: [['glass', 'Glass'], ['solid', 'Solid'], ['transparent', 'Transparent']] }, th, live), fld({ t: 'bool', k: 'headerSticky', l: 'Keep header visible while scrolling' }, th, live),
    h('p', { class: 'note' }, 'To change header spacing, click the header on the page and use Padding top / bottom in Properties.')), { buttons: [{ label: 'Done', kind: 'primary' }] });
}

// ---------------------------------------------------------------- domain (GitHub Pages custom domain)
const GH_IPS = ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'];
async function domain(app) {
  const gh = app.gh(), body = h('div', {}, h('p', { class: 'muted' }, 'Loading…')), m = modal('Custom domain', body, { wide: true, buttons: [{ label: 'Close' }] });
  async function draw() {
    let pi; try { pi = await gh.pagesInfo(); } catch (e) { body.innerHTML = ''; body.append(h('p', {}, 'Could not read GitHub Pages settings: ' + e.message)); return; }
    body.innerHTML = '';
    if (!pi) { body.append(h('p', {}, 'GitHub Pages is not enabled yet. Open Settings → Setup & status and switch it on first.')); return; }
    const dom = pi.cname || '', input = h('input', { class: 'inp', value: dom, placeholder: 'www.yourbrand.com' });
    body.append(h('dl', { class: 'kv' }, ...row('Default address', h('a', { href: siteBase(gh), target: '_blank', rel: 'noopener' }, siteBase(gh))), ...row('Custom domain', dom || 'Not connected yet'), ...row('HTTPS', dom ? (pi.https_enforced ? '✅ Enforced' : '⚠ Not enforced yet') + (pi.https_certificate ? ` — certificate: ${pi.https_certificate.state}` : '') : '—')));
    body.append(h('label', { class: 'f' }, h('span', { class: 'fl' }, '1. Enter your domain'), input),
      h('div', { style: { display: 'flex', gap: '8px', marginBottom: '14px' } }, h('button', { class: 'btn primary', onclick: save }, dom ? 'Update domain' : 'Save & connect domain'), dom ? h('button', { class: 'btn danger', onclick: remove }, 'Disconnect') : null));
    const d = (input.value || dom || 'www.yourbrand.com').trim().toLowerCase(), apex = d.split('.').length <= 2;
    body.append(h('div', { class: 'sub' }, '2. Add these DNS records at your domain registrar'), h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Type'), h('th', {}, 'Name / Host'), h('th', {}, 'Value')),
      ...(apex ? [...GH_IPS.map(ip => h('tr', {}, h('td', {}, 'A'), h('td', {}, '@'), h('td', {}, h('code', {}, ip)))), h('tr', {}, h('td', {}, 'CNAME'), h('td', {}, 'www'), h('td', {}, h('code', {}, `${gh.owner.toLowerCase()}.github.io`)))] : [h('tr', {}, h('td', {}, 'CNAME'), h('td', {}, d.split('.')[0]), h('td', {}, h('code', {}, `${gh.owner.toLowerCase()}.github.io`)))])),
      h('p', { class: 'note' }, 'DNS changes can take from a few minutes up to 24 hours. A “www” address (CNAME) is the simplest; an apex/root domain needs the A records above. Always double-check the current values in GitHub’s custom-domain documentation.'));
    body.append(h('div', { class: 'sub' }, '3. Verify connection & HTTPS'), h('div', { id: 'dh' }, h('button', { class: 'btn', onclick: verify }, 'Check domain status now')));
    if (dom) verify();
    async function save() {
      const v = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(v)) return toast('Enter a valid domain such as www.example.com', 'err');
      try {
        const cur = await gh.getFile('CNAME'); await gh.putFile('CNAME', v + '\n', 'Set custom domain ' + v, cur?.sha);
        await gh.setPagesDomain(v, false); app.S.cfg.cname = v; app.updatePubUI(); toast('Domain saved. Add the DNS records, then press “Check domain status”.', 'ok', 6000); draw();
      } catch (e) { toast(e.message, 'err', 7000); }
    }
    async function remove() {
      if (!(await confirmDlg('Disconnect domain', 'Your site will return to its github.io address.', 'Disconnect', true))) return;
      try { const cur = await gh.getFile('CNAME'); if (cur) await gh.deleteFile('CNAME', cur.sha, 'Remove custom domain'); await gh.setPagesDomain(null); app.S.cfg.cname = ''; app.updatePubUI(); draw(); } catch (e) { toast(e.message, 'err', 7000); }
    }
    async function verify() {
      const box = $('#dh', body); box.innerHTML = ''; box.append(h('p', { class: 'muted' }, 'Checking with GitHub…'));
      try {
        const [hl, p2] = await Promise.all([gh.pagesHealth(), gh.pagesInfo()]); box.innerHTML = '';
        const dm = hl?.domain, st = (ok, t, bad) => h('div', { class: 'step ' + (ok ? 'ok' : 'bad') }, h('span', { class: 's' }, ok ? '✓' : '!'), h('div', {}, t, bad && !ok ? h('div', { class: 'muted' }, bad) : null));
        if (!dm) box.append(h('p', {}, 'GitHub has no health data yet. Save the domain first, add DNS records, then try again in a few minutes.'));
        else box.append(st(!!dm.dns_resolves, 'DNS resolves to GitHub Pages', 'The DNS records are missing or have not propagated yet.'), st(!!dm.is_served_by_pages, 'Domain is served by GitHub Pages', dm.reason || 'Wait for DNS to propagate.'), st(!!dm.is_https_eligible || !!dm.responds_to_https, 'HTTPS certificate available', 'GitHub issues the free certificate automatically after DNS works; this can take up to ~30 minutes.'), st(!!p2?.https_enforced, 'HTTPS enforced (visitors are redirected to https)', 'Press “Enforce HTTPS” once the certificate is ready.'));
        if (dm && !p2?.https_enforced) box.append(h('button', { class: 'btn primary sm', style: { marginTop: '10px' }, onclick: async () => { try { await gh.enforceHttps(); toast('HTTPS enforced', 'ok'); draw(); } catch (e) { toast(e.message, 'err', 7000); } } }, 'Enforce HTTPS'));
        box.append(h('button', { class: 'btn sm', style: { marginTop: '10px', marginLeft: '6px' }, onclick: verify }, 'Re-check'));
      } catch (e) { box.innerHTML = ''; box.append(h('p', {}, e.message)); }
    }
  }
  draw();
}
const siteBase = gh => `https://${gh.owner.toLowerCase()}.github.io${gh.repo.toLowerCase() === gh.owner.toLowerCase() + '.github.io' ? '' : '/' + gh.repo}/`;

// ---------------------------------------------------------------- payments (no server → payment links)
function payments(app) {
  const site = app.S.site, items = [];
  for (const p of site.pages) for (const s of p.sections || []) for (const e of s.items || []) if (e.type === 'button' || (e.type === 'card' && (e.props.btnLabel || e.props.price))) items.push({ e, page: p.title, name: e.type === 'card' ? e.props.title : e.props.label });
  const base = siteBase(app.gh()), pp = id => { const p = site.pages.find(x => x.id === id); return p ? base.replace(/\/$/, '') + pagePath(site, p) : ''; };
  site.payments ||= {};
  const tbl = h('table', { class: 't' }, h('tr', {}, h('th', {}, 'Button / card'), h('th', {}, 'Page'), h('th', {}, 'Payment link')),
    ...items.map(it => { const i = h('input', { class: 'inp', value: it.e.props.payLink || '', placeholder: 'https://… (empty = normal link)' }); i.onchange = () => { it.e.props.payLink = i.value.trim() || undefined; if (!it.e.props.payLink) delete it.e.props.payLink; app.render(); app.commit(); }; return h('tr', {}, h('td', {}, (it.name || '(untitled)').replace(/<[^>]*>/g, '')), h('td', {}, it.page), h('td', {}, i)); }));
  const pageSel = k => fld({ t: 'sel', k, l: k === 'successPageId' ? 'Success page (set this as the “after payment” URL at your provider)' : 'Failure page', o: [['', '— none —'], ...site.pages.map(p => [p.id, p.title])] }, site.payments, () => { app.commit(); });
  modal('Payments', h('div', {}, h('div', { class: 'note' }, h('strong', {}, 'How payments work on a GitHub-only website. '), 'GitHub Pages cannot run server code, so no gateway secret key can be stored safely and a payment cannot be verified by this website. Instead, create a ', h('em', {}, 'payment link / payment button'), ' in your payment provider’s dashboard (for example Razorpay Payment Links, which are free to create) and paste it below. Visitors pay on the provider’s secure page; confirmations, receipts, refunds, subscriptions and the list of orders are managed in the provider’s dashboard.'),
    h('p', { class: 'note' }, '✔ No secret keys are ever stored in this website or repository.  ✔ The success page does not claim a payment is confirmed — only the provider can confirm that.  ✔ Test first: create a ', h('strong', {}, 'test-mode'), ' link, try it, then replace it with the live link.'),
    h('div', { class: 'sub' }, 'Payment links'), items.length ? tbl : h('p', { class: 'muted' }, 'No buttons or cards found yet.'), h('div', { class: 'sub' }, 'Return pages'), pageSel('successPageId'), h('p', { class: 'note' }, 'Success URL: ', h('code', {}, pp(site.payments.successPageId) || '—')), pageSel('failurePageId'), h('p', { class: 'note' }, 'Failure URL: ', h('code', {}, pp(site.payments.failurePageId) || '—'))), { wide: true, buttons: [{ label: 'Done', kind: 'primary' }] });
}

// ---------------------------------------------------------------- media library
async function media(app) {
  const gh = app.gh(), body = h('div', {}, h('p', { class: 'muted' }, 'Loading…')), usage = JSON.stringify(app.S.site) + app.S.publishedText;
  modal('Media library', body, { wide: true, buttons: [{ label: 'Close' }] });
  async function draw() {
    let files; try { files = (await gh.listDir('media')).filter(f => f.type === 'file' && f.name !== '.gitkeep'); } catch (e) { body.innerHTML = e.message; return; }
    body.innerHTML = ''; const total = files.reduce((a, f) => a + f.size, 0);
    body.append(h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } }, h('button', { class: 'btn primary', onclick: async () => { const fs = await pickFiles('image/*,video/mp4,video/webm,video/quicktime', true); for (const f of fs) { try { await uploadFile(f); } catch {} } draw(); } }, '⬆ Upload files'), h('span', { class: 'muted' }, `${files.length} files · ${fmtSize(total)} used in your repository (GitHub recommends keeping a repository under ~1 GB). Images are compressed automatically; videos up to 25 MB — for longer videos use a YouTube/Vimeo link.`)));
    const grid = h('div', { class: 'media-grid' }); body.append(grid);
    for (const f of files) { const path = '/media/' + f.name, used = usage.includes(path);
      grid.append(h('div', { class: 'media-item', style: { cursor: 'default' } }, mediaKind(f.name) === 'video' ? h('div', { class: 'vid' }, '🎬') : h('img', { src: mediaSrc(path), alt: f.name, loading: 'lazy' }), h('span', {}, f.name + ' · ' + fmtSize(f.size)),
        h('div', { style: { display: 'flex', gap: '4px', padding: '0 6px 6px', alignItems: 'center' } }, h('button', { class: 'btn sm', onclick: () => copy(path) }, 'Copy path'), h('button', { class: 'btn sm danger', onclick: async () => { if (!(await confirmDlg('Delete file', used ? `“${f.name}” is used on the website. Deleting it will break that image/video.` : `Delete “${f.name}”?`, 'Delete', true))) return; try { await gh.deleteFile('media/' + f.name, f.sha, 'Delete ' + f.name); mediaDel(path); draw(); } catch (e) { toast(e.message, 'err', 6000); } } }, '🗑'), used ? h('span', { class: 'tag' }, 'in use') : null))); }
    fixMedia(grid);
  }
  draw();
}

// ---------------------------------------------------------------- versions & backup
async function versions(app) {
  const gh = app.gh(), body = h('div', {}, h('p', { class: 'muted' }, 'Loading history from GitHub…'));
  modal('Versions & backup', body, { wide: true, buttons: [{ label: 'Close' }] });
  async function list(path, title) {
    let commits = []; try { commits = await gh.history(path, 25); } catch (e) { return h('p', {}, e.message); }
    return h('div', {}, h('div', { class: 'sub' }, title), commits.length ? h('table', { class: 't' }, ...commits.map(c => h('tr', {}, h('td', {}, fmtDate(c.commit.author.date)), h('td', {}, c.commit.message.split('\n')[0]), h('td', {}, h('button', { class: 'btn sm', onclick: async () => {
      if (!(await confirmDlg('Restore version', 'Load this version into the editor as your current draft? Your present draft stays in the Undo history until you close the editor.', 'Restore into draft'))) return;
      try { const t = await gh.fileAt(path, c.sha); validateSite(JSON.parse(t)); app.commit(); app.restore(JSON.stringify(JSON.parse(t), null, 1)); toast('Version loaded into the draft. Review it, then publish.', 'ok', 6000); } catch (e) { toast('Could not restore: ' + e.message, 'err', 6000); } } }, 'Restore'))))) : h('p', { class: 'muted' }, 'No history yet.'));
  }
  body.innerHTML = '';
  body.append(h('p', { class: 'note' }, 'Every save and every publish is a Git commit in your repository, so nothing is ever lost. Restoring a version only changes your draft — the live site changes only when you publish.'));
  body.append(await list('content/site.json', 'Published versions'), await list('content/draft.json', 'Draft saves'));
  body.append(h('div', { class: 'sub' }, 'Backup & restore'), h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
    h('button', { class: 'btn primary', onclick: () => downloadBackup(app) }, '⬇ Download backup file (.json)'),
    h('button', { class: 'btn', onclick: async () => { const [f] = await pickFiles('application/json,.json'); if (!f) return; try { const b = JSON.parse(await f.text()); if (b.format !== 'webfiver-backup') throw new Error('Not a Webfiver backup file'); validateSite(b.draft); app.commit(); app.restore(JSON.stringify(b.draft, null, 1)); toast('Backup loaded into the draft. Review it, then publish.', 'ok', 6000); } catch (e) { toast(e.message, 'err', 6000); } } }, '⬆ Restore from backup file'),
    h('a', { class: 'btn', href: `https://github.com/${gh.owner}/${gh.repo}/archive/refs/heads/${gh.branch}.zip`, target: '_blank', rel: 'noopener' }, '⬇ Download whole repository (.zip)')),
    h('p', { class: 'note' }, 'Tip: keep a copy of the backup file / repository ZIP in your Google Drive. Your content, pages, themes and uploaded media all live in this repository, so a ZIP of it is a complete backup.'));
}
async function downloadBackup(app) {
  const gh = app.gh(); const files = await gh.listDir('media');
  const out = { format: 'webfiver-backup', v: 1, created: new Date().toISOString(), repo: gh.slug, draft: JSON.parse(app.S.lastJson), published: JSON.parse(app.S.publishedText), live: app.S.live, media: files.filter(f => f.type === 'file').map(f => ({ name: f.name, size: f.size })), note: 'Media files are stored in the repository /media folder (download the repository ZIP to keep them).' };
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })), download: `webfiver-backup-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); toast('Backup downloaded', 'ok');
}

// ---------------------------------------------------------------- account & security
async function account(app) {
  const gh = app.gh(), body = h('div', {}, h('p', { class: 'muted' }, 'Loading…')); modal('Account & security', body, { wide: true, buttons: [{ label: 'Close' }] });
  let me, emails, collabs; try { [me, emails, collabs] = await Promise.all([gh.whoami(), gh.userEmails(), gh.collaborators()]); } catch (e) { body.innerHTML = e.message; return; }
  const email = (emails || []).find(x => x.primary)?.email || me.email;
  body.innerHTML = '';
  body.append(h('dl', { class: 'kv' }, ...row('Signed in as', `${me.login}${me.name ? ' (' + me.name + ')' : ''}`), ...row('Account email', email || 'Not available — GitHub only shares it if it is public, or if the token has “Email addresses: read” permission.'), ...row('Repository', h('a', { href: `https://github.com/${gh.slug}`, target: '_blank', rel: 'noopener' }, gh.slug + ' (' + gh.branch + ')')), ...row('This device', 'Token stored encrypted with your passcode; it is never sent anywhere except api.github.com.')));
  const passBtn = h('button', { class: 'btn', onclick: changePass }, '🔑 Change editor passcode'), tokBtn = h('button', { class: 'btn', onclick: changeToken }, '🔁 Replace GitHub token');
  body.append(h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' } }, passBtn, tokBtn, h('button', { class: 'btn danger', onclick: async () => { if (await confirmDlg('Sign out this device', 'The encrypted token is removed from this browser. Your website and drafts are unaffected.', 'Sign out', true)) { Vault.clear(); location.reload(); } } }, '⏏ Sign out of this device')));
  body.append(h('div', { class: 'sub' }, 'Authorized editors'), collabs ? h('table', { class: 't' }, ...collabs.map(c => h('tr', {}, h('td', {}, c.login), h('td', {}, c.role_name || (c.permissions?.admin ? 'admin' : c.permissions?.push ? 'write' : 'read'))))) : h('p', { class: 'muted' }, 'Collaborator list not available for this token.'),
    h('p', { class: 'note' }, 'Anyone you add as a collaborator with write access can open this editor with their own GitHub token. Manage them in ', h('a', { href: `https://github.com/${gh.slug}/settings/access`, target: '_blank', rel: 'noopener' }, 'repository settings → Collaborators'), '.'));
  body.append(h('div', { class: 'sub' }, 'Sessions & recovery'), h('p', { class: 'note' }, 'GitHub, not this website, controls access. To sign out everywhere (all devices), revoke the token at ', h('a', { href: 'https://github.com/settings/personal-access-tokens', target: '_blank', rel: 'noopener' }, 'GitHub → Fine-grained tokens'), '. If you forget the passcode or lose a device: open /edit/ on any computer, choose “Reconnect”, paste a new token and set a new passcode — your content is safe in GitHub.'));
  function changePass() {
    const cur = h('input', { class: 'inp', type: 'password' }), n1 = h('input', { class: 'inp', type: 'password' }), n2 = h('input', { class: 'inp', type: 'password' });
    modal('Change passcode', h('div', {}, h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Current passcode'), cur), h('label', { class: 'f' }, h('span', { class: 'fl' }, 'New passcode (min 8 characters)'), n1), h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Repeat new passcode'), n2)), { buttons: [{ label: 'Cancel' }, { label: 'Change', kind: 'primary', onclick: async () => {
      try { if (n1.value.length < 8 || n1.value !== n2.value) throw new Error('New passcodes must match and be at least 8 characters'); const v = await Vault.open(cur.value); await Vault.save(v, n1.value); toast('Passcode changed', 'ok'); } catch (e) { toast(e.message, 'err'); return false; } } }] });
  }
  function changeToken() {
    const pass = h('input', { class: 'inp', type: 'password' }), tok = h('input', { class: 'inp', type: 'password', placeholder: 'github_pat_…' });
    modal('Replace GitHub token', h('div', {}, h('label', { class: 'f' }, h('span', { class: 'fl' }, 'New token'), tok), h('label', { class: 'f' }, h('span', { class: 'fl' }, 'Your passcode'), pass)), { buttons: [{ label: 'Cancel' }, { label: 'Replace', kind: 'primary', onclick: async () => {
      try { const v = await Vault.open(pass.value); const g = new GhClient({ ...v, token: tok.value.trim() }); const info = await g.repoInfo(); if (!info.permissions?.push) throw new Error('This token cannot write to the repository'); await Vault.save({ ...v, token: g.token }, pass.value); toast('Token replaced — reloading', 'ok'); setTimeout(() => location.reload(), 900); } catch (e) { toast(e.message, 'err', 5000); return false; } } }] });
  }
}

// ---------------------------------------------------------------- setup & status
async function setup(app) {
  const gh = app.gh(), body = h('div', {}, h('p', { class: 'muted' }, 'Checking your GitHub setup…')); modal('Setup & status', body, { wide: true, buttons: [{ label: 'Close' }] });
  const checks = [];
  const add = (ok, title, detail, fix) => checks.push(h('div', { class: 'step ' + (ok ? 'ok' : 'bad') }, h('span', { class: 's' }, ok ? '✓' : '!'), h('div', { style: { flex: 1 } }, h('strong', {}, title), detail ? h('div', { class: 'muted' }, detail) : null), fix ? h('button', { class: 'btn sm', onclick: fix.fn }, fix.label) : null));
  try {
    const info = await gh.repoInfo(); add(!!info.permissions?.push, 'Token can write to ' + gh.slug, info.permissions?.push ? 'Contents write access confirmed.' : 'Give the token “Contents: Read and write”.');
    const [wf, pub, pi, runs] = await Promise.all([gh.getFile('.github/workflows/deploy.yml'), gh.getFile('content/site.json'), gh.pagesInfo(), gh.runs(1).catch(() => null)]);
    add(!!pub, 'Website content found (content/site.json)', pub ? '' : 'Upload the complete project files to the repository.');
    add(!!wf, 'Publishing workflow installed (.github/workflows/deploy.yml)', wf ? '' : 'Upload the .github folder from the project files.');
    add(!!pi && pi.build_type === 'workflow', 'GitHub Pages deploys from GitHub Actions', !pi ? 'Pages is not enabled.' : pi.build_type !== 'workflow' ? 'Pages source is “' + pi.build_type + '”.' : pi.html_url, !pi || pi.build_type !== 'workflow' ? { label: 'Fix now', fn: async () => { try { pi ? await gh.setPagesSource() : await gh.enablePages(); await gh.dispatch().catch(() => {}); toast('Fixed — build started', 'ok'); setup(app); } catch (e) { toast(e.message, 'err', 7000); } } } : null);
    if (runs === null) add(false, 'Publishing progress', 'The token has no “Actions” permission, so build progress cannot be shown (publishing still works).');
    else { const r = runs[0]; add(!r || r.conclusion === 'success' || r.status !== 'completed', r ? `Latest build: ${r.status === 'completed' ? r.conclusion : r.status}` : 'No build has run yet', r ? fmtDate(r.updated_at) : 'Publish once to create the first build.', r?.html_url ? { label: 'Open log', fn: () => window.open(r.html_url, '_blank', 'noopener') } : { label: 'Run build', fn: async () => { try { await gh.dispatch(); toast('Build started', 'ok'); } catch (e) { toast(e.message, 'err', 6000); } } }); }
  } catch (e) { add(false, 'Could not check', e.message); }
  body.innerHTML = ''; body.append(...checks, h('p', { class: 'note', style: { marginTop: '12px' } }, 'Live website: ', h('a', { href: app.siteUrl(), target: '_blank', rel: 'noopener' }, app.siteUrl())));
}
