import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { runDirectCompletion } from "@/config/index";
import { buildDirectPayload, getDirectErrorMessage, toDirectAssistantMessage } from "@/utils/directCompletion";
import { generateRandomID } from "@/utils/utility";

const newThreadId = () => generateRandomID(12);

// Conversation for the direct playground. The thread id keeps conversation memory on the
// backend; starting a new conversation switches to a fresh thread.
export default function useDirectChat({ config, apikey }) {
  const [threadId, setThreadId] = useState(newThreadId);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setThreadId(newThreadId());
  }, []);

  // Returns false when the message was not sent, so the caller can restore its input.
  const sendMessage = useCallback(
    async (text) => {
      const message = text.trim();
      if (!message || sending) return false;
      if (!config.service || !config.model) {
        toast.error("Select a service and model first");
        return false;
      }

      setMessages((m) => [...m, { role: "user", content: message }]);
      setSending(true);
      const startedAt = Date.now();
      try {
        const result = await runDirectCompletion(buildDirectPayload({ config, message, threadId, apikey }));
        const reply = toDirectAssistantMessage(result, { model: config.model, elapsedMs: Date.now() - startedAt });
        setMessages((m) => [...m, reply]);
      } catch (error) {
        setMessages((m) => [...m, { role: "assistant", content: getDirectErrorMessage(error), error: true }]);
      } finally {
        setSending(false);
      }
      return true;
    },
    [config, apikey, threadId, sending]
  );

  return { threadId, messages, sending, sendMessage, startNewConversation };
}
