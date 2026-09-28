// Shared inline-style helpers for OrbLitApp and its extracted panels
// (TagsPanel, and future ZoteroPanel/Sidebar splits) — kept as plain
// functions (not objects) since some callers spread extra overrides on
// top, e.g. `{ ...btnStyle(), flexShrink: 0 }`.
export function inputStyle() {
  return {
    background: "#0B1220",
    border: "1px solid #24314C",
    borderRadius: 6,
    padding: "7px 10px",
    color: "#E8E6DE",
    fontSize: 12,
    fontFamily: "ui-sans-serif, system-ui",
  };
}

export function btnStyle() {
  return {
    background: "#1a2740",
    border: "1px solid #2c3b5a",
    borderRadius: 6,
    padding: "8px 12px",
    color: "#E8E6DE",
    fontSize: 12,
    fontFamily: "ui-sans-serif, system-ui",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  };
}

export function iconBtnStyle() {
  return {
    background: "#1a2740",
    border: "1px solid #2c3b5a",
    borderRadius: 6,
    width: 32,
    height: 32,
    color: "#E8E6DE",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  };
}
