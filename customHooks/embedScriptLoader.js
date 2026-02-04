import { getOrCreateNotificationAuthKey } from "@/config/index";
import { useEffect } from "react";

export const useEmbedScriptLoader = (embedToken = null, isEmbedUser = false, isViewer = false) => {
  async function embedMaker() {
    const pAuthKey =
      !isEmbedUser && !isViewer
        ? await getOrCreateNotificationAuthKey("gtwy_bridge_trigger").then((res) => res?.authkey)
        : null;
    const activeElement = document.activeElement;
    const script = document.createElement("script");
    script.setAttribute("embedToken", embedToken);
    script.id = process.env.NEXT_PUBLIC_EMBED_SCRIPT_ID;
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

    document.body.appendChild(script);
    script.onload = () => {
      setTimeout(() => {
        if (activeElement && "focus" in activeElement) {
          activeElement.focus();
        }
      }, 2000);
    };
  }
  useEffect(() => {
    // Ensure embedToken is a valid string before proceeding
    if (embedToken && typeof embedToken === "string" && embedToken.trim() !== "") {
      embedMaker();

      return () => {
        try {
          const script = document.getElementById(process.env.NEXT_PUBLIC_EMBED_SCRIPT_ID);
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
    }
  }, [embedToken, isEmbedUser]);
};
