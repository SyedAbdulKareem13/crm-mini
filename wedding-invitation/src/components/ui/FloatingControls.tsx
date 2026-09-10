"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { wedding } from "@/data/wedding";
import { IconCheck, IconShare, IconSoundOff, IconSoundOn } from "./Icons";
import { cn } from "@/lib/utils";

/**
 * Bottom-right cluster: optional ambient sound toggle + share.
 * Audio is opt-in only, starts on user gesture, fades in/out gently.
 */
export function FloatingControls() {
  const { introDone } = useExperience();
  const wrap = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasAudio = Boolean(wedding.audio.src);

  useEffect(() => {
    if (!introDone) return;
    gsap.fromTo(wrap.current, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, delay: 0.6 });
  }, [introDone]);

  const toggleSound = useCallback(() => {
    if (!hasAudio) return;
    if (!audio.current) {
      const a = new Audio(wedding.audio.src);
      a.loop = true;
      a.volume = 0;
      a.preload = "auto";
      audio.current = a;
    }
    const a = audio.current;
    if (playing) {
      gsap.to(a, { volume: 0, duration: 1.2, onComplete: () => a.pause() });
      setPlaying(false);
    } else {
      a.play().then(() => gsap.to(a, { volume: 0.55, duration: 2 })).catch(() => setPlaying(false));
      setPlaying(true);
    }
  }, [hasAudio, playing]);

  // the curtain tap is a user gesture, so ambient music may begin then
  useEffect(() => {
    if (!hasAudio || !wedding.audio.playOnOpen) return;
    const onOpen = () => {
      if (!playing) toggleSound();
    };
    window.addEventListener("invite:open", onOpen, { once: true });
    return () => window.removeEventListener("invite:open", onOpen);
  }, [hasAudio, playing, toggleSound]);

  const share = useCallback(async () => {
    const url = window.location.href;
    const data = { title: wedding.share.title, text: wedding.share.text, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch {
      /* user dismissed */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div
      ref={wrap}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[55] flex flex-col gap-3 opacity-0 sm:bottom-6 sm:right-6"
    >
      {hasAudio && (
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={playing}
          aria-label={playing ? "Mute ambient music" : "Play ambient music"}
          className="glass-dark flex h-12 w-12 items-center justify-center rounded-full text-gold-light transition-transform duration-500 hover:scale-105"
        >
          {playing ? <IconSoundOn className="text-xl" /> : <IconSoundOff className="text-xl" />}
        </button>
      )}
      <button
        type="button"
        onClick={share}
        aria-label="Share this invitation"
        className={cn("glass-dark flex h-12 w-12 items-center justify-center rounded-full text-gold-light transition-transform duration-500 hover:scale-105", copied && "text-green")}
      >
        {copied ? <IconCheck className="text-xl" /> : <IconShare className="text-xl" />}
      </button>
    </div>
  );
}
