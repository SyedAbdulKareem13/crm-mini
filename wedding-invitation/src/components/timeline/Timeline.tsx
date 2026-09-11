"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding, type Tone, type WeddingEvent } from "@/data/wedding";
import { downloadIcs, googleCalendarUrl, mapsSearchUrl } from "@/lib/calendar";
import { RingsMotif, LampMotif, TempleMotif, Divider } from "@/components/art/Motifs";
import { ButtonLink, Button } from "@/components/ui/Button";
import { IconCalendar, IconExternal, IconPin } from "@/components/ui/Icons";
import { drawStrokes, prepareDraw, showStrokes } from "@/animations/draw";
import { onceInView } from "@/animations/scroll";
import { petals } from "@/components/effects/Petals";
import { SceneVeil } from "@/components/effects/SceneStack";
import { cn } from "@/lib/utils";

const MOTIF = { ring: RingsMotif, lamp: LampMotif, temple: TempleMotif } as const;

const TONE: Record<Tone, { label: string; ta: string; icon: React.ReactNode }> = {
  morning: {
    label: "Morning",
    ta: "காலை",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
      </svg>
    ),
  },
  evening: {
    label: "Evening",
    ta: "மாலை",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        <path d="M5 3.5v2M4 4.5h2" opacity=".7" />
      </svg>
    ),
  },
  dawn: {
    label: "Dawn",
    ta: "விடியல்",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d="M4 16h16M7 16a5 5 0 0 1 10 0" />
        <path d="M12 6v2M6 9.5l1.4 1.4M18 9.5l-1.4 1.4M2.5 19.5h19" opacity=".8" />
      </svg>
    ),
  },
};

function DayMarker({ day }: { day: (typeof wedding.days)[number] }) {
  return (
    <li className="day-marker relative flex items-center pl-[58px] md:justify-center md:pl-0" aria-label={`${day.label}, ${day.dateLabel}`}>
      {/* on phones the thread runs down the left; the diamond sits on it */}
      <span className="thread-anchor absolute left-[20px] h-3 w-3 -translate-x-1/2 rotate-45 border border-gold bg-ivory md:hidden" aria-hidden />
      <div className="thread-anchor-md day-pill inline-flex items-center gap-3 rounded-full border border-gold/50 bg-ivory px-5 py-2.5 shadow-[0_18px_40px_-24px_rgba(42,26,20,0.6)]">
        <span className="eyebrow text-[0.7rem] tracking-[0.16em] text-maroon md:tracking-[0.34em]">{day.label}</span>
        <span className="h-3 w-px bg-gold/50" aria-hidden />
        <span className="font-display text-base text-ink md:text-lg">{day.dateLabel}</span>
        <span className="tamil hidden text-xs text-maroon/70 sm:inline">{day.tamil}</span>
      </div>
    </li>
  );
}

function EventCard({ ev, index }: { ev: WeddingEvent; index: number }) {
  const Motif = MOTIF[ev.motif];
  const right = index % 2 === 1;
  const tone = TONE[ev.tone];
  return (
    <li className={cn("event relative grid items-center gap-6 md:grid-cols-[1fr_120px_1fr]", "pl-[58px] md:pl-0")}>
      {/* medallion on the thread */}
      <div className="node absolute left-[20px] top-1/2 -translate-x-1/2 -translate-y-1/2 md:static md:col-start-2 md:translate-x-0 md:translate-y-0 md:justify-self-center">
        <div className="medallion thread-anchor relative flex h-14 w-14 items-center justify-center rounded-full border border-gold/60 bg-ivory shadow-[0_18px_40px_-20px_rgba(42,26,20,0.6)] md:h-24 md:w-24">
          <span className="node-ring absolute inset-0 rounded-full border border-gold/60 opacity-0" />
          <span className="node-ring absolute inset-0 rounded-full border border-gold/50 opacity-0" style={{ animationDelay: "0.9s" }} />
          <Motif className="motif h-9 w-9 text-gold-deep md:h-16 md:w-16" />
        </div>
      </div>

      <article className={cn("event-card glass-card relative overflow-hidden rounded-[30px] p-5 sm:p-6 md:p-9", right ? "md:col-start-3" : "md:col-start-1 md:row-start-1")}>
        <Motif className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 text-gold-deep/[0.07] md:h-64 md:w-64" />
        <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-gold/70 to-transparent" aria-hidden />

        <div className="relative flex flex-wrap items-center gap-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] sm:text-[0.62rem] sm:tracking-[0.18em]", `tone-${ev.tone}`)}>
            {tone.icon}
            {tone.label}
            <span className="tamil ml-1 text-[1.15em] normal-case tracking-normal opacity-90">{tone.ta}</span>
          </span>
          <p className="eyebrow text-gold-deep">
            {ev.weekday} <span className="mx-1.5 text-gold">·</span> {ev.dateLabel}
          </p>
        </div>

        <h3 className="display-md relative mt-4 text-maroon">
          {ev.title}
          {ev.subtitle && <span className="ml-3 font-display text-[0.55em] italic text-ink-soft">{ev.subtitle}</span>}
        </h3>
        <p className="tamil relative mt-1 text-lg text-maroon/75">{ev.tamil}</p>

        <p className="relative mt-5 font-display text-[1.55rem] leading-tight text-ink sm:text-3xl md:text-4xl">{ev.timeLabel}</p>
        <p className="relative mt-3 max-w-prose text-[0.95rem] leading-relaxed text-ink-soft">{ev.description}</p>

        <ul className="relative mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Moments">
          {ev.moments.map((m) => (
            <li key={m} className="flex items-start gap-2 text-sm text-ink">
              <span className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" aria-hidden />
              {m}
            </li>
          ))}
        </ul>

        <div className="relative mt-6 flex items-start gap-3 border-t border-gold/25 pt-5 text-ink">
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

        <div className="relative mt-6 grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
          {ev.venue && (
            <ButtonLink href={mapsSearchUrl(ev.venue.mapsQuery)} target="_blank" rel="noopener noreferrer" variant="gold" icon={<IconExternal />} className="w-full sm:w-auto">
              Open in Maps
            </ButtonLink>
          )}
          <ButtonLink href={googleCalendarUrl(ev)} target="_blank" rel="noopener noreferrer" variant="outline-dark" icon={<IconCalendar />} className="w-full sm:w-auto">
            Add to calendar
          </ButtonLink>
          <Button variant="outline-dark" onClick={() => downloadIcs(ev)} aria-label={`Download ${ev.title} as .ics`} className="w-full justify-center sm:w-auto">
            Save .ics
          </Button>
        </div>
      </article>
    </li>
  );
}

