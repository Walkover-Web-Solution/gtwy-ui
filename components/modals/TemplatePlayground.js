"use client";
import React, { useState, useEffect } from "react";
import Modal from "@/components/UI/Modal";
import { MODAL_TYPE } from "@/utils/enums";
import { closeModal } from "@/utils/utility";
import RenderNode from "@/components/richUI/RenderNode";
import { resolveNode } from "@/utils/templateEngine";
import { Terminal } from "lucide-react";

const TemplatePlayground = ({ template, setTemplate = () => {} }) => {
  const [templateFormat, setTemplateFormat] = useState(null);
  const [actionDefs, setActionDefs] = useState({});
  useEffect(() => {
    if (!template) return;
    const raw = template.ui || null;
    const defaultJson = template.default_json || null;

    if (raw && defaultJson && typeof defaultJson === "object") {
      try {
        const resolved = resolveNode(typeof raw === "string" ? JSON.parse(raw) : raw, defaultJson);
        setTemplateFormat(resolved);
      } catch {
        setTemplateFormat(typeof raw === "string" ? JSON.parse(raw) : raw);
      }
    } else {
      setTemplateFormat(typeof raw === "string" ? JSON.parse(raw) : raw);
    }

    setActionDefs(template.action_definitions || {});
  }, [template]);

  const handleClose = () => {
    closeModal(MODAL_TYPE.TEMPLATE_PLAYGROUND);
    setTemplate(null);
    setTemplateFormat(null);
    setActionDefs({});
  };

  return (
    <Modal
      MODAL_ID={MODAL_TYPE.TEMPLATE_PLAYGROUND}
      onClose={handleClose}
      title="Template Preview"
      description="Live interactive preview of the template"
      icon={<Terminal size={16} className="text-trace-gold" />}
      widthClass="w-[min(900px,92vw)]"
    >
      <div className="flex flex-col gap-4">
        {/* Template Preview */}
        <div>
          {templateFormat ? (
            <div className="border border-base-300 p-6 bg-base-100">
              <RenderNode node={templateFormat} actionDefs={actionDefs} />
            </div>
          ) : (
            <div className="border border-base-300 p-6 bg-base-200 flex items-center justify-center min-h-[200px]">
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
