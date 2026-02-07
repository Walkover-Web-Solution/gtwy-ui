import posthog from "posthog-js";

// Initialize PostHog only on client-side with proper validation
if (typeof window !== "undefined") {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (posthogKey) {
    try {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "identified_only",
        capture_pageview: false, // We'll manually track pageviews
        capture_pageleave: true,
        session_recording: {
          recordCrossOriginIframes: false,
        },
        autocapture: {
          dom_event_allowlist: ["click", "change", "submit"],
          url_allowlist: [],
          element_allowlist: ["button", "a"],
        },
        loaded: (posthog) => {
          if (process.env.NODE_ENV === "development") {
            console.log("PostHog initialized successfully");
          }
        },
      });
    } catch (error) {
      console.error("PostHog initialization failed:", error);
    }
  } else {
    console.warn("PostHog API key not found. Analytics tracking is disabled.");
  }
}

// Safe wrapper functions to prevent errors when PostHog is not initialized
const safePosthog = {
  // Basic tracking
  capture: (eventName, properties = {}) => {
    try {
      if (posthog && posthog.__loaded) {
        posthog.capture(eventName, {
          ...properties,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("PostHog capture error:", error);
    }
  },

  // User identification
  identify: (userId, properties = {}) => {
    try {
      if (posthog && posthog.__loaded) {
        posthog.identify(userId, {
          ...properties,
          last_seen: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("PostHog identify error:", error);
    }
  },

  // Set user properties
  setPersonProperties: (properties = {}) => {
    try {
      if (posthog && posthog.__loaded) {
        posthog.setPersonProperties(properties);
      }
    } catch (error) {
      console.error("PostHog setPersonProperties error:", error);
    }
  },

  // Group analytics (for organizations)
  group: (groupType, groupKey, groupProperties = {}) => {
    try {
      if (posthog && posthog.__loaded) {
        posthog.group(groupType, groupKey, groupProperties);
      }
    } catch (error) {
      console.error("PostHog group error:", error);
    }
  },

  // Reset user session
  reset: () => {
    try {
      if (posthog && posthog.__loaded) {
        posthog.reset();
      }
    } catch (error) {
      console.error("PostHog reset error:", error);
    }
  },

  // Feature flags
  isFeatureEnabled: (flagKey) => {
    try {
      if (posthog && posthog.__loaded) {
        return posthog.isFeatureEnabled(flagKey);
      }
      return false;
    } catch (error) {
      console.error("PostHog feature flag error:", error);
      return false;
    }
  },

  // Page view tracking
  capturePageview: (properties = {}) => {
    try {
      if (posthog && posthog.__loaded) {
        posthog.capture("$pageview", {
          ...properties,
          $current_url: window.location.href,
          $pathname: window.location.pathname,
        });
      }
    } catch (error) {
      console.error("PostHog pageview error:", error);
    }
  },
};

// Utility tracking functions for common events
export const trackUserAction = (action, properties = {}) => {
  const actionMessages = {
    api_key_created: "API key created successfully",
    api_key_updated: "API key updated successfully",
    api_key_deleted: "API key deleted successfully",
    auth_key_created: "Auth key created successfully",
    auth_key_deleted: "Auth key deleted successfully",
    button_clicked: "Button clicked",
    form_submitted: "Form submitted",
    feature_accessed: "Feature accessed",
  };

  safePosthog.capture("user_action", {
    action,
    message: actionMessages[action] || action,
    ...properties,
  });
};

export const trackAgentEvent = (eventType, agentData = {}) => {
  const eventMessages = {
    created: "Agent created successfully",
    updated: "Agent updated successfully",
    deleted: "Agent deleted successfully",
    restored: "Agent restored successfully",
    version_created: "New agent version created successfully",
    published: "Agent published successfully",
  };

  safePosthog.capture(`agent_${eventType}`, {
    agent_id: agentData.agent_id || agentData._id,
    agent_name: agentData.name,
    org_id: agentData.org_id,
    message: eventMessages[eventType] || `Agent ${eventType}`,
    ...agentData,
  });
};

export const trackAPICall = (endpoint, method, statusCode, duration) => {
  const statusMessage =
    statusCode >= 200 && statusCode < 300
      ? "API call successful"
      : statusCode >= 400 && statusCode < 500
        ? "API call failed - client error"
        : statusCode >= 500
          ? "API call failed - server error"
          : "API call completed";

  safePosthog.capture("api_call", {
    endpoint,
    method,
    status_code: statusCode,
    duration_ms: duration,
    message: `${statusMessage} - ${method} ${endpoint}`,
    performance: duration < 1000 ? "fast" : duration < 3000 ? "normal" : "slow",
  });
};

export const trackError = (errorType, errorMessage, context = {}) => {
  safePosthog.capture("error_occurred", {
    error_type: errorType,
    error_message: errorMessage,
    message: `Error: ${errorMessage}`,
    severity: context.status_code >= 500 ? "critical" : "warning",
    ...context,
  });
};

export const trackNavigation = (from, to) => {
  safePosthog.capture("navigation", {
    from_path: from,
    to_path: to,
    message: `Navigated from ${from} to ${to}`,
  });
};

export const trackChatbotInteraction = (interactionType, chatbotData = {}) => {
  const interactionMessages = {
    message_sent: "User sent a message to chatbot",
    message_received: "Chatbot responded to user",
    conversation_started: "New chatbot conversation started",
    conversation_ended: "Chatbot conversation ended",
    feedback_given: "User provided feedback on chatbot response",
  };

  safePosthog.capture("chatbot_interaction", {
    interaction_type: interactionType,
    chatbot_id: chatbotData.chatbot_id,
    message: interactionMessages[interactionType] || `Chatbot ${interactionType}`,
    ...chatbotData,
  });
};

export const trackKnowledgeBaseEvent = (eventType, kbData = {}) => {
  const eventMessages = {
    created: "Knowledge base entry created successfully",
    updated: "Knowledge base entry updated successfully",
    deleted: "Knowledge base entry deleted successfully",
  };

  safePosthog.capture(`knowledge_base_${eventType}`, {
    kb_id: kbData.id || kbData._id,
    org_id: kbData.org_id,
    message: eventMessages[eventType] || `Knowledge base ${eventType}`,
    ...kbData,
  });
};

export const trackOrganizationEvent = (eventType, orgData = {}) => {
  const eventMessages = {
    created: "Organization created successfully",
    updated: "Organization updated successfully",
    switched: "Switched to organization",
  };

  safePosthog.capture(`organization_${eventType}`, {
    org_id: orgData.org_id || orgData.id,
    org_name: orgData.name,
    message: eventMessages[eventType] || `Organization ${eventType}`,
    ...orgData,
  });
};

export const trackAuthEvent = (eventType, authData = {}) => {
  const eventMessages = {
    user_logged_in: "User logged in successfully",
    user_logged_out: "User logged out",
    user_details_fetched: "User details loaded successfully",
    session_started: "User session started",
    session_expired: "User session expired",
  };

  safePosthog.capture(`auth_${eventType}`, {
    message: eventMessages[eventType] || `Auth ${eventType}`,
    ...authData,
  });
};

export default safePosthog;
