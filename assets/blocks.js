// Element defaults, ready-made content blocks, theme presets and page templates.
// Used by the editor (Insert tab) and by the first-run seed.
import { uid } from './render.js';

export const el = (type, props = {}, style = {}, span = 1) => ({ id: uid('e'), type, props, style, span });
export const sec = (items, props = {}) => ({ id: uid('s'), type: 'section', props: { cols: 1, ...props }, items });

export const THEMES = {
  midnight: { name: 'Midnight Glass', v: { primary: '#8B5CF6', secondary: '#22D3EE', accent: '#A855F7', bg: '#09090D', bg2: '#171722', text: '#F8FAFC', heading: '#F8FAFC', muted: '#A1A1AA', glass: 'rgba(255,255,255,.06)', glassBorder: 'rgba(255,255,255,.14)', headingFont: 'Space Grotesk', bodyFont: 'Inter', radius: 18, blur: 18, space: 80, gap: 24, maxw: 1180, fontSize: 16, shadow: 'soft', btnStyle: 'gradient', linkStyle: 'underline', headerStyle: 'glass', footerStyle: 'glass', headerSticky: true } },
  aurora: { name: 'Aurora Light', v: { primary: '#6366F1', secondary: '#06B6D4', accent: '#A855F7', bg: '#F4F6FF', bg2: '#E8ECFF', text: '#0F172A', heading: '#0F172A', muted: '#475569', glass: 'rgba(255,255,255,.62)', glassBorder: 'rgba(99,102,241,.2)', headingFont: 'Poppins', bodyFont: 'Inter', radius: 20, blur: 16, space: 80, gap: 24, maxw: 1180, fontSize: 16, shadow: 'soft', btnStyle: 'gradient', linkStyle: 'underline', headerStyle: 'glass', footerStyle: 'solid', headerSticky: true } },
  ocean: { name: 'Deep Ocean', v: { primary: '#0EA5E9', secondary: '#14B8A6', accent: '#38BDF8', bg: '#041421', bg2: '#0B2538', text: '#E6F4FF', heading: '#FFFFFF', muted: '#8FB3CC', glass: 'rgba(255,255,255,.07)', glassBorder: 'rgba(125,211,252,.22)', headingFont: 'Outfit', bodyFont: 'DM Sans', radius: 16, blur: 20, space: 80, gap: 24, maxw: 1180, fontSize: 16, shadow: 'soft', btnStyle: 'gradient', linkStyle: 'hover', headerStyle: 'glass', footerStyle: 'glass', headerSticky: true } },
  rose: { name: 'Rose Quartz', v: { primary: '#EC4899', secondary: '#F59E0B', accent: '#F472B6', bg: '#14080F', bg2: '#25111C', text: '#FFF1F7', heading: '#FFFFFF', muted: '#C9A0B4', glass: 'rgba(255,255,255,.06)', glassBorder: 'rgba(244,114,182,.25)', headingFont: 'Playfair Display', bodyFont: 'Inter', radius: 22, blur: 18, space: 88, gap: 24, maxw: 1180, fontSize: 16, shadow: 'glow', btnStyle: 'solid', linkStyle: 'underline', headerStyle: 'glass', footerStyle: 'glass', headerSticky: true } },
};

// ---- single elements (Insert → Basic elements) ----
export const ELEMENTS = {
  heading: () => el('heading', { html: 'Your heading', level: 2 }),
  text: () => el('text', { html: '<p>Write something here. Select any word to format it or attach a link.</p>' }),
  image: () => el('image', { src: '', alt: '', ratio: 'auto', radius: 16, shadow: 'none', fit: 'cover', fx: 50, fy: 50 }),
  gallery: () => el('gallery', { mode: 'grid', images: [], cols: 3, colsT: 2, colsM: 1, ratio: '4:3', radius: 12, gap: 12, perD: 3, perT: 2, perM: 1, auto: true, interval: 4, effect: 'slide', arrows: true, dots: true, loop: true }),
  carousel: () => el('gallery', { mode: 'carousel', images: [], perD: 1, perT: 1, perM: 1, auto: true, interval: 4, effect: 'slide', arrows: true, dots: true, loop: true, ratio: '16:9', radius: 16, gap: 12, cols: 3, colsT: 2, colsM: 1 }),
  video: () => el('video', { src: '', poster: '', ratio: '16:9', controls: true, autoplay: false, loop: false }),
  button: () => el('button', { label: 'Click me', href: '', variant: 'primary', newTab: false }),
  hyperlink: () => el('text', { html: '<p><a href="https://example.com">Edit this link text</a></p>' }),
  divider: () => el('divider', { look: 'line' }),
  spacer: () => el('spacer', { h: 48 }),
  embed: () => el('embed', { url: '', ratio: '16:9', title: '' }),
  card: () => el('card', { image: '', imagePh: true, title: 'Card title', desc: '<p>Short description.</p>', price: '', btnLabel: '', href: '', ratio: '16:9' }),
  stat: () => el('stat', { value: '100+', label: 'Happy clients' }),
  faq: () => el('faq', { items: [{ q: 'A frequently asked question?', a: '<p>The answer goes here.</p>' }] }, {}, 1),
  form: () => el('form', { btnLabel: 'Send message', success: 'Thank you! Your message has been sent.', fields: [{ label: 'Your name', type: 'text', required: true }, { label: 'Email address', type: 'email', required: true }, { label: 'Message', type: 'textarea', required: true }] }),
  logo: () => el('logo'),
  nav: () => el('nav'),
  payresult: () => el('payresult', { kind: 'success', title: 'Payment received', msg: 'Thank you! Your payment is being confirmed.' }),
};
export const newEl = t => ELEMENTS[t]();

