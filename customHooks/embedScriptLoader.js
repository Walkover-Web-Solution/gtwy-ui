import { getOrCreateNotificationAuthKey } from "@/config/index";
import { useEffect, useRef } from "react";

export const useEmbedScriptLoader = (embedToken = null, isEmbedUser = false, isViewer = false) => {
  const isLoadingRef = useRef(false);
  const currentTokenRef = useRef(null);

  useEffect(() => {
    // Ensure embedToken is a valid string before proceeding
    if (!embedToken || typeof embedToken !== "string" || embedToken.trim() === "") {
      return;
    }

    const scriptId = process.env.NEXT_PUBLIC_EMBED_SCRIPT_ID;

    // Skip if already loading or if script with same token already exists
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      const existingToken = existingScript.getAttribute("embedToken");
      if (existingToken === embedToken) {
        // Same token script already exists, skip
        return;
      }
      // Different token - remove existing script first
      if (existingScript.parentNode === document.body) {
        document.body.removeChild(existingScript);
      }
      const embedContainer = document.getElementById("iframe-viasocket-embed-parent-container");
      if (embedContainer && embedContainer.parentNode === document.body) {
        document.body.removeChild(embedContainer);
      }
    }

    // Prevent concurrent loading
    if (isLoadingRef.current && currentTokenRef.current === embedToken) {
      return;
    }

    isLoadingRef.current = true;
    currentTokenRef.current = embedToken;
    let cancelled = false;

    const embedMaker = async () => {
      try {
        const pAuthKey =
          !isEmbedUser && !isViewer
            ? await getOrCreateNotificationAuthKey("gtwy_bridge_trigger").then((res) => res?.authkey)
            : null;

        // Check if cancelled or if script was added while we were awaiting
        if (cancelled) return;

        const existingScriptAfterAwait = document.getElementById(scriptId);
        if (existingScriptAfterAwait) {
          isLoadingRef.current = false;
          return;
        }

        const script = document.createElement("script");
        script.setAttribute("embedToken", embedToken);
        script.id = scriptId;
        script.src = process.env.NEXT_PUBLIC_EMBED_SCRIPT_SRC;
        script.setAttribute("parentId", "alert-embed-parent");
        const configurationJson = {
          rowxvl39hxd0: {
            key: "Alert_On_Error",
            authValues: {
              pauth_key: pAuthKey,
            },
          },
          rowhup02ji8l: {
            key: "Alert_On_Fallback",
            authValues: {
              pauth_key: pAuthKey,
            },
          },
          row3atttp4du: {
            key: "Alert_On_Missing_Variables",
            authValues: {
              pauth_key: pAuthKey,
            },
          },
        };
        script.setAttribute("configurationJson", JSON.stringify(configurationJson));

        if (!cancelled) {
          document.body.appendChild(script);
        }
      } finally {
        isLoadingRef.current = false;
      }
    };

    embedMaker();

    return () => {
      cancelled = true;
      isLoadingRef.current = false;
      try {
        const script = document.getElementById(scriptId);
        if (script && script.parentNode === document.body) {
          document.body.removeChild(script);
        }

        const embedContainer = document.getElementById("iframe-viasocket-embed-parent-container");
        if (embedContainer && embedContainer.parentNode === document.body) {
          document.body.removeChild(embedContainer);
        }
      } catch (error) {
        console.warn("Error removing embed scripts:", error);
      }
    };
  }, [embedToken, isEmbedUser, isViewer]);
};
