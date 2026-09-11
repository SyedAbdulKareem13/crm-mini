"use client";

import { gsap } from "@/lib/gsap";

/** Editorial rise: blur-to-focus + lift, staggered. */
export function riseIn(targets: gsap.TweenTarget, vars: gsap.TweenVars = {}) {
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 36 },
    { autoAlpha: 1, y: 0, duration: 1.6, ease: "expo.out", stagger: 0.09, ...vars },
  );
}

/**
 * Characters unfold like turning pages. The blur is dropped on touch devices: it is a filter on
 * gradient-clipped text, which WebKit renders unreliably, and it costs a repaint per frame.
 */
export function unfoldChars(targets: gsap.TweenTarget, vars: gsap.TweenVars = {}) {
  const soft = typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, yPercent: 60, rotateX: -70, transformOrigin: "50% 100% -20px", ...(soft ? { filter: "blur(6px)" } : {}) },
    { autoAlpha: 1, yPercent: 0, rotateX: 0, ...(soft ? { filter: "blur(0px)" } : {}), duration: 1.1, ease: "power4.out", stagger: 0.05, ...vars },
  );
}

/** Words light up as if a lamp is being carried along the line. */
export function illuminateWords(targets: gsap.TweenTarget, vars: gsap.TweenVars = {}) {
  return gsap.fromTo(
    targets,
    { color: "rgba(232,207,138,0.18)" },
    { color: "rgba(246,231,185,1)", duration: 0.6, ease: "none", stagger: 0.12, ...vars },
  );
}

/** Scene mask opening — animate a CSS mask-size from tiny to full. */
export function openMask(target: gsap.TweenTarget, vars: gsap.TweenVars = {}) {
  return gsap.fromTo(
    target,
    { "--mask": "0%" } as gsap.TweenVars,
    { "--mask": "160%", duration: 1.6, ease: "power2.inOut", ...vars } as gsap.TweenVars,
  );
}