const eyebrow = (t, span, al = 'center') => el('text', { html: `<p>${t}</p>` }, { size: 13, weight: 600, ls: 2, tt: 'uppercase', color: 'var(--secondary)', align: al, mb: -8 }, span);
const h2 = (t, span, al = 'center') => el('heading', { html: t, level: 2 }, { align: al }, span);
const sub = (t, span, al = 'center') => el('text', { html: `<p>${t}</p>` }, { color: 'var(--muted)', align: al, maxw: 70, ...(al === 'center' ? {} : {}) }, span);
const head = (e, t, s, cols, al = 'center') => [eyebrow(e, cols, al), h2(t, cols, al), ...(s ? [sub(s, cols, al)] : [])];
const card = (p, span = 1, st = {}) => el('card', { ratio: '16:9', ...p }, st, span);

const imgBlock = n => () => sec([
  ...head('GALLERY', n === 1 ? 'One image with title and description' : `${n} images with titles and descriptions`, '', n),
  ...Array.from({ length: n }, (_, i) => card({ image: '', imagePh: true, title: `Title ${i + 1}`, desc: '<p>Describe this image in a sentence or two.</p>', ratio: '4:3' })),
], { cols: n, ct: Math.min(n, 2) });

export const BLOCKS = [
  { id: 'hero', group: 'Layouts', name: 'Hero / banner', icon: '🌅', make: () => sec([eyebrow('YOUR TAGLINE HERE', 1), el('heading', { html: 'Build your digital presence.', level: 1 }, { align: 'center', size: 56 }), sub('A short, friendly sentence explaining what you offer and who it is for.', 1), el('button', { label: 'Get started', href: '', variant: 'primary' }, { align: 'center' }), ], { cols: 1, width: 'narrow', padTop: 130, padBottom: 110, bg: { type: 'glow' } }) },
  { id: 'image1', group: 'Layouts', name: '1 image + title + text', icon: '▣', make: imgBlock(1) },
  { id: 'image2', group: 'Layouts', name: '2 images + titles + text', icon: '▣▣', make: imgBlock(2) },
  { id: 'image3', group: 'Layouts', name: '3 images + titles + text', icon: '▣▣▣', make: imgBlock(3) },
  { id: 'image4', group: 'Layouts', name: '4 images + titles + text', icon: '▣▣▣▣', make: imgBlock(4) },
  { id: 'image5', group: 'Layouts', name: '5 images + titles + text', icon: '▣×5', make: imgBlock(5) },
  { id: 'products', group: 'Layouts', name: 'Product listing grid', icon: '🛍', make: () => sec([...head('PRODUCTS', 'Featured products', 'Image, name, short description, price and a button.', 3), ...[1, 2, 3].map(i => card({ image: '', imagePh: true, ratio: '1:1', title: `Product ${i}`, price: '₹999', desc: '<p>Short product description.</p>', btnLabel: 'Buy now', btnVariant: 'primary' }))], { cols: 3 }) },
  { id: 'services', group: 'Layouts', name: 'Service cards', icon: '🧩', make: () => sec([...head('WHAT WE DO', 'Our services', 'Professional services designed around your goals.', 3), ...['💻', '📈', '✍️'].map((ic, i) => card({ icon: ic, title: `Service ${i + 1}`, price: 'Starting at ₹999', desc: '<p>What this service includes and who it is for.</p>', features: 'Feature one\nFeature two\nFeature three', btnLabel: 'Learn more', href: '' }))], { cols: 3 }) },
  { id: 'portfolio', group: 'Layouts', name: 'Portfolio', icon: '🗂', make: () => sec([...head('PORTFOLIO', 'Selected work', 'Add real projects only.', 3), ...[1, 2, 3].map(i => card({ image: '', imagePh: true, title: `Project ${i}`, desc: '<p>The problem solved and key features.</p>', btnLabel: 'View case study', ratio: '16:10' }))], { cols: 3 }) },
  { id: 'features', group: 'Layouts', name: 'Features', icon: '✨', make: () => sec([...head('WHY US', 'Why choose us', '', 4), ...['🎯', '⚡', '💎', '🤝'].map((ic, i) => card({ icon: ic, title: `Benefit ${i + 1}`, desc: '<p>One short sentence.</p>' }))], { cols: 4, ct: 2 }) },
  { id: 'testimonials', group: 'Layouts', name: 'Testimonials', icon: '💬', make: () => sec([...head('TESTIMONIALS', 'What clients say', 'Use only real, permission-based testimonials.', 3), ...[1, 2, 3].map(i => card({ icon: '❝', title: `Client name ${i}`, desc: '<p>“Add a real testimonial here.”</p>' }))], { cols: 3 }) },
  { id: 'cta', group: 'Layouts', name: 'Call to action', icon: '📣', make: () => sec([el('heading', { html: 'Ready to get started?', level: 2 }, { align: 'center' }), sub('One sentence that makes the next step obvious.', 1), el('button', { label: 'Contact us', href: '', variant: 'primary' }, { align: 'center' })], { cols: 1, width: 'narrow', panel: true, bg: { type: 'none' } }) },
  { id: 'contact', group: 'Layouts', name: 'Contact section', icon: '✉️', make: () => sec([el('heading', { html: 'Let’s talk about your project', level: 2 }, {}, 1), el('form', { btnLabel: 'Send message', fields: [{ label: 'Your name', type: 'text', required: true }, { label: 'Email address', type: 'email', required: true }, { label: 'Message', type: 'textarea', required: true }] }, {}, 1)], { cols: 2, panel: false }) },
  { id: 'pricing', group: 'Layouts', name: 'Pricing', icon: '💳', make: () => sec([...head('PRICING', 'Simple pricing', 'Add a payment amount to a card to turn its button into a Razorpay checkout.', 3), card({ title: 'Starter', price: '₹4,999', desc: '<p>For individuals.</p>', features: 'Up to 3 pages\nResponsive design\n2 revisions', btnLabel: 'Choose', btnVariant: 'secondary' }), card({ title: 'Business', price: '₹11,999', badge: 'Recommended', featured: true, desc: '<p>For growing businesses.</p>', features: 'Up to 7 pages\nPremium UI\n3 revisions', btnLabel: 'Choose', btnVariant: 'primary' }), card({ title: 'Custom', price: '₹24,999+', desc: '<p>Tailor-made.</p>', features: 'Custom UI/UX\nIntegrations\nTesting', btnLabel: 'Talk to us', btnVariant: 'secondary' })], { cols: 3 }) },
  { id: 'stats', group: 'Layouts', name: 'Stats row', icon: '🔢', make: () => sec([1, 2, 3, 4].map(i => el('stat', { value: '00', label: 'Verified number ' + i })), { cols: 4 }) },
  { id: 'steps', group: 'Layouts', name: 'Process steps', icon: '🪜', make: () => sec([...head('HOW IT WORKS', 'From idea to delivery', '', 4), ...[1, 2, 3, 4].map(i => card({ icon: '0' + i, title: `Step ${i}`, desc: '<p>Describe this step.</p>' }))], { cols: 4, ct: 2 }) },
  { id: 'faqblock', group: 'Layouts', name: 'FAQ', icon: '❓', make: () => sec([...head('FAQ', 'Frequently asked questions', '', 1), el('faq', { items: [{ q: 'Question one?', a: '<p>Answer one.</p>' }, { q: 'Question two?', a: '<p>Answer two.</p>' }] })], { cols: 1, width: 'narrow' }) },
  { id: 'videosec', group: 'Layouts', name: 'Video section', icon: '🎬', make: () => sec([...head('WATCH', 'See how it works', '', 1), el('video', { src: '', ratio: '16:9', controls: true })], { cols: 1, width: 'narrow' }) },
  { id: 'slidersec', group: 'Layouts', name: 'Image slider section', icon: '🎞', make: () => sec([...head('GALLERY', 'Our gallery', '', 1), ELEMENTS.carousel()], { cols: 1 }) },
  { id: 'header', group: 'Layouts', name: 'Header (logo + menu + button)', icon: '⬒', make: () => sec([el('logo'), el('nav', {}, { align: 'center' }), el('button', { label: 'Contact', href: '', variant: 'primary' }, { align: 'right' })], { cols: 3, valign: 'center', padTop: 14, padBottom: 14, width: 'wide' }) },
  { id: 'footer', group: 'Layouts', name: 'Footer', icon: '⬓', make: () => sec([el('text', { html: '<p><strong>Your Brand</strong></p><p>Tagline goes here.</p>' }), el('text', { html: '<p><strong>Explore</strong></p><p><a href="/">Home</a></p>' }), el('text', { html: '<p><strong>Contact</strong></p><p>email@example.com</p>' })], { cols: 3, padTop: 48, padBottom: 32 }) },
];

export const PAGE_TEMPLATES = {
  blank: { name: 'Blank page', make: () => [] },
  landing: { name: 'Landing page (no header/footer)', landing: true, make: () => ['hero', 'features', 'pricing', 'cta'].map(id => BLOCKS.find(b => b.id === id).make()) },
  service: { name: 'Service page', make: () => ['hero', 'services', 'faqblock', 'cta'].map(id => BLOCKS.find(b => b.id === id).make()) },
  content: { name: 'Content page', make: () => [sec([el('heading', { html: 'Page title', level: 1 }), el('text', { html: '<p>Start writing…</p>' })], { cols: 1, width: 'narrow', padTop: 120 })] },
  contact: { name: 'Contact page', make: () => ['contact'].map(id => BLOCKS.find(b => b.id === id).make()) },
};
