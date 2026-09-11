# Dharani & Barath — Cinematic Wedding Invitation

A Tamil wedding told as a scroll-driven digital story: a brass *kuthuvilakku* lit in 3D, kolams that draw themselves, silk curtains, paper-cut portraits of the couple, a golden thread that winds through two days of ceremony, and a lotus that blooms at the end. Scenes stack like cards, each one sliding over the last.

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
- `couple.*.photo` — drop portraits into `public/photos/` and set `"/photos/dharani.jpg"`. They are clipped inside the temple-arch frame automatically. **Without photos** the frames show hand-drawn paper-cut profiles of the bride (kondai with jasmine, jhumka, bindi, nethi chutti, saree zari) and groom (angavastram, thilakam) facing each other, with a small monogram seal — so the invitation is complete with or without photography.
- `events[*].venue` — set a venue to `null` to show *Venue to be announced* on that card until it is confirmed.
- `events[*].moments` — the rituals listed on each programme card (Thamboolam exchange, Mangalya dharanam, …). Edit freely; `days` holds the two day-chapter headings.
- `audio.src` — add `public/audio/ambient.mp3` and set `"/audio/ambient.mp3"`; a sound toggle appears, muted by default, and only plays after a tap.
- `wishes.whatsapp` — a number like `"9198xxxxxxxx"` adds a *Send your wishes* button in the finale.
- `invite.image` — the finale offers a downloadable royal invitation card. By default the site renders its own at `/invite.png` (1080 × 1560, built from the same art and fonts). To ship a designed image instead, put it in `public/invite/` and set `"/invite/royal-invitation.jpg"`.

Scene labels for the side navigation are in `src/data/scenes.ts`.

## Deploy to Vercel

1. Import the repo in Vercel → **Add New Project** (Framework preset: Next.js is auto-detected).
2. **Root Directory:** leave empty when deploying from the standalone `dharani-barath-wedding` repository. If you deploy from the `crm-mini` branch where this app lives in `wedding-invitation/`, set Root Directory to that folder.
3. Add the environment variable `NEXT_PUBLIC_SITE_URL` = your final URL (e.g. `https://dharani-barath.vercel.app`). It feeds canonical/OG metadata; the build works without it.
4. Deploy. The Open Graph and Twitter images (`/opengraph-image`, `/twitter-image`) are rendered at build time with the bundled fonts, so the link previews beautifully on WhatsApp, Instagram, Telegram, iMessage and Facebook.

## Project structure

```
src/
  app/                 layout (fonts, metadata), page (scene order), globals.css (tokens),
                       opengraph-image / twitter-image, invite.png (downloadable card), icon.svg, manifest
  data/                wedding.ts (all content), scenes.ts (navigation)
  lib/                 gsap.ts (plugin registration, custom eases), experience.tsx (shared state:
                       ready/intro/quality/pointer/scroll), device.ts (quality tiers), calendar.ts
                       (Google Calendar, .ics, Maps URLs), og.tsx (share card)
  animations/          draw.ts (SVG stroke drawing), reveal.ts (rise/unfold/illuminate), scroll.ts
  components/
    hero/              Loader (tap-to-open gate in front of the 3D curtain), Hero (opening title sequence + scroll choreography)
    three/             LampScene (R3F: lathe brass lamp, additive flame sprites, gold-dust shader, camera rig)
                       CurtainScene (R3F: procedural velvet drapes, valance, spring-driven opening)
    couple/            Two Hearts — arch portraits, peacock feathers, jasmine strand, 3D tilt
    story/             A New Chapter — pinned Tamil quote lit word by word behind silk curtains
    timeline/          The Celebration — two day chapters on a serpentine golden thread that draws itself with
                       a travelling lamp-light bead; ritual moments, time-of-day accents, calendar + maps
    venues/            Reception (string lights, location card), Sacred (arch mask, parallax gopuram,
                       countdown), LocationCard (stylised map → live map)
    finale/            Together — gathering light, blooming lotus, names, blessing, share
    effects/           SmoothScroll (Lenis), Petals (canvas particles), CursorGlow, SceneNav
    art/               Kolam, Gopuram, Lamp2D, Thoranam, Jasmine, Peacock, Lotus, Bells, ArchFrame, Silhouette, Motifs
    ui/                Button (magnetic), Countdown (flip digits), FloatingControls, Icons, ScrollIndicator
```

## Animation architecture

