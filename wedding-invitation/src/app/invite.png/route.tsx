import { ImageResponse } from "next/og";
import { cloneElement } from "react";
import { wedding } from "@/data/wedding";
import { loadFonts } from "@/lib/og";
import { KolamSvg } from "@/components/art/Kolam";
import { GopuramSvg } from "@/components/art/Gopuram";
import { ThoranamSvg } from "@/components/art/Thoranam";
import { JasmineStrandSvg } from "@/components/art/Jasmine";
import { LampSvg } from "@/components/art/LampSvg";
import { BellSvg } from "@/components/art/BellSvg";

export const dynamic = "force-static";
export const runtime = "nodejs";

const W = 1080, H = 1560;
const GOLD = "#c9a24a", GOLD_LIGHT = "#e8cf8a", CHAMPAGNE = "#f3e4bd", IVORY = "#f6eedf";

/** Give an SVG element an explicit size (and a colour for currentColor strokes). */
function art(el: React.ReactElement, width: number, height: number, color?: string) {
  return cloneElement(el as React.ReactElement<Record<string, unknown>>, { style: { width, height }, ...(color ? { color } : {}) });
}

const Eyebrow = ({ children, size = 22, color = GOLD_LIGHT }: { children: string; size?: number; color?: string }) => (
  <div style={{ display: "flex", fontFamily: "Cormorant", fontSize: size, letterSpacing: size * 0.32, textTransform: "uppercase", color }}>{children}</div>
);

const Diamond = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: 70, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})`, display: "flex" }} />
    <div style={{ width: 8, height: 8, background: GOLD, transform: "rotate(45deg)", display: "flex" }} />
    <div style={{ width: 70, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)`, display: "flex" }} />
  </div>
);

/**
 * The downloadable invitation — the whole story on one royal card: maroon silk, gold arch,
 * thoranam and bells, jasmine strands, the names in Cormorant, the three moments, a gopuram
 * drawn in gold light and the lit kuthuvilakku. Rendered once at build time.
 */
