"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import RenderNode from "@/components/richUI/RenderNode";
import { resolveNode } from "@/utils/templateEngine";

const TemplatePlayground = ({ template, setTemplate = () => {} }) => {
  const [templateFormat, setTemplateFormat] = useState(null);
  const [actionDefs, setActionDefs] = useState({});
  useEffect(() => {
    if (!template) return;
    const raw = template.ui || null;
    const defaultJson = template.default_json || null;

    if (raw && defaultJson && typeof defaultJson === "object") {
      try {
        // Resolve all {{placeholders}} using default_json as the scope
        const resolved = resolveNode(typeof raw === "string" ? JSON.parse(raw) : raw, defaultJson);
        setTemplateFormat(resolved);
      } catch {
        // Fall back to unresolved template
        setTemplateFormat(typeof raw === "string" ? JSON.parse(raw) : raw);
      }
    } else {
      setTemplateFormat(typeof raw === "string" ? JSON.parse(raw) : raw);
    }

    // Wire up action_definitions for interactive button testing
    setActionDefs(template.action_definitions || {});
  }, [template]);

  const handleClose = () => {
    closeModal(MODAL_TYPE.TEMPLATE_PLAYGROUND);
    setTemplate(null);
    setTemplateFormat(null);
    setActionDefs({});
  };

  return (
    <Modal MODAL_ID={MODAL_TYPE.TEMPLATE_PLAYGROUND}>
      <div className="modal-box w-11/12 max-w-4xl border-2 border-base-300">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-base-300">
          <label className="label-text text-lg font-medium">Template Preview</label>
          <button onClick={handleClose} className="btn btn-circle btn-ghost btn-sm">
            ✕
          </button>
        </div>

        {/* Template Preview */}
        <div className="mb-4">
          {templateFormat ? (
            <div className="border border-base-300 rounded-lg p-6 bg-base-100">
              <RenderNode node={templateFormat} actionDefs={actionDefs} />
            </div>
          ) : (
            <div className="border border-base-300 rounded-lg p-6 bg-base-200 flex items-center justify-center min-h-[200px]">
              <div className="text-center text-base-content/60">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-lg">No preview available</p>
                <p className="text-sm">Template needs a template_format or ui to display preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TemplatePlayground;
