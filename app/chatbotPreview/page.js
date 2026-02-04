"use client";

import { useEffect } from "react";
export const runtime = "edge";

function page() {
  const scriptId = "chatbot-main-script";
  const scriptSrc = process.env.NEXT_PUBLIC_CHATBOT_PREVIEW_URL;

  useEffect(() => {
    const updateScriptElement = () => {
      let script = document.getElementById(scriptId);

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = scriptSrc;
        document.head.appendChild(script);
      }
    };

    updateScriptElement();

    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  return null;
}

export default page;
