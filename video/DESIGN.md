---
project: SajuMuse / AmorMuse video posts for X
canvas: 1080x1920 (vertical, X video-first)
duration: 15-45s per post
---

# SajuMuse Visual Identity

Matches the existing K-Fortune product (English Saju for global GenZ) — dark
mystical, premium-cinematic, Korean-ink-meets-cosmic. No clip-art mysticism. No
generic astrology purple gradients.

## Style Prompt

Cinematic Korean cosmic minimalism. Deep navy-to-charcoal canvas with a single
hot-gold accent that behaves like ink hitting paper — never a gradient wash.
One bold sans headline plus one editorial serif quote, treated like a magazine
pull-quote. Motion is slow, weighted, deliberate — no bouncy ease, no neon, no
stars-everywhere parallax. Think A24 title card meets a Hanji scroll.

## Colors

- `#0A0A0F` — canvas (matches product `bg`)
- `#1A1A2E` — surface card (matches product `surface`)
- `#2A2A4A` — hairline border / secondary stroke
- `#F5E6C8` — paper-ink cream (primary text on dark, warmer than pure white)
- `#F59E0B` — hot gold accent (matches product `accent`, used for one element per scene)
- `#7C3AED` — deep violet (matches product `primary`, used only for ambient glow, never text)

## Typography

- Headlines: `"Archivo Black"` (provided by `@fontsource/archivo-black`) — 96-130px on 1080-wide canvas
- Pull quotes / body: `"EB Garamond"` italic — 38-46px, generous line-height (1.35)
- Labels / element/zodiac chips: `"JetBrains Mono"` 22-28px UPPERCASE, 0.12em tracking
- Never: Roboto, Inter (already used by web product — video gets a separate, more editorial pairing)

## Motion Signature

- Entrances: `power3.out` for headlines (60-80px y-rise, 0.7-0.9s), `expo.out` for accents
- Scene transitions: 0.6s ink-wipe (clip-path) or crossfade with gold flash at midpoint
- Background: subtle radial pulse of violet glow, 8-10s cycle, never linear gradient
- No infinite loops, no bounce, no stagger faster than 100ms

## What NOT to Do

1. No purple-to-pink gradients. Saju content is overrun with that aesthetic — we go cosmic-charcoal instead.
2. No stock-image stars or zodiac wheels. Use typography-as-image.
3. No emoji burned into the video frame. Emoji belongs in the X caption text, not on screen.
4. No exit animations on intermediate scenes (the transition IS the exit — see SKILL.md scene rules).
5. No neon glow on text. Glow lives behind, never on, the type.
6. No text under 32px on a 1080-wide vertical canvas — illegible on phone feed.

## Brand Variants

- **SajuMuse** (default): cream + gold on charcoal. Insight, fortune, wealth content.
- **AmorMuse** (love/compatibility content): swap accent `#F59E0B` → `#E879A8` (rose), swap headline color cream → `#FFE5EC`. Everything else identical.
