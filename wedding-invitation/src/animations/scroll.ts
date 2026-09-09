"use client";

import { ScrollTrigger } from "@/lib/gsap";

/** Run fn once when the trigger enters the viewport. */
export function onceInView(trigger: Element | null, fn: () => void, start = "top 78%") {
  if (!trigger) return null;
  return ScrollTrigger.create({ trigger, start, once: true, onEnter: fn });
}
