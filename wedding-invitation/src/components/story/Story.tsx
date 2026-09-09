"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { words } from "@/lib/utils";
import { Kolam } from "@/components/art/Kolam";
import { Lamp2D } from "@/components/art/Lamp2D";
import { petals } from "@/components/effects/Petals";

/**
 * Pinned quote scene: silk curtains part, the Tamil line is lit word by word
 * as if a lamp were carried along it, a vast kolam turns beneath.
 */
export function Story() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion } = useExperience();

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      gsap.set(q(".story-word"), { color: "rgba(232,207,138,0.16)" });
      gsap.set(q(".story-en, .story-eyebrow, .story-lamp"), { autoAlpha: 0, y: 24 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          onLeave: () => petals({ type: "burst", count: 46, y: 0.35 }),
        },
        defaults: { ease: "none" },
      });

      tl.to(q(".curtain-l"), { xPercent: -102, duration: 0.16, ease: "power2.inOut" }, 0.02)
        .to(q(".curtain-r"), { xPercent: 102, duration: 0.16, ease: "power2.inOut" }, 0.02)
        .fromTo(q(".story-kolam"), { scale: 1.25, rotate: -12, autoAlpha: 0 }, { scale: 1, rotate: 24, autoAlpha: 1, duration: 0.9 }, 0.02)
        .to(q(".story-eyebrow"), { autoAlpha: 1, y: 0, duration: 0.08 }, 0.14)
        .to(q(".story-lamp"), { autoAlpha: 1, y: 0, duration: 0.1 }, 0.16)
        .to(
          q(".story-word"),
          { color: "rgba(246,231,185,1)", textShadow: "0 0 26px rgba(232,207,138,0.5)", duration: 0.07, stagger: 0.055, ease: "power1.inOut" },
          0.2,
        )
        .to(q(".story-en"), { autoAlpha: 1, y: 0, duration: 0.1 }, 0.66)
        .to(q(".story-stage"), { autoAlpha: 0.15, scale: 0.98, duration: 0.14 }, 0.86);
    },
    { dependencies: [reducedMotion], scope: root },
  );

  const line = words(wedding.quotes.story.ta);

  return (
    <section ref={root} id="story" data-scene aria-labelledby="story-title" className={reducedMotion ? "relative" : "relative h-[280vh]"}>
      <div className="sticky top-0 h-[100svh] overflow-hidden silk-maroon">
        <div className="story-stage absolute inset-0">
          <Kolam hairline strokeWidth={1} className="story-kolam absolute left-1/2 top-1/2 w-[150vmax] -translate-x-1/2 -translate-y-1/2 text-gold/[0.14]" />
          <div className="absolute inset-0 vignette" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="story-eyebrow eyebrow text-gold/70">
              A new chapter <span className="mx-2">·</span> <span className="tamil normal-case tracking-normal">புதிய அத்தியாயம்</span>
            </p>
            <h2 id="story-title" className="sr-only">
              {wedding.quotes.story.en}
            </h2>
            <p className="tamil mt-8 max-w-5xl text-[clamp(1.55rem,4.4vw,3.5rem)] leading-[1.7] text-champagne" aria-hidden>
              {line.map((w, i) => (
                <span key={i} className="story-word mx-[0.16em] inline-block">
                  {w}
                </span>
              ))}
            </p>
            <p className="story-en mt-10 font-display text-xl italic text-gold-light/85 md:text-3xl">{wedding.quotes.story.en}</p>
          </div>

          <Lamp2D className="story-lamp pointer-events-none absolute bottom-[4svh] left-1/2 h-[20svh] w-auto -translate-x-1/2 drop-shadow-[0_0_30px_rgba(255,170,70,0.35)]" />
        </div>

        {/* silk curtains */}
        <div className="curtain-l absolute inset-y-0 left-0 z-20 w-1/2 silk-maroon shadow-[20px_0_60px_rgba(0,0,0,0.5)]" aria-hidden>
          <div className="absolute inset-y-0 right-0 w-[3px] bg-linear-to-b from-gold-deep via-gold-light to-gold-deep" />
        </div>
        <div className="curtain-r absolute inset-y-0 right-0 z-20 w-1/2 silk-maroon shadow-[-20px_0_60px_rgba(0,0,0,0.5)]" aria-hidden>
          <div className="absolute inset-y-0 left-0 w-[3px] bg-linear-to-b from-gold-deep via-gold-light to-gold-deep" />
        </div>
      </div>
    </section>
  );
}
