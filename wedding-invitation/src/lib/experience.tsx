"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { detectQuality, type Quality } from "./device";

interface ExperienceState {
  /** Assets + first frame ready → loader can exit */
  ready: boolean;
  setReady: () => void;
  /** Opening title sequence has finished (or been skipped) */
  introDone: boolean;
  setIntroDone: () => void;
  quality: Quality;
  reducedMotion: boolean;
  finePointer: boolean;
  /** Shared pointer position (0..1) for effects that react to the cursor */
  pointer: React.MutableRefObject<{ x: number; y: number; vx: number; vy: number }>;
  /** Shared scroll velocity for wind effects */
  scroll: React.MutableRefObject<{ y: number; velocity: number; progress: number }>;
}

const Ctx = createContext<ExperienceState | null>(null);

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const [ready, _setReady] = useState(false);
  const [introDone, _setIntroDone] = useState(false);
  const [quality, setQuality] = useState<Quality>("medium");
  const [reducedMotion, setReduced] = useState(false);
  const [finePointer, setFine] = useState(false);
  const pointer = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0 });
  const scroll = useRef({ y: 0, velocity: 0, progress: 0 });

  useEffect(() => {
    setQuality(detectQuality());
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fp = window.matchMedia("(pointer: fine)");
    const sync = () => {
      setReduced(rm.matches);
      setFine(fp.matches);
    };
    sync();
    rm.addEventListener("change", sync);
    fp.addEventListener("change", sync);

    let lx = 0.5, ly = 0.5, last = performance.now();
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(8, now - last);
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      pointer.current.vx = (x - lx) / dt * 16;
      pointer.current.vy = (y - ly) / dt * 16;
      pointer.current.x = x;
      pointer.current.y = y;
      lx = x; ly = y; last = now;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      rm.removeEventListener("change", sync);
      fp.removeEventListener("change", sync);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const setReady = useCallback(() => _setReady(true), []);
  const setIntroDone = useCallback(() => _setIntroDone(true), []);

  const value = useMemo<ExperienceState>(
    () => ({ ready, setReady, introDone, setIntroDone, quality, reducedMotion, finePointer, pointer, scroll }),
    [ready, setReady, introDone, setIntroDone, quality, reducedMotion, finePointer],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExperience(): ExperienceState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useExperience must be used inside <ExperienceProvider>");
  return v;
}
