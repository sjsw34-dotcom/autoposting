/**
 * saju_book 134챕터에서 추출한 압축 지식 베이스
 * 프롬프트에 주입하여 AI가 실제 사주 지식 기반으로 콘텐츠 생성하도록 함
 */

import type { ContentType } from '@/lib/db/posts';

// ============================================================
// CORE TERMINOLOGY (항상 주입)
// ============================================================

const CORE_TERMS = `KEY SAJU TERMS (use these correctly):
- Day Master (일간 Ilgan): Heavenly Stem of Day Pillar = core identity
- Four Pillars (사주 Saju): Year, Month, Day, Hour — each has Heavenly Stem + Earthly Branch
- Five Elements (오행 Ohaeng): Wood(목), Fire(화), Earth(토), Metal(금), Water(수) — dynamic movements, not static substances
- Useful God (용신 Yongsin): the single element your chart needs most for balance
- Ten Gods (십신 Sipsin): 10 relationship archetypes between any element and Day Master
- Grand Fortune (대운 Daeun): 10-year fortune periods — most powerful timing mechanism
- Annual Fortune (연운 Yeonun): yearly elemental energy overlay`;

// ============================================================
// 10 DAY MASTERS
// ============================================================

const DAY_MASTERS: Record<string, string> = {
  'Yang Wood': '甲 Gap — The Towering Tree. Natural leader, principled, ambitious, direct. Rigid under pressure. Needs Fire(sunlight) + Water to grow. Careers: management, law, politics, architecture. In love: protective, loyal, can be controlling.',
  'Yin Wood': '乙 Eul — The Vine. Adaptable, diplomatic, resilient, charming. Indecisive, avoids confrontation. Needs something to cling to. Careers: counseling, design, writing, teaching. In love: warm, accommodating, can lose self in partner.',
  'Yang Fire': '丙 Byeong — The Blazing Sun. Charismatic, generous, optimistic, lights up rooms. Impulsive, risks burnout, naive about who deserves warmth. Careers: performance, media, public speaking, education. In love: passionate, dramatic, needs appreciation.',
  'Yin Fire': '丁 Jeong — The Candle Flame. Perceptive, intuitive, focused intensity. Moody, overthinks, jealous, can\'t let go. Needs Wood(fuel) for purpose. Careers: research, psychology, technology, art. In love: deeply devoted but possessive.',
  'Yang Earth': '戊 Mu — The Great Mountain. Stable, reliable, patient, trustworthy. Stubborn, slow to change, stagnates without challenge. Contains hidden treasures. Careers: real estate, construction, government. In love: shows love through action, not words.',
  'Yin Earth': '己 Gi — The Garden Soil. Nurturing, practical, modest, productive behind scenes. Self-doubt, people-pleasing, absorbs others\' problems. Most underestimated DM. Careers: healthcare, food, social work. In love: selfless but can lose identity.',
  'Yang Metal': '庚 Gyeong — The Sword. Decisive, courageous, action-oriented, fierce justice. Harsh, aggressive, struggles with nuance. Must be tempered by Fire. Careers: military, surgery, finance, law enforcement. In love: loyal but domineering.',
  'Yin Metal': '辛 Sin — The Jewel. Refined, aesthetic, precise, eloquent. Perfectionist, vain, fragile under criticism. Needs polishing (education/mentorship). Careers: art, luxury, beauty, quality control. In love: romantic but high-maintenance.',
  'Yang Water': '壬 Im — The Ocean. Visionary, ambitious, deep, grand scale thinker. Restless, unreliable, poor boundaries. Cannot be contained, only directed. Careers: international business, philosophy, tech. In love: exciting but unpredictable.',
  'Yin Water': '癸 Gye — The Rain. Intuitive, empathetic, quiet, spiritual depth. Passive, melancholic, difficulty asserting self. Most yin of all DMs. Careers: research, writing, healing, data. In love: deeply understanding, withdraws when hurt.',
};

// ============================================================
// FIVE ELEMENTS
// ============================================================

