"use client";
import { resolveColor, resolveBackground, safeStyleObj } from "../styleUtils";

export default function TableComponent({
  columns = [],
  data = [],
  hover = true,
  zebra = false,
  compact = false,
  stickyHeader = false,
  color,
  bg,
  className = "",
  style,
  onAction,
  renderNode: RNode,
}) {
  const safeStyle = safeStyleObj(style);

  if (columns.length === 0 && data.length > 0) {
    columns = Object.keys(data[0]);
  }

  const { className: _colorCls, style: colorStyle } = resolveColor(color, "text-base-content");
  const { className: bgCls, style: bgStyle } = resolveBackground(bg);

  const containerStyle = {
    ...bgStyle,
    ...colorStyle,
    ...safeStyle,
  };

  return (
    <div className={`overflow-x-auto w-full ${bgCls} rounded-xl ${className}`} style={containerStyle}>
      <table className={`table w-full ${zebra ? "table-zebra" : ""} ${compact ? "table-xs" : ""}`}>
        <thead className={stickyHeader ? "sticky top-0 bg-base-100 z-10" : ""}>
          <tr className="border-b-base-content/10">
            {columns.map((col, idx) => {
              const isObj = typeof col === "object" && col !== null;
              const label = isObj ? col.label : col;
              const align = isObj ? col.align : "left";
              const width = isObj ? col.width : undefined;

              const alignMap = { left: "text-left", center: "text-center", right: "text-right" };
              const alignCls = alignMap[align] ?? "text-left";

              return (
                <th
                  key={idx}
                  className={`${alignCls} text-base-content/60 font-semibold uppercase tracking-wider text-[10px] py-4`}
                  style={width ? { width: typeof width === "number" ? `${width}px` : width } : {}}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="text-sm">
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={`
                                border-b border-base-content/5 last:border-0
                                ${hover ? "hover:bg-base-200/50 transition-colors" : ""}
                            `}
            >
              {columns.map((col, colIdx) => {
                const isObj = typeof col === "object" && col !== null;
                const key = isObj ? col.key : col;
                const align = isObj ? col.align : "left";

                const alignMap = { left: "text-left", center: "text-center", right: "text-right" };
                const alignCls = alignMap[align] ?? "text-left";

                const cellValue = row[key] ?? row[colIdx] ?? "-";

                return (
                  <td key={colIdx} className={`${alignCls} py-4`}>
                    {typeof cellValue === "object" && cellValue?.type ? (
                      <RNode node={cellValue} onAction={onAction} />
                    ) : (
                      <span className="font-medium text-base-content/90 tracking-tight">{String(cellValue)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="py-12 text-center text-base-content/40 italic text-sm">No data available.</div>
      )}
    </div>
  );
}
