# Dharani & Barath — Cinematic Wedding Invitation

A Tamil wedding told as a scroll-driven digital story: a brass *kuthuvilakku* lit in 3D, kolams that draw themselves, silk curtains, a golden thread that becomes a ring, a lamp and a temple, and a lotus that blooms at the end.

**Dates:** 24 – 25 October 2026 · **Engagement & Reception:** SGS Mahal, Palladam · **Muhurtham:** Konganagiri Murugan Temple, Tirupur

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Vercel-native, static output, metadata + OG image generation |
| Styling | Tailwind CSS v4 + hand-written tokens (`globals.css`) | Silk / brass / temple-stone surfaces, antique-gold type |
| Scroll choreography | GSAP 3 + ScrollTrigger (`@gsap/react`) | Pinned scenes, scrubbed timelines, SVG stroke drawing |
| Micro-interactions | Framer Motion | Portrait tilt, flip-digit countdown |
| 3D | three.js + React Three Fiber | The hero lamp, flames and gold dust |
| Smooth scroll | Lenis | Cinematic inertia on desktop, native on touch |
| Art | Custom procedural SVG (no stock assets) | Kolam, gopuram, thoranam, jasmine, peacock, lotus, bells |

No runtime network dependencies besides Google Fonts (self-hosted at build by `next/font`) and the optional Google Maps embed a guest opens on request.

## Quick start

```bash
cd wedding-invitation
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
```

Node 20+ is required.

## Edit the invitation

Everything guest-facing lives in **`src/data/wedding.ts`** — names (English + Tamil), dates, times, venues, quotes, blessings, share text, optional audio and a WhatsApp number for wishes. The scenes read from it; nothing is hard-coded in components.

Things you will probably want to touch:

- `couple.bride.parents` / `couple.groom.parents` — e.g. `"Daughter of Mr. & Mrs. …"`. Empty hides the line.
- `couple.*.photo` — drop portraits into `public/photos/` and set `"/photos/dharani.jpg"`. They are clipped inside the temple-arch frame automatically. Without photos the frame shows a gold monogram.
- `events[0].venue` — the engagement venue is `null` (shows *Venue to be announced*) until you confirm it.
- `audio.src` — add `public/audio/ambient.mp3` and set `"/audio/ambient.mp3"`; a sound toggle appears, muted by default, and only plays after a tap.
- `wishes.whatsapp` — a number like `"9198xxxxxxxx"` adds a *Send your wishes* button in the finale.

Scene labels for the side navigation are in `src/data/scenes.ts`.

## Deploy to Vercel

This app lives in the `wedding-invitation/` folder of the repository.

1. Import the repo in Vercel → **Add New Project**.
2. Set **Root Directory** to `wedding-invitation` (Framework preset: Next.js is auto-detected).
3. Add the environment variable `NEXT_PUBLIC_SITE_URL` = your final URL (e.g. `https://dharani-barath.vercel.app`). It feeds canonical/OG metadata; the build works without it.
4. Deploy. The Open Graph and Twitter images (`/opengraph-image`, `/twitter-image`) are rendered at build time with the bundled fonts, so the link previews beautifully on WhatsApp, Instagram, Telegram, iMessage and Facebook.

To move this into its own repository later, copy the folder contents to the new repo root and leave Root Directory empty.

## Project structure

