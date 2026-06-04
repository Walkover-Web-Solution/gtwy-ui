"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useCustomSelector } from "@/customHooks/customSelector";
import { getChatBotDetailsAction, updateChatBotConfigAction } from "@/store/action/chatBotAction";
import ChatbotPreview from "./ChatbotPreview";

function RadioGroup({ onChange, name, value }) {
  const options = [
    { label: "All Available space" },
    { label: "Left slider" },
    { label: "Right slider" },
    { label: "Pop over" },
    { label: "Popup" },
  ];

  return (
    <div id="radio-group-position">
      <div className="label">
        <span className="label-text">Position</span>
      </div>
      <select
        data-testid="chatbot-config-position-select"
        className="select select-bordered select-sm w-full"
        value={value || ""}
        onChange={(e) => onChange({ target: { name, value: e.target.value } })}
        name={name}
      >
        <option value="" disabled>
          Select position
        </option>
        {options.map((option, index) => (
          <option key={index} value={option.label.replaceAll(" ", "_").toLowerCase()}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function DimensionInput({ placeholder, options, onChange, name, value, unit }) {
  return (
    <div className="flex flex-col">
      <div className="label">
        <span className="label-text">{placeholder}</span>
      </div>
      <div className="join">
        <input
          autoComplete="off"
          data-testid={`chatbot-config-${name}-input`}
          id={`dimension-input-${name}`}
          className="input input-bordered join-item input-sm max-w-[90px]"
          type="number"
          placeholder={placeholder}
          defaultValue={value || ""}
          onBlur={onChange}
          min={0}
          name={name}
        />
        <select
          data-testid={`chatbot-config-${name}-unit`}
          id={`dimension-select-${name}-unit`}
          className="select select-bordered join-item select-sm max-w-[70px]"
          value={unit || ""}
          onChange={onChange}
          name={`${name}Unit`}
        >
          {options.map((option, index) => (
            <option key={index} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const ChatbotConfigurationTab = ({ params, chatbotId, isInSidebar = false }) => {
  const dispatch = useDispatch();
  const { chatbots } = useCustomSelector((state) => ({
    chatbots: state?.ChatBot?.org?.[params?.org_id] || [],
  }));

  const chatBotId = useMemo(
    () => chatbotId || params?.chatbot_id || chatbots[0]?._id,
    [chatbotId, params?.chatbot_id, chatbots]
  );

  const [formData, setFormData] = useState({
    buttonName: "",
    height: "",
    heightUnit: "",
    width: "",
    widthUnit: "",
    type: "",
    themeColor: "",
    theme: "system",
    chatbotTitle: "Chatbot",
    chatbotSubtitle: "Smart Help, On Demand",
    iconUrl: "",
    allowBridgeSwitch: false,
    bridges: [],
    side: "left",
    hide_tool: false,
  });

  const { chatBotConfig } = useCustomSelector((state) => ({
    chatBotConfig: state?.ChatBot?.ChatBotMap?.[chatBotId]?.config,
  }));

  useEffect(() => {
    if (chatBotId !== undefined) {
      dispatch(getChatBotDetailsAction(chatBotId));
    }
  }, [chatBotId, dispatch]);

  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  }, []);

  const handleBlur = useCallback(
    (event) => {
      const { name, value } = event.target;

      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
          [name]: value,
        };
        dispatch(updateChatBotConfigAction(chatBotId, updatedFormData));
        return updatedFormData;
      });
    },
    [dispatch, chatBotId]
  );

  // Handler for boolean toggle fields (e.g. hide_tool)
  const handleToggleChange = useCallback(
    (name) => {
      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
          [name]: !prevFormData[name],
        };
        dispatch(updateChatBotConfigAction(chatBotId, updatedFormData));
        return updatedFormData;
      });
    },
    [dispatch, chatBotId]
  );

  useEffect(() => {
    if (chatBotConfig) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        ...chatBotConfig,
      }));
    }
  }, [chatBotConfig]);

  // If in sidebar mode, render only the configuration settings
  if (isInSidebar) {
    return (
      <>
        <h3 className="text-lg font-semibold border-b border-base-300 pb-2 mb-4">Display Settings</h3>

        {/* Basic Information */}
        <div className="space-y-3">
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Chatbot Title</span>
            </div>
            <input
              autoComplete="off"
              data-testid="chatbot-config-title-input"
              type="text"
              placeholder="Enter chatbot title"
              className="input input-bordered w-full input-sm"
              value={formData.chatbotTitle}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="chatbotTitle"
            />
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Chatbot Subtitle</span>
            </div>
            <input
              autoComplete="off"
              data-testid="chatbot-config-subtitle-input"
              type="text"
              placeholder="Enter chatbot subtitle"
              className="input input-bordered w-full input-sm"
              value={formData.chatbotSubtitle}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="chatbotSubtitle"
            />
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Button Title</span>
            </div>
            <input
              autoComplete="off"
              type="text"
              placeholder="Enter button title"
              className="input input-bordered w-full input-sm"
              value={formData.buttonName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="buttonName"
            />
          </label>

          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Button Icon URL</span>
            </div>
            <input
              autoComplete="off"
              type="text"
              placeholder="Enter icon URL"
              className="input input-bordered w-full input-sm"
              value={formData.iconUrl}
              onChange={handleInputChange}
              onBlur={handleBlur}
              name="iconUrl"
            />
          </label>

          {/* Show Tool Calls Toggle */}
          <div className="form-control">
            <label
              data-testid="chatbot-config-hide-tool-toggle"
              className="label cursor-pointer justify-between gap-8 px-0"
            >
              <div className="flex flex-col">
                <span className="label-text font-medium text-xs">Hide Tool Calls</span>
                <span className="text-xs text-base-content/50">
                  {formData.hide_tool ? "Hidden from chat" : "Shown in chat"}
                </span>
              </div>
              <input
                autoComplete="off"
                data-testid="chatbot-config-hide-tool-checkbox"
                id="chatbot-config-hide-tool-checkbox"
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={formData.hide_tool}
                onChange={(event) => {
                  event.preventDefault();
                  handleToggleChange("hide_tool");
                }}
              />
            </label>
          </div>
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          <DimensionInput
            placeholder="Height"
            options={[
              { label: "Select unit", value: "", disabled: true },
              { label: "px", value: "px" },
              { label: "%", value: "%" },
            ]}
            onChange={handleBlur}
            name="height"
            value={formData.height}
            unit={formData.heightUnit}
          />
          <DimensionInput
            placeholder="Width"
            options={[
              { label: "Select unit", value: "", disabled: true },
              { label: "px", value: "px" },
              { label: "%", value: "%" },
            ]}
            onChange={handleBlur}
            name="width"
            value={formData.width}
            unit={formData.widthUnit}
          />
        </div>

        {/* Position */}
        <div>
          <RadioGroup value={formData.type} onChange={handleBlur} name="type" />
        </div>

        {/* Popup Side - only shown when position is popup */}
        {formData.type === "popup" && (
          <label className="form-control w-full">
            <div className="label">
              <span className="label-text font-medium text-xs">Popup Side</span>
            </div>
            <select
              data-testid="chatbot-config-popup-side-select"
              className="select select-bordered select-sm w-full"
              value={formData.side || "right"}
              name="side"
              onChange={(e) => handleBlur(e)}
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </label>
        )}

        {/* Theme Color */}
        <label className="form-control">
          <div className="label">
            <span className="label-text font-medium text-xs">Theme Color</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              autoComplete="off"
              data-testid="chatbot-config-theme-color"
              type="color"
              key={formData?.themeColor}
              defaultValue={formData.themeColor}
              onBlur={handleBlur}
              name="themeColor"
              className="w-12 h-8 rounded border"
            />
            <span className="text-sm text-base-content/70">{formData.themeColor}</span>
          </div>
        </label>

        {/* Theme Mode */}
        <label className="form-control w-full">
          <div className="label">
            <span className="label-text font-medium text-xs">Theme</span>
          </div>
          <select
            data-testid="chatbot-config-theme-mode"
            className="select select-bordered select-sm w-full"
            value={formData.theme}
            name="theme"
            onChange={(e) => handleBlur(e)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
      </>
    );
  }

  // Full view with sidebar and preview
  return (
    <div className="flex h-full">
      {/* Sidebar - Configuration Settings */}
      <div className="w-80 flex-shrink-0 border-r border-base-300 overflow-y-auto p-4 space-y-4">
        <h3 className="text-lg font-semibold border-b border-base-300 pb-2">Display Settings</h3>
        <ChatbotPreview />
      </div>
    </div>
  );
};

export default ChatbotConfigurationTab;
