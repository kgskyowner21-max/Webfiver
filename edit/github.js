// Everything the editor knows about the outside world is GitHub: this file is the whole "backend".
// - GhClient: thin wrapper over api.github.com (contents, pages, actions, commits)
// - Vault: stores the GitHub token in this browser, encrypted with the editor passcode (PBKDF2 + AES-GCM)
const API = 'https://api.github.com';
const enc = new TextEncoder(), dec = new TextDecoder();

export class GhError extends Error { constructor(msg, status, data) { super(msg); this.status = status; this.data = data; } }

export const b64encode = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
export const b64decode = b64 => Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0));
const toBytes = v => (typeof v === 'string' ? enc.encode(v) : v instanceof Uint8Array ? v : new Uint8Array(v));

export class GhClient {
  constructor({ token, owner, repo, branch = 'main' }) { Object.assign(this, { token, owner, repo, branch }); }
  get slug() { return `${this.owner}/${this.repo}`; }
  async req(path, { method = 'GET', body, accept = 'application/vnd.github+json', raw = false } = {}) {
    let r;
    try {
      r = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + this.token, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    } catch { throw new GhError('Cannot reach GitHub — check your internet connection.', 0); }
    if (raw && r.ok) return r;
    const text = await r.text(); let data = {}; try { data = JSON.parse(text); } catch { data = { message: text }; }
    if (!r.ok) {
      let msg = data.message || 'GitHub error ' + r.status;
      if (r.status === 401) msg = 'GitHub rejected the token (expired or revoked). Sign in again with a new token.';
      else if (r.status === 403 && /rate limit/i.test(msg)) msg = 'GitHub rate limit reached. Wait a few minutes and try again.';
      else if (r.status === 403) msg = 'This token does not have permission for that action (' + msg + ').';
      throw new GhError(msg, r.status, data);
    }
    return data;
  }
  repoPath(p = '') { return `/repos/${this.owner}/${this.repo}${p}`; }
  whoami() { return this.req('/user'); }
  repoInfo() { return this.req(this.repoPath()); }

  async getFile(path) {
    try {
      const j = await this.req(this.repoPath(`/contents/${encodeURI(path)}?ref=${encodeURIComponent(this.branch)}`));
      if (Array.isArray(j)) throw new GhError(path + ' is a folder', 400);
      let bytes;
      if (j.content && j.encoding === 'base64') bytes = b64decode(j.content);
      else { const b = await this.req(this.repoPath(`/git/blobs/${j.sha}`)); bytes = b64decode(b.content); }
      return { sha: j.sha, bytes, text: dec.decode(bytes), size: j.size };
    } catch (e) { if (e.status === 404) return null; throw e; }
  }
  async putFile(path, content, message, sha) {
    const body = { message, content: b64encode(toBytes(content)), branch: this.branch };
    if (sha) body.sha = sha;
    const j = await this.req(this.repoPath(`/contents/${encodeURI(path)}`), { method: 'PUT', body });
    return { sha: j.content.sha, commit: j.commit.sha };
  }
  deleteFile(path, sha, message) { return this.req(this.repoPath(`/contents/${encodeURI(path)}`), { method: 'DELETE', body: { message, sha, branch: this.branch } }); }
  async listDir(path) { try { const j = await this.req(this.repoPath(`/contents/${encodeURI(path)}?ref=${encodeURIComponent(this.branch)}`)); return Array.isArray(j) ? j : []; } catch (e) { if (e.status === 404) return []; throw e; } }
  history(path, n = 30) { return this.req(this.repoPath(`/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(this.branch)}&per_page=${n}`)); }
  async fileAt(path, ref) { const j = await this.req(this.repoPath(`/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`)); return j.content ? dec.decode(b64decode(j.content)) : dec.decode(b64decode((await this.req(this.repoPath(`/git/blobs/${j.sha}`))).content)); }

  // ---- GitHub Pages ----
  async pagesInfo() { try { return await this.req(this.repoPath('/pages')); } catch (e) { if (e.status === 404) return null; throw e; } }
  enablePages() { return this.req(this.repoPath('/pages'), { method: 'POST', body: { build_type: 'workflow' } }); }
  setPagesSource() { return this.req(this.repoPath('/pages'), { method: 'PUT', body: { build_type: 'workflow' } }); }
  setPagesDomain(cname, https = true) { return this.req(this.repoPath('/pages'), { method: 'PUT', body: cname ? { cname, build_type: 'workflow', https_enforced: https } : { cname: null, build_type: 'workflow' } }); }
  enforceHttps() { return this.req(this.repoPath('/pages'), { method: 'PUT', body: { https_enforced: true } }); }
  async pagesHealth() { try { return await this.req(this.repoPath('/pages/health')); } catch (e) { if (e.status === 404 || e.status === 422) return null; throw e; } }

  // ---- Actions (publishing progress) ----
  async runs(n = 5) { return (await this.req(this.repoPath(`/actions/runs?per_page=${n}&branch=${encodeURIComponent(this.branch)}`))).workflow_runs || []; }
  dispatch(file = 'deploy.yml') { return this.req(this.repoPath(`/actions/workflows/${file}/dispatches`), { method: 'POST', body: { ref: this.branch } }); }
  async userEmails() { try { return await this.req('/user/emails'); } catch { return null; } }
  async collaborators() { try { return await this.req(this.repoPath('/collaborators?per_page=30')); } catch { return null; } }
}

// ---------- vault: token encrypted at rest in this browser ----------
const VKEY = 'wf_vault_v1';
async function deriveKey(pass, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 250000 }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export const Vault = {
  exists() { try { return !!localStorage.getItem(VKEY); } catch { return false; } },
  meta() { try { const v = JSON.parse(localStorage.getItem(VKEY)); return v ? { owner: v.owner, repo: v.repo, branch: v.branch } : null; } catch { return null; } },
  async save({ token, owner, repo, branch }, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(pass, salt), enc.encode(token));
    localStorage.setItem(VKEY, JSON.stringify({ owner, repo, branch, salt: b64encode(salt), iv: b64encode(iv), ct: b64encode(new Uint8Array(ct)) }));
  },
  async open(pass) {
    const v = JSON.parse(localStorage.getItem(VKEY));
    try {
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64decode(v.iv) }, await deriveKey(pass, b64decode(v.salt)), b64decode(v.ct));
      return { token: dec.decode(pt), owner: v.owner, repo: v.repo, branch: v.branch };
    } catch { throw new Error('Wrong passcode'); }
  },
  clear() { try { localStorage.removeItem(VKEY); } catch {} },
};
