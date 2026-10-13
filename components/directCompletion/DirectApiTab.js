"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, MessagesSquare, SlidersHorizontal } from "lucide-react";
import { DIRECT_COMPLETION_PATH } from "@/config/index";
import { buildDirectCurlSnippet } from "@/utils/directCompletion";

const BODY_FIELDS = [
  { name: "service", type: "string", required: true, description: "Provider, e.g. openai or anthropic" },
  { name: "configuration.model", type: "string", required: true, description: "Model to run" },
  { name: "configuration.prompt", type: "string", description: "System prompt" },
  {
    name: "configuration.*",
    type: "any",
    description: "Model parameters such as temperature; omitted ones use the model default",
  },
  { name: "user", type: "string", description: "The user message" },
  { name: "thread_id", type: "string", description: "Reuse it to keep conversation memory" },
  { name: "extra_tools", type: "array", description: "HTTP tools the model can call, as built in the Tools card" },
  { name: "apikey", type: "string", description: "Your provider key; without it the call is billed to your wallet" },
];

const Step = ({ icon: Icon, title, children }) => (
  <div className="flex gap-3">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-base-content/15 bg-base-200 text-base-content/70">
      <Icon size={13} />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-medium text-base-content">{title}</p>
      <p className="text-xs leading-relaxed text-base-content/60">{children}</p>
    </div>
  </div>
);

// Shows the playground request as a cURL snippet, with placeholders instead of real secrets.
const DirectApiTab = ({ orgId, config, hasApikey }) => {
  const [copied, setCopied] = useState(false);
  const snippet = useMemo(() => buildDirectCurlSnippet({ config, hasApikey }), [config, hasApikey]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the snippet can still be selected by hand.
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-base-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <div>
          <h2 className="text-lg font-semibold text-base-content">Call it from your code</h2>
          <p className="mt-1 max-w-2xl text-sm text-base-content/60">
            One endpoint, no agent id. Send the model, prompt, parameters and tools with each request. The snippet below
            is built from your current playground configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col border border-base-content/10 bg-base-100">
            <div className="flex items-center justify-between gap-3 border-b border-base-content/10 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2 font-mono text-xs">
                <span className="bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-content">POST</span>
                <span className="truncate text-base-content/80">{DIRECT_COMPLETION_PATH}</span>
              </div>
              <button
                type="button"
                data-testid="direct-copy-snippet-button"
                className="btn btn-ghost btn-xs gap-1"
                onClick={copySnippet}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="m-0 overflow-x-auto bg-neutral p-4 text-xs leading-relaxed text-neutral-content">
              <code>{snippet}</code>
            </pre>
          </div>

          <div className="flex flex-col gap-4 self-start border border-base-content/10 bg-base-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Get started</p>
            <Step icon={KeyRound} title="Authenticate">
              Send your{" "}
              <Link className="link" href={`/org/${orgId}/pauthkey`}>
                auth key
              </Link>{" "}
              in the <code className="font-mono">pauthkey</code> header.
            </Step>
            <Step icon={SlidersHorizontal} title="Describe the run">
              Pick the provider and model, and add a prompt, parameters and tools as needed.
            </Step>
            <Step icon={MessagesSquare} title="Keep the conversation">
              Send the same <code className="font-mono">thread_id</code> on follow-up messages. Calls show up in the
              History tab.
            </Step>
          </div>
        </div>

        <div className="border border-base-content/10 bg-base-100">
          <div className="border-b border-base-content/10 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-base-content">Request body</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-xs text-base-content/50">
                  <th className="font-medium">Field</th>
                  <th className="font-medium">Type</th>
                  <th className="font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {BODY_FIELDS.map((field) => (
                  <tr key={field.name} className="border-base-content/5">
                    <td className="whitespace-nowrap font-mono text-xs text-base-content">
                      {field.name}
                      {field.required && (
                        <span className="ml-2 border border-base-content/20 px-1 py-px font-sans text-[10px] text-base-content/60">
                          required
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-xs text-base-content/60">{field.type}</td>
                    <td className="text-xs text-base-content/70">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectApiTab;
