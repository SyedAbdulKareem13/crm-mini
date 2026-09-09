"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  gsap.defaults({ ease: "power3.out", duration: 1 });
  ScrollTrigger.config({ ignoreMobileResize: true });
  // Custom cinematic eases used across scenes
  gsap.registerEase("cine", (p: number) => 1 - Math.pow(1 - p, 4));
  gsap.registerEase("silk", (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2));
}

export { gsap, ScrollTrigger, useGSAP };
