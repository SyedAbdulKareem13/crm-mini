"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { getLenis } from "@/components/effects/SmoothScroll";

const MIN_VISIBLE = 1500;
const FALLBACK = 8000;

/** Night-black curtain with a gold monogram; lifts once the hero's first frame is ready. */
export function Loader() {
  const { ready, setReady } = useExperience();
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const mounted = useRef(0);

  useEffect(() => {
    mounted.current = performance.now();
    document.documentElement.style.overflow = "hidden";
    // Lenis is created by a parent effect, so catch it on the next frame
    const raf = window.requestAnimationFrame(() => getLenis()?.stop());
    const fallback = window.setTimeout(() => setReady(), FALLBACK);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [setReady]);

  useEffect(() => {
    if (!ready || !root.current) return;
    const elapsed = performance.now() - mounted.current;
    const wait = Math.max(0, MIN_VISIBLE - elapsed) / 1000;
    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({
      delay: wait,
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        document.documentElement.style.overflow = "";
        getLenis()?.start();
        ScrollTrigger.refresh();
        setGone(true);
      },
    });
    tl.to(q(".loader-mark"), { autoAlpha: 0, y: -24, duration: 0.7 })
      .fromTo(q(".loader-sweep"), { xPercent: -140 }, { xPercent: 140, duration: 1.2, ease: "power2.inOut" }, 0)
      .to(root.current, { yPercent: -100, duration: 1.3, ease: "power4.inOut" }, 0.45);
    return () => {
      tl.kill();
    };
  }, [ready]);

  if (gone) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-night" role="status" aria-live="polite" aria-label="Loading invitation">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_60%,rgba(122,27,46,0.55),transparent_70%)]" />
      <div className="loader-sweep pointer-events-none absolute inset-y-0 left-0 w-[45vw] bg-[linear-gradient(100deg,transparent,rgba(232,207,138,0.16),transparent)]" />
      <div className="loader-mark relative flex flex-col items-center gap-6 px-6 text-center">
        <p className="font-display text-[clamp(2.6rem,7vw,4.5rem)] leading-none text-gold-light">
          <span className="gold-text-static">{wedding.couple.bride.initial}</span>
          <span className="mx-3 italic text-gold/80">&amp;</span>
          <span className="gold-text-static">{wedding.couple.groom.initial}</span>
        </p>
        <p className="eyebrow text-gold/70">{wedding.couple.display}</p>
        <div className="flex items-center gap-2.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="pulli-dot block h-1.5 w-1.5 rounded-full bg-gold" style={{ animationDelay: `${i * 0.16}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
