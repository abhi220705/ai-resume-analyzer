"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated hero background.
 * A continuously-looping WebM plays on top of an animated GIF fallback.
 * Both layers share the same box (see `.hero-media-bg` in globals.css); the
 * GIF is always rendered and the video only becomes visible once it's
 * confirmed to be playing, so a failed/blocked video can never blank the hero.
 */
export function HeroBackgroundMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // If WebM isn't supported at all, don't even try — GIF handles it.
    if (!video.canPlayType("video/webm")) return;

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const onPlaying = () => setVideoPlaying(true);
    const onError = () => setVideoPlaying(false);

    video.addEventListener("playing", onPlaying);
    video.addEventListener("error", onError);

    tryPlay();

    // The video starts from the server-rendered HTML, so it is often already
    // running before this effect attaches the listener above. In that case
    // `playing` never fires again and the GIF would stay visible forever.
    if (!video.paused && video.readyState >= 2) setVideoPlaying(true);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", tryPlay);
    window.addEventListener("pageshow", tryPlay);

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", tryPlay);
      window.removeEventListener("pageshow", tryPlay);
    };
  }, []);

  return (
    <div className="hero-media-container" aria-hidden="true">
      {/* Animated GIF — always present, acts as the base layer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/lumen-bloom-4932.gif"
        alt=""
        className="hero-media-bg"
        style={{
          opacity: videoPlaying ? 0 : 1,
          transition: "opacity 400ms ease",
        }}
      />

      {/* WebM video — sits on top, fades in only after it's actually playing. */}
      <video
        ref={videoRef}
        className="hero-media-bg"
        style={{
          opacity: videoPlaying ? 1 : 0,
          transition: "opacity 400ms ease",
        }}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/assets/lumen-bloom-4932.webm" type="video/webm" />
      </video>

      <div className="hero-media-overlay" />
    </div>
  );
}

// Backward compatibility alias
export const HeroShaderAnimation = HeroBackgroundMedia;
