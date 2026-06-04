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
import CodeMirror from "@uiw/react-codemirror";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { useThemeManager } from "@/customHooks/useThemeManager";
import { linter, lintGutter } from "@codemirror/lint";

function JsonSchemaModal({
  params = null,
  searchParams = null,
  messages,
  setMessages,
  thread_id,
  onResetThreadId = () => {},
  schema = null,
  onSaveSchema = null,
}) {
  const dispatch = useDispatch();
  const { actualTheme } = useThemeManager();
  const { json_schema } = useCustomSelector((state) => {
    if (!params?.id || !searchParams?.version) {
      return { json_schema: null };
    }
    return {
      json_schema:
        state?.bridgeReducer?.bridgeVersionMapping?.[params?.id]?.[searchParams?.version]?.configuration?.response_type
          ?.json_schema,
    };
  });

  // Use provided schema or fall back to Redux schema
  const effectiveSchema = schema !== null ? schema : json_schema;

  // Use useMemo to always get the latest formatted JSON schema
  const jsonSchemaRequirements = useMemo(() => {
    return typeof effectiveSchema === "object" ? JSON.stringify(effectiveSchema, null, 4) : effectiveSchema || "";
  }, [effectiveSchema]);

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

      // Use custom save handler if provided, otherwise use Redux dispatch
      if (onSaveSchema) {
        onSaveSchema(parsedSchema);
      } else if (params?.id && searchParams?.version) {
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
      } else {
        toast.error("Missing required parameters for saving schema");
        return;
      }
      toast.success("Schema applied successfully");
      // Keep modal open to show the updated schema in "Current Schema" section
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
        className="modal-box max-w-screen-2xl h-[calc(100%-10rem)] w-[calc(100%-2rem)] bg-base-100 overflow-hidden flex flex-col"
      >
        <div className="flex justify-between items-center mb-2 pt-3 px-4">
          <h3 className="font-bold text-lg">Improve JSON Schema</h3>
          <button
            data-testid="json-schema-close-button"
            id="json-schema-close-button"
            onClick={handleCloseModal}
            className="btn btn-sm"
            type="button"
          >
            Close
          </button>
        </div>

        <div className="flex-1 flex gap-4 px-4 pb-4 overflow-hidden">
          {/* AI Assistant Canvas - Left Side (50%) */}
          <div className="flex-1 flex flex-col min-w-0 bg-base-200 rounded-lg overflow-hidden">
            <Canvas
              OptimizePrompt={handleOptimizeApi}
              messages={messages}
              setMessages={setMessages}
              handleApplyOptimizedPrompt={handleApply}
              label="Schema"
              width="100%"
              height="100%"
              onResetThreadId={onResetThreadId}
            />
          </div>

          {/* Current JSON Schema - Right Side (50%) */}
          <div className="flex-1 flex flex-col bg-base-200 rounded-lg overflow-hidden border border-base-300">
            <div className="px-4 py-3 border-b border-base-300 bg-base-100">
              <h4 className="font-semibold text-sm">Current Schema</h4>
            </div>
            <div className="flex-1 overflow-hidden">
              {jsonSchemaRequirements ? (
                <CodeMirror
                  value={jsonSchemaRequirements}
                  height="100%"
                  extensions={[json(), linter(jsonParseLinter()), lintGutter()]}
                  theme={actualTheme}
                  editable={false}
                  className="h-full text-sm"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-base-content/50">
                  <p className="text-sm">No schema defined</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default React.memo(JsonSchemaModal);
