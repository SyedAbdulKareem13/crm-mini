"use client";

import { useEffect, useState } from "react";

export type Quality = "high" | "medium" | "low";

let cached: Quality | null = null;

/** Adaptive rendering tier — decided once per session on the client. */
export function detectQuality(): Quality {
  if (typeof window === "undefined") return "medium";
  if (cached) return cached;

  // manual override for testing on real devices, e.g. ?quality=low
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "low" || forced === "medium" || forced === "high") return (cached = forced);

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
  const mem = nav.deviceMemory; // Chromium only; Safari leaves it undefined
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;

  // budget phones: keep the story, skip WebGL
  if (coarse && mem !== undefined && mem <= 3) return (cached = "low");
  if (coarse || small || cores <= 4 || (mem !== undefined && mem <= 4)) return (cached = "medium");
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
