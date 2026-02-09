import Protected from "@/components/Protected";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeAction } from "@/store/action/bridgeAction";
import { sendDataToParent } from "@/utils/utility";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

function BridgeNameInput({ params, searchParams, isEmbedUser }) {
  const dispatch = useDispatch();
  const { bridgeName } = useCustomSelector((state) => ({
    bridgeName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.name || "",
  }));
  const textareaRef = useRef(null);
  const [originalValue, setOriginalValue] = useState(bridgeName);
  const [displayValue, setDisplayValue] = useState("");
  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "25px";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  };

  useEffect(() => {
    resizeTextarea();
  }, [displayValue]);

  useEffect(() => {
    setOriginalValue(bridgeName);
    setDisplayValue(bridgeName.length > 40 ? bridgeName.slice(0, 40) + "..." : bridgeName);
  }, [bridgeName]);

  const handleChange = (e) => {
    const input = e.target.value.slice(0, 50);

    // Check if the input contains % character
    if (input.includes("%")) {
      toast.error("Agent name cannot contain % character");
      return; // Don't update the value
    }

    setOriginalValue(input);
    setDisplayValue(input);
  };

  const handleFocus = () => {
    setDisplayValue(originalValue);
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
      }
    }, 0);
  };

  const handleBridgeNameChange = useCallback(() => {
    const trimmed = originalValue.trim();

    if (trimmed === "") {
      toast.error("Agent name cannot be empty");
      setDisplayValue(bridgeName.length > 40 ? bridgeName.slice(0, 40) + "..." : bridgeName);
      return;
    }

    if (trimmed !== bridgeName) {
      dispatch(
        updateBridgeAction({
          bridgeId: params.id,
          dataToSend: { name: trimmed },
        })
      );
    }
    isEmbedUser && sendDataToParent("updated", { name: trimmed, agent_id: params?.id }, "Agent Name Updated");
    setDisplayValue(trimmed.length > 40 ? trimmed.slice(0, 40) + "..." : trimmed);
  }, [originalValue, bridgeName, dispatch, params.id]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.target.blur();
      }
    },
    [handleBridgeNameChange]
  );

  return (
    <div id="bridge-name-input-container" className="flex flex-row items-center">
      <div className="relative w-full">
        <textarea
          id="bridge-name-input"
          className="font-bold min-h-[25px] text-xl outline-none resize-none leading-tight bg-transparent"
          style={{
            width: "40ch",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
          ref={textareaRef}
          rows={1}
          maxLength={50}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBridgeNameChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter Agent Name"
        />
      </div>
    </div>
  );
}

export default Protected(React.memo(BridgeNameInput));