/**
 * The Celebration — a golden thread winds down through two days of ceremony,
 * drawing itself as you scroll with a lamp-light bead at its tip. Each moment
 * it reaches becomes a ring, a lamp, a temple.
 */
export function Timeline() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { reducedMotion, finePointer } = useExperience();

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const trackEl = track.current;
      if (!trackEl) return;

      const path = q<SVGPathElement>(".thread-path")[0];
      const ghost = q<SVGPathElement>(".thread-ghost")[0];
      const bead = q<HTMLElement>(".thread-bead")[0];

      /** Serpentine cubic path through every anchor (day pills + medallions) */
      const buildPath = () => {
        const tr = trackEl.getBoundingClientRect();
        const anchors = Array.from(trackEl.querySelectorAll<HTMLElement>(".thread-anchor, .thread-anchor-md"))
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0)
          // on md+ only the pills count as anchors; on phones only the diamonds
          .filter((r) => (window.innerWidth >= 768 ? true : r.width < 40))
          .map((r) => ({ x: r.left + r.width / 2 - tr.left, y: r.top + r.height / 2 - tr.top }))
          .sort((a, b) => a.y - b.y);
        if (!anchors.length) return;
        const desk = window.innerWidth >= 768;
        const pts = [{ x: anchors[0].x, y: 0 }, ...anchors, { x: anchors[anchors.length - 1].x, y: tr.height }];
        let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          const dy = b.y - a.y;
          const amp = Math.min(desk ? 110 : 14, dy * 0.3) * (i % 2 ? -1 : 1);
          d += ` C ${(a.x + amp).toFixed(1)} ${(a.y + dy * 0.5).toFixed(1)} ${(b.x + amp).toFixed(1)} ${(b.y - dy * 0.5).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        }
        const svg = path.ownerSVGElement!;
        svg.setAttribute("viewBox", `0 0 ${tr.width} ${tr.height}`);
        path.setAttribute("d", d);
        ghost.setAttribute("d", d);
        const len = path.getTotalLength();
        path.style.strokeDasharray = `${len}`;
        return len;
      };

      let len = buildPath() ?? 0;
      const progress = { p: 0 };
      const paint = () => {
        if (!len) return;
        path.style.strokeDashoffset = `${len * (1 - progress.p)}`;
        if (bead) {
          const pt = path.getPointAtLength(len * progress.p);
          bead.style.transform = `translate(${pt.x - 7}px, ${pt.y - 7}px)`;
          bead.style.opacity = progress.p > 0.005 && progress.p < 0.995 ? "1" : "0";
        }
      };
      paint();

      let lastH = trackEl.offsetHeight, roTimer = 0;
      const ro = new ResizeObserver(() => {
        window.clearTimeout(roTimer);
        roTimer = window.setTimeout(() => {
          len = buildPath() ?? len;
          paint();
          const h = trackEl.offsetHeight;
          if (Math.abs(h - lastH) > 2) {
            lastH = h;
            ScrollTrigger.refresh();
          }
        }, 160);
      });
      ro.observe(trackEl);

      if (reducedMotion) {
        progress.p = 1;
        paint();
        showStrokes(root.current);
        return () => ro.disconnect();
      }

      gsap.set(q(".head-rise"), { autoAlpha: 0, y: 30 });
      gsap.set(q(".event-card"), { autoAlpha: 0, y: 70, scale: 0.98 });
      gsap.set(q(".node"), { autoAlpha: 0, scale: 0.5 });
      gsap.set(q(".day-pill"), { autoAlpha: 0, y: 20 });
      prepareDraw(root.current);

      onceInView(q(".tl-head")[0], () => {
        gsap.to(q(".head-rise"), { autoAlpha: 1, y: 0, duration: 1.6, ease: "expo.out", stagger: 0.12 });
        drawStrokes(q(".head-divider")[0], { duration: 1.4, delay: 0.4 });
        petals({ type: "burst", count: 34, y: 0.3 });
      });

      gsap.to(progress, {
        p: 1,
        ease: "none",
        onUpdate: paint,
        scrollTrigger: { trigger: trackEl, start: "top 62%", end: "bottom 62%", scrub: 1 },
      });

      q(".day-marker").forEach((el) => {
        onceInView(el, () => gsap.to(el.querySelector(".day-pill"), { autoAlpha: 1, y: 0, duration: 1.4, ease: "expo.out" }), "top 74%");
      });

      q(".event").forEach((el) => {
        onceInView(
          el,
          () => {
            const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
            tl.to(el.querySelector(".node"), { autoAlpha: 1, scale: 1, duration: 1.2, ease: "back.out(1.6)" })
              .add(drawStrokes(el.querySelector(".motif"), { duration: 1.6, stagger: 0.08 }), 0.25)
              .fromTo(el.querySelectorAll(".node-ring"), { scale: 0.7, autoAlpha: 0.9 }, { scale: 1.9, autoAlpha: 0, duration: 1.8, stagger: 0.35, ease: "power2.out" }, 0.4)
              .to(el.querySelector(".event-card"), { autoAlpha: 1, y: 0, scale: 1, duration: 1.7 }, 0.3);
          },
          "top 70%",
        );
      });

      return () => {
        window.clearTimeout(roTimer);
        ro.disconnect();
      };
    },
    { dependencies: [reducedMotion, finePointer], scope: root },
  );

  const [day1, day2] = wedding.days;
  const dayOne = wedding.events.filter((e) => e.day === 1);
  const dayTwo = wedding.events.filter((e) => e.day === 2);

  return (
    <section ref={root} id="celebration" data-scene aria-labelledby="celebration-title" className="scene silk-ivory pulli relative pt-[16vh] pb-[38vh] text-ink md:py-[16vh]">
      <div className="relative mx-auto max-w-6xl px-6">
        <header className="tl-head text-center">
          <p className="head-rise eyebrow text-maroon/80">
            The Celebration <span className="mx-2 text-gold">·</span> <span className="tamil normal-case tracking-normal">விழா</span>
          </p>
          <h2 id="celebration-title" className="head-rise display-lg mt-5 text-maroon">
            Two days. Three moments.
          </h2>
          <p className="head-rise mt-4 font-display text-xl italic text-ink-soft md:text-2xl">Follow the thread — every moment is yours to share.</p>
          <Divider className="head-divider mx-auto mt-8 w-64 text-gold" />
        </header>

        <div ref={track} className="track relative mt-20 md:mt-28">
          {/* golden thread */}
          <svg className="art-layer pointer-events-none absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="thread-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#8e6a1f" />
                <stop offset="0.5" stopColor="#e8cf8a" />
                <stop offset="1" stopColor="#c9a24a" />
              </linearGradient>
            </defs>
            <path className="thread-ghost" d="M0 0" fill="none" stroke="rgba(142,106,31,0.16)" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
            <path className="thread-path" d="M0 0" fill="none" stroke="url(#thread-grad)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div className="thread-bead pointer-events-none absolute left-0 top-0 opacity-0" aria-hidden />

          <ol className="relative flex flex-col gap-16 md:gap-24">
            <DayMarker day={day1} />
            {dayOne.map((ev) => (
              <EventCard key={ev.id} ev={ev} index={wedding.events.indexOf(ev)} />
            ))}
            <DayMarker day={day2} />
            {dayTwo.map((ev) => (
              <EventCard key={ev.id} ev={ev} index={wedding.events.indexOf(ev)} />
            ))}
          </ol>
        </div>
      </div>
      <SceneVeil />
    </section>
  );
}
