import { batchApi } from "@/config/index";
import { useCustomSelector } from "@/customHooks/customSelector";
import { webhookURLForBatchAPIReducer } from "@/store/reducer/bridgeReducer";
import React, { useState, useCallback, useMemo } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

const WebhookForm = ({ params, searchParams }) => {
  const { reduxWebhook } = useCustomSelector((state) => ({
    reduxWebhook: state?.bridgeReducer?.allBridgesMap?.[params?.id]?.[searchParams?.version]?.webhook,
  }));
  const dispatch = useDispatch();
  const [webhookUrl, setWebhookUrl] = useState(reduxWebhook?.url || "");
  const [headers, setHeaders] = useState(JSON.stringify(reduxWebhook?.header || {}));
  const [messages, setMessages] = useState([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [isValidJson, setIsValidJson] = useState(true);

  const handleHeadersChange = useCallback((e) => {
    const value = e.target.value;
    setHeaders(value);
    try {
      JSON.parse(value);
      setIsValidJson(true);
    } catch {
      setIsValidJson(false);
    }
  }, []);

  const handleMessagesChange = useCallback((e) => {
    const messages = e.target.value.split(",").filter((msg) => msg.trim() !== "");
    setMessages(messages);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!isValidJson) {
        toast.error("Headers must be valid JSON");
        return;
      }
      setIsSubmitting(true);

      try {
        const payload = {
          webhook: { url: webhookUrl, headers: JSON.parse(headers) },
          batch: messages,
          bridge_id: params.id,
          version_id: params.version,
        };

        const data = await batchApi({ payload });
        dispatch(webhookURLForBatchAPIReducer(payload));

        if (data?.response) {
          setResponseData(data.response);
          toast.success(data.response);
        } else {
          setResponseData(data?.error);
          toast.error(data?.error || "An error occurred");
        }
      } catch (error) {
        toast.error("Failed to send messages");
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [webhookUrl, headers, messages, isValidJson, params, dispatch]
  );

  const isFormValid = useMemo(
    () => webhookUrl && headers && messages.length > 0 && isValidJson,
    [webhookUrl, headers, messages, isValidJson]
  );

  const buttonClass = useMemo(
    () => `btn ${!isFormValid || isSubmitting ? "btn-disabled" : "btn-primary"}`,
    [isFormValid, isSubmitting]
  );

  return (
    <form id="batch-api-form" onSubmit={handleSubmit} className="space-y-6 rounded-lg h-full p-4">
      <div className="form-control mb-4">
        <label htmlFor="webhookUrl" className="label">
          <span className="label-text font-semibold">Webhook URL</span>
        </label>
        <input
          type="url"
          id="webhookUrl"
          value={webhookUrl}
          placeholder="Enter Webhook URL"
          onChange={(e) => setWebhookUrl(e.target.value)}
          required
          className="input input-bordered w-full"
        />
      </div>

      <div className="form-control mb-4">
        <label htmlFor="headers" className="label">
          <span className="label-text font-semibold">Headers (JSON)</span>
        </label>
        <textarea
          id="headers"
          value={headers}
          onChange={handleHeadersChange}
          placeholder='Example: { "Authorization": "Bearer token" }'
          className={`textarea textarea-bordered w-full ${!isValidJson ? "border-red-500" : ""}`}
          rows={4}
        />
        {!isValidJson && <span className="text-error mt-2">Invalid Header format</span>}
      </div>

      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text font-semibold">Messages</span>
        </label>
        <textarea
          id="batch-api-messages-textarea"
          onChange={handleMessagesChange}
          placeholder="Enter messages separated by commas"
          className="textarea bg-white dark:bg-black/15 textarea-bordered w-full min-h-64"
          rows={4}
        />
      </div>

      {responseData && (
        <div id="batch-api-response-container" className="form-control mb-4">
          <label className="label">
            <span className="label-text text-lg font-semibold">Response Data</span>
          </label>
          <pre className="bg-gray-100 p-2 rounded whitespace-pre-wrap">{responseData}</pre>
        </div>
      )}

      <div className="flex justify-end">
        <button
          id="batch-api-submit-button"
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className={buttonClass}
        >
          {isSubmitting ? "Sending..." : "Send Message"}
        </button>
      </div>
    </form>
  );
};

export default React.memo(WebhookForm);
