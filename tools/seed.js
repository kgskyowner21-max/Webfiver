// Default site content for Webfiver, taken from "Webfiver_Complete_Content_with_Image_Inside.pdf".
// Everything is editable in Developer Mode. Items the PDF marks as illustrative/unverified (client counts,
// ratings, testimonials, invented projects) are intentionally NOT included.
import { el, sec, THEMES, BLOCKS } from '../assets/blocks.js';
import { uid } from '../assets/render.js';

const T = (html, style = {}, span = 1) => el('text', { html }, style, span);
const H = (html, level = 2, style = {}, span = 1) => el('heading', { html, level }, style, span);
const eyebrow = (t, span = 1, al = 'center') => T(`<p>${t}</p>`, { size: 13, weight: 600, ls: 2, tt: 'uppercase', color: 'var(--secondary)', align: al, mb: -8 }, span);
const sub = (t, span = 1, al = 'center') => T(`<p>${t}</p>`, { color: 'var(--muted)', align: al }, span);
const head = (e, t, s, cols, al = 'center') => [...(e ? [eyebrow(e, cols, al)] : []), H(t, 2, { align: al }, cols), ...(s ? [sub(s, cols, al)] : [])];
const card = (p, span = 1) => el('card', { ratio: '16:9', ...p }, {}, span);
const btn = (label, href, variant = 'primary', st = {}) => el('button', { label, href, variant }, st);
const pg = id => 'page:' + id;
const note = (t, cols = 1) => T(`<p>${t}</p>`, { size: 13, color: 'var(--muted)', align: 'center' }, cols);
const li = a => a.join('\n');

