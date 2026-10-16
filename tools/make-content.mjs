// Generates the starter content files. Run once: node tools/make-content.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { defaultSite } from './seed.js';
import { validateSite } from '../assets/render.js';
const site = validateSite(defaultSite());
mkdirSync('content', { recursive: true });
const json = JSON.stringify(site, null, 1);
writeFileSync('content/site.json', json);
writeFileSync('content/draft.json', json);
writeFileSync('content/state.json', JSON.stringify({ live: true }, null, 1));
console.log('content written:', json.length, 'bytes,', site.pages.length, 'pages');
