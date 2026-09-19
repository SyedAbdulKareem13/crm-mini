"use client";

import { useEffect } from "react";

/**
 * Scene housekeeping.
 *
 * The page scrolls plainly. Every <section data-scene> is a rounded card in normal flow,
 * and each card after the first is pulled up by exactly its corner radius (`.scene` in
 * globals.css), so the rounded top edge reveals the scene above it and never the page
 * background. Sticky, scroll-scrubbed scenes (hero, story, finale) get their held frame
 * from CSS `position: sticky` inside a taller section — nothing here pins.
 *
 * There used to be a GSAP pin deck in this file: each finished scene was pinned with
 * `pinSpacing: false` while the next slid over it. On a phone that covered the couple
 * at the chest before their scene had been read, left the end of the page unreachable
 * (no pin spacers means a document shorter than its content) and re-parented every
 * section into a `.pin-spacer`, which broke the card styling. Do not bring it back.
 *
 * What remains: sections are tagged `.in-view` so looping decorative CSS animations only
 * run while their scene can actually be seen (globals.css pauses them otherwise).
 */
export function SceneStack() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.target as HTMLElement).classList.toggle("in-view", e.isIntersecting)),
      { rootMargin: "12% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return null;
}
