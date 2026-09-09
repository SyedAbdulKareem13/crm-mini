import { Hero } from "@/components/hero/Hero";
import { Couple } from "@/components/couple/Couple";
import { Story } from "@/components/story/Story";
import { Timeline } from "@/components/timeline/Timeline";
import { Reception } from "@/components/venues/Reception";
import { Sacred } from "@/components/venues/Sacred";
import { Finale } from "@/components/finale/Finale";
import { Loader } from "@/components/hero/Loader";
import { SmoothScroll } from "@/components/effects/SmoothScroll";
import { Petals } from "@/components/effects/Petals";
import { CursorGlow } from "@/components/effects/CursorGlow";
import { SceneNav } from "@/components/effects/SceneNav";
import { FloatingControls } from "@/components/ui/FloatingControls";
import { wedding } from "@/data/wedding";

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${wedding.couple.display} — Wedding`,
    description: wedding.seo.description,
    startDate: wedding.events[0].start,
    endDate: wedding.events[2].end,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: wedding.events
      .filter((e) => e.venue)
      .map((e) => ({
        "@type": "Place",
        name: e.venue!.name,
        address: { "@type": "PostalAddress", addressLocality: e.venue!.city, addressRegion: "Tamil Nadu", addressCountry: "IN" },
      })),
  };

  return (
    <SmoothScroll>
      <Loader />
      <Petals />
      <CursorGlow />
      <div className="grain" aria-hidden />
      <SceneNav />
      <FloatingControls />
      <main id="top" className="relative">
        <Hero />
        <Couple />
        <Story />
        <Timeline />
        <Reception />
        <Sacred />
        <Finale />
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </SmoothScroll>
  );
}
