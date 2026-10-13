"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, Bot, Check, Copy, MessageSquarePlus, Sparkles } from "lucide-react";
import ReactMarkdown from "@/components/LazyMarkdown";

const STARTER_PROMPTS = [
  "Introduce yourself in two sentences.",
  "Summarize the benefits of unit testing as a bullet list.",
  "Write a short welcome email for a new customer.",
];
const MAX_INPUT_HEIGHT = 200;

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing useful to show.
    }
  };
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-base-content/45 hover:text-base-content"
      onClick={copy}
      aria-label="Copy reply"
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
};

const AssistantAvatar = ({ error }) => (
  <span
    className={`flex h-7 w-7 shrink-0 items-center justify-center border ${
      error ? "border-error/40 bg-error/10 text-error" : "border-base-content/15 bg-base-200 text-base-content/70"
    }`}
  >
    {error ? <AlertTriangle size={13} /> : <Bot size={14} />}
  </span>
);

const ChatMessage = ({ message }) => {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap border border-base-content/10 bg-base-200 px-3.5 py-2.5 text-sm text-base-content">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex gap-3">
        <AssistantAvatar error />
        <div className="min-w-0 max-w-[85%] border-l-2 border-error bg-error/5 px-3.5 py-2.5">
          <p className="text-xs font-semibold text-error">Request failed</p>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-base-content/80">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <AssistantAvatar />
      <div className="min-w-0 max-w-[85%] flex-1">
        <div className="prose prose-sm max-w-none text-base-content prose-p:my-1.5 prose-ul:my-1.5 prose-pre:my-2">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-base-content/45">
          {message.meta && <span className="tabular-nums">{message.meta}</span>}
          <CopyButton text={message.content} />
        </div>
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex items-center gap-3">
    <AssistantAvatar />
    <div className="flex items-center gap-1" aria-label="Waiting for reply">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce bg-base-content/40"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  </div>
);

const EmptyState = ({ modelLabel, onPick }) => (
  <div className="m-auto flex w-full max-w-md flex-col items-center px-4 text-center">
    <span className="flex h-11 w-11 items-center justify-center border border-base-content/15 bg-base-200">
      <Sparkles size={18} className="text-base-content/70" />
    </span>
    <h2 className="mt-4 text-base font-semibold text-base-content">Test your configuration</h2>
    <p className="mt-1 text-sm text-base-content/60">
      {modelLabel ? (
        <>
          Messages run on <span className="font-medium text-base-content/80">{modelLabel}</span> with the prompt, tools
          and parameters on the left.
        </>
      ) : (
        "Pick a model on the left to get started."
      )}
    </p>
    <div className="mt-5 flex w-full flex-col gap-2">
      {STARTER_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className="border border-base-content/10 px-3 py-2 text-left text-sm text-base-content/75 transition-colors hover:border-base-content/30 hover:bg-base-200 hover:text-base-content"
          onClick={() => onPick(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  </div>
);

// View for the playground conversation. State and sending live in useDirectChat; the only
// local state is the text being typed.
const DirectChatPanel = ({ threadId, messages, sending, sendMessage, startNewConversation, modelLabel }) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Grow the input with its content, up to MAX_INPUT_HEIGHT.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, [input]);

  // The input clears right away; it is restored if the message is not sent.
  const handleSend = async () => {
    const text = input;
    if (!text.trim() || sending) return;
    setInput("");
    const accepted = await sendMessage(text);
    if (!accepted) setInput(text);
  };

  const pickStarter = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="flex min-h-0 flex-col bg-base-100">
      <div className="flex items-center justify-between gap-3 border-b border-base-content/10 px-5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {modelLabel && (
            <span className="flex min-w-0 items-center gap-1.5 border border-base-content/15 px-2 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 shrink-0 bg-success" />
              <span className="truncate">{modelLabel}</span>
            </span>
          )}
          <span className="hidden truncate text-[11px] text-base-content/45 sm:inline">
            Thread <span className="font-mono">{threadId}</span>
          </span>
        </div>
        <button
          type="button"
          data-testid="direct-new-conversation-button"
          className="btn btn-ghost btn-xs gap-1.5"
          onClick={startNewConversation}
          disabled={sending || messages.length === 0}
        >
          <MessageSquarePlus size={13} /> New chat
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-6">
        {messages.length === 0 && !sending ? (
          <EmptyState modelLabel={modelLabel} onPick={pickStarter} />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {sending && <TypingIndicator />}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-5 pb-4 pt-2">
        <div className="mx-auto max-w-3xl border border-base-content/15 bg-base-100 transition-colors focus-within:border-base-content/40">
          <textarea
            ref={inputRef}
            data-testid="direct-chat-input"
            className="block w-full resize-none bg-transparent px-3.5 pt-3 text-sm outline-none placeholder:text-base-content/40"
            rows={1}
            placeholder="Send a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2 px-3.5 pb-2.5 pt-1.5">
            <span className="hidden text-[11px] text-base-content/40 sm:inline">
              <kbd className="kbd kbd-xs">Enter</kbd> to send · <kbd className="kbd kbd-xs">Shift</kbd>+
              <kbd className="kbd kbd-xs">Enter</kbd> for a new line
            </span>
            <button
              type="button"
              data-testid="direct-chat-send-button"
              className="btn btn-primary btn-sm btn-square"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              aria-label="Send message"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectChatPanel;
