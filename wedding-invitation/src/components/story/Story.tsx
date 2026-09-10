"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { words } from "@/lib/utils";
import { Kolam } from "@/components/art/Kolam";
import { Lamp2D } from "@/components/art/Lamp2D";
import { petals } from "@/components/effects/Petals";
import { SceneVeil } from "@/components/effects/SceneStack";

/**
 * Pinned quote scene: silk curtains part, the Tamil line is lit word by word
 * as if a lamp were carried along it, a vast kolam turns beneath.
 */
export function Story() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion, finePointer } = useExperience();

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      gsap.set(q(".story-lit"), { opacity: 0 });
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
        .fromTo(q(".story-kolam"), finePointer ? { scale: 1.25, rotate: -12, autoAlpha: 0 } : { autoAlpha: 0 }, finePointer ? { scale: 1, rotate: 24, autoAlpha: 1, duration: 0.9 } : { autoAlpha: 1, duration: 0.5 }, 0.02)
        .to(q(".story-eyebrow"), { autoAlpha: 1, y: 0, duration: 0.08 }, 0.14)
        .to(q(".story-lamp"), { autoAlpha: 1, y: 0, duration: 0.1 }, 0.16)
        .to(q(".story-lit"), { opacity: 1, duration: 0.07, stagger: 0.055, ease: "power1.inOut" }, 0.2)
        .to(q(".story-en"), { autoAlpha: 1, y: 0, duration: 0.1 }, 0.66)
        .to(q(".story-stage"), { autoAlpha: 0.15, scale: 0.98, duration: 0.14 }, 0.86);
    },
    { dependencies: [reducedMotion, finePointer], scope: root },
  );

  const line = words(wedding.quotes.story.ta);

  return (
    <section ref={root} id="story" data-scene aria-labelledby="story-title" className={reducedMotion ? "scene relative" : "scene relative h-[280svh]"}>
      <div className="sticky top-0 h-[100svh] overflow-hidden silk-maroon">
        <div className="story-stage absolute inset-0">
          <Kolam hairline strokeWidth={1} className="story-kolam art-layer absolute left-1/2 top-1/2 w-[130vw] -translate-x-1/2 -translate-y-1/2 text-gold/[0.14] md:w-[118vmax]" />
          <div className="absolute inset-0 vignette" />

          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="story-eyebrow eyebrow text-gold/70">
              A new chapter <span className="mx-2">·</span> <span className="tamil normal-case tracking-normal">புதிய அத்தியாயம்</span>
            </p>
            <h2 id="story-title" className="sr-only">
              {wedding.quotes.story.en}
            </h2>
            <p className="story-line tamil mt-8 max-w-5xl text-[clamp(1.55rem,4.4vw,3.5rem)] leading-[1.7]" aria-hidden>
              {line.map((w, i) => (
                <span key={i} className="story-word relative mx-[0.16em] inline-block">
                  <span className="text-gold-light/20">{w}</span>
                  <span className="story-lit absolute inset-0 text-champagne will-change-[opacity]">{w}</span>
                </span>
              ))}
            </p>
            <p className="story-en mt-10 font-display text-xl italic text-gold-light/85 md:text-3xl">{wedding.quotes.story.en}</p>
          </div>

          <div className="story-lamp pointer-events-none absolute bottom-[2svh] left-1/2 flex h-[26svh] -translate-x-1/2 items-end justify-center md:h-[36vh]" aria-hidden>
            <div className="absolute bottom-[-6%] left-1/2 h-[80%] w-[220%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(255,170,70,0.28),rgba(255,140,40,0.08)_55%,transparent)]" />
            <Lamp2D glow className="relative h-full w-auto" />
          </div>
        </div>

        {/* silk curtains */}
        <div className="curtain-l absolute inset-y-0 left-0 z-20 w-1/2 silk-maroon shadow-[20px_0_60px_rgba(0,0,0,0.5)]" aria-hidden>
          <div className="absolute inset-y-0 right-0 w-[3px] bg-linear-to-b from-gold-deep via-gold-light to-gold-deep" />
        </div>
        <div className="curtain-r absolute inset-y-0 right-0 z-20 w-1/2 silk-maroon shadow-[-20px_0_60px_rgba(0,0,0,0.5)]" aria-hidden>
          <div className="absolute inset-y-0 left-0 w-[3px] bg-linear-to-b from-gold-deep via-gold-light to-gold-deep" />
        </div>
      </div>
      <SceneVeil />
    </section>
  );
}
