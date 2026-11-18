import { useCustomSelector } from "@/customHooks/customSelector";
import { saveApiKeysAction, updateApikeyAction } from "@/store/action/apiKeyAction";
import { updateBridgeVersionAction } from "@/store/action/bridgeAction";
import { API_KEY_MODAL_INPUT, MODAL_TYPE } from "@/utils/enums";
import { closeModal, RequiredItem, CLAUDE_CODE_SERVICE, getServiceDisplayName } from "@/utils/utility";
import { usePathname } from "next/navigation";
import React, { useCallback, useState, useEffect, useContext } from "react";
import { useDispatch } from "react-redux";
import Modal from "../UI/Modal";
import useDeleteOperation from "@/customHooks/useDeleteOperation";
import { FolderContext } from "@/components/folders/FolderContext";
import { Check, Copy, Key } from "lucide-react";
import toast from "react-hot-toast";

const CLAUDE_INSTALL_COMMAND = "npm install -g @anthropic-ai/claude-code";
const CLAUDE_TOKEN_COMMAND = "claude setup-token";
const CLAUDE_LOGIN_NAME = "Claude login";

// A terminal command with a Copy button, for the Claude login steps.
const CommandLine = ({ command, id }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div id={id} data-testid={id} className="flex items-center justify-between gap-2 bg-base-200 px-2 py-1.5">
      <code className="font-mono text-xs break-all">{command}</code>
      <button type="button" className="btn btn-ghost btn-xs gap-1 shrink-0" onClick={copy}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
};

// What was pasted into the Claude login field, so a wrong value is caught before the slow check.
// A Claude login token never has whitespace. A token copied from a terminal often picks up the
// line wrap as spaces or a newline, which the gateway then rejects, so it is removed before saving.
const cleanClaudeToken = (value) => (value || "").replace(/\s+/g, "");

const claudeTokenProblem = (value) => {
  const token = cleanClaudeToken(value);
  if (!token || token.startsWith("sk-ant-oat")) return null;
  if (token.startsWith("sk-ant-api"))
    return "This is an Anthropic API key, not a Claude login. Add it as an API key instead.";
  return "This doesn't look like a Claude login token. It starts with sk-ant-oat01-.";
};

