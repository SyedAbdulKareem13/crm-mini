"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Parts {
  d: number;
  h: number;
  m: number;
  s: number;
  done: boolean;
}

function parts(target: number): Parts {
  const diff = target - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const s = Math.floor(diff / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: false };
}

function Digit({ value }: { value: string }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-top">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: "-100%", opacity: 0, rotateX: 40 }}
          animate={{ y: "0%", opacity: 1, rotateX: 0 }}
          exit={{ y: "100%", opacity: 0, rotateX: -40 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 flex items-start justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Unit({ value, label, ta }: { value: number; label: string; ta: string }) {
  const str = String(value).padStart(2, "0");
  return (
    <div className="glass-dark flex min-w-[4.6rem] flex-1 flex-col items-center rounded-2xl px-3 py-4 md:min-w-[6rem] md:py-6">
      <div className="font-display text-[clamp(2.2rem,6vw,4.2rem)] leading-none text-gold-light tabular-nums" aria-hidden>
        {str.split("").map((ch, i) => (
          <Digit key={i} value={ch} />
        ))}
      </div>
      <span className="sr-only">
        {value} {label}
      </span>
      <p className="eyebrow mt-3 text-[0.58rem] text-ivory/60">{label}</p>
      <p className="tamil text-[0.7rem] text-gold/70">{ta}</p>
    </div>
  );
}

/** Live countdown to the muhurtham (IST-anchored ISO target, identical for every guest). */
export function Countdown({ target, className }: { target: string; className?: string }) {
  const [t, setT] = useState<Parts | null>(null);
  useEffect(() => {
    const ts = new Date(target).getTime();
    const tick = () => setT(parts(ts));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (t?.done) {
    return (
      <div className={cn("glass-dark rounded-3xl p-8 text-center", className)}>
        <p className="font-display text-3xl text-gold-light md:text-4xl">The sacred knot is tied</p>
        <p className="tamil mt-3 text-lg text-champagne/85">வாழ்க வளமுடன் · நூறாண்டு வாழ்க</p>
      </div>
    );
  }

  return (
    <div className={className} role="timer" aria-live="off" aria-label="Countdown to the muhurtham">
      <div className="grid grid-cols-4 gap-2 md:gap-3">
        <Unit value={t?.d ?? 0} label="Days" ta="நாட்கள்" />
        <Unit value={t?.h ?? 0} label="Hours" ta="மணி" />
        <Unit value={t?.m ?? 0} label="Minutes" ta="நிமிடம்" />
        <Unit value={t?.s ?? 0} label="Seconds" ta="வினாடி" />
      </div>
    </div>
  );
}
