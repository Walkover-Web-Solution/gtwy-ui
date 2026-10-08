import { downloadFineTuneData } from "@/config/index";
import { CircleMinusIcon, CirclePlusIcon, GlobeIcon } from "@/components/Icons";
import React from "react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { Cpu } from "lucide-react";
import { closeModal } from "@/utils/utility";

function CreateFineTuneModal({ params, selectedThreadIds }) {
  const [status, setStatus] = React.useState([0]);

  const handleStatusChange = (e, newStatus) => {
    if (e.target.checked) {
      if (newStatus === 0) {
        setStatus([0]);
      } else {
        setStatus([...status, newStatus]);
      }
    } else {
      setStatus(status.filter((s) => s !== newStatus));
    }
  };

  const handleDownloadFineTuneData = async () => {
    try {
      const response = await downloadFineTuneData(params.id, selectedThreadIds, status);

      const blob = new Blob([typeof response == "object" ? JSON.stringify(response) : response], {
        type: "application/jsonl;charset=utf-8;",
      });

      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "data.jsonl");
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      setStatus([0]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleClose = () => {
    setStatus([0]);
    closeModal(MODAL_TYPE.FINE_TUNE_MODAL);
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.FINE_TUNE_MODAL}
      onClose={handleClose}
      title="Choose Response Category"
      description="Select the category on the basis of user feedback"
      icon={<Cpu size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
    >
      <div id="fine-tune-modal-container" className="flex flex-col gap-4">
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="flex items-center gap-2">
              <GlobeIcon size={16} color="skyblue" />
              All Responses &#40; including no feedback &#41;
            </span>
            <input
              autoComplete="off"
              data-testid="fine-tune-all-responses-checkbox"
              id="fine-tune-all-responses-checkbox"
              type="checkbox"
              className="checkbox"
              onChange={(e) => handleStatusChange(e, 0)}
              checked={status?.includes(0)}
            />
          </label>
        </div>
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="flex items-center gap-2">
              <CirclePlusIcon size={16} color="green" />
              Positive Feedback Responses
            </span>
            <input
              autoComplete="off"
              data-testid="fine-tune-positive-feedback-checkbox"
              id="fine-tune-positive-feedback-checkbox"
              type="checkbox"
              className="checkbox"
              onChange={(e) => handleStatusChange(e, 1)}
              checked={status?.includes(0) || status?.includes(1)}
              disabled={status?.includes(0)}
            />
          </label>
        </div>
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="flex items-center gap-2">
              <CircleMinusIcon size={16} color="red" />
              Negative Feedback Responses
            </span>
            <input
              autoComplete="off"
              data-testid="fine-tune-negative-feedback-checkbox"
              id="fine-tune-negative-feedback-checkbox"
              type="checkbox"
              className="checkbox"
              onChange={(e) => handleStatusChange(e, 2)}
              checked={status?.includes(0) || status?.includes(2)}
              disabled={status?.includes(0)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-base-content/10">
          <button
            data-testid="fine-tune-close-button"
            id="fine-tune-close-button"
            className="btn btn-sm"
            onClick={handleClose}
          >
            Close
          </button>
          <button
            data-testid="fine-tune-download-button"
            id="fine-tune-download-button"
            className="btn btn-sm btn-primary"
            onClick={handleDownloadFineTuneData}
            disabled={status?.length === 0}
          >
            Download
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default CreateFineTuneModal;
