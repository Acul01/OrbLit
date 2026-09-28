"use client";

import { useEffect, useRef, useState } from "react";

// 10 papers sharing just 5 orbits (2 objects per ring, placed roughly
// opposite each other) — keeps the visualization compact/tidy instead of
// spreading 10 rings out wide. Each pair still moves independently
// (different period/direction), so they drift apart over time rather
// than staying locked opposite one another. Fully connected to every
// other paper — a complete graph (10 choose 2 = 45 edges), the same
// shape as a citation network where everything is reachable from
// everything else. Positions are computed every frame via
// requestAnimationFrame (not pure CSS) so the connecting lines can track
// independently-moving points.
const COLORS = ["#4FD1C5", "#E8E6DE", "#C9A227", "#7C9CFF", "#E07856"];
const RING_RADII = [72, 108, 144, 180, 216];
const OBJECTS = Array.from({ length: 10 }, (_, i) => {
  const ring = i % RING_RADII.length;
  const slot = Math.floor(i / RING_RADII.length); // 0 or 1 within the ring
  return {
    radius: RING_RADII[ring],
    period: 16 + ring * 4 + slot * 7,
    startAngle: (ring * Math.PI * 2) / RING_RADII.length + slot * Math.PI,
    direction: slot === 0 ? 1 : -1,
    size: 5 + (i % 4),
    color: COLORS[i % COLORS.length],
  };
});

const VIEW = 460;
const CENTER = VIEW / 2;

export default function OrbitHero() {
  const [angles, setAngles] = useState(() => OBJECTS.map((o) => o.startAngle));
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    function tick(now) {
      if (startRef.current == null) startRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      setAngles(
        OBJECTS.map(
          (o) => o.startAngle + o.direction * (elapsed / o.period) * Math.PI * 2
        )
      );
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const points = OBJECTS.map((o, i) => ({
    x: CENTER + Math.cos(angles[i]) * o.radius,
    y: CENTER + Math.sin(angles[i]) * o.radius,
    ...o,
  }));

  const ringRadii = [...new Set(OBJECTS.map((o) => o.radius))];

  const edges = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      edges.push([points[i], points[j]]);
    }
  }

  return (
    <div style={styles.wrap} aria-hidden="true">
      <style>{`
        @keyframes orblit-star-pulse {
          0%, 100% { box-shadow: 0 0 24px 6px rgba(79, 209, 197, 0.45); }
          50% { box-shadow: 0 0 40px 12px rgba(79, 209, 197, 0.65); }
        }
      `}</style>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        style={styles.svg}
      >
        {ringRadii.map((r) => (
          <circle
            key={r}
            cx={CENTER}
            cy={CENTER}
            r={r}
            fill="none"
            stroke="rgba(232, 230, 222, 0.08)"
            strokeWidth={1}
          />
        ))}

        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#4FD1C5"
            strokeOpacity={0.1}
            strokeWidth={0.75}
          />
        ))}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.size / 2}
            fill={p.color}
            style={{ filter: `drop-shadow(0 0 4px ${p.color}aa)` }}
          />
        ))}
      </svg>

      <div style={styles.star} />
    </div>
  );
}

const styles = {
  wrap: {
    position: "relative",
    width: VIEW,
    height: VIEW,
    maxWidth: "90vw",
    maxHeight: "90vw",
    margin: "0 auto",
  },
  svg: { position: "absolute", inset: 0, overflow: "visible" },
  star: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 20,
    height: 20,
    marginTop: -10,
    marginLeft: -10,
    borderRadius: "50%",
    background: "#4FD1C5",
    animation: "orblit-star-pulse 3s ease-in-out infinite",
  },
};
