"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";

/** Warm lamp-light that follows the pointer on desktop; grows over interactive elements. */
export function CursorGlow() {
  const glow = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const { finePointer, reducedMotion } = useExperience();

  useEffect(() => {
    if (!finePointer || reducedMotion || !glow.current || !dot.current) return;
    const g = glow.current, d = dot.current;
    const gx = gsap.quickTo(g, "x", { duration: 0.55, ease: "power3" });
    const gy = gsap.quickTo(g, "y", { duration: 0.55, ease: "power3" });
    const dx = gsap.quickTo(d, "x", { duration: 0.12, ease: "power2" });
    const dy = gsap.quickTo(d, "y", { duration: 0.12, ease: "power2" });
    let shown = false;

    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to([g, d], { autoAlpha: 1, duration: 0.6 });
      }
      gx(e.clientX); gy(e.clientY); dx(e.clientX); dy(e.clientY);
    };
    const onOver = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.("a, button, [data-magnetic]");
      gsap.to(g, { scale: t ? 1.6 : 1, duration: 0.5, ease: "power3" });
      gsap.to(d, { scale: t ? 0 : 1, duration: 0.3 });
    };
    const onLeave = () => { shown = false; gsap.to([g, d], { autoAlpha: 0, duration: 0.4 }); };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [finePointer, reducedMotion]);

  if (!finePointer || reducedMotion) return null;
  return (
    <>
      <div
        ref={glow}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[45] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{
          background: "radial-gradient(circle, rgba(232,207,138,0.16) 0%, rgba(201,162,74,0.07) 32%, rgba(201,162,74,0) 70%)",
          willChange: "transform",
        }}
      />
      <div
        ref={dot}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[46] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
        style={{ background: "#f3e4bd", boxShadow: "0 0 12px 3px rgba(232,207,138,0.7)", willChange: "transform" }}
      />
    </>
  );
}
