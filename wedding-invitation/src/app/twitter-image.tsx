export const runtime = "nodejs";

import { OG_SIZE, renderOgImage } from "@/lib/og";
import { wedding } from "@/data/wedding";

export const alt = `${wedding.couple.display} — Wedding Invitation, ${wedding.dates.range}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgImage();
}
