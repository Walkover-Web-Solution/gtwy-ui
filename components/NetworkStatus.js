"use client";
import { useEffect, useState } from "react";
import { Home, RefreshCw, WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      window.location.reload();
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    const isEmbedContext =
      window.location.pathname.includes("/embed") ||
      sessionStorage.getItem("embedUser") === "true" ||
      window.location.hostname.includes("embed");

    const isProd = process.env.NEXT_PUBLIC_ENV === "PROD";

    if (isEmbedContext) {
      window.location.href = "/session-expired";
    } else {
      window.location.href = isProd ? "/login" : "/org";
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-base-100 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-base-content rounded-full" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-lg mx-auto">
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-base-content/5 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-base-content/60" strokeWidth={1.5} />
          </div>
        </div>

        <div className="mb-12">
          <h1 className="text-base-content text-4xl mb-4 tracking-tight font-light">No Connection</h1>
          <p className="text-base-content/50 leading-relaxed">Please check your internet connection and try again.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={handleRetry} className="btn btn-primary gap-2 group">
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" strokeWidth={2} />
            <span>Retry</span>
          </button>

          <button onClick={handleGoHome} className="btn btn-outline gap-2">
            <Home className="w-4 h-4" strokeWidth={2} />
            <span>Go Home</span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-sm text-base-content/20">gtwy</div>
    </div>
  );
}
