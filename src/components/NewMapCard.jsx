"use client";

import { useState } from "react";
import { X, Map as MapIcon, Loader2, Library, Search } from "lucide-react";
import { inputStyle, btnStyle } from "@/lib/ui-styles";

const OPENALEX_API = "https://api.openalex.org/works";

/** Centered card shown after "New map" — build from a Zotero collection
 *  or a Mendeley folder, or start from a single paper (a fresh folder
 *  containing just that paper gets created behind the scenes). */
export default function NewMapCard({
  zoteroConnected,
  mendeleyConnected,
  zoteroCollections,
  mendeleyCollections,
  libraryProvider,
  onCreateMap,
  onCreateFromPaper,
  onConnectZotero,
  onConnectMendeley,
  busy,
  loading,
  onDismiss,
}) {
  const anyConnected = zoteroConnected || mendeleyConnected;
  const bothConnected = zoteroConnected && mendeleyConnected;
  const [source, setSource] = useState(
    bothConnected ? (libraryProvider === "mendeley" ? "mendeley" : "zotero") : mendeleyConnected ? "mendeley" : "zotero"
  );
  const [folderKey, setFolderKey] = useState("");
  const [mode, setMode] = useState("collection"); // "collection" | "paper"
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);

  const activeSource =
    source === "mendeley" && mendeleyConnected
      ? "mendeley"
      : mendeleyConnected && !zoteroConnected
        ? "mendeley"
        : "zotero";
  const sourceName = activeSource === "mendeley" ? "Mendeley" : "Zotero";
  const collections = activeSource === "mendeley" ? mendeleyCollections : zoteroCollections;

  function chooseSource(next) {
    setSource(next);
    setFolderKey("");
  }

  async function searchPapers() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `${OPENALEX_API}?search=${encodeURIComponent(query)}&per_page=6`
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handlePick(work) {
    setPicked(work.id);
    onCreateFromPaper(work, activeSource);
  }

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <button onClick={onDismiss} style={s.close} aria-label="Dismiss">
          <X size={14} />
        </button>
        <h2 style={s.title}>Start this map</h2>

        {bothConnected && (
          <div style={s.modeToggle}>
            <button
              onClick={() => chooseSource("zotero")}
              style={{ ...s.modeButton, ...(source === "zotero" ? s.modeButtonActive : {}) }}
            >
              Zotero
            </button>
            <button
              onClick={() => chooseSource("mendeley")}
              style={{ ...s.modeButton, ...(source === "mendeley" ? s.modeButtonActive : {}) }}
            >
              Mendeley
            </button>
          </div>
        )}

        {anyConnected && (
          <div style={s.modeToggle}>
            <button
              onClick={() => setMode("collection")}
              style={{ ...s.modeButton, ...(mode === "collection" ? s.modeButtonActive : {}) }}
            >
              From a collection
            </button>
            <button
              onClick={() => setMode("paper")}
              style={{ ...s.modeButton, ...(mode === "paper" ? s.modeButtonActive : {}) }}
            >
              From a single paper
            </button>
          </div>
        )}

        {!anyConnected ? (
          <>
            <p style={s.body}>Connect Zotero or Mendeley to build a map from one of your collections.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={onConnectZotero}
                style={{ ...btnStyle(), flex: 1, justifyContent: "center" }}
              >
                <Library size={14} /> Zotero
              </button>
              <button
                onClick={onConnectMendeley}
                style={{ ...btnStyle(), flex: 1, justifyContent: "center" }}
              >
                <Library size={14} /> Mendeley
              </button>
            </div>
          </>
        ) : mode === "collection" ? (
          <>
            <p style={s.body}>
              Build a citation map from a {sourceName} {activeSource === "mendeley" ? "folder" : "collection"}.
            </p>
            <select
              value={folderKey}
              onChange={(e) => setFolderKey(e.target.value)}
              disabled={busy}
              style={{ ...inputStyle(), width: "100%", cursor: busy ? "wait" : "pointer" }}
            >
              <option value="">Main library</option>
              {collections.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => onCreateMap(activeSource, folderKey)}
              disabled={loading || busy}
              style={{ ...btnStyle(), width: "100%", justifyContent: "center", marginTop: 10 }}
            >
              {loading ? <Loader2 size={14} className="spin" /> : <MapIcon size={14} />} Create Map
            </button>
          </>
        ) : (
          <>
            <p style={s.body}>
              Pick a paper to start from — we&apos;ll create a new {sourceName}{" "}
              {activeSource === "mendeley" ? "folder" : "collection"} with just that paper in it.
            </p>
            <div style={s.searchRow}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchPapers()}
                placeholder="Search papers…"
                style={{ ...inputStyle(), flex: 1 }}
              />
              <button
                onClick={searchPapers}
                disabled={searching}
                style={{ ...btnStyle(), flexShrink: 0 }}
              >
                {searching ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              </button>
            </div>
            {results.length > 0 && (
              <div style={s.results}>
                {results.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => !loading && handlePick(w)}
                    style={s.resultRow}
                  >
                    {loading && picked === w.id ? (
                      <Loader2 size={13} className="spin" style={{ flexShrink: 0 }} />
                    ) : (
                      <div style={s.resultText}>
                        <div style={s.resultTitle}>{w.display_name}</div>
                        <div style={s.resultMeta}>
                          {w.publication_year} · {w.cited_by_count} citations
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p style={s.hint}>Or just search for a paper above to explore its citations instead.</p>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    zIndex: 5,
  },
  card: {
    pointerEvents: "auto",
    position: "relative",
    width: 360,
    maxWidth: "90%",
    background: "#111A2C",
    border: "1px solid #24314C",
    borderRadius: 10,
    padding: 22,
    boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
    fontFamily: "ui-sans-serif, system-ui",
  },
  close: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "transparent",
    border: "none",
    color: "#7C8AA3",
    cursor: "pointer",
    padding: 4,
  },
  title: { margin: "0 0 12px", fontSize: 16, color: "#E8E6DE" },
  modeToggle: {
    display: "flex",
    gap: 6,
    marginBottom: 14,
    background: "#0B1220",
    borderRadius: 8,
    padding: 3,
  },
  modeButton: {
    flex: 1,
    padding: "6px 8px",
    borderRadius: 6,
    border: "none",
    background: "transparent",
    color: "#8593A8",
    fontSize: 12,
    cursor: "pointer",
  },
  modeButtonActive: { background: "#24314C", color: "#E8E6DE", fontWeight: 600 },
  body: { margin: "0 0 12px", fontSize: 13, color: "#B9C2D0", lineHeight: 1.5 },
  searchRow: { display: "flex", gap: 8 },
  results: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    maxHeight: 220,
    overflowY: "auto",
  },
  resultRow: {
    padding: "8px 10px",
    borderRadius: 6,
    background: "#0B1220",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  resultText: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  resultTitle: {
    fontSize: 13,
    color: "#E8E6DE",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  resultMeta: { fontSize: 11, color: "#7C8AA3" },
  hint: { margin: "14px 0 0", fontSize: 11, color: "#5D6B85" },
};
