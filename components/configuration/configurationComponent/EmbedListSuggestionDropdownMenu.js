import OnBoarding from "@/components/OnBoarding";
import TutorialSuggestionToast from "@/components/TutorialSuggestoinToast";
import { useCustomSelector } from "@/customHooks/customSelector";
import useTutorialVideos from "@/hooks/useTutorialVideos";
import { GetPreBuiltToolTypeIcon, getStatusClass } from "@/utils/utility";
import { AddIcon } from "@/components/Icons";
import React, { useMemo, useState } from "react";
import { truncate } from "@/components/historyPageComponents/AssistFile";

function EmbedListSuggestionDropdownMenu({
  params,
  searchParams,
  name,
  hideCreateFunction = false,
  onSelect = () => {},
  onSelectPrebuiltTool = () => {},
  connectedFunctions = [],
  shouldToolsShow,
  modelName,
  prebuiltToolsData,
  toolsVersionData,
  showInbuiltTools = {},
  tutorialState,
  setTutorialState,
  isPublished = false,
  isEditor = true,
}) {
  // Determine if content is read-only (either published or user is not an editor)
  // Use the tutorial videos hook
  const { getFunctionCreationVideo } = useTutorialVideos();

  const { integrationData, function_data, embedToken } = useCustomSelector((state) => {
    const orgId = Number(params?.org_id);
    const orgData = state?.bridgeReducer?.org?.[orgId] || {};
    return {
      integrationData: orgData.integrationData,
      function_data: orgData.functionData,
      embedToken: orgData.embed_token,
    };
  });

  const [searchQuery, setSearchQuery] = useState("");

  const handleInputChange = (e) => {
    setSearchQuery(e.target?.value || ""); // Update search query when the input changes
  };

  const handleItemClick = (id) => {
    onSelect(id); // Assuming onSelect is a function you've defined elsewhere
  };
  const handlePrebuiltToolClick = (tool) => {
    onSelectPrebuiltTool(tool);
  };
  const renderEmbedSuggestions = useMemo(
    () =>
      function_data &&
      Object.values(function_data)
        .filter((value) => {
          const fnName = value?.script_id;
          const title = value?.title || integrationData?.[fnName]?.title;
          return (
            title !== undefined &&
            title?.toLowerCase()?.includes(searchQuery.toLowerCase()) &&
            !(connectedFunctions || [])?.includes(value?._id)
          );
        })
        .slice() // Create a copy of the array to avoid mutating the original
        .sort((a, b) => {
          const aFnName = a?.script_id;
          const bFnName = b?.script_id;
          const aTitle = a?.title || integrationData?.[aFnName]?.title;
          const bTitle = b?.title || integrationData?.[bFnName]?.title;
          if (!aTitle) return 1;
          if (!bTitle) return -1;

          return aTitle?.localeCompare(bTitle); // Sort alphabetically based on title
        })
        .map((value) => {
          const functionName = value?.script_id;
          const status = value?.status || integrationData?.[functionName]?.status;
          const title = value?.title || integrationData?.[functionName]?.title || "Untitled";
          return (
            <li
              id={`embed-suggestion-function-${value?._id}`}
              key={value?._id}
              onClick={() => handleItemClick(value?._id)}
            >
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0" title={title?.length > 20 ? title : ""}>
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
                  ) : null}

                  <p className="overflow-hidden text-ellipsis whitespace-pre-wrap">
                    {title?.length > 20 ? `${title.slice(0, 20)}...` : title}
                  </p>
                </div>
                <div>
                  <span
                    className={`rounded-full capitalize bg-base-200 px-3 py-1 text-[10px] sm:text-xs font-semibold text-black ${getStatusClass(status)}`}
                  >
                    {value?.description?.trim() === "" ? "Ongoing" : status === 1 ? "Active" : status}
                  </span>
                </div>
              </div>
            </li>
          );
        }),
    [integrationData, function_data, searchQuery, getStatusClass, connectedFunctions, searchParams?.version]
  );

  const availablePrebuiltTools = useMemo(() => {
    const list = Array.isArray(prebuiltToolsData) ? prebuiltToolsData : [];
    const selected = new Set(Array.isArray(toolsVersionData) ? toolsVersionData : []);
    return list.filter(
      (t) =>
        !selected.has(t.value) &&
        t?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase() || "") &&
        showInbuiltTools?.[t?.value]
    );
  }, [prebuiltToolsData, toolsVersionData, searchQuery, showInbuiltTools]);

  return (
    <>
      {tutorialState?.showSuggestion && (
        <TutorialSuggestionToast
          setTutorialState={setTutorialState}
          flagKey={"FunctionCreation"}
          TutorialDetails={"Tool Configuration"}
        />
      )}
      {tutorialState?.showTutorial && (
        <OnBoarding
          setShowTutorial={() => setTutorialState((prev) => ({ ...prev, showTutorial: false }))}
          video={getFunctionCreationVideo()}
          flagKey={"FunctionCreation"}
        />
      )}
      {!tutorialState?.showTutorial && (
        <ul
          id="embed-suggestion-dropdown-menu"
          tabIndex={0}
          className="menu menu-dropdown-toggle dropdown-content z-high px-4 shadow bg-base-100 rounded-box w-72 max-h-96 overflow-y-auto pb-0"
        >
          <div className="flex flex-col gap-2 w-full">
            {name === "preFunction" ? (
              <li className="text-sm font-semibold disabled">Available Pre Functions</li>
            ) : (
              <li className="text-sm font-semibold disabled">Available Tools</li>
            )}
            <input
              id="embed-suggestion-search-input"
              type="text"
              placeholder={`Search ${name == "preFunction" ? "Pre Function" : "Tool"}`}
              value={searchQuery}
              onChange={handleInputChange} // Update search query on input change
              className="input input-bordered w-full input-sm"
            />
            {Object.values(function_data || {})?.length > 0 ? (
              renderEmbedSuggestions
            ) : (
              <li className="text-center mt-2">No tools found</li>
            )}
            {name != "preFunction" && (
              <>
                <li className="text-sm font-semibold disabled mt-2">Prebuilt Tools</li>
                {availablePrebuiltTools.length > 0 ? (
                  availablePrebuiltTools.map((item) => (
                    <li
                      id={`embed-suggestion-prebuilt-${item?.value}`}
                      key={item?._id}
                      onClick={() => handlePrebuiltToolClick(item)}
                    >
                      <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-2">
                          {GetPreBuiltToolTypeIcon(item?.value, 16, 16)}
                          {item?.name?.length > 20 ? (
                            <div className="tooltip" data-tip={item?.name}>
                              {truncate(item?.name, 20)}
                            </div>
                          ) : (
                            truncate(item?.name, 20)
                          )}
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-center mt-2">No prebuilt tools</li>
                )}
              </>
            )}

            {!hideCreateFunction && (
              <li
                id="embed-suggestion-add-new-button"
                className="border-t border-base-300 w-full sticky bottom-0 bg-base-100 py-2"
                onClick={() =>
                  openViasocket(undefined, {
                    embedToken,
                    meta: {
                      createFrom: name,
                      type: "tool",
                      bridge_id: params?.id,
                    },
                  })
                }
              >
                <div>
                  <AddIcon size={16} />
                  <p className="font-semibold">Add new Tools</p>
                </div>
              </li>
            )}
          </div>
        </ul>
      )}
    </>
  );
}

export default EmbedListSuggestionDropdownMenu;
