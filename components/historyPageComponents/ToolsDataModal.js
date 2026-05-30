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
    <dialog
      data-testid="tools-data-modal"
      id="tools-data-modal"
      className="modal modal-middle p-4 outline-none z-[1000]"
      ref={toolsDataModalRef}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="modal-box relative bg-base-100 rounded-lg shadow-lg p-6 w-full max-w-5xl max-h-[85vh] overflow-hidden">
        <h2 className="font-bold mb-1">Function Data:</h2>
        <div className="overflow-y-auto max-h-[70vh] max-w-auto break-words pr-1">
          {toolsData ? (
            <>
              <div className="mt-4">
                {Object.entries(toolsData || {})?.map(([key, value], index) => (
                  <div key={index} className="flex items-start gap-2 mb-2">
                    <span className="w-28 shrink-0 capitalize">{key === "data" ? "response" : key}:</span>
                    <span className="flex-1 min-w-0">
                      {key === "name" && integrationData?.[value] ? (
                        <pre className="text-sm bg-base-200 p-2 rounded whitespace-pre-wrap break-all">
                          {integrationData[value]?.title}
                        </pre>
                      ) : key === "data" && value?.response !== undefined ? (
                        <pre className="text-sm bg-base-200 p-2 rounded whitespace-pre-wrap break-all">
                          {formatValue(value.response)}
                        </pre>
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
            data-testid="tools-data-modal-close-button"
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
