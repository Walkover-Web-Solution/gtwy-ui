"use client";

import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

// Shared dropdown used by ApiGuide.js and BatchApiGuide.js to switch between
// code-sample languages. `languages` is an array of
// { id, label, category, ...rest }. Consecutive entries sharing the same
// `category` are grouped under one header (e.g. "cURL" / "OpenAI SDK" /
// "GTWY SDK"), so users can tell at a glance which examples call our own
// SDKs directly versus the OpenAI-compatibility shim versus raw HTTP.
const LanguageDropdown = ({ languages, selected, onChange }) => {
  const current = languages.find((l) => l.id === selected) ?? languages[0];

  // DaisyUI's `menu` styling expects each `<li>` to contain exactly one
  // interactive child, so the category header must be its own sibling `<li>`
  // (a `menu-title`) — not nested alongside the option's `<button>`, which
  // breaks the menu's layout (items get pushed into what looks like a
  // second column).
  let lastCategory = null;

  // For the cURL entry `category` and `label` are identical, so the trigger
  // would otherwise show "cURL · cURL" — only prefix the category when it
  // actually adds information.
  const triggerLabel =
    current.category && current.category !== current.label ? `${current.category} · ${current.label}` : current.label;

  return (
    <div className="dropdown dropdown-end" data-testid="language-dropdown">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-sm btn-ghost border border-base-300 gap-1 rounded-lg bg-base-200"
        data-testid="language-dropdown-trigger"
      >
        {triggerLabel}
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-10 w-56 p-1 shadow border border-base-300 mt-1 max-h-96 overflow-y-auto flex-nowrap"
        data-testid="language-dropdown-menu"
      >
        {languages.map((lang) => {
          const showHeader = lang.category && lang.category !== lastCategory;
          lastCategory = lang.category ?? lastCategory;

          return (
            <Fragment key={lang.id}>
              {showHeader && (
                <li className="menu-title px-2 pt-2 pb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-60">{lang.category}</span>
                </li>
              )}
              <li>
                <button
                  type="button"
                  data-testid={`language-option-${lang.id}`}
                  onClick={() => {
                    onChange(lang.id);
                    document.activeElement?.blur();
                  }}
                  className={lang.id === selected ? "active" : ""}
                >
                  {lang.label}
                </button>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </div>
  );
};

export default LanguageDropdown;
