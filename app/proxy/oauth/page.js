"use client";
import Script from "next/script";
import { PROXY_SCRIPT_SRC } from "@/utils/enums";

const REFERENCE_ID = process.env.NEXT_PUBLIC_REFERENCEID || "";

export default function ConsentPage() {
  const handleLoad = () => {
    window.initVerification?.({
      referenceId: REFERENCE_ID,
      type: "authorization",
      authType: "auth2",
      theme: "dark",
      success: (data) => {
        console.log("success response", data);
      },
      failure: (error) => {
        console.log("failure reason", error);
      },
    });
  };

  return (
    <div className="w-full h-screen flex justify-center items-center">
      <div id={REFERENCE_ID}></div>
      <Script src={PROXY_SCRIPT_SRC} strategy="afterInteractive" onLoad={handleLoad} />
    </div>
  );
}
