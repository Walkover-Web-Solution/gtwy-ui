import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import InfoTooltip from "@/components/InfoTooltip";
import CustomPromptModal from "./CustomPromptModal";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal } from "@/utils/utility";
import { CircleQuestionMark, Pencil } from "lucide-react";

const RESPONSE_STYLES = [
  {
    value: "action-Oriented",
    prompt: "Generate a response that emphasizes actionable steps or advice.",
  },
  {
    value: "analytical",
    prompt: "Generate a logical, data-driven response that breaks down the topic with reasoning.",
  },
  {
    value: "crisp",
    prompt: "Generate a concise and to-the-point response without extra details.",
  },
  {
    value: "detailed",
    prompt: "Generate a comprehensive response with thorough explanations.",
  },
  {
    value: "short",
    prompt: "Generate a brief response that avoids unnecessary elaboration.",
  },
  {
    value: "storytelling",
    prompt: "Generate a response in the form of a short story or narrative to convey the message in an engaging way.",
  },
];

const ResponseStyleDropdown = ({ params, searchParams, isPublished, isEditor = true }) => {
  const isReadOnly = isPublished || !isEditor;
  const { reduxResponseStyle } = useCustomSelector((state) => ({
    reduxResponseStyle:
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.settings?.responseStyle ||
      null,
  }));
  const dispatch = useDispatch();

  const [selectedStyle, setSelectedStyle] = useState(reduxResponseStyle?.value || "");

  useEffect(() => {
    setSelectedStyle(reduxResponseStyle?.value || "");
  }, [reduxResponseStyle]);

  const openCustomModal = () => {
    openModal(MODAL_TYPE.CUSTOM_RESPONSE_STYLE_MODAL);
  };

  const closeCustomModal = () => {
    closeModal(MODAL_TYPE.CUSTOM_RESPONSE_STYLE_MODAL);
    if (reduxResponseStyle?.value !== "custom") setSelectedStyle(reduxResponseStyle?.value || "");
  };

  const saveToRedux = (value, prompt) => {
    dispatch(
      updateBridgeVersionAction({
        versionId: searchParams?.version,
        dataToSend: { settings: { responseStyle: value === "" ? "" : { value, prompt } } },
      })
    );
  };

  const handleStyleChange = (e) => {
    const styleValue = e.target.value;
    if (styleValue === "custom") {
      openCustomModal();
      return;
    }
    if (styleValue !== reduxResponseStyle?.value) {
      setSelectedStyle(styleValue);
      if (styleValue === "" || styleValue === "{}") {
        saveToRedux("", "");
      } else {
        const style = RESPONSE_STYLES.find((s) => s.value === styleValue);
        if (style) saveToRedux(style.value, style.prompt);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-1">
        <span className="label-text font-medium">Response Style</span>
        <InfoTooltip tooltipContent="Choose how detailed and structured you want your AI agent's responses to be.">
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>

      <div className="relative">
        <select
          data-testid="response-style-select"
          id="response-style-select"
          disabled={isReadOnly}
          value={selectedStyle}
          onChange={handleStyleChange}
          className={`select select-sm select-bordered capitalize w-full ${selectedStyle === "custom" && !isReadOnly ? "pr-8" : ""}`}
        >
          <option value="" disabled>
            Select a Response Style
          </option>
          <option value="{}">None</option>
          {RESPONSE_STYLES.map((style) => (
            <option key={style.value} value={style.value}>
              {style.value}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        {selectedStyle === "custom" && !isReadOnly && (
          <button
            className="absolute right-10 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-primary transition-colors pointer-events-auto"
            title="Edit custom response style"
            onClick={openCustomModal}
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      <CustomPromptModal
        modalId={MODAL_TYPE.CUSTOM_RESPONSE_STYLE_MODAL}
        title="Custom Response Style"
        description="Describe exactly how you want the AI to structure its responses"
        placeholder="e.g. Always respond with a short summary first, then bullet points, and end with a one-line conclusion."
        prompt={reduxResponseStyle?.value === "custom" ? reduxResponseStyle?.prompt || "" : ""}
        onSave={(value) => {
          setSelectedStyle("custom");
          saveToRedux("custom", value);
        }}
        onClose={closeCustomModal}
      />
    </div>
  );
};

export default ResponseStyleDropdown;
