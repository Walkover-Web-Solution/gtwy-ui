import React, { useMemo } from "react";
import { SettingsIcon, TrashIcon, RefreshIcon, SquareFunctionIcon } from "@/components/Icons";
import useExpandableList from "@/customHooks/useExpandableList";

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
      const title = value?.title || integrationData?.[functionName]?.title;

      return (
        <div
          key={value?._id}
          id={value?._id}
          className={`group flex items-center border border-base-200 cursor-pointer bg-base-100 relative min-h-[44px] w-full ${value?.description?.trim() === "" ? "border-red-600" : ""} transition-colors duration-200`}
        >
          <div
            className="p-2 flex-1 flex items-center"
            onClick={() =>
              openViasocket(functionName, {
                embedToken,
                meta: {
                  type: "tool",
                  bridge_id: params?.id,
                },
              })
            }
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
                <SquareFunctionIcon size={16} className="shrink-0" />
              )}
              {title?.length > 24 ? (
                <div className="tooltip tooltip-top min-w-0" data-tip={title}>
                  <span className="min-w-0 text-sm truncate text-left">
                    <span className="truncate text-sm font-normal block w-[300px]">{title}</span>
                  </span>
                </div>
              ) : (
                <span className="min-w-0 text-sm truncate text-left">
                  <span className="truncate text-sm font-normal block w-[300px]">{title}</span>
                </span>
              )}
            </div>
          </div>

          {/* Action buttons that appear on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 pr-2 flex-shrink-0">
            <button
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
        </div>
      );
    });

    return (
      <div id="render-embed-container" className="w-full">
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
  ]);

  return renderEmbed;
};

export default RenderEmbed;
