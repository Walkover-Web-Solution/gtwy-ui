import { getHistoryAction } from "@/store/action/historyAction";
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "next/navigation";
import { useCustomSelector } from "@/customHooks/customSelector";

// Helper function to get today's date with time set to 12:00 AM
const getDefaultDate = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 16); // Format to 'YYYY-MM-DDTHH:MM'
};

const DateRangePicker = ({
  params,
  setFilterOption,
  setHasMore,
  setPage,
  selectedVersion,
  filterOption,
  isErrorTrue,
}) => {
  const dispatch = useDispatch();
  const [startingDate, setStartingDate] = useState(getDefaultDate());
  const [endingDate, setEndingDate] = useState(getDefaultDate());

  const searchParams = useSearchParams();

  // Get search state to check if search is active
  const { searchQuery } = useCustomSelector((state) => ({
    searchQuery: state?.historyReducer?.search?.query || "",
  }));

  useEffect(() => {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (start) setStartingDate(start);
    if (end) setEndingDate(end);
  }, [searchParams]);

  const handleDataChange = async () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("start", startingDate);
    newSearchParams.set("end", endingDate);

    // Check if there's a search query in URL params or Redux state
    const currentSearchQuery = searchParams.get("message_id") || searchQuery;
    const keyword = currentSearchQuery || "";

    await dispatch(
      getHistoryAction(params.id, 1, filterOption, isErrorTrue, selectedVersion, keyword, startingDate, endingDate)
    );

    const queryString = newSearchParams.toString();
    window.history.replaceState(null, "", `?${queryString}`);
  };
  const handleClear = async () => {
    setStartingDate(getDefaultDate());
    setEndingDate(getDefaultDate());
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (!start && !end) return; // Do nothing if 'start' and 'end' are not in the URL
    setFilterOption("all");
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("start");
    newSearchParams.delete("end");
    newSearchParams.delete("thread_id");

    // Check if there's still a search query after clearing date range
    const currentSearchQuery = searchParams.get("message_id") || searchQuery;

    if (currentSearchQuery) {
      await dispatch(
        getHistoryAction(params.id, 1, filterOption, isErrorTrue, selectedVersion, currentSearchQuery, null, null)
      );
    } else {
      await dispatch(getHistoryAction(params.id, 1, filterOption, isErrorTrue, selectedVersion));
      setHasMore(true);
      setPage(1);
    }

    const queryString = newSearchParams.toString();
    window.history.replaceState(null, "", `?${queryString}`);
  };
  // ... existing code ...

  return (
    <div
      id="history-date-range-picker"
      className="border-b border-base-300 sticky flex flex-col gap-2 top-0 bg-base-200 z-low"
    >
      <div>
        <label htmlFor="from" className="block text-sm font-medium text-base-content ">
          From
        </label>
        <input
          id="from"
          type="datetime-local"
          className="w-full p-2 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Select date"
          value={startingDate}
          max={endingDate}
          onChange={(e) => setStartingDate(e.target.value)}
          onClick={(e) => e.target.showPicker()}
        />
      </div>
      <div>
        <label htmlFor="to" className="block text-sm font-medium text-base-content ">
          To
        </label>
        <input
          id="to"
          type="datetime-local"
          className="w-full p-2 border border-base-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Select date"
          value={endingDate}
          min={startingDate}
          onChange={(e) => setEndingDate(e.target.value)}
          onClick={(e) => e.target.showPicker()}
        />
      </div>

      <button
        id="history-date-range-apply-button"
        className="btn btn-primary btn-sm"
        onClick={handleDataChange}
        disabled={!startingDate || !endingDate} // Disable if either date is empty
      >
        Apply
      </button>
      <button id="history-date-range-clear-button" className="btn btn-outline btn-sm" onClick={handleClear}>
        Clear
      </button>
    </div>
  );
};

export default DateRangePicker;
