import React, { useRef } from "react";
import { createDiff } from "@/utils/utility";

const ComparisonCheck = ({ oldContent, newContent, isFromPublishModal }) => {
  const diffData = createDiff(oldContent || "", newContent || "");
  const isNewContentEmpty = !newContent || newContent.trim() === "";
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
          <div className="flex gap-2 h-[70vh] w-full mt-3">
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
                        line.type === "deleted"
                          ? "bg-red-200 text-base-content"
                          : line.type === "modified"
                            ? "bg-red-100 text-black"
                            : line.type === "equal"
                              ? "bg-base-200 text-base-content"
                              : "bg-base-100 opacity-30 text-base-content"
                      }`}
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
                        line.type === "added"
                          ? "bg-green-200 text-base-content"
                          : line.type === "modified"
                            ? "bg-green-100 text-black"
                            : line.type === "equal"
                              ? "bg-base-200 text-base-content"
                              : "bg-base-100 opacity-30 text-base-content"
                      }`}
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
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default ComparisonCheck;
