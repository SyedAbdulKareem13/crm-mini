import { Suspense } from "react";
import { LoginCard } from "./login-card";

export const metadata = { title: "Sign in — Manzil One" };

export default function LoginPage() {
  // Google renders only where the provider is actually registered — a dead
  // sign-in button is worse than no button.
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  return (
    <Suspense fallback={<div className="h-[420px] w-full max-w-5xl animate-pulse rounded-3xl bg-muted/40" />}>
      <LoginCard googleEnabled={googleEnabled} />
    </Suspense>
  );
}
