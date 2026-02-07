import { CloseCircleIcon } from "@/components/Icons";

const ToolsDataModal = ({ toolsData, handleClose, toolsDataModalRef, integrationData }) => {
  const formatValue = (value) => {
    if (typeof value === "string" && (value.startsWith("{") || value.startsWith("["))) {
      try {
        const parsedValue = JSON.parse(value);
        return JSON.stringify(parsedValue, null, 2);
      } catch {
        return value;
      }
    }
    return JSON.stringify(value, null, 2);
  };

  return (
    <dialog id="tools-data-modal" className="modal modal-middle mx-auto outline-none" ref={toolsDataModalRef}>
      <div className="relative bg-base-100 rounded-lg shadow-lg p-6 w-[80%] max-w-[80vw] overscroll-none">
        <h2 className="font-bold mb-1">Function Data:</h2>
        <div className="overflow-y-scroll max-h-[70vh] max-w-auto break-words">
          {toolsData ? (
            <>
              <div className="mt-4">
                {Object.entries(toolsData || {})?.map(([key, value], index) => (
                  <div key={index} className="flex items-start gap-2 mb-2">
                    <span className="w-28 shrink-0 capitalize">{key}:</span>
                    <span className="flex-1 min-w-0">
                      {key === "name" && integrationData?.[value] ? (
                        <p>
                          {integrationData[value]?.title}
                          <span>({value})</span>
                        </p>
                      ) : (
                        <pre className="text-sm bg-base-200 p-2 rounded whitespace-pre-wrap break-all">
                          {formatValue(value)}
                        </pre>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-base-content">No tools call data available</p>
          )}
        </div>
        <div className="absolute top-4 right-5">
          <button
            id="tools-data-modal-close-button"
            className="hover:scale-110 transition-transform duration-300 ease-in-out focus:outline-none focus:border-none"
            onClick={handleClose}
          >
            <CloseCircleIcon size={24} />
          </button>
        </div>
      </div>
    </dialog>
  );
};

export default ToolsDataModal;
