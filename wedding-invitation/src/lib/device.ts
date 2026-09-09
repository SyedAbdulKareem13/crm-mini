"use client";

import { useEffect, useState } from "react";

export type Quality = "high" | "medium" | "low";

let cached: Quality | null = null;

/** Adaptive rendering tier — decided once per session on the client. */
export function detectQuality(): Quality {
  if (typeof window === "undefined") return "medium";
  if (cached) return cached;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return (cached = "low");

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return (cached = "low");

  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  if (!webgl) return (cached = "low");

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  if (coarse || small || cores <= 4 || mem <= 4) return (cached = "medium");
  return (cached = "high");
}

export function useQuality(): Quality {
  const [q, setQ] = useState<Quality>("medium");
  useEffect(() => setQ(detectQuality()), []);
  return q;
}

export function usePrefersReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setR(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return r;
}

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    const on = () => setFine(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return fine;
}
