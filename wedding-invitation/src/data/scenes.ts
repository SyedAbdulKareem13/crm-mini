export const SCENES = [
  { id: "opening", label: "The Beginning", ta: "தொடக்கம்" },
  { id: "couple", label: "Two Hearts", ta: "இரு இதயங்கள்" },
  { id: "story", label: "A New Chapter", ta: "புதிய அத்தியாயம்" },
  { id: "celebration", label: "The Celebration", ta: "விழா" },
  { id: "reception", label: "The Evening", ta: "வரவேற்பு" },
  { id: "sacred", label: "The Sacred Moment", ta: "முகூர்த்தம்" },
  { id: "finale", label: "Together", ta: "ஒன்றாய்" },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];
