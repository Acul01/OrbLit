"use client";

import { Plus, X } from "lucide-react";
import { TAG_PALETTE } from "@/lib/citation-graph";
import { inputStyle, btnStyle, iconBtnStyle } from "@/lib/ui-styles";

// The "Tags" toolbar dropdown: create/delete color-coded tags. Assigning a
// tag to the currently-selected paper happens in the sidebar (still in
// OrbLitApp), not here — this panel only manages the tag list itself.
export default function TagsPanel({
  tags,
  newTagName,
  setNewTagName,
  newTagColor,
  setNewTagColor,
  createTag,
  deleteTag,
}) {
  return (
    <div
      style={{
        marginTop: 10,
        background: "#121B2E",
        border: "1px solid #24314C",
        borderRadius: 8,
        padding: 12,
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: 12,
      }}
    >
      <div style={{ color: "#7C8AA3", marginBottom: 8 }}>
        Create tags with a name and color, then assign them to papers in the
        sidebar. Tagged papers use that color on the map.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createTag()}
          placeholder="Tag name"
          style={{ ...inputStyle(), width: 160 }}
        />
        <input
          type="color"
          value={newTagColor}
          onChange={(e) => setNewTagColor(e.target.value)}
          title="Tag color"
          style={{
            width: 36,
            height: 30,
            border: "1px solid #24314C",
            borderRadius: 4,
            background: "transparent",
            cursor: "pointer",
            padding: 0,
          }}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {TAG_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewTagColor(c)}
              title={c}
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: c,
                border: newTagColor === c ? "2px solid #fff" : "1px solid #24314C",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
        <button onClick={createTag} style={btnStyle()}>
          <Plus size={14} /> Add tag
        </button>
      </div>
      {tags.length === 0 ? (
        <div style={{ color: "#7C8AA3" }}>No tags yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tags.map((t) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: t.color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, color: "#E8E6DE" }}>{t.name}</span>
              <button
                onClick={() => deleteTag(t.id)}
                style={{ ...iconBtnStyle(), width: 26, height: 26 }}
                title={`Delete tag "${t.name}"`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
