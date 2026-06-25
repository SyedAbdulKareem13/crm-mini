import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Kanban,
  Linkedin,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeMenu } from "@/components/theme-menu";
import { prisma } from "@/lib/prisma";
import { formatCompactCurrency } from "@/lib/utils";

const LINKEDIN_URL = "https://www.linkedin.com/in/syed-abdul-kareem-b33519200/";

export const dynamic = "force-dynamic";

const features = [
  { icon: Kanban, title: "Pipeline Kanban", desc: "Drag-and-drop deals across 11 stages with live valuation, aging and probability." },
  { icon: Receipt, title: "Quotation Builder", desc: "Generate quotations from RFQs with manpower, license & non-manpower rate cards." },
  { icon: ShieldCheck, title: "Approval Workflow", desc: "Multi-level approvals with comments, rejections and a full audit trail." },
  { icon: BarChart3, title: "Revenue Forecast", desc: "Real-time pipeline value, win-rate, lead source mix and revenue forecast." },
  { icon: Zap, title: "Position Engine", desc: "Resource estimation with cost, billing, margin and profit instantly." },
  { icon: Sparkles, title: "Audit Trail", desc: "Every create, edit, stage move and approval logged — fully transparent." },
];

async function getStats() {
  try {
    const [leads, openOpps, quotations, customers, pipeline] = await Promise.all([
      prisma.lead.count(),
      prisma.opportunity.count({ where: { NOT: { stage: { in: ["WON", "LOST"] } } } }),
      prisma.quotation.count(),
      prisma.customer.count(),
      prisma.opportunity.aggregate({ where: { NOT: { stage: "LOST" } }, _sum: { expectedRevenue: true } }),
    ]);
    return {
      pipeline: Number(pipeline._sum.expectedRevenue ?? 0),
      openOpps,
      quotations,
      leads,
      customers,
    };
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const s = await getStats();
  const stats = s
    ? [
        { label: "Pipeline value", value: formatCompactCurrency(s.pipeline) },
        { label: "Active opportunities", value: s.openOpps.toLocaleString("en-IN") },
        { label: "Quotations generated", value: s.quotations.toLocaleString("en-IN") },
        { label: "Leads tracked", value: s.leads.toLocaleString("en-IN") },
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

      <section className="container pt-16 pb-14 text-center">
        <p
          dir="rtl"
          className="font-urdu mx-auto max-w-3xl text-xl leading-[2] text-foreground/85 md:text-2xl"
        >
          منزل ون کے ساتھ، آپ کے ہر سودے کا سفر بنے آسان — اور آپ کی ٹیم پہنچے کامیابی کی منزل تک۔
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-tight md:text-7xl">
          The revenue platform that{" "}
          <span className="text-gradient">runs your entire deal lifecycle.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Leads, opportunities, RFQs, quotations, rate cards, approvals and forecasts —
          one elegant workspace, from first touch to closed-won.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="xl" variant="gradient">
              Start free trial <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="xl" variant="glass">See it in action</Button>
          </Link>
        </div>
      </section>

      {/* Live, real-time platform metrics straight from the database */}
      {stats.length ? (
        <section id="metrics" className="container pb-20">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Live platform metrics
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border bg-card/70 p-5 text-center shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <div className="font-display text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
                    {stat.value}
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Updated in real time from the live workspace.
            </p>
          </div>
        </section>
      ) : null}

      <section id="features" className="container pb-24">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="luxury-card p-6 transition-transform hover:-translate-y-0.5">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--chart-1))/.25] to-[hsl(var(--chart-5))/.25] text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

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

      {/* Developer credit */}
      <section className="container pb-16">
        <div className="luxury-card relative mx-auto max-w-lg overflow-hidden p-8 text-center">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-aurora opacity-[0.08]" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl btn-gradient text-base font-semibold tracking-wide text-white shadow-lg">
            SA
          </div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Designed &amp; developed by
          </div>
          <div className="mt-1 text-xl font-semibold tracking-tight">Syed Abdul Kareem</div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            Full-stack engineer · Architect of Manzil One
          </div>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#0A66C2]/30 bg-[#0A66C2]/10 px-5 py-2 text-sm font-medium text-[#0A66C2] transition-colors hover:bg-[#0A66C2] hover:text-white dark:text-[#7BB1FF] dark:hover:text-white"
          >
            <Linkedin className="h-4 w-4" />
            Connect on LinkedIn
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <footer className="container py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Manzil One · منزل ون — Premium revenue platform.
      </footer>
    </div>
  );
}
