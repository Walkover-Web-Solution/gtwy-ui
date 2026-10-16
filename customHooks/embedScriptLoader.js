import { getOrCreateNotificationAuthKeyAction } from "@/store/action/authAction";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

export const isValidEmbedToken = (token) => {
  if (typeof token !== "string") return false;

  const normalizedToken = token.trim();
  return normalizedToken !== "" && normalizedToken !== "undefined" && normalizedToken !== "null";
};

export const useEmbedScriptLoader = (embedToken = null, isEmbedUser = false, isViewer = false) => {
  const dispatch = useDispatch();
  async function embedMaker(token, shouldAppendScript) {
    const pAuthKey =
      !isEmbedUser && !isViewer
        ? await dispatch(getOrCreateNotificationAuthKeyAction("gtwy_bridge_trigger")).then((res) => res?.authkey)
        : null;

    if (!shouldAppendScript()) return;

    const script = document.createElement("script");
    script.setAttribute("embedToken", token);
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
  }
  useEffect(() => {
    let shouldLoadScript = true;

    if (isValidEmbedToken(embedToken)) {
      embedMaker(embedToken.trim(), () => shouldLoadScript);

      return () => {
        shouldLoadScript = false;
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

    return () => {
      shouldLoadScript = false;
    };
  }, [embedToken, isEmbedUser, isViewer]);
};
