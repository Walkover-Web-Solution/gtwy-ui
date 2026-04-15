import InfoTooltip from "@/components/InfoTooltip";
import { Info } from "lucide-react";

export const WEB_SEARCH_TOKEN_WARNING =
  "Selecting Web Search can cause heavy token utilization and may exceed 10,000 tokens.";

export const WEB_SEARCH_PREBUILT_TOOL_VALUES = new Set(["web_search", "Gtwy_Web_Search"]);

export const WEB_SEARCH_WARNING_CLASS = "border-warning/40 bg-warning/5";

export const WebSearchWarningInfo = () => (
  <span
    className="flex-shrink-0"
    onClick={(event) => event.stopPropagation()}
    onMouseDown={(event) => event.stopPropagation()}
  >
    <InfoTooltip tooltipContent={WEB_SEARCH_TOKEN_WARNING}>
      <button
        type="button"
        aria-label="Web Search token usage warning"
        className="btn btn-ghost btn-xs min-h-0 h-6 w-6 p-0 text-warning hover:bg-warning/10"
      >
        <Info size={14} />
      </button>
    </InfoTooltip>
  </span>
);
