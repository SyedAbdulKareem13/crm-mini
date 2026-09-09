"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding, type WeddingEvent } from "@/data/wedding";
import { downloadIcs, googleCalendarUrl, mapsSearchUrl } from "@/lib/calendar";
import { RingsMotif, LampMotif, TempleMotif, Divider } from "@/components/art/Motifs";
import { ButtonLink, Button } from "@/components/ui/Button";
import { IconCalendar, IconExternal, IconPin } from "@/components/ui/Icons";
import { drawStrokes, prepareDraw, showStrokes } from "@/animations/draw";
import { onceInView } from "@/animations/scroll";
import { petals } from "@/components/effects/Petals";
import { cn } from "@/lib/utils";

const MOTIF = { ring: RingsMotif, lamp: LampMotif, temple: TempleMotif } as const;

function EventCard({ ev, index }: { ev: WeddingEvent; index: number }) {
  const Motif = MOTIF[ev.motif];
  const right = index % 2 === 1;
  return (
    <li className={cn("event relative grid items-center gap-6 md:grid-cols-[1fr_120px_1fr]", "pl-[58px] md:pl-0")}>
      {/* medallion on the thread */}
      <div className={cn("node absolute left-[20px] top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:col-start-2 md:translate-x-0 md:translate-y-0 md:justify-self-center")}>
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gold/60 bg-ivory shadow-[0_18px_40px_-20px_rgba(42,26,20,0.6)] md:h-24 md:w-24">
          <span className="node-ring absolute inset-0 rounded-full border border-gold/60 opacity-0" />
          <span className="node-ring absolute inset-0 rounded-full border border-gold/50 opacity-0" style={{ animationDelay: "0.9s" }} />
          <Motif className="motif h-9 w-9 text-gold-deep md:h-16 md:w-16" />
        </div>
      </div>

      <article
        className={cn(
          "event-card glass-card rounded-[28px] p-5 sm:p-6 md:p-9",
          right ? "md:col-start-3" : "md:col-start-1 md:row-start-1",
        )}
      >
        <p className="eyebrow text-gold-deep">
          {ev.weekday} <span className="mx-2 text-gold">·</span> {ev.dateLabel}
        </p>
        <h3 className="display-md mt-3 text-maroon">
          {ev.title}
          {ev.subtitle && <span className="ml-3 font-display text-[0.55em] italic text-ink-soft">{ev.subtitle}</span>}
        </h3>
        <p className="tamil mt-1 text-lg text-maroon/75">{ev.tamil}</p>

        <p className="mt-5 font-display text-2xl text-ink md:text-3xl">{ev.timeLabel}</p>
        <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-ink-soft">{ev.description}</p>

        <div className="mt-5 flex items-start gap-3 text-ink">
          <IconPin className="mt-0.5 shrink-0 text-xl text-maroon" />
          {ev.venue ? (
            <div>
              <p className="font-medium">
                {ev.venue.name}, {ev.venue.city}
              </p>
              {ev.venue.tamil && (
                <p className="tamil text-sm text-ink-soft">
                  {ev.venue.tamil}
                  {ev.venue.cityTamil ? `, ${ev.venue.cityTamil}` : ""}
                </p>
              )}
            </div>
          ) : (
            <p className="italic text-ink-soft">Venue to be announced</p>
          )}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer" variant="outline-dark" icon={<IconCalendar />}>
            Add to calendar
          </ButtonLink>
          <Button variant="outline-dark" onClick={() => downloadIcs(ev)} aria-label={`Download ${ev.title} as .ics`}>
            .ics
          </Button>
          {ev.venue && (
            <ButtonLink href={mapsSearchUrl(ev.venue.mapsQuery)} target="_blank" rel="noopener noreferrer" variant="gold" icon={<IconExternal />}>
              Open in Maps
            </ButtonLink>
          )}
        </div>
      </article>
    </li>
  );
}

