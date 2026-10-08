import { formatNextLimitReset, LIMIT_RESET_PERIOD_LABELS, normalizeLimitResetPeriod } from "@/utils/utility";

// Spend in the current reset window against its limit. anchorDate is the limit start date for limits
// that reset relative to it (agents); omit it for UTC calendar windows (API keys).
const LimitUsageCell = ({ usage, limit, resetPeriod, anchorDate = null }) => {
  const usageValue = Number(usage) || 0;
  const limitValue = Number(limit) || 0;

  // Fixed size in both states so every row and the column keep the same dimensions.
  const cellClass = "flex flex-col justify-center gap-1 w-40 h-10 text-left";

  if (limitValue <= 0) {
    return (
      <div className={cellClass}>
        <span className="text-xs text-base-content/60">No limit set</span>
      </div>
    );
  }

  const period = normalizeLimitResetPeriod(resetPeriod);
  const percent = Math.min(100, (usageValue / limitValue) * 100);
  const progressClass = percent >= 100 ? "progress-error" : percent >= 80 ? "progress-warning" : "progress-primary";

  return (
    <div
      className={`tooltip tooltip-primary ${cellClass}`}
      data-tip={`Resets ${formatNextLimitReset(period, anchorDate)}`}
    >
      <span className="text-sm truncate">
        ${usageValue.toFixed(4)}
        <span className="text-base-content/60"> / ${limitValue}</span>
      </span>
      <div className="flex items-center gap-2">
        <progress className={`progress ${progressClass} h-1.5 flex-1`} value={percent} max="100" />
        <span className="text-[10px] leading-none text-base-content/60">{LIMIT_RESET_PERIOD_LABELS[period]}</span>
      </div>
    </div>
  );
};

export default LimitUsageCell;
