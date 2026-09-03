import { useState, useCallback } from "react";
import { getMetricsDataApi } from "@/config/index";
import { METRICS_FACTOR_OPTIONS } from "@/utils/enums";

// Data conversion logic extracted from the main component
export const convertApiData = (
  apiData,
  factor = 0,
  range = 1,
  allBridges = [],
  apiKeys = [],
  customStartDate = null,
  customEndDate = null
) => {
  const factorOptions = ["bridge_id", "apikey_id", "model"];
  const currentFactor = factorOptions[factor];

  const uniqueEntries = {};

  // Process API data into unique entries
  apiData.forEach((entry) => {
    const entryDate = new Date(entry.created_at);

    // Round down to nearest 15 minutes for range < 5
    if (range < 5) {
      const minutes = Math.floor(entryDate.getMinutes() / 15) * 15;
      entryDate.setMinutes(minutes, 0, 0);
    }

    // Key depends on range
    const key =
      range < 5
        ? entryDate.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
        : entryDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const entryId = entry[currentFactor];
    const uniqueKey = `${key}+${
      currentFactor === "bridge_id"
        ? entry.bridge_id
        : currentFactor === "apikey_id"
          ? entry.apikey_id
          : currentFactor === "model"
            ? entry.model
            : ""
    }`;

    if (!uniqueEntries[uniqueKey]) {
      uniqueEntries[uniqueKey] = {
        date: entryDate,
        id: entryId,
        cost: entry.cost_sum || 0,
        tokens: entry.total_token_count || 0,
        successCount: entry.success_count || 0,
      };
    } else {
      uniqueEntries[uniqueKey].cost += entry.cost_sum || 0;
      uniqueEntries[uniqueKey].tokens += entry.total_token_count || 0;
      uniqueEntries[uniqueKey].successCount += entry.success_count || 0;
    }
  });

  let timePoints = [];
  let intervalMs = 24 * 60 * 60 * 1000;

  if (range === 10 && customStartDate && customEndDate) {
    const startDate = new Date(customStartDate);
    const endDate = new Date(customEndDate);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= diffDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      timePoints.push(new Date(date));
    }

    intervalMs = 24 * 60 * 60 * 1000;
  } else {
    const now = new Date();
    const roundedNow = new Date(now);
    roundedNow.setMinutes(Math.floor(now.getMinutes() / 15) * 15, 0, 0);

    switch (range) {
      case 0: // 1 hour → 15 min
        intervalMs = 15 * 60 * 1000;
        timePoints = Array.from({ length: 4 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
      case 1: // 3 hours → 15 min
        intervalMs = 15 * 60 * 1000;
        timePoints = Array.from({ length: 12 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
      case 2: // 6 hours → 30 min
        intervalMs = 15 * 60 * 1000;
        timePoints = Array.from({ length: 24 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
      case 3: // 12 hours → 1 hour
        intervalMs = 15 * 60 * 1000;
        timePoints = Array.from({ length: 48 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
      case 4: // 1 day → 2 hours
        intervalMs = 15 * 60 * 1000;
        timePoints = Array.from({ length: 96 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
      case 5: // 2 days → 4 hours
        intervalMs = 24 * 60 * 60 * 1000;
        timePoints = Array.from({ length: 2 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
      case 6: // 7 days
        intervalMs = 24 * 60 * 60 * 1000;
        timePoints = Array.from({ length: 7 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
      case 7: // 14 days
        intervalMs = 24 * 60 * 60 * 1000;
        timePoints = Array.from({ length: 14 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
      case 8: // 30 days
      default:
        intervalMs = 24 * 60 * 60 * 1000;
        timePoints = Array.from({ length: 30 }, (_, i) => new Date(roundedNow.getTime() - i * intervalMs)).reverse();
        break;
    }
  }

  // Initialize grouped data
  const groupedByDate = {};

  timePoints.forEach((date) => {
    const dateStr =
      range < 5
        ? new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(date)
        : new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            month: "short",
          }).format(date);

    groupedByDate[dateStr] = {
      items: [],
      totalCost: 0,
      rawDate: new Date(date),
    };
  });

  // Fill grouped data from uniqueEntries
  Object.values(uniqueEntries).forEach((entry) => {
    const dateStr =
      range < 5
        ? new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(entry.date)
        : new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            month: "short",
          }).format(entry.date);

    if (groupedByDate[dateStr]) {
      let name = "";
      if (currentFactor === "bridge_id") {
        const bridge = allBridges.find((b) => b._id === entry.id);
        name = bridge ? bridge.name : `Bridge ${entry.id?.substring(0, 6)}`;
      } else if (currentFactor === "apikey_id") {
        const apiKey = apiKeys.find((k) => k._id === entry.id);
        name = apiKey ? apiKey.name : `API Key ${entry.id?.substring(0, 6)}`;
      } else {
        name = entry.id || "Unknown Model";
      }

      const existingItemIndex = groupedByDate[dateStr].items.findIndex((item) => item.id === entry.id);

      if (existingItemIndex >= 0) {
        groupedByDate[dateStr].items[existingItemIndex].cost += entry.cost;
        groupedByDate[dateStr].items[existingItemIndex].tokens += entry.tokens;
        groupedByDate[dateStr].items[existingItemIndex].successCount += entry.successCount;
      } else {
        groupedByDate[dateStr].items.push({
          id: entry.id,
          name: name,
          cost: entry.cost,
          tokens: entry.tokens,
          successCount: entry.successCount,
        });
      }

      groupedByDate[dateStr].totalCost += entry.cost;
    }
  });

  return Object.keys(groupedByDate)
    .map((date) => ({
      period: date,
      date: groupedByDate[date].rawDate,
      totalCost: groupedByDate[date].totalCost,
      items: groupedByDate[date].items.length > 0 ? groupedByDate[date].items : [],
    }))
    .sort((a, b) => a.date - b.date);
};

// Aggregate data by factor function
export const aggregateDataByFactor = (rawData) => {
  const aggregated = {};

  rawData.forEach((period) => {
    period.items.forEach((item) => {
      const itemId = item.id;
      const itemName = item.name;

      if (!aggregated[itemId]) {
        aggregated[itemId] = {
          id: itemId,
          name: itemName,
          tokens: 0,
          cost: 0,
          successCount: 0,
        };
      }

      aggregated[itemId].tokens += item.tokens;
      aggregated[itemId].cost += item.cost;
      aggregated[itemId].successCount += item.successCount;
    });
  });

  return Object.values(aggregated).sort((a, b) => b.tokens - a.tokens);
};

// Custom hook for metrics data management
export const useMetricsData = (orgId, allBridges, apikeyData) => {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMetricsData = useCallback(
    async (factor, range, bridge, customStartDate, customEndDate) => {
      setLoading(true);

      try {
        const requestBody = {
          range: range === 10 ? 10 : range + 1,
          factor: METRICS_FACTOR_OPTIONS[factor],
          org_id: orgId,
        };

        if (bridge?.bridge_id) {
          requestBody.bridge_id = bridge.bridge_id;
        }

        if (range === 10 && customStartDate && customEndDate) {
          requestBody.start_date = customStartDate;
          requestBody.end_date = customEndDate;
        }

        const response = await getMetricsDataApi(requestBody);
        const data = convertApiData(response, factor, range, allBridges, apikeyData, customStartDate, customEndDate);
        setRawData(data);
      } catch (error) {
        console.error("Error fetching metrics data:", error);
        setRawData([]);
      } finally {
        setLoading(false);
      }
    },
    [orgId, allBridges, apikeyData]
  );

  return {
    rawData,
    loading,
    fetchMetricsData,
  };
};
