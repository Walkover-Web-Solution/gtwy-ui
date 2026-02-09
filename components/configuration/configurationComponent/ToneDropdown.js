import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import InfoTooltip from "@/components/InfoTooltip";
import { CircleQuestionMark } from "lucide-react";

const TONES = [
  {
    value: "authoritative",
    prompt: "Generate a strong, commanding response with authoritative guidance.",
  },
  {
    value: "casual",
    prompt: "Generate a response in a relaxed, easygoing, and informal tone.",
  },
  {
    value: "confident",
    prompt: "Generate a direct and assertive response with a confident tone.",
  },
  {
    value: "concise",
    prompt: "Generate a brief, straight-to-the-point response.",
  },
  {
    value: "curious",
    prompt: "Generate an inquisitive response showing curiosity.",
  },
  {
    value: "empathetic",
    prompt: "Generate a response showing understanding, concern, and support.",
  },
  {
    value: "friendly",
    prompt: "Generate a warm and welcoming response with a friendly tone.",
  },
  {
    value: "formal",
    prompt: "Generate a response in a professional, respectful, and clear tone suitable for official communication.",
  },
  {
    value: "humorous",
    prompt: "Generate a playful and light-hearted response with humor.",
  },
  {
    value: "inspiring",
    prompt: "Generate a response that uplifts and inspires the reader toward a higher purpose or goal.",
  },
  {
    value: "motivational",
    prompt: "Generate an encouraging and uplifting response.",
  },
  {
    value: "neutral",
    prompt: "Generate an objective and balanced response without emotional engagement.",
  },
  {
    value: "polite",
    prompt: "Generate a respectful and courteous response.",
  },
  {
    value: "sarcastic",
    prompt: "Generate a witty and ironic response with a touch of sarcasm.",
  },
];

const ToneDropdown = ({ params, searchParams, isPublished, isEditor = true }) => {
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const { reduxTone } = useCustomSelector((state) => ({
    reduxTone:
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.configuration?.tone || null,
  }));
  const dispatch = useDispatch();

  const [selectedTone, setSelectedTone] = useState(reduxTone?.value || "");

  useEffect(() => {
    setSelectedTone(reduxTone?.value || "");
  }, [reduxTone]);

  const handleToneChange = (e) => {
    const toneValue = e.target.value;

    if (toneValue !== reduxTone?.value) {
      setSelectedTone(toneValue);

      // Handle "None" option - send empty string
      if (toneValue === "") {
        dispatch(
          updateBridgeVersionAction({
            versionId: searchParams?.version,
            dataToSend: {
              configuration: {
                tone: "",
              },
            },
          })
        );
      } else {
        const tone = TONES.find((tone) => tone.value === toneValue) || {};
        if (tone) {
          dispatch(
            updateBridgeVersionAction({
              versionId: searchParams?.version,
              dataToSend: {
                configuration: {
                  tone: {
                    value: tone.value,
                    prompt: tone.prompt,
                  },
                },
              },
            })
          );
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Tone Label */}
      <div className="flex items-center gap-1">
        <span className="label-text font-medium">Tone</span>
        <InfoTooltip tooltipContent="Select the tone of voice for your AI agent's responses. This affects how the agent communicates with users.">
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>

      {/* Tone Dropdown */}
      <select
        id="tone-select"
        disabled={isReadOnly}
        value={selectedTone}
        onChange={handleToneChange}
        className="select select-sm select-bordered capitalize w-full"
      >
        <option value="" disabled>
          Select a tone
        </option>
        <option value="">None</option>
        {TONES.map((tone) => (
          <option key={tone.value} value={tone.value}>
            {tone.value}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ToneDropdown;
