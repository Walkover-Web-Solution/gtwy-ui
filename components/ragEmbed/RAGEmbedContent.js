import CopyButton from "@/components/copyButton/CopyButton";
import { useCustomSelector } from "@/customHooks/customSelector";
import { generateAccessKeyAction } from "@/store/action/orgAction";
import React from "react";
import { useDispatch } from "react-redux";

function RAGEmbedContent({ params, folderId }) {
  const dispatch = useDispatch();
  const access_key = useCustomSelector(
    (state) => state?.userDetailsReducer?.organizations?.[params.org_id]?.meta?.auth_token || ""
  );

  const handleGenerateAccessKey = () => {
    dispatch(generateAccessKeyAction(params?.org_id));
  };

  const Section = ({ title, caption, children }) => (
    <div className="flex items-start flex-col justify-center mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-base-content block">{caption}</p>
      {children}
    </div>
  );

  const renderStepOne = ({ orgId, access_key, folderId }) => {
    const apiConfig = `{
    "org_id": ${orgId},
    "user_id": "unique_user_id",
    ${folderId ? `"folder_id": "${folderId}"` : ""}
}`;

    return (
      <div className="flex w-full flex-col gap-4 bg-base-100 shadow p-8 mb-6 rounded-lg">
        <Section title="Step 1: Connect Knowledge Base" caption="Use the following API configuration and access key." />
        <div id="rag-embed-step1-api-config" className="mockup-code">
          <CopyButton data={apiConfig} />
          <pre data-prefix=">" className="text-error">
            <code>org_id=</code>
            <code className="text-warning">{orgId}</code>
          </pre>
          {folderId && (
            <pre data-prefix=">" className="text-error">
              <code>folder_id=</code>
              <code className="text-warning">"{folderId}"</code>
            </pre>
          )}
          <pre data-prefix=">" className="text-error">
            <code>user_id=</code>
            <code className="text-warning">"unique_user_id"</code>
          </pre>
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">JWT Access Key</span>
          </label>
          {access_key ? (
            <div id="rag-embed-access-key-display" className="mockup-code">
              <CopyButton data={access_key} />
              <pre data-prefix=">" className="text-error">
                <code>Access Key: </code>
                <code className="text-warning">{access_key}</code>
              </pre>
            </div>
          ) : (
            <button
              id="rag-embed-generate-access-key-button"
              onClick={handleGenerateAccessKey}
              className="btn btn-primary btn-sm w-56"
            >
              Show Access Key
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderStepTwo = () => {
    const DataObject = {
      script: `<script\n      id="rag-main-script"\n      embedToken=" <embed token here> "\n      src=${process?.env?.NEXT_PUBLIC_KNOWLEDGEBASE_SCRIPT_SRC}\n     ></script>`,
    };

    return (
      <div className="flex w-full flex-col gap-4 bg-base-100 shadow p-8 mb-6 rounded-lg">
        <Section title="Step 2" caption="Add below code in your product." />
        <div className="mockup-code">
          <CopyButton data={DataObject.script} />
          <pre data-prefix=">" className="text-error">
            <code>&lt;script </code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code className="text-error"> id= </code>
            <code className="text-warning">"rag-main-script"</code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code> embedToken=</code>
            <code className="text-warning">"Enter Embed Token here"</code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code> src=</code>
            <code className="text-warning">"{process?.env?.NEXT_PUBLIC_KNOWLEDGEBASE_SCRIPT_SRC}"</code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code> parentId=</code>
            <code className="text-warning">"Id of parent Container"</code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code> theme=</code>
            <code className="text-warning">"dark/light"</code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code> defaultOpen=</code>
            <code className="text-warning">"true/false" /* true for open list by default */</code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code>&lt;/script&gt;</code>
          </pre>
        </div>
      </div>
    );
  };

  const renderStepThree = () => {
    return (
      <div className="flex w-full flex-col gap-4 bg-base-100 shadow p-8 mb-6 rounded-lg">
        <Section title="Step 3" caption="Use this function to show list or add Document modal" />
        <div className="mockup-code">
          <pre data-prefix=">" className="text-error">
            <code className="text-warning">window.openRag() /* to open add document modal */</code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code className="text-warning">window.closeRag() /* to close add document modal */</code>
          </pre>
          <pre data-prefix=">" className="text-error">
            <code className="text-warning">window.showDocuments() /* to show document list */</code>
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="space-y-6">
        {/* Step 1 */}
        {renderStepOne({ orgId: params?.org_id, access_key, folderId })}

        {/* Step 2 */}
        {renderStepTwo()}

        {/* Step 3 */}
        {renderStepThree()}
      </div>
    </div>
  );
}

export default RAGEmbedContent;
