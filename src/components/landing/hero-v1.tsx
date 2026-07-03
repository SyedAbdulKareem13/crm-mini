"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Target,
  Trophy,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency } from "@/lib/utils";

/**
 * Premium v1 hero — aurora backdrop, word-by-word headline reveal, sheen CTA,
 * floating glass chips, count-up live metrics and a pointer-tilting animated
 * dashboard preview. CSS-driven (mzh-* keyframes in globals.css), transform/
 * opacity only, fully reduced-motion aware.
 */

export type HeroStat = { label: string; value: number; kind: "currency" | "number" };

/* ------------------------------ hooks ------------------------------ */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = React.useRef<T>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, inView];
}

function useCountUp(target: number, start: boolean, reduced: boolean, durationMs = 1400): number {
  const [value, setValue] = React.useState(0);
  React.useEffect(() => {
    if (!start) return;
    if (reduced || target === 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, reduced, durationMs]);
  return value;
}

/* --------------------------- word reveal --------------------------- */

function WordReveal({
  text,
  startDelay = 0,
  className,
}: {
  text: string;
  startDelay?: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="mzh-word"
          style={{ animationDelay: `${startDelay + i * 70}ms` }}
        >
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/* -------------------------- floating chips ------------------------- */

const FLOAT_CHIPS = [
  { label: "Lead qualified", icon: Sparkles, pos: "left-[4%] top-[16%]", tilt: "-6deg", delay: "0s" },
  { label: "Quote sent · ₹96L", icon: Receipt, pos: "right-[5%] top-[24%]", tilt: "5deg", delay: "1.2s" },
  { label: "Deal WON", icon: Trophy, pos: "left-[8%] bottom-[6%]", tilt: "4deg", delay: "2.1s" },
  { label: "Forecast +22%", icon: TrendingUp, pos: "right-[7%] bottom-[12%]", tilt: "-4deg", delay: "0.7s" },
];

function FloatingChips() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
      {FLOAT_CHIPS.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className={`mzh-float absolute ${c.pos} flex items-center gap-2 rounded-2xl border border-border/70 bg-card/75 px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur-sm`}
            style={{ ["--mzh-tilt" as string]: c.tilt, animationDelay: c.delay }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" />
            </span>
            {c.label}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------- dashboard preview ------------------------- */

const PREVIEW_BARS = [42, 66, 50, 78, 62, 92, 74, 100, 84, 96];
const PREVIEW_STAGES = [
  { label: "Discovery", n: 4 },
  { label: "Proposal", n: 3 },
  { label: "Negotiation", n: 2 },
  { label: "Won", n: 5 },
];

function DashboardPreview({ reduced }: { reduced: boolean }) {
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const [ref, inView] = useInView<HTMLDivElement>();

  const onMove = (e: React.PointerEvent) => {
    if (reduced) return;
    const el = sceneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--mzh-ry", `${(px * 7).toFixed(2)}deg`);
    el.style.setProperty("--mzh-rx", `${(-py * 6).toFixed(2)}deg`);
  };
  const onLeave = () => {
    const el = sceneRef.current;
    if (!el) return;
    el.style.setProperty("--mzh-ry", "0deg");
    el.style.setProperty("--mzh-rx", "0deg");
  };

  return (
    <div ref={ref} className="mzh-tilt-scene relative mx-auto mt-16 max-w-4xl px-2">
      {/* slow conic halo behind the preview */}
      <div
        aria-hidden
        className="mzh-spin-slow pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[130%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
        style={{
          background:
            "conic-gradient(from 0deg, hsl(var(--chart-1)/.5), hsl(var(--chart-5)/.35), hsl(var(--primary)/.5), hsl(var(--chart-2)/.3), hsl(var(--chart-1)/.5))",
          filter: "blur(70px)",
        }}
      />
      <div
        ref={sceneRef}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="mzh-tilt"
      >
        <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/85 shadow-[0_40px_90px_-40px_hsl(var(--foreground)/0.35)]">
          {/* window chrome */}
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
            <span className="ml-3 text-[11px] font-medium text-muted-foreground">
              Manzil One · Revenue workspace
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span className="mzh-dot-pulse inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Live
            </span>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_1.3fr] sm:p-6">
            {/* left: KPI tiles + pipeline chips */}
            <div className="space-y-3">
              {[
                { label: "Pipeline", value: "₹8.6 Cr", grad: "from-[hsl(var(--chart-1))/.18]" },
                { label: "Win rate", value: "38%", grad: "from-[hsl(var(--chart-2))/.18]" },
                { label: "Forecast", value: "₹3.2 Cr", grad: "from-[hsl(var(--chart-5))/.18]" },
              ].map((k, i) => (
                <div
                  key={k.label}
                  className={`mzh-fade-up rounded-2xl border border-border/60 bg-gradient-to-br ${k.grad} to-transparent p-3.5`}
                  style={{ animationDelay: `${200 + i * 140}ms`, animationPlayState: inView ? "running" : "paused" }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {k.label}
                  </div>
                  <div className="font-display text-xl font-semibold tracking-tight">{k.value}</div>
                </div>
              ))}
              <div
                className="mzh-fade-up flex flex-wrap gap-1.5 pt-1"
                style={{ animationDelay: "640ms", animationPlayState: inView ? "running" : "paused" }}
              >
                {PREVIEW_STAGES.map((s) => (
                  <span
                    key={s.label}
                    className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                  >
                    {s.label} <span className="font-semibold text-foreground">{s.n}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* right: revenue bars + sparkline */}
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Monthly revenue
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                  <TrendingUp className="h-3 w-3" /> +22%
                </span>
              </div>
              <div className="flex h-28 items-end gap-1.5">
                {PREVIEW_BARS.map((h, i) => (
                  <div
                    key={i}
                    className="mzh-bar flex-1 rounded-t-md bg-gradient-to-t from-[hsl(var(--chart-1))] to-[hsl(var(--chart-5))]"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${350 + i * 80}ms`,
                      animationPlayState: inView ? "running" : "paused",
                      opacity: 0.55 + (h / 100) * 0.45,
                    }}
                  />
                ))}
              </div>
              <svg viewBox="0 0 300 60" className="mt-3 h-12 w-full" aria-hidden>
                <path
                  d="M0 48 C 30 44, 45 30, 75 32 S 130 46, 160 34 S 220 10, 250 16 S 290 8, 300 6"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={100}
                  strokeDashoffset={reduced ? 0 : 100}
                  className="mzh-dash"
                  style={{ animationDelay: "700ms", animationPlayState: inView ? "running" : "paused" }}
                />
                <circle cx="300" cy="6" r="3.5" fill="hsl(var(--primary))" className="mzh-dot-pulse" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ stats ------------------------------ */

function StatCard({
  stat,
  start,
  reduced,
  index,
}: {
  stat: HeroStat;
  start: boolean;
  reduced: boolean;
  index: number;
}) {
  const v = useCountUp(stat.value, start, reduced);
  const display =
    stat.kind === "currency"
      ? formatCompactCurrency(v)
      : Math.round(v).toLocaleString("en-IN");
  return (
    <div
      className="mzh-fade-up hover-lift rounded-2xl border bg-card/70 p-5 text-center shadow-sm"
      style={{ animationDelay: `${index * 110}ms`, animationPlayState: start ? "running" : "paused" }}
    >
      <div className="font-display text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
        {display}
      </div>
      <div className="mt-1.5 text-xs text-muted-foreground">{stat.label}</div>
    </div>
  );
}

/* ------------------------------- hero ------------------------------ */

export function HeroV1({ stats }: { stats: HeroStat[] }) {
  const reduced = usePrefersReducedMotion();
  const [statsRef, statsInView] = useInView<HTMLDivElement>();

  return (
    <>
      <section className="relative">
        {/* Aurora blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div
            className="mzh-blob left-[8%] top-[6%] h-72 w-72"
            style={{ background: "radial-gradient(circle, hsl(var(--chart-1)/.5), transparent 70%)" }}
          />
          <div
            className="mzh-blob right-[10%] top-[14%] h-80 w-80"
            style={{ background: "radial-gradient(circle, hsl(var(--chart-5)/.4), transparent 70%)", animationDelay: "4s" }}
          />
          <div
            className="mzh-blob left-[38%] top-[46%] h-96 w-96"
            style={{ background: "radial-gradient(circle, hsl(var(--primary)/.28), transparent 70%)", animationDelay: "8s" }}
          />
        </div>

        <FloatingChips />

        <div className="container pt-16 pb-6 text-center">
          {/* badge */}
          <div className="mzh-fade-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <span className="mzh-dot-pulse inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Now with Manz AI — draft a full quotation from one sentence
            <Sparkles className="h-3.5 w-3.5" />
          </div>

          <p
            dir="rtl"
            className="mzh-fade-up font-urdu mx-auto max-w-3xl text-xl leading-[2] text-foreground/85 md:text-2xl"
            style={{ animationDelay: "120ms" }}
          >
            منزل ون کے ساتھ، آپ کے ہر سودے کا سفر بنے آسان — اور آپ کی ٹیم پہنچے کامیابی کی منزل تک۔
          </p>

          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-tight md:text-7xl">
            <WordReveal text="The revenue platform that" startDelay={250} />{" "}
            <WordReveal
              text="runs your entire deal lifecycle."
              startDelay={600}
              className="text-gradient mzh-aurora-text"
            />
          </h1>

          <p
            className="mzh-fade-up mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
            style={{ animationDelay: "900ms" }}
          >
            Leads, opportunities, RFQs, quotations, rate cards, approvals and forecasts —
            one elegant workspace, from first touch to closed-won.
          </p>

          <div
            className="mzh-fade-up mt-8 flex items-center justify-center gap-3"
            style={{ animationDelay: "1050ms" }}
          >
            <Link href="/signup">
              <Button size="xl" variant="gradient" className="mzh-sheen">
                Start free trial <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="xl" variant="glass">
                <Target className="h-4 w-4" /> See it in action
              </Button>
            </Link>
          </div>
        </div>

        <DashboardPreview reduced={reduced} />
      </section>

      {/* Live, real-time platform metrics straight from the database */}
      {stats.length > 0 && (
        <section id="metrics" className="container pb-20 pt-16">
          <div className="mx-auto max-w-4xl" ref={statsRef}>
            <div className="mb-4 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live platform metrics
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat, i) => (
                <StatCard key={stat.label} stat={stat} start={statsInView} reduced={reduced} index={i} />
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Updated in real time from the live workspace.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
