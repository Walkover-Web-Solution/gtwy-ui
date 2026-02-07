import { getStatusClass } from "@/utils/utility";
import React, { useMemo, useState } from "react";

function ConnectedAgentListSuggestion({
  params,
  handleSelectAgents = () => {},
  connect_agents = [],
  bridges,
  bridgeData,
  isPublished = false,
  isEditor = true,
}) {
  // Determine if content is read-only (either published or user is not an editor)
  const [searchQuery, setSearchQuery] = useState("");

  const handleInputChange = (e) => {
    setSearchQuery(e?.target?.value || "");
  };

  const handleItemClick = (bridge, bridgeData) => {
    handleSelectAgents(bridge, bridgeData);
  };

  const renderBridgeSuggestions = useMemo(
    () =>
      Object.values(bridges)
        .filter((bridge) => {
          const isActive = bridge?.status === 1 && (bridge?.bridge_status === 1 || bridge?.bridge_status === undefined);
          const matchesSearch = bridge?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase());
          const isNotConnected =
            connect_agents && Object.values(connect_agents).some((agent) => agent?.bridge_id === bridge?._id);
          const notSameBridge = bridge?._id !== params?.id;
          const isNotDeleted = !bridge?.deletedAt;
          return isActive && matchesSearch && !isNotConnected && notSameBridge && isNotDeleted;
        })
        .slice()
        .sort((a, b) => {
          if (!a?.name) return 1;
          if (!b?.name) return -1;
          return a?.name?.localeCompare(b?.name);
        })
        .map((bridge) => {
          return (
            <li
              key={bridge?._id}
              id={`connect-agent-suggestion-item-${bridge?._id}`}
              onClick={() => (bridge?.published_version_id ? handleItemClick(bridge, bridgeData) : null)}
            >
              <div
                className={`flex justify-between items-center w-full ${!bridge?.published_version_id ? "opacity-50" : ""}`}
              >
                <p
                  className="overflow-hidden text-ellipsis whitespace-pre-wrap"
                  title={bridge?.name?.length > 20 ? bridge?.name : ""}
                >
                  {bridge?.name?.length > 20 ? `${bridge?.name.slice(0, 20)}...` : bridge?.name || "Untitled"}
                </p>
                <div>
                  {!bridge?.published_version_id ? (
                    <span
                      className={`rounded-full capitalize bg-base-200 px-3 py-1 text-[10px] sm:text-xs font-semibold text-black ${getStatusClass("unpublished")}`}
                    >
                      unpublished
                    </span>
                  ) : (
                    (() => {
                      const statusLabel =
                        bridge?.bridge_status === 0 ? "paused" : bridge?.status === 0 ? "archived" : "active";
                      return (
                        <span
                          className={`rounded-full capitalize bg-base-200 px-3 py-1 text-[10px] sm:text-xs font-semibold text-black ${getStatusClass(statusLabel)}`}
                        >
                          {statusLabel}
                        </span>
                      );
                    })()
                  )}
                </div>
              </div>
            </li>
          );
        }),
    [bridges, searchQuery, connect_agents, bridgeData]
  );

  return (
    <ul
      id="connect-agent-suggestion-dropdown"
      tabIndex={0}
      className="menu menu-dropdown-toggle dropdown-content z-high px-4 shadow bg-base-100 rounded-box w-72 max-h-96 overflow-y-auto pb-1"
    >
      <div className="flex flex-col gap-2 w-full">
        <li className="text-sm font-semibold disabled">Available Agents</li>
        <input
          id="connect-agent-suggestion-search-input"
          type="text"
          placeholder="Search Agent"
          value={searchQuery}
          onChange={handleInputChange}
          className="input input-bordered w-full input-sm"
        />
        {renderBridgeSuggestions}
      </div>
    </ul>
  );
}

export default ConnectedAgentListSuggestion;
