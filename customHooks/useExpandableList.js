import { useState, useMemo } from "react";

/**
 * Custom hook for managing expandable list functionality
 * Shows items at half length initially, expands to full length when adding more items
 *
 * @param {Array} items - Array of items to display
 * @param {number} halfLength - Number of items to show in half mode (default: 1)
 * @returns {Object} - { displayItems, isExpanded, toggleExpanded, shouldShowToggle }
 */
const useExpandableList = (items = [], halfLength = 1) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand when items exceed half length
  const shouldAutoExpand = items.length > halfLength;
  const effectiveExpanded = isExpanded || shouldAutoExpand;

  // Determine items to display
  const displayItems = useMemo(() => {
    if (effectiveExpanded || items.length <= halfLength) {
      return items;
    }
    return items.slice(0, halfLength);
  }, [items, effectiveExpanded, halfLength]);

  // Show toggle button only when there are more items than half length and not auto-expanded
  const shouldShowToggle = items.length > halfLength && !shouldAutoExpand;

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return {
    displayItems,
    isExpanded: effectiveExpanded,
    toggleExpanded,
    shouldShowToggle,
    totalItems: items.length,
    hiddenItemsCount: items.length - displayItems.length,
  };
};

export default useExpandableList;
