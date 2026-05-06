import React, { useMemo } from "react";
import { SettingsIcon, TrashIcon, RefreshIcon, SquareFunctionIcon } from "@/components/Icons";
import useExpandableList from "@/customHooks/useExpandableList";
import InfoTooltip from "@/components/InfoTooltip";
import { AlertTriangle } from "lucide-react";

const WEB_SEARCH_WARNING_CLASS = "border-warning/40";
const WEB_SEARCH_TOKEN_WARNING = "Selecting Web Search can cause heavy token utilization and may exceed 10,000 tokens.";

const truncateTitle = (text, maxLength) => {
  if (!maxLength || typeof text !== "string") return text;
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
};

const RenderEmbed = ({
  bridgeFunctions,
  integrationData,
  getStatusClass,
  handleOpenModal,
  embedToken,
  params,
  handleRemoveEmbed,
  handleOpenDeleteModal,
  handleChangePreTool,
  name,
  halfLength = 1,
  isPublished,
  isEditor = true,
  maxTitleLength,
}) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  // Sort functions first
  const sortedFunctions = useMemo(() => {
    return (
      bridgeFunctions?.slice().sort((a, b) => {
        const aFnName = a?.script_id;
        const bFnName = b?.script_id;
        const aTitle = a?.title || integrationData?.[aFnName]?.title;
        const bTitle = b?.title || integrationData?.[bFnName]?.title;
        if (!aTitle) return 1;
        if (!bTitle) return -1;
        return aTitle?.localeCompare(bTitle);
      }) || []
    );
  }, [bridgeFunctions, integrationData]);

  // Use expandable list hook
  const { displayItems, isExpanded, toggleExpanded, shouldShowToggle, hiddenItemsCount } = useExpandableList(
    sortedFunctions,
    halfLength
  );

  const renderEmbed = useMemo(() => {
    const embedItems = displayItems?.map((value) => {
      const functionName = value?.script_id;
      const rawTitle = value?.title || integrationData?.[functionName]?.title;
      const title = truncateTitle(rawTitle, maxTitleLength);
      const isTitleTruncated = !!maxTitleLength && typeof rawTitle === "string" && rawTitle.length > maxTitleLength;
      const isWebSearchPreTool = value?._type === "gtwy_web_search";

      return (
        <div
          data-testid={`render-embed-item-${value?._id}`}
          key={value?._id}
          id={value?._id}
          className={`group flex items-center border cursor-pointer bg-base-100 relative min-h-[44px] w-full ${
            value?.description?.trim() === ""
              ? "border-red-600"
              : isWebSearchPreTool
                ? WEB_SEARCH_WARNING_CLASS
                : "border-base-200"
          } transition-colors duration-200`}
        >
          <div
            className="p-2 flex-1 flex items-center"
            onClick={() => {
              if (isReadOnly) return;
              if (value?._type === "custom_function" || !value?._type) {
                openViasocket(functionName, {
                  embedToken,
                  meta: {
                    type: "tool",
                    bridge_id: params?.id,
                  },
                });
              }
            }}
            disabled={isReadOnly}
          >
            <div className="flex items-center gap-2 w-full">
              {integrationData?.[functionName]?.serviceIcons?.length > 0 ? (
                <div className="flex items-center -space-x-2 flex-shrink-0">
                  {integrationData[functionName].serviceIcons.slice(0, 5).map((icon, index) => (
                    <img
                      key={index}
                      src={icon}
                      alt={`${title} icon ${index + 1}`}
                      className="w-6 h-6 rounded-full border-2 border-base-100 flex-shrink-0 object-contain bg-white p-0.5"
                      style={{ zIndex: 5 - index }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ))}
                </div>
              ) : (
                <SquareFunctionIcon className="w-6 h-6 shrink-0" />
              )}
              {isTitleTruncated || (title?.length || 0) > 24 ? (
                <div className="tooltip tooltip-top min-w-0 flex-1 overflow-hidden" data-tip={rawTitle}>
                  <span className="block text-sm font-normal truncate text-left">{title}</span>
                </div>
              ) : (
                <span className="block text-sm font-normal truncate flex-1 min-w-0 text-left">{title}</span>
              )}
            </div>
          </div>

          {/* Action buttons that appear on hover */}
          <div
            className={`opacity-0 ${!isReadOnly ? "group-hover:opacity-100" : ""} transition-opacity duration-200 flex gap-1 pr-2 flex-shrink-0`}
          >
            <button
              data-testid={`render-embed-config-button-${value?._id}`}
              id={`render-embed-config-button-${value?._id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(value?._id);
              }}
              className="btn btn-ghost btn-sm p-1 hover:bg-base-300"
              title="Config"
            >
              <SettingsIcon size={16} />
            </button>
            {name === "preFunction" && handleChangePreTool && (
              <button
                data-testid={`render-embed-refresh-button-${value?._id}`}
                id={`render-embed-refresh-button-${value?._id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleChangePreTool();
                }}
                className="btn btn-ghost btn-sm p-1"
                title="Change Pre Tool"
                disabled={isReadOnly}
              >
                <RefreshIcon size={16} />
              </button>
            )}
            <button
              data-testid={`render-embed-delete-button-${value?._id}`}
              id={`render-embed-delete-button-${value?._id}`}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDeleteModal(value?._id, value?.script_id);
              }}
              className="btn btn-ghost btn-sm p-1 hover:bg-red-100 hover:text-error"
              title="Remove"
              disabled={isReadOnly}
            >
              <TrashIcon size={16} />
            </button>
          </div>
          {isWebSearchPreTool && (
            <span
              className="pr-2"
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <InfoTooltip tooltipContent={WEB_SEARCH_TOKEN_WARNING}>
                <button
                  type="button"
                  aria-label="Web Search token usage warning"
                  className="btn btn-ghost btn-sm p-1 text-warning"
                >
                  <AlertTriangle size={16} />
                </button>
              </InfoTooltip>
            </span>
          )}
        </div>
      );
    });

    return (
      <div data-testid="render-embed-container" id="render-embed-container" className="w-full">
        <div className={`grid gap-2 w-full`}>{embedItems}</div>
      </div>
    );
  }, [
    displayItems,
    integrationData,
    getStatusClass,
    handleOpenModal,
    embedToken,
    params,
    handleRemoveEmbed,
    handleChangePreTool,
    name,
    shouldShowToggle,
    isExpanded,
    toggleExpanded,
    hiddenItemsCount,
    isReadOnly,
    maxTitleLength,
  ]);

  return renderEmbed;
};

export default RenderEmbed;
