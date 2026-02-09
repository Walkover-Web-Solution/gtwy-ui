import { dryRun } from "@/config/index";
import { useCustomSelector } from "@/customHooks/customSelector";
import { uploadImageAction } from "@/store/action/bridgeAction";
import {
  setChatLoading,
  setChatError,
  setChatUploadedFiles,
  setChatUploadedImages,
  sendMessageWithRtLayer,
  setChatTestCaseIdAction,
} from "@/store/action/chatAction";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { SendHorizontalIcon, UploadIcon, LinkIcon, PlayIcon, CloseCircleIcon } from "@/components/Icons";
import { Paperclip } from "lucide-react";
import { PdfIcon } from "@/icons/pdfIcon";
import { toggleSidebar } from "@/utils/utility";
import { buildUserUrls } from "@/utils/attachmentUtils";

const VARIABLE_SLIDER_DISABLE_KEY = "variableSliderDisabled";

function ChatTextInput({
  channelIdentifier,
  params,
  isOrchestralModel,
  inputRef,
  searchParams,
  setTestCaseId,
  testCaseId,
  selectedStrategy,
  handleSendMessageRef,
  showTestCases,
}) {
  // Reset textarea height when test cases are toggled or when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      // Use requestAnimationFrame to ensure the DOM is ready
      requestAnimationFrame(() => {
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = "40px"; // Reset to default height
        // Clear any existing content
        if (inputRef.current.value === "") {
          inputRef.current.style.height = "40px";
        }
      });
    }
  }, [showTestCases, inputRef]);
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [validationError, setValidationError] = useState(null);
  const dispatch = useDispatch();
  const [fileInput, setFileInput] = useState(null); // Use state for the file input element
  const versionId = searchParams?.version;
  const isPublished = searchParams?.isPublished === "true";

  const {
    bridge,
    variablesKeyValue,
    prompt,
    configuration,
    modelInfo,
    service,
    modelType,
    modelName,
    isEmbedUser,
    showVariables,
  } = useCustomSelector((state) => {
    const versionData = state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[versionId];
    const bridgeDataFromState = state?.bridgeReducer?.allBridgesMap?.[params?.id];

    // Use bridgeData when isPublished=true, otherwise use versionData
    const activeData = isPublished ? bridgeDataFromState : versionData;

    return {
      bridge: activeData,
      prompt: isPublished ? bridgeDataFromState?.configuration?.prompt : versionData?.configuration?.prompt,
      variablesKeyValue: state?.variableReducer?.VariableMapping?.[params?.id]?.[versionId]?.variables || [],
      configuration: isPublished ? bridgeDataFromState?.configuration : versionData?.configuration,
      modelInfo: state?.modelReducer?.serviceModels,
      service: isPublished ? bridgeDataFromState?.service?.toLowerCase() : versionData?.service?.toLowerCase(),
      modelType: isPublished ? bridgeDataFromState?.configuration?.type : versionData?.configuration?.type,
      modelName: isPublished ? bridgeDataFromState?.configuration?.model : versionData?.configuration?.model,
      isEmbedUser: state?.appInfoReducer?.embedUserDetails?.isEmbedUser || false,
      showVariables: state?.appInfoReducer?.embedUserDetails?.showVariables || false,
    };
  });

  // Redux selectors for chat state
  const { conversation, loading, uploadedFiles, uploadedImages, storedTestCaseId } = useCustomSelector((state) => ({
    conversation: state?.chatReducer?.conversationsByChannel?.[channelIdentifier] || [],
    loading: state?.chatReducer?.loadingByChannel?.[channelIdentifier] || false,
    uploadedFiles: state?.chatReducer?.uploadedFilesByChannel?.[channelIdentifier] || [],
    uploadedImages: state?.chatReducer?.uploadedImagesByChannel?.[channelIdentifier] || [],
    storedTestCaseId: state?.chatReducer?.testCaseIdByChannel?.[channelIdentifier] || null,
  }));
  const dataToSend = useMemo(
    () => ({
      configuration: {
        model: modelName,
        type: modelType,
      },
      service: bridge?.service?.toLowerCase(),
      apikey_object_id: bridge?.apikey,
      bridgeType: bridge?.bridgeType,
      slugName: bridge?.slugName,
      response_format: {
        type: "default",
      },
    }),
    [modelName, modelType, bridge]
  );

  const [localDataToSend, setLocalDataToSend] = useState(dataToSend);

  const { isVision, isFileSupported, isVideoSupported } = useMemo(() => {
    const validationConfig =
      modelInfo?.[service]?.[configuration?.type]?.[configuration?.model]?.validationConfig || {};
    return {
      isVision: validationConfig.vision,
      isFileSupported: validationConfig.files,
      isVideoSupported: validationConfig.video,
    };
  }, [modelInfo, service, configuration?.type, configuration?.model]);

  useEffect(() => {
    setLocalDataToSend(dataToSend);
  }, [dataToSend]);

  const variables = useMemo(() => {
    const coerceValue = (rawValue, fallback, type) => {
      const candidate = rawValue ?? fallback ?? "";
      const trimmed = typeof candidate === "string" ? candidate.trim() : candidate;
      if (trimmed === "") {
        return undefined;
      }
      if (type === "number") {
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? undefined : parsed;
      }
      if (type === "boolean") {
        if (typeof trimmed === "boolean") return trimmed;
        if (String(trimmed).toLowerCase() === "true") return true;
        if (String(trimmed).toLowerCase() === "false") return false;
        return undefined;
      }
      if (type === "object" || type === "array") {
        try {
          const parsed = typeof candidate === "string" ? JSON.parse(candidate) : candidate;
          return parsed;
        } catch {
          return undefined;
        }
      }
      return candidate;
    };

    return variablesKeyValue.reduce((acc, pair) => {
      if (!pair?.key) {
        return acc;
      }
      const resolved = pair.value && String(pair.value).length > 0 ? pair.value : pair.defaultValue;

      if (resolved === undefined || (typeof resolved === "string" && resolved.trim() === "")) {
        return acc;
      }

      const coerced = coerceValue(pair.value, pair.defaultValue, pair.type || "string");
      if (coerced !== undefined) {
        acc[pair.key] = coerced;
      }
      return acc;
    }, {});
  }, [variablesKeyValue]);

  // Validate missing variables in prompt
  const validatePromptVariables = useCallback(() => {
    if (!prompt) return { isValid: true, missingVariables: [] };

    // Extract variables from prompt using regex
    const regex = /{{(.*?)}}/g;
    const matches = [...prompt.matchAll(regex)];
    const promptVariables = [...new Set(matches.map((match) => match[1].trim()))];

    if (!promptVariables.length) return { isValid: true, missingVariables: [] };

    // Check which variables are missing values
    const missingVariables = promptVariables.filter((varName) => {
      const variable = variablesKeyValue.find((v) => v.key === varName);
      if (!variable) {
        return true; // Variable not defined at all
      }

      // Skip validation for optional variables
      if (!variable.required) {
        return false;
      }

      const hasValue = variable.value !== undefined && variable.value !== null && String(variable.value).trim() !== "";
      const hasDefault =
        variable.defaultValue !== undefined &&
        variable.defaultValue !== null &&
        String(variable.defaultValue).trim() !== "";
      return !hasValue && !hasDefault; // Missing both value and default
    });

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    };
  }, [prompt, variablesKeyValue]);

  const handleSendMessage = async (e, forceRun = false) => {
    if (inputRef.current) {
      inputRef.current.style.height = "40px"; // Set initial height
    }
    // Skip prompt validation for chat models - they don't require a system prompt
    if (prompt?.trim() === "" && modelType !== "completion" && modelType !== "embedding" && modelType !== "chat") {
      dispatch(setChatError(channelIdentifier, "Prompt is required"));
      return;
    }

    const isSliderAutoOpenDisabled =
      typeof window !== "undefined" && sessionStorage.getItem(VARIABLE_SLIDER_DISABLE_KEY) === "true";

    // Validate variables in prompt
    if (!forceRun && !isSliderAutoOpenDisabled) {
      const validation = validatePromptVariables();
      if (!validation.isValid && (!isEmbedUser || (isEmbedUser && showVariables))) {
        const missingVars = validation.missingVariables.join(", ");
        const errorMsg = `Missing values for variables: ${missingVars}. Please provide values or default values.`;
        setValidationError(errorMsg);
        // Open the variable collection slider
        toggleSidebar("variable-collection-slider", "right");

        // Store missing variables in sessionStorage for the slider to highlight
        sessionStorage.setItem("missingVariables", JSON.stringify(validation.missingVariables));

        return;
      } else {
        // Clear validation states if validation passes
        setValidationError(null);
        sessionStorage.removeItem("missingVariables");
      }
    } else {
      setValidationError(null);
    }

    const newMessage = inputRef?.current?.value.replace(/\r?\n/g, "\n");

    if (uploadedFiles?.length > 0 && newMessage?.trim() === "") {
      dispatch(setChatError(channelIdentifier, "A message is required when uploading a PDF."));
      return;
    }

    if (modelType !== "completion" && modelType !== "embedding") {
      if (newMessage?.trim() === "" && uploadedImages?.length === 0 && uploadedFiles?.length === 0) {
        dispatch(setChatError(channelIdentifier, "Message cannot be empty"));
        return;
      }
    }
    let testcase_data = {
      matching_type: selectedStrategy || "exact",
    };
    // Use stored testcase_id from Redux if available, otherwise fall back to prop
    const activeTestCaseId = storedTestCaseId || testCaseId;
    if (activeTestCaseId) {
      testcase_data.testcase_id = activeTestCaseId;
    }
    dispatch(setChatError(channelIdentifier, ""));
    if (modelType !== "completion") inputRef.current.value = "";

    try {
      let responseData;
      let data;
      const userUrls = buildUserUrls(uploadedImages, uploadedFiles);
      if (modelType !== "completion" && modelType !== "embedding") {
        data = {
          role: "user",
          content: newMessage,
          images: uploadedImages, // Include images in the data
          files: uploadedFiles,
          youtube_url: mediaUrls, // Include media URLs in the data
        };

        // Use RT layer action for non-orchestral models
        const apiCall = async () => {
          return await dryRun({
            localDataToSend: {
              ...(isPublished ? {} : { version_id: versionId }),
              testcase_data,
              configuration: {
                conversation: conversation,
                type: modelType,
              },
              user: data.content,
              user_urls: userUrls,
              variables,
              orchestrator_flag: isOrchestralModel,
            },
            bridge_id: params?.id,
          });
        };

        // Send message with RT layer handling (loading will persist until RT response)
        const result = await dispatch(
          sendMessageWithRtLayer(channelIdentifier, newMessage, apiCall, isOrchestralModel, {
            user_urls: userUrls,
            youtube_url: mediaUrls,
          })
        );

        // Clear uploaded files after successful RT layer message creation
        dispatch(setChatUploadedFiles(channelIdentifier, []));
        dispatch(setChatUploadedImages(channelIdentifier, []));

        responseData = result.response;

        // Handle unsuccessful response: rollback via Redux
        if (!responseData || !responseData.success) {
          inputRef.current.value = data.content;
          dispatch(setChatError(channelIdentifier, "Failed to get response"));
          return;
        }
      } else if (modelType === "embedding") {
        data = {
          role: "user",
          content: newMessage,
        };

        // Use RT layer action for embedding models too
        const apiCall = async () => {
          return await dryRun({
            localDataToSend: {
              ...(isPublished ? {} : { version_id: versionId }),
              testcase_data,
              configuration: {
                conversation: conversation,
                type: modelType,
              },
              text: newMessage,
              orchestrator_flag: isOrchestralModel,
            },
            bridge_id: params?.id,
          });
        };

        // Send message with RT layer handling (loading will persist until RT response)
        const result = await dispatch(
          sendMessageWithRtLayer(channelIdentifier, newMessage, apiCall, isOrchestralModel)
        );

        responseData = result.response;

        if (!responseData || !responseData.success) {
          inputRef.current.value = data.content;
          dispatch(setChatError(channelIdentifier, "Failed to get response"));
          return;
        }
      } else if (modelType !== "image") {
        if (activeTestCaseId) {
          testcase_data.testcase_id = activeTestCaseId;
        }

        // Use RT layer action for completion models too
        const apiCall = async () => {
          return await dryRun({
            localDataToSend: {
              ...localDataToSend,
              ...(isPublished ? {} : { version_id: versionId }),
              testcase_data,
              configuration: {
                ...localDataToSend.configuration,
              },
              input: bridge?.inputConfig?.input?.input,
              orchestrator_flag: isOrchestralModel,
            },
            bridge_id: params?.id,
          });
        };

        // Send message with RT layer handling (loading will persist until RT response)
        const result = await dispatch(
          sendMessageWithRtLayer(channelIdentifier, bridge?.inputConfig?.input?.input || "", apiCall, isOrchestralModel)
        );

        responseData = result.response;

        if (!responseData || !responseData.success) {
          dispatch(setChatError(channelIdentifier, "Failed to get response"));
          return;
        }
      }
      if (responseData?.response?.testcase_id) {
        dispatch(setChatTestCaseIdAction(channelIdentifier, responseData?.response?.testcase_id));
        if (setTestCaseId) {
          setTestCaseId(responseData?.response?.testcase_id);
        }
      }
    } catch {
      dispatch(setChatError(channelIdentifier, "Something went wrong. Please try again."));
      dispatch(setChatLoading(channelIdentifier, false)); // Clear loading on error
    }
  };

  // Listen for runAnyway event from variable slider
  useEffect(() => {
    const handleRunAnywayEvent = (event) => {
      if (event.detail?.forceRun) {
        handleSendMessage(null, true); // Call with forceRun = true
      }
    };

    const handleClearValidationEvent = () => {
      setValidationError(null); // Clear validation error
    };

    window.addEventListener("runAnyway", handleRunAnywayEvent);
    window.addEventListener("clearValidationError", handleClearValidationEvent);

    return () => {
      window.removeEventListener("runAnyway", handleRunAnywayEvent);
      window.removeEventListener("clearValidationError", handleClearValidationEvent);
    };
  }, [handleSendMessage]);

  // Provide handleSendMessage function to parent component
  useEffect(() => {
    if (handleSendMessageRef) {
      handleSendMessageRef.current = handleSendMessage;
    }
  }, [handleSendMessageRef, handleSendMessage]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter") {
        if (event.shiftKey) {
          // Do nothing, let the default behavior create a new line
        } else {
          // Only prevent default and send if not loading
          if (!loading && !uploading) {
            event.preventDefault();
            handleSendMessage(event);
          }
        }
      }
    },
    [loading, uploading, handleSendMessage]
  );
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const largeFiles = files.filter((file) => file.size > 35 * 1024 * 1024);
    if (largeFiles.length > 0) {
      toast.error("Each file should be less than 35MB.");
      return;
    }
    const newImages = files.filter((file) => file.type.startsWith("image/"));

    const totalImages = uploadedImages.length + newImages.length;
    if (totalImages > 4) {
      toast.error("Only four images are allowed.");
      return;
    }

    if (files.length > 0) {
      setUploading(true);

      for (let file of files) {
        const formData = new FormData();
        formData.append("image", file);
        const result = await dispatch(uploadImageAction(formData));

        if (result.success) {
          if (file.type === "application/pdf") {
            dispatch(setChatUploadedFiles(channelIdentifier, [...uploadedFiles, result.image_url]));
          } else {
            dispatch(setChatUploadedImages(channelIdentifier, [...uploadedImages, result.image_url]));
          }
        }
      }

      setUploading(false);
    }
    // Clear the file input value to allow re-uploading the same file
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const addMediaUrl = () => {
    if (urlInput.trim() && !mediaUrls) {
      // Basic URL validation
      try {
        new URL(urlInput.trim());
        setMediaUrls(urlInput.trim());
        setUrlInput("");
        setShowUrlInput(false);
      } catch {
        toast.error("Please enter a valid URL.");
      }
    } else if (mediaUrls) {
      toast.error("Only one YouTube URL is allowed.");
    }
  };

  const removeUrl = () => {
    setMediaUrls(null);
  };

  const handleAttachmentOption = (type) => {
    switch (type) {
      case "images":
        if (fileInput) {
          fileInput.accept = "image/*";
          fileInput.click();
        }
        break;
      case "videos":
        if (fileInput) {
          fileInput.accept = "video/*";
          fileInput.click();
        }
        break;
      case "files":
        if (fileInput) {
          fileInput.accept = ".pdf";
          fileInput.click();
        }
        break;
      case "url":
        setShowUrlInput(true);
        break;
      default:
        if (fileInput) {
          fileInput.accept =
            isVision && isFileSupported && isVideoSupported
              ? "image/*,.pdf,video/*"
              : isVision && isVideoSupported
                ? "image/*,video/*"
                : isVision && isFileSupported
                  ? "image/*,.pdf"
                  : isVision
                    ? "image/*"
                    : isFileSupported
                      ? ".pdf"
                      : "image/*,.pdf,video/*";
          fileInput.click();
        }
    }
  };

  return (
    <div id="chat-text-input-container" className="input-group flex justify-end items-end gap-2 w-full relative">
      {/* --- CORRECTED PREVIEW CONTAINER --- */}
      {(uploadedImages.length > 0 || uploadedFiles.length > 0) && (
        <div
          id="chat-preview-container"
          className="absolute bottom-16 left-0 w-full flex flex-nowrap overflow-x-auto items-end gap-2 p-2 bg-base-100 border-t rounded-t-lg"
        >
          {/* Image Previews */}
          {uploadedImages.map((url, index) => (
            <div key={index} className="relative flex-shrink-0">
              <Image
                src={url}
                alt={`Uploaded Preview ${index + 1}`}
                width={64}
                height={64}
                className="w-16 h-16 object-cover bg-base-300 p-1 rounded-lg"
              />
              <button
                id={`chat-remove-image-${index}`}
                className="absolute -top-2 -right-2 text-white rounded-full"
                onClick={() => {
                  const newImages = uploadedImages.filter((_, i) => i !== index);
                  dispatch(setChatUploadedImages(channelIdentifier, newImages));
                }}
              >
                <CloseCircleIcon className="text-base-content bg-base-200 rounded-full" size={20} />
              </button>
            </div>
          ))}
          {/* File Previews */}
          {uploadedFiles.map((url, index) => (
            <div key={index} className="relative flex-shrink-0">
              <div className="flex items-center h-16 gap-2 bg-base-300 p-2 rounded-lg">
                <PdfIcon height={24} width={24} />
                <p className="text-sm max-w-[120px] truncate" title={url}>
                  {url.split("/").pop()}
                </p>
              </div>

              <button
                id={`chat-remove-file-${index}`}
                className="absolute -top-2 -right-2 text-white rounded-full"
                onClick={() => {
                  const newFiles = uploadedFiles.filter((_, i) => i !== index);
                  dispatch(setChatUploadedFiles(channelIdentifier, newFiles));
                }}
              >
                <CloseCircleIcon className="text-base-content bg-base-200 rounded-full" size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Media URL Preview */}
      {mediaUrls && (
        <div
          id="chat-media-url-preview"
          className="absolute bottom-16 left-0 w-full flex items-center gap-2 p-2 bg-base-100 border-t rounded-t-lg"
        >
          <LinkIcon size={16} className="text-base-content" />
          <span className="text-sm truncate flex-1">{mediaUrls}</span>
          <button id="chat-remove-url-button" onClick={removeUrl} className="btn btn-ghost btn-xs">
            <CloseCircleIcon size={16} />
          </button>
        </div>
      )}

      {/* URL Input Modal */}
      {showUrlInput && (
        <div
          id="chat-url-input-modal"
          className="absolute bottom-16 left-0 w-full p-3 bg-base-100 border rounded-lg shadow-lg"
        >
          <div className="flex gap-2 items-center">
            <input
              id="chat-url-input"
              type="url"
              placeholder="Enter YouTube URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="input input-sm flex-1 border-base-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") addMediaUrl();
                if (e.key === "Escape") setShowUrlInput(false);
              }}
            />
            <button id="chat-url-add-button" onClick={addMediaUrl} className="btn btn-primary btn-sm">
              Add
            </button>
            <button id="chat-url-cancel-button" onClick={() => setShowUrlInput(false)} className="btn btn-ghost btn-sm">
              Cancel
            </button>
          </div>
          <p className="text-xs text-base-content/60 mt-1">Support YouTube videos URL only</p>
        </div>
      )}

      {/* Validation Error Display */}
      {validationError && (
        <div
          id="chat-validation-error"
          className="absolute bottom-16 left-0 w-full p-3 bg-error/10 border border-error/20 rounded-lg"
        >
          <p className="text-sm text-error">{validationError}</p>
          <p className="text-xs text-error/70 mt-1">Please fill in the missing variables in the Variables panel.</p>
        </div>
      )}

      {/* Input Group */}
      <div className="input-group flex justify-end items-end gap-2 w-full relative">
        {modelType !== "completion" && (
          <textarea
            id="chat-message-textarea"
            ref={inputRef}
            placeholder="Type here"
            className={`textarea bg-white dark:bg-black/15 textarea-bordered w-full max-h-[200px] resize-none overflow-y-auto h-auto ${
              validationError
                ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                : "focus:border-primary"
            }`}
            onKeyDown={handleKeyDown}
            rows={1}
            onInput={(e) => {
              e.target.style.height = "auto"; // Reset height
              e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; // Set to scroll height, max 200px
            }}
          />
        )}
        <input
          id="chat-file-input"
          ref={(el) => setFileInput(el)} // Use callback ref to set the state
          type="file"
          accept={
            isVision && isFileSupported && isVideoSupported
              ? "image/*,.pdf,video/*"
              : isVision && isVideoSupported
                ? "image/*,video/*"
                : isVision && isFileSupported
                  ? "image/*,.pdf"
                  : isVision
                    ? "image/*"
                    : isFileSupported
                      ? ".pdf"
                      : "image/*,.pdf,video/*"
          }
          multiple={isVision || isFileSupported || isVideoSupported}
          onChange={handleFileChange}
          className="hidden"
          data-max-size="35MB"
        />
        {/* DaisyUI Dropdown for Attachments */}
        {(isVision || isFileSupported || isVideoSupported) && (
          <div id="chat-attachment-dropdown" className="dropdown dropdown-top dropdown-end">
            <div className="tooltip tooltip-top" data-tip="Attach files">
              <label
                id="chat-attachment-button"
                tabIndex={0}
                className={`btn btn-circle transition-all duration-200 ${
                  uploading ? "btn-disabled bg-base-300" : "btn-ghost hover:btn-primary hover:scale-105"
                }`}
                disabled={loading || uploading}
              >
                {uploading ? <span className="loading loading-spinner loading-sm"></span> : <Paperclip size={18} />}
              </label>
            </div>

            {/* DaisyUI Dropdown Content */}
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow-2xl bg-base-100 rounded-box w-60 border border-base-300"
            >
              <li className="menu-title">
                <span className="text-xs font-semibold text-base-content/60">Attach files</span>
              </li>

              {/* Images Option */}
              {isVision && (
                <li>
                  <a
                    id="chat-attach-images-option"
                    onClick={() => handleAttachmentOption("images")}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="p-1.5 bg-base-100 rounded-lg">
                      <UploadIcon size={16} className="text-base-content" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Upload Images</div>
                      <div className="text-xs text-base-content/60">JPG, PNG, GIF, WebP</div>
                    </div>
                  </a>
                </li>
              )}

              {/* Videos Option */}
              {isVideoSupported && (
                <li>
                  <a
                    id="chat-attach-videos-option"
                    onClick={() => handleAttachmentOption("videos")}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="p-1.5 bg-base-100 rounded-lg">
                      <PlayIcon size={16} className="text-base-content" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Upload Video</div>
                      <div className="text-xs text-base-content/60">MP4, WebM, AVI (1 max)</div>
                    </div>
                  </a>
                </li>
              )}

              {/* Files Option */}
              {isFileSupported && (
                <li>
                  <a
                    id="chat-attach-files-option"
                    onClick={() => handleAttachmentOption("files")}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="p-1.5 bg-base-100 rounded-lg">
                      <PdfIcon height={16} width={16} className="text-base-content" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Upload Documents</div>
                      <div className="text-xs text-base-content/60">PDF files</div>
                    </div>
                  </a>
                </li>
              )}

              {/* URL Option */}
              {isVideoSupported && (
                <li>
                  <a
                    id="chat-attach-url-option"
                    onClick={() => handleAttachmentOption("url")}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="p-1.5 bg-base-100 rounded-lg">
                      <LinkIcon size={16} className="text-base-content" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Add URL</div>
                      <div className="text-xs text-base-content/60">Youtube URL</div>
                    </div>
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
        {/* Enhanced Send Button */}
        <div className="tooltip tooltip-top" data-tip="Send message">
          <button
            id="chat-send-button"
            className={`btn btn-circle transition-all duration-200 ${
              loading || uploading || modelType === "image"
                ? "btn-disabled"
                : " btn hover:btn-primary-focus hover:scale-105 shadow-lg hover:shadow-xl"
            }`}
            onClick={() => {
              handleSendMessage();
            }}
            disabled={loading || uploading || modelType === "image"}
          >
            {loading || uploading ? (
              <span className="loading loading-dots loading-md"></span>
            ) : (
              <SendHorizontalIcon size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatTextInput;
