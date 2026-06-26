import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeMenu } from "@/components/theme-menu";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Soft static brand glow — no animation/blur loop, keeps scrolling buttery */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-mesh opacity-70" />

      <header className="container flex items-center justify-between py-6">
        <Link href="/">
          <Logo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeMenu />
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Need help?
          </Link>
        </div>
      </header>
      <main className="container flex min-h-[calc(100vh-120px)] items-center justify-center pb-12">
        {children}
      </main>
    </div>
  );
}
