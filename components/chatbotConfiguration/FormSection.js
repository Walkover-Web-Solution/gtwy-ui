import { useCustomSelector } from "@/customHooks/customSelector";
import { getChatBotDetailsAction, updateChatBotConfigAction } from "@/store/action/chatBotAction";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";

function RadioButton({ name, label, checked, onChange }) {
  return (
    <div className="form-control">
      <label className="label gap-2 cursor-pointer">
        <input
          id={`radio-${name}-${label.replaceAll(" ", "-").toLowerCase()}`}
          type="radio"
          name={name}
          className="radio checked:bg-blue-500"
          checked={checked}
          onChange={() => onChange({ target: { name, value: label.replaceAll(" ", "_").toLowerCase() } })}
        />
        <span className="label-text">{label}</span>
      </label>
    </div>
  );
}

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
      <div className="flex items-center justify-start gap-2">
        {options.map((option, index) => (
          <RadioButton
            key={index}
            name={name}
            label={option.label}
            checked={option.label.replaceAll(" ", "_").toLowerCase() === value}
            onChange={onChange}
          />
        ))}
      </div>
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

export default function FormSection({ params, chatbotId = null }) {
  const dispatch = useDispatch();
  const { chatbots } = useCustomSelector((state) => ({
    chatbots: state?.ChatBot?.org?.[params?.org_id] || [],
  }));
  const chatBotId = useMemo(
    () => chatbotId || params?.chatbot_id || chatbots[0]?._id,
    [chatbotId, params?.chatbot_id, chatbots]
  );
  const iframeRef = useRef(null);
  const [formData, setFormData] = useState({
    buttonName: "",
    height: "",
    heightUnit: "",
    width: "",
    widthUnit: "",
    type: "",
    themeColor: "",
    chatbotTitle: "Chatbot",
    chatbotSubtitle: "Smart Help, On Demand",
    iconUrl: "",
    allowBridgeSwitch: false,
    bridges: [],
  });

  const { chatBotConfig } = useCustomSelector((state) => ({
    chatBotConfig: state?.ChatBot?.ChatBotMap?.[chatBotId]?.config,
  }));

  useEffect(() => {
    if (chatbotId !== undefined) {
      dispatch(getChatBotDetailsAction(chatBotId));
    }
  }, [chatBotId]);

  const handleInputChange = useCallback(
    (event) => {
      const { name, value } = event.target;
      setFormData((prevFormData) => ({
        ...prevFormData,
        [name]: value,
      }));
    },
    [params?.chatbot_id]
  );

  const handleBlur = useCallback(
    (event) => {
      const { name, value } = event.target;

      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
          [name]: value,
        };
        dispatch(updateChatBotConfigAction(chatBotId, updatedFormData));
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: "chatbotConfig", data: updatedFormData }, "*");
        }
        return updatedFormData;
      });
    },
    [dispatch, params?.chatbot_id, chatBotId]
  );

  useEffect(() => {
    if (chatBotConfig) {
      setFormData((prevFormData) => {
        const updatedFormData = {
          ...prevFormData,
          ...chatBotConfig,
        };
        return updatedFormData;
      });
    }
  }, [chatBotConfig]);

  useEffect(() => {
    const intervalId = setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow && chatBotConfig) {
        iframeRef.current.contentWindow.postMessage({ type: "chatbotConfig", data: chatBotConfig }, "*");
        clearInterval(intervalId);
      }
    }, 1800);

    return () => {
      clearInterval(intervalId);
    };
  }, [chatBotId, chatBotConfig]);

  // Auto-refresh when formData changes (for real-time preview updates)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (iframeRef.current && iframeRef.current.contentWindow && Object.keys(formData).length > 0) {
        iframeRef.current.contentWindow.postMessage({ type: "chatbotConfig", data: formData }, "*");
      }
    }, 500); // Shorter delay for more responsive updates

    return () => {
      clearTimeout(timeoutId);
    };
  }, [formData]);

  return (
    <div id="form-section-container" className="space-y-6">
      {/* Display Settings Section */}
      <div className="bg-base-200 rounded-lg max-w-4xl shadow p-6">
        <h3 className="text-lg font-semibold mb-6 border-b border-base-content/20 pb-2">Display Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl">
          {/* Basic Information */}
          <div className="space-y-4">
            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">Chatbot Title</span>
              </div>
              <input
                id="form-section-chatbot-title"
                type="text"
                placeholder="Enter chatbot title"
                className="input input-bordered w-full max-w-xs input-sm"
                value={formData.chatbotTitle}
                onChange={handleInputChange}
                onBlur={handleBlur}
                name="chatbotTitle"
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">Chatbot Subtitle</span>
              </div>
              <input
                id="form-section-chatbot-subtitle"
                type="text"
                placeholder="Enter chatbot subtitle"
                className="input input-bordered w-full max-w-xs input-sm"
                value={formData.chatbotSubtitle}
                onChange={handleInputChange}
                onBlur={handleBlur}
                name="chatbotSubtitle"
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">Button Title</span>
              </div>
              <input
                id="form-section-button-title"
                type="text"
                placeholder="Enter button title"
                className="input input-bordered w-full max-w-xs input-sm"
                value={formData.buttonName}
                onChange={handleInputChange}
                onBlur={handleBlur}
                name="buttonName"
              />
            </label>

            <label className="form-control w-full">
              <div className="label">
                <span className="label-text font-medium">Button Icon URL</span>
              </div>
              <input
                id="form-section-icon-url"
                type="text"
                placeholder="Enter icon URL"
                className="input input-bordered w-full max-w-xs input-sm"
                value={formData.iconUrl}
                onChange={handleInputChange}
                onBlur={handleBlur}
                name="iconUrl"
              />
            </label>
          </div>

          {/* Dimensions and Styling */}
          <div className="space-y-4">
            <div className="flex items-end gap-4">
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

            <div>
              <RadioGroup value={formData.type} onChange={handleBlur} name="type" />
            </div>

            <label className="form-control">
              <div className="label">
                <span className="label-text font-medium">Theme Color</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="form-section-theme-color"
                  type="color"
                  key={formData?.themeColor}
                  defaultValue={formData.themeColor}
                  onBlur={handleBlur}
                  name="themeColor"
                  className="w-12 h-8 rounded border"
                />
                <span className="text-sm text-gray-600">{formData.themeColor}</span>
              </div>
            </label>
          </div>
        </div>
      </div>
      {/* Preview Section */}
      <div className="bg-base-200 rounded-lg shadow-lg border border-base-content/40">
        {/* Header */}
        <div className="bg-base-200 px-6 py-4 border-b border-base-content/20 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-base-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-base-content">Live Preview</h3>
                <p className="text-sm text-base-content">See how your chatbot will appear to users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="p-6">
          <div className="relative">
            {/* Iframe Container */}
            <div className="relative bg-base-200 rounded-b-lg overflow-hidden shadow-inner h-[80vh]">
              <iframe
                ref={iframeRef}
                src={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/chatbotPreview`}
                className="w-full h-full border-none transition-opacity duration-300 bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
