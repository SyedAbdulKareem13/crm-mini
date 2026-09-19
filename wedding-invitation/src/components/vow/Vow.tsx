"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { drawStrokes, prepareDraw, showStrokes } from "@/animations/draw";
import { onceInView } from "@/animations/scroll";

/**
 * THE HAND-TAKING — the beat between the hour and the farewell.
 *
 * Sacred names the muhurtham; the Finale says goodbye and hands over the share links.
 * Between them the page had nothing to show for the hour it had just announced. This is
 * that: one photograph, one line, and a great deal of cream.
 *
 * It is deliberately the Couple scene turned upside down, so the two read as bookends
 * rather than as the same trick twice. There: copy above, the couple standing on dark
 * silk, cut off at the knees by the card edge. Here: the photograph hangs from the top
 * edge on cream, the copy sits beneath it, and the composition is one centred column at
 * every width instead of splitting into two. It is also the only light scene in the last
 * third of the page, which is most of why it works — Sacred is temple stone and the
 * Finale is night, and a breath of cream between them is what keeps the ending from
 * reading as one long dark block.
 *
 * The photograph is cropped by its own frame: her forearm leaves the top-left, his sleeve
 * the top-right. So it is flush with the section's top edge and the arms continue off the
 * screen. Nothing is absolutely positioned here — the image is in normal flow with an
 * explicit width and an aspect-derived height, which is also what keeps Safari from
 * sizing it off its intrinsic dimensions.
 */
export function Vow() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion, finePointer, ready } = useExperience();

  useGSAP(
    () => {
      // Wait for the experience to resolve before choosing a branch. `reducedMotion` is false
      // on the very first render — it is only known once matchMedia has been read — so running
      // unguarded sets up the entrance for someone who asked for no motion, and the reduced
      // branch on the re-run then fights the first context's style restoration. SceneStack
      // guards the same way, for the same reason.
      if (!ready) return;

      const q = gsap.utils.selector(root);
      const rule = q(".vow-rule")[0];

      if (reducedMotion) {
        showStrokes(root.current);
        gsap.set(q(".vow-hands"), { clipPath: "none", autoAlpha: 1, scale: 1 });
        gsap.set(q(".vow-rise"), { autoAlpha: 1, y: 0 });
        return;
      }

      prepareDraw(rule);

      // The reveal opens from the clasp — 46% across, 69% down, measured off the cut-out's
      // own alpha channel, not guessed. The circle grows outward along the arms, so the
      // held hands are the first thing on screen and the arms resolve afterwards.
      gsap.set(q(".vow-hands"), { clipPath: "circle(0% at 46% 69%)", scale: 1.06, transformOrigin: "46% 69%" });
      gsap.set(q(".vow-rise"), { autoAlpha: 0, y: 26 });

      onceInView(
        root.current,
        () => {
          gsap
            .timeline({ defaults: { ease: "expo.out" } })
            .to(q(".vow-hands"), { clipPath: "circle(125% at 46% 69%)", duration: 2.2 }, 0)
            .to(q(".vow-hands"), { scale: 1, duration: 2.6, ease: "silk" }, 0)
            .add(drawStrokes(rule, { duration: 1.4, ease: "power2.inOut" }), 0.9)
            .to(q(".vow-rise"), { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.14, ease: "power3.out" }, 1.05);
        },
        "top 68%",
      );

      // Desktop only, and on its own wrapper: the entrance owns scale on the image, the
      // scrub owns yPercent out here, so the two never write the same transform.
      if (!finePointer) return;
      gsap.fromTo(
        q(".vow-drift"),
        { yPercent: -3 },
        { yPercent: 3, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 1.2 } },
      );
    },
    { dependencies: [reducedMotion, finePointer, ready], scope: root },
  );

  const c = wedding.quotes.hands;

  return (
    <section ref={root} id="vow" data-scene aria-labelledby="vow-title" className="scene vow-scene silk-ivory relative isolate text-ink">
      <div className="vow-drift">
        <img
          className="vow-hands"
          src="/vow/hands-640.webp"
          srcSet="/vow/hands-420.webp 420w, /vow/hands-640.webp 640w, /vow/hands-900.webp 900w"
          sizes="(min-width: 1024px) 46vh, 100vw"
          width={1024}
          height={1302}
          alt="Dharani's and Barath's hands clasped, her forearm covered in bridal henna and stacked bangles, his wrist in a steel kada."
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>

      <div className="vow-copy">
        <p className="vow-rise flex items-center justify-center gap-3">
          <span aria-hidden className="block h-px w-8 bg-gradient-to-r from-transparent to-gold" />
          <span className="eyebrow text-[0.7rem] tracking-[0.16em] text-bronze">
            {c.eyebrow} <span className="mx-1.5">·</span>
            <span lang="ta" className="tamil normal-case tracking-normal">
              {c.eyebrowTamil}
            </span>
          </span>
          <span aria-hidden className="block h-px w-8 bg-gradient-to-l from-transparent to-gold" />
        </p>

        <h2 id="vow-title" lang="ta" className="vow-rise vow-line tamil mt-5 text-maroon">
          {c.ta}
        </h2>

        <svg className="vow-rule" viewBox="0 0 200 6" fill="none" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 3 H200"
            data-draw
            stroke="url(#vow-rule-g)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
          />
          <defs>
            {/* userSpaceOnUse, not the default objectBoundingBox: this path is a straight
                horizontal line, so its bounding box has zero height and a bounding-box
                gradient over it is degenerate — the browser draws nothing at all. */}
            <linearGradient id="vow-rule-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="0">
              <stop offset="0" stopColor="#c9a24a" stopOpacity="0" />
              <stop offset="0.5" stopColor="#c9a24a" />
              <stop offset="1" stopColor="#c9a24a" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        <p className="vow-rise vow-en font-display italic text-maroon/70">{c.en}</p>
      </div>
    </section>
  );
}
