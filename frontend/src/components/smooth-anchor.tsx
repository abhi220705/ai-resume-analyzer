"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";

type SmoothAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

let cancelActiveScroll: (() => void) | null = null;

export function SmoothAnchor({
  href,
  onClick,
  ...props
}: SmoothAnchorProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !href.startsWith("#")
    ) {
      return;
    }

    const target = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!target) return;

    event.preventDefault();
    if (window.location.hash !== href) {
      window.history.pushState(null, "", href);
    }

    cancelActiveScroll?.();

    const startY = window.scrollY;
    const scrollMargin = Number.parseFloat(
      window.getComputedStyle(target).scrollMarginTop,
    );
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    const targetY = Math.min(
      maxScroll,
      Math.max(
        0,
        startY + target.getBoundingClientRect().top - (scrollMargin || 0),
      ),
    );
    const distance = targetY - startY;

    if (Math.abs(distance) < 1) return;

    const duration = Math.min(720, Math.max(320, Math.abs(distance) * 0.45));
    const startTime = performance.now();
    let frame = 0;

    const cleanup = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("wheel", cleanup);
      window.removeEventListener("touchstart", cleanup);
      window.removeEventListener("pointerdown", cleanup);
      window.removeEventListener("keydown", cleanup);
      if (cancelActiveScroll === cleanup) cancelActiveScroll = null;
    };

    cancelActiveScroll = cleanup;
    window.addEventListener("wheel", cleanup, { passive: true });
    window.addEventListener("touchstart", cleanup, { passive: true });
    window.addEventListener("pointerdown", cleanup);
    window.addEventListener("keydown", cleanup);

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo({
        top: startY + distance * eased,
        behavior: "instant",
      });

      if (progress < 1) frame = window.requestAnimationFrame(animate);
      else cleanup();
    };

    frame = window.requestAnimationFrame(animate);
  }

  return <a {...props} href={href} onClick={handleClick} />;
}