import { memo } from "react";
import { Calendar } from "lucide-react";
import { TIME_RANGE_OPTIONS } from "@/utils/enums";
import { ChevronDownIcon } from "@/components/Icons";
import SearchItems from "@/components/UI/SearchItems";

const MetricsFilters = memo(
  ({
    factor,
    range,
    bridge,
    loading,
    filterBridges,
    setFilterBridges,
    allBridges,
    customStartDate,
    customEndDate,
    onFactorChange,
    onTimeRangeChange,
    onBridgeChange,
    getDisplayRangeText,
  }) => {
    const FACTOR_OPTIONS = ["Bridges", "API Keys", "Models"];

    return (
      <div className="bg-base-100 shadow-md rounded-lg p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Group By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Group by:</span>
            <details
              id="metrics-filter-group-by-dropdown"
              className="dropdown dropdown-end"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  e.currentTarget.removeAttribute("open");
                }
              }}
            >
              <summary id="metrics-filter-group-by-button" className="btn btn-sm m-1">
                {FACTOR_OPTIONS[factor]}
                <ChevronDownIcon className="w-3 h-3 ml-2" />
              </summary>
              <ul tabIndex="0" className="dropdown-content menu p-1 shadow bg-base-100 rounded-box w-52 z-high">
                {FACTOR_OPTIONS.map((item, index) => (
                  <li key={index}>
                    <a
                      id={`metrics-filter-group-by-option-${index}`}
                      className={`${factor === index ? "active" : ""}`}
                      onClick={(e) => {
                        onFactorChange(index);
                        const details = e.currentTarget.closest("details");
                        if (details) details.removeAttribute("open");
                      }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </div>

          {/* Agent Selection */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Agent:</span>
            <details
              id="metrics-filter-agent-dropdown"
              className="dropdown dropdown-end z-high"
              ref={(node) => {
                if (node) {
                  const handleClickOutside = (event) => {
                    const isClickInsideSearch = event.target.closest(".search-container");
                    const isClickInsideItem = event.target.closest(".dropdown-item");
                    if (!node.contains(event.target) && !isClickInsideSearch && !isClickInsideItem) {
                      node.removeAttribute("open");
                    }
                  };
                  document.addEventListener("mousedown", handleClickOutside);
                  node._clickOutsideHandler = handleClickOutside;
                }
              }}
            >
              <summary id="metrics-filter-agent-button" className="btn btn-sm m-1">
                {bridge?.["bridge_name"]
                  ? bridge?.["bridge_name"].length > 15
                    ? bridge?.["bridge_name"].substring(0, 15) + "..."
                    : bridge?.["bridge_name"]
                  : "All Agents"}
                <ChevronDownIcon className="w-3 h-3 ml-2" />
              </summary>

              <ul className="menu dropdown-content bg-base-100 rounded-box z-high w-52 p-2 shadow-sm flex-row overflow-y-auto overflow-x-hidden min-w-72 max-w-72 scrollbar-hide max-h-[70vh]">
                <div className="search-container">
                  <SearchItems setFilterItems={setFilterBridges} data={allBridges} item="Agent" />
                </div>

                <li>
                  <a
                    id="metrics-filter-agent-all"
                    onClick={(e) => {
                      onBridgeChange(null, null);
                      const details = e.currentTarget.closest("details");
                      if (details) details.removeAttribute("open");
                    }}
                    className={`w-72 mb-1 dropdown-item ${!bridge ? "active" : ""}`}
                  >
                    All Agents
                  </a>
                </li>

                {filterBridges.map((item, index) => (
                  <li key={index}>
                    <a
                      id={`metrics-filter-agent-${item?._id}`}
                      onClick={(e) => {
                        onBridgeChange(item?._id, item?.name);
                        const details = e.currentTarget.closest("details");
                        if (details) details.removeAttribute("open");
                      }}
                      className={`w-72 mb-1 dropdown-item ${bridge?.["bridge_id"] === item?._id ? "active" : ""}`}
                    >
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Time Range:</span>
            <details
              id="metrics-filter-time-range-dropdown"
              className="dropdown dropdown-end"
              tabIndex={0}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  e.currentTarget.removeAttribute("open");
                }
              }}
            >
              <summary id="metrics-filter-time-range-button" className="btn btn-sm m-1">
                {range === 10 ? getDisplayRangeText() : TIME_RANGE_OPTIONS?.[range]}
                <ChevronDownIcon className="w-3 h-3 ml-2" />
              </summary>
              <ul tabIndex="0" className="z-high dropdown-content menu p-1 shadow bg-base-100 rounded-box w-52">
                {TIME_RANGE_OPTIONS.map((item, index) => (
                  <li key={index}>
                    <a
                      id={`metrics-filter-time-range-option-${index}`}
                      className={`${index === range && range !== 10 ? "active" : ""}`}
                      onClick={(e) => {
                        onTimeRangeChange(index);
                        const details = e.currentTarget.closest("details");
                        if (details) details.removeAttribute("open");
                      }}
                    >
                      {item}
                    </a>
                  </li>
                ))}
                {/* Custom Range Option */}
                <li>
                  <a
                    id="metrics-filter-time-range-custom"
                    className={`${range === 10 ? "active" : ""} flex items-center gap-2`}
                    onClick={(e) => {
                      onTimeRangeChange(TIME_RANGE_OPTIONS.length);
                      const details = e.currentTarget.closest("details");
                      if (details) details.removeAttribute("open");
                    }}
                  >
                    <Calendar className="w-4 h-4" />
                    Custom Range
                  </a>
                </li>
              </ul>
            </details>
          </div>

          {/* Loading indicator */}
          <div className="flex items-center">
            <span className={`${loading ? "loading loading-ring loading-md" : ""}`}></span>
            {loading && <span className="text-gray-600 ml-2">Loading...</span>}
          </div>
        </div>
      </div>
    );
  }
);

MetricsFilters.displayName = "MetricsFilters";

export default MetricsFilters;
