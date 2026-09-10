"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";

/**
 * Liquid scene transitions.
 *
 * Every <section data-scene> becomes a card in a deck: when a scene's bottom reaches
 * the bottom of the viewport it is pinned in place (no extra scroll distance) while
 * the next scene slides up over it. The covered scene recedes — it scales down a
 * touch and a warm-dark veil settles over it — and the incoming scene's content
 * drifts in slightly slower than the card itself, which reads as depth.
 *
 * Sections are also tagged .in-view so decorative CSS animations only run when
 * the scene can actually be seen (see globals.css).
 */
export function SceneStack() {
  const { reducedMotion, quality, ready, finePointer } = useExperience();

  // pause looping SVG animations for scenes that are off-screen
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > [data-scene]"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.target as HTMLElement).classList.toggle("in-view", e.isIntersecting)),
      { rootMargin: "12% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      if (reducedMotion || !ready) return;
      const sections = Array.from(document.querySelectorAll<HTMLElement>("main > [data-scene]"));
      const depth = quality === "high";

      sections.forEach((section, i) => {
        const next = sections[i + 1];
        if (!next) return;

        // hold the finished scene in place while the next one slides over it
        ScrollTrigger.create({
          trigger: section,
          start: "bottom bottom",
          endTrigger: next,
          end: "bottom bottom",
          pin: true,
          pinSpacing: false,
          anticipatePin: 1,
        });

        // the covered scene recedes
        const veil = section.querySelector<HTMLElement>(":scope > .scene-veil");
        const cover = gsap.timeline({
          scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: 1.1 },
          defaults: { ease: "none" },
        });
        if (veil) cover.fromTo(veil, { opacity: 0 }, { opacity: 0.62 }, 0);
        if (depth) cover.fromTo(section, { scale: 1 }, { scale: 0.965, transformOrigin: "50% 85%" }, 0);

        // the arriving scene's content drifts in a beat behind its card (desktop; phones keep layers lean)
        if (finePointer) {
          const inner = Array.from(next.children).filter((c) => !c.classList.contains("scene-veil"));
          if (inner.length) {
            gsap.fromTo(inner, { y: 64 }, { y: 0, ease: "none", scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: 1.1 } });
          }
        }
      });

      ScrollTrigger.refresh();
    },
    { dependencies: [reducedMotion, ready, quality, finePointer] },
  );

  return null;
}

/** Drop one of these as the last child of every scene section. */
export function SceneVeil() {
  return <div className="scene-veil" aria-hidden />;
}
