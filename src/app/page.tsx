import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Kanban,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

const features = [
  { icon: Kanban, title: "Pipeline Kanban", desc: "Drag-and-drop deals across 11 stages with live valuation, aging and probability." },
  { icon: Receipt, title: "Quotation Builder", desc: "Generate quotations from RFQs with manpower, license & non-manpower rate cards." },
  { icon: ShieldCheck, title: "Approval Workflow", desc: "Multi-level approvals with comments, rejections and a full audit trail." },
  { icon: BarChart3, title: "Revenue Forecast", desc: "Real-time pipeline value, win-rate, lead source mix and revenue forecast." },
  { icon: Zap, title: "Position Engine", desc: "Resource estimation with cost, billing, margin and profit instantly." },
  { icon: Sparkles, title: "AI Search", desc: "Global ⌘K search across leads, opportunities, RFQs, quotations & customers." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh" />
      <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-40" />

      <header className="container flex items-center justify-between py-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Product</a>
          <a href="#stack" className="hover:text-foreground">Stack</a>
          <a href="#cta" className="hover:text-foreground">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/signup"><Button variant="gradient" size="sm">Start free</Button></Link>
        </div>
      </header>

      <section className="container pt-12 pb-24 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-white/40 dark:bg-white/[0.04] px-3 py-1 text-xs">
          <Sparkles className="h-3 w-3 text-primary" />
          A $100M-grade revenue platform — built for consulting & staffing
        </div>
        <p
          dir="rtl"
          className="font-urdu mx-auto mt-8 max-w-3xl text-xl leading-[2] text-foreground/90 md:text-2xl"
        >
          منزل ون کے ساتھ، آپ کے ہر سودے کا سفر بنے آسان — اور آپ کی ٹیم پہنچے کامیابی کی منزل تک۔
        </p>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
          The revenue platform that <span className="text-gradient">runs your entire deal lifecycle.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          From lead to closed-won — <span className="font-urdu" dir="rtl">لیڈ سے کامیابی کی منزل تک</span>.
          Leads, opportunities, RFQs, quotations, rate cards, approvals and forecasts in one luxurious workspace.
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
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-aurora opacity-15" />
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Ready to ship a premium revenue motion?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Spin it up locally, point at Supabase and deploy to Vercel in minutes.
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

      <footer className="container py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Manzil One · منزل ون — Premium revenue platform.
      </footer>
    </div>
  );
}
