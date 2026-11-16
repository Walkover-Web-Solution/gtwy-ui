const STEWARD_FEEDBACK_URL = "https://steward.embarko.app/api/v1/feedback";
const STEWARD_FEEDBACK_KEY = "pk_eecf8f6a6ffe754bf82856b3877d60f706e2";

/**
 * Submit builder feedback to Steward (native panel form; no third-party script).
 * @returns {Promise<void>}
 */
export async function submitStewardPanelFeedback({ text, user, meta = {} }) {
  const response = await fetch(STEWARD_FEEDBACK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Steward-Key": STEWARD_FEEDBACK_KEY,
    },
    body: JSON.stringify({
      text,
      user,
      page: {
        url: window.location.href,
        title: document.title,
      },
      meta,
    }),
  });

  if (response.status === 202) {
    return;
  }

  if (response.status === 429) {
    throw new Error("Too many at once — please try again shortly.");
  }

  let message = `Could not send feedback (${response.status}).`;
  try {
    const body = await response.json();
    if (body?.error) message = body.error;
    else if (body?.message) message = body.message;
  } catch {
    // keep default message
  }
  throw new Error(message);
}
