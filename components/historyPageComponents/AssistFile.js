import { useEffect } from "react";

export const useCloseSliderOnEsc = (setIsSliderOpen) => {
  useEffect(() => {
    const closeSliderOnEsc = (event) => {
      if (event.key === "Escape") {
        setIsSliderOpen(false);
      }
    };

    document.addEventListener("keydown", closeSliderOnEsc);

    return () => {
      document.removeEventListener("keydown", closeSliderOnEsc);
    };
  }, [setIsSliderOpen]);
};

export const useHandleClickOutside = (sidebarRef, setIsSliderOpen) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSliderOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarRef, setIsSliderOpen]);
};

export const scrollToBottom = (historyRef) => {
  if (historyRef.current) {
    historyRef.current.scrollTo({
      top: historyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }
};

export const scrollToTop = (historyRef, searchMessageId) => {
  if (historyRef.current && searchMessageId) {
    historyRef.current.scrollTo({
      top: -historyRef.current.scrollHeight,
      behavior: "smooth",
    });
  }
};

export const scrollElementIntoContainer = (container, element, behavior = "smooth") => {
  if (!container || !element) return false;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
  const targetScroll = relativeTop - container.clientHeight / 2 + element.clientHeight / 2;
  container.scrollTo({ top: Math.max(0, targetScroll), behavior });
  return true;
};

export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

export const truncate = (string = "", maxLength) => {
  return string.length > maxLength ? `${string.substring(0, maxLength - 3)}...` : string;
};
