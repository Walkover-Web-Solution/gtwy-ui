// JsonSchemaModal.jsx
import { optimizeSchemaApi } from "@/config/utilityApi";
import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { MODAL_TYPE } from "@/utils/enums";
import React, { useMemo } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Canvas from "../Canvas";
import Modal from "../UI/Modal";
import { closeModal } from "@/utils/utility";

function JsonSchemaModal({ params, searchParams, messages, setMessages, thread_id, onResetThreadId = () => {} }) {
  const dispatch = useDispatch();
  const { json_schema } = useCustomSelector((state) => ({
    json_schema:
      state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.configuration?.response_type
        ?.json_schema,
  }));

  // Use useMemo to always get the latest formatted JSON schema
  const jsonSchemaRequirements = useMemo(() => {
    return typeof json_schema === "object" ? JSON.stringify(json_schema, null, 4) : json_schema || "";
  }, [json_schema]);

  const handleOptimizeApi = async (instructionText) => {
    const result = await optimizeSchemaApi({
      data: {
        thread_id,
        query: instructionText,
        json_schema: jsonSchemaRequirements,
      },
    });
    return result;
  };

  const handleApply = async (schemaToApply) => {
    try {
      // Ensure we're parsing only if it's a string and not already an object
      const parsedSchema = typeof schemaToApply === "string" ? JSON.parse(schemaToApply) : schemaToApply;

      await dispatch(
        updateBridgeVersionAction({
          bridgeId: params?.id,
          versionId: searchParams?.version,
          dataToSend: {
            configuration: {
              response_type: {
                type: "json_schema",
                json_schema: parsedSchema,
              },
            },
          },
        })
      );
      // Close the modal after applying changes
      handleCloseModal();
    } catch (error) {
      toast.error("Invalid JSON Schema");
      console.error("JSON parse error:", error);
    }
  };

  const handleCloseModal = () => {
    closeModal(MODAL_TYPE.JSON_SCHEMA);
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.JSON_SCHEMA}>
      <div
        id="json-schema-modal-container"
        className="modal-box  max-w-screen-lg h-[calc(100%-10rem)] w-[calc(100%-20rem)] bg-base-100 overflow-hidden"
      >
        <div className="flex justify-between items-center mb-2 pt-3">
          <h3 className="font-bold text-lg">Improve JSON Schema</h3>
          <button id="json-schema-close-button" onClick={handleCloseModal} className="btn btn-sm" type="button">
            Close
          </button>
        </div>
        <Canvas
          OptimizePrompt={handleOptimizeApi}
          messages={messages}
          setMessages={setMessages}
          handleApplyOptimizedPrompt={handleApply}
          label="Schema"
          width="100%"
          height="92%"
          onResetThreadId={onResetThreadId}
        />
      </div>
    </Modal>
  );
}

export default React.memo(JsonSchemaModal);
