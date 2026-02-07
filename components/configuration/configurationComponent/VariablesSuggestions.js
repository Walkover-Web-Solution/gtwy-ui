import React, { memo, useCallback, useMemo } from "react";

// Optimized suggestions component
const VariablesSuggestions = memo(
  ({ showSuggestions, suggestions, activeSuggestionIndex, onSuggestionClick, position = { top: 0, left: 0 } }) => {
    const handleSuggestionClick = useCallback(
      (suggestion) => {
        onSuggestionClick?.(suggestion);
      },
      [onSuggestionClick]
    );

    // Memoized suggestions list to prevent unnecessary re-renders
    const suggestionsList = useMemo(() => {
      if (!showSuggestions || !suggestions?.length) return null;

      return suggestions.map((suggestion, index) => (
        <div
          id={`variable-suggestion-${index}`}
          key={suggestion}
          className={`px-3 py-2 cursor-pointer hover:bg-base-200 ${
            index === activeSuggestionIndex ? "bg-base-200" : ""
          }`}
          onClick={() => handleSuggestionClick(suggestion)}
        >
          {suggestion}
        </div>
      ));
    }, [suggestions, activeSuggestionIndex, showSuggestions, handleSuggestionClick]);

    if (!showSuggestions || !suggestions?.length) {
      return null;
    }

    return (
      <div
        id="variables-suggestions-dropdown"
        className="absolute bg-base-100 border border-base-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto min-w-48"
        style={{
          top: position.top + 20,
          left: position.left,
        }}
      >
        {suggestionsList}
      </div>
    );
  }
);

VariablesSuggestions.displayName = "VariablesSuggestions";

export default VariablesSuggestions;
