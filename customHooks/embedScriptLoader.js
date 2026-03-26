import { getOrCreateNotificationAuthKey } from "@/config/index";
import { useEffect, useRef } from "react";

export const useEmbedScriptLoader = (embedToken = null, isEmbedUser = false, isViewer = false) => {
  // Use a generation counter to detect stale effects after cleanup
  const generationRef = useRef(0);
  // Track if we've successfully loaded a script for this token
  const loadedTokenRef = useRef(null);

  useEffect(() => {
    // Ensure embedToken is a valid string before proceeding
    if (!embedToken || typeof embedToken !== "string" || embedToken.trim() === "") {
      return;
    }

    const scriptId = process.env.NEXT_PUBLIC_EMBED_SCRIPT_ID;

    // Skip if we've already loaded this exact token (prevents re-load after re-renders)
    if (loadedTokenRef.current === embedToken) {
      // Verify the script is still in DOM
      const existingScript = document.getElementById(scriptId);
      if (existingScript && existingScript.getAttribute("embedToken") === embedToken) {
        return;
      }
      // Script was removed, allow reload
      loadedTokenRef.current = null;
    }

    // Check if script with same token already exists in DOM
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      const existingToken = existingScript.getAttribute("embedToken");
      if (existingToken === embedToken) {
        // Same token script already exists, mark as loaded and skip
        loadedTokenRef.current = embedToken;
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

    // Increment generation to invalidate any in-flight async operations from previous effects
    const currentGeneration = ++generationRef.current;

    const embedMaker = async () => {
      try {
        const pAuthKey =
          !isEmbedUser && !isViewer
            ? await getOrCreateNotificationAuthKey("gtwy_bridge_trigger").then((res) => res?.authkey)
            : null;

        // Check if this effect is stale (cleanup ran or new effect started)
        if (generationRef.current !== currentGeneration) {
          return;
        }

        // Double-check script hasn't been added while we were awaiting
        const existingScriptAfterAwait = document.getElementById(scriptId);
        if (existingScriptAfterAwait) {
          loadedTokenRef.current = existingScriptAfterAwait.getAttribute("embedToken");
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

        // Final check before appending
        if (generationRef.current === currentGeneration) {
          document.body.appendChild(script);
          loadedTokenRef.current = embedToken;
        }
      } catch (error) {
        console.warn("Error loading embed script:", error);
      }
    };

    embedMaker();

    return () => {
      // Incrementing generation invalidates any in-flight async operations
      generationRef.current++;
      try {
        const script = document.getElementById(scriptId);
        if (script && script.parentNode === document.body) {
          document.body.removeChild(script);
        }

        const embedContainer = document.getElementById("iframe-viasocket-embed-parent-container");
        if (embedContainer && embedContainer.parentNode === document.body) {
          document.body.removeChild(embedContainer);
        }
        // Reset loaded token since we removed the script
        loadedTokenRef.current = null;
      } catch (error) {
        console.warn("Error removing embed scripts:", error);
      }
    };
  }, [embedToken, isEmbedUser, isViewer]);
};
