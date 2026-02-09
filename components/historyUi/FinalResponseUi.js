import { CheckCircle } from "lucide-react";

export function FinalResponseUI({ status, preview, onClick }) {
  return (
    <div className="space-y-2 flex flex-col items-center justify-center">
      {/* Icon Box */}
      <div className="w-16 h-16 flex items-center justify-center border border-green-500 rounded-none ">
        <CheckCircle size={16} className="text-green-600" />
      </div>

      {/* Heading */}
      <div className="text-xs text-base-content/60 font-semibold py-2">FINAL RESPONSE</div>

      {/* Status */}
      <div className="text-green-600 font-semibold text-sm bg-base-200 border-green-500 border p-2">{status}</div>

      {preview && (
        <button
          type="button"
          onClick={onClick}
          className="text-left w-full border border-base-300 bg-base-100 p-2 text-xs text-base-content hover:bg-base-200"
        >
          {preview}
        </button>
      )}
    </div>
  );
}
