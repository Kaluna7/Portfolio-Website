// ─────────────────────────────────────────────────────────────
//  Semua isi buku ada di sini. Ubah teks, proyek, dan tautan
//  sesuai dirimu — halaman & sampul 3D akan ikut berubah.
// ─────────────────────────────────────────────────────────────

export const profile = {
  name: 'Kaluna',
  monogram: 'K',
  role: 'Creative Developer & Designer',
  location: 'Indonesia',
  year: '2026',
  email: 'kaluna12345678910@gmail.com',
  tagline: 'Weaving code, stories, and light into web experiences that feel alive.',
  // Halaman Introduction
  lead: 'Hello, I’m Kaluna.',
  about: [
    'I’m a software engineer from Indonesia and a graduate of STIKOM Bali. I build web and mobile apps, and I use AI to build them faster.',
    'I care about the details people feel: a clear screen, a smooth motion, and an app that is easy to use.',
  ],
  services: [
    ['Web & Mobile Apps', 'React, Next.js, and React Native'],
    ['Motion & 3D', 'Interfaces that move with GSAP and Three.js'],
    ['AI Products', 'Agents, chat, and voice inside real apps'],
  ] as [string, string][],
  facts: [
    ['Based in', 'Indonesia'],
    ['Education', 'STIKOM Bali, 2026'],
    ['Experience', 'Software Engineer, WHSmith'],
    ['Languages', 'Indonesian · English'],
    ['Status', 'Open to collaboration'],
  ] as [string, string][],
  motto: 'Every page is a story, every work a footprint.',
  quote: {
    text: 'Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.',
    by: 'Antoine de Saint-Exupéry',
  },
};

// Musik latar. Kosongkan `src` untuk memakai musik ambient bawaan
// (dibuat langsung di browser). Atau taruh file lagu di folder `public/`
// lalu isi, misalnya: src: '/musik.mp3'
export const music = {
  src: '/music/music.mp3',
  volume: 0.5,
};

