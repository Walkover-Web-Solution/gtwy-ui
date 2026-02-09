import { User } from "lucide-react";

export function UserPromptUI({ text }) {
  return (
    <div className="space-y-2 bg-base-100 flex flex-col items-center justify-center border-primary">
      <div className="w-10 h-10 flex items-center justify-center border border-primary bg-base-200 ">
        <User size={18} className="text-base-content" />
      </div>
      <div className="text-xs text-base-content/60 font-semibold">USER PROMPT</div>

      <div className="border border-base-400 p-2 text-sm bg-base-100 text-base-content ">{text}</div>
    </div>
  );
}
