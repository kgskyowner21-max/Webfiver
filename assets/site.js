// Runtime behaviour shared by the public site and the editor canvas:
// carousels, scroll animations, nav toggle, contact forms, Razorpay checkout, cookie banner.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function initCarousel(el, editor) {
  if (el.dataset.init) return; el.dataset.init = '1';
  let cfg; try { cfg = JSON.parse(el.dataset.cfg); } catch { return; }
  const track = el.querySelector('.car-track'), slides = [...track.children], dotsBox = el.querySelector('.car-dots');
  const fade = cfg.effect === 'fade'; let idx = 0, per = 1, timer = null;
  if (fade) el.classList.add('fade');
  const perView = () => { const w = (el.closest('.site') || el).clientWidth; return fade ? 1 : Math.min(slides.length, w <= 700 ? cfg.m : w <= 980 ? cfg.t : cfg.d) || 1; };
  const max = () => Math.max(0, slides.length - per);
  const buildDots = () => {
    if (!dotsBox) return; dotsBox.innerHTML = '';
    for (let i = 0; i <= max(); i++) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Go to slide ' + (i + 1)); b.onclick = () => { go(i); restart(); }; dotsBox.append(b); }
  };
  function go(i, animate = true) {
    if (i > max()) i = cfg.loop ? 0 : max(); if (i < 0) i = cfg.loop ? max() : 0; idx = i;
    if (fade) slides.forEach((s, k) => s.classList.toggle('on', k === idx));
    else { if (!animate) track.style.transition = 'none'; const sw = slides[0].getBoundingClientRect().width + cfg.gap; track.style.transform = `translateX(${-idx * sw}px)`; if (!animate) { track.offsetWidth; track.style.transition = ''; } }
    dotsBox?.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === idx));
  }
  function layout() {
    per = perView();
    if (!fade) slides.forEach(s => { s.style.flex = `0 0 calc((100% - ${(per - 1) * cfg.gap}px) / ${per})`; });
    buildDots(); go(Math.min(idx, max()), false);
  }
  const restart = () => { clearInterval(timer); if (cfg.auto && !reduce && !editor && slides.length > per) timer = setInterval(() => go(idx + 1), cfg.interval * 1000); };
  el.querySelector('.car-prev')?.addEventListener('click', () => { go(idx - 1); restart(); });
  el.querySelector('.car-next')?.addEventListener('click', () => { go(idx + 1); restart(); });
  el.addEventListener('mouseenter', () => clearInterval(timer)); el.addEventListener('mouseleave', restart);
  let x0 = null; el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { go(idx + (dx < 0 ? 1 : -1)); restart(); } x0 = null; });
  new ResizeObserver(() => { if (el.isConnected) layout(); }).observe(el);
  layout(); restart();
}

export function initSite(root = document, { editor = false } = {}) {
  root.querySelectorAll('.wf-car').forEach(c => initCarousel(c, editor));
  if (editor) return;
  document.documentElement.classList.add('js-anim');
  const animEls = root.querySelectorAll('.el[class*=" a-"]:not(.in)');
  if (reduce || !('IntersectionObserver' in window)) animEls.forEach(e => e.classList.add('in'));
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 }); animEls.forEach(e => io.observe(e)); }
  root.querySelectorAll('video[data-autoplay]').forEach(v => { if (!reduce) v.play().catch(() => {}); });
}

if (document.body?.dataset.public) {
  initSite(document);
  const base = document.body.dataset.base || '';
  document.addEventListener('click', e => {
    const t = e.target.closest('.nav-toggle'); if (t) { const n = t.closest('.wf-nav'); const o = n.classList.toggle('open'); t.setAttribute('aria-expanded', o); }
  });
  // Contact form: no server is needed — the visitor's email app or WhatsApp opens with the message filled in.
  document.addEventListener('submit', e => {
    const f = e.target.closest('.wf-form'); if (!f) return; e.preventDefault();
    const msg = f.querySelector('.form-msg'); msg.className = 'form-msg';
    for (const el of f.querySelectorAll('[required]')) if (!String(el.value).trim()) { msg.textContent = 'Please fill in: ' + el.name; msg.classList.add('err'); el.focus(); return; }
    const dest = f.dataset.dest;
    if (!dest) { msg.textContent = 'This form is not connected yet. Please use the contact details on this page.'; msg.classList.add('err'); return; }
    const lines = [...new FormData(f)].map(([k, v]) => `${k}: ${v}`).join('\n');
    const url = f.dataset.mode === 'whatsapp'
      ? `https://wa.me/${dest}?text=${encodeURIComponent(f.dataset.subject + '\n\n' + lines)}`
      : `mailto:${dest}?subject=${encodeURIComponent(f.dataset.subject)}&body=${encodeURIComponent(lines)}`;
    msg.textContent = msg.dataset.ok; msg.classList.add('ok');
    if (f.dataset.mode === 'whatsapp') window.open(url, '_blank', 'noopener'); else location.href = url;
  });
  const here = (location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname).replace(/\/$/, '') || '/';
  document.querySelectorAll('.wf-nav a').forEach(a => { const p = new URL(a.href, location.origin).pathname; if ((p.startsWith(base) ? p.slice(base.length) : p).replace(/\/$/, '') === here || ((p.replace(/\/$/, '') || '/') === (base || '/') && here === '/')) a.setAttribute('aria-current', 'page'); });
  // cookie consent + optional Google Analytics (only when an Analytics ID is set in Settings)
  const ga = document.body.dataset.ga, banner = document.body.dataset.cookie === '1';
  const loadGA = () => { if (!ga || window.__ga) return; window.__ga = 1; const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga; document.head.append(s); window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); }; gtag('js', new Date()); gtag('config', ga, { anonymize_ip: true }); };
  let consent = null; try { consent = localStorage.getItem('wf_consent'); } catch {}
  if (consent === 'yes' || (!banner && ga)) loadGA();
  else if (banner && !consent && ga) {
    const b = document.createElement('div'); b.className = 'wf-cookie'; b.setAttribute('role', 'dialog');
    b.innerHTML = '<p>We use cookies for anonymous analytics. You can accept or decline.</p><button class="btn btn-secondary" data-c="no">Decline</button><button class="btn btn-primary" data-c="yes">Accept</button>';
    b.onclick = e => { const c = e.target.dataset?.c; if (!c) return; try { localStorage.setItem('wf_consent', c); } catch {} b.remove(); if (c === 'yes') loadGA(); };
    document.body.append(b);
  }
}
