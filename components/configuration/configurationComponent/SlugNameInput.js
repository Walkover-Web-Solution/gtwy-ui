import { useCustomSelector } from "@/customHooks/customSelector";
import { updateBridgeAction } from "@/store/action/bridgeAction";
import React from "react";
import { useDispatch } from "react-redux";

const SlugNameInput = ({ params }) => {
  const { slugName } = useCustomSelector((state) => ({
    slugName: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.slugName,
  }));

  const dispatch = useDispatch();
  const handleSlugNameChange = (e) => {
    let newValue = e.target.value;
    if (newValue !== slugName) {
      dispatch(updateBridgeAction({ bridgeId: params.id, dataToSend: { slugName: newValue } }));
    }
  };

  return (
    <label id="slug-name-input-container" className="form-control max-w-xs">
      <div className="label">
        <span className="label-text font-medium">Enter Slugname</span>
      </div>
      <input
        id="slug-name-input"
        type="text"
        key={slugName}
        maxLength={30}
        placeholder="Type here"
        className="input input-bordered w-full max-w-xs input-sm"
        defaultValue={slugName}
        onBlur={handleSlugNameChange}
      />
      <div className="label">
        <span className="label-text-alt text-gray-500">Slugname must be unique</span>
      </div>
    </label>
  );
};

export default SlugNameInput;
