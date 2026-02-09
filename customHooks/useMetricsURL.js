import { useCallback } from "react";
import { useRouter } from "next/navigation";

export const useMetricsURL = (searchParams) => {
  const router = useRouter();

  const updateURLParams = useCallback(
    (newParams) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));

      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          current.set(key, value);
        } else {
          current.delete(key);
        }
      });

      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.replace(`${window.location.pathname}${query}`, { scroll: false });
    },
    [searchParams, router]
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
