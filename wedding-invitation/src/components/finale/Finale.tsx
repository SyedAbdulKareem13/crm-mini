"use client";

import { useCallback, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { whatsappUrl } from "@/lib/calendar";
import { graphemes } from "@/lib/utils";
import { Kolam } from "@/components/art/Kolam";
import { Lotus } from "@/components/art/Lotus";
import { JasmineStrand } from "@/components/art/Jasmine";
import { Button, ButtonLink } from "@/components/ui/Button";
import { IconArrowUp, IconCheck, IconCopy, IconWhatsApp } from "@/components/ui/Icons";
import { petals } from "@/components/effects/Petals";
import { scrollToTarget } from "@/components/effects/SmoothScroll";
import { showStrokes } from "@/animations/draw";

function Chars({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-hidden style={{ perspective: 900 }}>
      {graphemes(text).map((c, i) => (
        <span key={i} className="fin-ch gold-text inline-block" style={{ animationDelay: `${-i * 0.2}s` }}>
          {c === " " ? " " : c}
        </span>
      ))}
    </span>
  );
}

/**
 * Together — light gathers, a lotus blooms, the names return one last time.
 * Pinned so the closing frame holds still at the bottom of the page.
 */
export function Finale() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion } = useExperience();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) {
        showStrokes(root.current);
        return;
      }
      gsap.set(q(".fin-ch"), { autoAlpha: 0, yPercent: 60, rotateX: -60 });
      gsap.set(q(".fin-rise"), { autoAlpha: 0, y: 30 });
      gsap.set(q("[data-petal]"), { scale: 0.3, transformOrigin: "50% 100%" });
      gsap.set(q(".fin-strand"), { clipPath: "inset(0 0 100% 0)" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
          onEnter: () => petals({ type: "mode", mode: "gather" }),
          onLeaveBack: () => petals({ type: "mode", mode: "drift" }),
        },
        defaults: { ease: "none" },
      });

      tl.fromTo(q(".fin-light"), { autoAlpha: 0.35, scale: 0.7 }, { autoAlpha: 1, scale: 1, duration: 0.5 }, 0)
        .fromTo(q(".fin-kolam"), { scale: 1.3, rotate: -20, autoAlpha: 0.4 }, { scale: 1, rotate: 10, autoAlpha: 1, duration: 0.9 }, 0)
        .to(q("[data-petal]"), { scale: 1, duration: 0.4, stagger: { each: 0.022, from: "center" }, ease: "back.out(1.4)" }, 0.04)
        .to(q(".fin-strand"), { clipPath: "inset(0 0 0% 0)", duration: 0.4 }, 0.06)
        .to(q(".fin-ch"), { autoAlpha: 1, yPercent: 0, rotateX: 0, duration: 0.26, stagger: 0.012, ease: "power3.out" }, 0.2)
        .to(q(".fin-rise"), { autoAlpha: 1, y: 0, duration: 0.14, stagger: 0.05 }, 0.42);
    },
    { dependencies: [reducedMotion], scope: root },
  );

  const wishes = wedding.wishes.whatsapp ? whatsappUrl(wedding.wishes.message, wedding.wishes.whatsapp) : null;
  const shareWa = whatsappUrl(`${wedding.share.text}\n${typeof window !== "undefined" ? window.location.href : ""}`.trim());

  return (
    <section ref={root} id="finale" data-scene aria-labelledby="finale-title" className={reducedMotion ? "relative" : "relative h-[210vh]"}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-[radial-gradient(80%_70%_at_50%_60%,#4a0f1c_0%,#2a0810_45%,#120507_100%)]">
        <div className="fin-light pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_58%,rgba(255,180,80,0.32),rgba(122,27,46,0.1)_45%,transparent_70%)]" aria-hidden />
        <Kolam hairline strokeWidth={1} className="fin-kolam pointer-events-none absolute left-1/2 top-1/2 w-[130vmax] -translate-x-1/2 -translate-y-1/2 text-gold/[0.12]" />

        <JasmineStrand className="fin-strand pointer-events-none absolute left-[4vw] top-0 hidden h-[70svh] w-16 md:block" count={14} />
        <JasmineStrand className="fin-strand pointer-events-none absolute right-[4vw] top-0 hidden h-[70svh] w-16 -scale-x-100 md:block" count={14} />

        <Lotus className="pointer-events-none absolute bottom-[-3vh] left-1/2 w-[min(74vw,440px)] -translate-x-1/2 drop-shadow-[0_-10px_50px_rgba(232,207,138,0.25)]" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-[20svh] text-center md:pb-[26vh]">
          <p className="fin-rise eyebrow text-gold/75">
            Together <span className="mx-2">·</span> <span className="tamil normal-case tracking-normal">ஒன்றாய்</span>
          </p>
          <h2 id="finale-title" className="mt-5">
            <span className="sr-only">{wedding.couple.display}</span>
            <Chars text={wedding.couple.display} className="display-lg inline-flex flex-wrap justify-center" />
          </h2>
          <p className="fin-rise mt-6 font-display text-2xl italic text-champagne md:text-4xl">{wedding.quotes.finale.en}</p>
          <p className="fin-rise tamil mt-7 max-w-3xl text-base text-gold-light/85 md:text-2xl">{wedding.quotes.blessing.ta}</p>
          <p className="fin-rise mt-2 max-w-xl font-display text-base italic text-ivory/60 md:text-lg">{wedding.quotes.blessing.en}</p>
          <p className="fin-rise tamil mt-6 text-xl text-gold md:text-2xl">{wedding.quotes.finale.ta}</p>

          <div className="fin-rise mt-10 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href={shareWa} target="_blank" rel="noopener noreferrer" variant="gold" icon={<IconWhatsApp />}>
              Share on WhatsApp
            </ButtonLink>
            {wishes && (
              <ButtonLink href={wishes} target="_blank" rel="noopener noreferrer" variant="outline" icon={<IconWhatsApp />}>
                Send your wishes
              </ButtonLink>
            )}
            <Button variant="outline" onClick={copy} icon={copied ? <IconCheck /> : <IconCopy />}>
              {copied ? "Link copied" : "Copy link"}
            </Button>
          </div>

          <p className="fin-rise eyebrow mt-10 text-[0.6rem] text-ivory/40">
            {wedding.dates.range} · Palladam · Tirupur · {wedding.couple.hashtag}
          </p>
          <button
            type="button"
            onClick={() => scrollToTarget(0)}
            className="fin-rise mt-6 flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.3em] text-gold/60 transition-colors hover:text-gold-light"
          >
            <IconArrowUp /> Back to the beginning
          </button>
        </div>
      </div>
    </section>
  );
}