const ELEMENT_PROFILES: Record<string, string> = {
  Wood: 'Movement: rising/upward. Season: Spring. Direction: East. Emotion: anger. Produces Fire, controlled by Metal, controls Earth. Morning people, need clear goals, frustrated by stagnation. Starters/initiators — finishing is the challenge. Fed by: fresh starts, nature, autonomy. Drained by: no direction, bureaucracy, excessive control.',
  Fire: 'Movement: radiating/spreading. Season: Summer. Direction: South. Emotion: joy. Produces Earth, controlled by Water, controls Metal. Peak energy 9am-1pm. Personal brand monetizers. Fed by: spotlight, passion projects, recognition. Drained by: isolation, back-office roles, monotony.',
  Earth: 'Movement: centering/settling. Season: late summer/transitions. Direction: Center. Emotion: worry. Produces Metal, controlled by Wood, controls Water. Need routine for foundation. Provider archetype. Fed by: stability, consistency, being relied on. Drained by: constant change, forced choosing sides.',
  Metal: 'Movement: inward/condensing. Season: Autumn. Direction: West. Emotion: grief. Produces Water, controlled by Fire, controls Wood. Specialist/expert archetype. Fed by: quality standards, depth over breadth, precision. Drained by: high-volume low-quality work, forced self-promotion.',
  Water: 'Movement: downward/flowing. Season: Winter. Direction: North. Emotion: fear. Produces Wood, controlled by Earth, controls Fire. Recharges through solitude. Advisor archetype. Fed by: depth, pattern recognition, intellectual property. Drained by: transactional fast-paced environments.',
};

const ELEMENT_CYCLES = `PRODUCTIVE CYCLE (상생): Wood→Fire (fuel burns), Fire→Earth (ash becomes soil), Earth→Metal (mountains contain ore), Metal→Water (cold metal gathers condensation), Water→Wood (rain feeds roots).
CONTROLLING CYCLE (상극): Metal cuts Wood, Wood breaks Earth, Earth dams Water, Water extinguishes Fire, Fire melts Metal.
RULE: producing drains the producer. Controlling costs the controller energy.`;

// ============================================================
// TEN GODS (십신)
// ============================================================

const TEN_GODS: Record<string, string> = {
  'Eating God': '식신 Siksin (same polarity as DM). Gentle creativity, natural talent, joy of process. Associated with food/comfort/nurturing. Steady sustainable production. Careers: culinary, design, teaching, therapy. When excessive: lazy, overindulgent. KEY: counters Seven Killings pressure.',
  'Hurting Officer': '상관 Sanggwan (diff polarity). Intense rebellious brilliance. "Hurts" the Direct Officer — anti-establishment. Explosive genius followed by emptiness. Sharp tongue, verbally witty. Careers: startups, investigative journalism, tech disruption. When excessive: argumentative, creates enemies.',
  'Indirect Wealth': '편재 Pyeonjae (same polarity). Speculative wealth that moves — investments, ventures, windfalls. Multiple income streams. Generous spender. High risk tolerance. Represents father. Careers: business ownership, sales, investing, trade. When excessive: boom-bust cycles.',
  'Direct Wealth': '정재 Jeongjae (diff polarity). Steady wealth that stays — salary, savings, property. Conservative, budgets everything. Low risk tolerance. Represents wife (traditional). Careers: accounting, banking, civil service. When excessive: miserly, rigid, afraid to spend.',
  'Indirect Officer': '편관 Pyeongwan / Seven Killings 칠살. Raw demanding authority. Forge-like pressure that transforms or shatters. Rapid rises and falls. Careers: military, surgery, crisis management. Antidote: Eating God (식신). When excessive: chronic burnout, health damage.',
  'Direct Officer': '정관 Jeonggwan (diff polarity). Structured legitimate authority. Merit-based promotions. Proper channels. Represents husband (traditional). Careers: civil service, corporate, law, academia. Clashes with Hurting Officer (creative rebellion vs structure).',
  'Indirect Seal': '편인 Pyeonin (same polarity). Unconventional learning — self-taught, experiential, intuitive. Cross-disciplinary knowledge. Careers: research, alternative medicine, art, writing. DANGER when excessive: steals Eating God output (편인도탈) = knowledge hoarder who never produces.',
  'Direct Seal': '정인 Jeongin (diff polarity). Formal education, institutional mentorship. Deep specialized knowledge. Strong ethics. Represents mother. Careers: academia, medicine, law, engineering. When excessive: eternal student, waits for approval, can\'t decide independently.',
  'Friend': '비견 Bigyeon (same polarity). Purest companionship, shoulder to shoulder. Equal peer relationships. Reinforces self-confidence. Careers: partnerships, co-ops, consulting teams. When excessive: echo chamber, no one challenges you.',
  'Rob Wealth': '겁재 Geopjae (diff polarity). Companionship with edge — same element but competes for everything. Greatest growth through rivalry. Careers: competitive sales, trading, entrepreneurship. DANGER: financial volatility, partnership disputes.',
};

