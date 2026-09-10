"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding, muhurtham } from "@/data/wedding";
import { googleCalendarUrl } from "@/lib/calendar";
import { Gopuram } from "@/components/art/Gopuram";
import { Bell } from "@/components/art/Bells";
import { Lamp2D } from "@/components/art/Lamp2D";
import { Kalasam } from "@/components/art/Motifs";
import { LocationCard } from "./LocationCard";
import { Countdown } from "@/components/ui/Countdown";
import { ButtonLink } from "@/components/ui/Button";
import { IconCalendar } from "@/components/ui/Icons";
import { drawStrokes, prepareDraw, showStrokes } from "@/animations/draw";
import { onceInView } from "@/animations/scroll";
import { riseIn } from "@/animations/reveal";
import { petals } from "@/components/effects/Petals";
import { SceneVeil } from "@/components/effects/SceneStack";

/**
 * The Sacred Moment — an arch opens onto a temple drawn in gold light.
 * Layers move at different depths; the gopuram draws itself; lamps ignite.
 */
export function Sacred() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion, finePointer } = useExperience();
  const ev = muhurtham;

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) {
        showStrokes(root.current);
        return;
      }
      prepareDraw(q(".gopuram")[0]);
      prepareDraw(q(".kalasam")[0]);
      gsap.set(q(".rise"), { autoAlpha: 0, y: 36 });
      gsap.set(q(".temple-lamps .flame, .temple-lamps .flame-slow"), { autoAlpha: 0 });
      gsap.set(q(".location-card"), { autoAlpha: 0, y: 80, rotateX: -14, transformPerspective: 1200 });
      gsap.set(q(".pin"), { y: -60, autoAlpha: 0 });
      gsap.set(q(".countdown"), { autoAlpha: 0, y: 40 });

      // arch opens with the scroll (desktop; re-masking a full scene per frame is too costly on phones)
      if (finePointer) {
        gsap.fromTo(
          q(".arch-mask"),
          { "--arch": "26%" },
          { "--arch": "170%", ease: "power2.inOut", scrollTrigger: { trigger: root.current, start: "top 85%", end: "top 5%", scrub: 0.8 } },
        );
      }

      // depth: sky glow, gopuram, bells, content
      const par = gsap.timeline({
        scrollTrigger: { trigger: q(".stage")[0], start: "top bottom", end: "bottom top", scrub: 1.1 },
        defaults: { ease: "none" },
      });
      par.fromTo(q(".layer-gopuram"), { yPercent: 16, scale: 0.94 }, { yPercent: -6, scale: 1.05 }, 0)
        .fromTo(q(".layer-bells"), { yPercent: -30 }, { yPercent: 22 }, 0)
        .fromTo(q(".layer-glow"), { autoAlpha: 0.2, scale: 0.8 }, { autoAlpha: 1, scale: 1.15 }, 0)
        .fromTo(q(".layer-copy"), { yPercent: 10 }, { yPercent: -14 }, 0);

      onceInView(
        q(".stage")[0],
        () => {
          const tl = gsap.timeline({ defaults: { ease: "cine" } });
          tl.add(drawStrokes(q(".gopuram")[0], { duration: 3.4, stagger: 0.012, ease: "power1.inOut" }), 0)
            .add(riseIn(q(".rise"), { stagger: 0.12 }), 0.9)
            .to(q(".temple-lamps .flame, .temple-lamps .flame-slow"), { autoAlpha: 1, duration: 1.2, stagger: 0.18 }, 1.4)
            .add(drawStrokes(q(".kalasam")[0], { duration: 1.6 }), 1.2);
          petals({ type: "burst", count: 30, y: 0.4, kind: "gold" });
        },
        "top 60%",
      );

      onceInView(q(".details")[0], () => {
        const tl = gsap.timeline({ defaults: { ease: "cine" } });
        tl.to(q(".countdown"), { autoAlpha: 1, y: 0, duration: 1.4 })
          .to(q(".location-card"), { autoAlpha: 1, y: 0, rotateX: 0, duration: 1.6 }, 0.2)
          .to(q(".pin"), { y: 0, autoAlpha: 1, duration: 0.9, ease: "bounce.out" }, 1.1);
      });
    },
    { dependencies: [reducedMotion, finePointer], scope: root },
  );

  return (
    <section ref={root} id="sacred" data-scene aria-labelledby="sacred-title" className="scene temple-stone relative text-ivory">
      {/* Arch reveal — a doorway opening into the temple */}
      <div
        className="arch-mask relative"
        style={
          {
            "--arch": "170%",
            WebkitMaskImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140' preserveAspectRatio='none'><path d='M50 0 C 80 0 100 26 100 56 L100 140 L0 140 L0 56 C 0 26 20 0 50 0 Z' fill='black'/></svg>\")",
            maskImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140' preserveAspectRatio='none'><path d='M50 0 C 80 0 100 26 100 56 L100 140 L0 140 L0 56 C 0 26 20 0 50 0 Z' fill='black'/></svg>\")",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "50% 0%",
            maskPosition: "50% 0%",
            WebkitMaskSize: "var(--arch) var(--arch)",
            maskSize: "var(--arch) var(--arch)",
          } as React.CSSProperties
        }
      >
        <div className="stage relative flex min-h-[100svh] items-center justify-center overflow-hidden pb-[14vh] pt-[16vh]">
          <div className="layer-glow pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_62%,rgba(255,170,70,0.28),transparent_70%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_50%_at_50%_100%,rgba(139,90,43,0.35),transparent_70%)]" aria-hidden />

          <div className="layer-gopuram art-layer pointer-events-none absolute inset-x-0 bottom-[-6vh] flex justify-center md:bottom-[-10vh]" aria-hidden>
            <Gopuram variant="line" strokeWidth={1.4} className="gopuram w-[min(110vw,780px)] max-w-none text-gold/60" />
          </div>

          <div className="layer-bells pointer-events-none absolute inset-x-0 top-0 hidden justify-between px-[6vw] md:flex" aria-hidden>
            <Bell className="h-40 w-auto" delay={0} />
            <Bell className="h-32 w-auto opacity-80" delay={2.1} />
            <Bell className="h-32 w-auto opacity-80" delay={1.2} />
            <Bell className="h-40 w-auto" delay={3.4} />
          </div>

          <div className="temple-lamps pointer-events-none absolute inset-x-0 bottom-[6vh] flex justify-center gap-[34vw] md:gap-[46vw]" aria-hidden>
            <Lamp2D className="h-[16svh] w-auto md:h-[22vh]" />
            <Lamp2D className="h-[16svh] w-auto md:h-[22vh]" />
          </div>

          <div className="layer-copy relative z-10 mx-auto max-w-4xl px-6 py-10 text-center [background:radial-gradient(closest-side,rgba(18,5,7,0.82),rgba(18,5,7,0.55)_60%,transparent)]">
            <Kalasam className="kalasam mx-auto h-16 w-auto text-gold" />
            <p className="rise eyebrow mt-6 text-gold/80">
              The Sacred Moment <span className="mx-2">·</span> <span className="tamil normal-case tracking-normal">முகூர்த்தம்</span>
            </p>
            <h2 id="sacred-title" className="rise display-lg mt-5 gold-text md:whitespace-nowrap">
              At the auspicious hour
            </h2>
            <p className="rise tamil mt-4 text-lg text-champagne/85 md:text-2xl">{ev.tamil}</p>

            <div className="rise mt-10 inline-flex flex-col items-center gap-2 rounded-3xl border border-gold/30 bg-night/40 px-8 py-6 backdrop-blur-sm md:px-12">
              <p className="font-display text-3xl text-gold-light md:text-5xl">{ev.dateLabel}</p>
              <p className="eyebrow text-[0.62rem] text-ivory/60">{ev.weekday}</p>
              <p className="mt-2 font-display text-2xl text-ivory md:text-4xl">{ev.timeLabel}</p>
            </div>

            <p className="rise mt-10 font-display text-2xl text-ivory md:text-3xl">{ev.venue!.name}</p>
            <p className="rise tamil mt-1 text-lg text-gold-light/85">{ev.venue!.tamil}</p>
            <p className="rise mt-1 text-sm text-ivory/60">
              {ev.venue!.city} · {ev.venue!.cityTamil}
            </p>
            <p className="rise mx-auto mt-8 max-w-xl font-display text-lg italic text-champagne/75 md:text-xl">{ev.description}</p>

            <div className="rise mt-9 flex flex-wrap justify-center gap-3">
              <ButtonLink href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer" variant="outline" icon={<IconCalendar />}>
                Add to calendar
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>

      <div className="details relative mx-auto grid max-w-6xl items-start gap-10 px-6 pb-[16vh] pt-6 md:grid-cols-[1.1fr_0.9fr] md:gap-14">
        <div className="countdown">
          <p className="eyebrow text-gold/80">Counting down to the muhurtham</p>
          <p className="tamil mt-1 text-sm text-ivory/60">முகூர்த்தத்திற்கு இன்னும்</p>
          <Countdown target={ev.start} className="mt-6" />
          <p className="mt-5 text-sm text-ivory/55">Times are Indian Standard Time (IST). The countdown is the same wherever you are.</p>
        </div>
        {ev.venue && <LocationCard venue={ev.venue} sacred />}
      </div>

      <p className="sr-only">
        {wedding.couple.display} wedding on {ev.dateLabel}, {ev.timeLabel}, at {ev.venue!.name}, {ev.venue!.city}.
      </p>
      <SceneVeil />
    </section>
  );
}
