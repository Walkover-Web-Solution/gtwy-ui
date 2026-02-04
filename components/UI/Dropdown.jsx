import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
const Dropdown = ({
  options = [],
  value = null,
  onChange,
  placeholder = "Select...",
  disabled = false,
  searchable = false,
  showSearch,
  searchPlaceholder = "Search...",
  onSearchChange,
  size = "sm",
  maxLabelLength = 24,
  maxItemLabelLength = 28,
  className = "",
  menuClassName = "",
  placement = "bottom-start",
  onOptionHover,
  onMenuClose,
  showGroupHeaders = false,
  fullWidth = true,
  onOpenChange,
  renderTriggerContent,
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // simple classnames joiner
  const cx = (...args) => args.filter(Boolean).join(" ");

  // Outside click handling
  useEffect(() => {
    const onDocClick = (e) => {
      const t = triggerRef.current;
      const m = menuRef.current;
      if (!t || !m) return;
      if (t.contains(e.target) || m.contains(e.target)) return;
      setOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("touchstart", onDocClick, { passive: true });
    }
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [open]);

  // Notify on menu close
  useEffect(() => {
    if (!open) {
      onMenuClose && onMenuClose();
      onOptionHover && onOptionHover(null);
    }
    onOpenChange && onOpenChange(open);
  }, [open, onMenuClose, onOptionHover, onOpenChange]);

  const selectedOption = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value]
  );

  const enableSearch = Boolean(showSearch ?? searchable);

  const filteredOptions = useMemo(() => {
    if (!enableSearch || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) =>
      [o.label, o.description].filter(Boolean).some((x) => String(x).toLowerCase().includes(q))
    );
  }, [options, enableSearch, query]);

  const handleSelect = useCallback(
    (val, opt) => {
      onChange && onChange(val, opt);
      setOpen(false);
      setQuery("");
      onMenuClose && onMenuClose();
    },
    [onChange, onMenuClose]
  );

  // Keyboard support: close on escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sizeCls = useMemo(() => {
    switch (size) {
      case "lg":
        return "btn-lg text-base";
      case "md":
        return "btn-md text-sm";
      default:
        return "btn-sm text-sm";
    }
  }, [size]);

  // Default trigger if children not provided
  const triggerLabelContent = () => {
    if (renderTriggerContent) {
      return renderTriggerContent({
        selectedOption,
        placeholder,
        value,
        isOpen: open,
      });
    }

    let content = placeholder;
    let titleText = "";
    if (selectedOption) {
      if (typeof selectedOption.label === "string") {
        titleText = selectedOption.label;
        content = selectedOption.label;
      } else {
        content = selectedOption.label;
      }
    }

    return (
      <span
        className={cx("text-left flex-1 text-base-content/70 text-xs", !selectedOption ? "text-base-content/60" : "")}
        title={titleText}
      >
        {content}
      </span>
    );
  };

  const DefaultTrigger = (
    <button
      id="dropdown-trigger-button"
      type="button"
      disabled={disabled}
      onClick={() => !disabled && setOpen((s) => !s)}
      className={cx(
        "btn btn-outline justify-between hover:bg-base-200 hover:text-base-content hover:border-base-content/20 overflow-hidden",
        sizeCls,
        disabled ? "opacity-50 cursor-not-allowed" : "",
        fullWidth ? "w-full" : "",
        className
      )}
      aria-haspopup="listbox"
      aria-expanded={open}
      ref={triggerRef}
    >
      {triggerLabelContent()}
      {!renderTriggerContent && <ChevronDown className="ml-2 h-4 w-4 opacity-70" />}
    </button>
  );

  const TriggerWrapper = children ? (
    <div
      className={cx("relative", className)}
      onClick={(e) => {
        // Allow inner inputs to handle focus; menu toggle only on wrapper click
        if (disabled) return;
        setOpen(true);
      }}
      ref={triggerRef}
    >
      {children}
    </div>
  ) : (
    DefaultTrigger
  );

  // DaisyUI placement helpers
  const placementCls = placement === "bottom-end" ? "dropdown-end" : "";

  return (
    <div className={cx("dropdown rounded-md border-base-content/10 w-full", placementCls, open ? "dropdown-open" : "")}>
      {TriggerWrapper}

      <div
        ref={menuRef}
        className={cx("dropdown-content z-[60] w-full hover:bg-base-200", menuClassName)}
        role="listbox"
      >
        <div className="bg-base-100 rounded-box shadow border border-base-content/10 w-full overflow-hidden">
          {enableSearch && (
            <div className="p-2 border-b border-base-content/10">
              <input
                id="dropdown-search-input"
                autoFocus
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  onSearchChange && onSearchChange(e.target.value);
                }}
                placeholder={searchPlaceholder}
                className="input input-sm w-full bg-base-200/50"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto" onMouseLeave={() => onOptionHover && onOptionHover(null)}>
            <ul className="menu menu-sm w-full p-1 columns-1">
              {filteredOptions.length === 0 && <li className="px-3 py-2 text-sm text-base-content/10">No options</li>}
              {(() => {
                if (!showGroupHeaders) {
                  return filteredOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = String(opt.value) === String(value);
                    return (
                      <li key={String(opt.value)} className="whitespace-nowrap">
                        <a
                          id={`dropdown-option-${opt.value}`}
                          className={cx(
                            "flex items-start gap-2 w-full rounded-md hover:bg-base-200",
                            isActive ? "active text-primary" : ""
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(opt.value, opt);
                          }}
                          onMouseEnter={() => onOptionHover && onOptionHover(opt)}
                          role="option"
                          aria-selected={isActive}
                        >
                          {Icon && <Icon className="h-4 w-4 mt-0.5 opacity-80" />}
                          <div className="flex flex-col min-w-0">
                            {(() => {
                              let titleText = "";
                              let content = opt.label;
                              if (typeof opt.label === "string") {
                                titleText = opt.label;
                                content =
                                  opt.label.length > maxItemLabelLength
                                    ? opt.label.slice(0, maxItemLabelLength) + "..."
                                    : opt.label;
                              }
                              return (
                                <span className="" title={titleText}>
                                  {content}
                                </span>
                              );
                            })()}
                            {opt.description && (
                              <span className="truncate text-xs text-base-content/60">{opt.description}</span>
                            )}
                          </div>
                        </a>
                      </li>
                    );
                  });
                }

                // Grouped rendering
                const groups = new Map();
                filteredOptions.forEach((opt) => {
                  const g = opt?.meta?.group || "Other";
                  if (!groups.has(g)) groups.set(g, []);
                  groups.get(g).push(opt);
                });
                return Array.from(groups.entries()).map(([groupLabel, opts]) => (
                  <li key={`group-${groupLabel}`} className="px-2 py-1 cursor-default">
                    <div className="text-xs text-base-content/70 mb-1 cursor-default pointer-events-none select-none">
                      {groupLabel}
                    </div>
                    <ul>
                      {opts.map((opt) => {
                        const Icon = opt.icon;
                        const isActive = String(opt.value) === String(value);
                        return (
                          <li key={String(opt.value)} className="whitespace-nowrap">
                            <a
                              id={`dropdown-grouped-option-${opt.value}`}
                              className={cx(
                                "flex items-start gap-2 w-full rounded-md hover:bg-base-200",
                                isActive ? "active text-primary" : ""
                              )}
                              onClick={() => handleSelect(opt.value, opt)}
                              onMouseEnter={() => onOptionHover && onOptionHover(opt)}
                              role="option"
                              aria-selected={isActive}
                            >
                              {Icon && <Icon className="h-4 w-4 mt-0.5 opacity-80" />}
                              <div className="flex flex-col min-w-0">
                                {(() => {
                                  let titleText = "";
                                  let content = opt.label;
                                  if (typeof opt.label === "string") {
                                    titleText = opt.label;
                                    content =
                                      opt.label.length > maxItemLabelLength
                                        ? opt.label.slice(0, maxItemLabelLength) + "..."
                                        : opt.label;
                                  }
                                  return (
                                    <span className="" title={titleText}>
                                      {content}
                                    </span>
                                  );
                                })()}
                                {opt.description && (
                                  <span className="truncate text-xs text-base-content/60">{opt.description}</span>
                                )}
                              </div>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ));
              })()}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
Dropdown.displayName = "Dropdown";
export default React.memo(Dropdown);