const ApiKeyModal = ({
  params,
  searchParams,
  isEditing,
  selectedApiKey,
  setSelectedApiKey = () => {},
  setIsEditing = () => {},
  apikeyData,
  service,
  bridgeApikey_object_id,
  selectedService,
  // Called with the saved key instead of attaching it to the agent under `service`
  onSaved,
  // Switches this agent to the org's saved Claude login, with no new token
  onUseSavedLogin,
}) => {
  const pathName = usePathname();
  const folderContext = useContext(FolderContext);
  const activeFolderId = folderContext?.activeFolderId;

  const { isDeleting: isLoading, executeDelete: executeOperation } = useDeleteOperation(MODAL_TYPE.API_KEY_MODAL, {
    closeOnSuccess: false, // We'll handle modal closing manually
    onSuccess: () => {
      setSelectedApiKey(null);
      setIsEditing(false);
    },
  });
  const [ischanged, setischanged] = useState({
    isAdd: false,
    isUpdate: false,
  });
  const path = pathName?.split("?")[0].split("/");
  const orgId = path[2] || "";
  const dispatch = useDispatch();
  const { SERVICES, isOrgBlocked, hasClaudeLogin } = useCustomSelector((state) => ({
    SERVICES: state?.serviceReducer?.services,
    isOrgBlocked: state?.userDetailsReducer?.blockedOrgIds?.includes(orgId) || false,
    // The org already has a Claude login: saving one replaces it for every agent using it.
    hasClaudeLogin: (state?.apiKeysReducer?.apikeys?.[orgId] || []).some((key) => key?.service === CLAUDE_CODE_SERVICE),
  }));
  const lockedService = service || selectedService || "";
  // claude_code takes a Claude login (the token `claude setup-token` prints), not an API key.
  const [pickedService, setPickedService] = useState("");
  const isClaudeLogin = (lockedService || pickedService || selectedApiKey?.service) === CLAUDE_CODE_SERVICE;
  const [claudeToken, setClaudeToken] = useState("");
  const tokenProblem = isClaudeLogin ? claudeTokenProblem(claudeToken) : null;

  // Reset ischanged state when modal opens/closes
  useEffect(() => {
    setischanged({
      isAdd: false,
      isUpdate: false,
    });
  }, [selectedApiKey, isEditing]);

  // Handle form input changes
  const handleFormChange = useCallback(
    (event) => {
      const form = event.target.form;
      const formData = new FormData(form);
      setPickedService(formData.get("service") || "");
      setClaudeToken(formData.get("apikey") || "");

      const currentData = {
        name: formData.get("name") || "",
        apikey: formData.get("apikey") || "",
        service: lockedService || formData.get("service") || "",
        apikey_limit: formData.get("apikey_limit") || "",
        apikey_limit_reset_period: formData.get("apikey_limit_reset_period") || "",
      };
      // Check if all required fields are filled for Add mode
      const requiredFields = ["name", "apikey", "service"];
      const allRequiredFilled = requiredFields.every(
        (field) => currentData[field] && currentData[field].trim().length > 0
      );

      if (isEditing && selectedApiKey) {
        // For update mode: check if any field has changed
        const hasChanges =
          currentData.name !== (selectedApiKey.name || "") ||
          currentData.apikey !== (selectedApiKey.apikey || "") ||
          currentData.service !== lockedService ||
          (currentData.apikey_limit !== "" &&
            Number(currentData.apikey_limit) !== Number(selectedApiKey.apikey_limit || 0)) ||
          currentData.apikey_limit_reset_period !== (selectedApiKey.apikey_limit_reset_period || "");

        setischanged((prev) => ({
          ...prev,
          isUpdate: hasChanges,
        }));
      } else {
        // For add mode: check if all required fields are filled
        setischanged((prev) => ({
          ...prev,
          isAdd: allRequiredFilled,
        }));
      }
    },
    [isEditing, selectedApiKey, lockedService]
  );

  const handleClose = useCallback(() => {
    setClaudeToken("");
    setSelectedApiKey(null);
    setIsEditing(false);
    closeModal(MODAL_TYPE.API_KEY_MODAL);
  }, [setSelectedApiKey, setIsEditing]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (isOrgBlocked) {
        toast.error(
          "Your org is blocked. You cannot create or update API keys. Contact support@gtwy.ai for assistance."
        );
        return;
      }

      const formData = new FormData(event.target);
      const data = {
        name: formData.get("name"),
        service: lockedService || formData.get("service"),
        apikey: isClaudeLogin ? cleanClaudeToken(formData.get("apikey")) : formData.get("apikey"),
        apikey_limit: Number(formData.get("apikey_limit")) || 0,
        apikey_limit_reset_period: formData.get("apikey_limit_reset_period") || "",
        apikey_usage: selectedApiKey ? selectedApiKey.apikey_usage : 0,
        _id: selectedApiKey ? selectedApiKey._id : null,
      };

      await executeOperation(async () => {
        if (isEditing) {
          const isIdChange = apikeyData.some((item) => item.apikey === data.apikey && item._id === data._id);
          const isNameChange = apikeyData.some((item) => item.name === data.name && item._id === data._id);
          const apikeyLimitChange = apikeyData.some(
            (item) => item.apikey_limit === data.apikey_limit && item._id === data._id
          );
          const apikeyResetPeriodChange = apikeyData.some(
            (item) =>
              (item.apikey_limit_reset_period || "") === (data.apikey_limit_reset_period || "") && item._id === data._id
          );

          if (!isIdChange) {
            const dataToSend = {
              org_id: orgId,
              apikey_object_id: data._id,
              name: data.name,
              apikey: data.apikey,
              service: selectedService,
              apikey_limit: data.apikey_limit,
              apikey_limit_reset_period: data.apikey_limit_reset_period,
              apikey_usage: data.apikey_usage,
            };
            await dispatch(updateApikeyAction(dataToSend));
          }
          if (!isNameChange || !apikeyLimitChange || !apikeyResetPeriodChange) {
            const dataToSend = {
              org_id: orgId,
              apikey_object_id: data._id,
              name: data.name,
              service: selectedService,
              apikey_limit: data.apikey_limit,
              apikey_limit_reset_period: data.apikey_limit_reset_period,
              apikey_usage: data.apikey_usage,
            };
            await dispatch(updateApikeyAction(dataToSend));
          }
        } else {
          const dataToSend = {
            name: data.name,
            service: data.service,
            apikey: data.apikey,
            apikey_limit: data.apikey_limit,
            apikey_limit_reset_period: data.apikey_limit_reset_period,
            ...(activeFolderId && activeFolderId !== "uncategorized" ? { folder_id: activeFolderId } : {}),
          };
          const response = await dispatch(saveApiKeysAction(dataToSend, orgId));
          if (onSaved && response?._id) {
            await onSaved(response);
          } else if (service && response?._id) {
            const updated = { ...bridgeApikey_object_id, [service]: response._id };
            await dispatch(
              updateBridgeVersionAction({
                bridgeId: params?.id,
                versionId: searchParams?.version,
                dataToSend: { apikey_object_id: updated },
              })
            );
          }
        }

        event.target.reset();
        setClaudeToken("");
        closeModal(MODAL_TYPE.API_KEY_MODAL);
      });
    },
    [
      isEditing,
      selectedApiKey,
      lockedService,
      apikeyData,
      orgId,
      dispatch,
      params,
      searchParams,
      bridgeApikey_object_id,
      selectedService,
      executeOperation,
      activeFolderId,
      isOrgBlocked,
      onSaved,
      isClaudeLogin,
    ]
  );

  const footerContent = (
    <div id="apikey-modal-actions" className="flex gap-2 justify-end">
      <button
        data-testid="apikey-modal-cancel-button"
        id="apikey-modal-cancel-button"
        type="reset"
        form="apikey-modal-form"
        className="btn btn-sm"
        onClick={handleClose}
      >
        Cancel
      </button>
      <button
        data-testid="apikey-modal-submit-button"
        id="apikey-modal-submit-button"
        type="submit"
        form="apikey-modal-form"
        className={`btn btn-sm btn-primary ${
          isLoading ||
          isOrgBlocked ||
          tokenProblem ||
          (isEditing && !ischanged.isUpdate) ||
          (!isEditing && !ischanged.isAdd)
            ? "btn-disabled"
            : ""
        }`}
        disabled={
          isLoading ||
          isOrgBlocked ||
          Boolean(tokenProblem) ||
          (isEditing && !ischanged.isUpdate) ||
          (!isEditing && !ischanged.isAdd)
        }
        title={isOrgBlocked ? "Your org is blocked. Contact support@gtwy.ai for assistance." : undefined}
      >
        {isClaudeLogin
          ? isLoading
            ? "Checking the login…"
            : hasClaudeLogin
              ? "Replace"
              : "Connect"
          : isLoading
            ? "Saving..."
            : isEditing
              ? "Update"
              : "Add"}
      </button>
    </div>
  );

  return (
    <Modal
      MODAL_ID={MODAL_TYPE?.API_KEY_MODAL}
      onClose={handleClose}
      title={
        isClaudeLogin
          ? hasClaudeLogin
            ? "Replace Claude login"
            : "Connect Claude"
          : isEditing
            ? "Update API Key"
            : "Add New API Key"
      }
      icon={<Key size={16} className="text-trace-gold" />}
      widthClass="w-[min(480px,92vw)]"
      footer={footerContent}
    >
      <form id="apikey-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isClaudeLogin && (
          <div
            id="apikey-modal-claude-login-help"
            data-testid="apikey-modal-claude-login-help"
            className="text-sm border border-base-300 p-3 flex flex-col gap-3"
          >
            {hasClaudeLogin ? (
              <>
                <p>
                  Your organization is already connected to Claude. A new token replaces it for every agent set to
                  Claude login, so do this when the login has expired or should move to another Claude account.
                </p>
                {onUseSavedLogin && (
                  <div className="flex items-center justify-between gap-2 bg-base-200 px-2 py-2">
                    <span>This agent isn&apos;t using it yet.</span>
                    <button
                      type="button"
                      id="apikey-modal-use-saved-claude-login"
                      data-testid="apikey-modal-use-saved-claude-login"
                      className="btn btn-primary btn-xs"
                      onClick={() => {
                        onUseSavedLogin();
                        handleClose();
                      }}
                    >
                      Use the saved login
                    </button>
                  </div>
                )}
                <p className="opacity-70">Or replace it with a new token:</p>
              </>
            ) : (
              <p>
                Use your Claude subscription instead of an API key. The login belongs to your organization, not to one
                agent: connect it once and every Anthropic agent set to Claude login uses it.
              </p>
            )}
            <ol className="flex flex-col gap-3 list-none">
              <li className="flex flex-col gap-1">
                <span>
                  <strong>1. Open a terminal</strong> on your computer: Terminal on Mac, PowerShell on Windows.
                </span>
              </li>
              <li className="flex flex-col gap-1">
                <span>
                  <strong>2. Install Claude Code.</strong> Skip this if the <code className="font-mono">claude</code>{" "}
                  command already works. It needs Node.js 18 or newer.
                </span>
                <CommandLine id="apikey-modal-claude-install-command" command={CLAUDE_INSTALL_COMMAND} />
              </li>
              <li className="flex flex-col gap-1">
                <span>
                  <strong>3. Create a token.</strong> A browser window opens: sign in to Claude and approve.
                </span>
                <CommandLine id="apikey-modal-claude-token-command" command={CLAUDE_TOKEN_COMMAND} />
              </li>
              <li className="flex flex-col gap-1">
                <span>
                  <strong>4. Paste the token below.</strong> Back in the terminal, copy the long line that starts with{" "}
                  <code className="font-mono">sk-ant-oat01-</code>.
                </span>
              </li>
            </ol>
            <p className="opacity-70">
              The token lasts one year. Saving a new one replaces the old one for the whole organization.
            </p>
          </div>
        )}
        {API_KEY_MODAL_INPUT.filter((field) => field !== "apikey_limit").map((field) => {
          const displayLabel = field.includes("_")
            ? field
                .replace(/_/g, " ")
                .replace(/^\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
            : field.charAt(0).toUpperCase() + field.slice(1);
          const isRequired = field !== "apikey_limit";
          // A Claude login needs only the token; it is always named "Claude login".
          if (isClaudeLogin && field === "name") {
            return (
              <input key={field} type="hidden" name="name" value={selectedApiKey?.name || CLAUDE_LOGIN_NAME} readOnly />
            );
          }
          return (
            <div id={`apikey-modal-field-${field}`} key={field} className="flex flex-col gap-2">
              <label className="label">
                {field === "apikey" && isClaudeLogin ? "Token" : displayLabel}
                {isRequired && RequiredItem()} <span className="opacity-55">{field === "apikey_limit" && "in $"}</span>
              </label>
              <input
                autoComplete="off"
                data-testid={`apikey-modal-field-${field}-input`}
                id={field}
                required={isRequired}
                type={
                  (field === "apikey" && isEditing && "password") || (field === "apikey_limit" && "number") || "text"
                }
                className="input input-sm"
                name={field}
                key={field}
                placeholder={field === "apikey" && isClaudeLogin ? "sk-ant-oat01-…" : `Enter ${displayLabel}`}
                defaultValue={
                  field === "apikey_limit"
                    ? selectedApiKey
                      ? selectedApiKey.apikey_limit
                      : ""
                    : selectedApiKey
                      ? selectedApiKey[field]
                      : ""
                }
                onChange={handleFormChange}
                {...(field !== "apikey" && { maxLength: 50 })}
                {...(field === "apikey_limit" && { step: "0.00001", inputMode: "decimal", min: "0" })}
              />
              {field === "apikey" && tokenProblem && (
                <span id="apikey-modal-claude-token-problem" className="text-xs text-error">
                  {tokenProblem}
                </span>
              )}
            </div>
          );
        })}

        {/* A Claude subscription has no dollar spend to cap, so a login has no limit fields. */}
        {!isClaudeLogin &&
          API_KEY_MODAL_INPUT.filter((field) => field === "apikey_limit").map((field) => {
            const displayLabel = field.includes("_")
              ? field
                  .replace(/_/g, " ")
                  .replace(/^\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
              : field.charAt(0).toUpperCase() + field.slice(1);
            return (
              <div id={`apikey-modal-field-${field}`} key={field} className="flex flex-col gap-2">
                <label className="label">
                  {displayLabel} <span className="opacity-55">in $</span>
                </label>
                <input
                  autoComplete="off"
                  data-testid={`apikey-modal-field-${field}-input`}
                  id={field}
                  type="number"
                  className="input input-sm"
                  name={field}
                  placeholder={`Enter ${displayLabel}`}
                  defaultValue={selectedApiKey ? selectedApiKey.apikey_limit : ""}
                  onChange={handleFormChange}
                  step="0.00001"
                  inputMode="decimal"
                  min="0"
                />
              </div>
            );
          })}
        <div id="apikey-modal-reset-period-field" className={`flex-col gap-2 ${isClaudeLogin ? "hidden" : "flex"}`}>
          <label htmlFor="apikey_limit_reset_period" className="label">
            Limit Reset Period
          </label>
          <select
            data-testid="apikey-modal-reset-period-select"
            id="apikey_limit_reset_period"
            name="apikey_limit_reset_period"
            className="select select-sm"
            defaultValue={selectedApiKey?.apikey_limit_reset_period || "monthly"}
            onChange={handleFormChange}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div
          id="apikey-modal-service-field"
          className={`flex-col gap-2 ${isClaudeLogin && lockedService ? "hidden" : "flex"}`}
        >
          <label htmlFor="service" className="label">
            Service{RequiredItem()}
          </label>
          <select
            data-testid="apikey-modal-service-select"
            id="service"
            name="service"
            className="select select-sm"
            key={lockedService || "service-select"}
            defaultValue={lockedService || ""}
            disabled={Boolean(lockedService)}
            onChange={handleFormChange}
            required
          >
            {Array.isArray(SERVICES)
              ? SERVICES.map(({ value }) => (
                  <option key={value} value={value}>
                    {getServiceDisplayName(value, SERVICES)}
                  </option>
                ))
              : null}
          </select>
        </div>
      </form>
    </Modal>
  );
};

export default ApiKeyModal;
