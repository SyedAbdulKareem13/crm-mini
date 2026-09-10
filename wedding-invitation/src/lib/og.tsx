import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { wedding } from "@/data/wedding";

const font = (file: string) => readFile(join(process.cwd(), "src/app/fonts", file));

/** The three bundled TTFs used by every server-rendered image (Satori needs TTF/OTF). */
export async function loadFonts() {
  const [serif, italic, tamil] = await Promise.all([
    font("CormorantGaramond-SemiBold.ttf"),
    font("CormorantGaramond-MediumItalic.ttf"),
    font("NotoSerifTamil-Medium.ttf"),
  ]);
  return [
    { name: "Cormorant", data: serif, weight: 600 as const, style: "normal" as const },
    { name: "Cormorant", data: italic, weight: 500 as const, style: "italic" as const },
    { name: "NotoSerifTamil", data: tamil, weight: 500 as const, style: "normal" as const },
  ];
}

export const OG_SIZE = { width: 1200, height: 630 };

/** Shared Open Graph / Twitter card — maroon silk, antique gold, the names, the dates. */
export async function renderOgImage() {
  const [serif, italic, tamil] = await Promise.all([
    font("CormorantGaramond-SemiBold.ttf"),
    font("CormorantGaramond-MediumItalic.ttf"),
    font("NotoSerifTamil-Medium.ttf"),
  ]);

  const gold = "#d8b25e";
  const dots = Array.from({ length: 9 }, (_, i) => i);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(70% 70% at 50% 40%, #5a1020 0%, #3a0a12 45%, #120507 100%)",
          color: "#f6eedf",
          fontFamily: "Cormorant",
          position: "relative",
        }}
      >
        {/* double gold border */}
        <div style={{ position: "absolute", inset: 26, border: `2px solid ${gold}`, borderRadius: 8, opacity: 0.9, display: "flex" }} />
        <div style={{ position: "absolute", inset: 38, border: `1px solid ${gold}`, borderRadius: 4, opacity: 0.55, display: "flex" }} />

        {/* pulli dots top & bottom */}
        <div style={{ position: "absolute", top: 60, display: "flex", gap: 14 }}>
          {dots.map((i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: gold, opacity: i === 4 ? 1 : 0.55, display: "flex" }} />
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 60, display: "flex", gap: 14 }}>
          {dots.map((i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: gold, opacity: i === 4 ? 1 : 0.55, display: "flex" }} />
          ))}
        </div>

        {/* lamp */}
        <svg width="84" height="120" viewBox="0 0 200 320" style={{ marginBottom: 6 }}>
          <path d="M100 118 C118 140 122 160 100 176 C78 160 82 140 100 118 Z" fill="#ffcf5a" />
          <path d="M100 138 C108 150 108 162 100 170 C92 162 92 150 100 138 Z" fill="#fff4d0" />
          <ellipse cx="100" cy="298" rx="60" ry="13" fill={gold} />
          <ellipse cx="100" cy="285" rx="42" ry="9" fill="#b8913a" />
          <path d="M92 279 C88 262 97 252 97 238 C97 226 86 221 86 210 C86 199 97 195 97 185 H103 C103 195 114 199 114 210 C114 221 103 226 103 238 C103 252 112 262 108 279 Z" fill={gold} />
          <path d="M40 176 C40 196 68 208 100 208 C132 208 160 196 160 176 Z" fill="#b8913a" />
          <ellipse cx="100" cy="176" rx="60" ry="10" fill={gold} />
        </svg>

        <div style={{ display: "flex", fontSize: 30, letterSpacing: 10, textTransform: "uppercase", color: gold, opacity: 0.9, fontFamily: "Cormorant" }}>
          Wedding Invitation
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 26, marginTop: 10 }}>
          <div style={{ fontSize: 112, color: "#f3e4bd", fontWeight: 600, display: "flex" }}>{wedding.couple.bride.name}</div>
          <div style={{ fontSize: 86, color: gold, fontStyle: "italic", fontWeight: 500, display: "flex" }}>&amp;</div>
          <div style={{ fontSize: 112, color: "#f3e4bd", fontWeight: 600, display: "flex" }}>{wedding.couple.groom.name}</div>
        </div>

        <div style={{ display: "flex", fontFamily: "NotoSerifTamil", fontSize: 30, color: "#e8cf8a", marginTop: 6 }}>
          {wedding.couple.bride.tamil} &amp; {wedding.couple.groom.tamil}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 26 }}>
          <div style={{ width: 90, height: 1, background: gold, display: "flex", opacity: 0.8 }} />
          <div style={{ fontSize: 40, color: "#f6eedf", display: "flex", letterSpacing: 2 }}>{wedding.dates.range}</div>
          <div style={{ width: 90, height: 1, background: gold, display: "flex", opacity: 0.8 }} />
        </div>

        <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: "#f6eedf", opacity: 0.7, marginTop: 14, textTransform: "uppercase" }}>
          Palladam · Tirupur
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Cormorant", data: serif, weight: 600, style: "normal" },
        { name: "Cormorant", data: italic, weight: 500, style: "italic" },
        { name: "NotoSerifTamil", data: tamil, weight: 500, style: "normal" },
      ],
    },
  );
}
