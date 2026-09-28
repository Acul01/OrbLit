"use client";

import { btnStyle } from "@/lib/ui-styles";

/** Two overlapping <input type="range"> sliders (min + max) per field —
 *  the standard lightweight pattern for a dual-handle range without a
 *  dedicated library. Both tracks are pointer-events:none (via the
 *  .orblit-range CSS below) so only the thumbs are draggable — otherwise
 *  clicking the top slider's track would always win. `range` is
 *  [min, max] or null (unfiltered, shown at the full data bounds).
 *  Moving a slider clamps min <= max. */
function RangeField({ label, min, max, range, onChange, step = 1 }) {
  const [lo, hi] = range || [min, max];
  const disabled = min === max;

  function setLo(v) {
    const next = Math.min(v, hi);
    onChange(next === min && hi === max ? null : [next, hi]);
  }
  function setHi(v) {
    const next = Math.max(v, lo);
    onChange(lo === min && next === max ? null : [lo, next]);
  }

  return (
    <div style={s.field}>
      <div style={s.fieldHeader}>
        <span>{label}</span>
        <span style={s.fieldValue}>{disabled ? min : `${lo} – ${hi}`}</span>
      </div>
      <div style={s.sliderStack}>
        <input
          className="orblit-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          disabled={disabled}
          onChange={(e) => setLo(Number(e.target.value))}
          style={s.slider}
        />
        <input
          className="orblit-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          disabled={disabled}
          onChange={(e) => setHi(Number(e.target.value))}
          style={s.slider}
        />
      </div>
    </div>
  );
}

export default function FiltersPanel({
  bounds,
  citRange,
  setCitRange,
  yearRange,
  setYearRange,
  linksRange,
  setLinksRange,
  onReset,
}) {
  return (
    <div style={s.panel}>
      <style>{`
        .orblit-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          pointer-events: none;
        }
        .orblit-range::-webkit-slider-runnable-track {
          height: 2px;
          background: #2A3B5C;
        }
        .orblit-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          pointer-events: auto;
          width: 13px;
          height: 13px;
          margin-top: -5.5px;
          border-radius: 50%;
          background: #4FD1C5;
          cursor: pointer;
        }
        .orblit-range::-moz-range-track {
          height: 2px;
          background: #2A3B5C;
        }
        .orblit-range::-moz-range-thumb {
          pointer-events: auto;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #4FD1C5;
          cursor: pointer;
          border: none;
        }
        .orblit-range:disabled::-webkit-slider-thumb { background: #3a4a68; cursor: default; }
        .orblit-range:disabled::-moz-range-thumb { background: #3a4a68; cursor: default; }
      `}</style>
      <div style={s.header}>
        <span style={s.headerLabel}>Filter the map</span>
        <button onClick={onReset} style={btnStyle()}>
          Reset
        </button>
      </div>
      <RangeField
        label="Citations"
        min={bounds.citMin}
        max={bounds.citMax}
        range={citRange}
        onChange={setCitRange}
      />
      <RangeField
        label="Publication year"
        min={bounds.yearMin}
        max={bounds.yearMax}
        range={yearRange}
        onChange={setYearRange}
      />
      <RangeField
        label="Network links"
        min={bounds.linksMin}
        max={bounds.linksMax}
        range={linksRange}
        onChange={setLinksRange}
      />
    </div>
  );
}

const s = {
  panel: {
    marginTop: 10,
    background: "#121B2E",
    border: "1px solid #24314C",
    borderRadius: 8,
    padding: 12,
    fontFamily: "ui-sans-serif, system-ui",
    fontSize: 12,
    width: 300,
    maxWidth: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLabel: { color: "#7C8AA3" },
  field: { marginBottom: 14 },
  fieldHeader: {
    display: "flex",
    justifyContent: "space-between",
    color: "#E8E6DE",
    marginBottom: 4,
  },
  fieldValue: { color: "#4FD1C5", fontVariantNumeric: "tabular-nums" },
  sliderStack: { position: "relative", height: 16 },
  slider: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    margin: 0,
  },
};
