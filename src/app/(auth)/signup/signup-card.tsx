"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Building2, Mail, Lock, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: String(form.get("fullName") ?? ""),
      companyName: String(form.get("companyName") ?? ""),
      email: String(form.get("email") ?? ""),
      mobile: String(form.get("mobile") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    const confirm = String(form.get("confirm") ?? "");
    if (payload.password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Signup failed");
      toast.success("Account created");
      await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });
      router.push("/app");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full max-w-xl luxury-card p-8"
    >
      <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Free 14-day trial. No credit card required.
      </p>

      <Button
        variant="glass"
        className="mt-6 w-full"
        onClick={() => signIn("google", { callbackUrl: "/app" })}
      >
        Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or use email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSignup} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field icon={<User className="h-4 w-4" />} label="Full name" name="fullName" required />
        <Field icon={<Building2 className="h-4 w-4" />} label="Company name" name="companyName" required />
        <Field
          icon={<Mail className="h-4 w-4" />}
          label="Work email"
          name="email"
          type="email"
          required
          className="sm:col-span-2"
        />
        <Field icon={<Phone className="h-4 w-4" />} label="Mobile" name="mobile" />
        <Field icon={<Lock className="h-4 w-4" />} label="Password" name="password" type="password" required />
        <Field
          icon={<Lock className="h-4 w-4" />}
          label="Confirm password"
          name="confirm"
          type="password"
          required
          className="sm:col-span-2"
        />
        <div className="sm:col-span-2">
          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already on Manzil One?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

function Field({
  label,
  name,
  icon,
  className,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  icon: React.ReactNode;
  className?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input id={name} name={name} type={type} required={required} className="pl-9" />
      </div>
    </div>
  );
}
