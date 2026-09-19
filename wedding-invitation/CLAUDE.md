# Dharani & Barath — wedding invitation

Animation-first single-page invitation. Next.js 15 App Router, React 19, TypeScript,
Tailwind v4, GSAP + ScrollTrigger, Lenis (desktop only), React Three Fiber for the gate
curtain and the hero lamp. All copy lives in `src/data/wedding.ts` — never hard-code names,
dates or venues in a component. Vercel builds `main` of this repo.

## Scroll and layout — rules this project learned the hard way

**The page scrolls plainly. No pinned scene deck.** `SceneStack.tsx` once pinned every
`<section data-scene>` at `start: "bottom bottom"` with `pinSpacing: false` while the next
section slid over it. It is gone and must not return in that form:

1. A scene is one viewport tall, so "this scene has finished arriving" and "the next scene
   begins to climb" fire at the same scroll position. Nothing ever stood alone on screen; on a
   phone the incoming card cut the couple off at the chest.
2. `pinSpacing: false` removes the pin spacers, so the document is shorter than its content
   and the end of the page is unreachable.
3. Pinning re-parents each section into a `.pin-spacer`, which silently breaks the card
   styling and layout measurement.

`SceneStack` now only tags sections `.in-view` (so `globals.css` can pause decorative loops
off-screen). Cards overlap by exactly their corner radius via
`.scene:not(#opening) { margin-top: calc(var(--card-radius) * -1) }`, so a rounded top edge
reveals the scene above it and never the page background. Sticky, scroll-scrubbed scenes
(hero, story, finale) get their held frame from CSS `position: sticky` inside a taller
section — `overflow: clip` on `.scene`, never `hidden`, or the sticky child pins to the card.

**Phones scroll natively.** `SmoothScroll.tsx` creates Lenis only for `(pointer: fine)`
without reduced motion. Lenis `syncTouch` re-implements touch scrolling in JS (its own
inertia, no rubber-banding, no URL-bar collapse) and is what made the page feel "not
standard" on a phone. ScrollTrigger reads native scroll directly, so scrubs work either way.

**The gate must lock touch, not just `overflow: hidden`.** iOS ignores `overflow: hidden` on
`<html>` for touch panning; the fixed gate overlay carries `touch-none`.

**A photograph that hangs past a card edge is dissolved by the card, not by itself.**
`.couple-photo` is taller than the `.couple-silk` panel at every size, so a fade written in %
of the figure finishes below the clip and the card cuts a hard line across their legs. The
fade lives on `.figure-fade`, the panel's own box, never transformed. If you change
`--fig-w`, `.couple-figure { bottom }` or the panel height, re-run the couple frame check.

**A held (sticky) frame only where the screen can hold all of it.** The finale flows by
default (`.fin-flow`: a section at least one screen tall, copy centred, the lotus beneath
the copy with the body's bottom padding equal to the lotus height). A held 100svh frame
clipped the names on a 640px phone and the title on a 900px laptop, and put the lotus
behind the buttons. `globals.css` holds the frame only for a fine pointer, motion allowed,
and at least 1140px of height. Position and overflow for that frame live in CSS, not in
Tailwind utilities, because the utilities layer would otherwise win over the sticky rule.

**`svh`, not `vh`, for anything that must fit a phone screen.** On iOS `vh` is the large
viewport. Sections that hold a sticky `100svh` frame carry `bg-night` so the strip exposed
when the URL bar collapses matches the frame.

**Big `vh` paddings read as broken on a phone.** Keep phone padding around 12–16vh and let
`md:` be generous.

## Phone motion budget (`@media (pointer: coarse)` in `globals.css`)

No `backdrop-filter`, no `mix-blend-mode` on large layers, no `filter: blur()/drop-shadow()`
on large elements, no animated `text-shadow`. Looping SVG decoration is frozen; flames step
between poses. Quality tiers come from `detectQuality()` and can be forced with
`?quality=low|medium|high`; the gate with `?gate=3d|css`.

## Type and contrast floors

Nothing below 11px. Gold (`#c9a24a`) on cream is 2.07:1 — hairlines and the ampersand only,
never body copy; names are solid maroon. `gold-deep` (`#8e6a1f`, 4.30:1) is allowed at 24px+.

## GSAP gotchas

- `useGSAP` selector strings are scoped to the component; reach outside with
  `document.getElementById`.
- Never `prepareDraw(root.current)` in the couple scene: it dash-hides every `[data-draw]`,
  including the ~120 paths of each `<Kolam>` that nothing draws back.
- Don't centre a GSAP-animated box with `translateX(-50%)` — the tween overwrites
  `transform`. Use `margin-left: calc(var(--fig-w) / -2)`.
- Partition axes: scrub owns `yPercent` on the outer wrapper, pointer owns `x/y` on the
  middle wrapper, entrance owns `yPercent/scale` on the figure.

## Checking your work

```
npm run build        # tsc runs as part of it; there is no eslint config
npx next start -p 3111
```

Needs Node 20+. Never `npm run build` while `next start` is running — it corrupts `.next`.

After any layout change, at 360×640, 390×844 and 1440×900 at least: walk the page in
⅓-viewport steps and confirm no later section overlaps an earlier one by more than the card
radius, `scrollWidth == innerWidth`, sticky frames fill the viewport, and the document bottom
is reachable with the last button on screen; then park `#couple` at the top and confirm the
photograph's dissolve finishes above the card edge. Playwright treats an `opacity: 0` element
as visible, so wait on the gate CTA's computed opacity before clicking it.
