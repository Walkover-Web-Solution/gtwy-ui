import { useState, useEffect, useCallback } from "react";
import { getFromCookies, setInCookies } from "@/utils/utility";
import { applyThemeObject } from "@/utils/themeLoader";

const useThemeVariables = (userType = "default", customThemePath = null, customTheme = null) => {
  useEffect(() => {
    let cancelled = false;

    const loadTheme = async () => {
      try {
        if (customTheme) {
          applyThemeObject(customTheme);
          return;
        }
      } catch (error) {
        console.error("[ThemeManager] Failed to load theme", error);
      }
    };

    loadTheme();

    return () => {
      cancelled = true;
    };
  }, [userType, customThemePath, customTheme]);
};

/**
 * Unified Theme Management System
 * Simplified to avoid infinite loops
 */
export const useThemeManager = () => {
  const [theme, setTheme] = useState("system");
  const [actualTheme, setActualTheme] = useState("light");
  const [loading, setLoading] = useState(false);

  // Get system theme preference
  const getSystemTheme = () => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  };

  // Apply theme to document
  const applyTheme = (themeToApply) => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.setAttribute("data-theme", themeToApply);
      root.classList.remove("light", "dark");
      root.classList.add(themeToApply);
    }
  };

  useEffect(() => {
    applyTheme(getSystemTheme());
  }, []);

  // Change theme (manual selection)
  const changeTheme = useCallback((newTheme) => {
    setLoading(true);
    setTheme(newTheme);
    setInCookies("theme", newTheme);

    let themeToApply;
    if (newTheme === "system") {
      themeToApply = getSystemTheme();
    } else {
      themeToApply = newTheme;
    }

    setActualTheme(themeToApply);
    applyTheme(themeToApply);

    setTimeout(() => setLoading(false), 300);
  }, []);

  // Initialize theme on mount
  useEffect(() => {
    const savedTheme = getFromCookies("theme") || "system";
    const systemTheme = getSystemTheme();

    setTheme(savedTheme);

    let themeToApply;
    if (savedTheme === "system") {
      themeToApply = systemTheme;
    } else {
      themeToApply = savedTheme;
    }

    setActualTheme(themeToApply);
    applyTheme(themeToApply);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e) => {
      const newSystemTheme = e.matches ? "dark" : "light";
      const currentSavedTheme = getFromCookies("theme") || "system";

      if (currentSavedTheme === "system") {
        setActualTheme(newSystemTheme);
        applyTheme(newSystemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  // Helper functions for UI
  const getThemeLabel = useCallback(() => {
    if (theme === "system") {
      return `System (${actualTheme === "dark" ? "Dark" : "Light"})`;
    }
    return theme === "light" ? "Light Theme" : "Dark Theme";
  }, [theme, actualTheme]);

  const isSystemTheme = theme === "system";
  const isDarkTheme = actualTheme === "dark";
  const isLightTheme = actualTheme === "light";

  return {
    // State
    theme,
    actualTheme,
    loading,

    // Actions
    changeTheme,

    // Helpers
    getThemeLabel,
    getSystemTheme,

    // Computed
    isSystemTheme,
    isDarkTheme,
    isLightTheme,
  };
};

/**
 * Theme Manager Component
 * Use this component at the root level to initialize theme management
 */
export const ThemeManager = ({ userType = "default", customThemePath = null, customTheme = null } = {}) => {
  useThemeVariables(userType, customThemePath, customTheme);
  useThemeManager();
  return null; // This component doesn't render anything
};

export default useThemeManager;
