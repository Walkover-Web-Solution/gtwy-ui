import { useEffect, useRef, useState } from "react";
import { Brain, ChevronDown } from "lucide-react";

function ReasoningAccordion({ reasoning, isStreaming, messageContent }) {
  const [open, setOpen] = useState(true);
  const [chunks, setChunks] = useState([]);
  const prevReasoningRef = useRef("");
  const chunkIdRef = useRef(0);
  const scrollRef = useRef(null);
  const prevStreamingRef = useRef(isStreaming);
  const userScrolledRef = useRef(false);
  const deltaStarted = isStreaming && !!messageContent;

  // Diff reasoning string → extract only the new tail as a single chunk
  useEffect(() => {
    if (!reasoning) return;
    const prev = prevReasoningRef.current;
    if (reasoning.length > prev.length) {
      const newText = reasoning.slice(prev.length);
      prevReasoningRef.current = reasoning;
      const id = ++chunkIdRef.current;
      const dur = Math.min(0.3 + newText.length * 0.008, 0.7);
      setChunks((c) => [...c, { id, text: newText, dur }]);
    }
  }, [reasoning]);

  // Track whether user has scrolled up inside the accordion
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
      userScrolledRef.current = !atBottom;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll only while actively receiving reasoning chunks and user hasn't scrolled up
  useEffect(() => {
    if (isStreaming && !deltaStarted && !userScrolledRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks, isStreaming, deltaStarted]);

  // Collapse when delta starts or streaming fully ends
  useEffect(() => {
    if (deltaStarted) {
      setOpen(false);
      return;
    }
    if (prevStreamingRef.current && !isStreaming) setOpen(false);
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, deltaStarted]);

  if (!reasoning) return null;

  return (
    <div className="r-entry mb-2 rounded-lg border border-base-300 bg-base-200/60 text-xs overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-base-content/70 hover:text-base-content transition-colors duration-150"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className="flex items-center"
          style={isStreaming && !deltaStarted ? { animation: "pulse 1.4s ease-in-out infinite" } : {}}
        >
          <Brain size={13} />
        </span>
        <span className="flex-1">{isStreaming && !deltaStarted ? "Thinking…" : "Reasoning"}</span>
        {isStreaming && !deltaStarted && <span className="loading loading-dots loading-xs opacity-60" />}
        <span
          style={{
            display: "inline-flex",
            transition: "transform 0.3s ease",
            transform: open ? "rotate(0deg)" : "rotate(-180deg)",
          }}
        >
          <ChevronDown className="h-3 w-3" />
        </span>
      </button>

      <div
        ref={scrollRef}
        className={`r-body border-t border-base-300 px-3 py-2 font-mono text-base-content/60 whitespace-pre-wrap leading-relaxed overflow-y-auto ${open ? "open" : "closed"}`}
      >
        {chunks.map(({ id, text, dur }) => (
          <span key={id} className="r-chunk" style={{ "--dur": `${dur}s` }}>
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ReasoningAccordion;
