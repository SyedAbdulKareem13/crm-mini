import type { WeddingEvent } from "@/data/wedding";
import { wedding } from "@/data/wedding";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO w/ offset → UTC basic format YYYYMMDDTHHMMSSZ */
export function toUtcBasic(iso: string): string {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function eventLocation(ev: WeddingEvent): string {
  return ev.venue ? `${ev.venue.name}, ${ev.venue.city}` : "";
}

export function eventTitle(ev: WeddingEvent): string {
  return `${wedding.couple.display} — ${ev.title}${ev.subtitle ? ` (${ev.subtitle})` : ""}`;
}

export function googleCalendarUrl(ev: WeddingEvent): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle(ev),
    dates: `${toUtcBasic(ev.start)}/${toUtcBasic(ev.end)}`,
    details: ev.description,
    location: eventLocation(ev),
    ctz: wedding.timezone,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function buildIcs(ev: WeddingEvent): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dharani & Barath//Wedding Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}-2026@dharani-barath`,
    `DTSTAMP:${toUtcBasic(new Date().toISOString())}`,
    `DTSTART:${toUtcBasic(ev.start)}`,
    `DTEND:${toUtcBasic(ev.end)}`,
    `SUMMARY:${esc(eventTitle(ev))}`,
    `DESCRIPTION:${esc(ev.description)}`,
    `LOCATION:${esc(eventLocation(ev))}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(ev: WeddingEvent) {
  const blob = new Blob([buildIcs(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dharani-barath-${ev.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=15`;
}

export function whatsappUrl(text: string, number?: string): string {
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}
