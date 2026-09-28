"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

// Same slider chrome as before (frame, prev/next arrows, dots), now
// showing silent looping video clips of each feature instead of static
// screenshots. Only the active slide's <video> ever gets a `src` — the
// other four don't start downloading until you actually navigate to
// them, so a first-time visitor only ever pays for one ~2-8MB clip, not
// all ~28MB at once. `slide.video` takes priority over `slide.src`
// (image) if both are present, but every current slide is video-only.
export default function FeatureSlider({ slides }) {
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState(() => new Set([0]));

  function go(delta) {
    setIndex((i) => {
      const next = (i + delta + slides.length) % slides.length;
      setVisited((v) => new Set(v).add(next));
      return next;
    });
  }

  function goTo(i) {
    setIndex(i);
    setVisited((v) => new Set(v).add(i));
  }

  return (
    <div style={s.wrap}>
      <div style={s.viewport}>
        <div
          style={{
            ...s.track,
            width: `${slides.length * 100}%`,
            transform: `translateX(-${index * (100 / slides.length)}%)`,
          }}
        >
          {slides.map((slide, i) => (
            <div key={slide.video || slide.src} style={{ ...s.slide, width: `${100 / slides.length}%` }}>
              <div style={s.frame}>
                {slide.video ? (
                  visited.has(i) ? (
                    <video
                      src={slide.video}
                      width={slide.width}
                      height={slide.height}
                      style={{ ...s.media, aspectRatio: `${slide.width} / ${slide.height}` }}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={slide.alt}
                    />
                  ) : (
                    <div style={{ ...s.media, ...s.mediaPlaceholder, aspectRatio: `${slide.width} / ${slide.height}` }} />
                  )
                ) : (
                  <Image src={slide.src} alt={slide.alt} width={slide.width} height={slide.height} style={s.media} />
                )}
              </div>
              <div style={s.caption}>
                <strong style={s.captionTitle}>{slide.title}</strong>
                <span>{slide.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={() => go(-1)} style={{ ...s.arrow, left: -18 }} aria-label="Previous">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => go(1)} style={{ ...s.arrow, right: -18 }} aria-label="Next">
            <ChevronRight size={18} />
          </button>
          <div style={s.dots}>
            {slides.map((slide, i) => (
              <button
                key={slide.video || slide.src}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                style={{ ...s.dot, background: i === index ? "#4FD1C5" : "#2A3B5C" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  wrap: { position: "relative", maxWidth: 900, margin: "0 auto" },
  viewport: { overflow: "hidden", borderRadius: 12 },
  track: { display: "flex", transition: "transform 350ms ease" },
  slide: { flexShrink: 0, padding: "0 2px", boxSizing: "border-box" },
  frame: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #22304a",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    background: "#111A2C",
    padding: 14,
    boxSizing: "border-box",
  },
  media: { width: "100%", height: "auto", display: "block", borderRadius: 6 },
  mediaPlaceholder: { aspectRatio: "16 / 9", background: "#0B1220" },
  caption: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 14,
    fontSize: 14,
    color: "#B9C2D0",
  },
  captionTitle: { color: "#E8E6DE", fontSize: 15 },
  arrow: {
    position: "absolute",
    top: "38%",
    transform: "translateY(-50%)",
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid #2A3B5C",
    background: "#111A2C",
    color: "#E8E6DE",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  dots: { display: "flex", justifyContent: "center", gap: 8, marginTop: 18 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
};
