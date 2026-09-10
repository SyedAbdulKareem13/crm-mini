"use client";

import { gsap } from "@/lib/gsap";

/** Prepare every [data-draw] stroke inside root so it is fully hidden (dash = length). */
export function prepareDraw(root: Element | null) {
  if (!root) return [] as SVGGeometryElement[];
  const els = Array.from(root.querySelectorAll<SVGGeometryElement>("[data-draw]"));
  for (const el of els) {
    let len = 0;
    try {
      len = el.getTotalLength();
    } catch {
      len = 0;
    }
    if (!len || !isFinite(len)) continue;
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
  }
  return els;
}

interface DrawOpts {
  duration?: number;
  stagger?: number | gsap.StaggerVars;
  ease?: string;
  delay?: number;
}

const coarsePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Tween strokes from hidden to drawn. Call prepareDraw first (or let this do it).
 * On touch devices a drawing with many paths is revealed with a single radial wipe
 * instead of per-path dash tweens — the same gesture at a fraction of the cost.
 */
export function drawStrokes(root: Element | null, opts: DrawOpts = {}) {
  if (!root) return gsap.timeline();
  if (coarsePointer() && root.querySelectorAll("[data-draw]").length > 40) {
    showStrokes(root);
    return gsap.fromTo(
      root,
      { clipPath: "circle(0% at 50% 50%)" },
      { clipPath: "circle(75% at 50% 50%)", duration: opts.duration ?? 1.6, ease: opts.ease ?? "power2.inOut", delay: opts.delay ?? 0, clearProps: "clipPath" },
    );
  }
  const els = prepareDraw(root);
  if (!els.length) return gsap.timeline();
  return gsap.to(els, {
    strokeDashoffset: 0,
    duration: opts.duration ?? 1.6,
    stagger: opts.stagger ?? 0.02,
    ease: opts.ease ?? "power2.inOut",
    delay: opts.delay ?? 0,
  });
}

/** Instantly show all strokes (reduced motion / fallback). */
export function showStrokes(root: Element | null) {
  if (!root) return;
  root.querySelectorAll<SVGGeometryElement>("[data-draw]").forEach((el) => {
    el.style.strokeDasharray = "";
    el.style.strokeDashoffset = "";
  });
}