// ============================================================
// 12 LIFE STAGES (십이운성)
// ============================================================

const TWELVE_STAGES = `THE 12 LIFE STAGES (energy phases, NOT literal predictions):
RISING: Birth(장생)=fresh potential, Bathing(목욕)=emotionally turbulent/attractive, Crown(관대)=identity solidifies, Prime(건록)=sustainable power/peak career, Peak(제왕)=maximum but nowhere to go but down.
FALLING: Decline(쇠)=wisdom replaces force, Sickness(병)=perceptive/turns inward, Death(사)=dormant not dead/letting go, Tomb(묘)=hidden compressed potential, Extinction(절)=absolute reset/blank slate.
RENEWAL: Conception(태)=first invisible spark, Nurture(양)=growing invisibly/can't rush.
KEY: "Death stage" = transformation not doom. "Peak" = risk of burnout. No stage is inherently good or bad.`;

// ============================================================
// FORTUNE CYCLES
// ============================================================

const FORTUNE_CYCLES = `GRAND FORTUNE (대운 Daeun): 10-year periods from Month Pillar. Direction: Male+Yang year OR Female+Yin year = Forward; opposite = Backward. First 5 years = Stem dominant, last 5 = Branch dominant. When Useful God arrives = life improves dramatically. When Unfavorable God arrives = obstacles multiply.
ANNUAL FORTUNE (연운 Yeonun): yearly overlay. Same year affects different DMs completely differently. Grand Fortune = climate, Annual Fortune = weather. Favorable decade + unfavorable year = manageable. Unfavorable decade + unfavorable year = patience essential.`;

// ============================================================
// SPECIAL STARS (신살)
// ============================================================

const SPECIAL_STARS = `MYSTICAL STARS (신살 Shinsal):
- Peach Blossom (도화 Dohwa): charm, romantic magnetism, artistic talent. Shadow: boundary issues, excessive attachment to appearances. Expression depends on chart balance.
- Traveling Horse (역마 Yeokma): movement, travel, career transitions, restlessness. Positive: international success. Shadow: can't commit, chronic dissatisfaction.
- Nobleman Star (천을귀인): help from influential people at critical moments. Multiple = exceptional social luck.
- Void/Empty (공망 Gongmang): emptiness in a life area, but also spiritual depth and transcendence.`;

// ============================================================
// COMPATIBILITY
// ============================================================

const COMPATIBILITY_BASICS = `HEAVENLY STEM HARMONY (천간합) — strongest compatibility pairs:
甲+己 Yang Wood + Yin Earth, 乙+庚 Yin Wood + Yang Metal, 丙+辛 Yang Fire + Yin Metal, 丁+壬 Yin Fire + Yang Water, 戊+癸 Yang Earth + Yin Water.
What controls you may be exactly what attracts you.`;

const POWER_COUPLES: Record<string, string> = {
  'Wood+Fire': 'Launchpad — electric chemistry, Wood feeds Fire\'s enthusiasm. Risk: Wood gets depleted.',
  'Wood+Earth': 'Builder Pair — Wood\'s vision + Earth\'s stability. Risk: Wood bulldozes boundaries.',
  'Wood+Metal': 'Tension Pair — Metal keeps Wood honest. Risk: Metal\'s criticism becomes corrosive.',
  'Wood+Water': 'Natural Cycle — feels fated, Water nourishes Wood. Risk: Water loses self.',
  'Fire+Fire': 'Twin Flame — unmatched passion. Risk: both need spotlight, explosion-reconciliation cycles.',
  'Fire+Earth': 'Hearth — Fire warms, Earth contains sustainably. Risk: Earth becomes caretaker.',
  'Fire+Metal': 'Forge — transformative opposites-attract. Risk: Fire overwhelms, Metal restricts.',
  'Fire+Water': 'Steam — maximum chemistry + maximum risk. Can extinguish or evaporate each other.',
  'Earth+Earth': 'Bedrock — safest, most stable. Risk: stagnation, suppressed conflict.',
  'Earth+Metal': 'Trusted Foundation — solid, reliable. Risk: emotional flatness.',
  'Earth+Water': 'River Basin — Earth gives shape, Water gives depth. Risk: Earth dampens Water\'s flow.',
  'Metal+Metal': 'Double Standard — razor-sharp intellectual compatibility. Risk: two uncompromising standards clash.',
  'Metal+Water': 'Deep Well — extraordinary intimacy, Metal contains Water\'s depth. Risk: control restricts flow.',
  'Water+Water': 'Ocean — infinite psychological intimacy. Risk: no practical structure, identities merge.',
};

