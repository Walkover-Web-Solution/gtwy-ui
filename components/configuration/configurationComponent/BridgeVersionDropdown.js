import dynamic from "next/dynamic";
const PublishBridgeVersionModal = dynamic(() => import("@/components/modals/PublishBridgeVersionModal"), {
  ssr: false,
});
import VersionDescriptionModal from "@/components/modals/VersionDescriptionModal";
import Protected from "@/components/Protected";
import { useCustomSelector } from "@/customHooks/customSelector";
import {
  createBridgeVersionAction,
  deleteBridgeVersionAction,
  getBridgeVersionAction,
} from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, sendDataToParent } from "@/utils/utility";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";

// Global tracking to prevent duplicate calls across component instances
const globalFetchTracker = {
  inProgress: new Set(),
};
import { useDispatch } from "react-redux";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { TrashIcon } from "@/components/Icons";
import DeleteModal from "@/components/UI/DeleteModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

function BridgeVersionDropdown({ params, searchParams, isEmbedUser, maxVersions = 2, shouldFetch = true }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const versionDescriptionRef = useRef("");
  const hasInitialized = useRef(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [maxVisibleVersions, setMaxVisibleVersions] = useState(maxVersions);
  const [selectedDataToDelete, setselectedDataToDelete] = useState();
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_VERSION_MODAL);
  const dropdownRef = useRef(null);

  const { bridgeVersionsArray, publishedVersion, bridgeName, versionDescription, bridgeVersionMapping } =
    useCustomSelector((state) => ({
      bridgeVersionsArray: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.versions || [],
      publishedVersion: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.published_version_id || null,
      bridgeName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.name || "",
      versionDescription:
        state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.get?.("version")]
          ?.version_description || "",
      bridgeVersionMapping: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id] || {},
    }));

  const bridgeVersionMappingRef = useRef(bridgeVersionMapping);
  useEffect(() => {
    bridgeVersionMappingRef.current = bridgeVersionMapping;
  }, [bridgeVersionMapping]);

  useEffect(() => {
    setMaxVisibleVersions(maxVersions);
  }, [maxVersions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowVersionDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      debounceTimers.current.forEach((timerId) => clearTimeout(timerId));
      debounceTimers.current.clear();
    };
  }, []);

  const debounceTimers = useRef(new Map());
  const fetchVersionData = useCallback(
    (versionId) => {
      if (!versionId || !params?.id || !shouldFetch) return;
      if (globalFetchTracker.inProgress.has(versionId)) {
        return;
      }
      if (debounceTimers.current.has(versionId)) {
        clearTimeout(debounceTimers.current.get(versionId));
      }

      const timerId = setTimeout(() => {
        if (globalFetchTracker.inProgress.has(versionId)) {
          return;
        }
        globalFetchTracker.inProgress.add(versionId);
        dispatch(getBridgeVersionAction({ versionId, version_description: versionDescriptionRef })).finally(() => {
          globalFetchTracker.inProgress.delete(versionId);
        });

        debounceTimers.current.delete(versionId);
      }, 100);

      debounceTimers.current.set(versionId, timerId);
    },
    [dispatch, params?.id, shouldFetch]
  );

  // Helper function to get version description
  const getVersionDescription = useCallback(
    (versionId) => {
      return bridgeVersionMapping?.[versionId]?.version_description || "";
    },
    [bridgeVersionMapping]
  );

  // Helper function to get version display name
  const getVersionDisplayName = useCallback(
    (version) => {
      // Find the index in the original array (this maintains consistent numbering)
      const originalIndex = bridgeVersionsArray.indexOf(version);

      if (version === publishedVersion) {
        // For published version, show "V{number} Published"
        return `V${originalIndex + 1} `;
      } else {
        // For non-published versions, show "V{number}"
        return `V${originalIndex + 1}`;
      }
    },
    [bridgeVersionsArray, publishedVersion]
  );

  // Memoize current version and isPublished to prevent unnecessary re-renders
  const currentVersion = useMemo(() => searchParams?.get?.("version"), [searchParams]);
  const currentIsPublished = useMemo(() => searchParams?.get?.("isPublished") === "true", [searchParams]);

  // SendDataToChatbot effect - only runs when version changes
  useEffect(() => {
    if (!currentVersion) return;

    const timer = setInterval(() => {
      if (typeof SendDataToChatbot !== "undefined") {
        SendDataToChatbot(currentIsPublished ? { version_id: "null" } : { version_id: currentVersion });
        clearInterval(timer);
      }
    }, 300);

    return () => clearInterval(timer);
  }, [currentVersion, currentIsPublished]);

  // Initialize version only once on mount or when versions become available
  useEffect(() => {
    if (hasInitialized.current || !params?.id || !shouldFetch) {
      return;
    }

    // If isPublished=true, don't push version ID - just return
    if (currentIsPublished) {
      hasInitialized.current = true;
      return;
    }

    // If no version in URL but we have versions available
    if (!currentVersion && (bridgeVersionsArray.length > 0 || publishedVersion)) {
      const defaultVersion = publishedVersion || bridgeVersionsArray[0];
      if (defaultVersion) {
        hasInitialized.current = true;
        // Only update URL, don't fetch yet - the next effect will handle fetching
        router.push(`/org/${params.org_id}/agents/configure/${params.id}?version=${defaultVersion}`);
      }
    } else if (currentVersion && !bridgeVersionMapping?.[currentVersion] && shouldFetch) {
      hasInitialized.current = true;
      fetchVersionData(currentVersion);
    } else if (currentVersion && bridgeVersionMapping?.[currentVersion]) {
      hasInitialized.current = true;
    }
  }, [
    bridgeVersionsArray.length,
    publishedVersion,
    currentVersion,
    currentIsPublished,
    params.id,
    params.org_id,
    router,
    fetchVersionData,
    bridgeVersionMapping,
    shouldFetch,
  ]);

  const handleVersionChange = useCallback(
    (version) => {
      if (currentVersion === version) return;
      router.push(`/org/${params.org_id}/agents/configure/${params.id}?version=${version}`);
      fetchVersionData(version);
    },
    [currentVersion, params.org_id, params.id, router, fetchVersionData]
  );

  const handleCreateNewVersion = () => {
    // create new version
    const version_description_input = versionDescriptionRef?.current?.value;

    // Validate inputs
    if (!version_description_input || version_description_input.trim() === "") {
      alert("Please enter a version description");
      return;
    }

    if (!params.id || !params.org_id) {
      console.error("Missing required parameters:", { bridgeId: params.id, orgId: params.org_id });
      alert("Missing required parameters. Please refresh the page and try again.");
      return;
    }

    // Use current version, published version, or first available version as parent
    const currentVersion = searchParams?.get?.("version");
    const parentVersionId = currentVersion || publishedVersion || bridgeVersionsArray[0];

    if (!parentVersionId) {
      console.error("No parent version available for creating new version");
      alert("No parent version available. Please ensure there's at least one existing version.");
      return;
    }
    dispatch(
      createBridgeVersionAction(
        {
          parentVersionId: parentVersionId,
          bridgeId: params.id,
          version_description: versionDescriptionRef?.current?.value,
          orgId: params.org_id,
        },
        (data) => {
          if (data && data.version_id) {
            isEmbedUser &&
              sendDataToParent(
                "updated",
                {
                  name: bridgeName,
                  agent_description: version_description_input,
                  agent_id: params?.id,
                  agent_version_id: data?.version_id,
                },
                "Agent Version Created Successfully"
              );
            router.push(`/org/${params.org_id}/agents/configure/${params.id}?version=${data.version_id}`);
          } else {
            console.error("Version creation failed - no version_id returned:", data);
          }
        },
        (error) => {
          console.error("Version creation failed:", error);
        }
      )
    );
    versionDescriptionRef.current.value = "";
  };

  const handleDeleteVersion = useCallback(async () => {
    if (bridgeVersionsArray.length <= 1) {
      alert("Cannot delete the only remaining version");
      return;
    }
    if (selectedDataToDelete?.version === publishedVersion) {
      alert("Cannot delete the published version");
      return;
    }

    await executeDelete(async () => {
      await dispatch(
        deleteBridgeVersionAction({
          versionId: selectedDataToDelete?.version,
          bridgeId: params.id,
          org_id: params.org_id,
        })
      );
      const currentVersion = searchParams?.get?.("version");
      if (currentVersion === selectedDataToDelete?.version) {
        const remainingVersions = bridgeVersionsArray.filter((v) => v !== selectedDataToDelete?.version);
        const nextVersion =
          publishedVersion && publishedVersion !== selectedDataToDelete?.version
            ? publishedVersion
            : remainingVersions[0];
        router.push(`/org/${params.org_id}/agents/configure/${params.id}?version=${nextVersion}`);
      }
      setselectedDataToDelete(null);
    });
  }, [
    bridgeVersionsArray,
    publishedVersion,
    searchParams?.get?.("version"),
    params,
    router,
    selectedDataToDelete,
    dispatch,
    executeDelete,
  ]);

  // Determine which versions to show with published version always on left
  const getVersionsToShow = () => {
    // Create array with published version first, then other versions
    const otherVersions = bridgeVersionsArray.filter((v) => v !== publishedVersion);
    const orderedVersions = publishedVersion ? [publishedVersion, ...otherVersions] : bridgeVersionsArray;

    if (orderedVersions.length <= maxVisibleVersions) {
      return orderedVersions;
    }

    const currentVersion = searchParams?.get?.("version");

    // If published version exists, always ensure it's included first
    if (publishedVersion) {
      // Always include published version as first item
      const remainingSlots = maxVisibleVersions - 1;

      // Find where the current version is in the other versions array
      const currentVersionIndexInOthers = otherVersions.findIndex((v) => v === currentVersion);

      if (currentVersion === publishedVersion) {
        // Current version is published, show published + first other versions
        const additionalVersions = otherVersions.slice(0, remainingSlots);
        return [publishedVersion, ...additionalVersions];
      } else if (currentVersionIndexInOthers !== -1) {
        // Current version is not published but exists in other versions
        // Create a window that includes the current version
        let startIndex = 0;
        let endIndex = remainingSlots;

        // If current version is within first remainingSlots, show from start
        if (currentVersionIndexInOthers < remainingSlots) {
          startIndex = 0;
          endIndex = remainingSlots;
        } else {
          // Current version is beyond initial window, center it
          const halfWindow = Math.floor(remainingSlots / 2);
          startIndex = Math.max(0, currentVersionIndexInOthers - halfWindow);
          endIndex = Math.min(otherVersions.length, startIndex + remainingSlots);

          // Adjust if we're near the end
          if (endIndex - startIndex < remainingSlots) {
            startIndex = Math.max(0, otherVersions.length - remainingSlots);
            endIndex = otherVersions.length;
          }
        }

        const selectedVersions = otherVersions.slice(startIndex, endIndex);
        return [publishedVersion, ...selectedVersions];
      } else {
        // Current version not found, show published + first other versions
        const additionalVersions = otherVersions.slice(0, remainingSlots);
        return [publishedVersion, ...additionalVersions];
      }
    } else {
      // No published version - use sliding window approach for current version
      const currentVersionIndex = orderedVersions.findIndex((v) => v === currentVersion);

      if (currentVersionIndex === -1) {
        // No current version found, show first versions
        return orderedVersions.slice(0, maxVisibleVersions);
      }

      // Calculate window that includes current version
      let startIndex = 0;
      let endIndex = maxVisibleVersions;

      if (currentVersionIndex < maxVisibleVersions) {
        // Current version is in first window
        startIndex = 0;
        endIndex = maxVisibleVersions;
      } else {
        // Current version is beyond first window, center it
        const halfWindow = Math.floor(maxVisibleVersions / 2);
        startIndex = Math.max(0, currentVersionIndex - halfWindow);
        endIndex = Math.min(orderedVersions.length, startIndex + maxVisibleVersions);

        // Adjust if we're near the end
        if (endIndex - startIndex < maxVisibleVersions) {
          startIndex = Math.max(0, orderedVersions.length - maxVisibleVersions);
          endIndex = orderedVersions.length;
        }
      }

      return orderedVersions.slice(startIndex, endIndex);
    }
  };

  const versionsToShow = getVersionsToShow();
  const hasMoreVersions = bridgeVersionsArray.length > maxVisibleVersions;

  if (!bridgeVersionsArray.length) {
    return (
      <div id="bridge-version-dropdown-empty" className="flex items-center gap-2">
        <PublishBridgeVersionModal
          params={params}
          searchParams={searchParams}
          agent_name={bridgeName}
          agent_description={versionDescription}
        />
        <VersionDescriptionModal
          versionDescriptionRef={versionDescriptionRef}
          handleCreateNewVersion={handleCreateNewVersion}
        />
      </div>
    );
  }

  return (
    <div id="bridge-version-dropdown-container" className="flex items-center gap-1">
      {/* Version Tabs Container */}
      <div id="bridge-version-tabs" className="flex items-center gap-1">
        {versionsToShow.map((version, index) => {
          const isActive = searchParams.get?.("version") === version;
          const isPublished = version === publishedVersion;
          const versionDisplayName = getVersionDisplayName(version);
          const versionDesc = getVersionDescription(version);
          const canDelete = bridgeVersionsArray.length > 1 && !isPublished;
          return (
            <div key={version} className="relative group">
              <div className={versionDesc ? "tooltip tooltip-bottom" : ""} data-tip={versionDesc}>
                <button
                  id={`version-button-${version}`}
                  onClick={() => handleVersionChange(version)}
                  className={`
                                   btn btn-xs flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 relative whitespace-nowrap min-w-fit
                                    ${canDelete ? "group-hover:pr-8" : ""}
                                    ${
                                      isActive
                                        ? isPublished
                                          ? "bg-green-100 text-green-800 border border-green-300"
                                          : "bg-primary hover:bg-primary text-primary-content"
                                        : isPublished
                                          ? "bg-base-100 text-base-content hover:bg-green-50 hover:text-green-700 border border-base-300"
                                          : "text-base-content/70 hover:text-base-content"
                                    }
                                `}
                  style={{ minWidth: "max-content" }}
                >
                  <span>{versionDisplayName}</span>
                  {isPublished && (
                    <span
                      className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"
                      title="Published Version"
                    ></span>
                  )}
                </button>
              </div>

              {/* Delete Button - appears on hover, positioned outside button */}
              {canDelete && (
                <span
                  id={`version-delete-button-${version}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setselectedDataToDelete({ version, index: bridgeVersionsArray.indexOf(version) + 1 });
                    openModal(MODAL_TYPE?.DELETE_VERSION_MODAL);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 
                                             transition-opacity duration-200 hover:bg-red-100 rounded p-0.5 z-10 cursor-pointer"
                  title={`Delete Version ${bridgeVersionsArray.indexOf(version) + 1}`}
                >
                  <TrashIcon size={12} className="text-red-500 hover:text-red-700" />
                </span>
              )}
            </div>
          );
        })}

        {/* Version Dropdown */}
        {hasMoreVersions && (
          <div id="version-dropdown-wrapper" className="relative" ref={dropdownRef}>
            <button
              id="version-dropdown-toggle"
              onClick={() => setShowVersionDropdown(!showVersionDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-base-100 text-base-content hover:bg-base-200 rounded-md transition-all duration-200"
              title={`Show All Versions (${bridgeVersionsArray.length - versionsToShow.length} more)`}
            >
              {showVersionDropdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span className="text-xs">+{bridgeVersionsArray.length - versionsToShow.length}</span>
            </button>

            {/* Dropdown Menu */}
            {showVersionDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                <div className="p-2">
                  <div id="version-dropdown-menu" className="text-xs font-medium text-base-content/70 mb-2 px-2">
                    All Versions
                  </div>
                  {bridgeVersionsArray.map((version, index) => {
                    const isActive = searchParams?.get?.("version") === version;
                    const isPublished = version === publishedVersion;
                    const versionDisplayName = getVersionDisplayName(version);
                    const versionDesc = getVersionDescription(version);
                    const canDelete = bridgeVersionsArray.length > 1 && !isPublished;

                    return (
                      <div key={version} className="relative group">
                        <button
                          id={`version-dropdown-button-${version}`}
                          onClick={() => {
                            handleVersionChange(version);
                            setShowVersionDropdown(false);
                          }}
                          className={`
                                                        w-full flex items-center justify-between gap-2 px-2 py-2 text-xs rounded-md transition-all duration-200 text-left
                                                        ${
                                                          isActive
                                                            ? isPublished
                                                              ? "bg-green-100 text-green-800"
                                                              : "bg-base-300 text-base-content"
                                                            : isPublished
                                                              ? "bg-base-100 hover:bg-green-50 text-base-content"
                                                              : "bg-base-100 hover:bg-base-200 text-base-content"
                                                        }
                                                    `}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{versionDisplayName}</span>
                            {isPublished && (
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Published Version"></span>
                            )}
                            {isActive && (
                              <span className="text-xs text-base-content/60 truncate max-w-24" title={versionDesc}>
                                {versionDesc}
                              </span>
                            )}
                          </div>

                          {/* Delete Button */}
                          {canDelete && (
                            <span
                              id={`version-dropdown-delete-${version}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setselectedDataToDelete({ version, index: versionDisplayName });
                                openModal(MODAL_TYPE?.DELETE_VERSION_MODAL);
                                setShowVersionDropdown(false);
                              }}
                              className="opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded p-1 transition-opacity duration-200 cursor-pointer"
                              title={`Delete ${versionDisplayName}`}
                            >
                              <TrashIcon size={10} className="text-red-500 hover:text-red-700" />
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create New Version Button */}
        <button
          id="create-new-version-button"
          onClick={() => openModal(MODAL_TYPE.VERSION_DESCRIPTION_MODAL)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-base-100 text-base-content  hover:bg-base-200 rounded-md transition-all duration-200"
          title="Create New Version"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>

      <PublishBridgeVersionModal
        params={params}
        searchParams={searchParams}
        agent_name={bridgeName}
        agent_description={versionDescription}
      />
      <VersionDescriptionModal
        versionDescriptionRef={versionDescriptionRef}
        handleCreateNewVersion={handleCreateNewVersion}
      />
      <DeleteModal
        modalType={MODAL_TYPE.DELETE_VERSION_MODAL}
        onConfirm={handleDeleteVersion}
        item={selectedDataToDelete}
        description={`Are you sure you want to delete the Version "${selectedDataToDelete?.index}"? This action cannot be undone.`}
        title="Delete Version"
        loading={isDeleting}
        isAsync={true}
      />
    </div>
  );
}

export default Protected(BridgeVersionDropdown);