/**
 * The Celebration — a golden thread draws itself down the page with the scroll;
 * each moment it reaches becomes a ring, a lamp, a temple.
 */
export function Timeline() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion } = useExperience();

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) {
        showStrokes(root.current);
        return;
      }
      gsap.set(q(".head-rise"), { autoAlpha: 0, y: 30 });
      gsap.set(q(".event-card"), { autoAlpha: 0, y: 60, clipPath: "inset(0 0 100% 0 round 28px)" });
      gsap.set(q(".node"), { autoAlpha: 0, scale: 0.5 });
      prepareDraw(root.current);

      onceInView(q(".tl-head")[0], () => {
        gsap.to(q(".head-rise"), { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12 });
        drawStrokes(q(".head-divider")[0], { duration: 1.4, delay: 0.4 });
        petals({ type: "burst", count: 40, y: 0.3 });
      });

      // thread draws with scroll
      const thread = q<SVGPathElement>(".thread-path")[0];
      if (thread) {
        const len = thread.getTotalLength();
        gsap.set(thread, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(thread, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: { trigger: q(".track")[0], start: "top 60%", end: "bottom 65%", scrub: 0.6 },
        });
      }

      q(".event").forEach((el) => {
        onceInView(
          el,
          () => {
            const tl = gsap.timeline({ defaults: { ease: "cine" } });
            tl.to(el.querySelector(".node"), { autoAlpha: 1, scale: 1, duration: 1, ease: "back.out(1.8)" })
              .add(drawStrokes(el.querySelector(".motif"), { duration: 1.6, stagger: 0.08 }), 0.25)
              .fromTo(el.querySelectorAll(".node-ring"), { scale: 0.7, autoAlpha: 0.9 }, { scale: 1.9, autoAlpha: 0, duration: 1.8, stagger: 0.35, ease: "power2.out" }, 0.4)
              .to(el.querySelector(".event-card"), { autoAlpha: 1, y: 0, clipPath: "inset(0 0 0% 0 round 28px)", duration: 1.5 }, 0.35);
          },
          "top 68%",
        );
      });
    },
    { dependencies: [reducedMotion], scope: root },
  );

  return (
    <section ref={root} id="celebration" data-scene aria-labelledby="celebration-title" className="silk-ivory pulli relative overflow-hidden py-[16vh] text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-[#120507] to-transparent opacity-60" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6">
        <header className="tl-head text-center">
          <p className="head-rise eyebrow text-maroon/80">
            The Celebration <span className="mx-2 text-gold">·</span> <span className="tamil normal-case tracking-normal">விழா</span>
          </p>
          <h2 id="celebration-title" className="head-rise display-lg mt-5 text-maroon">
            Two days. Three moments.
          </h2>
          <p className="head-rise mt-4 font-display text-xl italic text-ink-soft md:text-2xl">Come and be part of every one of them.</p>
          <Divider className="head-divider mx-auto mt-8 w-64 text-gold" />
        </header>

        <div className="track relative mt-20 md:mt-28">
          {/* golden thread */}
          <svg className="pointer-events-none absolute inset-y-0 left-[20px] h-full w-[2px] -translate-x-1/2 overflow-visible md:left-1/2" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden>
            <path d="M1 0 V 100" stroke="rgba(142,106,31,0.18)" strokeWidth="2" vectorEffect="non-scaling-stroke" fill="none" />
            <path className="thread-path" d="M1 0 V 100" stroke="url(#thread-grad)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" fill="none" strokeLinecap="round" />
            <defs>
              <linearGradient id="thread-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8e6a1f" />
                <stop offset="0.5" stopColor="#e8cf8a" />
                <stop offset="1" stopColor="#c9a24a" />
              </linearGradient>
            </defs>
          </svg>

          <ol className="relative flex flex-col gap-20 md:gap-32">
            {wedding.events.map((ev, i) => (
              <EventCard key={ev.id} ev={ev} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
