// Builds the public website into ./dist from content/site.json. Runs inside GitHub Actions (no other service needed).
// Usage: node build.mjs        (env: GITHUB_REPOSITORY=owner/repo is set automatically by GitHub Actions)
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { renderDocument, findPageByPath, pagePath, rebase, validateSite, esc } from './assets/render.js';

const read = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return d; } };
const site = validateSite(read('content/site.json'));
const state = read('content/state.json', { live: true });
const [owner = 'local', repo = 'site'] = (process.env.GITHUB_REPOSITORY || 'local/site').split('/');
const cname = existsSync('CNAME') ? readFileSync('CNAME', 'utf8').trim() : '';
// GitHub project pages live under /repo-name/, user pages and custom domains live at the root.
const base = cname || repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '' : `/${repo}`;
const origin = cname ? `https://${cname}` : `https://${owner.toLowerCase()}.github.io${base}`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
for (const d of ['assets', 'edit', 'media']) if (existsSync(d)) cpSync(d, join('dist', d), { recursive: true });
if (cname) writeFileSync('dist/CNAME', cname + '\n');
writeFileSync('dist/.nojekyll', '');
writeFileSync('dist/config.json', JSON.stringify({ owner, repo, base, cname, branch: process.env.GITHUB_REF_NAME || 'main' }));

const out = (path, html) => { const f = join('dist', path); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); };
const holding = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(site.settings.name)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px;background:#09090d;color:#f8fafc;font-family:system-ui,sans-serif}p{opacity:.7}</style></head><body><div><h1>${esc(site.settings.name)}</h1><p>This website is currently unpublished. Please check back soon.</p></div></body></html>`;

if (state.live === false) {
  out('index.html', holding); out('404.html', holding);
  out('robots.txt', 'User-agent: *\nDisallow: /\n');
  console.log('Site is UNPUBLISHED — wrote holding page only.');
} else {
  const pages = site.pages.filter(p => p.visible !== false);
  for (const p of pages) {
    const html = rebase(renderDocument(site, p, { origin, base }), base);
    const path = pagePath(site, p);
    out(path === '/' ? 'index.html' : `${path.slice(1)}/index.html`, html);
  }
  const nf = { id: '_404', title: 'Page not found', slug: '404', noindex: true, sections: [{ id: 's404', type: 'section', props: { cols: 1, width: 'narrow', padTop: 140, padBottom: 140 }, items: [
    { id: 'e404a', type: 'heading', props: { html: 'Page not found', level: 1 }, style: { align: 'center' }, span: 1 },
    { id: 'e404b', type: 'text', props: { html: '<p>The page you are looking for does not exist or is not published.</p>' }, style: { align: 'center', color: 'var(--muted)' }, span: 1 },
    { id: 'e404c', type: 'button', props: { label: 'Back to home', href: '/', variant: 'primary' }, style: { align: 'center' }, span: 1 }] }] };
  out('404.html', rebase(renderDocument(site, nf, { origin, base }), base));
  const urls = pages.filter(p => !p.noindex && !p.landing).map(p => `<url><loc>${esc(origin + pagePath(site, p))}</loc></url>`).join('');
  out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  out('robots.txt', `User-agent: *\nAllow: /\nDisallow: /edit/\nSitemap: ${origin}/sitemap.xml\n`);
  console.log(`Built ${pages.length} pages → dist/  (origin ${origin}, base "${base}")`);
}
