"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ThemeScrollbar
 * A fixed-position, brand-themed scrollbar that fades out when idle.
 * Replaces the native scrollbar (hidden via CSS) so it never affects layout.
 */
export function ThemeScrollbar() {
  const [top, setTop] = useState(0);
  const [height, setHeight] = useState(0);
  const [visible, setVisible] = useState(false);

  const hideTimer = useRef<number | null>(null);
  const heightRef = useRef(0);
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null);

  const recompute = () => {
    const doc = document.documentElement;
    const scrollHeight = doc.scrollHeight;
    const viewportHeight = window.innerHeight;

    if (scrollHeight <= viewportHeight) {
      setHeight(0);
      heightRef.current = 0;
      return;
    }

    const ratio = viewportHeight / scrollHeight;
    const thumbHeight = Math.max(44, Math.round(viewportHeight * ratio));
    const maxTop = viewportHeight - thumbHeight - 8;
    const scrollRatio =
      window.scrollY / (scrollHeight - viewportHeight || 1);

    setTop(4 + maxTop * scrollRatio);
    setHeight(thumbHeight);
    heightRef.current = thumbHeight;
  };

  const show = () => {
    setVisible(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      hideTimer.current = null;
    }, 700);
  };

  useEffect(() => {
    recompute();

    const onScroll = () => {
      recompute();
      show();
    };
    const onResize = () => recompute();

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const deltaY = e.clientY - drag.startY;
      const doc = document.documentElement;
      const viewportHeight = window.innerHeight;
      const scrollableTrack = viewportHeight - 8 - heightRef.current;
      const scrollableContent = doc.scrollHeight - viewportHeight;
      if (scrollableTrack <= 0) return;
      window.scrollTo(
        0,
        drag.startScroll + (deltaY / scrollableTrack) * scrollableContent
      );
      show();
    };
    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (height === 0) return null;

  return (
    <div
      className={`theme-scrollbar${visible ? " is-visible" : ""}`}
      aria-hidden="true"
    >
      <div
        className="theme-scrollbar-thumb"
        style={{ top: `${top}px`, height: `${height}px` }}
        onPointerDown={(e) => {
          e.preventDefault();
          dragRef.current = {
            startY: e.clientY,
            startScroll: window.scrollY,
          };
          show();
        }}
      />
    </div>
  );
}
