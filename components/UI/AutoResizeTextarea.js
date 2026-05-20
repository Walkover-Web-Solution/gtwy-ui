import React, { useRef, useLayoutEffect } from "react";

// Textarea that auto-grows to fit its content (no inner scrollbar). Forwards
// any extra props to the underlying <textarea>.
const AutoResizeTextarea = React.forwardRef(function AutoResizeTextarea(
  { value, onChange, className = "", minRows = 1, ...rest },
  forwardedRef
) {
  const innerRef = useRef(null);
  const setRefs = (node) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const resize = () => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={setRefs}
      value={value}
      onChange={(e) => {
        if (onChange) onChange(e);
        resize();
      }}
      rows={minRows}
      className={`resize-none overflow-hidden ${className}`}
      {...rest}
    />
  );
});

export default AutoResizeTextarea;
