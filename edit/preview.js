// Draft preview: renders the draft that is saved in this browser by the editor, exactly as the public build would.
import { renderDocument, findPageByPath, homePage, rebase, validateSite } from '../assets/render.js';

const cfg = await fetch('../config.json', { cache: 'no-store' }).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
const base = cfg.base || '';
let text = null;
try {
  const meta = JSON.parse(localStorage.getItem('wf_vault_v1') || 'null');
  const key = meta ? `wf_local_${meta.owner}/${meta.repo}` : null;
  text = key ? JSON.parse(localStorage.getItem(key) || 'null')?.text : null;
} catch {}
if (!text) {
  document.getElementById('msg').textContent = 'No draft found in this browser. Open the editor first, make a change, then press Preview.';
} else {
  const site = validateSite(JSON.parse(text));
  const want = new URLSearchParams(location.search).get('p') || '/';
  const page = findPageByPath(site, want) || homePage(site);
  const html = rebase(renderDocument(site, page, { origin: location.origin + base, base, preview: true }), base)
    .replace('</body>', '<div style="position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:999;background:#f59e0b;color:#111;font:600 13px system-ui;padding:7px 14px;border-radius:999px;box-shadow:0 4px 20px rgba(0,0,0,.4)">Draft preview — not published</div></body>');
  document.open(); document.write(html); document.close();
  // keep navigation inside the preview, and show locally-uploaded media that is not on the live site yet
  const { mediaGet } = await import('./ui.js');
  addEventListener('click', e => {
    const a = e.target.closest('a[href]'); if (!a) return;
    const u = new URL(a.href, location.href); if (u.origin !== location.origin) return;
    let p = u.pathname; if (base && p.startsWith(base)) p = p.slice(base.length) || '/';
    if (/^\/(assets|media|edit)\//.test(p)) return;
    e.preventDefault(); location.href = 'preview.html?p=' + encodeURIComponent(p) + u.hash;
  });
  document.querySelectorAll('img[src*="/media/"],video[src*="/media/"]').forEach(n => n.addEventListener('error', async () => { const m = /\/media\/.+$/.exec(new URL(n.getAttribute('src'), location.href).pathname); const b = m && await mediaGet(m[0]); if (b) n.src = URL.createObjectURL(b); }, { once: true }));
}
