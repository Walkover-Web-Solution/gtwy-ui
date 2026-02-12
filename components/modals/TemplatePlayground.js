"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";

const TemplatePlayground = ({ template, setTemplate = () => {} }) => {
  const [renderedHtml, setRenderedHtml] = useState("");

  useEffect(() => {
    if (template) {
      setRenderedHtml(template.html || "");
    }
  }, [template]);

  const handleClose = () => {
    closeModal(MODAL_TYPE.TEMPLATE_PLAYGROUND);
    setTemplate(null);
    setRenderedHtml("");
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.TEMPLATE_PLAYGROUND}>
      <div className="modal-box w-11/12 max-w-4xl border-2 border-base-300">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-base-300">
          <div className="flex items-center justify-between mb-4">
            <label className="label-text text-lg font-medium">Template Preview</label>
            <span className="text-sm text-base-content/50">How your template will look</span>
          </div>
          <button onClick={handleClose} className="btn btn-circle btn-ghost btn-sm">
            ✕
          </button>
        </div>

        {/* Template Preview Only */}
        <div className="mb-4">
          {renderedHtml ? (
            <div className="border border-base-300 rounded-lg p-6 bg-base-100">
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            </div>
          ) : (
            <div className="border border-base-300 rounded-lg p-6 bg-base-200 flex items-center justify-center min-h-[200px]">
              <div className="text-center text-base-content/60">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-lg">No preview available</p>
                <p className="text-sm">Template needs HTML content to display preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TemplatePlayground;
