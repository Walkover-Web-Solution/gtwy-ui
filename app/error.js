"use client";
import React from "react";
import { LogOut, AlertTriangle, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Error({ error, reset }) {
  const router = useRouter();
  const isProd = process.env.NEXT_PUBLIC_ENV === "PROD";

  const handleLogout = () => {
    const isEmbedContext =
      window.location.pathname.includes("/embed") ||
      sessionStorage.getItem("embedUser") === "true" ||
      window.location.hostname.includes("embed");

    if (isEmbedContext) {
      router.replace("/session-expired");
    } else {
      router.replace(isProd ? "/login" : "/org");
    }
  };

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="opacity-[0.03] absolute top-20 right-20 w-96 h-96 border-2 border-base-content rounded-full" />
        <div className="opacity-[0.03] absolute bottom-40 left-20 w-64 h-64 border-2 border-base-content rotate-[15deg]" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-lg mx-auto">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-error" strokeWidth={1.5} />
          </div>
        </div>

        <div className="mb-12">
          <h1 className="text-base-content text-4xl mb-4 tracking-tight font-light">Something went wrong</h1>
          <p className="text-base-content/60 leading-relaxed">
            We encountered an unexpected error. Please try again or logout.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button onClick={() => window.location.reload()} className="btn btn-primary gap-2 group">
            <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
            <span>Try Again</span>
          </button>
          <button onClick={handleLogout} className="btn btn-outline gap-2">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>

        <div className="mt-16 pt-8 border-t border-base-content/10">
          <p className="font-mono text-xs text-base-content/40 tracking-wider">ERROR_CODE: UNEXPECTED_ERROR</p>
        </div>
      </div>

      <div className="absolute bottom-8 left-8 font-mono text-sm text-base-content/30">
        gtwy<span className="animate-[blink_1s_infinite]">|</span>
      </div>
    </div>
  );
}
