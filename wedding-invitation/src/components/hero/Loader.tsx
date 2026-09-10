"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { getLenis } from "@/components/effects/SmoothScroll";
import { petals } from "@/components/effects/Petals";

const FALLBACK = 8000;

/**
 * The curtain gate. The stage is closed behind velvet drapes while assets load; when the first
 * frame is ready a monogrammed "Tap to open" appears. On tap the curtains are tugged, gathered
 * to both wings with cloth-like lag and an elastic settle, light spills from the centre, the
 * valance lifts — and the hero's lamp-lighting sequence starts underneath while they part.
 */
export function Loader() {
  const { ready, setReady, opened, setOpened, reducedMotion } = useExperience();
  const root = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  const opening = useRef(false);

  // lock the page while the stage is closed
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    const raf = window.requestAnimationFrame(() => getLenis()?.stop());
    const fallback = window.setTimeout(() => setReady(), FALLBACK);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
    };
  }, [setReady]);

  // loading dots → tap to open
  useGSAP(
    () => {
      if (!ready) return;
      const q = gsap.utils.selector(root);
      gsap.to(q(".gate-dots"), { autoAlpha: 0, y: -10, duration: 0.45, ease: "power2.in" });
      gsap.fromTo(q(".gate-cta"), { autoAlpha: 0, y: 16, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: "expo.out", delay: 0.35 });
    },
    { dependencies: [ready], scope: root },
  );

  const finish = useCallback(() => {
    document.documentElement.style.overflow = "";
    getLenis()?.start();
    ScrollTrigger.refresh();
    setGone(true);
  }, []);

  const open = useCallback(() => {
    if (!ready || opening.current || !root.current) return;
    opening.current = true;
    window.dispatchEvent(new Event("invite:open"));
    const q = gsap.utils.selector(root);
    const L = q(".curtain-left")[0];
    const R = q(".curtain-right")[0];

    if (reducedMotion) {
      setOpened();
      gsap.to(root.current, { autoAlpha: 0, duration: 0.6, onComplete: finish });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: finish });
    tl.to(q(".gate-center"), { autoAlpha: 0, scale: 0.92, duration: 0.45, ease: "power2.in" }, 0)
      // the tug: fabric lifts and leans as the cords are pulled
      .to([L, R], { scaleY: 0.985, duration: 0.32, ease: "power2.out" }, 0.05)
      .to(L, { skewX: 5.5, duration: 0.36, ease: "power2.out" }, 0.05)
      .to(R, { skewX: -5.5, duration: 0.36, ease: "power2.out" }, 0.05)
      // the draw: pleats gather toward each wing
      .to([L, R], { scaleX: 0.1, duration: 1.75 }, 0.3)
      .to([L, R], { scaleY: 1, duration: 1.2, ease: "power2.out" }, 0.6)
      // gravity: the hems swing back and settle like cloth
      .to(L, { skewX: 0, duration: 1.7, ease: "elastic.out(1, 0.42)" }, 1.05)
      .to(R, { skewX: 0, duration: 1.7, ease: "elastic.out(1, 0.42)" }, 1.05)
      // light spills through the opening
      .fromTo(q(".gate-light"), { scale: 0.3, autoAlpha: 0 }, { scale: 1.9, autoAlpha: 0.7, duration: 1.1, ease: "power2.out" }, 0.45)
      .to(q(".gate-light"), { autoAlpha: 0, duration: 0.9, ease: "power2.in" }, 1.7)
      // the valance lifts away
      .to(q(".curtain-valance"), { yPercent: -115, duration: 0.95, ease: "power3.in" }, 1.25)
      // gathered wings slide off stage
      .to(L, { xPercent: -115, duration: 0.7, ease: "power2.in" }, 1.95)
      .to(R, { xPercent: 115, duration: 0.7, ease: "power2.in" }, 1.95)
      .to(root.current, { autoAlpha: 0, duration: 0.3, ease: "power1.out" }, 2.55)
      // the story begins the moment the cords are pulled, so the lamp is glowing as the drapes clear
      .add(() => setOpened(), 0.12)
      .add(() => petals({ type: "burst", count: 26, y: 0.45 }), 0.9);
  }, [ready, reducedMotion, setOpened, finish]);

  if (gone) return null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[100] overflow-hidden bg-transparent"
      role="dialog"
      aria-modal="true"
      aria-label="Invitation"
      onClick={open}
    >
      {/* light behind the curtain, revealed as it parts */}
      <div className="gate-light pointer-events-none absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 bg-[radial-gradient(circle,rgba(255,214,140,0.55)_0%,rgba(255,170,70,0.22)_30%,rgba(122,27,46,0)_58%)]" aria-hidden />

      {/* curtains */}
      <div className="curtain-left absolute -top-[4%] -bottom-[4%] left-[-8%] w-[58.6%]" style={{ transformOrigin: "left top" }} aria-hidden>
        <div className="curtain-idle absolute inset-0">
          <div className="curtain-fabric" />
          <Tassel side="left" />
        </div>
      </div>
      <div className="curtain-right absolute -top-[4%] -bottom-[4%] right-[-8%] w-[58.6%]" style={{ transformOrigin: "right top" }} aria-hidden>
        <div className="curtain-idle absolute inset-0" style={{ animationDelay: "-3.5s" }}>
          <div className="curtain-fabric" style={{ transform: "scaleX(-1)" }} />
          <div className="curtain-hem left-0" />
          <Tassel side="right" />
        </div>
      </div>
      <div className="curtain-valance" aria-hidden>
        <div className="curtain-fringe" />
      </div>

      {/* centre: monogram, tap to open */}
      <div className="gate-center absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="eyebrow text-gold-light/75">You are warmly invited</p>
        <p className="tamil mt-2 text-sm text-gold-light/60">அன்புடன் அழைக்கிறோம்</p>
        <p className="mt-5 font-display text-[clamp(3.4rem,10vw,6.5rem)] leading-none">
          <span className="gold-text-static">{wedding.couple.bride.initial}</span>
          <span className="mx-3 italic text-gold/80">&amp;</span>
          <span className="gold-text-static">{wedding.couple.groom.initial}</span>
        </p>
        <p className="mt-4 font-display text-xl italic text-champagne/90 md:text-2xl">{wedding.couple.display}</p>
        <p className="eyebrow mt-2 text-[0.6rem] text-ivory/60">{wedding.dates.range}</p>

        {/* while loading */}
        <div className="gate-dots mt-10 flex items-center gap-2.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="pulli-dot block h-1.5 w-1.5 rounded-full bg-gold" style={{ animationDelay: `${i * 0.16}s` }} />
          ))}
        </div>

        {/* once ready */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="gate-cta relative mt-10 flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-full opacity-0 md:h-36 md:w-36"
          aria-label="Tap to open the invitation"
        >
          <span className="tap-ring absolute inset-0 rounded-full border border-gold/70" />
          <span className="tap-ring absolute inset-0 rounded-full border border-gold/60" style={{ animationDelay: "1.3s" }} />
          <span className="absolute inset-[6px] rounded-full border border-gold/60 bg-[radial-gradient(circle_at_50%_35%,rgba(122,27,46,0.9),rgba(58,10,18,0.95))] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(232,207,138,0.35)]" />
          <span className="relative flex flex-col items-center leading-tight">
            <span className="font-display text-[0.72rem] uppercase tracking-[0.3em] text-gold-light md:text-xs">Tap to</span>
            <span className="font-display text-2xl italic text-champagne md:text-3xl">open</span>
            <span className="tamil mt-1 text-[0.66rem] text-gold/80">திறக்க</span>
          </span>
        </button>
      </div>
    </div>
  );
}

/** Gold cord and tassel holding the inner hem of each panel */
function Tassel({ side }: { side: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 60 200"
      aria-hidden
      className={`absolute top-[74%] h-32 w-10 md:h-44 md:w-14 ${side === "left" ? "right-1 -scale-x-100" : "left-1"}`}
    >
      <defs>
        <linearGradient id={`tassel-${side}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8e6a1f" />
          <stop offset="0.5" stopColor="#f0d58a" />
          <stop offset="1" stopColor="#8e6a1f" />
        </linearGradient>
      </defs>
      <path d="M4 10 C 30 30 40 60 34 100" fill="none" stroke={`url(#tassel-${side})`} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M4 10 C 24 40 30 70 22 100" fill="none" stroke={`url(#tassel-${side})`} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <ellipse cx="28" cy="104" rx="9" ry="7" fill={`url(#tassel-${side})`} />
      <path d="M20 108 L 16 170 M 24 110 L 22 176 M 28 110 L 28 180 M 32 110 L 34 176 M 36 108 L 40 170" stroke={`url(#tassel-${side})`} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17 118 H 39" stroke="#f0d58a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
