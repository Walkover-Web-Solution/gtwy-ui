"use client";

import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import InfoTooltip from "@/components/InfoTooltip";
import { CircleQuestionMark, Plus, Save, Server, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";

const emptyServer = () => ({ name: "", url: "" });
const EMPTY_SERVERS = [];

const McpServerList = ({ params, searchParams, isPublished, isEditor = true }) => {
  const isReadOnly = isPublished || !isEditor;
  const dispatch = useDispatch();

  const savedServers = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeData = state?.bridgeReducer?.allBridgesMap?.[params?.id];
    const activeData = isPublished ? bridgeData : versionData;
    const servers = activeData?.configuration?.mcp_config?.servers;
    return Array.isArray(servers) ? servers : EMPTY_SERVERS;
  });

  const [servers, setServers] = useState(savedServers);
  const [edited, setEdited] = useState({});

  useEffect(() => {
    setServers(savedServers);
    setEdited({});
  }, [savedServers]);

  const persistServers = useCallback(
    (nextServers) => {
      dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: {
            configuration: {
              mcp_config: {
                servers: nextServers,
              },
            },
          },
        })
      );
    },
    [dispatch, params?.id, searchParams?.version]
  );

  const handleChange = useCallback((index, field, value) => {
    setServers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setEdited((prev) => ({ ...prev, [index]: true }));
  }, []);

  const handleAdd = useCallback(() => {
    setServers((prev) => {
      setEdited((editedPrev) => ({ ...editedPrev, [prev.length]: true }));
      return [...prev, emptyServer()];
    });
  }, []);

  const handleSave = useCallback(
    (index) => {
      const server = servers[index];
      if (!server?.name?.trim() || !server?.url?.trim()) return;
      persistServers(servers.map((item) => ({ name: item.name.trim().replace(/ /g, "_"), url: item.url.trim() })));
      setEdited((prev) => ({ ...prev, [index]: false }));
    },
    [persistServers, servers]
  );

  const handleRemove = useCallback(
    (index) => {
      const nextServers = servers.filter((_, i) => i !== index);
      setServers(nextServers);
      persistServers(
        nextServers
          .map((item) => ({ name: item.name.trim(), url: item.url.trim() }))
          .filter((item) => item.name && item.url)
      );
      setEdited((prev) => {
        const next = {};
        Object.entries(prev).forEach(([key, value]) => {
          const keyIndex = Number(key);
          if (keyIndex < index) next[keyIndex] = value;
          if (keyIndex > index) next[keyIndex - 1] = value;
        });
        return next;
      });
    },
    [persistServers, servers]
  );

  const hasUnsaved = useMemo(() => Object.values(edited).some(Boolean), [edited]);

  return (
    <div
      data-testid="mcp-server-list-container"
      id="mcp-server-list-container"
      className="w-full gap-2 flex flex-col px-2 py-2 cursor-default"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm whitespace-nowrap">MCP Servers</p>
          <InfoTooltip tooltipContent="Connect MCP servers so this agent can use their tools at runtime.">
            <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
          </InfoTooltip>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-md">
        {servers.length > 0 ? (
          <div className="space-y-3">
            {servers.map((config, index) => {
              const isComplete = Boolean(config.name?.trim() && config.url?.trim());
              const isEdited = edited[index];
              return (
                <div
                  key={index}
                  className={`group relative bg-base-200/40 border rounded-lg p-3 space-y-2 transition-all hover:bg-base-200/60 ${
                    isEdited ? "border-warning" : "border-base-300"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Server size={14} className="text-primary" />
                      <span className="badge badge-sm badge-primary badge-outline font-medium">MCP {index + 1}</span>
                      {isEdited && <span className="text-[10px] text-warning font-medium">• Unsaved</span>}
                    </div>
                    {!isReadOnly && (
                      <div className="flex gap-1">
                        {isEdited && isComplete && (
                          <button
                            type="button"
                            onClick={() => handleSave(index)}
                            className="btn btn-xs gap-1"
                            title="Save changes"
                          >
                            <Save size={12} />
                            Save
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          className="btn btn-xs btn-ghost btn-square text-error hover:bg-error/10"
                          title="Remove MCP"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    autoComplete="off"
                    type="text"
                    placeholder="MCP name (e.g. my-mcp)"
                    className={`input input-bordered w-full input-sm ${!config.name ? "input-error" : ""}`}
                    value={config.name || ""}
                    onChange={(e) => handleChange(index, "name", e.target.value)}
                    disabled={isReadOnly}
                    required
                  />
                  <input
                    autoComplete="off"
                    type="url"
                    placeholder="https://mcp.example.com/..."
                    className={`input input-bordered w-full input-sm ${!config.url ? "input-error" : ""}`}
                    value={config.url || ""}
                    onChange={(e) => handleChange(index, "url", e.target.value)}
                    disabled={isReadOnly}
                    required
                  />
                </div>
              );
            })}
            {!isReadOnly && !hasUnsaved && (
              <button
                type="button"
                onClick={handleAdd}
                className="w-full flex items-center justify-center gap-1 py-2 px-3 text-sm rounded-md border-2 border-dashed border-base-200 bg-transparent text-base-content/70 transition-all"
              >
                <Plus size={14} />
                Add Another MCP
              </button>
            )}
          </div>
        ) : (
          !isReadOnly && (
            <button
              type="button"
              onClick={handleAdd}
              className="w-full flex items-center justify-center gap-1 py-2 px-3 text-sm rounded-md border-2 border-dashed border-base-200 bg-transparent text-base-content/70 transition-all"
            >
              <Plus size={14} />
              Add MCP Configuration
            </button>
          )
        )}
        {isReadOnly && servers.length === 0 && (
          <div className="border-2 border-base-200 border-dashed p-4 text-center">
            <p className="text-sm text-base-content/70">No MCP servers configured.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default McpServerList;
