"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginCard({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const callback = search.get("from") ?? "/app";
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    try {
      // OAuth must actually redirect — redirect:false silently swallows it.
      await signIn("google", { callbackUrl: callback });
    } catch {
      toast.error("Google sign-in failed — use email or OTP.");
    }
  }

  async function handleCreds(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password");
      return;
    }
    toast.success("Welcome back");
    router.push(callback);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="grid w-full max-w-5xl grid-cols-1 gap-10 lg:grid-cols-2"
    >
      {/* Showcase panel */}
      <div className="relative hidden lg:flex flex-col justify-between rounded-3xl glass-strong p-8 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-mesh" />
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/40 dark:bg-white/[0.04] px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3 w-3 text-primary" />
            Enterprise-grade CRM
          </div>
          <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-tight">
            Run your <span className="text-gradient">entire revenue motion</span>
            <br /> in one beautiful workspace.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            Leads, opportunities, RFQs, quotations, rate cards, approvals — every
            step from first touch to verbal close.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Pipeline", "Quotation", "Approvals"].map((s) => (
            <div key={s} className="rounded-xl border bg-white/40 dark:bg-white/[0.04] px-3 py-3 text-xs">
              <div className="font-semibold">{s}</div>
              <div className="mt-1 text-muted-foreground">Wired end-to-end</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="luxury-card p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back — let&apos;s pick up where you left off.
        </p>

        {googleEnabled && (
          <>
            <Button variant="glass" className="mt-6 w-full" onClick={handleGoogle}>
              <GoogleLogo /> Continue with Google
            </Button>
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}
        {!googleEnabled && <div className="mt-6" />}

        <Tabs defaultValue="password">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password">
              <Lock className="mr-2 h-3.5 w-3.5" /> Password
            </TabsTrigger>
            <TabsTrigger value="otp">
              <ShieldCheck className="mr-2 h-3.5 w-3.5" /> OTP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password">
            <AnimatePresence mode="wait">
              <motion.form
                key="creds"
                onSubmit={handleCreds}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="pl-9"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                      className="pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border accent-primary" />
                  Remember me on this device
                </label>
                <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.form>
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="otp">
            <OtpForm callback={callback} />
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

function OtpForm({ callback }: { callback: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"identifier" | "verify">("identifier");
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/otp/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, channel: identifier.includes("@") ? "EMAIL" : "SMS" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP");
      if (data.mock && data.code) {
        toast.message("Dev OTP", { description: `Use ${data.code}` });
        setCode(data.code);
      } else {
        toast.success("Code sent");
      }
      setStep("verify");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("otp", { identifier, code, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid or expired code");
      return;
    }
    toast.success("Signed in");
    router.push(callback);
    router.refresh();
  }

  return (
    <AnimatePresence mode="wait">
      {step === "identifier" ? (
        <motion.form
          key="id"
          onSubmit={requestOtp}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="identifier">Email or mobile</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+91 98765 43210 or you@company.com"
                className="pl-9"
                required
              />
            </div>
          </div>
          <Button type="submit" size="lg" variant="gradient" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Send one-time code"}
          </Button>
        </motion.form>
      ) : (
        <motion.form
          key="verify"
          onSubmit={verifyOtp}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label>6-digit code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              className="tracking-[0.5em] text-center text-lg"
              placeholder="••••••"
              required
            />
            <p className="text-xs text-muted-foreground">Sent to {identifier}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("identifier")}>
              Back
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" disabled={loading}>
              {loading ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.16-3.16C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
