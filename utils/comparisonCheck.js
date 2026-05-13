import React, { useRef } from "react";
import { createDiff } from "@/utils/utility";

const ComparisonCheck = ({ oldContent, newContent, isFromPublishModal }) => {
  const diffData = createDiff(oldContent || "", newContent || "");
  const isNewContentEmpty =
    !newContent ||
    (typeof newContent === "string" && newContent.trim() === "") ||
    (typeof newContent === "object" && Object.keys(newContent).length === 0);
  const leftScrollRef = useRef(null);
  const rightScrollRef = useRef(null);
  const syncingRef = useRef(false);
  const syncScroll = (source, target) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    target.scrollTop = source.scrollTop;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  return (
    <>
      {isNewContentEmpty ? (
        <div className="flex flex-col items-center justify-center h-[70vh] w-full bg-base-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">No Current or Published Prompt Available</h3>
            <p className="text-base-content/70">You need to publish your prompt first to see a comparison.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 min-h-[200px] max-h-[500px] h-auto w-full mt-3">
            <div className="w-1/2 flex flex-col">
              <div className="label">
                <span className="label-text font-medium text-red-600">Published Prompt</span>
              </div>
              <div className="flex-1 border border-base-300 rounded-lg overflow-auto">
                <div
                  ref={leftScrollRef}
                  onScroll={() => rightScrollRef.current && syncScroll(leftScrollRef.current, rightScrollRef.current)}
                  className="h-full overflow-y-auto bg-base-100"
                >
                  {diffData.map((line, index) => (
                    <div
                      key={index}
                      className={`px-3 py-1 text-sm font-mono leading-relaxed border-b border-base-300/50 ${
                        line.type === "equal"
                          ? "bg-base-200 text-base-content"
                          : line.type === "added"
                            ? "bg-base-100 opacity-30 text-base-content"
                            : ""
                      }`}
                      style={
                        line.type === "deleted"
                          ? { backgroundColor: "#f8d7da", color: "#721c24" }
                          : line.type === "modified"
                            ? { backgroundColor: "#f5c6cb", color: "#721c24" }
                            : {}
                      }
                    >
                      <span className="text-base-content/50 mr-3 select-none">{line.lineNumber}</span>
                      <span className={line.type === "deleted" || line.type === "modified" ? "line-through" : ""}>
                        {line.oldLine || (line.type === "added" ? " " : "")}
                      </span>
                    </div>
                  ))}
                  {diffData.length === 0 && (
                    <div className="p-4 text-base-content text-center">Generate a new prompt to see differences</div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-1/2 flex flex-col">
              <div className="label">
                <span className="label-text font-medium text-green-600">Current Prompt</span>
              </div>
              <div className="flex-1 border border-base-300 rounded-lg overflow-auto">
                <div
                  ref={rightScrollRef}
                  onScroll={() => leftScrollRef.current && syncScroll(rightScrollRef.current, leftScrollRef.current)}
                  className="h-full overflow-y-auto bg-base-100"
                >
                  {diffData.map((line, index) => (
                    <div
                      key={index}
                      className={`px-3 py-1 text-sm font-mono leading-relaxed border-b border-base-300/50 ${
                        line.type === "equal"
                          ? "bg-base-200 text-base-content"
                          : line.type === "deleted"
                            ? "bg-base-100 opacity-30 text-base-content"
                            : ""
                      }`}
                      style={
                        line.type === "added"
                          ? { backgroundColor: "#d4edda", color: "#155724" }
                          : line.type === "modified"
                            ? { backgroundColor: "#d1ecf1", color: "#0c5460" }
                            : {}
                      }
                    >
                      <span className="text-base-content/50 mr-3 select-none">{line.lineNumber}</span>
                      <span className={line.type === "added" || line.type === "modified" ? "font-semibold" : ""}>
                        {line.newLine || (line.type === "deleted" ? " " : "")}
                      </span>
                    </div>
                  ))}
                  {diffData.length === 0 && (
                    <div className="p-4 text-base-content/70 text-center">Generated prompt will appear here</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {!isFromPublishModal && (
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm text-base-content flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: "#ee1414ff" }}></span>Removed
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: "#0c8d39ff" }}></span>Added
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: "#419cacff" }}></span>
                  Modified
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ComparisonCheck;