// ============================================================
// EARNING STYLES
// ============================================================

const EARNING_STYLES: Record<string, string> = {
  Wood: 'The Builder — entrepreneurship, equity-based compensation, scalable businesses. Edge: long-game compound growth. Trap: fixed salaries with no upside.',
  Fire: 'The Performer — personal brand, performance-based pay, client-facing roles. Edge: magnetism converts to opportunity. Trap: back-office invisibility.',
  Earth: 'The Provider — salaried + benefits, recurring revenue, reputation-based practice. Edge: retention, clients who stay. Trap: commission-only volatility.',
  Metal: 'The Specialist — expert consulting at premium rates, systems-based quality. Edge: depth commands price premium. Trap: high-volume low-quality work.',
  Water: 'The Advisor — advisory/coaching, research, passive IP income (courses, books). Edge: pattern recognition. Trap: transactional fast-paced roles.',
};

// ============================================================
// USEFUL GOD SYSTEM
// ============================================================

const USEFUL_GOD = `USEFUL GOD (용신 Yongsin) SYSTEM:
5 Gods: Useful God(용신)=what chart needs most, Favorable God(희신)=supports useful, Unfavorable God(기신)=opposes useful, Hostile God(구신)=amplifies problems, Idle God(한신)=neutral.
Weak DM needs: Resource or Companion as Useful God (support).
Strong DM needs: Output, Wealth, or Authority as Useful God (channel excess).
Same element can be Useful God in one chart and Unfavorable in another — always context-dependent.
When Useful God arrives via fortune cycle = career breakthroughs, harmony, feeling "more like yourself."`;

// ============================================================
// TOPIC-TO-KNOWLEDGE MATCHING
// ============================================================

interface TopicKnowledge {
  topic: string;
  knowledge: string;
}

