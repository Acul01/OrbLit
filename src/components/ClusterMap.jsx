"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  Loader2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Tag,
  Wand2,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import { btnStyle, iconBtnStyle } from "@/lib/ui-styles";
import { TAG_PALETTE } from "@/lib/citation-graph";

const SUGGEST_YEAR_MIN = 1950;
const SUGGEST_YEAR_MAX = new Date().getFullYear();
const SUGGEST_CIT_MIN = 0;
const SUGGEST_CIT_MAX = 5000;

/** Same dual-overlapping-<input type="range"> pattern as the citation
 *  map's FiltersPanel — two handles sharing a track, only the thumbs are
 *  interactive (via the injected .orblit-suggest-range CSS). `range` is
 *  [min, max] or null (unfiltered, shown at the full bounds). */
function SuggestRangeField({ label, min, max, range, onChange, step = 1 }) {
  const [lo, hi] = range || [min, max];

  function setLo(v) {
    const next = Math.min(v, hi);
    onChange(next === min && hi === max ? null : [next, hi]);
  }
  function setHi(v) {
    const next = Math.max(v, lo);
    onChange(lo === min && next === max ? null : [lo, next]);
  }

  return (
    <div style={s.suggestField}>
      <div style={s.suggestFieldHeader}>
        <span>{label}</span>
        <span style={s.suggestFieldValue}>
          {lo} – {hi}
        </span>
      </div>
      <div style={s.suggestSliderStack}>
        <input
          className="orblit-suggest-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => setLo(Number(e.target.value))}
          style={s.suggestSlider}
        />
        <input
          className="orblit-suggest-range"
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => setHi(Number(e.target.value))}
          style={s.suggestSlider}
        />
      </div>
    </div>
  );
}

/** Thematic-cluster view: embeds title+abstract for the papers on the
 *  current map (collection + discovery, always both — the whole point is
 *  seeing which discovery papers sit thematically close to the existing
 *  collection), k-means clusters them, and lays them out in 2D via UMAP —
 *  a topical-similarity view alongside the citation-link map. Papers
 *  without an abstract can't be embedded and are listed separately rather
 *  than silently dropped, so it's clear what's missing from the picture.
 *
 *  Zoom/pan mirrors the citation map: a d3.zoom() bound directly to the
 *  SVG (wheel always zooms, drag-on-background pans, drag-on-a-node
 *  doesn't), scaleExtent floored at 1 and translateExtent pinned to the
 *  canvas bounds so you can't zoom out past 100% or pan the plot away
 *  into empty space. The SVG fills the whole surrounding card — its pixel
 *  size is measured live via ResizeObserver (rather than a fixed square)
 *  so the plot area and the zoom/pan bounds always match the actual card,
 *  no stray rectangle-within-a-card look when the card is resized. */
