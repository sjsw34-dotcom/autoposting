---
name: sajumuse-video-overrides
description: Project-specific addendum to the bundled hyperframes skill. Read this BEFORE writing or editing any composition under video/compositions/. Encodes SajuMuse/AmorMuse brand rules and the autoposting integration contract that stock hyperframes does not know about.
type: project
---

# SajuMuse / AmorMuse Hyperframes Overrides

This file is the project's overlay on `video/skills/hyperframes/SKILL.md`. The
bundled skill teaches HOW Hyperframes works; this overlay teaches what to do
WITH it inside this codebase.

## Source-of-truth files

- `video/DESIGN.md` — visual identity (palette, typography, motion). Do NOT
  invent colors or fonts. The bundled skill's "Visual Identity Gate" is
  satisfied by this file — don't ask the user three questions, read the file.
- `lib/video/themes.ts` — five oh-haeng (五行) element themes. Each provides
  CSS custom properties (`--canvas`, `--ink`, `--accent`, ...) plus an
  ambient background layer (HTML+CSS+SVG, no external assets). DESIGN.md
  describes the SajuMuse house style; themes are element-specific *exits*
  from that base palette into Wood/Fire/Earth/Metal/Water territory.
- `lib/video/zodiac-elements.ts` — 12 zodiac → 5 element mapping per
  standard saju Earth Branches.
- `lib/video/variation-selector.ts` — picks (layout, theme) pair
  deterministically by date and featured zodiac. Layout cycles every 3 days,
  zodiac every 12 days, element follows the zodiac. Result: up to 15 visual
  combinations rotating across each 12-day cycle.
- `video/compositions/zodiac-fortune.html` — center-stack layout (25s).
- `video/compositions/zodiac-split.html` — split top/bottom layout (25s).
- `video/compositions/zodiac-kinetic.html` — kinetic typography slam (22s).
- `video/compositions/saju-insight.html` — insight card layout (20s).
- `video/compositions/insight-kinetic.html` — insight kinetic layout (18s).
- `lib/video/saju-video-adapter.ts` — the only thing that should fill
  composition templates. Drives variation selection + theme-vars injection.
  If you find yourself writing `.replace('__FOO__', …)` somewhere else,
  route through `stageComposition()` instead.

## Hard rules specific to this project

1. **Vertical only (1080×1920).** X auto-plays vertical video full-frame in
   the mobile feed; horizontal is letterboxed and tanks engagement. Do not add
   a 1920×1080 variant unless explicitly asked.
2. **Max duration 45s.** X allows 2:20 but watch-through collapses past ~30s
   for cold-feed content. Keep zodiac at 25s, insight at 20s.
3. **No emoji burned into the frame.** Emoji belongs in the X caption text
   (the tweet body), not on screen. Footer-tag and labels are typography only.
4. **One accent element per scene.** The gold (or rose, on AmorMuse) is a
   single-element accent — the bar OR the label, not both glowing
   simultaneously. The bundled skill warns against full-screen gradients on
   dark — we extend that to "no two competing accents".
5. **Fortune copy is generated upstream, not in the composition.** The HTML
   never hardcodes a fortune string. Always fill via `__FORTUNE_TEXT__` /
   `__BODY_TEXT__` placeholders. If a composition has hardcoded copy at
   review time, that's a bug.
6. **Brand variants use CSS color overrides, not separate templates.** The
   AmorMuse variant swaps `#F59E0B` → `#E879A8` and cream headline → `#FFE5EC`
   via a `.brand-amormuse` class on the root composition div. Do NOT fork the
   template file.

## Integration contract with the autoposting bot

- Vercel cron (`app/api/x/post/route.ts`) handles **text + image** posts on
  the existing schedule. Don't move video into the Vercel route — Vercel
  Serverless cannot run Puppeteer + FFmpeg.
- Video posting runs from **GitHub Actions**
  (`.github/workflows/post-zodiac-video.yml`) or a local `npm run video:zodiac`.
  Both call `scripts/video/post-zodiac-video.ts`.
- The X video upload uses `lib/video/x-video-upload.ts` (chunked v1.1
  upload). It reads the same `X_API_KEY` / `X_ACCOUNT_N_*` env vars as the
  text path. Do NOT introduce a parallel credential pathway.
- Daily videos cycle through the 12 zodiac signs via `dayOfYear % 12` so
  every sign gets featured ~30 times/year. If you change the cycle, also
  change the X caption hook so it doesn't pretend the post covers all signs.

## Quality checks before posting

Run in order. The Vercel cron's quality-judge does not run on video — these
are the only gates:

1. `npm run typecheck` — must pass.
2. `npm run video:zodiac:dry` — renders without uploading. Confirm the MP4
   plays end-to-end and the featured-sign text is correct.
3. Eyeball the work output at `video/output/zodiac-YYYYMMDD.mp4`. Specifically
   check: text not clipped, ambient glow visible but not overpowering,
   transitions hit at the planned beats (8s, 17s).
4. Only then run `npm run video:zodiac` for a real post.

## What NOT to do

- Don't add `repeat: -1` (the bundled skill bans this; restating because it's
  the most common error in saju aesthetics with their pulsing glows).
- Don't import from `@/lib/...` aliases inside `lib/video/*` — those modules
  also run under `tsx` outside the Next.js context, where `@/` is unreliable.
  Use relative paths.
- Don't render at `quality: 'high'` for daily posts. The 25s zodiac at
  `standard` is ~4MB and renders in ~2 minutes on a GitHub runner.
  `high` triples render time for engagement gains nobody on phone-feed will see.
- Don't author a new composition without a corresponding adapter function.
  Templates without typed adapters drift into broken placeholder strings.
