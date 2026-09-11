/**
 * ─────────────────────────────────────────────────────────────
 *  DHARANI & BARATH — single source of truth for the invitation
 *  Edit this file only; every scene reads from here.
 *  Times are Indian Standard Time (UTC+05:30).
 * ─────────────────────────────────────────────────────────────
 */

export type Motif = "ring" | "lamp" | "temple";
export type Tone = "morning" | "evening" | "dawn";

export interface Venue {
  name: string;
  tamil?: string;
  city: string;
  cityTamil?: string;
  /** Free-text search used for "Open in Maps" and the embedded map */
  mapsQuery: string;
}

export interface WeddingEvent {
  id: "engagement" | "reception" | "wedding";
  title: string;
  tamil: string;
  subtitle?: string;
  motif: Motif;
  dateLabel: string;
  weekday: string;
  timeLabel: string;
  /** ISO 8601 with offset — used for countdown + calendar files */
  start: string;
  end: string;
  /** null → the card shows “Venue to be announced” */
  venue: Venue | null;
  description: string;
  /** which day of the celebration (see `days`) */
  day: 1 | 2;
  /** time-of-day accent used by the programme */
  tone: Tone;
  /** the rituals / moments guests will witness */
  moments: readonly string[];
}

export const wedding = {
  couple: {
    bride: {
      name: "Dharani",
      tamil: "தாரணி",
      initial: "D",
      /** e.g. "Daughter of Mr. & Mrs. …" — leave empty to hide */
      parents: "",
      /** Optional portrait placed inside the arch frame: "/photos/dharani.jpg" */
      photo: "",
    },
    groom: {
      name: "Barath",
      tamil: "பரத்",
      initial: "B",
      parents: "",
      photo: "",
    },
    /** Displayed monogram order */
    display: "Dharani & Barath",
    hashtag: "#DharaniWedsBarath",
  },

  /** Headline dates used in the hero, OG image and finale */
  dates: {
    range: "24 – 25 October 2026",
    rangeShort: "24–25 Oct 2026",
    year: "2026",
  },

  tagline: {
    en: "Two hearts. One beautiful beginning.",
    ta: "இரு இதயங்கள் இணைந்து, ஒரு புதிய வாழ்க்கைப் பயணம் தொடங்கும் தருணம்…",
  },

  invitation: {
    eyebrow: "With the blessings of our families",
    eyebrowTamil: "பெரியோர்களின் ஆசியுடன்",
    line: "We joyfully invite you to celebrate the union of",
    lineTamil: "எங்கள் திருமண விழாவிற்கு உங்களை அன்புடன் அழைக்கிறோம்",
  },

  days: [
    { n: 1, label: "Day One", tamil: "முதல் நாள்", dateLabel: "Saturday, 24 October 2026" },
    { n: 2, label: "Day Two", tamil: "இரண்டாம் நாள்", dateLabel: "Sunday, 25 October 2026" },
  ],

  events: [
    {
      id: "engagement",
      title: "Engagement",
      tamil: "நிச்சயதார்த்தம்",
      motif: "ring",
      dateLabel: "24 October 2026",
      weekday: "Saturday",
      timeLabel: "10:00 AM – 12:00 PM",
      start: "2026-10-24T10:00:00+05:30",
      end: "2026-10-24T12:00:00+05:30",
      venue: {
        name: "SGS Mahal",
        tamil: "எஸ்.ஜி.எஸ். மஹால்",
        city: "Palladam",
        cityTamil: "பல்லடம்",
        mapsQuery: "SGS Mahal, Palladam, Tamil Nadu",
      },
      description: "Two families, one beautiful beginning — surrounded by love and cherished traditions.",
      day: 1,
      tone: "morning",
      moments: ["Thamboolam exchange", "Ring ceremony", "Elders’ blessings"],
    },
    {
      id: "reception",
      title: "Reception",
      tamil: "வரவேற்பு விழா",
      motif: "lamp",
      dateLabel: "24 October 2026",
      weekday: "Saturday",
      timeLabel: "6:00 PM – 9:00 PM",
      start: "2026-10-24T18:00:00+05:30",
      end: "2026-10-24T21:00:00+05:30",
      venue: {
        name: "SGS Mahal",
        tamil: "எஸ்.ஜி.எஸ். மஹால்",
        city: "Palladam",
        cityTamil: "பல்லடம்",
        mapsQuery: "SGS Mahal, Palladam, Tamil Nadu",
      },
      description: "Our forever deserves a little celebration — come laugh, dine, dance and make memories with us!",
      day: 1,
      tone: "evening",
      moments: ["Couple’s entry", "Dinner", "Music & celebrations"],
    },
    {
      id: "wedding",
      title: "Wedding",
      subtitle: "Muhurtham",
      tamil: "திருமணம்",
      motif: "temple",
      dateLabel: "25 October 2026",
      weekday: "Sunday",
      timeLabel: "7:45 AM – 9:00 AM",
      start: "2026-10-25T07:45:00+05:30",
      end: "2026-10-25T09:00:00+05:30",
      venue: {
        name: "Konganagiri Murugan Temple",
        tamil: "கொங்கணகிரி முருகன் கோயில்",
        city: "Tirupur",
        cityTamil: "திருப்பூர்",
        mapsQuery: "Konganagiri Murugan Temple, Tirupur, Tamil Nadu",
      },
      description: "With Lord Murugan’s blessings above us and our loved ones beside us, two hearts unite as one.",
      day: 2,
      tone: "dawn",
      moments: ["Kanyadanam", "Mangalya dharanam — tying of the thali", "Aarti & blessings"],
    },
  ] as WeddingEvent[],

  /** Poetic moments that appear as visual scenes */
  quotes: {
    story: {
      ta: "அன்பின் தொடக்கம்… அழகான ஒரு புதிய அத்தியாயம்…",
      en: "The beginning of love. A beautiful new chapter.",
    },
    union: {
      ta: "இணையும் இரு மனங்கள், இணைந்திடும் இரு குடும்பங்கள்.",
      en: "Two hearts unite, and two families become one.",
    },
    blessing: {
      ta: "உங்கள் அன்பும் ஆசீர்வாதமும் எங்கள் புதிய பயணத்தின் முதல் பரிசு.",
      en: "Your love and blessings are the first gift of our new journey.",
    },
    finale: {
      en: "With love, we begin forever.",
      ta: "வாழ்க வளமுடன் · நூறாண்டு வாழ்க",
    },
  },

  /**
   * Downloadable invitation card. The site renders its own card at /invite.png from the same art
   * and fonts. To use a designed image instead, drop it in /public/invite/ and set
   * image: "/invite/royal-invitation.jpg".
   */
  invite: {
    image: "",
    filename: "Dharani-Barath-Wedding-Invitation.png",
    /**
     * Tamil line printed on the generated card. The card renderer (Satori) cannot reorder
     * prefixed vowel signs (ெ ே ை ொ ோ), so keep this line to letters with pulli or
     * post-base vowels only — this one shapes correctly: “two hearts as one · live a hundred years”.
     */
    tamilLine: "இரு இதயங்கள் ஒன்றாய் · நூறாண்டு வாழ்க",
  },

  /** Optional ambient audio. Drop a file in /public/audio and set src: "/audio/ambient.mp3" */
  audio: {
    src: "",
    label: "Ambient music",
    /** start playing when the guest opens the curtain (their tap is the gesture) */
    playOnOpen: true,
  },

  /**
   * Optional “send your wishes” — WhatsApp number in international format
   * without “+” (e.g. "919876543210"). Leave empty to hide the button.
   */
  wishes: {
    whatsapp: "",
    message: "Dear Dharani & Barath, heartfelt wishes for your wedding! 💛",
  },

  share: {
    title: "Dharani & Barath — Wedding Invitation",
    text: "You are warmly invited to the wedding of Dharani & Barath · 24–25 October 2026 · Palladam & Tirupur",
  },

  seo: {
    siteName: "Dharani & Barath",
    description:
      "Dharani & Barath invite you to their wedding celebrations — Engagement & Reception on 24 October 2026 at SGS Mahal, Palladam, and the Muhurtham on 25 October 2026 at Konganagiri Murugan Temple, Tirupur.",
    keywords: ["Dharani", "Barath", "wedding", "invitation", "Tirupur", "Palladam", "Tamil wedding", "2026"],
  },

  timezone: "Asia/Kolkata",
} as const;

export type Wedding = typeof wedding;

export const muhurtham = wedding.events.find((e) => e.id === "wedding")!;
