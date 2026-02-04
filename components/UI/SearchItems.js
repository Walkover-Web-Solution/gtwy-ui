import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import Protected from "../Protected";
const SearchItems = ({ data, setFilterItems, item, style = "", isEmbedUser }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterParam = searchParams.get("filter");
  const isWorkspaceItem = item === "Organizations" || item === "Workspaces" || (item === "Agents" && isEmbedUser);
  const itemLabel = item === "Organizations" ? "Workspaces" : item;
  const userClearedSearch = useRef(false);
  const searchInputRef = useRef(null);
  // Detect platform for keyboard shortcut display
  const isMac = useMemo(() => {
    if (typeof window !== "undefined") {
      return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    }
    return false;
  }, []);

  const shortcutText = isMac ? "⌘K" : "Ctrl+K";
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);
  // Function to open command palette (disabled for workspace search to allow typing)
  const openCommandPalette = () => {
    if (isWorkspaceItem) return; // Don't open command palette for Workspaces

    // Dispatch a custom event to trigger the command palette
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true, // Cmd on Mac
      ctrlKey: true, // Ctrl on Windows/Linux
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  const clearFilter = () => {
    // Remove filter parameter from URL
    const url = new URL(window.location);
    url.searchParams.delete("filter");
    router.push(url.pathname + url.search);
    setSearchTerm("");
  };

  // Handle URL filter parameter
  useEffect(() => {
    if (filterParam && data && !userClearedSearch.current) {
      // Find the item that matches the filter parameter
      const matchedItem = data.find(
        (item) => item?._id === filterParam || item?.id === filterParam || item?.id?.toString() === filterParam
      );

      if (matchedItem) {
        // Set the search term to the matched item's name or ID
        const displayName = matchedItem.name || matchedItem.slugName || matchedItem._id || matchedItem.id;
        setSearchTerm(displayName);
      }
    } else if (!filterParam) {
      // Clear search term when no filter parameter
      setSearchTerm("");
      userClearedSearch.current = false;
    }
  }, [filterParam, data]);

  // Auto-clear filter when search term is completely removed by user
  useEffect(() => {
    if (filterParam && searchTerm.trim() === "" && userClearedSearch.current) {
      // If there's a filter active but search term is empty and user cleared it, clear the filter
      const url = new URL(window.location);
      url.searchParams.delete("filter");
      router.push(url.pathname + url.search);
      userClearedSearch.current = false;
    }
  }, [searchTerm, filterParam, router]);

  // Memoize the filtering logic to prevent infinite re-renders
  const filterData = useCallback(() => {
    const filtered =
      data?.filter(
        (item) =>
          (item?.name && item?.name?.toLowerCase()?.includes(searchTerm.toLowerCase().trim())) ||
          (item?.slugName && item?.slugName?.toLowerCase()?.includes(searchTerm.toLowerCase().trim())) ||
          (item?.service && item?.service?.toLowerCase()?.includes(searchTerm.toLowerCase().trim())) ||
          (item?._id && item?._id?.toLowerCase()?.includes(searchTerm.toLowerCase().trim())) ||
          (item?.flow_name && item?.flow_name?.toLowerCase()?.includes(searchTerm.toLowerCase().trim())) ||
          (item?.id && item?.id?.toString()?.toLowerCase()?.includes(searchTerm.toLowerCase().trim()))
      ) || [];
    return filtered;
  }, [data, searchTerm]);

  useEffect(() => {
    const filtered = filterData();
    setFilterItems(filtered);
  }, [filterData, setFilterItems]);

  const containerClasses = isWorkspaceItem ? `${item === "org" ? "w-full mt-2" : "max-w-xs ml-2"}` : "max-w-xs ml-2";
  const inputClasses = style
    ? style
    : "input input-sm w-full border bg-white dark:bg-base-200 border-base-content/50 pr-16";

  return (
    <div className={containerClasses}>
      <div className="relative">
        <input
          id="search-items-input"
          type="text"
          ref={searchInputRef}
          aria-label={`Search ${itemLabel} by Name, SlugName, Service, or ID`}
          placeholder={filterParam ? "Filtered - Click X to clear" : "Search"}
          value={searchTerm}
          className={inputClasses}
          data-allow-org-nav={isWorkspaceItem ? "true" : "false"}
          onChange={(e) => {
            const newValue = e.target.value;
            setSearchTerm(newValue);
            // Track if user is clearing the search
            if (filterParam && newValue.trim() === "") {
              userClearedSearch.current = true;
            }
          }}
          onClick={!isWorkspaceItem && !filterParam ? openCommandPalette : undefined}
          readOnly={!filterParam && !isWorkspaceItem}
        />
        {!isWorkspaceItem && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {filterParam && (
              <button
                id="search-items-clear-filter-button"
                onClick={clearFilter}
                className="btn btn-xs btn-ghost p-1 hover:bg-error hover:text-error-content"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {!filterParam && (
              <kbd
                className={`kbd kbd-xs bg-base-200 text-base-content/70 border border-base-content/20 ${isMac ? "px-1.5" : "px-1"}`}
              >
                {shortcutText}
              </kbd>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Protected(SearchItems);
