import { useCustomSelector } from "@/customHooks/customSelector";
import { updateVariables } from "@/store/reducer/variableReducer";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import Modal from "../UI/Modal";

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
    e.preventDefault(); // Prevent default form submission behavior
    // Create a new key-value pair
    if (keyValue && valueValue) {
      let updatedPairs = [
        ...variablesKeyValue,
        { key: keyValue, value: valueValue, defaultValue: "", type: "string", required: true },
      ];
      // Dispatch the update action to the store
      dispatch(updateVariables({ data: updatedPairs, bridgeId: params.id, versionId: searchParams?.version }));
      // Clear the inputs after creating
      setKeyName("");
      setKeyValue("");
      setValueValue("");
      closeModal(MODAL_TYPE.CREATE_VARIABLE); // Close the modal after creation
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
    <Modal MODAL_ID={MODAL_TYPE.CREATE_VARIABLE} onClose={handleCloseModal}>
      <div id="create-variable-modal-container" className="modal-box" key={keyName}>
        <h3 className="font-bold text-lg">Create New Variable</h3>
        {/* <form> */}
        <div className="label">
          <span className="label-text">Key</span>
        </div>
        <input
          id="create-variable-key-input"
          type="text"
          className="input input-bordered input-md w-full mb-2"
          placeholder="Enter key"
          defaultValue={keyName}
          key={keyName}
          autoFocus
          onChange={(e) => handleKeyValueChange("key", e.target.value)}
          onBlur={(e) => handleKeyValueChange("key", e.target.value)}
        />
        <div className="label">
          <span className="label-text">Value</span>
        </div>
        <input
          id="create-variable-value-input"
          defaultValue={valueValue}
          type="text"
          className="input input-bordered input-md w-full mb-2"
          placeholder="Enter value"
          onChange={(e) => handleKeyValueChange("value", e.target.value)}
          onBlur={(e) => handleKeyValueChange("value", e.target.value)}
        />
        <div className="modal-action">
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button id="create-variable-close-button" className="btn btn-sm" onClick={handleCloseModal}>
              Close
            </button>
            <button id="create-variable-create-button" className="btn btn-sm btn-primary ml-2" onClick={CreateVariable}>
              Create
            </button>
          </form>
        </div>
        {/* </form> */}
      </div>
    </Modal>
  );
}

export default React.memo(CreateVariableModal);
