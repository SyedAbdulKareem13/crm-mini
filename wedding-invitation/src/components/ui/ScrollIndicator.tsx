export function ScrollIndicator({ label = "Scroll", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 text-gold-light/80 ${className}`} aria-hidden>
      <span className="eyebrow text-[0.68rem] tracking-[0.24em] md:text-[0.62rem] md:tracking-[0.4em]">{label}</span>
      <span className="relative block h-14 w-px overflow-hidden bg-gold/25">
        <span className="scroll-bead absolute inset-x-0 top-0 h-5 bg-linear-to-b from-transparent via-gold-light to-transparent" />
      </span>
    </div>
  );
}
