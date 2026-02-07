import { MoveDownIcon } from "@/components/Icons";
import React, { useState, useMemo, useEffect } from "react";

const CustomTable = ({
  data = [],
  columnsToShow = [],
  sorting = false,
  sortingColumns = [],
  showRowSelection = false,
  keysToExtractOnRowClick = [],
  keysToWrap = [],
  handleRowClick = () => {},
  handleRowSelection = () => {},
  endComponent = null,
  customGetColumnLabel = null,
}) => {
  const keys = useMemo(() => Object.keys(data[0] || {}), [data]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeColumn, setActiveColumn] = useState(null);
  const [ascending, setAscending] = useState(true);
  const [selectAll, setSelectAll] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);

  // Fallback for column labels if customGetColumnLabel is not provided
  const formatColumnName = (column) => column.replace(/_/g, " ");

  // Fallback to all keys if columnsToShow is empty
  const visibleColumns = columnsToShow.length > 0 ? columnsToShow : keys;

  // Determine columns allowed for sorting
  const sortableColumns = sortingColumns.length > 0 ? sortingColumns : visibleColumns;

  // Check screen width on mount and resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setViewportWidth(width);
      setIsSmallScreen(width < 768);
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sort the data based on active column and direction
  const sortedData = useMemo(() => {
    if (sorting && activeColumn) {
      return [...data].sort((a, b) => {
        const valueA =
          activeColumn === "name"
            ? a.actualName
            : activeColumn === "createdAt"
              ? (a.createdAt_original ?? a.created_at_original)
              : activeColumn === "updatedAt"
                ? (a.updatedAt_original ?? a.updated_at_original)
                : activeColumn === "agent_limit"
                  ? a.agent_limit_original
                  : activeColumn === "created_by"
                    ? a.created_by_original
                    : activeColumn === "updated_by"
                      ? a.updated_by_original
                      : a[activeColumn];
        const valueB =
          activeColumn === "name"
            ? b.actualName
            : activeColumn === "createdAt"
              ? (b.createdAt_original ?? b.created_at_original)
              : activeColumn === "updatedAt"
                ? (b.updatedAt_original ?? b.updated_at_original)
                : activeColumn === "agent_limit"
                  ? b.agent_limit_original
                  : activeColumn === "created_by"
                    ? b.created_by_original
                    : activeColumn === "updated_by"
                      ? b.updated_by_original
                      : activeColumn === "totalTokens"
                        ? b.totalTokens_original
                        : b[activeColumn];

        // Explicit numeric sorting for cost column
        if (activeColumn === "cost") {
          const costA =
            a.cost && typeof a.cost === "string"
              ? Number(a.cost.replace(/[^0-9.-]+/g, ""))
              : typeof a.cost === "number"
                ? a.cost
                : 0;
          const costB =
            b.cost && typeof b.cost === "string"
              ? Number(b.cost.replace(/[^0-9.-]+/g, ""))
              : typeof b.cost === "number"
                ? b.cost
                : 0;
          return ascending ? costA - costB : costB - costA;
        }

        // Keep original sorting for totalTokens column for backward compatibility
        if (activeColumn === "totalTokens") {
          const toNumber = (value) => {
            if (typeof value === "number") return value;
            if (typeof value === "string") return Number(value.replace(/[^0-9.-]+/g, ""));
            return 0;
          };
          const usageA = toNumber(a.totalTokens_original ?? a.totalTokens ?? 0);
          const usageB = toNumber(b.totalTokens_original ?? b.totalTokens ?? 0);
          return ascending ? usageA - usageB : usageB - usageA;
        }

        // Numeric sorting for agent_limit column
        if (activeColumn === "agent_limit") {
          const limitA = Number(a.agent_limit_original ?? 0);
          const limitB = Number(b.agent_limit_original ?? 0);
          return ascending ? limitA - limitB : limitB - limitA;
        }

        // Special handling for date columns (last_used, created_at, createdAt)
        if (["last_used", "created_at", "createdAt", "updated_at", "updatedAt"].includes(activeColumn)) {
          const getOriginalTimestamp = (row) => {
            switch (activeColumn) {
              case "last_used":
                return row.last_used_original || row.last_used_orignal;
              case "createdAt":
                return row.createdAt_original ?? row.created_at_original;
              case "created_at":
                return row.created_at_original;
              case "updatedAt":
                return row.updatedAt_original ?? row.updated_at_original;
              case "updated_at":
                return row.updated_at_original;
              default:
                return null;
            }
          };
          // Use original timestamp values for sorting if available
          const originalA = getOriginalTimestamp(a);
          const originalB = getOriginalTimestamp(b);

          // Handle null/undefined values - put them at the bottom
          if (!originalA && !originalB) return 0;
          if (!originalA) return 1;
          if (!originalB) return -1;

          // Convert to Date objects for proper sorting
          const dateA = new Date(originalA);
          const dateB = new Date(originalB);
          return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        }

        if (typeof valueA === "string" && typeof valueB === "string") {
          return ascending ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        }

        if (typeof valueA === "number" && typeof valueB === "number") {
          return ascending ? valueA - valueB : valueB - valueA;
        }

        if (valueA === "-") return ascending ? -1 : 1;
        if (valueB === "-") return ascending ? 1 : -1;

        if (valueA < valueB) return ascending ? -1 : 1;
        if (valueA > valueB) return ascending ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [data, sorting, activeColumn, ascending]);

  const sortByColumn = (column) => {
    if (!sorting || !sortableColumns.includes(column)) return;

    if (activeColumn === column) {
      // Toggle sorting direction
      setAscending(!ascending);
    } else {
      // Set new sorting column
      setActiveColumn(column);
      setAscending(true);
    }
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedRows(!selectAll ? sortedData.map((item) => item.id || item._id) : []);
    if (handleRowSelection) {
      handleRowSelection(!selectAll ? sortedData.map((item) => item.id || item._id) : []);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedRows((prevSelectedRows) => {
      const newSelectedRows = prevSelectedRows.includes(id)
        ? prevSelectedRows.filter((rowId) => rowId !== id)
        : [...prevSelectedRows, id];
      if (handleRowSelection) {
        handleRowSelection(newSelectedRows);
      }
      return newSelectedRows;
    });
  };

  // Function to get value from row (handling undefined)
  const getDisplayValue = (row, column) => {
    if (row[column] === undefined) return "not available";

    if (keysToWrap.includes(column) && row[column] && typeof row[column] === "string") {
      return row[column].length > 30 ? `${row[column].substring(0, 30)}...` : row[column];
    }

    return row[column] || String(row[column]) || "-";
  };

  // Sorting controls to display only in card view
  const renderSortingControls = () => {
    if (!sorting || sortableColumns.length === 0 || !isSmallScreen) return null;

    return (
      <div className="flex flex-wrap items-center gap-2 mb-3 p-2">
        <div className="font-medium text-base-content mr-2">Sort by:</div>
        {sortableColumns.map((column) => (
          <button
            id={`custom-table-sort-${column}`}
            key={column}
            onClick={() => sortByColumn(column)}
            className={`btn btn-sm btn-outline capitalize ${activeColumn === column ? "btn-primary" : ""}`}
          >
            <span>{customGetColumnLabel ? customGetColumnLabel(column) : formatColumnName(column)}</span>
            {activeColumn === column && (
              <MoveDownIcon className={`ml-1 w-4 h-4 ${ascending ? "rotate-180" : "rotate-0"}`} />
            )}
          </button>
        ))}
      </div>
    );
  };

  // Render cards for mobile view
  const renderCardView = () => {
    return (
      <>
        {renderSortingControls()}
        <div className="grid grid-cols-1 gap-4">
          {sortedData?.length > 0 ? (
            sortedData.map((row, index) => (
              <div
                id={`custom-table-card-${row.id || row?._id || index}`}
                key={row.id || row?._id || index}
                className={`bg-base-100 border border-base-300 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-all group ${
                  row.isLoading ? "opacity-60 cursor-wait" : ""
                }`}
                onClick={() =>
                  handleRowClick(
                    keysToExtractOnRowClick.reduce((acc, key) => {
                      acc[key] = row[key];
                      return acc;
                    }, {})
                  )
                }
              >
                {/* Card Header with selection */}
                {showRowSelection && (
                  <div className="flex items-center mb-3">
                    <input
                      id={`custom-table-card-checkbox-${row.id || row["_id"]}`}
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer mr-3"
                      checked={selectedRows.includes(row.id || row["_id"])}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelectRow(row.id || row["_id"]);
                      }}
                    />
                    <span className="text-sm text-base-content/70">Select</span>
                  </div>
                )}

                {/* Card Body */}
                <div className="space-y-3">
                  {visibleColumns.map((column) => (
                    <div key={column}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-base-content/70 capitalize">
                          {customGetColumnLabel ? customGetColumnLabel(column) : formatColumnName(column)}:
                        </span>
                        <span className="text-base-content mt-1">{getDisplayValue(row, column)}</span>
                      </div>
                      {column !== visibleColumns[visibleColumns.length - 1] && (
                        <div className="border-t border-base-200 my-2" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Card Actions */}
                {endComponent && (
                  <div className="mt-4 flex justify-end border-t border-base-200 pt-3 relative z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {endComponent({ row: row })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-left py-6 bg-base-100 shadow-sm">
              <p className="text-base-content/70">No data available</p>
            </div>
          )}
        </div>
      </>
    );
  };

  // Render table view for desktop
  const renderTableView = () => {
    const tableClass = viewportWidth < 1024 ? "table-compact" : "";

    return (
      <div
        className="overflow-visible relative z-50 border border-base-300 rounded-lg"
        style={{ display: "inline-block", minWidth: "50%", width: "auto" }}
      >
        <table
          id="custom-table-view"
          className={`table ${tableClass} bg-base-100 shadow-md overflow-visible relative z-50 border-collapse`}
          style={{ tableLayout: "auto", width: "100%" }}
        >
          <thead className="bg-gradient-to-r from-base-200 to-base-300 text-base-content">
            <tr className="hover">
              {showRowSelection && (
                <th className="px-4 py-2 text-left">
                  <input
                    id="custom-table-select-all"
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              {visibleColumns.map((column) => {
                const isSortable = sorting && sortableColumns.includes(column);

                return (
                  <th key={column} className="px-4 py-2 text-left whitespace-nowrap capitalize">
                    <div className="flex items-center justify-start gap-2">
                      {isSortable && (
                        <MoveDownIcon
                          id={`custom-table-sort-icon-${column}`}
                          className={`w-4 h-4 cursor-pointer ${
                            activeColumn === column ? "text-black" : "text-[#BCBDBE] group-hover:text-black"
                          } ${ascending ? "rotate-180" : "rotate-0"}`}
                          onClick={() => sortByColumn(column)}
                        />
                      )}
                      <span
                        id={`custom-table-header-${column}`}
                        className={`${isSortable ? "cursor-pointer" : "cursor-default"} capitalize`}
                        onClick={() => (isSortable ? sortByColumn(column) : undefined)}
                      >
                        {customGetColumnLabel ? customGetColumnLabel(column) : formatColumnName(column)}
                      </span>
                    </div>
                  </th>
                );
              })}
              {endComponent && (
                <th className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center">Actions</div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData?.length > 0 ? (
              sortedData?.map((row, index) => (
                <tr
                  id={`custom-table-row-${row.id || row?._id || index}`}
                  key={row.id || row?._id || index}
                  className={`border-b border-base-300 hover:bg-base-200 transition-colors z-40 cursor-pointer group ${
                    row.isLoading ? "opacity-60 cursor-wait" : ""
                  }`}
                  onClick={() =>
                    handleRowClick(
                      keysToExtractOnRowClick.reduce((acc, key) => {
                        acc[key] = row[key];
                        return acc;
                      }, {})
                    )
                  }
                >
                  {showRowSelection && (
                    <td className="px-4 py-2 text-left">
                      <input
                        id={`custom-table-row-checkbox-${row.id || row["_id"]}`}
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer"
                        checked={selectedRows.includes(row.id || row["_id"])}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectRow(row.id || row["_id"]);
                        }}
                      />
                    </td>
                  )}
                  {visibleColumns?.map((column) => (
                    <td
                      key={column}
                      className={`px-4 py-2 text-left whitespace-nowrap ${
                        ["last_used", "created_at", "createdAt", "updated_at", "updatedAt"].includes(column)
                          ? "w-40 min-w-40 max-w-40"
                          : ""
                      }`}
                    >
                      {getDisplayValue(row, column)}
                    </td>
                  ))}
                  {endComponent && (
                    <td className="px-4 py-2 text-left relative">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 relative z-50">
                        {endComponent({ row: row })}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={visibleColumns.length + (showRowSelection ? 1 : 0) + (endComponent ? 1 : 0)}
                  className="px-4 py-4 text-left"
                >
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div id="custom-table" className="bg-base-100 p-2 md:p-4 overflow-x-auto overflow-y-visible">
      {/* Responsive view switching */}
      {isSmallScreen ? renderCardView() : renderTableView()}
    </div>
  );
};

export default CustomTable;