// Setiap proyek otomatis mendapat satu halaman di bab "Project Details".
// - tags  : stack/teknologi, misalnya ['Next.js', 'Python', 'PostgreSQL']
// - image : taruh gambar di folder `public/` lalu isi, misalnya '/projects/grape.png'
// - year, demo, repo : isi sesuai proyekmu
// - gallery : opsional, menambah satu halaman berisi logo pop-up setelah halaman detail. Mengklik logo
//             memulai perjalanan ke masa lalu lalu menampilkan gambar-gambar ini satu per satu.
// - memory : wajib bila ada gallery. `popup` = PNG transparan untuk logo pop-up di buku,
//            `logo` = kunci logo 3D di scripts/memory.ts (bentuknya dilacak ke src/data/<kunci>-logo-shape.json).
// Teks deskripsi selain Grape & Mokabi masih draf — sesuaikan dengan proyek aslinya.
export const projects = [
  {
    title: 'Grape',
    kind: 'AI Agent IDE',
    year: '2026',
    desc: 'A code editor where an AI agent writes the code, runs it, and checks the result.',
    overview: [
      'Grape is a code editor with an AI agent inside. You describe what you want in chat; the agent writes the code, runs it, and checks the result.',
      'From one prompt it built a 3D eye that follows your cursor, in about 13 minutes. It also wrote around half of Mokabi.',
    ],
    highlights: [
      'Chat agent that plans, edits files, and runs commands',
      'Edits appear as diffs you can Keep or Undo',
      'Approval step for terminal commands not yet allowed',
      'Code search with embeddings computed inside the IDE',
    ],
    tags: ['VS Code', 'Electron', 'TypeScript', 'Go', 'WebSocket', 'DeepSeek'] as string[],
    image: '',
    memory: { logo: 'grape' as const, popup: '/projects/grape/logo-cutout.png', backdrop: 'sunburst' as const },
    gallery: [
      { src: '/projects/grape/new-ui.webp', caption: 'The new Grape: files, code, terminal, and the agent side by side' },
      { src: '/projects/grape/agent-steps.webp', caption: 'One prompt, 12m 51s: the agent explains each step as it builds' },
      { src: '/projects/grape/eye-emerald.webp', caption: 'Built by Grape: a 3D eye that follows the cursor' },
      { src: '/projects/grape/eye-ember.webp', caption: 'The same eye in the Ember palette, looking the other way' },
      { src: '/projects/mokabi/home.webp', caption: 'Around half of Mokabi was also built with Grape' },
      { src: '/projects/grape/todo-app.png', caption: 'An earlier test: a to-do app made in about a minute' },
    ],
    demo: '#',
    repo: '#',
  },
  {
    title: 'Mokabi',
    kind: 'Language Learning & Chat',
    year: '2026',
    desc: 'Learn a language by chatting with AI, calling an AI teacher, and playing word games.',
    overview: [
      'Mokabi helps you learn a language by using it. You chat with AI characters, call an AI teacher, and play word games with real people.',
      'A short setup matches the app to your language, level, and daily goal. Around half of the app was built with Grape.',
    ],
    highlights: [
      'Chat with AI characters and teachers',
      'Live voice calls to practise speaking',
      'Multiplayer word games against real people',
      'Progress in four skills and a daily goal',
    ],
    tags: ['React Native', 'TypeScript', 'Zustand', 'Node.js', 'Express', 'MongoDB', 'Redis', 'WebSocket', 'DeepSeek', 'Deepgram'] as string[],
    image: '',
    memory: { logo: 'mokabi' as const, popup: '/projects/mokabi/logo.png', backdrop: 'chat' as const },
    gallery: [
      { src: '/projects/mokabi/welcome.webp', caption: 'Welcome: speak any language with AI friends' },
      { src: '/projects/mokabi/setup.webp', caption: 'A short setup tailors the language, level, and daily goal' },
      { src: '/projects/mokabi/home.webp', caption: 'Home: four skills and today’s learning goal at a glance' },
      { src: '/projects/mokabi/characters.webp', caption: 'Characters to chat with, each with their own personality' },
      { src: '/projects/mokabi/teachers.webp', caption: 'AI teachers for daily talk, travel, and job interviews' },
      { src: '/projects/mokabi/chat.webp', caption: 'Practising a coffee order with Nami, an AI teacher' },
      { src: '/projects/mokabi/call.webp', caption: 'A live voice call: practise speaking out loud' },
      { src: '/projects/mokabi/games.webp', caption: 'Word games to play against real people' },
    ],
    demo: 'https://play.google.com/store/apps/details?id=com.moocha&pcampaignid=web_share',
    demoLabel: 'Get it on Google Play',
    repo: '#',
  },
  {
    title: 'Slark',
    kind: 'Cyber Security Monitoring Defender',
    year: '2026',
    desc: 'See attacks on your website the moment they happen, on a live map.',
    overview: [
      'Slark shows attacks on your website as they happen. A small middleware detects each attack and sends it to a live map.',
      'From there you can open the attacker’s profile, read the daily summary, or ask the AI assistant.',
    ],
    highlights: [
      'Live attack map with source → target arcs',
      'Detects SQLi, XSS, brute force, bots, and more',
      'Attacker profiles and daily intel with AI comments',
      'Prepaid plans via Midtrans, per-site API keys',
    ],
    tags: ['React', 'Vite', 'Tailwind CSS', 'ECharts', 'Three.js', 'GSAP', 'Node.js', 'Socket.io', 'MongoDB', 'Midtrans', 'DeepSeek'] as string[],
    image: '',
    memory: { logo: 'slark' as const, popup: '/projects/slark/logo.webp', backdrop: 'radar' as const },
    gallery: [
      { src: '/projects/slark/home.webp', caption: 'See attacks the moment they hit your customers’ sites' },
      { src: '/projects/slark/log-in.webp', caption: 'Log in with email or continue with Google' },
      { src: '/projects/slark/live-map.webp', caption: 'The live map: every attack on your site, source → target' },
      { src: '/projects/slark/history.webp', caption: 'Attack history with a profile for each attacker IP' },
      { src: '/projects/slark/attackers.webp', caption: 'Today’s attackers: every unique IP and how often it struck' },
      { src: '/projects/slark/intel.webp', caption: 'Daily threat activity, peaks, and severity mix' },
      { src: '/projects/slark/subscription.webp', caption: 'An active plan with its own API key, paid through Midtrans' },
      { src: '/projects/slark/api-key.webp', caption: 'The API key is revealed only after an email code' },
      { src: '/projects/slark/integration.webp', caption: 'Integration guide: add the middleware and see attacks on the map' },
    ],
    demo: '#',
    repo: '#',
  },
  {
    title: 'Kias',
    kind: 'Internal Audit System',
    year: '2025',
    desc: 'One place for the whole internal audit, from planning to the final report.',
    overview: [
      'Kias brings the whole internal audit into one place. Every department moves through planning, execution, and review.',
      'The findings then become one report, which the team edits together in OnlyOffice.',
    ],
    highlights: [
      'Risk assessment and audit programs per department',
      'SOP review with AI-assisted step extraction',
      'Worksheets, evidence, and key findings with follow-up',
      'Live collaborative report editing and export',
    ],
    tags: ['Next.js', 'React', 'Tailwind CSS', 'PostgreSQL', 'Prisma', 'NextAuth', 'Zustand', 'WebSocket', 'OnlyOffice', 'Docker'] as string[],
    image: '',
    memory: { logo: 'kias' as const, popup: '/projects/kias/logo.webp', backdrop: 'audit' as const },
    gallery: [
      { src: '/projects/kias/sign-in.webp', caption: 'The KIAS portal: integrity, objectivity, confidentiality, accountability' },
      { src: '/projects/kias/dashboard.webp', caption: 'Dashboard: every audit stage, from planning to review' },
      { src: '/projects/kias/schedule.webp', caption: 'The yearly audit schedule for every department' },
      { src: '/projects/kias/sop-review.webp', caption: 'SOP review status for each department' },
      { src: '/projects/kias/audit-program.webp', caption: 'Audit program: each risk with its test, objective, and procedure' },
      { src: '/projects/kias/audit-review.webp', caption: 'Audit review home with the department map' },
      { src: '/projects/kias/key-findings.webp', caption: 'Key findings with results and recommendations, ready to export' },
      { src: '/projects/kias/report-preview.webp', caption: 'The consolidated report, generated from every department' },
      { src: '/projects/kias/executive-summary.webp', caption: 'Report preview: the executive summary page' },
      { src: '/projects/kias/onlyoffice.webp', caption: 'One click turns the report into Word and opens it in OnlyOffice' },
      { src: '/projects/kias/onlyoffice-findings.webp', caption: 'Findings tables in the 82-page Word report, edited together live' },
    ],
    demo: '#',
    repo: '#',
  },
  {
    title: 'Finly',
    kind: 'Other Income Management System',
    year: '2026',
    desc: 'Follow other income from the vendor record to the published invoice.',
    overview: [
      'Finly tracks a company’s other income from start to finish. Buyers record what each vendor owes and attach the agreement.',
      'Finance then prepares the invoice, uploads the stamped paper, and publishes it to the archive.',
    ],
    highlights: [
      'Separate Buyers and Finance portals',
      'Invoice generation and stamped-paper upload',
      'Deadline reminders by email and live notifications',
      'Revenue trend and searchable archive',
    ],
    tags: ['React', 'TypeScript', 'Tailwind CSS', 'ECharts', 'Express', 'Prisma', 'PostgreSQL', 'Socket.io', 'Docker'] as string[],
    image: '',
    memory: { logo: 'finly' as const, popup: '/projects/finly/logo.webp', backdrop: 'ledger' as const },
    gallery: [
      { src: '/projects/finly/sign-in.webp', caption: 'One sign-in for the Buyers and Finance departments' },
      { src: '/projects/finly/buyers-overview.webp', caption: 'Buyers overview: records, reminders, and the revenue trend' },
      { src: '/projects/finly/add-record.webp', caption: 'Adding a record: vendor, agreement files, amount, and period' },
      { src: '/projects/finly/finance-tasks.webp', caption: 'Finance tasks: download the invoice, then upload the stamped paper' },
      { src: '/projects/finly/finance-archive.webp', caption: 'The archive of published records with every document attached' },
      { src: '/projects/finly/buyers-history.webp', caption: 'Buyers see each record once Finance has finished it' },
    ],
    demo: '#',
    repo: '#',
  },
];

