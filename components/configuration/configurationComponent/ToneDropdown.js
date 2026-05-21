import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import InfoTooltip from "@/components/InfoTooltip";
import CustomPromptModal from "./CustomPromptModal";
import { MODAL_TYPE } from "@/utils/enums";
import { openModal, closeModal } from "@/utils/utility";
import { CircleQuestionMark, Pencil } from "lucide-react";

const TONES = [
  { value: "authoritative", prompt: "Generate a strong, commanding response with authoritative guidance." },
  { value: "casual", prompt: "Generate a response in a relaxed, easygoing, and informal tone." },
  { value: "confident", prompt: "Generate a direct and assertive response with a confident tone." },
  { value: "concise", prompt: "Generate a brief, straight-to-the-point response." },
  { value: "curious", prompt: "Generate an inquisitive response showing curiosity." },
  { value: "empathetic", prompt: "Generate a response showing understanding, concern, and support." },
  { value: "friendly", prompt: "Generate a warm and welcoming response with a friendly tone." },
  {
    value: "formal",
    prompt: "Generate a response in a professional, respectful, and clear tone suitable for official communication.",
  },
  { value: "humorous", prompt: "Generate a playful and light-hearted response with humor." },
  {
    value: "inspiring",
    prompt: "Generate a response that uplifts and inspires the reader toward a higher purpose or goal.",
  },
  { value: "motivational", prompt: "Generate an encouraging and uplifting response." },
  { value: "neutral", prompt: "Generate an objective and balanced response without emotional engagement." },
  { value: "polite", prompt: "Generate a respectful and courteous response." },
  { value: "sarcastic", prompt: "Generate a witty and ironic response with a touch of sarcasm." },
];

const ToneDropdown = ({ params, searchParams, isPublished, isEditor = true }) => {
  const isReadOnly = isPublished || !isEditor;
  const { reduxTone } = useCustomSelector((state) => ({
    reduxTone:
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.settings?.tone || null,
  }));
  const dispatch = useDispatch();

  const [selectedTone, setSelectedTone] = useState(reduxTone?.value || "");

  useEffect(() => {
    setSelectedTone(reduxTone?.value || "");
  }, [reduxTone]);

  const openCustomModal = () => {
    openModal(MODAL_TYPE.CUSTOM_TONE_MODAL);
  };

  const closeCustomModal = () => {
    closeModal(MODAL_TYPE.CUSTOM_TONE_MODAL);
    if (reduxTone?.value !== "custom") setSelectedTone(reduxTone?.value || "");
  };

  const saveToRedux = (value, prompt) => {
    dispatch(
      updateBridgeVersionAction({
        versionId: searchParams?.version,
        dataToSend: { settings: { tone: value === "" ? "" : { value, prompt } } },
      })
    );
  };

  const handleToneChange = (e) => {
    const toneValue = e.target.value;
    if (toneValue === "custom") {
      openCustomModal();
      return;
    }
    if (toneValue !== reduxTone?.value) {
      setSelectedTone(toneValue);
      if (toneValue === "" || toneValue === "{}") {
        saveToRedux({}, "");
      } else {
        const tone = TONES.find((t) => t.value === toneValue);
        if (tone) saveToRedux(tone.value, tone.prompt);
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-1">
        <span className="label-text font-medium">Tone</span>
        <InfoTooltip tooltipContent="Select the tone of voice for your AI agent's responses. This affects how the agent communicates with users.">
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>

      <div className="relative">
        <select
          data-testid="tone-select"
          id="tone-select"
          disabled={isReadOnly}
          value={selectedTone}
          onChange={handleToneChange}
          className={`select select-sm select-bordered capitalize w-full ${selectedTone === "custom" && !isReadOnly ? "pr-8" : ""}`}
        >
          <option value="" disabled>
            Select a tone
          </option>
          <option value="{}">None</option>
          {TONES.map((tone) => (
            <option key={tone.value} value={tone.value}>
              {tone.value}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        {selectedTone === "custom" && !isReadOnly && (
          <button
            className="absolute right-10 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-primary transition-colors pointer-events-auto"
            title="Edit custom tone"
            onClick={openCustomModal}
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      <CustomPromptModal
        modalId={MODAL_TYPE.CUSTOM_TONE_MODAL}
        title="Custom Tone"
        description="Describe exactly how you want the AI to sound"
        placeholder="e.g. Respond in a warm yet professional tone — approachable but never overly casual. Use clear, simple language."
        prompt={reduxTone?.value === "custom" ? reduxTone?.prompt || "" : ""}
        onSave={(value) => {
          setSelectedTone("custom");
          saveToRedux("custom", value);
        }}
        onClose={closeCustomModal}
      />
    </div>
  );
};

export default ToneDropdown;
