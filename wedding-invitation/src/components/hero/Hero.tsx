"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { graphemes } from "@/lib/utils";
import { Kolam } from "@/components/art/Kolam";
import { Gopuram } from "@/components/art/Gopuram";
import { Lamp2D } from "@/components/art/Lamp2D";
import { Flourish } from "@/components/art/Motifs";
import { ScrollIndicator } from "@/components/ui/ScrollIndicator";
import { drawStrokes, showStrokes } from "@/animations/draw";
import { riseIn, unfoldChars } from "@/animations/reveal";
import { SceneVeil } from "@/components/effects/SceneStack";

const LampScene = dynamic(() => import("@/components/three/LampScene"), { ssr: false });

function Name({ text, className }: { text: string; className: string }) {
  return (
    <span className={`${className} inline-flex`} aria-hidden style={{ perspective: 900 }}>
      {graphemes(text).map((ch, i) => (
        <span key={i} className="ch gold-text inline-block will-change-transform" style={{ animationDelay: `${-i * 0.22}s` }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const { ready, setReady, setIntroDone, quality, reducedMotion, pointer } = useExperience();
  const section = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const lit = useRef(0);
  const progress = useRef(0);
  const [active, setActive] = useState(true);
  const [use3D, setUse3D] = useState(false);
  const readyFired = useRef(false);

  const markReady = useCallback(() => {
    if (readyFired.current) return;
    readyFired.current = true;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    (fonts?.ready ?? Promise.resolve()).then(() => setReady());
  }, [setReady]);

  // decide 3D after the quality tier is known on the client
  useEffect(() => {
    const ok = quality !== "low" && !reducedMotion;
    setUse3D(ok);
    if (!ok) markReady();
  }, [quality, reducedMotion, markReady]);

  // Safety: if WebGL never reports, don't hold the curtain forever
  useEffect(() => {
    const t = window.setTimeout(markReady, 6000);
    return () => window.clearTimeout(t);
  }, [markReady]);

  // pause the canvas when the hero is off-screen
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setActive(false); }, { rootMargin: "20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // initial hidden states (JS-only so the page is readable without JS)
  useGSAP(
    () => {
      const q = gsap.utils.selector(sticky);
      gsap.set(q("[data-reveal]"), { autoAlpha: 0 });
    },
    { scope: sticky },
  );

  // ─── Opening title sequence ───
  useGSAP(
    () => {
      if (!ready) return;
      const q = gsap.utils.selector(sticky);

      if (reducedMotion) {
        lit.current = 1;
        gsap.set(q("[data-reveal]"), { autoAlpha: 1 });
        showStrokes(sticky.current);
        setIntroDone();
        return;
      }

      const tl = gsap.timeline({ delay: 1.1, onComplete: setIntroDone });
      tl.fromTo(q(".hero-glow"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 3.2, ease: "power2.inOut" }, 0)
        .fromTo(q(".hero-gopuram"), { autoAlpha: 0, y: 60, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 3.4, ease: "power2.out" }, 0.2)
        .to(lit, { current: 1, duration: 2.4, ease: "power2.inOut" }, 0.7)
        .fromTo(q(".hero-fallback .flame, .hero-fallback .flame-slow"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.6, stagger: 0.15 }, 0.9)
        .fromTo(q(".hero-kolam"), { autoAlpha: 0, scale: 0.82, rotate: -10 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 3.6, ease: "power2.out" }, 1.3)
        .add(drawStrokes(q(".hero-kolam")[0], { duration: 3.2, stagger: 0.004 }), 1.3)
        .add(unfoldChars(q(".name-a .ch"), { stagger: 0.065 }), 2.5)
        .fromTo(q(".amp"), { autoAlpha: 0, scale: 0.3, rotate: -40, filter: "blur(8px)" }, { autoAlpha: 1, scale: 1, rotate: 0, filter: "blur(0px)", duration: 1.3, ease: "back.out(1.6)" }, 3.3)
        .add(unfoldChars(q(".name-b .ch"), { stagger: 0.065 }), 3.55)
        .add(drawStrokes(q(".flourish")[0], { duration: 1.8 }), 4.2)
        .add(drawStrokes(q(".flourish")[1], { duration: 1.8 }), 4.2)
        .fromTo(q(".flourish"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 4.2)
        .add(riseIn(q(".hero-eyebrow")), 4.6)
        .add(riseIn(q(".hero-tagline")), 5.0)
        .add(riseIn(q(".hero-tamil")), 5.6)
        .add(riseIn(q(".hero-meta"), { stagger: 0.14 }), 6.2)
        .add(riseIn(q(".hero-scroll")), 6.7);

      // If the guest scrolls early, hurry the sequence along rather than blocking them
      const hurry = () => tl.timeScale(3.2);
      window.addEventListener("wheel", hurry, { once: true, passive: true });
      window.addEventListener("touchmove", hurry, { once: true, passive: true });
      return () => {
        window.removeEventListener("wheel", hurry);
        window.removeEventListener("touchmove", hurry);
      };
    },
    { dependencies: [ready, reducedMotion], scope: sticky },
  );

  // ─── Scroll choreography: dolly in, names lift away, dawn light sweeps into the next scene ───
  useGSAP(
    () => {
      if (!section.current || reducedMotion) return;
      const q = gsap.utils.selector(sticky);
      ScrollTrigger.create({
        trigger: section.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          progress.current = self.progress;
        },
      });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section.current, start: "top top", end: "bottom bottom", scrub: 0.7 },
        defaults: { ease: "none" },
      });
      tl.to(q(".hero-copy"), { yPercent: -26, scale: 1.05, autoAlpha: 0, duration: 0.5 }, 0)
        .to(q(".hero-scroll"), { autoAlpha: 0, duration: 0.12 }, 0)
        .to(q(".hero-kolam"), { scale: 1.45, rotate: 16, autoAlpha: 0, duration: 0.7 }, 0.05)
        .to(q(".hero-gopuram"), { yPercent: 16, scale: 1.1, autoAlpha: 0.2, duration: 1 }, 0)
        .fromTo(q(".hero-sweep"), { xPercent: -130, autoAlpha: 0 }, { xPercent: 130, autoAlpha: 0.55, duration: 0.45 }, 0.5);

      // the lamp keeps burning beneath the next card until it is fully covered, then rests
      // (resolved on document — selector strings inside this hook are scoped to the hero)
      const nextScene = document.getElementById("couple");
      if (nextScene) {
        ScrollTrigger.create({
          trigger: nextScene,
          start: "top 12%",
          onEnter: () => setActive(false),
          onLeaveBack: () => setActive(true),
        });
      }
    },
    { dependencies: [reducedMotion], scope: section },
  );

  const bride = wedding.couple.bride;
  const groom = wedding.couple.groom;

  return (
    <section ref={section} id="opening" data-scene aria-labelledby="hero-title" className={reducedMotion ? "scene relative h-[100svh]" : "scene relative h-[175svh] md:h-[200vh]"}>
      <div ref={sticky} className="sticky top-0 h-[100svh] overflow-hidden bg-night">
        {/* atmosphere */}
        <div className="hero-glow absolute inset-0 opacity-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_72%,rgba(122,27,46,0.65),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(40%_30%_at_50%_58%,rgba(255,170,70,0.22),transparent_70%)] glow-breathe" />
        </div>

        {/* distant temple */}
        <div className="hero-gopuram art-layer absolute inset-x-0 bottom-[8%] flex justify-center opacity-0" aria-hidden>
          <Gopuram variant="silhouette" className="w-[min(140vw,1100px)] max-w-none opacity-80" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(18,5,7,0.9))]" />
        </div>

        {/* kolam behind the lamp */}
        <div className="hero-kolam art-layer absolute left-1/2 top-[62%] w-[min(120vw,880px)] -translate-x-1/2 -translate-y-1/2 text-gold/45 opacity-0" aria-hidden>
          <Kolam hairline strokeWidth={1.2} className="w-full" />
        </div>

        {/* 3D lamp — or the illustrated fallback on low tiers */}
        {use3D ? (
          <div className="hero-canvas absolute inset-0" aria-hidden>
            <LampScene lit={lit} progress={progress} pointer={pointer} quality={quality} active={active} onReady={markReady} />
          </div>
        ) : (
          <div className="hero-fallback absolute inset-x-0 bottom-[6%] flex justify-center" aria-hidden>
            <Lamp2D className="h-[42svh] w-auto drop-shadow-[0_0_40px_rgba(255,170,70,0.35)]" />
          </div>
        )}

        {/* copy */}
        {/* date + towns live in the top corners (one quiet line on phones) so nothing ever sits on the lamp */}
        <p className="hero-meta eyebrow absolute left-8 top-[clamp(1.75rem,6vh,3.5rem)] hidden text-[0.62rem] text-gold-light/70 md:block lg:left-12" data-reveal>
          {wedding.dates.range}
        </p>
        <p className="hero-meta eyebrow absolute right-8 top-[clamp(1.75rem,6vh,3.5rem)] hidden text-[0.62rem] text-gold-light/70 md:block lg:right-12" data-reveal>
          Palladam · Tirupur
        </p>

        <div className="hero-copy absolute inset-x-0 top-0 flex flex-col items-center px-6 pt-[clamp(2.25rem,7svh,4.5rem)] text-center">
          <h1 id="hero-title" className="sr-only">
            {wedding.couple.display} — Wedding Invitation, {wedding.dates.range}
          </h1>
          <p className="hero-meta eyebrow text-[0.6rem] text-gold-light/65 md:hidden" data-reveal>
            {wedding.dates.range}
          </p>
          <p className="hero-eyebrow eyebrow mt-3 text-gold-light/75 md:mt-0" data-reveal>
            {wedding.invitation.eyebrow}
          </p>

          <div className="mt-[clamp(0.75rem,2.2svh,1.75rem)] flex flex-col items-center gap-0 md:flex-row md:items-baseline md:gap-6">
            <Flourish className="flourish hidden w-32 text-gold/70 md:block lg:w-44" />
            <Name text={bride.name} className="name-a display-xl !text-[clamp(2.75rem,min(11vw,16svh),9.5rem)]" />
            <span className="amp font-display text-[clamp(1.7rem,min(6vw,8svh),5.5rem)] italic leading-none text-gold-light/90" aria-hidden data-reveal>
              &amp;
            </span>
            <Name text={groom.name} className="name-b display-xl !text-[clamp(2.75rem,min(11vw,16svh),9.5rem)]" />
            <Flourish className="flourish hidden w-32 -scale-x-100 text-gold/70 md:block lg:w-44" />
          </div>

          <p className="hero-tagline mt-[clamp(0.75rem,2.4svh,2rem)] font-display text-[clamp(1.05rem,min(2.6vw,2.7svh),2rem)] italic text-champagne/90" data-reveal>
            {wedding.tagline.en}
          </p>
          <p className="hero-tamil tamil mt-[clamp(0.4rem,1svh,0.75rem)] max-w-[20rem] text-[clamp(0.85rem,min(1.6vw,1.9svh),1.2rem)] text-gold-light/75 sm:max-w-2xl" data-reveal>
            {wedding.tagline.ta}
          </p>
        </div>

        <div className="hero-scroll absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-5 flex md:left-10" data-reveal>
          <ScrollIndicator label="Scroll to begin" />
        </div>

        {/* transition layers */}
        <div className="hero-sweep pointer-events-none absolute inset-y-0 left-0 w-[70vw] opacity-0 bg-[linear-gradient(100deg,transparent,rgba(243,228,189,0.22)_42%,rgba(232,207,138,0.5)_50%,rgba(243,228,189,0.22)_58%,transparent)]" aria-hidden />
      </div>
      <SceneVeil />
    </section>
  );
}
