"use client";

/**
 * ScrollCarousel — a horizontal, scrollbar-LESS carousel viewport.
 *
 * Drop-in replacement for a `<div className="overflow-x-auto"><track/></div>`
 * wrapper. It hides the native scrollbar and instead provides:
 *   • ‹ › arrow buttons that appear ONLY when the track overflows and each
 *     disables at its end,
 *   • smooth programmatic paging (honours prefers-reduced-motion),
 *   • vertical-wheel → horizontal-scroll,
 *   • pointer drag-to-scroll with a threshold that suppresses the click that
 *     would otherwise fire on an interactive child after a real drag,
 *   • soft edge fades that show only on the scrollable side,
 *   • full RTL correctness (arrows mirror; start/end detection uses |scrollLeft|
 *     so it works with the modern negative-scrollLeft RTL model).
 *
 * Usage:
 *   <ScrollCarousel ariaLabel="Pipeline stages">
 *     <ol className="flex min-w-max items-center">…</ol>
 *   </ScrollCarousel>
 */

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/provider";

const DRAG_THRESHOLD = 6; // px before a pointer move counts as a drag

export function ScrollCarousel({
  children,
  className,
  viewportClassName,
  ariaLabel,
  edgeFade = true,
}: {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
  ariaLabel?: string;
  edgeFade?: boolean;
}) {
  const { dir } = useI18n();
  const isRtl = dir === "rtl";
  const reduce = useReducedMotion();

  const ref = React.useRef<HTMLDivElement>(null);
  const [canStart, setCanStart] = React.useState(false); // can scroll toward the start
  const [canEnd, setCanEnd] = React.useState(false); // can scroll toward the end

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) {
      setCanStart(false);
      setCanEnd(false);
      return;
    }
    const abs = Math.abs(el.scrollLeft); // distance from the start (dir-agnostic)
    setCanStart(abs > 1);
    setCanEnd(abs < max - 1);
  }, []);

  React.useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const onScroll = () => measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    // also observe the inner track so content changes recompute overflow
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [measure, children]);

  // Native, non-passive wheel handler so we can translate vertical wheel into
  // horizontal scroll and preventDefault only while there is room to move.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already horizontal
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return;
      const before = el.scrollLeft;
      el.scrollLeft += e.deltaY;
      // Only swallow the page scroll if we actually consumed it.
      if (el.scrollLeft !== before) e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Drag-to-scroll with click suppression after a real drag.
  const drag = React.useRef({ active: false, startX: 0, startLeft: 0, moved: false });
  const onPointerDown = (e: React.PointerEvent) => {
    // ignore non-primary buttons
    if (e.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (!drag.current.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!drag.current.moved) {
      drag.current.moved = true;
      el.setPointerCapture?.(e.pointerId);
    }
    el.scrollLeft = drag.current.startLeft - dx; // physical: raw scrollLeft
  };
  const endDrag = (e: React.PointerEvent) => {
    const el = ref.current;
    if (el?.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current.active = false;
  };
  const onClickCapture = (e: React.MouseEvent) => {
    // Swallow the click that immediately follows a real drag so interactive
    // children (e.g. stage buttons that mutate server state) don't fire.
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const page = (toEnd: boolean) => {
    const el = ref.current;
    if (!el) return;
    const step = Math.max(120, el.clientWidth * 0.75);
    // logical → physical sign: toward end is + in LTR, − in RTL
    const sign = toEnd ? (isRtl ? -1 : 1) : isRtl ? 1 : -1;
    el.scrollBy({ left: step * sign, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        className={cn("no-scrollbar overflow-x-auto overscroll-x-contain", viewportClassName)}
        role="group"
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        style={{ cursor: canStart || canEnd ? "grab" : undefined }}
      >
        {children}
      </div>

      {/* Edge fades — only on the side that can still scroll. */}
      {edgeFade ? (
        <>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 start-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-200 rtl:bg-gradient-to-l",
              canStart ? "opacity-100" : "opacity-0"
            )}
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-background to-transparent transition-opacity duration-200 rtl:bg-gradient-to-r",
              canEnd ? "opacity-100" : "opacity-0"
            )}
          />
        </>
      ) : null}

      {/* Scroll-toward-start button (inline-start edge). */}
      <CarouselButton
        side="start"
        show={canStart}
        onClick={() => page(false)}
        label={ariaLabel}
      />
      {/* Scroll-toward-end button (inline-end edge). */}
      <CarouselButton side="end" show={canEnd} onClick={() => page(true)} label={ariaLabel} />
    </div>
  );
}

function CarouselButton({
  side,
  show,
  onClick,
  label,
}: {
  side: "start" | "end";
  show: boolean;
  onClick: () => void;
  label?: string;
}) {
  // Icon points in the scroll direction; rtl:rotate-180 mirrors it.
  const Icon = side === "start" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      aria-label={label ? `${label}: ${side === "start" ? "scroll back" : "scroll forward"}` : undefined}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full",
        "border bg-background/90 text-muted-foreground shadow-sm backdrop-blur",
        "transition-all duration-200 hover:bg-accent hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        side === "start" ? "start-0.5" : "end-0.5",
        show ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <Icon className="size-4 rtl:rotate-180" />
    </button>
  );
}
