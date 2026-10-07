import { useEffect, useState } from "react";
import { readJevQuestions, subscribeJevQuestions } from "@/utils/jevQuestions";

// The Jev questions kept in this browser for an agent, or an empty map when disabled or
// none are kept. Read after mount because localStorage is not available during SSR.
export default function useJevQuestions(agentId, enabled = true) {
  const [questions, setQuestions] = useState({});

  useEffect(() => {
    if (!enabled || !agentId) {
      setQuestions({});
      return undefined;
    }
    const sync = () => setQuestions(readJevQuestions(agentId));
    sync();
    return subscribeJevQuestions(agentId, sync);
  }, [agentId, enabled]);

  return questions;
}
