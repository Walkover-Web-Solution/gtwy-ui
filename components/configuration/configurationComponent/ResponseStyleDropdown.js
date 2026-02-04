import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { useCustomSelector } from "@/customHooks/customSelector";
import InfoTooltip from "@/components/InfoTooltip";
import { CircleQuestionMark } from "lucide-react";

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
  // Determine if content is read-only (either published or user is not an editor)
  const isReadOnly = isPublished || !isEditor;
  const { reduxResponseStyle } = useCustomSelector((state) => ({
    reduxResponseStyle:
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.configuration?.responseStyle ||
      null,
  }));
  const dispatch = useDispatch();

  const [selectedStyle, setSelectedStyle] = useState(reduxResponseStyle?.value || "");

  useEffect(() => {
    setSelectedStyle(reduxResponseStyle?.value || "");
  }, [reduxResponseStyle]);
  const handleStyleChange = (e) => {
    const styleValue = e.target.value;

    if (styleValue !== reduxResponseStyle?.value) {
      setSelectedStyle(styleValue);

      // Handle "None" option - send empty string
      if (styleValue === "") {
        dispatch(
          updateBridgeVersionAction({
            versionId: searchParams?.version,
            dataToSend: {
              configuration: {
                responseStyle: "",
              },
            },
          })
        );
      } else {
        const style = RESPONSE_STYLES.find((style) => style.value === styleValue) || {};
        if (style) {
          dispatch(
            updateBridgeVersionAction({
              versionId: searchParams?.version,
              dataToSend: {
                configuration: {
                  responseStyle: {
                    value: style.value,
                    prompt: style.prompt,
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
      {/* Response Style Label */}
      <div className="flex items-center gap-1">
        <span className="label-text font-medium">Response Style</span>
        <InfoTooltip tooltipContent="Choose how detailed and structured you want your AI agent's responses to be.">
          <CircleQuestionMark size={14} className="text-gray-500 hover:text-gray-700 cursor-help" />
        </InfoTooltip>
      </div>

      {/* Response Style Dropdown */}
      <select
        id="response-style-select"
        disabled={isReadOnly}
        value={selectedStyle}
        onChange={handleStyleChange}
        className="select select-sm select-bordered capitalize w-full"
      >
        <option value="" disabled>
          Select a Response Style
        </option>
        <option value="">None</option>
        {RESPONSE_STYLES.map((style) => (
          <option key={style.value} value={style.value}>
            {style.value}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ResponseStyleDropdown;
