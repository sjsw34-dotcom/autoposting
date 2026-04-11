/**
 * 띠별 운세 생성기 (아침 X 스레드용)
 * 12띠 전체 운세를 날짜 기반 결정적 랜덤으로 생성
 * 요일별 카테고리 로테이션
 */

const ZODIAC = [
  { animal: 'Rat', emoji: '🐀', years: '08,96,84,72' },
  { animal: 'Ox', emoji: '🐂', years: '97,85,73,61' },
  { animal: 'Tiger', emoji: '🐅', years: '98,86,74,62' },
  { animal: 'Rabbit', emoji: '🐇', years: '99,87,75,63' },
  { animal: 'Dragon', emoji: '🐉', years: '00,88,76,64' },
  { animal: 'Snake', emoji: '🐍', years: '01,89,77,65' },
  { animal: 'Horse', emoji: '🐴', years: '02,90,78,66' },
  { animal: 'Sheep', emoji: '🐑', years: '03,91,79,67' },
  { animal: 'Monkey', emoji: '🐒', years: '04,92,80,68' },
  { animal: 'Rooster', emoji: '🐓', years: '05,93,81,69' },
  { animal: 'Dog', emoji: '🐕', years: '06,94,82,70' },
  { animal: 'Pig', emoji: '🐷', years: '07,95,83,71' },
] as const;

const HOOKS = [
  'Stop scrolling. This Korean Saju reading found you for a reason.',
  "If you're seeing this, the timing isn't random. Your Saju energy brought you here.",
  "This isn't a coincidence. Your Korean Saju reading is ready.",
  'Before you keep scrolling, this message was meant to find you today.',
  "The universe doesn't do accidents. This reading landed in your feed right on time.",
  'Something told you to stop here. Your Saju energy is talking.',
  "You weren't supposed to scroll past this. Your reading is waiting.",
  'The fact that you paused here? Your intuition confirming what Saju already knows.',
];

const FORTUNES: Record<string, string[]> = {
  career: [
    'a breakthrough idea arrives when you least expect it',
    'someone influential finally notices your quiet effort',
    'a decision you\'ve been avoiding becomes crystal clear',
    'your patience at work is about to pay off big',
    'a career seed you planted months ago starts sprouting',
    'your natural leadership shines today',
    'trust that side project energy — it\'s building toward something',
    'a new skill you\'ve been learning opens an unexpected door',
    'your reputation is growing faster than you realize',
    'the work you did in silence is about to speak loudly',
    'an old connection resurfaces with a surprising opportunity',
    'your instincts about that project were right all along',
  ],
  love: [
    'an unexpected conversation deepens a connection',
    'someone from your past crosses your mind for a reason',
    'vulnerability becomes your superpower today',
    'chemistry is high — say what you actually feel',
    'a small gesture of kindness creates a ripple effect',
    'the universe is aligning you with someone who matches your depth',
    'your emotional honesty attracts exactly the right energy',
    'a meaningful connection is closer than you think',
    'someone is noticing you in ways you haven\'t realized yet',
    'the love you\'ve been giving is about to come back tenfold',
    'a friendship quietly shifts into something deeper',
    'the wall you built is ready to come down for the right person',
  ],
  wealth: [
    'an unexpected financial opportunity crosses your path',
    'your money instincts are sharp today — trust them',
    'generosity today creates abundance tomorrow',
    'financial clarity hits — make notes, not impulse buys',
    'a small investment of time or money pays off later',
    'the energy favors passive income and smart moves',
    'review your spending — you\'ll find hidden savings',
    'a conversation about money leads somewhere surprising',
    'your financial patience is about to be rewarded',
    'wealth energy is building quietly in the background',
    'an overlooked asset turns out to be worth more than expected',
    'the financial risk you\'re weighing has better odds than you think',
  ],
  warning: [
    'don\'t force decisions today — let things settle first',
    'guard your heart — not everyone deserves access right now',
    'avoid impulse purchases — sleep on it',
    'burnout energy is creeping in — slow down before you crash',
    'old patterns may resurface — recognize them before they repeat',
    'miscommunication is likely — say less, listen more',
    'not the day for risky moves — observe and prepare',
    'someone\'s energy may drain you — protect your boundaries',
    'scarcity mindset is loud today — don\'t listen to it',
    'your body is holding tension — stretch, breathe, release',
    'that "yes" you\'re about to give? make sure it\'s not people-pleasing',
    'the shortcut tempting you leads to a longer road',
  ],
  growth: [
    'you\'re closer to a breakthrough than you feel right now',
    'what feels like confusion is actually transformation loading',
    'the pressure you\'re feeling isn\'t punishment — it\'s preparation',
    'your next level requires releasing what got you here',
    'trust the process even when you can\'t see the full picture',
    'the version of you from 6 months ago wouldn\'t recognize who you\'re becoming',
    'something you\'ve been healing is finally starting to close',
    'your intuition is sharper than ever — stop second-guessing it',
    'a pattern you\'ve been stuck in is about to break',
    'the growth happening inside you is about to show on the outside',
    'that discomfort you feel is your old self making room for the new',
    'you\'re not behind — you\'re building something that takes time',
  ],
};

