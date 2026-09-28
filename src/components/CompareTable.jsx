// Feature-comparison table for the /compare/* pages — a real <table> on
// wider screens, but under COMPARE_TABLE_BREAKPOINT it re-stacks into
// label/value pairs per row (an HTML table can't reflow via inline
// styles alone, hence the injected media-query <style>, same pattern
// ClusterMap.jsx and the landing page already use for scoped CSS).
export default function CompareTable({ rows, orblitLabel, competitorLabel }) {
  return (
    <div style={s.wrap}>
      <style>{`
        @media (max-width: 640px) {
          .orblit-compare-table thead { display: none; }
          .orblit-compare-table, .orblit-compare-table tbody, .orblit-compare-table tr, .orblit-compare-table td {
            display: block;
            width: 100%;
          }
          .orblit-compare-table tr {
            padding: 12px 0;
            border-bottom: 1px solid #1E2A42;
          }
          .orblit-compare-table td {
            padding: 4px 0 !important;
            border: none !important;
          }
          .orblit-compare-table td[data-label]::before {
            content: attr(data-label);
            display: block;
            font-size: 11px;
            color: #7C8AA3;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 2px;
          }
        }
      `}</style>
      <table className="orblit-compare-table" style={s.table}>
        <thead>
          <tr>
            <th style={{ ...s.th, ...s.thFeature }}></th>
            <th style={{ ...s.th, ...s.thOrblit }}>OrbLit</th>
            <th style={s.th}>{competitorLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td style={{ ...s.td, ...s.tdLabel }}>{row.label}</td>
              <td data-label="OrbLit" style={{ ...s.td, ...s.tdOrblit }}>
                {row.orblit}
              </td>
              <td data-label={competitorLabel} style={s.td}>
                {row.competitor}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const s = {
  wrap: {
    overflowX: "auto",
    border: "1px solid #22304a",
    borderRadius: 10,
    background: "#111A2C",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13.5,
    fontFamily: "ui-sans-serif, system-ui",
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    color: "#8593A8",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    borderBottom: "1px solid #22304a",
  },
  thFeature: { width: "28%" },
  thOrblit: { color: "#4FD1C5" },
  td: {
    padding: "12px 16px",
    color: "#C7CEDB",
    borderBottom: "1px solid #1E2A42",
    verticalAlign: "top",
    lineHeight: 1.5,
  },
  tdLabel: { color: "#E8E6DE", fontWeight: 600 },
  tdOrblit: { color: "#E8E6DE" },
};