export default function ClusterMap({
  collectionNodes,
  discoveryNodes,
  onSelectNode,
  selectedId,
  result,
  onResultChange,
  onAddDiscoveryNodes,
  onClearSuggested,
}) {
  const [clusterCount, setClusterCount] = useState(() => result?.clusterCount || 5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");
  const [showSuggestFilters, setShowSuggestFilters] = useState(false);
  const [suggestYearRange, setSuggestYearRange] = useState(null);
  const [suggestCitRange, setSuggestCitRange] = useState(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [showLabels, setShowLabels] = useState(false);
  const [showDiscovery, setShowDiscovery] = useState(true);
  const [dims, setDims] = useState({ w: 640, h: 480 });

  const svgWrapRef = useRef(null);
  const svgRef = useRef(null);
  const zoomBehaviorRef = useRef(null);

  // Keep the plotted card's actual pixel size in state, and re-clamp the
  // zoom behavior's extents whenever it changes (window resize, sidebar
  // toggle, etc.) so panning/zooming always stays bounded to what's
  // currently visible instead of a stale earlier size.
  useEffect(() => {
    if (!svgWrapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      const w = Math.max(200, Math.round(box.width));
      const h = Math.max(200, Math.round(box.height));
      setDims({ w, h });
      zoomBehaviorRef.current
        ?.extent([[0, 0], [w, h]])
        .translateExtent([[0, 0], [w, h]]);
    });
    observer.observe(svgWrapRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3
      .zoom()
      .scaleExtent([1, 6])
      .extent([[0, 0], [dims.w, dims.h]])
      .translateExtent([[0, 0], [dims.w, dims.h]])
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.type === "mousedown" || event.type === "pointerdown") {
          return event.target === svgRef.current || event.target.closest?.(".plot-bg");
        }
        return !event.ctrlKey;
      })
      .on("zoom", (event) => setTransform(event.transform));
    svg.call(zoom);
    svg.on("wheel.zoom-block", (event) => event.preventDefault());
    zoomBehaviorRef.current = zoom;
    return () => {
      svg.on(".zoom", null);
      svg.on("wheel.zoom-block", null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const candidatePapers = useMemo(() => {
    const nodes = [...collectionNodes, ...discoveryNodes];
    return nodes.map((n) => ({ id: n.id, title: n.label, abstract: n.abstract || "", doi: n.doi || null }));
  }, [collectionNodes, discoveryNodes]);

  // Pre-generate estimate only — papers missing an abstract here may still
  // get one server-side via the Semantic Scholar/Crossref fallback chain,
  // so the real excluded list (shown after Generate) comes from the
  // server's response, not this client-side guess.
  const withAbstract = candidatePapers.filter((p) => p.abstract);
  const withoutAbstract = candidatePapers.filter((p) => !p.abstract);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ papers: candidatePapers, clusterCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate clusters");
      onResultChange({
        points: data.points,
        excluded: data.excluded,
        clusterCount,
        resolved: data.resolved,
      });
      resetZoom();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  /** Finds papers that are thematically close to the collection but never
   *  showed up via citation traversal (not referenced by / not citing
   *  anything already on the map). Adds them as regular discovery nodes —
   *  they immediately show up in the list/network views too, not just
   *  here — but doesn't auto-regenerate the cluster afterward, since the
   *  parent's node data updates asynchronously; the user clicks Generate
   *  again once ready. */
  async function suggestRelated() {
    const seedDois = collectionNodes.map((n) => n.doi).filter(Boolean);
    if (!seedDois.length) {
      setSuggestMsg("No DOIs on the collection papers to search from.");
      return;
    }
    setSuggesting(true);
    setSuggestMsg("");
    try {
      const excludeIds = [...collectionNodes, ...discoveryNodes].map((n) => n.id);
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dois: seedDois,
          excludeIds,
          limit: 20,
          minYear: suggestYearRange?.[0],
          maxYear: suggestYearRange?.[1],
          minCitations: suggestCitRange?.[0],
          maxCitations: suggestCitRange?.[1],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to find related papers");
      const added = onAddDiscoveryNodes(data.papers);
      setSuggestMsg(
        added > 0
          ? `Added ${added} related paper${added === 1 ? "" : "s"} — click Generate to include ${added === 1 ? "it" : "them"} in the cluster view.`
          : "No new related papers found."
      );
    } catch (e) {
      setSuggestMsg(e.message);
    } finally {
      setSuggesting(false);
    }
  }

  const nodesById = useMemo(() => {
    const map = new Map();
    for (const n of collectionNodes) map.set(n.id, n);
    for (const n of discoveryNodes) map.set(n.id, n);
    return map;
  }, [collectionNodes, discoveryNodes]);

  const scaled = useMemo(() => {
    if (!result?.points?.length) return [];
    const xs = result.points.map((p) => p.x);
    const ys = result.points.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const pad = 50;
    return result.points.map((p) => ({
      ...p,
      cx: pad + ((p.x - minX) / spanX) * (dims.w - pad * 2),
      cy: pad + ((p.y - minY) / spanY) * (dims.h - pad * 2),
    }));
  }, [result, dims]);

  const visiblePoints = useMemo(() => {
    if (!showDiscovery) {
      return scaled.filter((p) => nodesById.get(p.id)?.kind !== "discovery");
    }
    return scaled;
  }, [scaled, showDiscovery, nodesById]);

  const hasRecommended = visiblePoints.some((p) => nodesById.get(p.id)?.viaRecommendation);
  const hasSuggested = discoveryNodes.some((n) => n.viaRecommendation);

  function clearSuggested() {
    const removed = onClearSuggested?.() || 0;
    setSuggestMsg(
      removed > 0
        ? `Removed ${removed} suggested paper${removed === 1 ? "" : "s"} from the map.`
        : "No suggested papers to remove."
    );
  }

  function zoomBy(factor) {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy, factor);
  }

  function resetZoom() {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(250)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  }

  return (
    <div style={s.wrap}>
      <style>{`
        .orblit-cluster-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .orblit-cluster-range::-webkit-slider-runnable-track {
          height: 2px;
          background: #2A3B5C;
        }
        .orblit-cluster-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 13px;
          height: 13px;
          margin-top: -5.5px;
          border-radius: 50%;
          background: #4FD1C5;
          cursor: pointer;
        }
        .orblit-cluster-range::-moz-range-track {
          height: 2px;
          background: #2A3B5C;
        }
        .orblit-cluster-range::-moz-range-thumb {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: #4FD1C5;
          cursor: pointer;
          border: none;
        }
      `}</style>

      <div style={s.controls}>
        <div style={s.field}>
          <div style={s.fieldHeader}>
            <span>Clusters</span>
            <span style={s.fieldValue}>{clusterCount}</span>
          </div>
          <input
            className="orblit-cluster-range"
            type="range"
            min={2}
            max={10}
            value={clusterCount}
            onChange={(e) => setClusterCount(Number(e.target.value))}
            style={s.slider}
          />
        </div>
        <button
          onClick={generate}
          disabled={loading || candidatePapers.filter((p) => p.abstract || p.doi).length < 2}
          style={btnStyle()}
        >
          {loading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
          {loading ? "Generating…" : "Generate"}
        </button>
        <button
          onClick={suggestRelated}
          disabled={suggesting || !collectionNodes.some((n) => n.doi)}
          style={btnStyle()}
          title="Find papers that are thematically related to your collection but weren't found through citations"
        >
          {suggesting ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />}
          {suggesting ? "Searching…" : "Suggest related papers"}
        </button>
        <button
          onClick={() => setShowSuggestFilters((v) => !v)}
          style={{ ...iconBtnStyle(), background: showSuggestFilters ? "#24314C" : "#1a2740" }}
          title="Filter suggestions by year and citation count"
        >
          <SlidersHorizontal size={14} />
        </button>
        {hasSuggested && (
          <button
            onClick={clearSuggested}
            style={btnStyle()}
            title="Remove all suggested (not-cited-by-your-collection) papers from the map"
          >
            <XCircle size={14} />
            Clear all suggestions
          </button>
        )}
        <span style={s.count}>
          {withAbstract.length} paper{withAbstract.length === 1 ? "" : "s"} with abstract already
          {withoutAbstract.length > 0 &&
            ` · ${withoutAbstract.length} more will be looked up when you generate`}
        </span>
      </div>

      {showSuggestFilters && (
        <div style={s.suggestFilters}>
          <style>{`
            .orblit-suggest-range {
              -webkit-appearance: none;
              appearance: none;
              background: transparent;
              pointer-events: none;
            }
            .orblit-suggest-range::-webkit-slider-runnable-track { height: 2px; background: #2A3B5C; }
            .orblit-suggest-range::-webkit-slider-thumb {
              -webkit-appearance: none;
              pointer-events: auto;
              width: 13px;
              height: 13px;
              margin-top: -5.5px;
              border-radius: 50%;
              background: #4FD1C5;
              cursor: pointer;
            }
            .orblit-suggest-range::-moz-range-track { height: 2px; background: #2A3B5C; }
            .orblit-suggest-range::-moz-range-thumb {
              pointer-events: auto;
              width: 13px;
              height: 13px;
              border-radius: 50%;
              background: #4FD1C5;
              cursor: pointer;
              border: none;
            }
          `}</style>
          <SuggestRangeField
            label="Publication year"
            min={SUGGEST_YEAR_MIN}
            max={SUGGEST_YEAR_MAX}
            range={suggestYearRange}
            onChange={setSuggestYearRange}
          />
          <SuggestRangeField
            label="Citations"
            min={SUGGEST_CIT_MIN}
            max={SUGGEST_CIT_MAX}
            range={suggestCitRange}
            onChange={setSuggestCitRange}
            step={10}
          />
          <button
            onClick={() => {
              setSuggestYearRange(null);
              setSuggestCitRange(null);
            }}
            style={{ ...btnStyle(), alignSelf: "flex-start" }}
          >
            Reset
          </button>
        </div>
      )}

      {suggestMsg && <p style={s.suggestMsg}>{suggestMsg}</p>}

      {result && (
        <div style={s.explore}>
          <button onClick={() => zoomBy(1.3)} style={iconBtnStyle()} title="Zoom in">
            <ZoomIn size={14} />
          </button>
          <button onClick={() => zoomBy(1 / 1.3)} style={iconBtnStyle()} title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <button onClick={resetZoom} style={iconBtnStyle()} title="Reset zoom">
            <Maximize2 size={14} />
          </button>
          <button
            onClick={() => setShowLabels((v) => !v)}
            style={{ ...iconBtnStyle(), background: showLabels ? "#24314C" : "#1a2740" }}
            title={showLabels ? "Hide labels" : "Show labels"}
          >
            <Tag size={14} />
          </button>
          <button
            onClick={() => setShowDiscovery((v) => !v)}
            style={{
              ...iconBtnStyle(),
              fontSize: 10,
              padding: "0 8px",
              minWidth: 64,
              background: showDiscovery ? "#1a2740" : "#121820",
              opacity: showDiscovery ? 1 : 0.7,
            }}
            title={showDiscovery ? "Hide discovery papers" : "Show discovery papers"}
          >
            discovery
          </button>
          {hasRecommended && (
            <span style={s.legend}>
              <span style={s.legendSquare} /> suggested (not cited by/citing your collection)
            </span>
          )}
        </div>
      )}

      {error && <p style={s.error}>{error}</p>}

      <div style={s.body}>
        <div ref={svgWrapRef} style={s.svgWrap}>
          <svg
            ref={svgRef}
            width={dims.w}
            height={dims.h}
            style={{ background: "#0B1220", display: "block", touchAction: "none", cursor: "grab" }}
          >
            <rect className="plot-bg" width={dims.w} height={dims.h} fill="#0B1220" />
            <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
              {visiblePoints.map((p) => {
                const node = nodesById.get(p.id);
                const isDiscovery = node?.kind === "discovery";
                const isRecommended = !!node?.viaRecommendation;
                const isSelected = p.id === selectedId;
                const color = TAG_PALETTE[p.cluster % TAG_PALETTE.length];
                const radius = isSelected ? 10 : 6;
                const shapeProps = {
                  fill: color,
                  fillOpacity: isDiscovery ? 0.18 : 1,
                  stroke: isSelected ? "#4FD1C5" : color,
                  strokeWidth: isSelected ? 3 : isDiscovery ? 2 : 1,
                  style: { cursor: "pointer" },
                  onClick: () => onSelectNode(p.id),
                };
                return (
                  <g key={p.id}>
                    {isSelected &&
                      (isRecommended ? (
                        <rect
                          x={p.cx - 17}
                          y={p.cy - 17}
                          width={34}
                          height={34}
                          rx={4}
                          fill="none"
                          stroke="#E8E6DE"
                          strokeWidth={1.5}
                          opacity={0.6}
                        />
                      ) : (
                        <circle cx={p.cx} cy={p.cy} r={14} fill="none" stroke="#E8E6DE" strokeWidth={1.5} opacity={0.6} />
                      ))}
                    {isRecommended ? (
                      <rect
                        x={p.cx - radius}
                        y={p.cy - radius}
                        width={radius * 2}
                        height={radius * 2}
                        rx={2}
                        {...shapeProps}
                      >
                        <title>{node?.label || p.id} (suggested — not cited by/citing your collection)</title>
                      </rect>
                    ) : (
                      <circle cx={p.cx} cy={p.cy} r={radius} {...shapeProps}>
                        <title>{node?.label || p.id}</title>
                      </circle>
                    )}
                    {showLabels && (
                      <text
                        x={p.cx + 10}
                        y={p.cy + 3}
                        fontSize={9}
                        fill="#B9C2D0"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {(node?.label || "").slice(0, 30)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {result?.excluded?.length > 0 && (
          <div style={s.excludedPanel}>
            <div style={s.excludedTitle}>No abstract available ({result.excluded.length})</div>
            <ul style={s.excludedList}>
              {result.excluded.map((p, i) => (
                <li
                  key={p.id}
                  style={{
                    ...s.excludedItem,
                    borderBottom: i === result.excluded.length - 1 ? "none" : s.excludedItem.borderBottom,
                  }}
                  onClick={() => onSelectNode(p.id)}
                >
                  {p.title}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { display: "flex", flexDirection: "column", gap: 10, height: "100%" },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    fontFamily: "ui-sans-serif, system-ui",
    fontSize: 12,
    color: "#B9C2D0",
  },
  field: { width: 160 },
  fieldHeader: {
    display: "flex",
    justifyContent: "space-between",
    color: "#E8E6DE",
    marginBottom: 4,
  },
  fieldValue: { color: "#4FD1C5", fontVariantNumeric: "tabular-nums" },
  slider: { width: "100%", margin: 0 },
  explore: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    alignItems: "center",
    padding: "6px 8px",
    background: "#121B2E",
    border: "1px solid #1E2A42",
    borderRadius: 8,
    fontFamily: "ui-sans-serif, system-ui",
  },
  count: { color: "#7C8AA3" },
  error: { color: "#E8977A", fontSize: 13, margin: 0 },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
    fontSize: 11,
    color: "#7C8AA3",
    fontFamily: "ui-sans-serif, system-ui",
  },
  legendSquare: {
    width: 9,
    height: 9,
    borderRadius: 2,
    border: "1.5px solid #7C8AA3",
    flexShrink: 0,
  },
  suggestMsg: {
    color: "#4FD1C5",
    fontSize: 13,
    margin: 0,
    fontFamily: "ui-sans-serif, system-ui",
  },
  suggestFilters: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "flex-end",
    padding: "10px 12px",
    background: "#121B2E",
    border: "1px solid #1E2A42",
    borderRadius: 8,
    fontFamily: "ui-sans-serif, system-ui",
    fontSize: 12,
  },
  suggestField: { width: 180 },
  suggestFieldHeader: {
    display: "flex",
    justifyContent: "space-between",
    color: "#E8E6DE",
    marginBottom: 4,
  },
  suggestFieldValue: { color: "#4FD1C5", fontVariantNumeric: "tabular-nums" },
  suggestSliderStack: { position: "relative", height: 16 },
  suggestSlider: { position: "absolute", top: 0, left: 0, width: "100%", margin: 0 },
  body: { display: "flex", gap: 16, flex: 1, minHeight: 0 },
  svgWrap: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
    border: "1px solid #22304a",
    borderRadius: 8,
  },
  excludedPanel: {
    width: 220,
    flexShrink: 0,
    background: "#111A2C",
    border: "1px solid #22304a",
    borderRadius: 8,
    padding: 12,
    overflowY: "auto",
    maxHeight: "70vh",
  },
  excludedTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: "#E8E6DE",
    marginBottom: 8,
    fontFamily: "ui-sans-serif, system-ui",
  },
  excludedList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" },
  excludedItem: {
    fontSize: 12,
    color: "#8593A8",
    cursor: "pointer",
    fontFamily: "ui-sans-serif, system-ui",
    lineHeight: 1.4,
    padding: "10px 4px",
    borderBottom: "1px solid #1E2A42",
  },
};