const CAT_LABELS: Record<string, string> = {
  career: '💼 Career & Purpose',
  love: '💕 Love & Connection',
  wealth: '💰 Wealth & Abundance',
  warning: '⚠️ Caution & Protection',
  growth: '🌱 Growth & Transformation',
};

// 요일별 카테고리 (0=일, 1=월, ..., 6=토)
const DAY_CATEGORY = ['career', 'career', 'love', 'wealth', 'growth', 'warning', 'love'];

const CLOSERS = [
  'Find your birth year. That message was written for you today.',
  'Save this post. Come back when it happens.',
  'The sign that resonated most? That\'s your Saju energy speaking.',
  'If you felt a pull while reading yours, trust that feeling.',
  'Tag someone whose sign you just read. They need to see this.',
  'Not every sign will feel this equally. The ones doing inner work feel it most.',
];

const CTAS = [
  'Drop your birth year if this hit different',
  'Comment your year — I\'ll tell you one more thing about your energy',
  'Type your birth year if you claimed this reading',
  'Which sign are you? Drop it below',
  'Type "YES" if your sign was accurate',
];

// 결정적 시드 랜덤
function seededRandom(seed: number) {
  let s = Math.abs(seed) || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function getDaySeed(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function fmtDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export interface ZodiacFortune {
  hook: string;
  category: string;
  categoryLabel: string;
  dateStr: string;
  signs: { emoji: string; animal: string; years: string; fortune: string }[];
  closer: string;
  cta: string;
}

/**
 * 오늘의 띠별 ��세 생성 (날짜 기반 결정적)
 */
export function generateZodiacFortune(date: Date = new Date()): ZodiacFortune {
  const category = DAY_CATEGORY[date.getDay()];
  const seed = getDaySeed(date) * 10 + DAY_CATEGORY.indexOf(category);
  const rng = seededRandom(seed);

  const pool = FORTUNES[category];
  const hook = pick(HOOKS, rng);
  const closer = pick(CLOSERS, rng);
  const cta = pick(CTAS, rng);

  const used = new Set<string>();
  const signs = ZODIAC.map((z) => {
    let msg: string;
    let attempts = 0;
    do { msg = pick(pool, rng); attempts++; } while (used.has(msg) && attempts < 30);
    used.add(msg);
    return { emoji: z.emoji, animal: z.animal, years: z.years, fortune: msg };
  });

  return {
    hook,
    category,
    categoryLabel: CAT_LABELS[category],
    dateStr: fmtDate(date),
    signs,
    closer,
    cta,
  };
}

/**
 * 띠별 운세를 X 스레드(연속 트���)로 포맷
 * 각 트윗 280자 이내
 */
export function formatZodiacThread(fortune: ZodiacFortune): string[] {
  const tweets: string[] = [];

  // Tweet 1: 후크
  tweets.push(
    `✨ KOREAN SAJU DAILY READING\n${fortune.categoryLabel}\n${fortune.dateStr}\n\n${fortune.hook}\n\n🧵👇`
  );

  // 12개 띠를 3개씩 4개 트윗으로
  for (let i = 0; i < 12; i += 3) {
    const batch = fortune.signs.slice(i, i + 3);
    const lines = batch.map(s =>
      `${s.emoji} ${s.animal} (${s.years})\n→ ${s.fortune}`
    );
    tweets.push(lines.join('\n\n'));
  }

  // 마지막 트윗: 클로저 + CTA
  tweets.push(
    `${fortune.closer}\n\n💬 ${fortune.cta}\n\n🔗 sajumuse.com/free-reading`
  );

  return tweets;
}