export type Chapter = {
  numeral: string;
  title: string;
  subtitle: string;
  page: number;
};

// Nomor halaman dihitung otomatis dari jumlah proyek.
// Setiap bab dimulai di halaman kiri (genap); halaman kosong ditambahkan bila perlu.
const even = (n: number) => n + (n % 2);
// Daftar proyek: halaman pertama (ada judul bab) memuat 2, halaman berikutnya masing-masing 3
export const projectGroups = [projects.slice(0, 2)];
for (let i = 2; i < projects.length; i += 3) projectGroups.push(projects.slice(i, i + 3));
export const PROJECTS_PAGE = 4;
export const projectListPages = projectGroups.length;
export const DETAIL_PAGE = PROJECTS_PAGE + even(projectListPages);
// Halaman detail + satu halaman galeri bila proyek punya gallery
const pagesOf = (p: (typeof projects)[number]) => (p.gallery?.length ? 2 : 1);
export const detailPageCount = projects.reduce((sum, p) => sum + pagesOf(p), 0);
const SKILLS_PAGE = DETAIL_PAGE + even(detailPageCount);
const BLOG_PAGE = SKILLS_PAGE + 4;

// Tulisan blog. Setiap tulisan memakai dua halaman:
// halaman kiri = judul + `opening`, halaman kanan = `body` + kutipan + penutup.
export const posts = [
  {
    title: 'Learn How It Works, Let AI Help You Build',
    date: 'November 2026',
    readTime: '3 min read',
    tags: ['AI', 'Development', 'Learning'],
    lead: 'Building software used to mean writing every line by hand. Today, the most valuable skill is understanding how things work.',
    // Bagian-bagian tulisan; dua bagian pertama di halaman kiri, sisanya di halaman kanan.
    sections: [
      {
        heading: 'How it used to be',
        text: 'Building a website or an app meant weeks of writing code line by line, then searching forums for one missing semicolon. Most of that time went into typing, not thinking.',
      },
      {
        heading: 'What changed',
        text: 'AI can now help us write, explain, and fix code. A login form, an API route, or an animation can be drafted in minutes instead of a day.',
      },
      {
        heading: 'What to learn now',
        text: 'Learn how frameworks, plugins, and tools work. Know what React does when state changes, or how a server handles a request. Then you can tell AI exactly what to build, and notice when it is wrong.',
      },
      {
        heading: 'Who stays in control',
        text: 'AI does not replace the developer; it replaces the slow parts. We still decide what to build, review every change, and own the result.',
      },
    ],
    quote: 'Coding less does not mean understanding less. It means spending our time where it matters.',
    closing: 'Learn the concepts. Let AI handle the typing. Spend the time you save on ideas.',
  },
];

