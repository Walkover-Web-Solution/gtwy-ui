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
import { useDispatch } from "react-redux";
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { TrashIcon } from "@/components/Icons";
import DeleteModal from "@/components/UI/DeleteModal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";

const fetchInProgress = new Set();

function BridgeVersionDropdown({ params, searchParams, isEmbedUser, maxVersions = 2, shouldFetch = true }) {
  const router = useRouter();
  const dispatch = useDispatch();

  const versionDescriptionRef = useRef("");
  const hasInitialized = useRef(false);
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [selectedDataToDelete, setselectedDataToDelete] = useState();
  const { isDeleting, executeDelete } = useDeleteOperation(MODAL_TYPE.DELETE_VERSION_MODAL);
  const dropdownRef = useRef(null);

  const { bridgeVersionsArray, publishedVersion, bridgeName, versionDescription, bridgeVersionMapping } =
    useCustomSelector((state) => ({
      bridgeVersionsArray: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.versions || [],
      publishedVersion: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.published_version_id || null,
      bridgeName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.name || "",
      versionDescription: (() => {
        const v = searchParams?.get?.("version");
        const resolvedV =
          !v || v === "null" ? state?.bridgeReducer?.allBridgesMap?.[params?.id]?.versions?.[0] || null : v;
        return state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[resolvedV]?.version_description || "";
      })(),
      bridgeVersionMapping: state?.bridgeReducer?.bridgeVersionMapping?.[params?.id] || {},
    }));

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
      if (!versionId || versionId === "null" || !params?.id || !shouldFetch) return;
      if (fetchInProgress.has(versionId)) return;
      if (debounceTimers.current.has(versionId)) {
        clearTimeout(debounceTimers.current.get(versionId));
      }
      const timerId = setTimeout(() => {
        fetchInProgress.add(versionId);
        dispatch(getBridgeVersionAction({ versionId, version_description: versionDescriptionRef })).finally(() => {
          fetchInProgress.delete(versionId);
        });
        debounceTimers.current.delete(versionId);
      }, 100);
      debounceTimers.current.set(versionId, timerId);
    },
    [dispatch, params?.id, shouldFetch]
  );

  const getVersionDisplayName = useCallback(
    (version) => `V${bridgeVersionsArray.indexOf(version) + 1}${version === publishedVersion ? " " : ""}`,
    [bridgeVersionsArray, publishedVersion]
  );

  // Memoize current version and isPublished to prevent unnecessary re-renders
  const currentVersion = useMemo(() => {
    const v = searchParams?.get?.("version");
    return !v || v === "null" ? bridgeVersionsArray[0] || null : v;
  }, [searchParams, bridgeVersionsArray]);
  const currentIsPublished = useMemo(() => searchParams?.get?.("isPublished") === "true", [searchParams]);

  // SendDataToChatbot effect - only runs when version changes
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof SendDataToChatbot !== "undefined") {
        // If currentVersion is null or "null" or isPublished, use versions[0]
        let versionToSend = currentVersion;

        if (!currentVersion || currentVersion === "null" || currentIsPublished) {
          versionToSend = bridgeVersionsArray.length > 0 ? bridgeVersionsArray[0] : "null";
        }

        SendDataToChatbot({ version_id: versionToSend });
        clearInterval(timer);
      }
    }, 300);

    return () => clearInterval(timer);
  }, [currentVersion, currentIsPublished, bridgeVersionsArray]);

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

    // If version is null or "null" string, use versions[0]
    if ((currentVersion === null || currentVersion === "null") && bridgeVersionsArray.length > 0) {
      const firstVersion = bridgeVersionsArray[0];
      if (firstVersion) {
        hasInitialized.current = true;
        router.push(`/org/${params.org_id}/agents/configure/${params.id}?version=${firstVersion}`);
        fetchVersionData(firstVersion);
      }
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
    currentVersion,
    params,
    router,
    selectedDataToDelete,
    dispatch,
    executeDelete,
  ]);

  const versionsToShow = useMemo(() => {
    const otherVersions = bridgeVersionsArray.filter((v) => v !== publishedVersion);
    const orderedVersions = publishedVersion ? [publishedVersion, ...otherVersions] : bridgeVersionsArray;

    if (orderedVersions.length <= maxVersions) return orderedVersions;

    if (!publishedVersion) {
      const idx = orderedVersions.findIndex((v) => v === currentVersion);
      if (idx === -1) return orderedVersions.slice(0, maxVersions);
      const half = Math.floor(maxVersions / 2);
      let start = Math.max(0, idx - half);
      let end = Math.min(orderedVersions.length, start + maxVersions);
      if (end - start < maxVersions) start = Math.max(0, orderedVersions.length - maxVersions);
      return orderedVersions.slice(start, end);
    }

    const slots = maxVersions - 1;
    if (currentVersion === publishedVersion) return [publishedVersion, ...otherVersions.slice(0, slots)];
    const idx = otherVersions.findIndex((v) => v === currentVersion);
    if (idx === -1) return [publishedVersion, ...otherVersions.slice(0, slots)];
    const half = Math.floor(slots / 2);
    let start = Math.max(0, idx - half);
    let end = Math.min(otherVersions.length, start + slots);
    if (end - start < slots) start = Math.max(0, otherVersions.length - slots);
    return [publishedVersion, ...otherVersions.slice(start, end)];
  }, [bridgeVersionsArray, publishedVersion, currentVersion, maxVersions]);

  const hasMoreVersions = bridgeVersionsArray.length > maxVersions;

  if (!bridgeVersionsArray.length) {
    return (
      <div
        data-testid="bridge-version-dropdown-empty"
        id="bridge-version-dropdown-empty"
        className="flex items-center gap-2"
      >
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
    <div
      data-testid="bridge-version-dropdown-container"
      id="bridge-version-dropdown-container"
      className="flex items-center gap-1"
    >
      {/* Version Tabs Container */}
      <div data-testid="bridge-version-tabs" id="bridge-version-tabs" className="flex items-center gap-1">
        {versionsToShow.map((version, index) => {
          const isActive = currentVersion === version;
          const isPublished = version === publishedVersion;
          const versionDisplayName = getVersionDisplayName(version);
          const versionDesc = bridgeVersionMapping?.[version]?.version_description || "";
          const canDelete = bridgeVersionsArray.length > 1 && !isPublished;
          return (
            <div key={version} className="relative group">
              <div className={versionDesc ? "tooltip tooltip-bottom" : ""} data-tip={versionDesc}>
                <button
                  data-testid={`version-button-${version}`}
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
                  data-testid={`version-delete-button-${version}`}
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
              data-testid="version-dropdown-toggle"
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
                  <div
                    data-testid="version-dropdown-menu"
                    id="version-dropdown-menu"
                    className="text-xs font-medium text-base-content/70 mb-2 px-2"
                  >
                    All Versions
                  </div>
                  {bridgeVersionsArray.map((version, index) => {
                    const isActive = currentVersion === version;
                    const isPublished = version === publishedVersion;
                    const versionDisplayName = getVersionDisplayName(version);
                    const versionDesc = bridgeVersionMapping?.[version]?.version_description || "";
                    const canDelete = bridgeVersionsArray.length > 1 && !isPublished;

                    return (
                      <div key={version} className="relative group">
                        <button
                          data-testid={`version-dropdown-button-${version}`}
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
                              data-testid={`version-dropdown-delete-${version}`}
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
          data-testid="create-new-version-button"
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
