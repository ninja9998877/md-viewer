import { useCallback, useEffect, useRef, useState } from "react";
import type { Messages } from "../i18n";

interface ImageLightboxProps {
  src: string;
  alt: string;
  t: Messages;
  onClose: () => void;
}

/** Scale a double-tap jumps to. Enough to read a diagram, not so much that the
 *  reader is immediately lost in it. */
const ZOOM = 2.5;
const MAX_ZOOM = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Full-screen viewer for a single image.
 *
 * This is the controlled replacement for pinch-zoom. The WebView deliberately
 * has `user-scalable=no` — leaving it on let iOS get stuck in a zoomed state it
 * could not pan out of, with no way back. But turning it off also removed any
 * way to enlarge a diagram, which on a phone is most of the value of an
 * Agent-written document. Zooming one image inside a container we control gets
 * both: the gesture is available, and it always has a way out.
 */
export function ImageLightbox({ src, alt, t, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    // Capture phase: the app also listens for Escape (to close the find bar and
    // the contents list) and would otherwise swallow this one.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Wheel zoom needs a non-passive listener; React registers `onWheel` as
  // passive, so preventDefault there would be ignored and the page behind would
  // scroll while zooming.
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale((current) => {
        const next = clamp(current * (event.deltaY < 0 ? 1.15 : 0.87), 1, MAX_ZOOM);
        if (next === 1) setOffset({ x: 0, y: 0 });
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const toggleZoom = useCallback(() => {
    setScale((current) => {
      if (current > 1) {
        setOffset({ x: 0, y: 0 });
        return 1;
      }
      return ZOOM;
    });
  }, []);

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt || t.lightboxClose}
      onClick={onClose}
    >
      <img
        ref={imgRef}
        className="lightbox__img"
        src={src}
        alt={alt}
        draggable={false}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          cursor: scale > 1 ? "grab" : "zoom-in",
        }}
        // Clicks and drags on the image must not reach the backdrop, which closes.
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          event.stopPropagation();
          toggleZoom();
        }}
        onPointerDown={(event) => {
          if (scale <= 1) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { px: event.clientX, py: event.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(event) => {
          const state = drag.current;
          if (!state) return;
          setOffset({
            x: state.ox + (event.clientX - state.px),
            y: state.oy + (event.clientY - state.py),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      <div className="lightbox__hint">{t.lightboxHint}</div>
      <button
        type="button"
        className="lightbox__close"
        aria-label={t.lightboxClose}
        title={t.lightboxClose}
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}