export const projectPage = (i: number) => DETAIL_PAGE + projects.slice(0, i).reduce((sum, p) => sum + pagesOf(p), 0);

export const chapters: Chapter[] = [
  { numeral: 'I', title: 'Introduction', subtitle: 'About me', page: 2 },
  { numeral: 'II', title: 'Projects', subtitle: 'Selected works', page: PROJECTS_PAGE },
  { numeral: 'III', title: 'Project Details', subtitle: 'The story behind each work', page: DETAIL_PAGE },
  { numeral: 'IV', title: 'Skills', subtitle: 'Tools & abilities', page: SKILLS_PAGE },
  { numeral: 'V', title: 'Journey', subtitle: 'Footsteps so far', page: SKILLS_PAGE + 2 },
  { numeral: 'VI', title: 'Blog', subtitle: 'Notes & thoughts', page: BLOG_PAGE },
  { numeral: 'VII', title: 'Contact', subtitle: 'Let’s connect', page: BLOG_PAGE + posts.length * 2 },
];

// Setiap keahlian: [nama, keterangan singkat]. Dua kelompok pertama tampil di halaman kiri,
// sisanya di halaman kanan.
export const skills = [
  {
    group: 'Frontend & Mobile',
    items: [
      ['React', 'Web interfaces'],
      ['Next.js', 'Full-stack web apps'],
      ['React Native', 'Mobile apps'],
      ['Tailwind CSS', 'Styling'],
      ['GSAP', 'Animation'],
    ] as [string, string][],
  },
  {
    group: 'Languages',
    items: [
      ['JavaScript', 'The language of the web'],
      ['TypeScript', 'Typed JavaScript'],
    ] as [string, string][],
  },
  {
    group: 'Backend, AI & DevOps',
    items: [
      ['Node.js', 'Servers & tooling'],
      ['AI Development', 'Any tech stack'],
      ['DevOps', 'Docker, Jenkins CI/CD, cloud deploys'],
    ] as [string, string][],
  },
  {
    group: 'Communication',
    items: [
      ['Indonesian', 'Native'],
      ['English', 'Professional working'],
    ] as [string, string][],
  },
];

// Ditampilkan sebagai peta di dua halaman, dari yang terlama (kiri bawah) ke terbaru (tanda X).
// Peta menampung sampai 4 tahap; isi ringkas agar kartu di peta tetap muat.
export const journey = [
  {
    year: '2026',
    title: 'Graduated',
    place: 'STIKOM Bali',
    desc: 'Finished my studies and graduated.',
  },
  {
    year: '2025 – 2026',
    title: 'Software Engineer',
    place: 'WHSmith',
    desc: 'Built and maintained software as part of the team.',
  },
];

export const socials = [
  { name: 'GitHub', handle: 'github.com/Kaluna7', url: 'https://github.com/Kaluna7' },
  { name: 'LinkedIn', handle: 'I Made Kaluna Gadyanga', url: 'https://www.linkedin.com/in/i-made-kaluna-gadyanga-66b9902b7/' },
  { name: 'Instagram', handle: '@kaluna_._', url: 'https://www.instagram.com/kaluna_._/' },
];
