import { useCustomSelector } from "@/customHooks/customSelector";
import { updateVariables } from "@/store/reducer/variableReducer";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import Modal from "../UI/Modal";
import { Variable } from "lucide-react";

function CreateVariableModal({ keyName, setKeyName, params, searchParams }) {
  const dispatch = useDispatch();
  const { variablesKeyValue } = useCustomSelector((state) => {
    const versionState = state?.variableReducer?.VariableMapping?.[params?.id]?.[searchParams?.version] || {};
    return {
      variablesKeyValue: versionState?.variables || [],
    };
  });

  const [keyValue, setKeyValue] = useState(keyName);
  const [valueValue, setValueValue] = useState("");

  const handleKeyValueChange = (field, value) => {
    if (field === "key") {
      setKeyValue(value);
    } else if (field === "value") {
      setValueValue(value);
    }
  };

  const CreateVariable = (e) => {
    e.preventDefault();
    if (keyValue && valueValue) {
      let updatedPairs = [
        ...variablesKeyValue,
        { key: keyValue, value: valueValue, defaultValue: "", type: "string", required: true },
      ];
      dispatch(updateVariables({ data: updatedPairs, bridgeId: params.id, versionId: searchParams?.version }));
      setKeyName("");
      setKeyValue("");
      setValueValue("");
      closeModal(MODAL_TYPE.CREATE_VARIABLE);
    }
  };

  const handleCloseModal = (e) => {
    e.preventDefault();
    setKeyName("");
    setKeyValue("");
    setValueValue("");
    closeModal(MODAL_TYPE.CREATE_VARIABLE);
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.CREATE_VARIABLE}
      onClose={handleCloseModal}
      title="Create New Variable"
      description="Define a new key-value variable for this version"
      icon={<Variable size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
    >
      <div id="create-variable-modal-container" className="flex flex-col gap-4" key={keyName}>
        <div className="flex flex-col gap-1">
          <label className="label text-sm font-medium">Key</label>
          <input
            autoComplete="off"
            data-testid="create-variable-key-input"
            id="create-variable-key-input"
            type="text"
            className="input input-md w-full"
            placeholder="Enter key"
            defaultValue={keyName}
            key={keyName}
            autoFocus
            onChange={(e) => handleKeyValueChange("key", e.target.value)}
            onBlur={(e) => handleKeyValueChange("key", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="label text-sm font-medium">Value</label>
          <input
            autoComplete="off"
            data-testid="create-variable-value-input"
            id="create-variable-value-input"
            defaultValue={valueValue}
            type="text"
            className="input input-md w-full"
            placeholder="Enter value"
            onChange={(e) => handleKeyValueChange("value", e.target.value)}
            onBlur={(e) => handleKeyValueChange("value", e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            data-testid="create-variable-close-button"
            id="create-variable-close-button"
            className="btn btn-sm"
            onClick={handleCloseModal}
          >
            Close
          </button>
          <button
            data-testid="create-variable-create-button"
            id="create-variable-create-button"
            className="btn btn-sm btn-primary"
            onClick={CreateVariable}
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default React.memo(CreateVariableModal);
