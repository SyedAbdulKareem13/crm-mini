"use client";

import { Fragment, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { words } from "@/lib/utils";
import { Thoranam } from "@/components/art/Thoranam";
import { Kolam } from "@/components/art/Kolam";
import { JasmineStrand } from "@/components/art/Jasmine";
import { drawStrokes, prepareDraw, showStrokes } from "@/animations/draw";
import { unfoldChars } from "@/animations/reveal";
import { onceInView } from "@/animations/scroll";
import { SceneVeil } from "@/components/effects/SceneStack";

/**
 * THE SEAM — the open edge of the silk panel.
 *
 * These two paths are the *exact* edges of the mask authored in globals.css
 * (`.couple-silk --seam`): same `viewBox="0 0 100 100"`, same
 * `preserveAspectRatio="none"`, same box (`.seam-box`). They are stroked here in
 * gold so the rule always lands on the pixel edge of the silk. Edit them together
 * or the gold line walks off the fabric.
 */
const SEAM_NARROW = "M0 26 C24 26 34 7 50 7 C66 7 76 26 100 26";
const SEAM_WIDE = "M20 0 C11 0 4.5 3.5 1.8 9 C0.6 11.5 0 14.5 0 18 V100";

/**
 * The gold hairline ring that stands behind them. Its viewBox matches the
 * photograph's aspect (1040 × 1449 → 100 × 139.33) so the circle is a true
 * circle at every size, and its geometry was solved against the cutout's real
 * alpha channel: it passes behind his crown at 5.2% of the frame, clears her
 * crown by 7.8%, slips behind his shoulder at 25% and behind her pallu at 48%.
 * What is left on screen is one long crescent, closed by the eye — and the
 * occlusion is the cue that puts them *in* the scene instead of *on* it.
 */
const RING_CY = 48.07;
const RING_R = 45;

export function Couple() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion, finePointer } = useExperience();

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const seam = q(".seam-rule")[0];
      const ring = q(".couple-ring")[0];
      const coarse = !finePointer;

      if (reducedMotion) {
        showStrokes(root.current);
        gsap.set(
          q(".c-rise, .head-word, .name-line, .c-amp, .c-name-ta, .c-quote, .couple-figure, .couple-glow, .seam-kolam"),
          { autoAlpha: 1, x: 0, y: 0, yPercent: 0, scale: 1 },
        );
        gsap.set(q(".c-amp-rule"), { autoAlpha: 1, scaleX: 1 });
        gsap.set(q(".couple-cast"), { autoAlpha: 1, scaleX: 1, skewX: 8, transformOrigin: "50% 100%" });
        gsap.set(q(".silk-fill, .strand"), { clipPath: "none" });
        return;
      }

      // SCOPED, never prepareDraw(root.current): that dash-hides every [data-draw]
      // in the scene — including the ~120 paths of each <Kolam>, which nothing
      // ever draws back, so the medallions would never render at all.
      prepareDraw(seam);
      prepareDraw(ring);

      gsap.set(q(".silk-fill"), { clipPath: "inset(0 0 100% 0)" });
      gsap.set(q(".c-rise, .c-name-ta, .c-quote"), { autoAlpha: 0, y: 24 });
      gsap.set(q(".head-word"), { autoAlpha: 0 });
      gsap.set(q(".name-line"), { yPercent: 118 });
      gsap.set(q(".c-amp"), { autoAlpha: 0, scale: 0.42, rotate: -14, transformOrigin: "50% 60%" });
      gsap.set(q(".c-amp-rule"), { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(q(".seam-kolam"), { autoAlpha: 0 });
      gsap.set(q(".couple-glow"), { autoAlpha: 0 });
      gsap.set(q(".couple-figure"), { autoAlpha: 0, yPercent: 6, scale: 1.03, transformOrigin: "50% 100%" });
      gsap.set(q(".couple-cast"), { autoAlpha: 0, scaleX: 0.82, skewX: 8, transformOrigin: "50% 100%" });
      gsap.set(q(".strand"), { clipPath: "inset(0 0 100% 0)" });
      gsap.set(q("[data-bead]"), { autoAlpha: 0 });

      onceInView(
        root.current,
        () => {
          const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

          // the silk falls, the gold seals its edge, the sentence is spoken,
          // the couple arrive — and the names land as they settle.
          tl.to(q(".silk-fill"), { clipPath: "inset(0 0 0% 0)", duration: coarse ? 1.15 : 1.65, ease: "silk" }, 0)
            .to(q(".c-rise"), { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1, ease: "power3.out" }, 0.1)
            .add(drawStrokes(seam, { duration: 1.5, stagger: 0.12, ease: "power2.inOut" }), 0.3)
            .add(unfoldChars(q(".head-word"), { stagger: 0.05, duration: 1.0 }), 0.32)
            .to(q(".seam-kolam"), { autoAlpha: 1, duration: 2.4, ease: "power2.out" }, 0.45)
            .to(q(".couple-glow"), { autoAlpha: 1, duration: 1.9, ease: "power2.out" }, 0.55)
            .to(q(".couple-figure"), { autoAlpha: 1, yPercent: 0, scale: 1, duration: 2.1 }, 0.6)
            .add(drawStrokes(ring, { duration: 2.2, ease: "power2.inOut" }), 0.85)
            .to(q(".couple-cast"), { autoAlpha: 1, scaleX: 1, duration: 1.6, ease: "power2.out" }, 1.0)
            .to(q(".strand"), { clipPath: "inset(0 0 0% 0)", duration: 2.0, ease: "power2.inOut" }, 1.05)
            .to(q(".name-line"), { yPercent: 0, duration: 1.5, stagger: 0.22 }, 1.15)
            .to(q(".c-amp"), { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.0, ease: "back.out(2)" }, 1.62)
            .to(q(".c-amp-rule"), { scaleX: 1, duration: 1.2 }, 1.7)
            .to(q(".c-name-ta"), { autoAlpha: 1, y: 0, duration: 1.0, ease: "power3.out" }, 1.85)
            .to(q("[data-bead]"), { autoAlpha: 1, duration: 0.7, ease: "power2.out" }, 2.05)
            .to(q(".c-quote"), { autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.12, ease: "power3.out" }, 2.1);
        },
        "top 62%",
      );

      if (!finePointer) return;

      // ── desktop ambience ──────────────────────────────────────────────
      // Axes are partitioned so nothing fights: the scrub owns yPercent on the
      // outer wrapper, the pointer owns x/y on the middle wrapper, the entrance
      // owns yPercent/scale on the figure itself.
      const st = { trigger: root.current, start: "top bottom", end: "bottom top" };
      gsap.fromTo(q(".figure-drift"), { yPercent: 0 }, { yPercent: -6, ease: "none", scrollTrigger: { ...st, scrub: 1.1 } });
      // one medallion, two halves, one tween — they can never fall out of register
      gsap.to(q(".seam-kolam"), { rotate: 22, ease: "none", scrollTrigger: { ...st, scrub: 1.3 } });
      gsap.fromTo(q(".couple-thoranam"), { yPercent: -12 }, { yPercent: 4, ease: "none", scrollTrigger: { ...st, scrub: 1 } });

      const el = root.current;
      if (!el) return;
      const figX = gsap.quickTo(q(".figure-pointer"), "x", { duration: 0.9, ease: "power3" });
      const figY = gsap.quickTo(q(".figure-pointer"), "y", { duration: 0.9, ease: "power3" });
      const glowX = gsap.quickTo(q(".couple-glow"), "x", { duration: 1.4, ease: "power3" });
      const glowY = gsap.quickTo(q(".couple-glow"), "y", { duration: 1.4, ease: "power3" });
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        figX(nx * 10);
        figY(ny * 6);
        glowX(nx * -20);
        glowY(ny * -12);
      };
      const onLeave = () => {
        figX(0);
        figY(0);
        glowX(0);
        glowY(0);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { dependencies: [reducedMotion, finePointer], scope: root },
  );

  const line = words(wedding.invitation.line);

  return (
    <section
      ref={root}
      id="couple"
      data-scene
      aria-labelledby="couple-title"
      className="scene silk-ivory relative isolate min-h-[100svh] w-full text-ink"
    >
      {/* the ivory half of the medallion — deep gold on cream */}
      <Kolam
        hairline
        strokeWidth={1}
        className="seam-kolam kolam-seam art-layer pointer-events-none text-gold/[0.15]"
      />

      {/* the cream shades into the silk instead of butting against it */}
      <span aria-hidden className="seam-bleed" />

      {/* ─────────────── THE SILK PANEL ─────────────── */}
      <div className="couple-silk seam-box" aria-hidden>
        <span className="silk-fill" />
        <span className="couple-glow" />

        {/* the same medallion, continuing across the join in light gold */}
        <Kolam
          hairline
          strokeWidth={1}
          className="seam-kolam kolam-seam-in art-layer pointer-events-none text-gold-light/[0.13]"
        />

        <span className="couple-cast" />

        <div className="figure-drift">
          <div className="figure-pointer">
            <div className="couple-figure">
              <svg className="couple-ring" viewBox="0 0 100 139.33" fill="none" aria-hidden>
                <circle
                  cx="50"
                  cy={RING_CY}
                  r={RING_R}
                  data-draw
                  stroke="#c9a24a"
                  strokeOpacity="0.62"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <circle data-bead cx="50" cy={RING_CY - RING_R} r="1.7" fill="#e8cf8a" stroke="none" />
              </svg>

              <img
                className="couple-photo"
                src="/couple/dharani-barath-1040.webp"
                srcSet="/couple/dharani-barath-520.webp 520w, /couple/dharani-barath-760.webp 760w, /couple/dharani-barath-1040.webp 1040w"
                sizes="(min-width: 1024px) 45vw, 86vw"
                width={1040}
                height={1449}
                alt="Dharani and Barath together — Barath in a cream silk shirt and gold-bordered veshti, Dharani in a peacock-blue Kanjivaram with gold jewellery and jasmine in her hair."
                loading="eager"
                fetchPriority="low"
                decoding="async"
                draggable={false}
              />
            </div>
          </div>
        </div>

        <JasmineStrand className="strand u-wide-only" count={12} length={600} />
        <span className="couple-floor" />
      </div>

      {/* the gold rule, stroked on the silk's own edge */}
      <svg
        className="seam-rule seam-box"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
        strokeLinecap="round"
        aria-hidden
      >
        <defs>
          <linearGradient id="couple-seam-v" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8cf8a" />
            <stop offset="0.16" stopColor="#c9a24a" />
            <stop offset="0.66" stopColor="#c9a24a" />
            <stop offset="1" stopColor="#c9a24a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="couple-seam-h" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c9a24a" stopOpacity="0" />
            <stop offset="0.16" stopColor="#c9a24a" />
            <stop offset="0.5" stopColor="#f3e4bd" />
            <stop offset="0.84" stopColor="#c9a24a" />
            <stop offset="1" stopColor="#c9a24a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="u-narrow-only">
          <path d={SEAM_NARROW} stroke="url(#couple-seam-h)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" data-draw />
          <path
            d={SEAM_NARROW}
            transform="translate(0 3.2)"
            stroke="url(#couple-seam-h)"
            strokeWidth="0.7"
            strokeOpacity="0.42"
            vectorEffect="non-scaling-stroke"
            data-draw
          />
        </g>
        <g className="u-wide-only">
          <path d={SEAM_WIDE} stroke="url(#couple-seam-v)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" data-draw />
          <path
            d={SEAM_WIDE}
            transform="translate(2.2 0)"
            stroke="url(#couple-seam-v)"
            strokeWidth="0.7"
            strokeOpacity="0.42"
            vectorEffect="non-scaling-stroke"
            data-draw
          />
        </g>
      </svg>

      {/* the festoon crosses both halves — the top stitch */}
      <Thoranam className="couple-thoranam u-wide-only" />

      {/* ─────────────── THE COPY ─────────────── */}
      <div className="couple-copy">
        <p className="c-rise flex items-center justify-center gap-3 lg:justify-start">
          <span aria-hidden className="block h-px w-8 bg-gradient-to-r from-transparent to-gold lg:w-12" />
          <span className="eyebrow text-[0.7rem] tracking-[0.16em] text-bronze lg:text-[0.68rem] lg:tracking-[0.34em]">
            {wedding.invitation.eyebrow}
          </span>
        </p>
        <p className="c-rise tamil mt-1.5 text-[0.8rem] text-maroon/70 lg:mt-2 lg:text-[0.92rem]">
          {wedding.invitation.eyebrowTamil}
        </p>

        <h2 id="couple-title" className="c-head" style={{ perspective: 800 }}>
          <span className="c-head-line font-display text-maroon/85">
            {/* the space must sit BETWEEN the spans: a trailing space inside an
                inline-block is trimmed, which runs every word together */}
            {line.map((w, i) => (
              <Fragment key={i}>
                <span className="head-word inline-block will-change-transform">{w}</span>
                {i < line.length - 1 ? " " : ""}
              </Fragment>
            ))}
          </span>

          {/* the names finish the sentence — this is what replaces the deleted panels */}
          <span className="c-names">
            <span className="name-mask">
              <span className="name-line font-display text-maroon">{wedding.couple.bride.name}</span>
            </span>
            <span className="c-amp-row">
              <span className="c-amp font-display italic text-gold-deep">&amp;</span>
              <span aria-hidden className="c-amp-rule" />
            </span>
            <span className="name-mask">
              <span className="name-line font-display text-maroon">{wedding.couple.groom.name}</span>
            </span>
          </span>
        </h2>

        <p className="c-name-ta tamil text-[1rem] tracking-[0.02em] text-maroon/75 lg:text-[clamp(1.05rem,1.45vw,1.4rem)]">
          {wedding.couple.bride.tamil} <span className="text-gold-deep">&amp;</span> {wedding.couple.groom.tamil}
        </p>

        <div className="c-quote-wrap">
          <p className="c-quote font-display text-[1.05rem] italic leading-[1.55] text-maroon/70">
            &ldquo;{wedding.quotes.union.en}&rdquo;
          </p>
          <p className="c-quote tamil mt-2 text-[0.86rem] leading-[1.8] text-maroon/65">{wedding.quotes.union.ta}</p>
        </div>
      </div>

      <SceneVeil />
    </section>
  );
}
