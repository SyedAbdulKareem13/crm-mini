"use client";

import { useState } from "react";
import type { Venue } from "@/data/wedding";
import { mapsEmbedUrl, mapsSearchUrl } from "@/lib/calendar";
import { ButtonLink, Button } from "@/components/ui/Button";
import { IconExternal, IconMap, IconPin } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";

/** Premium location panel: stylised map with a living pin → real map on request. */
export function LocationCard({ venue, sacred = false, className }: { venue: Venue; sacred?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("location-card rounded-[30px] p-2", sacred ? "glass-dark" : "glass-dark", className)} style={{ transformStyle: "preserve-3d" }}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[#23101a]">
        {open ? (
          <iframe
            title={`Map of ${venue.name}, ${venue.city}`}
            src={mapsEmbedUrl(venue.mapsQuery)}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <>
            {/* stylised map */}
            <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id={`grid-${venue.city}`} width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M28 0H0V28" fill="none" stroke="rgba(201,162,74,0.12)" strokeWidth="0.6" />
                </pattern>
                <radialGradient id={`veil-${venue.city}`} cx="0.5" cy="0.5" r="0.7">
                  <stop offset="0" stopColor="rgba(122,27,46,0.0)" />
                  <stop offset="1" stopColor="rgba(18,5,7,0.85)" />
                </radialGradient>
              </defs>
              <rect width="400" height="300" fill={`url(#grid-${venue.city})`} />
              <g fill="none" stroke="rgba(232,207,138,0.35)" strokeWidth="5" strokeLinecap="round">
                <path d="M-20 210 C 80 190 120 240 210 200 S 360 120 430 150" />
                <path d="M60 -10 C 90 80 170 90 190 170 S 220 300 260 320" strokeWidth="3.5" />
                <path d="M-10 90 C 60 100 130 60 200 90 S 330 110 420 60" strokeWidth="2.5" opacity="0.7" />
              </g>
              <g fill="rgba(201,162,74,0.16)">
                <rect x="40" y="120" width="46" height="30" rx="3" />
                <rect x="250" y="60" width="60" height="34" rx="3" />
                <rect x="300" y="200" width="50" height="40" rx="3" />
                <rect x="110" y="230" width="70" height="28" rx="3" />
              </g>
              <rect width="400" height="300" fill={`url(#veil-${venue.city})`} />
            </svg>

            {/* living pin */}
            <div className="pin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
              <span className="pulse-ring absolute left-1/2 top-full h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/70" />
              <span className="pulse-ring absolute left-1/2 top-full h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/70" style={{ animationDelay: "0.8s" }} />
              <span className="absolute left-1/2 top-full h-2 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 blur-[3px]" />
              <IconPin className="relative text-5xl text-gold-light" />
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
              <div>
                <p className="eyebrow text-[0.6rem] text-gold/80">{sacred ? "Temple" : "Venue"}</p>
                <p className="font-display text-2xl leading-tight text-ivory">{venue.name}</p>
                <p className="text-sm text-ivory/65">{venue.city}</p>
              </div>
              <Button variant="outline" className="!min-h-10 !px-4 !py-2 text-[0.66rem]" onClick={() => setOpen(true)} icon={<IconMap />}>
                Reveal map
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
        <div>
          {venue.tamil && <p className="tamil text-base text-gold-light/85">{venue.tamil}</p>}
          {venue.cityTamil && <p className="tamil text-sm text-ivory/55">{venue.cityTamil}</p>}
        </div>
        <ButtonLink href={mapsSearchUrl(venue.mapsQuery)} target="_blank" rel="noopener noreferrer" variant="gold" icon={<IconExternal />}>
          Open in Maps
        </ButtonLink>
      </div>
    </div>
  );
}
