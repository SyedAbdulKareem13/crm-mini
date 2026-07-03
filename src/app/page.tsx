import Link from "next/link";
import {
  BarChart3,
  Kanban,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeMenu } from "@/components/theme-menu";
import { DeveloperCredit } from "@/components/developer-credit";
import { HeroV2 } from "@/components/landing/hero-v2";
import { HeroV1, type HeroStat } from "@/components/landing/hero-v1";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { prisma } from "@/lib/prisma";
import { getHeroVersion } from "@/lib/app-config";

export const dynamic = "force-dynamic";

const LINKEDIN_URL = "https://www.linkedin.com/in/syed-abdul-kareem-b33519200/";

const features = [
  { icon: Kanban, title: "Pipeline Kanban", desc: "Drag-and-drop deals across 11 stages with live valuation, aging and probability." },
  { icon: Receipt, title: "Quotation Builder", desc: "Generate quotations from RFQs with manpower, license & non-manpower rate cards." },
  { icon: ShieldCheck, title: "Approval Workflow", desc: "Multi-level approvals with comments, rejections and a full audit trail." },
  { icon: BarChart3, title: "Revenue Forecast", desc: "Real-time pipeline value, win-rate, lead source mix and revenue forecast." },
  { icon: Zap, title: "Position Engine", desc: "Resource estimation with cost, billing, margin and profit instantly." },
  { icon: Sparkles, title: "Audit Trail", desc: "Every create, edit, stage move and approval logged — fully transparent." },
];

type Stats = {
  pipeline: number;
  openOpps: number;
  wonOpps: number;
  quotations: number;
  leads: number;
  customers: number;
};

async function getStats(): Promise<Stats | null> {
  try {
    const [leads, openOpps, wonOpps, quotations, customers, pipeline] = await Promise.all([
      prisma.lead.count(),
      prisma.opportunity.count({ where: { NOT: { stage: { in: ["WON", "LOST"] } } } }),
      prisma.opportunity.count({ where: { stage: "WON" } }),
      prisma.quotation.count(),
      prisma.customer.count(),
      prisma.opportunity.aggregate({ where: { NOT: { stage: "LOST" } }, _sum: { expectedRevenue: true } }),
    ]);
    return {
      pipeline: Number(pipeline._sum.expectedRevenue ?? 0),
      openOpps,
      wonOpps,
      quotations,
      leads,
      customers,
    };
  } catch {
    return null;
  }
}

/* ----------------------------- Shared sections ----------------------------- */

function FeatureCard({ Icon, title, desc }: { Icon: typeof Kanban; title: string; desc: string }) {
  return (
    <div className="luxury-card p-6 transition-transform hover:-translate-y-0.5">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--chart-1))/.25] to-[hsl(var(--chart-5))/.25] text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function FeaturesSection({ reveal = false }: { reveal?: boolean }) {
  return (
    <section id="features" className="container pb-24">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }, i) =>
          reveal ? (
            <ScrollReveal key={title} delay={i * 90}>
              <FeatureCard Icon={Icon} title={title} desc={desc} />
            </ScrollReveal>
          ) : (
            <FeatureCard key={title} Icon={Icon} title={title} desc={desc} />
          )
        )}
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section id="cta" className="container pb-24">
      <div className="luxury-card relative overflow-hidden p-10 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-aurora opacity-[0.12]" />
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Run your entire revenue motion in one place.
        </h2>
        <p className="mt-2 text-muted-foreground">
          From lead to closed-won — <span className="font-urdu" dir="rtl">لیڈ سے کامیابی کی منزل تک</span>.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" variant="gradient">Create your workspace</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">Try the demo</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="container py-10 text-center text-sm text-muted-foreground">
      © {new Date().getFullYear()} Manzil One · منزل ون — Premium revenue platform.
    </footer>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default async function LandingPage() {
  const [heroVersion, s] = await Promise.all([getHeroVersion(), getStats()]);

  // ----- v2: immersive WebGL hero, then the shared sections below -----
  if (heroVersion === "v2") {
    const pipelineCr = s ? s.pipeline / 1e7 : 8.5;
    const opps = s?.openOpps ?? 11;
    const won = s?.wonOpps ?? 17;
    return (
      <div className="relative min-h-screen">
        <HeroV2 pipelineCr={pipelineCr} opps={opps} won={won} linkedinUrl={LINKEDIN_URL} />
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-70" />
          <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-30" />
          <div className="pt-20" />
          <FeaturesSection reveal />
          <ScrollReveal>
            <CtaSection />
          </ScrollReveal>
          <SiteFooter />
        </div>
      </div>
    );
  }

  // ----- v1: premium animated landing (default) -----
  const stats: HeroStat[] = s
    ? [
        { label: "Pipeline value", value: s.pipeline, kind: "currency" },
        { label: "Active opportunities", value: s.openOpps, kind: "number" },
        { label: "Quotations generated", value: s.quotations, kind: "number" },
        { label: "Leads tracked", value: s.leads, kind: "number" },
      ]
    : [];

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-mesh opacity-70" />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg opacity-30" />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Product</a>
            <a href="#metrics" className="hover:text-foreground">Live metrics</a>
            <a href="#cta" className="hover:text-foreground">Get started</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeMenu />
            <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/signup"><Button variant="gradient" size="sm">Start free</Button></Link>
          </div>
        </div>
      </header>

      <HeroV1 stats={stats} />

      <FeaturesSection reveal />
      <ScrollReveal>
        <CtaSection />
      </ScrollReveal>

      {/* Developer credit — luxury animated card */}
      <section className="container pb-20 pt-4">
        <DeveloperCredit />
      </section>

      <SiteFooter />
    </div>
  );
}
