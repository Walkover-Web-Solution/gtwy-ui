"use client";

import InfoTooltip from "@/components/InfoTooltip";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { isValidJson, validateUrl } from "@/utils/utility";
import { CircleQuestionMark } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";

const ResponseFormatSelector = ({ params, searchParams, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const { response_format } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    return {
      response_format: isPublished
        ? bridgeDataFromState?.configuration?.response_format
        : versionData?.configuration?.response_format,
    };
  });

  const [selectedOption, setSelectedOption] = useState(response_format?.type || "default");
  const [webhookData, setWebhookData] = useState({
    url: response_format?.cred?.url || "",
    headers: response_format?.cred?.headers || "",
  });
  const [errors, setErrors] = useState({ webhook: "", headers: "" });
  const [initialValues, setInitialValues] = useState({
    type: response_format?.type || "default",
    url: response_format?.cred?.url || "",
    headers: response_format?.cred?.headers || "",
  });
  const dispatch = useDispatch();

  useEffect(() => {
    let type, url, headers;

    if (response_format) {
      type = response_format.type === "RTLayer" ? "RTLayer" : response_format.type === "webhook" ? "custom" : "default";
      url = response_format?.cred?.url || "";
      headers = response_format?.cred?.headers || "";

      setSelectedOption(type);
      setWebhookData({ url, headers });
    } else {
      // Reset to default when no response_format data
      type = "default";
      url = "";
      headers = "";

      setSelectedOption("default");
      setWebhookData({ url: "", headers: "" });
    }

    // Store initial values for change tracking
    setInitialValues({ type, url, headers });

    // Clear any existing errors when switching versions
    setErrors({ webhook: "", headers: "" });
  }, [response_format, searchParams?.version, searchParams?.isPublished]);

  const handleChangeWebhook = (e) => {
    const newurl = e.target.value;
    if (newurl.trim() === "") {
      setErrors((prevErrors) => ({ ...prevErrors, webhook: "Please enter a valid webhook URL" }));
      return;
    }
    const isValid = validateUrl(newurl);
    setErrors((prevErrors) => ({ ...prevErrors, webhook: isValid ? "" : "Invalid URL" }));
    setWebhookData((prevData) => ({ ...prevData, url: newurl }));
  };

  const handleChangeHeaders = (e) => {
    const newHeaders = e.target.value;
    if (newHeaders.trim() === "") {
      setErrors((prevErrors) => ({ ...prevErrors, headers: "Please enter a valid headers" }));
      return;
    }
    const isValid = isValidJson(newHeaders);
    setErrors((prevErrors) => ({ ...prevErrors, headers: isValid ? "" : "Invalid JSON" }));
    setWebhookData((prevData) => ({ ...prevData, headers: newHeaders }));
  };

  const handleResponseChange = (key) => {
    const cred = key === "custom" ? { url: webhookData?.url, headers: webhookData?.headers } : { url: "", headers: {} };
    const type = key === "custom" ? "webhook" : key;

    const updatedDataToSend = {
      configuration: {
        response_format: {
          type,
          cred,
        },
      },
    };
    dispatch(
      updateBridgeVersionAction({
        bridgeId: params.id,
        versionId: searchParams.version,
        dataToSend: { ...updatedDataToSend },
      })
    );

    // Update initialValues to match the new saved state
    setInitialValues({
      type,
      url: cred.url,
      headers: cred.headers,
    });
  };

  const responseOptions = [
    { value: "default", label: "Default" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="label-text">Select Response Format</span>
        <InfoTooltip tooltipContent="Configure the response format for your API calls">
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>
      {responseOptions.map(({ value, label }) => (
        <div className="form-control w-fit" key={value}>
          <label className="label  cursor-pointer mx-w-sm flex items-center gap-5">
            <input
              id={`response-format-radio-${value}`}
              disabled={isReadOnly}
              type="radio"
              name="radio-10"
              className="radio radio-sm"
              checked={selectedOption === value}
              onChange={() => {
                setSelectedOption(value);
                handleResponseChange(value);
              }}
            />
            <span className="text-sm">{label}</span>
          </label>
        </div>
      ))}
      <div className={`${selectedOption === "custom" ? "border border-base-300 rounded" : ""}`}>
        <div className={`border-t border-base-300 pt-4 px-4 ${selectedOption === "custom" ? "" : "hidden"}`}>
          <label className="form-control w-full mb-4">
            <span className="text-sm block mb-2">Webhook URL</span>
            <input
              id="webhook"
              disabled={isReadOnly}
              type="text"
              placeholder="https://example.com/webhook"
              className="input input-bordered max-w-xs input-sm w-full"
              defaultValue={webhookData?.url}
              onBlur={handleChangeWebhook}
            />
            {errors.webhook && <p className="text-red-500 text-xs mt-2">{errors.webhook}</p>}
          </label>
          <label className="form-control mb-4">
            <span className="text-sm block mb-2">Headers (JSON format)</span>
            <textarea
              id="headers"
              disabled={isReadOnly}
              className="textarea bg-white dark:bg-black/15 textarea-bordered h-24 w-full textarea-sm"
              defaultValue={
                typeof webhookData?.headers === "object"
                  ? JSON.stringify(webhookData?.headers, null, 2)
                  : webhookData?.headers
              }
              onBlur={handleChangeHeaders}
              placeholder='{"Content-Type": "application/json"}'
            ></textarea>
            {errors.headers && <p className="text-red-500 text-xs mt-2">{errors.headers}</p>}
          </label>
          <button
            id="response-format-apply-button"
            className="btn btn-primary btn-sm my-2 float-right"
            onClick={() => handleResponseChange("custom")}
            disabled={
              errors.webhook !== "" ||
              errors.headers !== "" ||
              isReadOnly ||
              // Check if there are any changes to apply compared to initial values
              (webhookData.url === initialValues.url &&
                JSON.stringify(webhookData.headers) === JSON.stringify(initialValues.headers))
            }
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResponseFormatSelector;