function matchesAny(topic: string, keywords: string[]): boolean {
  const lower = topic.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function buildKnowledgeForInsight(topic: string): string {
  const parts: string[] = [CORE_TERMS];

  if (matchesAny(topic, ['day master', 'ilgan'])) {
    const masters = Object.entries(DAY_MASTERS).map(([k, v]) => `${k}: ${v}`).join('\n');
    parts.push(`DAY MASTER PROFILES:\n${masters}`);
  }
  if (matchesAny(topic, ['element', 'fire', 'water', 'wood', 'metal', 'earth', 'seasonal', 'balance'])) {
    parts.push(ELEMENT_CYCLES);
    const relevant = Object.entries(ELEMENT_PROFILES)
      .filter(([k]) => matchesAny(topic, [k.toLowerCase()]) || matchesAny(topic, ['element', 'seasonal', 'balance']))
      .map(([k, v]) => `${k}: ${v}`);
    if (relevant.length) parts.push(relevant.join('\n'));
  }
  if (matchesAny(topic, ['ten star', 'ten god', 'wealth star', 'power star', 'authority', 'gwanseong', 'pyeong', 'jeong', 'output', 'seal', 'companion', 'rob wealth', 'friend'])) {
    const relevant = Object.entries(TEN_GODS)
      .filter(([k]) => {
        if (matchesAny(topic, ['wealth'])) return k.includes('Wealth');
        if (matchesAny(topic, ['power', 'authority', 'gwanseong', 'pyeong', 'jeong'])) return k.includes('Officer');
        if (matchesAny(topic, ['output', 'eating', 'hurting'])) return k.includes('Eating') || k.includes('Hurting');
        if (matchesAny(topic, ['seal', 'resource'])) return k.includes('Seal');
        if (matchesAny(topic, ['companion', 'rob', 'friend'])) return k.includes('Friend') || k.includes('Rob');
        return true;
      })
      .map(([k, v]) => `${k}: ${v}`);
    parts.push(relevant.join('\n'));
  }
  if (matchesAny(topic, ['12 stage', 'death stage', 'birth year', 'peak year', 'running on empty', 'bath stage', 'energy'])) {
    parts.push(TWELVE_STAGES);
  }
  if (matchesAny(topic, ['peach blossom', 'noble star', 'traveling horse', 'protector', 'magnetic', 'hidden'])) {
    parts.push(SPECIAL_STARS);
  }
  if (matchesAny(topic, ['useful god', 'yongsin', 'too much', 'desperate', 'chart full of'])) {
    parts.push(USEFUL_GOD);
  }
  if (matchesAny(topic, ['hidden stem', 'earthly branch', 'secret personality'])) {
    parts.push('Hidden Stems (지장간 Jijanган): each Earthly Branch contains 1-3 hidden Heavenly Stems that reveal sub-personalities not visible on the surface chart. They explain why people of the same Day Master can be so different.');
  }
  if (matchesAny(topic, ['clash', 'harmony', 'three harmony', 'pillar clash', 'breaking apart'])) {
    parts.push('Six Clashes (육충): 子-午, 丑-未, 寅-申, 卯-酉, 辰-戌, 巳-亥. Clash = sudden disruption/tension. Year+Day clash = inner conflict since birth. Three Harmony (삼합): 亥卯未=Wood, 寅午戌=Fire, 巳酉丑=Metal, 申子辰=Water. When all 3 branches present = everything clicks.');
  }

  return parts.join('\n\n');
}

function buildKnowledgeForFortune(element: string): string {
  const profile = ELEMENT_PROFILES[element] || '';
  return `${CORE_TERMS}

TODAY'S ELEMENT REFERENCE:
${element}: ${profile}

${ELEMENT_CYCLES}

${FORTUNE_CYCLES}`;
}

function buildKnowledgeForLove(topic: string): string {
  const parts: string[] = [CORE_TERMS, COMPATIBILITY_BASICS];

  // Find matching power couple dynamics
  const relevantCouples = Object.entries(POWER_COUPLES)
    .filter(([k]) => {
      const elements = k.split('+');
      return elements.some(e => matchesAny(topic, [e.toLowerCase()]));
    })
    .map(([k, v]) => `${k}: ${v}`);
  if (relevantCouples.length) parts.push(`PAIRING DYNAMICS:\n${relevantCouples.join('\n')}`);

  // Element-specific relationship traits from Day Masters
  if (matchesAny(topic, ['attachment', 'ghost', 'falls too fast', 'strong day master'])) {
    const masters = Object.entries(DAY_MASTERS).map(([k, v]) => `${k}: ${v}`).join('\n');
    parts.push(`DAY MASTER LOVE PROFILES:\n${masters}`);
  }

  if (matchesAny(topic, ['peach blossom', 'magnetic', 'messy'])) {
    parts.push(SPECIAL_STARS);
  }
  if (matchesAny(topic, ['timing', 'love timing', 'cycle'])) {
    parts.push(FORTUNE_CYCLES);
  }
  if (matchesAny(topic, ['clash', 'breaking up', 'branch', 'pillar'])) {
    parts.push('Earthly Branch clashes in Day Pillar = intimate sphere tension (most significant for relationships). Six Clashes (육충): 子-午, 丑-未, 寅-申, 卯-酉, 辰-戌, 巳-亥.');
  }
  if (matchesAny(topic, ['wealth star', 'money', 'fight about money'])) {
    parts.push(`${TEN_GODS['Indirect Wealth']}\n${TEN_GODS['Direct Wealth']}`);
  }
  if (matchesAny(topic, ['birth hour', 'space', 'closeness'])) {
    parts.push('Hour Pillar reveals: dreams, children, inner desires, and how you behave in private/later life. It\'s the most hidden pillar — what you need when no one is watching.');
  }

  return parts.join('\n\n');
}

function buildKnowledgeForWealth(topic: string): string {
  const parts: string[] = [CORE_TERMS];

  // Always include earning styles
  const relevantStyles = Object.entries(EARNING_STYLES)
    .filter(([k]) => matchesAny(topic, [k.toLowerCase()]) || !matchesAny(topic, ['wood', 'fire', 'earth', 'metal', 'water']))
    .map(([k, v]) => `${k}: ${v}`);
  parts.push(`EARNING STYLES BY ELEMENT:\n${relevantStyles.join('\n')}`);

  // Wealth Stars
  if (matchesAny(topic, ['wealth star', 'pyeonjae', 'jeongjae', 'earner', 'gambler', 'steady'])) {
    parts.push(`${TEN_GODS['Indirect Wealth']}\n${TEN_GODS['Direct Wealth']}\nCRITICAL: More Wealth Stars ≠ more money. It means more financial ENERGY. Strong DM + Strong Wealth = prosperity. Weak DM + Strong Wealth = desire exceeds capacity.`);
  }
  if (matchesAny(topic, ['power star', 'management', 'authority'])) {
    parts.push(`${TEN_GODS['Indirect Officer']}\n${TEN_GODS['Direct Officer']}`);
  }
  if (matchesAny(topic, ['food god', 'sikshin', 'creative', 'eating god'])) {
    parts.push(TEN_GODS['Eating God']);
  }
  if (matchesAny(topic, ['10-year', 'fortune cycle', 'raise', 'career change', 'peak', 'timing'])) {
    parts.push(FORTUNE_CYCLES);
    parts.push(TWELVE_STAGES);
  }
  if (matchesAny(topic, ['day master', 'save', 'burn out', 'negotiate', 'impulsive', 'side hustle', 'undercharge'])) {
    const relevant = Object.entries(DAY_MASTERS)
      .filter(([k]) => matchesAny(topic, [k.split(' ')[1]?.toLowerCase() || '']) || !matchesAny(topic, ['wood', 'fire', 'earth', 'metal', 'water']))
      .map(([k, v]) => `${k}: ${v}`);
    if (relevant.length) parts.push(relevant.join('\n'));
  }
  if (matchesAny(topic, ['ai', 'remote', 'invest', 'crypto'])) {
    const allMasters = Object.entries(DAY_MASTERS).map(([k, v]) => `${k}: ${v}`).join('\n');
    parts.push(allMasters);
  }

  return parts.join('\n\n');
}

function buildKnowledgeForKCulture(topic: string): string {
  const parts: string[] = [CORE_TERMS, ELEMENT_CYCLES];

  if (matchesAny(topic, ['element', 'five element', 'bbq', 'hanbok', 'color', 'skincare', 'jjimjilbang'])) {
    const profiles = Object.entries(ELEMENT_PROFILES).map(([k, v]) => `${k}: ${v}`).join('\n');
    parts.push(profiles);
  }
  if (matchesAny(topic, ['day master', 'fire day master', 'k-drama', 'metal day master', 'villain'])) {
    const relevant = Object.entries(DAY_MASTERS)
      .filter(([k]) => {
        if (matchesAny(topic, ['fire'])) return k.includes('Fire');
        if (matchesAny(topic, ['metal'])) return k.includes('Metal');
        if (matchesAny(topic, ['water'])) return k.includes('Water');
        if (matchesAny(topic, ['wood'])) return k.includes('Wood');
        if (matchesAny(topic, ['earth'])) return k.includes('Earth');
        return true;
      })
      .map(([k, v]) => `${k}: ${v}`);
    parts.push(relevant.join('\n'));
  }
  if (matchesAny(topic, ['compatibility', 'clash', 'group', 'member', 'love triangle'])) {
    parts.push(COMPATIBILITY_BASICS);
    const couples = Object.entries(POWER_COUPLES).map(([k, v]) => `${k}: ${v}`).join('\n');
    parts.push(couples);
  }
  if (matchesAny(topic, ['debut', 'peak', 'late bloomer', 'timing'])) {
    parts.push(FORTUNE_CYCLES);
    parts.push(TWELVE_STAGES);
  }
  if (matchesAny(topic, ['naming', 'missing element', 'lunar', 'age', 'year pillar'])) {
    parts.push(USEFUL_GOD);
  }

  return parts.join('\n\n');
}

// ============================================================
// PUBLIC API
// ============================================================

export interface KnowledgeResult {
  knowledge: string;
  selectedTopic: string;
}

/**
 * contentType과 선택된 토픽에 매칭되는 사주 지식 스니펫 반환
 */
export function getKnowledgeForTopic(
  contentType: ContentType,
  topic: string,
  element?: string
): string {
  switch (contentType) {
    case 'insight':
      return buildKnowledgeForInsight(topic);
    case 'fortune':
      return buildKnowledgeForFortune(element || 'Wood');
    case 'love':
      return buildKnowledgeForLove(topic);
    case 'wealth':
      return buildKnowledgeForWealth(topic);
    case 'kculture':
      return buildKnowledgeForKCulture(topic);
    default:
      return CORE_TERMS;
  }
}

/**
 * 전체 Day Master 프로필 (zodiac fortune 등에서 활용)
 */
export function getDayMasterProfile(element: string): string | undefined {
  return DAY_MASTERS[element];
}

/**
 * 전체 element 프로필
 */
export function getElementProfile(element: string): string | undefined {
  return ELEMENT_PROFILES[element];
}

/**
 * 특정 Ten God 설명
 */
export function getTenGodDescription(god: string): string | undefined {
  return TEN_GODS[god];
}

/**
 * 특정 커플 페어링 다이나믹
 */
export function getPowerCoupleDynamic(pair: string): string | undefined {
  return POWER_COUPLES[pair];
}
