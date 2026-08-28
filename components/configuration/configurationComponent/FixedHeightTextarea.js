import React, { useLayoutEffect, useRef } from "react";

const FixedHeightTextarea = ({ height = 288, className = "", textareaRef, ...props }) => {
  const internalRef = useRef(null);

  const setRef = (el) => {
    internalRef.current = el;
    if (typeof textareaRef === "function") {
      textareaRef(el);
    } else if (textareaRef) {
      textareaRef.current = el;
    }
  };

  useLayoutEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    el.style.height = `${height}px`;
    el.style.minHeight = `${height}px`;
    el.style.maxHeight = `${height}px`;
  }, [height]);

  return (
    <textarea
      ref={setRef}
      className={`textarea textarea-bordered w-full text-sm leading-relaxed resize-none overflow-y-auto ${className}`}
      {...props}
    />
  );
};

export default FixedHeightTextarea;
