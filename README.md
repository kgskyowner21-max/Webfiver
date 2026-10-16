# Webfiver website + built-in visual editor

A glassmorphism website you edit **visually in your browser** (like Google Sites) — and everything lives in **one GitHub repository**. No other service, server or database is used.

* **Public site:** `https://YOUR-USERNAME.github.io/`
* **Editor ("Developer Mode"):** `https://YOUR-USERNAME.github.io/edit/`

## How it works (so you can trust it)

| Part | Where it lives |
|---|---|
| Website content, pages, themes | `content/site.json` (published) and `content/draft.json` (your work in progress) |
| Images and videos you upload | `media/` folder in the repository |
| Version history / undo-for-everything | GitHub commit history (every save and publish is a commit) |
| Hosting | GitHub Pages (free) |
| Building the public pages | GitHub Actions (`.github/workflows/deploy.yml` runs `build.mjs`) when you press **Publish** |
| Editor login | Your GitHub token, encrypted in your browser with a passcode you choose |

**Draft vs Publish:** the editor saves your changes in the browser instantly and autosaves a *draft* to GitHub about every 12 seconds. The live website changes only when you press **Publish** (takes about a minute while GitHub builds it).

---

## One-time setup (about 15 minutes)

### 1. Create the repository
1. Sign in at github.com → **New repository**.
2. Name it exactly **`YOUR-USERNAME.github.io`** (e.g. `kalpeshgoswami.github.io`) so the site is served at the root address.
3. Choose **Public** (free GitHub Pages requires a public repository — see *Privacy notes* below). Click **Create repository**.

### 2. Upload the files — once
1. Unzip the project folder on your computer.
2. In the new repository click **Add file → Upload files**.
3. Open the unzipped folder, select **everything inside it** (the folders `assets`, `content`, `edit`, `.github` and the files `build.mjs`, `package.json`, `README.md`, …) and drag it all into the browser. Wait until every file shows, then click **Commit changes**.
4. Check that the repository now shows `.github/workflows/deploy.yml`. If your computer hid the `.github` folder and it is missing: click **Add file → Create new file**, type the name `.github/workflows/deploy.yml`, paste the contents of that file from the unzipped folder, and commit.

### 3. Turn on GitHub Pages
Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Then open the **Actions** tab; the first "Publish website" run starts by itself (or click *Run workflow*). When it is green, your site is live. (The editor's *Setup & status* screen can also do this step for you.)

### 4. Create your editor token (once per repository)
1. GitHub → profile picture → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access:** *Only select repositories* → pick your website repository.
3. **Repository permissions:** *Contents* = Read and write · *Pages* = Read and write · *Actions* = Read and write · *Metadata* = Read.
4. Pick an expiry (e.g. 1 year), generate, and **copy the token** (starts with `github_pat_`). GitHub shows it only once.

### 5. Open Developer Mode
Go to `https://YOUR-USERNAME.github.io/edit/` → enter `owner/repository`, paste the token, choose a **passcode** (at least 8 characters) → *Connect & open editor*.
The token is stored **encrypted with your passcode in that browser only**. Next time you only type the passcode.

---

## Using the editor on any computer
Open `/edit/` → first time on a new computer paste the token again (create a new token in GitHub if you did not save the old one) → choose a passcode. Your laptop is never needed.

**Top bar:** brand · undo/redo · desktop/tablet/mobile preview · website link + copy · save status · **Settings** · Preview · **Publish** (publish / unpublish / re-run build).
**Right panel:** **Insert** (elements and ready-made layouts) · **Pages** · **Themes** · **Properties** (appears when you select something).
**Canvas (left):** click any text to type; select words for the formatting bar (font, size, colour, bold, link…). Drag the ⠿ handle to move things, or drag blocks from the Insert panel.

### Settings menu
Website settings & SEO · Logo & brand (favicon, desktop/mobile logo size) · Domain · Payments · Media library · Versions & backup · Account & security · Setup & status.

### Custom domain
Settings → **Domain** → enter your domain → the editor tells you exactly which DNS records to add at your domain registrar (A records / CNAME) and checks GitHub's status, then turns on HTTPS. Activation depends on DNS, which can take from minutes to 24 hours.

---

## Things that work differently on a GitHub-only website (honest limits)

GitHub Pages serves static files; it cannot run server code. So:

* **Payments:** secret gateway keys cannot be kept safely and payments cannot be verified by the website. Create a **payment link / payment button** in your payment provider's dashboard (e.g. Razorpay Payment Links) and paste it into a button or card (*Properties → payment link*). Set the provider's "after payment" URL to the Success page address shown under Settings → Payments. **Order status is checked in your provider's dashboard** — the website never says "paid" based only on a browser redirect.
* **Contact form:** pressing Send opens the visitor's email app (or WhatsApp) with the message pre-filled. There is no in-site inbox. Set your email / WhatsApp number in Settings → Website settings.
* **Editor "password":** there is no server to check a password. Real security is GitHub itself: nobody can change the site without a token that has write access to your repository. The passcode protects the token on your computer. To revoke a lost device, delete the token in GitHub settings.
* **Uploads:** images up to 15 MB and videos up to 25 MB per file (images are compressed automatically in the browser). For long videos, paste a YouTube/Vimeo link instead.

## Privacy notes
* With free GitHub Pages the repository is **public**: anyone who knows where to look can read `content/draft.json`, so **do not put secrets or confidential unpublished text in drafts**. (A private repository with Pages needs a paid GitHub plan.)
* Never put the token, passwords or API keys into the website content. The token lives only in your browser's encrypted storage.
* The public pages load **nothing from other websites** (fonts are in `assets/fonts/`). Optional extras you add (YouTube embeds, Google Analytics ID, Maps) do contact those providers; the cookie banner is on by default for analytics.

---

## Backup, restore and "my laptop is gone"

**Everything is in the GitHub repository** (content, media, version history). To keep a second copy:
1. In the editor: **Settings → Versions & backup → Download whole repository (.zip)** (or GitHub → *Code → Download ZIP*) and **Download backup file (.json)**.
2. Upload both to a Google Drive folder named e.g. `Webfiver backup / 2026-10`. Repeat monthly or before big changes.

**Restore scenarios**
| Situation | What to do |
|---|---|
| Made a mistake in the editor | Press **Undo**, or **Settings → Versions & backup → Restore** an earlier version into the draft, review, then Publish. |
| Laptop lost / new computer | Go to `…/edit/`, create a new token in GitHub (step 4), connect. Nothing else is needed. |
| Forgot editor passcode | On the unlock screen click *Reconnect with a GitHub token*. |
| Token expired or leaked | GitHub → Developer settings → delete it, generate a new one, reconnect. |
| Repository deleted or GitHub account lost | Create a new repository, upload the unzipped Drive backup (step 2), turn on Pages (step 3). |
| Site looks broken after publishing | Actions tab → open the failed run for the reason; restore a previous version and publish again. |

## What is in the project
```
.github/workflows/deploy.yml   publishes the site on GitHub
build.mjs  package.json        turns content/site.json into the public pages
assets/                        site renderer, styles, fonts (self-hosted)
content/                       site.json, draft.json, state.json
edit/                          the visual editor (Developer Mode)
media/                         your uploaded images/videos (created on first upload)
tools/                         only needed to regenerate the starter content
```
