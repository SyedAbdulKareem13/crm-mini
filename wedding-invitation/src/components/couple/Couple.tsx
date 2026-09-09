"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { gsap, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { words } from "@/lib/utils";
import { Thoranam } from "@/components/art/Thoranam";
import { Kolam } from "@/components/art/Kolam";
import { ArchFrame } from "@/components/art/ArchFrame";
import { PeacockFeather } from "@/components/art/Peacock";
import { JasmineStrand } from "@/components/art/Jasmine";
import { Divider } from "@/components/art/Motifs";
import { drawStrokes, prepareDraw, showStrokes } from "@/animations/draw";
import { riseIn, unfoldChars } from "@/animations/reveal";
import { onceInView } from "@/animations/scroll";
import { SceneVeil } from "@/components/effects/SceneStack";

interface Person {
  name: string;
  tamil: string;
  initial: string;
  parents: string;
  photo: string;
}

function Panel({ person, side, label, ta }: { person: Person; side: "left" | "right"; label: string; ta: string }) {
  const { finePointer, reducedMotion } = useExperience();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), { stiffness: 120, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-11, 11]), { stiffness: 120, damping: 18 });
  const tilt = finePointer && !reducedMotion;

  return (
    <article className={`couple-panel relative mx-auto w-full max-w-[22rem] md:max-w-[24rem] panel-${side}`} style={{ perspective: 1400 }}>
      <motion.div
        className="relative"
        style={tilt ? { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" } : undefined}
        onPointerMove={(e) => {
          if (!tilt) return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => {
          mx.set(0);
          my.set(0);
        }}
      >
        <PeacockFeather
          className={`feather pointer-events-none absolute -top-10 h-64 w-auto opacity-0 ${side === "left" ? "-left-14 -rotate-[22deg]" : "-right-14 rotate-[22deg] -scale-x-100"}`}
        />
        <ArchFrame monogram={person.initial} photo={person.photo || undefined} figure={side === "left" ? "bride" : "groom"} alt={person.name} className="arch relative w-full drop-shadow-[0_36px_50px_rgba(42,26,20,0.28)]" />
      </motion.div>

      <div className="mt-8 text-center">
        <p className="panel-copy eyebrow text-gold-deep">
          {label} <span className="mx-2 text-gold">·</span> <span className="tamil normal-case tracking-normal">{ta}</span>
        </p>
        <h3 className="panel-copy display-md mt-3 text-maroon">{person.name}</h3>
        <p className="panel-copy tamil mt-1 text-xl text-maroon/75">{person.tamil}</p>
        {person.parents && <p className="panel-copy mt-3 text-sm text-ink-soft">{person.parents}</p>}
      </div>
    </article>
  );
}

export function Couple() {
  const root = useRef<HTMLElement>(null);
  const { reducedMotion } = useExperience();

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (reducedMotion) {
        showStrokes(root.current);
        gsap.set(q(".feather"), { autoAlpha: 0.75 });
        return;
      }
      gsap.set(q(".head-rise, .panel-copy, .closing"), { autoAlpha: 0, y: 30 });
      gsap.set(q(".head-word"), { autoAlpha: 0 });
      gsap.set(q(".arch"), { autoAlpha: 0 });
      gsap.set(q(".strand"), { clipPath: "inset(0 0 100% 0)" });
      prepareDraw(root.current);

      onceInView(q(".couple-head")[0], () => {
        const tl = gsap.timeline();
        tl.to(q(".head-rise"), { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12 })
          .add(unfoldChars(q(".head-word"), { stagger: 0.09, duration: 1.2 }), 0.3)
          .add(drawStrokes(q(".head-divider")[0], { duration: 1.4 }), 0.9);
      });

      onceInView(q(".couple-grid")[0], () => {
        const tl = gsap.timeline({ defaults: { ease: "cine" } });
        tl.fromTo(q(".panel-left .arch"), { autoAlpha: 0, x: -90, rotateY: 28 }, { autoAlpha: 1, x: 0, rotateY: 0, duration: 1.9, ease: "expo.out" }, 0)
          .fromTo(q(".panel-right .arch"), { autoAlpha: 0, x: 90, rotateY: -28 }, { autoAlpha: 1, x: 0, rotateY: 0, duration: 1.9, ease: "expo.out" }, 0.15)
          .add(drawStrokes(q(".panel-left .arch")[0], { duration: 2.2, stagger: 0.05 }), 0.5)
          .add(drawStrokes(q(".panel-right .arch")[0], { duration: 2.2, stagger: 0.05 }), 0.65)
          .fromTo(q("[data-figure]"), { autoAlpha: 0, y: 26, transformOrigin: "50% 100%" }, { autoAlpha: 1, y: 0, duration: 1.8, ease: "expo.out", stagger: 0.15 }, 0.7)
          .fromTo(q("[data-monogram]"), { scale: 0.6, autoAlpha: 0, transformOrigin: "50% 50%" }, { scale: 1, autoAlpha: 1, duration: 1.4, ease: "back.out(1.4)", stagger: 0.15 }, 1.3)
          .to(q(".feather"), { autoAlpha: 0.8, duration: 1.6, stagger: 0.2 }, 1.2)
          .to(q(".strand"), { clipPath: "inset(0 0 0% 0)", duration: 2.2, ease: "power2.inOut" }, 0.6)
          .to(q(".panel-copy"), { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 1.4);
      }, "top 70%");

      onceInView(q(".closing")[0], () => {
        gsap.to(q(".closing"), { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.15 });
      });

      // background kolam slowly turns with the scroll
      gsap.to(q(".bg-kolam"), {
        rotate: 40,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 1.2 },
      });
      gsap.fromTo(q(".couple-thoranam"), { yPercent: -18 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 1 } });
    },
    { dependencies: [reducedMotion], scope: root },
  );

  const headline = words("We joyfully invite you to celebrate the union of");

  return (
    <section ref={root} id="couple" data-scene aria-labelledby="couple-title" className="scene silk-ivory relative pb-[16vh] pt-[22vh] text-ink md:pt-[26vh]">
      <Thoranam className="couple-thoranam pointer-events-none absolute -top-1 left-0 h-[120px] w-full md:h-[170px]" />
      <Kolam hairline strokeWidth={1} className="bg-kolam art-layer pointer-events-none absolute -bottom-[38vw] left-1/2 w-[120vw] -translate-x-1/2 text-gold/25 md:-bottom-[22vw] md:w-[60vw]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <header className="couple-head text-center">
          <p className="head-rise eyebrow text-maroon/80">{wedding.invitation.eyebrow}</p>
          <p className="head-rise tamil mt-2 text-sm text-maroon/65">{wedding.invitation.eyebrowTamil}</p>
          <h2 id="couple-title" className="display-lg mx-auto mt-8 max-w-4xl text-maroon" style={{ perspective: 800, textWrap: "balance" }}>
            {headline.map((w, i) => (
              <span key={i} className="head-word inline-block will-change-transform">
                {w}
                {i < headline.length - 1 ? " " : ""}
              </span>
            ))}
          </h2>
          <Divider className="head-divider mx-auto mt-9 w-64 text-gold" />
        </header>

        <div className="couple-grid mt-16 grid items-start gap-14 md:mt-24 md:grid-cols-[1fr_auto_1fr] md:gap-10 lg:gap-16">
          <Panel person={wedding.couple.bride} side="left" label="The Bride" ta="மணமகள்" />
          <div className="hidden flex-col items-center justify-start pt-6 md:flex" aria-hidden>
            <JasmineStrand className="strand h-[440px] w-14" count={11} />
            <span className="mt-4 font-display text-4xl italic text-gold">&amp;</span>
          </div>
          <Panel person={wedding.couple.groom} side="right" label="The Groom" ta="மணமகன்" />
        </div>

        <div className="mt-20 text-center md:mt-28">
          <p className="closing font-display text-2xl italic text-maroon/85 md:text-3xl">“{wedding.quotes.union.en}”</p>
          <p className="closing tamil mt-4 text-base text-maroon/70 md:text-lg">{wedding.quotes.union.ta}</p>
        </div>
      </div>
      <SceneVeil />
    </section>
  );
}
