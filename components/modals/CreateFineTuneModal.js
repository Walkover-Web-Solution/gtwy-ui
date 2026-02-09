import { downloadFineTuneData } from "@/config/index";
import { CircleMinusIcon, CirclePlusIcon, GlobeIcon } from "@/components/Icons";
import React from "react";
import Modal from "../UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";

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

      // Create a link element
      const link = document.createElement("a");
      if (link.download !== undefined) {
        // Set the href and download attributes for the link
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "data.jsonl");
        link.style.visibility = "hidden";

        // Append the link to the body
        document.body.appendChild(link);

        // Programmatically click the link to trigger the download
        link.click();

        // Clean up and remove the link
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
    <Modal MODAL_ID={MODAL_TYPE.FINE_TUNE_MODAL} onClose={handleClose}>
      <div id="fine-tune-modal-container" className="modal-box">
        <h3 className="font-bold text-lg">Choose Response Category</h3>
        <p className="py-2 text-sm mb-2">Select the category on the basis of user feedback</p>
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text flex items-center gap-2">
              <GlobeIcon size={16} color="skyblue" />
              All Responses &#40; including no feedback &#41;
            </span>
            <input
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
            <span className="label-text flex items-center gap-2">
              <CirclePlusIcon size={16} color="green" />
              Positive Feedback Responses
            </span>
            <input
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
            <span className="label-text flex items-center gap-2">
              <CircleMinusIcon size={16} color="red" />
              Negative Feedback Responses
            </span>
            <input
              id="fine-tune-negative-feedback-checkbox"
              type="checkbox"
              className="checkbox"
              onChange={(e) => handleStatusChange(e, 2)}
              checked={status?.includes(0) || status?.includes(2)}
              disabled={status?.includes(0)}
            />
          </label>
        </div>

        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
        <div className="modal-action">
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button id="fine-tune-close-button" className="btn mr-2">
              Close
            </button>
            <button
              id="fine-tune-download-button"
              className="btn btn-primary"
              onClick={handleDownloadFineTuneData}
              disabled={status?.length === 0}
            >
              Download
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default CreateFineTuneModal;
