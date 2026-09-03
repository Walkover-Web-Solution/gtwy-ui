"use client";
import { useEffect, use } from "react";
import { useCustomSelector } from "@/customHooks/customSelector";

export default function LayoutTestCasePage({ children, params }) {
  const resolvedParams = use(params);

  const { history_page_chatbot_token } = useCustomSelector((state) => ({
    history_page_chatbot_token: state?.bridgeReducer?.org?.[resolvedParams?.org_id]?.history_page_chatbot_token,
  }));

  const scriptId = "chatbot-main-script";
  const scriptSrcProd = process.env.NEXT_PUBLIC_CHATBOT_SCRIPT_SRC_PROD;

  useEffect(() => {
    if (!history_page_chatbot_token) return;

    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.setAttribute("embedToken", history_page_chatbot_token);
    script.setAttribute("hideIcon", "true");
    script.id = scriptId;
    script.src = scriptSrcProd;
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [history_page_chatbot_token]);

  return <>{children}</>;
}