- **The curtain is real cloth** (`three/CurtainScene.tsx`). The tap-to-open gate is a WebGL stage: each drape is a dense plane whose vertices come from a closed-form cloth function in the vertex shader — vertical pleats that wander in spacing and depth, tighten as the panel gathers toward its wing, a hem that lags the rod (an under-damped spring integrated on the CPU), a billow toward the audience while the fabric moves and a ripple that dies away when it stops. Normals are taken from the same surface, so the velvet (physically based, with a Charlie sheen for the nap and a procedural bump) is lit by its true folds; gold braid on the leading edges and hems, a swagged valance with fringe and tassels, and a warm stage spotlight complete it — with real shadows on the `high` tier. The `Loader` drives it with a GSAP timeline (`open`, `sag`, `glow`, `lift`, `exit`) and starts the hero's title sequence while the drapes are still parting. Without WebGL, or under reduced motion, a CSS curtain stands in.
- **Scenes, not sections.** Each world is a `<section data-scene class="scene">` with its own surface (`silk-ivory`, `silk-maroon`, `temple-stone`). Pinned scenes (`Hero`, `Story`, `Finale`) use `position: sticky` inside a tall wrapper and a scrubbed GSAP timeline, so they work with Lenis and never fight the browser.
- **The scene deck** (`effects/SceneStack.tsx`). When a scene's bottom reaches the bottom of the viewport it is pinned (no extra scroll distance) while the next scene slides over it as a rounded card with a gold hairline. The covered scene recedes — scaling to 0.965 and dimming under a `.scene-veil` — and the incoming scene's content drifts in a beat behind its card. This is what makes every boundary feel liquid instead of a hard edge.
- **Transitions are part of the scene.** The hero's lamp keeps burning beneath the ivory Couple card as it arrives; Couple → Story is a pair of *silk curtains* opening; Story → Celebration fires a *petal burst*; Reception → Sacred opens an *arch mask* (`mask-size` scrubbed via a CSS variable); Sacred → Finale switches the particle field to *gather* mode.
- **Everything drawable draws.** Any SVG stroke marked `data-draw` can be revealed with `drawStrokes()` (`animations/draw.ts`), which measures `getTotalLength()` and tweens `stroke-dashoffset`. Kolams, the gopuram, arch frames, motifs and flourishes all use it.
- **The 3D hero is driven by two refs.** `lit` (0→1, the opening timeline) and `progress` (0→1, scroll through the pinned hero) are plain refs read inside `useFrame`, so React never re-renders during animation. The canvas pauses (`frameloop="never"`) when the hero leaves the viewport.
- **Particles are one global canvas** (`effects/Petals.tsx`). Scenes talk to it through `petals({ type: "burst" | "mode" | "density" })` window events; it reacts to pointer velocity and scroll gusts.
- **Smoothness budget.** No `backdrop-filter`, no `mix-blend-mode` on full-screen layers, no `filter: blur()`/`drop-shadow()` on large elements, no animated `text-shadow`. Big decorative SVGs sit on their own compositor layer (`.art-layer`), and looping SVG animations pause when their scene is off-screen (`.in-view`). Lenis runs at `lerp 0.07` and scrubbed timelines use ≈1s of smoothing.
- **Phones get a separate motion budget** (`@media (pointer: coarse)` in `globals.css` plus `finePointer` checks in scenes). Lenis `syncTouch` drives the scroll position every frame so scrubs and pins stay in lock-step with the finger; petals become 14 GPU-composited CSS sprites instead of a canvas; flames step between poses instead of repainting 60×/s; kolams, thoranam and bells hold still; text shimmer is static; big stroke drawings become a single radial wipe; the WebGL lamp renders at 1× with a standard material and 160 dust points; scene veils are viewport-sized and entry drift is skipped. Budget Android phones (≤ 3 GB reported) get the illustrated lamp instead of WebGL. Append `?quality=low|medium|high` to the URL to force a tier while testing on a device, and `?gate=3d|css` to force the WebGL or CSS curtain.
- **Reduced motion is honoured everywhere.** With `prefers-reduced-motion: reduce`, pins unpin, scrubs are skipped, strokes render complete, particles and the 3D scene are replaced by the illustrated lamp.

## Adaptive quality

`lib/device.ts` picks a tier once per session:

| Tier | Trigger | What changes |
|---|---|---|
| `high` | fine pointer, ≥ 6 cores, > 4 GB, WebGL | 700 gold-dust points, DPR up to 2, 44 canvas petals, cursor glow, scene depth |
| `medium` | touch or small screens / modest hardware | 160 points, DPR 1, standard material, 14 CSS petals |
| `low` | reduced motion, Save-Data, no WebGL, or a phone reporting ≤ 3 GB | 2D lamp instead of WebGL, no particles, everything visible immediately |

The visual story is identical across tiers; only the implementation differs.

## Assets

- **Fonts:** Cormorant Garamond (display), Manrope (metadata), Noto Serif Tamil & Noto Sans Tamil (Tamil). Loaded through `next/font/google` and self-hosted at build — variable files where Google offers them, so the page ships 7 font files instead of 19. The three `.ttf` files in `src/app/fonts/` exist only for the Open Graph renderer (Satori needs TTF).
- **Photos:** `public/photos/*.jpg` (portrait, ≥ 900 × 1200). Referenced from `wedding.ts`.
- **Audio:** `public/audio/ambient.mp3` (optional, keep under ~2 MB, 128 kbps is plenty).
- **Icons & art:** all inline SVG components under `components/art` and `components/ui/Icons.tsx` — no icon fonts, no emoji.

## Accessibility

Semantic landmarks and headings per scene (visually hidden where the design is typographic), keyboard-focusable controls with visible focus rings, `aria-label`s on icon buttons, decorative art marked `aria-hidden`, readable contrast on every surface, and a full reduced-motion path. The countdown is IST-anchored so every guest sees the same time.
