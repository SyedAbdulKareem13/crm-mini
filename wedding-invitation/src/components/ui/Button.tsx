"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { cn } from "@/lib/utils";

type Variant = "gold" | "outline" | "outline-dark";

const variantClass: Record<Variant, string> = {
  gold: "btn-gold",
  outline: "btn-outline",
  "outline-dark": "btn-outline-dark",
};

/** Magnetic pull on desktop: the button leans toward the cursor and springs back. */
function useMagnetic<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.28);
      yTo(dy * 0.35);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [enabled]);
  return ref;
}

interface ButtonLinkProps extends ComponentPropsWithoutRef<"a"> {
  variant?: Variant;
  icon?: ReactNode;
}

export function ButtonLink({ variant = "gold", icon, className, children, ...rest }: ButtonLinkProps) {
  const { finePointer } = useExperience();
  const ref = useMagnetic<HTMLAnchorElement>(finePointer);
  return (
    <a ref={ref} data-magnetic className={cn("btn", variantClass[variant], className)} {...rest}>
      {icon && <span className="text-[1.15em] opacity-90">{icon}</span>}
      <span>{children}</span>
    </a>
  );
}

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({ variant = "gold", icon, className, children, type = "button", ...rest }: ButtonProps) {
  const { finePointer } = useExperience();
  const ref = useMagnetic<HTMLButtonElement>(finePointer);
  return (
    <button ref={ref} type={type} data-magnetic className={cn("btn", variantClass[variant], className)} {...rest}>
      {icon && <span className="text-[1.15em] opacity-90">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
