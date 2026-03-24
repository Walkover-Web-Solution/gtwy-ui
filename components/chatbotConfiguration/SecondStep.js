import React from "react";
import CopyButton from "../copyButton/CopyButton";
import GenericTable from "../table/Table";
import { extractPromptVariables } from "@/utils/utility";

const generateDataObject = (slugName) => ({
  script: `<script
      id="chatbot-main-script"
      embedToken="<embed token here>"
      bridgeName="${slugName}"
      threadId="<thread_id>"
      src="${process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_SRC || "https://chatbot-embed.viasocket.com/chatbot-prod.js"}"
    ></script>`,
  event: `window.addEventListener('message', (event) => {
        const receivedData = event.data;
     });`,
  sendData: `window.Chatbot.sendData({ 
      bridgeName: '${slugName}',
      threadId: '<thread_id>',
      subthreadId: '<subthread_id>',
      parentId: '<parent_container_id>',
      fullScreen: 'true/false',
      hideCloseButton: 'true/false',
      hideIcon: 'true/false',
      variables: {}
    });`,
  openChatbot: `window.Chatbot.open();`,
  closeChatbot: `window.Chatbot.close();`,
  showIcon: `window.Chatbot.show();`,
  hideIcon: `window.Chatbot.hide();`,
  reloadChats: `window.Chatbot.reloadChats();`,
  askAi: `window.Chatbot.askAi(data);`,
});
const headers = ["Parameter", "Type", "Description", "Required"];
const data = [
  ["bridgeName", "string", "The slug name of the agent.", "true"],
  ["threadId", "string", "The ID corresponding to the chat store.", "true"],
  ["parentId", "string", "The parent container ID in which you want to open chatbot.", "false"],
  ["fullScreen", "boolean", "Whether to open the chatbot in full screen.", "false"],
  ["hideCloseButton", "boolean", "Whether to hide the close button.", "false"],
  ["hideIcon", "boolean", "Whether to hide the chatbot icon.", "false"],
  ["variables", "object", "Additional variables for the chatbot.", "false"],
  ["onOpen", "function", "Callback function triggered when chatbot opens.", "false"],
  ["onClose", "function", "Callback function triggered when chatbot closes.", "false"],
  ["iconColor", "string", "Color of the chatbot icon.", "false"],
  ["chatTitle", "string", "Title displayed in the chat header.", "false"],
  ["chatIcon", "string", "Icon displayed in the chat header.", "false"],
  ["hideFullScreenButton", "boolean", "Whether to hide the full screen button.", "false"],
  ["defaultOpen", "boolean", "Whether the chatbot should be open by default.", "false"],
];

const CodeBlock = ({ label, code }) => (
  <div className="mockup-code">
    <CopyButton data={code} />
    <pre data-prefix=">" className="">
      <code>{code}</code>
    </pre>
  </div>
);

const Section = ({ title, caption, children }) => (
  <div className="flex items-start flex-col justify-center">
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-sm text-gray-600 block">{caption}</p>
    {children}
  </div>
);

const SecondStep = ({ slugName, prompt = "" }) => {
  const DataObject = generateDataObject(slugName);

  // Generate dynamic sendData code with variables from prompt
  const generateSendDataCode = (prompt, slugName) => {
    const usedVariables = extractPromptVariables(prompt);

    const variablesObject =
      usedVariables.length > 0
        ? usedVariables.map((variable) => `        "${variable}": "YOUR_${variable.toUpperCase()}_VALUE"`).join(",\n")
        : "        // No variables found in prompt";

    return `window.Chatbot.sendData({ 
      bridgeName: '${slugName}',
      threadId: '<thread_id>',
      subthreadId: '<subthread_id>',
      parentId: '<parent_container_id>',
      fullScreen: 'true/false',
      hideCloseButton: 'true/false',
      hideIcon: 'true/false',
      variables: {
${variablesObject}
      }
    });`;
  };

  const methods = [
    { label: "1. Use This method to send data when needed", code: generateSendDataCode(prompt, slugName) },
    { label: "2. Use this method to open chatbot explicitly", code: DataObject.openChatbot },
    { label: "3. Use this method to close chatbot explicitly", code: DataObject.closeChatbot },
    { label: "4. Use this method to show chatbot icon explicitly", code: DataObject.showIcon },
    { label: "5. Use this method to hide chatbot icon explicitly", code: DataObject.hideIcon },
    { label: "6. Use this method to reload chatbot explicitly", code: DataObject.reloadChats },
    { label: "7. Use this method to ask ai explicitly", code: DataObject.askAi },
  ];

  return (
    <div data-testid="second-step-container" id="second-step-container" className="flex w-full flex-col gap-4 p-4">
      <Section title="Step 2" caption="Add below code in your product." />
      <div data-testid="second-step-main-script-code" id="second-step-main-script-code" className="mockup-code">
        <CopyButton data={DataObject.script} />
        <pre data-prefix=">" className="text-error">
          <code>&lt;script </code>
        </pre>
        <pre data-prefix=">" className="text-error">
          <code className="text-error"> id= </code>
          <code className="text-warning">"chatbot-main-script"</code>
        </pre>
        <pre data-prefix=">" className="text-error">
          <code> embedToken=</code>
          <code className="text-warning">"Enter Embed Token here"</code>
        </pre>
        <pre data-prefix=">" className="text-error">
          <code> src=</code>
          <code className="text-warning">"{process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_SRC}"</code>
          <code className="text-error">&gt;</code>
        </pre>
        <pre data-prefix=">" className="text-error">
          <code> threadId=</code>
          <code className="text-warning">"Enter Thread ID here"</code>
        </pre>
        <pre data-prefix=">" className="text-error">
          <code> bridgeName=</code>
          <code className="text-warning"> "{slugName}"</code>
        </pre>
        <pre data-prefix=">" className="text-error">
          <code>&lt;/script&gt;</code>
        </pre>
      </div>

      <Section title="Usage" caption="Use this methods to receive data." />
      <CodeBlock code={DataObject.event} />

      <Section title="Available functions" caption="Use this methods to interact with chatbot" />
      {methods?.map((method, index) => (
        <div data-testid={`second-step-method-${index}`} id={`second-step-method-${index}`} key={index}>
          <small>{method.label}</small>
          <CodeBlock code={method.code} />
          {index == 0 && (
            <div className=" my-5">
              <small>Variables, you can pass to the chatbot using SendDataToChatbot method.</small>
              <GenericTable headers={headers} data={data} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SecondStep;
