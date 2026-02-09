"use client";

import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { RefreshIcon } from "@/components/Icons";
import { useCustomSelector } from "@/customHooks/customSelector";
import { SaveAllIcon } from "lucide-react";
import { resetPrebuiltPromptAction, updatePrebuiltPromptAction } from "@/store/action/prebuiltPromptAction";
import MainLayout from "@/components/layoutComponents/MainLayout";

export default function PrebuiltPromptsPage() {
  const dispatch = useDispatch();
  const prebuiltPrompts = useCustomSelector((state) => state.prebuiltPromptReducer.PrebuiltPrompts || []);
  const descriptions = useCustomSelector(
    (state) => state.flowDataReducer.flowData.descriptionsData?.descriptions || {}
  );
  // Convert array of objects to a more usable format
  const processedPrompts = React.useMemo(() => {
    const processed = {};
    // Custom name mappings for specific tools
    const customNames = {
      structured_output_optimizer: "JSON Builder",
      optimze_prompt: "Prompt Builder",
    };

    prebuiltPrompts.forEach((promptObj) => {
      const key = Object.keys(promptObj)[0];
      const value = promptObj[key];
      processed[key] = {
        name: customNames[key] || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        description: `${customNames[key] || key.replace(/_/g, " ")} agent configuration`,
        prompt: value,
      };
    });
    return processed;
  }, [prebuiltPrompts]);

  const availableKeys = Object.keys(processedPrompts);
  const [selectedAgent, setSelectedAgent] = useState(availableKeys[0] || "");
  const [prompts, setPrompts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [savebtnEnabled, setSavebtnEnabled] = useState(false);
  // Initialize selectedAgent when availableKeys changes
  useEffect(() => {
    if (availableKeys.length > 0 && !selectedAgent) {
      setSelectedAgent(availableKeys[0]);
    }
  }, [availableKeys, selectedAgent]);
  useEffect(() => {
    const initialPrompts = {};
    Object.keys(processedPrompts).forEach((key) => {
      initialPrompts[key] = processedPrompts[key].prompt;
    });
    setPrompts(initialPrompts);
    // Reset save button state when Redux data changes
    setSavebtnEnabled(false);
  }, [processedPrompts, prebuiltPrompts]);
  const handlePromptChange = (agentKey, value) => {
    setPrompts((prev) => ({
      ...prev,
      [agentKey]: value,
    }));
    setSavebtnEnabled(true);
  };

  // Dummy action for updating prebuilt prompts
  const updatePrebuiltPrompt = async (dataToUpdate) => {
    await dispatch(updatePrebuiltPromptAction(dataToUpdate));
  };

  // Dummy action for resetting prebuilt prompts
  const resetPrebuiltPrompt = async (agentKey) => {
    await dispatch(resetPrebuiltPromptAction({ prompt_id: agentKey }));
  };

  const handleSave = async (agentKey) => {
    setIsLoading(true);
    try {
      const dataToUpdate = {
        [agentKey]: prompts[agentKey],
      };
      await updatePrebuiltPrompt(dataToUpdate);
      setSavebtnEnabled(false);

      toast.success((processedPrompts[agentKey]?.name || "Agent") + " prompt updated successfully!");

      // Update the original prompt to the new saved value
      processedPrompts[agentKey].prompt = prompts[agentKey];
    } catch (error) {
      toast.error("Failed to update prompt. Please try again.");
      console.error("Save error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (agentKey) => {
    try {
      await resetPrebuiltPrompt(agentKey);
      setSavebtnEnabled(false);
      toast.info((processedPrompts[agentKey]?.name || "Agent") + " prompt reset to default.");
    } catch (error) {
      toast.error("Failed to reset prompt. Please try again.");
      console.error("Reset error:", error);
    }
  };

  // Function to estimate token count from text
  const estimateTokenCount = (text) => {
    if (!text) return 0;

    // Simple token estimation:
    // - Split by whitespace and punctuation
    // - Average ~4 characters per token for English text
    // - Account for special tokens and encoding overhead

    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    const characters = text.length;

    // More accurate estimation considering:
    // - Average English word length
    // - Punctuation and special characters
    // - Subword tokenization used by modern models
    const estimatedTokens = Math.ceil(characters / 4) + Math.ceil(words.length * 0.3);

    return estimatedTokens;
  };

  if (availableKeys.length === 0) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-base-100 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold mb-2">
              No {descriptions?.PrebuiltPrompts?.title || "Predefined Agent Prompts"} Found
            </h2>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout withPadding={false}>
      <div className="min-h-screen bg-base-100">
        {/* Header */}
        <div className="bg-base-200 border-b border-base-300 sticky top-5 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Top */}
            <div className="py-4 border-b border-base-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">
                    {descriptions?.PrebuiltPrompts?.title || "Predefined Agent Prompts"}
                  </h1>
                  <p className="text-sm text-base-content/60 mt-1">
                    {descriptions?.PrebuiltPrompts?.description ||
                      "Configure and customize the core system prompts for specialized AI agents. These predefined prompts control how each agent behaves and processes requests to deliver specific functionality."}
                  </p>
                </div>
              </div>
            </div>

            {/* Agent Selection Tabs */}
            <div className="py-2">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {Object.entries(processedPrompts).map(([key, agent]) => (
                  <button
                    key={key}
                    className={`px-3 btn btn-sm rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      selectedAgent === key
                        ? "bg-primary text-primary-content hover:text-primary-content hover:bg-primary"
                        : "bg-base-100 hover:bg-base-300 border border-base-300"
                    }`}
                    onClick={() => setSelectedAgent(key)}
                  >
                    <span className="truncate max-w-[120px] sm:max-w-none">{agent.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-6">
          {selectedAgent && (
            <div className="h-[calc(100vh-160px)] flex flex-col">
              {/* Top Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3 bg-base-200 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold">{processedPrompts[selectedAgent]?.name}</h2>
                  <span className="text-xs text-base-content/60 bg-base-300 px-2 py-1 rounded">
                    ~{estimateTokenCount(prompts[selectedAgent] || "")} tokens
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => handleReset(selectedAgent)} className="btn btn-sm btn-ghost">
                    <RefreshIcon size={14} />
                    <span className="ml-1">Default</span>
                  </button>
                  <button
                    onClick={() => handleSave(selectedAgent)}
                    className="btn btn-sm btn-primary"
                    disabled={!savebtnEnabled || isLoading}
                  >
                    {isLoading && <span className="loading loading-spinner loading-xs mr-1"></span>}
                    <SaveAllIcon size={14} />
                    <span className="ml-1">Save</span>
                  </button>
                </div>
              </div>

              {/* Full Height Textarea */}
              <div className="flex-1 flex flex-col">
                <textarea
                  className="textarea bg-white dark:bg-black/15 textarea-bordered flex-1 w-full font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  value={prompts[selectedAgent] || ""}
                  onChange={(e) => handlePromptChange(selectedAgent, e.target.value)}
                  placeholder="Enter the system prompt that defines how this agent should behave and respond to user requests"
                  style={{ minHeight: "calc(100vh - 280px)" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
