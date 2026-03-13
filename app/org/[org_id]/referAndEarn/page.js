"use client";
import { useCustomSelector } from "@/customHooks/customSelector";
import { generateAffiliateEmbedTokenApi } from "@/config/integrationApi";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";

export default function ReferAndEarnPage() {
  const { org_id } = useParams();
  const containerRef = useRef(null);
  const scriptRef = useRef(null);

  const { userdetails, orgName } = useCustomSelector((state) => ({
    userdetails: state.userDetailsReducer.userDetails,
    orgName: state.userDetailsReducer.organizations?.[org_id]?.name || "GTWY AI",
  }));

  useEffect(() => {
    if (!userdetails?.email) return;

    let cancelled = false;

    (async () => {
      try {
        const json = await generateAffiliateEmbedTokenApi({
          organization: "GTWY AI",
          expires_in_hours: 720,
          label: "Dashboard Widget",
        });
        const embedToken = (json?.data && json.data.embed_token) || json?.embed_token || "";

        if (cancelled || !containerRef.current) return;

        if (scriptRef.current) {
          scriptRef.current.remove();
          scriptRef.current = null;
        }

        const script = document.createElement("script");
        script.src = `https://main.d2f49esifpcbwh.amplifyapp.com/affiliate-embed.js`;
        script.setAttribute("email", userdetails.email);
        script.setAttribute("password", "12345676789");
        script.setAttribute("token", embedToken);
        script.setAttribute("full_name", userdetails.name || "");
        script.setAttribute("currency_code", "USD");
        script.setAttribute("commission_group_id", "8");
        script.setAttribute("phone", userdetails.phone || "");
        script.setAttribute("url", "https://gtwy.ai");
        script.setAttribute("organization", "GTWY AI");
        script.setAttribute("target", "refer-earn-widget-root");

        scriptRef.current = script;
        document.body.appendChild(script);
      } catch (err) {
        console.error("[referAndEarn] Failed to load affiliate widget:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      const widget = document.querySelector("affiliate-widget");
      if (widget) widget.remove();
    };
  }, [userdetails?.email, orgName]);

  return <div id="refer-earn-widget-root" ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}