```
src/
  app/                 layout (fonts, metadata), page (scene order), globals.css (tokens),
                       opengraph-image / twitter-image, icon.svg, manifest
  data/                wedding.ts (all content), scenes.ts (navigation)
  lib/                 gsap.ts (plugin registration, custom eases), experience.tsx (shared state:
                       ready/intro/quality/pointer/scroll), device.ts (quality tiers), calendar.ts
                       (Google Calendar, .ics, Maps URLs), og.tsx (share card)
  animations/          draw.ts (SVG stroke drawing), reveal.ts (rise/unfold/illuminate), scroll.ts
  components/
    hero/              Loader, Hero (opening title sequence + scroll choreography)
    three/             LampScene (R3F: lathe brass lamp, additive flame sprites, gold-dust shader, camera rig)
    couple/            Two Hearts — arch portraits, peacock feathers, jasmine strand, 3D tilt
    story/             A New Chapter — pinned Tamil quote lit word by word behind silk curtains
    timeline/          The Celebration — golden thread that draws with the scroll; unfolding cards
    venues/            Reception (string lights, location card), Sacred (arch mask, parallax gopuram,
                       countdown), LocationCard (stylised map → live map)
    finale/            Together — gathering light, blooming lotus, names, blessing, share
    effects/           SmoothScroll (Lenis), Petals (canvas particles), CursorGlow, SceneNav
    art/               Kolam, Gopuram, Lamp2D, Thoranam, Jasmine, Peacock, Lotus, Bells, ArchFrame, Motifs
    ui/                Button (magnetic), Countdown (flip digits), FloatingControls, Icons, ScrollIndicator
```

## Animation architecture

- **Scenes, not sections.** Each world is a `<section data-scene>` with its own surface (`silk-ivory`, `silk-maroon`, `temple-stone`). Pinned scenes (`Hero`, `Story`, `Finale`) use `position: sticky` inside a tall wrapper and a scrubbed GSAP timeline, so they work with Lenis and never fight the browser.
- **Transitions are part of the scene.** Hero → Couple is a gold *light sweep* that dissolves into ivory dawn; Couple → Story is a pair of *silk curtains* opening; Story → Celebration fires a *petal burst*; Reception → Sacred opens an *arch mask* (`mask-size` scrubbed via a CSS variable); Sacred → Finale switches the particle field to *gather* mode.
- **Everything drawable draws.** Any SVG stroke marked `data-draw` can be revealed with `drawStrokes()` (`animations/draw.ts`), which measures `getTotalLength()` and tweens `stroke-dashoffset`. Kolams, the gopuram, arch frames, motifs and flourishes all use it.
- **The 3D hero is driven by two refs.** `lit` (0→1, the opening timeline) and `progress` (0→1, scroll through the pinned hero) are plain refs read inside `useFrame`, so React never re-renders during animation. The canvas pauses (`frameloop="never"`) when the hero leaves the viewport.
- **Particles are one global canvas** (`effects/Petals.tsx`). Scenes talk to it through `petals({ type: "burst" | "mode" | "density" })` window events; it reacts to pointer velocity and scroll gusts.
- **Reduced motion is honoured everywhere.** With `prefers-reduced-motion: reduce`, pins unpin, scrubs are skipped, strokes render complete, particles and the 3D scene are replaced by the illustrated lamp.

## Adaptive quality

`lib/device.ts` picks a tier once per session:

| Tier | Trigger | What changes |
|---|---|---|
| `high` | fine pointer, ≥ 6 cores, > 4 GB, WebGL | 700 gold-dust points, DPR up to 2, 64 canvas petals, cursor glow |
| `medium` | touch or small screens / modest hardware | 320 points, DPR ≤ 1.5, 36 petals |
| `low` | reduced motion, Save-Data, or no WebGL | 2D lamp instead of WebGL, no particles, everything visible immediately |

The visual story is identical across tiers; only the implementation differs.

## Assets

- **Fonts:** Cormorant Garamond (display), Manrope (metadata), Noto Serif Tamil & Noto Sans Tamil (Tamil). Loaded through `next/font/google` and self-hosted at build. The three `.ttf` files in `src/app/fonts/` exist only for the Open Graph renderer (Satori needs TTF).
- **Photos:** `public/photos/*.jpg` (portrait, ≥ 900 × 1200). Referenced from `wedding.ts`.
- **Audio:** `public/audio/ambient.mp3` (optional, keep under ~2 MB, 128 kbps is plenty).
- **Icons & art:** all inline SVG components under `components/art` and `components/ui/Icons.tsx` — no icon fonts, no emoji.

## Accessibility

Semantic landmarks and headings per scene (visually hidden where the design is typographic), keyboard-focusable controls with visible focus rings, `aria-label`s on icon buttons, decorative art marked `aria-hidden`, readable contrast on every surface, and a full reduced-motion path. The countdown is IST-anchored so every guest sees the same time.
