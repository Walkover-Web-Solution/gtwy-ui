import React, { useRef, useCallback, memo, useEffect } from "react";

const DEFAULT_SMALL_HEIGHT = 384; // h-96 = 24rem = 384px

const PromptTextarea = memo(
  ({
    textareaRef,
    initialValue = "",
    onChange,
    onFocus,
    onTextAreaBlur,
    onKeyDown,
    isPromptHelperOpen,
    className = "",
    placeholder = "",
    isPublished = false,
    isEditor = true,
    onSave,
  }) => {
    const isComposingRef = useRef(false);
    const lastExternalValueRef = useRef(initialValue);
    const hasInitializedRef = useRef(false);
    const wrapperRef = useRef(null);
    const smallHeightRef = useRef(DEFAULT_SMALL_HEIGHT);
    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea || isComposingRef.current) return;

      if (!hasInitializedRef.current) {
        textarea.value = initialValue || "";
        lastExternalValueRef.current = initialValue;
        hasInitializedRef.current = true;
        return;
      }

      if (initialValue !== lastExternalValueRef.current) {
        textarea.value = initialValue || "";
        lastExternalValueRef.current = initialValue;
      }
    }, [initialValue, textareaRef]);

    useEffect(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const observer = new ResizeObserver(() => {
        if (!isPromptHelperOpen) {
          smallHeightRef.current = wrapper.offsetHeight;
        }
      });

      observer.observe(wrapper);
      return () => observer.disconnect();
    }, [isPromptHelperOpen]);

    useEffect(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      if (isPromptHelperOpen) {
        // Helper → ALWAYS full height, disable resize
        wrapper.style.height = "calc(100vh - 90px)";
        wrapper.style.resize = "none";
      } else {
        // Small mode → restore last resize, enable resize
        wrapper.style.height = `${smallHeightRef.current}px`;
        wrapper.style.resize = "vertical";
      }
    }, [isPromptHelperOpen]);

    const handleChange = useCallback(
      (e) => {
        if (!isComposingRef.current) {
          onChange(e.target.value);
        }
      },
      [onChange]
    );

    const handleCompositionStart = useCallback(() => {
      isComposingRef.current = true;
    }, []);

    const handleCompositionEnd = useCallback(
      (e) => {
        isComposingRef.current = false;
        onChange(e.target.value);
      },
      [onChange]
    );

    const handleFocus = useCallback(
      (e) => {
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleKeyDown = useCallback(
      (e) => {
        onKeyDown?.(e);
      },
      [onKeyDown]
    );

    const handleBlur = useCallback(
      (e) => {
        onSave?.();
        if (!isPromptHelperOpen) {
          onTextAreaBlur?.(e);
        }
      },
      [onSave, isPromptHelperOpen, onTextAreaBlur]
    );

    return (
      <div
        id="prompt-textarea-wrapper"
        ref={wrapperRef}
        className={`
        bg-white dark:bg-black/15 border flex
        w-full relative rounded-b-none
        transition-none p-0 m-0 overflow-hidden
        ring-2 ring-transparent
        focus-within:ring-2 focus-within:ring-base-content/20 box-border
        ${
          isPromptHelperOpen
            ? "h-[calc(100vh-50px)] w-[700px] border-primary shadow-md resize-none"
            : "h-96 min-h-96 border-base-content/20 resize-y"
        }
      `}
      >
        <textarea
          id="prompt-textarea"
          ref={textareaRef}
          disabled={isPublished || !isEditor}
          contentEditable={!isPublished && isEditor}
          className={`
          w-full text-sm h-full min-h-full max-h-full resize-none bg-transparent border-none
          caret-base-content outline-none overflow-auto p-2
          ${className}
        `}
          onBlur={handleBlur}
          onChange={handleChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          title={isPublished ? "Cannot edit in published mode" : ""}
        />
      </div>
    );
  }
);

PromptTextarea.displayName = "PromptTextarea";
export default PromptTextarea;
