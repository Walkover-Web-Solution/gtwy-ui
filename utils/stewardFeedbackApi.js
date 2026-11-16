export function isStewardPanelFeedbackEnabled() {
  const url = process.env.NEXT_PUBLIC_STEWARD_FEEDBACK_URL?.trim();
  const key = process.env.NEXT_PUBLIC_STEWARD_FEEDBACK_KEY?.trim();
  return Boolean(url && key);
}

function getStewardFeedbackConfig() {
  const url = process.env.NEXT_PUBLIC_STEWARD_FEEDBACK_URL?.trim();
  const key = process.env.NEXT_PUBLIC_STEWARD_FEEDBACK_KEY?.trim();
  if (!url || !key) {
    throw new Error("Feedback is not configured.");
  }
  return { url, key };
}

/**
 * Submit builder feedback to Steward (native panel form; no third-party script).
 * @returns {Promise<void>}
 */
export async function submitStewardPanelFeedback({ text, user, meta = {} }) {
  const { url, key } = getStewardFeedbackConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Steward-Key": key,
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