export function defaultSite() {
  const mk = id => BLOCKS.find(b => b.id === id).make();

  // ---- 2. Hero ----
  const hero = sec([
    eyebrow('DIGITAL SOLUTIONS • TRADING TECHNOLOGY • CAREER GROWTH'),
    el('heading', { html: 'Build Your Digital Presence. <span style="color:var(--secondary)">Trade Smarter.</span> Grow Your Skills.', level: 1 }, { align: 'center', anim: 'up', font: 'Space Grotesk' }),
    sub('From professional websites and custom trading tools to career-building services and practical online courses — Webfiver helps turn your ideas into digital solutions.'),
    btn('Explore Services ↗', pg('p_services'), 'primary', { align: 'right' }),
    btn('View Courses', pg('p_courses'), 'secondary', { align: 'left' }),
    T('<p>Created by Kalpesh Goswami · Independent Digital Creator</p>', { size: 13, color: 'var(--muted)', align: 'center' }),
    sub('Webfiver is a digital services and learning platform founded by Kalpesh Goswami. We help individuals, professionals, creators, and businesses establish a strong online presence through website development, custom trading tools, professional resume writing, content creation, LinkedIn services, and skill-based online courses.'),
  ], { cols: 2, width: 'narrow', padTop: 130, padBottom: 100, bg: { type: 'glow' } });
  hero.items.forEach(e => { if (e.type !== 'button') e.span = 2; });

  // ---- 3. Trust & value ----
  const trust = sec([
    ...head('', 'One Platform. Multiple Ways to Grow.', '', 5),
    card({ icon: '💻', title: 'Web Development', desc: '<p>Modern, responsive websites for your business or personal brand.</p>' }),
    card({ icon: '📊', title: 'Trading Technology', desc: '<p>Custom trading tools and dashboards designed around your workflow.</p>' }),
    card({ icon: '📄', title: 'Career Services', desc: '<p>ATS-friendly resumes and LinkedIn profile optimization.</p>' }),
    card({ icon: '✍️', title: 'Content & Branding', desc: '<p>Strategic content writing and LinkedIn management.</p>' }),
    card({ icon: '🎓', title: 'Online Learning', desc: '<p>Practical courses in digital marketing, AI, English speaking, and content writing.</p>' }),
  ], { cols: 5, ct: 2 });

  // ---- 4. Services ----
  const svc = (icon, title, price, desc, features, cta, href) => card({ icon, title, price, desc: `<p>${desc}</p>`, features, btnLabel: cta, href });
  const services = sec([
    ...head('WHAT WE DO', 'Digital Services Designed Around Your Goals', 'At Webfiver, we combine website development, trading technology, career services, and content solutions to help you build, improve, and grow your digital presence.', 3),
    svc('💻', 'Website Development', 'Starting at ₹4,999', 'Get a professional, mobile-friendly website that presents your brand, showcases your services, and turns visitors into potential customers.', li(['Personal portfolio websites', 'Business and service websites', 'Landing pages and lead-generation websites', 'Website redesign and UI improvements', 'Custom web applications and dashboards']), 'Get Your Website →', pg('p_web')),
    svc('📈', 'Custom Trading Tools', 'Starting at ₹2,999', 'Turn your trading ideas into practical digital tools. Build custom dashboards and analysis utilities around your trading workflow.', li(['Trading dashboards and stock scanners', 'Options chain analysis tools', 'Market data visualization', 'Pine Script indicators and strategies', 'Custom trading calculators and web apps']), 'Build My Trading Tool →', pg('p_trading')),
    svc('📄', 'ATS-Friendly Resume Writing', 'Starting at ₹799', 'Present your skills, experience, and achievements in a recruiter-friendly resume with clear formatting and relevant keywords.', li(['ATS-friendly resume creation', 'Existing resume redesign', 'Professional summary and skills optimization', 'Job-description keyword alignment', 'LinkedIn and resume consistency review']), 'Upgrade My Resume →', pg('p_resume')),
    svc('✍️', 'Content Writing', 'Starting at ₹499', 'Communicate your value with clear, engaging content that supports your brand, audience, and business goals.', li(['Website and landing-page copy', 'SEO-friendly blog articles', 'Social media captions and posts', 'Product and service descriptions', 'AEO-friendly FAQs and informational content']), 'Get Content Written →', pg('p_content')),
    svc('💼', 'LinkedIn Profile Revamp', 'Starting at ₹1,499', 'Turn your LinkedIn profile into a professional personal-brand page that clearly communicates who you are, what you do, and how you help.', li(['Profile headline optimization', 'About section rewriting', 'Experience and skills improvement', 'Featured section recommendations', 'Keyword optimization for relevant searches']), 'Revamp My Profile →', pg('p_lirevamp')),
    svc('📅', 'LinkedIn Management', 'Starting at ₹5,999/month', 'Maintain a consistent professional presence with content planning, post creation, and profile activity support.', li(['Monthly content calendar', 'LinkedIn post writing', 'Content publishing coordination', 'Profile positioning and brand consistency', 'Monthly performance review']), 'Grow My LinkedIn Presence →', pg('p_limanage')),
    note('Pricing note: All prices are suggested starting rates in INR. Final pricing depends on scope, complexity, revisions, integrations, and delivery requirements.', 3),
  ], { cols: 3 });

  // ---- 5. Website packages ----
  const packages = sec([
    ...head('WEBSITE DEVELOPMENT PACKAGES', 'Choose Your Website Package', 'Suggested pricing · INR · One-time project fees', 3),
    card({ title: 'Starter Website', price: '₹4,999', desc: '<p>Ideal for freelancers and individuals launching their online presence.</p>', features: li(['Up to 3 pages', 'Responsive design', 'Contact form or WhatsApp link', 'Basic on-page SEO setup', '2 revision rounds']), btnLabel: 'Get Starter', href: pg('p_contact'), btnVariant: 'secondary' }),
    card({ title: 'Business Website', price: '₹11,999', badge: 'Recommended', featured: true, desc: '<p>For businesses that need a stronger online presence.</p>', features: li(['Up to 7 pages', 'Premium UI with glassmorphism options', 'Contact and lead-generation forms', 'On-page SEO fundamentals', 'Basic speed and mobile optimization', '3 revision rounds']), btnLabel: 'Get Business', href: pg('p_contact'), btnVariant: 'primary' }),
    card({ title: 'Custom Web App', price: 'Starting at ₹24,999', desc: '<p>For businesses that need functionality beyond a standard website.</p>', features: li(['Custom UI/UX', 'Interactive dashboards and workflows', 'API or database integration as scoped', 'Authentication where required', 'Testing and deployment assistance']), btnLabel: 'Discuss Project', href: pg('p_contact'), btnVariant: 'secondary' }),
    note('Domain, hosting, paid third-party APIs, subscriptions, and ongoing maintenance are charged separately unless explicitly included in a proposal.', 3),
  ], { cols: 3 });

  // ---- 6. Trading tools ----
  const trading = sec([
    ...head('TRADING TOOLS', 'Your Trading Ideas. Turned Into Powerful Tools.', 'Webfiver builds custom trading tools for traders who want to organize market data, analyze trading conditions, and improve their research workflow. From custom stock scanners to options chain dashboards and Pine Script indicators, each project is planned around your specific requirements.', 3),
    card({ icon: '🧮', title: 'Trading calculator or small utility', price: '₹2,999' }),
    card({ icon: '📉', title: 'Pine Script indicator', price: '₹3,999' }),
    card({ icon: '🔎', title: 'Custom stock scanner', price: '₹7,999' }),
    card({ icon: '📊', title: 'Options chain analysis dashboard', price: '₹14,999' }),
    card({ icon: '🚀', title: 'Advanced trading web application', price: '₹24,999+' }),
    card({ icon: '💬', title: 'Discuss Your Trading Tool', desc: '<p>Tell me what you need and let’s plan it together.</p>', btnLabel: 'Discuss Your Trading Tool', href: pg('p_contact'), btnVariant: 'primary' }),
    note('Suggested starting prices. Market data subscriptions, broker API access, hosting, and paid data feeds are separate where applicable. Tools support analysis and workflow; they do not guarantee trading profits.', 3),
  ], { cols: 3 });

  // ---- 7. Career & LinkedIn ----
  const career = sec([
    ...head('', 'Make Your Professional Profile Work for You.', 'Your resume and LinkedIn profile are often the first impression you make online. Webfiver helps you communicate your experience, skills, and professional value with clarity.', 4),
    card({ icon: '📄', title: 'Resume Starter', price: '₹799', desc: '<p>ATS-friendly formatting, professional summary, and skills presentation.</p>' }),
    card({ icon: '📑', title: 'Resume Pro', price: '₹1,499', desc: '<p>Customized resume, stronger bullet points, and alignment with one target job description.</p>' }),
    card({ icon: '💼', title: 'LinkedIn Revamp', price: '₹1,499', desc: '<p>Headline, About section, experience wording, keywords, and profile recommendations.</p>' }),
    card({ icon: '📅', title: 'LinkedIn Growth Support', price: '₹5,999/month', desc: '<p>Content planning and up to 12 posts per month, with publishing coordination and a monthly review.</p>' }),
    el('button', { label: 'Improve My Professional Brand', href: pg('p_contact'), variant: 'primary' }, { align: 'center' }, 4),
  ], { cols: 4, ct: 2 });

  // ---- 8. Content writing ----
  const contentPk = sec([
    ...head('', 'Content Writing Packages', '', 4),
    card({ icon: '✏️', title: 'Quick Copy', price: '₹499', desc: '<p>Up to 500 words</p>' }),
    card({ icon: '🌐', title: 'Website Copy', price: '₹2,999', desc: '<p>Up to 5 pages, subject to scope</p>' }),
    card({ icon: '🔍', title: 'SEO Blog', price: '₹999', desc: '<p>One article up to 1,000 words</p>' }),
    card({ icon: '📣', title: 'Content Bundle', price: '₹1,999', desc: '<p>8 social media posts</p>' }),
    sub('Each project should define its deliverables, research requirements, revision limits, and publishing responsibilities before work begins.', 4),
    el('button', { label: 'Request Content Writing', href: pg('p_contact'), variant: 'primary' }, { align: 'center' }, 4),
  ], { cols: 4, ct: 2 });

  // ---- 9. Courses (buttons go to the contact page until you paste a payment link) ----
  const course = (icon, title, price, desc) => card({ icon, title, price, desc: `<p>${desc}</p>`, btnLabel: 'Enroll Now →', btnVariant: 'primary', href: pg('p_contact'), payLink: '' });
  const courses = sec([
    ...head('LEARN. PRACTICE. GROW.', 'Learn Skills That Move You Forward', 'Explore practical online courses designed to help you develop digital skills, communicate with confidence, create better content, and understand emerging technologies. Webfiver courses are designed for beginners and learners who want structured guidance and practical knowledge.', 4),
    course('📣', 'Digital Marketing Fundamentals', '₹1,499', 'Learn SEO basics, social media marketing, content strategy, audience targeting, and digital campaign fundamentals.'),
    course('🤖', 'AI Tools for Everyday Work', '₹999', 'Learn to use AI tools for research, productivity, brainstorming, content creation, and everyday workflows.'),
    course('🗣️', 'English Speaking & Communication', '₹1,499', 'Practice everyday English, sentence formation, vocabulary, conversation, and professional communication.'),
    course('📝', 'Content Writing Masterclass', '₹999', 'Learn content structure, copywriting basics, blog writing, SEO writing, and clear communication.'),
    card({ icon: '🎁', title: 'Webfiver Digital Skills Bundle', price: '₹3,499', badge: 'Bundle', featured: true, desc: '<p>All four course categories for ₹3,499, compared with ₹4,996 when purchased separately.</p>', btnLabel: 'Enroll in Bundle →', btnVariant: 'primary', href: pg('p_contact'), payLink: '' }, 4),
    note('Publish this offer only when all four courses are available and the included access period and materials are clearly specified. Define the curriculum, delivery method, access period, support, refund policy, and any certificates actually provided.', 4),
  ], { cols: 4, ct: 2 });

  // ---- 10. Why Webfiver ----
  const why = sec([
    ...head('', 'One Brand. Multiple Digital Solutions.', 'Instead of coordinating multiple providers, you can discuss your website, content, trading tool, or career branding requirements with one digital creator.', 4),
    card({ icon: '🎯', title: 'Goal-oriented solutions', desc: '<p>Every project begins with understanding your objectives, audience, and requirements.</p>' }),
    card({ icon: '🧩', title: 'Custom-built experiences', desc: '<p>Solutions are planned around your use case rather than forcing every project into the same template.</p>' }),
    card({ icon: '🔍', title: 'Search-friendly content', desc: '<p>Website structure and copy can be developed with SEO, useful answers, and clear information architecture in mind.</p>' }),
    card({ icon: '💬', title: 'Direct communication', desc: '<p>Discuss requirements, timelines, revisions, and project scope before committing.</p>' }),
  ], { cols: 4, ct: 2 });

  // ---- 11. About ----
  const about = sec([
    el('image', { src: '', alt: 'Kalpesh Goswami', ratio: '4:5', radius: 24, shadow: 'soft', fit: 'cover', fx: 50, fy: 30 }, {}, 1),
    el('text', { html: '<p style="color:var(--secondary)"><strong>MEET THE CREATOR BEHIND WEBFIVER</strong></p><h2>Hi, I’m Kalpesh Goswami</h2><p>A web developer, intraday trader, and trading tool creator with an interest in building useful digital products and helping people grow professionally.</p><p>I bring together my interests in web development, financial market technology, personal branding, content creation, and digital education through Webfiver.</p><p>My goal is to help individuals and businesses turn ideas into practical digital solutions — whether that’s a professional website, a custom trading dashboard, a stronger LinkedIn profile, a polished resume, or a new skill.</p><p>Webfiver represents my approach to digital work: understand the problem, build a practical solution, and keep improving.</p><p><strong>My focus areas:</strong> Website and web application development; custom trading tools and Pine Script; professional resumes and LinkedIn branding; SEO-friendly content writing; digital skills and online learning.</p>' }, {}, 2),
    btn('Work With Me', pg('p_contact'), 'primary'),
  ], { cols: 3, valign: 'center', panel: true });
  about.items[0].span = 1; about.items[2].span = 3;

  // ---- 12. How it works ----
  const process = sec([
    ...head('', 'From Idea to Delivery in Four Steps', '', 4),
    card({ icon: '01', title: 'Share your requirements', desc: '<p>Tell me about your project, goals, budget, and preferred timeline.</p>' }),
    card({ icon: '02', title: 'Get a project proposal', desc: '<p>Receive the proposed scope, deliverables, pricing, milestones, and timeline.</p>' }),
    card({ icon: '03', title: 'Build and review', desc: '<p>Work through the agreed process, review the deliverables, and provide feedback within the revision limits.</p>' }),
    card({ icon: '04', title: 'Final delivery', desc: '<p>Receive the agreed files, website, tool, content, or other deliverables, with handover instructions where applicable.</p>' }),
  ], { cols: 4, ct: 2 });

  // ---- 13. Portfolio (no invented projects) ----
  const portfolio = sec([
    ...head('', 'Ideas in Progress. Solutions in Practice.', 'Explore selected projects that demonstrate my approach to website design, web development, and trading technology.', 4),
    card({ icon: '🌐', title: 'Web Design', desc: '<p>Landing pages, business websites, and personal portfolios.</p>' }),
    card({ icon: '🧱', title: 'Web Applications', desc: '<p>Custom dashboards, tools, and interactive workflows.</p>' }),
    card({ icon: '📈', title: 'Trading Technology', desc: '<p>Stock scanners, options chain analysis, and trading utilities.</p>' }),
    card({ icon: '🪪', title: 'Personal Branding', desc: '<p>Resume layouts, LinkedIn profiles, and content samples.</p>' }),
    note('For every project add an image, title, problem solved, key features, technologies used, and a live demo or case-study link. Only publish real projects — if it is your own product, label it as a personal project.', 4),
  ], { cols: 4, ct: 2 });

  // ---- 14. FAQ (exact copy from the PDF) ----
  const faqItems = [
    ['What services does Webfiver offer?', 'Webfiver offers website development, custom trading tools, ATS-friendly resume writing, content writing, LinkedIn profile revamping, LinkedIn management, and online courses in digital marketing, AI, English speaking, and content writing.'],
    ['How much does it cost to build a website with Webfiver?', 'Website development at Webfiver starts at ₹4,999 for a basic website. Business websites start at ₹11,999, while custom web applications start at ₹24,999. Final prices depend on project requirements.'],
    ['Can Webfiver build custom trading tools?', 'Yes. Webfiver can develop custom trading dashboards, stock scanners, options chain analysis tools, trading calculators, and Pine Script indicators based on the agreed requirements and available data sources.'],
    ['Does Webfiver provide ATS-friendly resumes?', 'Yes. Webfiver offers resume creation, resume redesign, keyword optimization, and job-description alignment to help candidates present their qualifications clearly in recruiter-friendly formats.'],
    ['What is a LinkedIn profile revamp?', 'A LinkedIn profile revamp improves your headline, About section, experience descriptions, skills, and relevant keywords to communicate your professional value more effectively.'],
    ['Does Webfiver manage LinkedIn accounts?', 'Webfiver offers LinkedIn content planning, post writing, publishing coordination, and profile positioning support. Exact deliverables depend on the selected package.'],
    ['Which online courses does Webfiver offer?', 'The proposed course categories include digital marketing, AI tools, English speaking and communication, and content writing. Course availability, syllabus, and enrollment details should be confirmed on the relevant course page.'],
    ['Are Webfiver’s services suitable for beginners?', 'Yes. Beginners, freelancers, job seekers, creators, and businesses can discuss their requirements and choose a suitable service or course.'],
    ['How can I hire Webfiver?', 'You can contact Kalpesh Goswami through the website’s contact form, email, or WhatsApp once those contact details are added. Share your requirements to receive a suitable proposal.'],
    ['Does Webfiver guarantee Google rankings, jobs, or trading profits?', 'No. SEO results, hiring outcomes, and financial market results cannot be guaranteed. Webfiver focuses on delivering the agreed services and tools without promising specific external outcomes.'],
  ].map(([q, a]) => ({ q, a: `<p>${a}</p>` }));
  const faq = sec([...head('FAQ', 'Frequently Asked Questions', '', 1), el('faq', { items: faqItems })], { cols: 1, width: 'narrow' });

  // ---- 15. Final CTA ----
  const cta = sec([
    H('Have an Idea? Let’s Build It Together.', 2, { align: 'center' }),
    sub('Whether you need a website, a custom trading tool, a professional profile, or a new skill, let’s turn your next idea into a practical plan. Tell me what you need. Let’s discuss the right solution for you.'),
    btn('Start Your Project ↗', pg('p_contact'), 'primary', { align: 'center' }),
  ], { cols: 1, width: 'narrow', panel: true, bg: { type: 'none' }, padBottom: 100 });

  // ---- 16. Contact ----
  const contact = sec([
    el('text', { html: '<p style="color:var(--secondary)"><strong>CONTACT</strong></p><h2>Let’s Talk About Your Project</h2><p>Have a question, project idea, or course inquiry? Share a few details and I’ll get back to you.</p><p><strong>Kalpesh Goswami</strong><br>Phone / WhatsApp: <em>to be added</em><br>Email: <em>to be added</em><br>Instagram: <em>to be added</em><br>LinkedIn: <em>add your profile URL</em><br>Location: India</p>' }),
    el('form', { btnLabel: 'Send message', mode: 'email', success: 'Your email app has opened with your message — please press Send there. Thank you!', fields: [{ label: 'Your name', type: 'text', required: true }, { label: 'Email address', type: 'email', required: true }, { label: 'Service required', type: 'select', options: 'Website Development, Trading Tools, ATS Resume, Content Writing, LinkedIn Revamp, LinkedIn Management, Online Course, Other' }, { label: 'Estimated budget', type: 'text' }, { label: 'Project details', type: 'textarea', required: true }] }),
  ], { cols: 2, padTop: 120 });

  const titleBlock = (t, s) => sec([H(t, 1, { align: 'center' }), ...(s ? [sub(s)] : [])], { cols: 1, width: 'narrow', padTop: 120, padBottom: 20 });
  const legal = (title, body) => [sec([H(title, 1), T(body)], { cols: 1, width: 'narrow', padTop: 120 })];
  const draftNote = '<p><em>Template draft — review and adapt this page with a qualified professional so it accurately describes how Webfiver operates before relying on it.</em></p>';

  // ---- header / footer (17) ----
  const header = mk('header');
  header.items[2].props = { label: 'Let’s Talk', href: pg('p_contact'), variant: 'primary' };
  const footer = sec([
    T('<p><strong style="font-size:1.2em">Webfiver</strong></p><p>Build Smarter. Grow Faster.</p><p>Webfiver by Kalpesh Goswami provides digital services, trading technology solutions, professional branding services, and skill-based learning resources.</p>', {}, 2),
    T('<p><strong>Explore</strong></p><p><a href="page:p_home">Home</a><br><a href="page:p_services">Services</a><br><a href="page:p_trading">Trading Tools</a><br><a href="page:p_courses">Courses</a><br><a href="page:p_portfolio">Portfolio</a></p>'),
    T('<p><strong>Information</strong></p><p><a href="page:p_about">About</a><br><a href="page:p_contact">Contact</a><br><a href="page:p_privacy">Privacy Policy</a><br><a href="page:p_terms">Terms &amp; Conditions</a><br><a href="page:p_refund">Refund Policy</a></p>'),
    T(`<p>© ${new Date().getFullYear()} Webfiver. All rights reserved.</p>`, { size: 13, align: 'center' }, 4),
  ], { cols: 4, ct: 2, padTop: 56, padBottom: 28 });

  // sections reused on several pages are cloned with fresh ids so every id stays unique
  const seen = new Set();
  const uniq = s => { if (!seen.has(s.id)) { seen.add(s.id); s.items.forEach(e => seen.add(e.id)); return s; } const c = JSON.parse(JSON.stringify(s)); c.id = uid('s'); c.items.forEach(e => { e.id = uid('e'); }); return c; };
  const page = (id, title, slug, sections0, o = {}) => ({ id, title, slug, navLabel: o.navLabel || title, inNav: !!o.inNav, visible: true, parent: o.parent || '', landing: false, seo: o.seo || { title: '', description: '' }, sections: sections0.map(uniq) });
  const seo = (title, description) => ({ title, description });

  // Short dedicated pages for each service (the PDF suggests an SEO title per service).
  const svcPage = (id, slug, title, answer, detail, seoT, seoD) => page(id, title, slug, [
    sec([H(title, 1, { align: 'center' }), sub(answer)], { cols: 1, width: 'narrow', padTop: 120, padBottom: 20 }), ...detail, cta,
  ], { parent: 'p_services', inNav: true, seo: seo(seoT, seoD) });

  const pages = [
    page('p_home', 'Home', 'home', [hero, trust, services, trading, packages, courses, why, about, portfolio, process, faq, cta], { inNav: true, seo: seo('Webfiver | Website Development, Trading Tools & Digital Services', 'Webfiver by Kalpesh Goswami offers professional website development, trading tools, ATS-friendly resumes, content writing, LinkedIn profile management, and practical online courses.') }),
    page('p_services', 'Services', 'services', [titleBlock('Services', 'Website development, trading tools, career services and content solutions.'), services, career, contentPk, cta], { inNav: true, seo: seo('Digital Services | Webfiver', 'Website development, ATS-friendly resumes, content writing and LinkedIn services by Webfiver.') }),
    svcPage('p_web', 'website-development', 'Website Development', 'Webfiver builds professional, mobile-friendly websites starting at ₹4,999 — from personal portfolios to custom web applications.', [packages], 'Website Development Services | Webfiver', 'Professional website development from ₹4,999: portfolio sites, business websites, landing pages and custom web apps.'),
    svcPage('p_resume', 'resume-writing', 'ATS-Friendly Resume Writing', 'Webfiver writes ATS-friendly resumes starting at ₹799, with clear formatting, relevant keywords and alignment to your target job.', [career], 'ATS-Friendly Resume Writing | Webfiver', 'ATS-friendly resume creation, redesign and keyword optimization starting at ₹799.'),
    svcPage('p_content', 'content-writing', 'Content Writing', 'Webfiver writes website copy, SEO blog articles and social media content starting at ₹499.', [contentPk], 'SEO Content Writing Services | Webfiver', 'Website copy, SEO blog articles and social media content writing starting at ₹499.'),
    svcPage('p_lirevamp', 'linkedin-revamp', 'LinkedIn Profile Revamp', 'A LinkedIn profile revamp (from ₹1,499) improves your headline, About section, experience descriptions, skills and keywords.', [career], 'LinkedIn Profile Optimization | Webfiver', 'LinkedIn headline, About section, experience and keyword optimization starting at ₹1,499.'),
    svcPage('p_limanage', 'linkedin-management', 'LinkedIn Management', 'LinkedIn management (from ₹5,999/month) covers content planning, post writing, publishing coordination and a monthly review.', [career], 'LinkedIn Content & Management | Webfiver', 'Monthly LinkedIn content planning, post writing and profile positioning support.'),
    page('p_trading', 'Trading Tools', 'trading-tools', [titleBlock('Trading Tools'), trading, cta], { inNav: true, seo: seo('Custom Trading Tools & Pine Script | Webfiver', 'Custom stock scanners, options chain dashboards, trading calculators and Pine Script indicators.') }),
    page('p_courses', 'Courses', 'courses', [titleBlock('Courses'), courses, cta], { inNav: true, seo: seo('Digital Marketing, AI & English Courses | Webfiver', 'Practical online courses in digital marketing, AI tools, English speaking and content writing.') }),
    page('p_about', 'About', 'about', [sec([], { cols: 1, padTop: 40, padBottom: 0 }), about, why, process], { inNav: true, seo: seo('About Kalpesh Goswami | Webfiver', 'Meet Kalpesh Goswami — web developer, intraday trader and trading tool creator behind Webfiver.') }),
    page('p_portfolio', 'Portfolio', 'portfolio', [titleBlock('Portfolio'), portfolio, cta], { inNav: true, seo: seo('Portfolio | Webfiver', 'Selected website, web application and trading technology work by Webfiver.') }),
    page('p_contact', 'Contact', 'contact', [contact], { inNav: true, seo: seo('Contact Webfiver | Start Your Project', 'Contact Kalpesh Goswami to discuss your website, trading tool, resume, content or course enquiry.') }),
    page('p_privacy', 'Privacy Policy', 'privacy-policy', legal('Privacy Policy', draftNote + '<p>Describe what information you collect (contact details shared by email or WhatsApp, payment details handled by your payment provider, analytics), why you collect it, how long you keep it, and how visitors can contact you to access or delete it.</p>')),
    page('p_terms', 'Terms & Conditions', 'terms-and-conditions', legal('Terms &amp; Conditions', draftNote + '<p>Describe service delivery, scope and revisions, payment terms, intellectual property, course-access terms, limitation of liability, and the trading-risk disclaimer: tools support analysis and do not guarantee profits.</p>')),
    page('p_refund', 'Refund Policy', 'refund-policy', legal('Refund Policy', draftNote + '<p>State clearly when refunds or cancellations are possible for services and for courses (including access period and digital-content terms).</p>')),
    page('p_paid', 'Payment received', 'payment-success', [sec([el('payresult', { kind: 'success', title: 'Thank you!', msg: 'If your payment went through, you will receive a confirmation from the payment provider. We will contact you shortly with the next steps.' })], { cols: 1, width: 'narrow', padTop: 140 })]),
    page('p_failed', 'Payment not completed', 'payment-failed', [sec([el('payresult', { kind: 'failure', title: 'Payment not completed', msg: 'Your payment did not go through. You can try again or contact us for help.' })], { cols: 1, width: 'narrow', padTop: 140 })]),
  ];
  pages.find(p => p.id === 'p_paid').inNav = false;

  return {
    v: 1,
    homeId: 'p_home',
    settings: { name: 'Webfiver', tagline: 'Build Smarter. Grow Faster.', owner: 'Kalpesh Goswami', description: 'Webfiver is a digital services and learning platform founded by Kalpesh Goswami: website development, trading tools, resumes, content writing, LinkedIn services and online courses.', seoTitle: 'Webfiver | Website Development, Trading Tools & Digital Services', seoDescription: 'Webfiver by Kalpesh Goswami offers professional website development, trading tools, ATS-friendly resumes, content writing, LinkedIn profile management, and practical online courses.', logo: '', logoMobile: '', logoH: 40, logoHM: 32, favicon: '', ogImage: '', lang: 'en', analyticsId: '', cookieBanner: true, privacyPageId: 'p_privacy', contactEmail: '', whatsapp: '', navExtra: [] },
    theme: { ...THEMES.midnight.v, headingFont: 'Inter', bodyFont: 'Inter', preset: 'midnight' },
    payments: { successPageId: 'p_paid', failurePageId: 'p_failed' },
    globals: { header: [header], footer: [footer] },
    pages,
  };
}