export async function GET() {
  const fonts = await loadFonts();
  const { bride, groom } = wedding.couple;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Cormorant",
          color: IVORY,
          background: "radial-gradient(72% 52% at 50% 40%, #5f1224 0%, #3d0b14 48%, #170609 100%)",
        }}
      >
        {/* silk sheen */}
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex", background: "linear-gradient(115deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0) 100%)" }} />
        {/* double gold border */}
        <div style={{ position: "absolute", left: 30, top: 30, width: W - 60, height: H - 60, display: "flex", border: `3px solid ${GOLD}`, borderRadius: 12 }} />
        <div style={{ position: "absolute", left: 46, top: 46, width: W - 92, height: H - 92, display: "flex", border: `1px solid rgba(201,162,74,0.6)`, borderRadius: 8 }} />

        {/* kolam behind the names */}
        <div style={{ position: "absolute", left: 200, top: 210, width: 680, height: 680, display: "flex", opacity: 0.14 }}>
          {art(KolamSvg({ strokeWidth: 1.3 }), 680, 680, GOLD_LIGHT)}
        </div>

        {/* arch */}
        <div style={{ position: "absolute", left: 150, top: 205, width: 780, height: 1000, display: "flex" }}>
          <svg width="780" height="1000" viewBox="0 0 780 1000" fill="none" stroke={GOLD} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 1000 V 380 C 20 170 190 40 390 40 C 590 40 760 170 760 380 V 1000" strokeWidth="3" />
            <path d="M44 1000 V 392 C 44 200 200 66 390 66 C 580 66 736 200 736 392 V 1000" strokeWidth="1.2" opacity="0.65" />
            <path d="M390 40 V 14" strokeWidth="2.5" />
            <circle cx="390" cy="10" r="5" strokeWidth="2" />
            <path d="M390 -4 l -5 10 h 10 z" strokeWidth="2" fill={GOLD} />
            <path d="M60 470 c-14 -10 -18 -32 -6 -46 c8 -9 20 -8 24 2 c5 12 -4 26 -18 44 z" strokeWidth="1.4" transform="translate(40 0) rotate(-24 60 470)" />
            <path d="M720 470 c14 -10 18 -32 6 -46 c-8 -9 -20 -8 -24 2 c-5 12 4 26 18 44 z" strokeWidth="1.4" transform="translate(-40 0) rotate(24 720 470)" />
          </svg>
        </div>

        {/* thoranam, bells, jasmine */}
        <div style={{ position: "absolute", left: 0, top: 22, width: W, height: 180, display: "flex" }}>{art(ThoranamSvg({ leaves: 22 }), W, 180)}</div>
        <div style={{ position: "absolute", left: 92, top: 130, width: 64, height: 122, display: "flex" }}>{art(BellSvg({ id: "cardL" }), 64, 122)}</div>
        <div style={{ position: "absolute", left: W - 156, top: 130, width: 64, height: 122, display: "flex" }}>{art(BellSvg({ id: "cardR" }), 64, 122)}</div>
        <div style={{ position: "absolute", left: 66, top: 270, width: 52, height: 520, display: "flex" }}>{art(JasmineStrandSvg({ count: 12, length: 600 }), 52, 520)}</div>
        <div style={{ position: "absolute", left: W - 118, top: 270, width: 52, height: 520, display: "flex", transform: "scaleX(-1)" }}>{art(JasmineStrandSvg({ count: 12, length: 600 }), 52, 520)}</div>

        {/* text */}
        <div style={{ position: "absolute", left: 0, top: 262, width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Eyebrow>{wedding.invitation.eyebrow}</Eyebrow>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 26 }}>
            <div style={{ display: "flex", fontSize: 108, fontWeight: 600, color: CHAMPAGNE, letterSpacing: 2 }}>{bride.name}</div>
            <div style={{ display: "flex", fontSize: 84, fontStyle: "italic", fontWeight: 500, color: GOLD_LIGHT }}>&amp;</div>
            <div style={{ display: "flex", fontSize: 108, fontWeight: 600, color: CHAMPAGNE, letterSpacing: 2 }}>{groom.name}</div>
          </div>
          <div style={{ display: "flex", fontFamily: "NotoSerifTamil", fontSize: 38, color: GOLD_LIGHT, marginTop: 4 }}>
            {bride.tamil} &amp; {groom.tamil}
          </div>
          <div style={{ display: "flex", fontSize: 34, fontStyle: "italic", fontWeight: 500, color: CHAMPAGNE, marginTop: 18 }}>{wedding.tagline.en}</div>
          <div style={{ display: "flex", fontFamily: "NotoSerifTamil", fontSize: 25, color: GOLD_LIGHT, marginTop: 8 }}>{wedding.invite.tamilLine}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
            <div style={{ width: 90, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})`, display: "flex" }} />
            <svg width="34" height="30" viewBox="0 0 34 30" fill={GOLD}>
              <path d="M17 2 C 21 8 21 16 17 22 C 13 16 13 8 17 2 Z" />
              <path d="M17 22 C 10 20 6 14 5 8 C 11 10 15 14 17 22 Z" opacity=".8" />
              <path d="M17 22 C 24 20 28 14 29 8 C 23 10 19 14 17 22 Z" opacity=".8" />
              <path d="M6 24 Q 17 32 28 24 Q 17 27 6 24 Z" opacity=".9" />
            </svg>
            <div style={{ width: 90, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)`, display: "flex" }} />
          </div>

          {wedding.events.map((ev, i) => (
            <div key={ev.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: i === 0 ? 16 : 0 }}>
              {i > 0 && <div style={{ display: "flex", marginTop: 8, marginBottom: 8 }}><Diamond /></div>}
              <Eyebrow size={25} color={GOLD_LIGHT}>{(ev.subtitle ?? ev.title)}</Eyebrow>
              <div style={{ display: "flex", fontSize: 28, color: IVORY, marginTop: 6 }}>{ev.weekday} {ev.dateLabel}</div>
              <div style={{ display: "flex", fontSize: 28, color: IVORY, marginTop: 0 }}>{ev.timeLabel}</div>
              {ev.venue && <div style={{ display: "flex", fontSize: 26, color: GOLD_LIGHT, marginTop: 2 }}>{ev.venue.name}, {ev.venue.city}</div>}
            </div>
          ))}
        </div>

        {/* temple in gold light + the lamp */}
        <div style={{ position: "absolute", left: (W - 460) / 2, top: 1128, width: 460, height: 521, display: "flex", opacity: 0.42 }}>{art(GopuramSvg({ variant: "line", strokeWidth: 1.7 }), 460, 521, GOLD_LIGHT)}</div>
        <div style={{ position: "absolute", left: (W - 760) / 2, top: 1290, width: 760, height: 200, display: "flex", background: "radial-gradient(50% 60% at 50% 62%, rgba(255,170,70,0.3), rgba(255,170,70,0) 70%)" }} />
        <div style={{ position: "absolute", left: (W - 168) / 2, top: 1192, width: 168, height: 280, display: "flex" }}>{art(LampSvg({ id: "card", lit: true, glow: true }), 168, 280)}</div>

        {/* blessing plaque */}
        <div style={{ position: "absolute", left: 0, top: 1470, width: W, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 34px", border: `1.5px solid ${GOLD}`, borderRadius: 999, background: "rgba(23,6,9,0.55)" }}>
            <div style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)", display: "flex" }} />
            <div style={{ display: "flex", fontFamily: "NotoSerifTamil", fontSize: 26, color: CHAMPAGNE }}>வாழ்க வளமுடன்</div>
            <div style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)", display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
