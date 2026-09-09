"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { SCENES, type SceneId } from "@/data/scenes";
import { scrollToTarget } from "./SmoothScroll";
import { cn } from "@/lib/utils";

/** Golden progress thread (all sizes) + scene dots with labels (≥ lg). */
export function SceneNav() {
  const { introDone } = useExperience();
  const [active, setActive] = useState<SceneId>("opening");
  const thread = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!introDone) return;
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (thread.current) thread.current.style.transform = `scaleX(${self.progress})`;
      },
    });
    const triggers = SCENES.map((s) =>
      ScrollTrigger.create({
        trigger: `#${s.id}`,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => self.isActive && setActive(s.id),
      }),
    );
    gsap.fromTo(nav.current, { autoAlpha: 0, x: 16 }, { autoAlpha: 1, x: 0, duration: 1.2, delay: 0.4 });
    return () => { st.kill(); triggers.forEach((t) => t.kill()); };
  }, { dependencies: [introDone] });

  useEffect(() => {
    if (!introDone) return;
    gsap.to(thread.current, { autoAlpha: 1, duration: 1 });
  }, [introDone]);

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[2px] opacity-0">
        <div ref={thread} className="h-full w-full origin-left scale-x-0 bg-linear-to-r from-gold-deep via-gold to-gold-light shadow-[0_0_12px_rgba(232,207,138,0.7)]" />
      </div>

      <nav ref={nav} aria-label="Scenes" className="fixed right-5 top-1/2 z-[55] hidden -translate-y-1/2 opacity-0 lg:block">
        <ul className="flex flex-col gap-4">
          {SCENES.map((s) => {
            const on = active === s.id;
            return (
              <li key={s.id} className="group relative flex items-center justify-end">
                <span
                  className={cn(
                    "pointer-events-none absolute right-7 whitespace-nowrap font-display text-sm italic tracking-wide text-gold-light transition-all duration-500",
                    on ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                  )}
                >
                  {s.label}
                </span>
                <button
                  type="button"
                  onClick={() => scrollToTarget(`#${s.id}`)}
                  aria-label={`Go to ${s.label}`}
                  aria-current={on ? "true" : undefined}
                  className="relative flex h-6 w-6 items-center justify-center"
                >
                  <span className={cn("absolute h-4 w-4 rotate-45 border border-gold/60 transition-all duration-500", on ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
                  <span className={cn("h-1.5 w-1.5 rounded-full transition-all duration-500", on ? "bg-gold-light shadow-[0_0_10px_rgba(232,207,138,0.9)]" : "bg-gold/50 group-hover:bg-gold")} />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
