"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { googleCalendarUrl } from "@/lib/calendar";
import { LocationCard } from "./LocationCard";
import { ButtonLink } from "@/components/ui/Button";
import { IconCalendar } from "@/components/ui/Icons";
import { Lamp2D } from "@/components/art/Lamp2D";
import { riseIn } from "@/animations/reveal";
import { onceInView } from "@/animations/scroll";
import { SceneVeil } from "@/components/effects/SceneStack";

/** A string of hanging lamps across the top of the evening */
function StringLights() {
  const n = 15;
  return (
    <svg viewBox="0 0 1200 160" className="pointer-events-none absolute inset-x-0 top-0 h-[120px] w-full md:h-[160px]" aria-hidden preserveAspectRatio="xMidYMin slice">
      <defs>
        <radialGradient id="bulb-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe6a8" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffb257" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff8a1f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M0 10 Q 600 120 1200 10" fill="none" stroke="#8e6a1f" strokeWidth="1.5" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        const u = 1 - t;
        const x = u * u * 0 + 2 * u * t * 600 + t * t * 1200;
        const y = u * u * 10 + 2 * u * t * 120 + t * t * 10;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <g className="sway" style={{ animationDelay: `-${(i % 5) * 0.9}s`, animationDuration: `${5 + (i % 3)}s` }}>
              <path d="M0 0 V 22" stroke="#8e6a1f" strokeWidth="1.2" />
              <circle cy="34" r="18" fill="url(#bulb-glow)" className="bulb" style={{ animationDelay: `${i * 0.21}s` }} />
              <path d="M-5 22 h10 l3 8 h-16 z" fill="#c9a24a" />
              <path d="M0 30 C 5 36 5 44 0 48 C -5 44 -5 36 0 30 Z" fill="#ffd25a" className="flame" style={{ transformOrigin: "0 48px", animationDelay: `${i * 0.13}s` }} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export function Reception() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion } = useExperience();
  const ev = wedding.events.find((e) => e.id === "reception")!;

  useGSAP(
    () => {
      if (reducedMotion) return;
      const q = gsap.utils.selector(root);
      gsap.set(q(".rise"), { autoAlpha: 0, y: 36 });
      gsap.set(q(".location-card"), { autoAlpha: 0, y: 80, rotateX: -18, transformPerspective: 1200 });
      gsap.set(q(".pin"), { y: -60, autoAlpha: 0 });

      onceInView(q(".rc-copy")[0], () => {
        riseIn(q(".rise"), { stagger: 0.1 });
      });
      onceInView(
        q(".location-card")[0],
        () => {
          const tl = gsap.timeline({ defaults: { ease: "cine" } });
          tl.to(q(".location-card"), { autoAlpha: 1, y: 0, rotateX: 0, duration: 1.6 }).to(q(".pin"), { y: 0, autoAlpha: 1, duration: 0.9, ease: "bounce.out" }, 0.9);
        },
        "top 75%",
      );

      gsap.fromTo(q(".rc-lamps"), { yPercent: 20 }, { yPercent: -10, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 1 } });
    },
    { dependencies: [reducedMotion], scope: root },
  );

  return (
    <section ref={root} id="reception" data-scene aria-labelledby="reception-title" className="scene relative bg-[linear-gradient(180deg,#120507_0%,#2a0b12_28%,#3a0a12_60%,#1a0709_100%)] pb-[16vh] pt-[18vh] text-ivory">
      <StringLights />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_100%,rgba(184,85,47,0.22),transparent_70%)]" aria-hidden />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
        <div className="rc-copy">
          <p className="rise eyebrow text-gold/80">
            The Evening <span className="mx-2">·</span> <span className="tamil normal-case tracking-normal">{ev.tamil}</span>
          </p>
          <h2 id="reception-title" className="rise display-lg mt-5 gold-text">
            An evening of lamps &amp; laughter
          </h2>
          <p className="rise mt-5 max-w-lg font-display text-xl italic text-champagne/85 md:text-2xl">{ev.description}</p>

          <dl className="rise mt-9 grid grid-cols-2 gap-6 border-t border-gold/25 pt-7">
            <div>
              <dt className="eyebrow text-[0.6rem] text-ivory/55">Date</dt>
              <dd className="mt-2 font-display text-2xl text-gold-light md:text-3xl">{ev.dateLabel}</dd>
              <dd className="text-sm text-ivory/60">{ev.weekday}</dd>
            </div>
            <div>
              <dt className="eyebrow text-[0.6rem] text-ivory/55">Time</dt>
              <dd className="mt-2 font-display text-2xl text-gold-light md:text-3xl">{ev.timeLabel}</dd>
              <dd className="text-sm text-ivory/60">Dinner follows</dd>
            </div>
          </dl>

          <div className="rise mt-9 flex flex-wrap gap-3">
            <ButtonLink href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer" variant="outline" icon={<IconCalendar />}>
              Add to calendar
            </ButtonLink>
          </div>
        </div>

        {ev.venue && <LocationCard venue={ev.venue} />}
      </div>

      <div className="rc-lamps pointer-events-none absolute -bottom-6 left-0 hidden w-full justify-between px-[4vw] opacity-70 md:flex" aria-hidden>
        <Lamp2D className="h-44 w-auto" />
        <Lamp2D className="h-44 w-auto" />
      </div>
      <SceneVeil />
    </section>
  );
}
