"use client";

import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";

let instance: Lenis | null = null;
export const getLenis = () => instance;

/** Scroll to an element or position, through Lenis when active, else natively. */
export function scrollToTarget(target: string | HTMLElement | number, offset = 0) {
  if (instance) {
    instance.scrollTo(target, { offset, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target + offset, behavior: "smooth" });
    return;
  }
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const { reducedMotion, scroll } = useExperience();

  useEffect(() => {
    if (reducedMotion) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const lenis = new Lenis({
      lerp: 0.07,
      wheelMultiplier: 0.85,
      smoothWheel: true,
      // on touch devices Lenis drives the scroll position every frame, so ScrollTrigger
      // scrubs and pins stay in lock-step with the finger instead of trailing momentum
      syncTouch: coarse,
      syncTouchLerp: 0.09,
      touchInertiaExponent: 1.7,
      touchMultiplier: 1.3,
      anchors: true,
    });
    instance = lenis;

    lenis.on("scroll", (e: { scroll: number; velocity: number; progress: number }) => {
      scroll.current.y = e.scroll;
      scroll.current.velocity = e.velocity;
      scroll.current.progress = e.progress;
      ScrollTrigger.update();
    });

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      instance = null;
    };
  }, [reducedMotion, scroll]);

  // Native fallback keeps scroll metrics flowing for effects
  useEffect(() => {
    if (!reducedMotion) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      scroll.current.velocity = y - last;
      scroll.current.y = y;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scroll.current.progress = max > 0 ? y / max : 0;
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reducedMotion, scroll]);

  return <>{children}</>;
}
