"use client";

import { MotionConfig } from "framer-motion";

/**
 * Honour the OS "reduce motion" setting across all Framer Motion components.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
