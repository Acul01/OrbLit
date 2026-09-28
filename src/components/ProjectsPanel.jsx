"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Check } from "lucide-react";
import { btnStyle } from "@/lib/ui-styles";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Dropdown-style panel listing the user's saved maps — click a row to
 *  switch to it, the pencil renames it inline, the trash icon deletes
 *  it, "New map" creates a blank one. This is the primary persistence
 *  UI now (autosave to Supabase), replacing the old manual JSON
 *  export/import buttons. */
export default function ProjectsPanel({
  projects,
  activeProjectId,
  switching,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");

  function startEditing(p) {
    setEditingId(p.id);
    setDraftName(p.name || "Untitled Map");
  }

  function commitEdit() {
    if (editingId) onRename(editingId, draftName);
    setEditingId(null);
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.headerLabel}>Your maps</span>
        <button onClick={onCreate} style={btnStyle()}>
          <Plus size={14} /> New map
        </button>
      </div>
      <div style={s.list}>
        {projects.length === 0 && <div style={s.empty}>No maps yet.</div>}
        {projects.map((p) => {
          const active = p.id === activeProjectId;
          const editing = editingId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => !active && !editing && onSelect(p.id)}
              style={{ ...s.row, ...(active ? s.rowActive : {}) }}
            >
              {switching === p.id ? (
                <Loader2 size={13} className="spin" style={{ flexShrink: 0 }} />
              ) : (
                <span style={s.dot} />
              )}

              {editing ? (
                <input
                  autoFocus
                  value={draftName}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  style={s.nameInput}
                />
              ) : (
                <span style={s.name}>{p.name || "Untitled Map"}</span>
              )}

              {!editing && <span style={s.date}>{formatDate(p.updated_at)}</span>}

              {editing ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    commitEdit();
                  }}
                  title="Save name"
                  style={s.iconBtn}
                >
                  <Check size={13} />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(p);
                  }}
                  title="Rename map"
                  style={s.iconBtn}
                >
                  <Pencil size={13} />
                </button>
              )}

              {projects.length > 1 && !editing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  title="Delete map"
                  style={s.iconBtn}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
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
    width: 360,
    maxWidth: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLabel: { color: "#7C8AA3" },
  list: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" },
  empty: { color: "#7C8AA3", padding: "8px 4px" },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 8px",
    borderRadius: 6,
    cursor: "pointer",
  },
  rowActive: { background: "#1a2740" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#2c3b5a",
    flexShrink: 0,
  },
  name: {
    flex: 1,
    color: "#E8E6DE",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  nameInput: {
    flex: 1,
    background: "#0B1220",
    border: "1px solid #2A3B5C",
    borderRadius: 4,
    color: "#E8E6DE",
    fontSize: 12,
    padding: "3px 6px",
    minWidth: 0,
  },
  date: { color: "#5D6B85", fontSize: 11, flexShrink: 0 },
  iconBtn: {
    background: "transparent",
    border: "none",
    color: "#7C8AA3",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    flexShrink: 0,
  },
};
