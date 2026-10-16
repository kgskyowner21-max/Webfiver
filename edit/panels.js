// Property-panel schemas: which controls appear for each element type / section.
import { FONT_LIST, SHADOW_KEYS } from '../assets/render.js';

const RATIOS = [['auto', 'Original'], '1:1', '4:3', '3:2', '16:9', '21:9', '3:4', '4:5', '16:10'];
const SHADOWS = SHADOW_KEYS.map(s => [s, s[0].toUpperCase() + s.slice(1)]);
const ASPECT = RATIOS;

export const ANIMS = [['none', 'None'], ['fade', 'Fade in'], ['up', 'Slide up'], ['down', 'Slide down'], ['left', 'Slide from left'], ['right', 'Slide from right'], ['zoom', 'Zoom in']];
export const HOVERS = [['none', 'None'], ['lift', 'Lift'], ['scale', 'Grow'], ['glow', 'Glow'], ['tilt', '3D tilt']];

const fontOpts = [['', 'Theme default'], ...FONT_LIST.map(f => [f, f])];
const weights = [['', 'Default'], [300, 'Light'], [400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold'], [800, 'Extra bold']];

export const TYPE_LABEL = { heading: 'Heading', text: 'Text', image: 'Image', gallery: 'Gallery / slider', video: 'Video', button: 'Button', divider: 'Divider', spacer: 'Spacer', embed: 'Embed', card: 'Card', stat: 'Stat', faq: 'FAQ', form: 'Contact form', logo: 'Logo', nav: 'Navigation menu', payresult: 'Payment result' };

export const typography = () => [
  { t: 'sel', k: 'style.font', l: 'Font', o: fontOpts },
  { t: 'num', k: 'style.size', l: 'Size (px)', half: true, min: 8, max: 160 },
  { t: 'sel', k: 'style.weight', l: 'Weight', o: weights, half: true, num: true },
  { t: 'color', k: 'style.color', l: 'Text colour' },
  { t: 'seg', k: 'style.align', l: 'Alignment', o: [['left', '⟸'], ['center', '↔'], ['right', '⟹'], ['justify', '☰']], def: 'left' },
  { t: 'range', k: 'style.lh', l: 'Line height', min: 0.8, max: 3, step: 0.05, def: 1.5 },
  { t: 'num', k: 'style.ls', l: 'Letter spacing (px)', half: true, min: -5, max: 20, step: 0.5 },
  { t: 'sel', k: 'style.tt', l: 'Case', half: true, o: [['', 'Normal'], ['uppercase', 'UPPER'], ['lowercase', 'lower'], ['capitalize', 'Capitalize']] },
];
const spacing = () => [
  { t: 'num', k: 'style.mt', l: 'Space above (px)', half: true, min: -100, max: 300 },
  { t: 'num', k: 'style.mb', l: 'Space below (px)', half: true, min: -100, max: 300 },
  { t: 'num', k: 'style.pad', l: 'Inner padding (px)', half: true, min: 0, max: 200 },
  { t: 'num', k: 'style.maxw', l: 'Max width (%)', half: true, min: 5, max: 100 },
];
const box = () => [
  { t: 'color', k: 'style.bg', l: 'Background' },
  { t: 'range', k: 'style.radius', l: 'Corner radius', min: 0, max: 100, def: 0 },
  ...spacing(),
];
const motion = () => [
  { t: 'sel', k: 'style.anim', l: 'Entrance animation', o: ANIMS, redraw: true },
  ...(0 ? [] : []),
  { t: 'num', k: 'style.dur', l: 'Duration (ms)', half: true, min: 50, max: 5000, step: 50 },
  { t: 'num', k: 'style.delay', l: 'Delay (ms)', half: true, min: 0, max: 5000, step: 50 },
  { t: 'sel', k: 'style.hover', l: 'Hover effect', o: HOVERS },
  { t: 'num', k: 'style.trans', l: 'Hover speed (ms)', min: 0, max: 2000, step: 50 },
];

const pay = () => [
  { t: 'text', k: 'props.payLink', l: 'Payment link (optional) — paste a link from your payment provider', max: 500, ph: 'https://rzp.io/… or UPI / any checkout link' },
  { t: 'note', l: 'If a payment link is set, this button opens it in a new tab instead of the normal link. No payment secrets are ever stored on the website.' },
];

export function contentFields(el, site) {
  const p = el.type;
  switch (p) {
    case 'heading': return [{ t: 'sel', k: 'props.level', l: 'Heading level', o: [[1, 'H1 — page title'], [2, 'H2 — section'], [3, 'H3'], [4, 'H4']], num: true }, { t: 'note', l: 'Click the heading on the page to edit it. Select text for font, colour, size and link options.' }];
    case 'text': return [{ t: 'note', l: 'Click the text on the page to edit. Select words to format them or add a hyperlink.' }];
    case 'image': return [
      { t: 'img', k: 'props.src', l: 'Image' }, { t: 'text', k: 'props.alt', l: 'Alt text (describe the image)' },
      { t: 'link', k: 'props.link', l: 'Link when clicked' }, { t: 'bool', k: 'props.newTab', l: 'Open link in a new tab' },
      { t: 'sel', k: 'props.ratio', l: 'Shape', o: ASPECT }, { t: 'seg', k: 'props.fit', l: 'Fit', o: [['cover', 'Fill'], ['contain', 'Fit inside']], def: 'cover' },
      { t: 'range', k: 'props.fx', l: 'Focus ←→', min: 0, max: 100, def: 50 }, { t: 'range', k: 'props.fy', l: 'Focus ↑↓', min: 0, max: 100, def: 50 },
      { t: 'range', k: 'props.width', l: 'Width (%)', min: 5, max: 100, def: 100 }, { t: 'range', k: 'props.radius', l: 'Corner radius', min: 0, max: 80, def: 0 },
      { t: 'sel', k: 'props.shadow', l: 'Shadow', o: SHADOWS }, { t: 'num', k: 'props.border', l: 'Border (px)', half: true, min: 0, max: 20 }, { t: 'color', k: 'props.borderColor', l: 'Border colour' },
    ];
    case 'gallery': {
      const car = el.props.mode === 'carousel';
      return [
        { t: 'seg', k: 'props.mode', l: 'Layout', o: [['grid', '▦ Grid'], ['carousel', '⇄ Slider']], def: 'grid', redraw: true },
        { t: 'list', k: 'props.images', l: 'Images', addLabel: 'Add image', bulkImages: true, blank: () => ({ src: '', alt: '' }), title: (r, i) => 'Image ' + (i + 1), item: [{ t: 'img', k: 'src', l: 'Image' }, { t: 'text', k: 'alt', l: 'Alt text' }] },
        { t: 'sel', k: 'props.ratio', l: 'Image shape', o: ASPECT.slice(1) }, { t: 'range', k: 'props.radius', l: 'Corner radius', min: 0, max: 60, def: 12 }, { t: 'range', k: 'props.gap', l: 'Gap (px)', min: 0, max: 48, def: 12 },
        ...(car ? [
          { t: 'num', k: 'props.perD', l: 'Visible — desktop', half: true, min: 1, max: 6 }, { t: 'num', k: 'props.perT', l: 'Visible — tablet', half: true, min: 1, max: 4 }, { t: 'num', k: 'props.perM', l: 'Visible — mobile', half: true, min: 1, max: 2 },
          { t: 'bool', k: 'props.auto', l: 'Auto-play' }, { t: 'num', k: 'props.interval', l: 'Seconds per slide', min: 1, max: 30 },
          { t: 'sel', k: 'props.effect', l: 'Transition', o: [['slide', 'Slide'], ['fade', 'Fade (1 at a time)']] },
          { t: 'bool', k: 'props.arrows', l: 'Show arrows' }, { t: 'bool', k: 'props.dots', l: 'Show dots' }, { t: 'bool', k: 'props.loop', l: 'Loop' },
        ] : [
          { t: 'num', k: 'props.cols', l: 'Columns — desktop', half: true, min: 1, max: 6 }, { t: 'num', k: 'props.colsT', l: 'Columns — tablet', half: true, min: 1, max: 4 }, { t: 'num', k: 'props.colsM', l: 'Columns — mobile', half: true, min: 1, max: 2 },
        ]),
      ];
    }
    case 'video': return [
      { t: 'video', k: 'props.src', l: 'Video (upload MP4/WebM, or paste YouTube/Vimeo link)' }, { t: 'img', k: 'props.poster', l: 'Cover image (uploaded videos)' },
      { t: 'sel', k: 'props.ratio', l: 'Shape', o: ['16:9', '4:3', '1:1', '9:16', '21:9'] }, { t: 'bool', k: 'props.controls', l: 'Show controls' }, { t: 'bool', k: 'props.autoplay', l: 'Autoplay (muted)' }, { t: 'bool', k: 'props.loop', l: 'Loop' },
      { t: 'note', l: 'Uploads are limited to 95 MB. For long videos, a YouTube or Vimeo link loads faster.' },
    ];
    case 'button': return [
      { t: 'text', k: 'props.label', l: 'Label' }, { t: 'link', k: 'props.href', l: 'Link' }, { t: 'bool', k: 'props.newTab', l: 'Open in new tab' },
      { t: 'sel', k: 'props.variant', l: 'Style', o: [['primary', 'Primary (gradient)'], ['secondary', 'Glass'], ['ghost', 'Text only']] }, ...pay(),
    ];
    case 'card': return [
      { t: 'img', k: 'props.image', l: 'Image' }, { t: 'text', k: 'props.alt', l: 'Alt text' }, { t: 'sel', k: 'props.ratio', l: 'Image shape', o: ASPECT.slice(1) },
      { t: 'text', k: 'props.icon', l: 'Icon / emoji (when no image)', max: 8 }, { t: 'text', k: 'props.title', l: 'Title' }, { t: 'text', k: 'props.price', l: 'Price / sub-title' }, { t: 'text', k: 'props.badge', l: 'Badge (e.g. Recommended)', max: 24 },
      { t: 'area', k: 'props.features', l: 'Bullet list (one per line)', rows: 4 }, { t: 'bool', k: 'props.featured', l: 'Highlight this card' },
      { t: 'text', k: 'props.btnLabel', l: 'Button label (empty = no button)' }, { t: 'link', k: 'props.href', l: 'Button link' }, { t: 'sel', k: 'props.btnVariant', l: 'Button style', o: [['secondary', 'Glass'], ['primary', 'Primary (gradient)'], ['ghost', 'Text only']] }, ...pay(),
      { t: 'note', l: 'Click the title, price or description on the page to edit them directly.' },
    ];
    case 'stat': return [{ t: 'note', l: 'Click the number or label on the page to edit. Only publish figures you can verify.' }];
    case 'faq': return [{ t: 'list', k: 'props.items', l: 'Questions', addLabel: 'Add question', blank: () => ({ q: 'New question?', a: '<p>Answer.</p>' }), title: r => (r.q || 'Question').slice(0, 28), item: [{ t: 'text', k: 'q', l: 'Question', max: 300 }, { t: 'area', k: 'a', l: 'Answer (basic HTML allowed)', rows: 4 }] }];
    case 'form': return [
      { t: 'list', k: 'props.fields', l: 'Form fields', addLabel: 'Add field', blank: () => ({ label: 'New field', type: 'text', required: false }), title: r => r.label || 'Field', item: [{ t: 'text', k: 'label', l: 'Label' }, { t: 'sel', k: 'type', l: 'Type', o: [['text', 'Short text'], ['email', 'Email'], ['tel', 'Phone'], ['textarea', 'Long text'], ['select', 'Dropdown']] }, { t: 'text', k: 'options', l: 'Dropdown options (comma separated)' }, { t: 'bool', k: 'required', l: 'Required' }] },
      { t: 'seg', k: 'props.mode', l: 'Send enquiries via', o: [['email', '✉ Email'], ['whatsapp', '💬 WhatsApp']], def: 'email' }, { t: 'text', k: 'props.btnLabel', l: 'Button label' }, { t: 'text', k: 'props.subject', l: 'Email subject' }, { t: 'text', k: 'props.success', l: 'Message after sending', max: 300 }, { t: 'note', l: 'No server is used: the visitor’s email app or WhatsApp opens with the message ready. Set your email / WhatsApp number in Settings → Website.' },
    ];
    case 'embed': return [{ t: 'text', k: 'props.url', l: 'YouTube, Vimeo, Google Maps, Google Forms or Calendly link', max: 600 }, { t: 'sel', k: 'props.ratio', l: 'Shape', o: ['16:9', '4:3', '1:1', '21:9', '3:4'] }, { t: 'text', k: 'props.title', l: 'Accessible title' }, { t: 'note', l: 'Only trusted providers can be embedded.' }];
    case 'divider': return [{ t: 'sel', k: 'props.look', l: 'Style', o: [['line', 'Line'], ['gradient', 'Gradient'], ['dots', 'Dotted']] }];
    case 'spacer': return [{ t: 'range', k: 'props.h', l: 'Height (px)', min: 4, max: 300, def: 48, clear: false }];
    case 'payresult': return [{ t: 'sel', k: 'props.kind', l: 'Shows when payment…', o: [['success', 'succeeds'], ['failure', 'fails']] }, { t: 'note', l: 'Edit the title and message on the page. The order status is filled in automatically.' }];
    case 'logo': return [{ t: 'note', l: 'The logo comes from Site settings and is shared across all pages.' }];
    case 'nav': return [{ t: 'note', l: 'The menu is built from your pages. Use Pages → “Show in menu” to choose items.' }];
  }
  return [];
}

export function styleFields(el) {
  const t = el.type;
  if (['heading', 'text', 'stat', 'faq'].includes(t)) return [...typography(), ...box(), { t: 'sel', k: 'style.hover', l: 'Hover effect', o: HOVERS }];
  if (t === 'card') return [{ t: 'color', k: 'style.color', l: 'Text colour' }, { t: 'seg', k: 'style.align', l: 'Text alignment', o: [['left', '⟸'], ['center', '↔'], ['right', '⟹']], def: 'left' }, { t: 'sel', k: 'style.font', l: 'Font', o: fontOpts }, ...box()];
  if (t === 'button') return [{ t: 'seg', k: 'style.align', l: 'Alignment', o: [['left', '⟸'], ['center', '↔'], ['right', '⟹']], def: 'left' }, { t: 'num', k: 'style.mt', l: 'Space above (px)', half: true }, { t: 'num', k: 'style.mb', l: 'Space below (px)', half: true }, { t: 'sel', k: 'style.hover', l: 'Hover effect', o: HOVERS }];
  if (['image', 'video', 'gallery', 'embed', 'form', 'logo', 'nav', 'divider', 'payresult'].includes(t)) return [{ t: 'seg', k: 'style.align', l: 'Alignment', o: [['left', '⟸'], ['center', '↔'], ['right', '⟹']], def: 'left' }, ...spacing().slice(0, 2), { t: 'sel', k: 'style.hover', l: 'Hover effect', o: HOVERS }];
  return spacing().slice(0, 2);
}
export const advancedFields = el => [
  { t: 'num', k: 'span', l: 'Columns to span (in a multi-column section)', min: 1, max: 6, ph: '1' },
  ...motion(),
];

export function sectionFields(sec) {
  const bg = sec.props.bg || {};
  return [
    { t: 'num', k: 'props.cols', l: 'Columns — desktop', half: true, min: 1, max: 6 }, { t: 'num', k: 'props.ct', l: 'Columns — tablet', half: true, min: 1, max: 3 }, { t: 'num', k: 'props.cm', l: 'Columns — mobile', half: true, min: 1, max: 2 },
    { t: 'seg', k: 'props.width', l: 'Content width', o: [['narrow', 'Narrow'], ['wide', 'Standard'], ['full', 'Full']], def: 'wide' },
    { t: 'seg', k: 'props.valign', l: 'Vertical alignment', o: [['start', 'Top'], ['center', 'Middle'], ['end', 'Bottom'], ['stretch', 'Stretch']], def: 'start' },
    { t: 'num', k: 'props.padTop', l: 'Padding top (px)', half: true, min: 0, max: 400 }, { t: 'num', k: 'props.padBottom', l: 'Padding bottom (px)', half: true, min: 0, max: 400 }, { t: 'num', k: 'props.gap', l: 'Gap between items (px)', min: 0, max: 120 },
    { t: 'bool', k: 'props.panel', l: 'Wrap content in a glass panel' },
    { t: 'sel', k: 'props.bg.type', l: 'Background', o: [['none', 'None'], ['color', 'Solid colour'], ['gradient', 'Gradient'], ['glow', 'Theme glow'], ['image', 'Image']], redraw: true },
    ...(bg.type === 'color' ? [{ t: 'color', k: 'props.bg.color', l: 'Colour' }] : []),
    ...(bg.type === 'gradient' ? [{ t: 'color', k: 'props.bg.color', l: 'From' }, { t: 'color', k: 'props.bg.color2', l: 'To' }, { t: 'range', k: 'props.bg.angle', l: 'Angle', min: 0, max: 360, def: 135 }] : []),
    ...(bg.type === 'image' ? [{ t: 'img', k: 'props.bg.image', l: 'Background image' }, { t: 'range', k: 'props.bg.overlay', l: 'Dark overlay', min: 0, max: 1, step: 0.05, def: 0.45 }] : []),
    { t: 'text', k: 'props.anchor', l: 'Anchor ID (link with #id)', max: 40 },
    { t: 'note', l: 'Hide this section on:' },
  ];
}

export const THEME_FIELDS = [
  ['Colours', [
    { t: 'color', k: 'primary', l: 'Primary' }, { t: 'color', k: 'secondary', l: 'Secondary' }, { t: 'color', k: 'accent', l: 'Accent' },
    { t: 'color', k: 'bg', l: 'Page background' }, { t: 'color', k: 'bg2', l: 'Surface / menu' }, { t: 'color', k: 'text', l: 'Body text' }, { t: 'color', k: 'heading', l: 'Headings' }, { t: 'color', k: 'muted', l: 'Muted text' },
    { t: 'color', k: 'link', l: 'Link colour' }, { t: 'color', k: 'btnText', l: 'Primary button text' },
  ]],
  ['Glass effect', [
    { t: 'range', k: 'blur', l: 'Blur strength', min: 0, max: 40, def: 18, clear: false }, { t: 'color', k: 'glass', l: 'Glass fill', ph: 'rgba(255,255,255,.06)' }, { t: 'color', k: 'glassBorder', l: 'Glass border', ph: 'rgba(255,255,255,.14)' },
    { t: 'range', k: 'radius', l: 'Corner radius', min: 0, max: 40, def: 18, clear: false }, { t: 'sel', k: 'shadow', l: 'Shadow', o: SHADOWS },
  ]],
  ['Typography', [
    { t: 'sel', k: 'headingFont', l: 'Heading font', o: FONT_LIST }, { t: 'sel', k: 'bodyFont', l: 'Body font', o: FONT_LIST }, { t: 'range', k: 'fontSize', l: 'Base size (px)', min: 14, max: 20, def: 16, clear: false },
    { t: 'sel', k: 'linkStyle', l: 'Link style', o: [['underline', 'Underlined'], ['hover', 'Underline on hover'], ['none', 'None']] },
  ]],
  ['Layout', [
    { t: 'range', k: 'maxw', l: 'Content width (px)', min: 800, max: 1500, step: 10, def: 1180, clear: false }, { t: 'range', k: 'space', l: 'Section spacing (px)', min: 20, max: 200, def: 80, clear: false }, { t: 'range', k: 'gap', l: 'Grid gap (px)', min: 8, max: 64, def: 24, clear: false },
  ]],
  ['Header, footer & buttons', [
    { t: 'sel', k: 'headerStyle', l: 'Header', o: [['glass', 'Glass'], ['solid', 'Solid'], ['transparent', 'Transparent']] }, { t: 'bool', k: 'headerSticky', l: 'Sticky header' },
    { t: 'sel', k: 'footerStyle', l: 'Footer', o: [['glass', 'Glass'], ['solid', 'Solid'], ['transparent', 'Transparent']] },
    { t: 'sel', k: 'btnStyle', l: 'Primary button', o: [['gradient', 'Gradient'], ['solid', 'Solid'], ['outline', 'Outline'], ['glass', 'Glass']] },
  ]],
];
