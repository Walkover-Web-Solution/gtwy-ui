import CodeBlock from "@/components/codeBlock/CodeBlock";
import { useCustomSelector } from "@/customHooks/customSelector";
import { generateAccessKeyAction } from "@/store/action/orgAction";
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";

function RAGEmbedContent({ params, folderId, embedToken }) {
  const dispatch = useDispatch();
  const access_key = useCustomSelector(
    (state) => state?.userDetailsReducer?.organizations?.[params.org_id]?.meta?.auth_token || ""
  );

  useEffect(() => {
    if (!access_key && params?.org_id) {
      dispatch(generateAccessKeyAction(params.org_id));
    }
  }, [access_key, params?.org_id, dispatch]);

  const Section = ({ title, caption, children }) => (
    <div className="flex items-start flex-col justify-center mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-base-content block">{caption}</p>
      {children}
    </div>
  );

  const renderStepOne = ({ orgId, access_key, folderId }) => {
    const apiConfig = `{
  "org_id": "${orgId}",
  "user_id": "unique_user_id"${folderId ? `,\n  "folder_id": "${folderId}"` : ""}
}`;

    return (
      <div className="flex w-full flex-col gap-4 bg-base-100 shadow p-8 mb-6 rounded-lg">
        <Section title="Step 1: Connect Knowledge Base" caption="Use the following API configuration and access key." />
        <CodeBlock className="language-json">{apiConfig}</CodeBlock>
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">JWT Access Key</span>
          </label>
          <CodeBlock className="language-text">{access_key || "Generating..."}</CodeBlock>
        </div>
      </div>
    );
  };

  const renderStepTwo = () => {
    const DataObject = {
      script: `<script\n      id="rag-main-script"\n      embedToken="Add your embed token here"\n      src="${process?.env?.NEXT_PUBLIC_KNOWLEDGEBASE_SCRIPT_SRC}"\n      parentId="Id of parent Container"\n      theme="dark/light"\n      defaultOpen="true/false"\n></script>`,
    };

    return (
      <div className="flex w-full flex-col gap-4 bg-base-100 shadow p-8 mb-6 rounded-lg">
        <Section title="Step 2" caption="Add below code in your product." />
        <CodeBlock className="language-jsx" fromIntegration={true}>
          {DataObject.script}
        </CodeBlock>
      </div>
    );
  };

  const renderStepThree = () => {
    const ragFunctions = `window.openRag() /* to open add document modal */
window.closeRag() /* to close add document modal */
window.showDocuments() /* to show document list */`;

    return (
      <div className="flex w-full flex-col gap-4 bg-base-100 shadow p-8 mb-6 rounded-lg">
        <Section title="Step 3" caption="Use this function to show list or add Document modal" />
        <CodeBlock className="language-javascript">{ragFunctions}</CodeBlock>
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
