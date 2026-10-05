import { useCallback } from "react";
import { useQueryParams } from "./useQueryParams";

export const useMetricsURL = () => {
  const { setParams } = useQueryParams();

  const updateURLParams = useCallback(
    (newParams) => {
      setParams(newParams, { replace: true });
    },
    [setParams]
  );

  const getDisplayRangeText = useCallback((range, customStartDate, customEndDate, TIME_RANGE_OPTIONS) => {
    if (range === 10 && customStartDate && customEndDate) {
      const formatDisplayDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      };

      const start = formatDisplayDate(customStartDate);
      const end = formatDisplayDate(customEndDate);
      return `${start} - ${end}`;
    }
    return TIME_RANGE_OPTIONS[range] || "Select Range";
  }, []);

  return {
    updateURLParams,
    getDisplayRangeText,
  };
};
