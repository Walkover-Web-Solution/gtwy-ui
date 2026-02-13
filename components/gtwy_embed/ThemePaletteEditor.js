import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import defaultUserTheme from "@/public/themes/default-user-theme.json";
import { oklchToHex, hexToOklchString } from "@/utils/colorUtils";

const COLOR_LABEL_MAP = {
  "base-100": "Page Background",
  "base-200": "Section Background",
  "base-300": "Card / Block Background",
  "base-400": "Surface Accent",
  "base-content": "Primary Text",
  primary: "Primary",
  "primary-content": "Primary Text Contrast",
  secondary: "Secondary",
  "secondary-content": "Secondary Text Contrast",
  accent: "Accent",
  "accent-content": "Accent Text Contrast",
  neutral: "Neutral",
  "neutral-content": "Neutral Text Contrast",
  info: "Info",
  "info-content": "Info Text Contrast",
  success: "Success",
  "success-content": "Success Text Contrast",
  warning: "Warning",
  "warning-content": "Warning Text Contrast",
  error: "Error",
  "error-content": "Error Text Contrast",
};

const MODE_TITLES = {
  light: "Light Theme Palette",
  dark: "Dark Theme Palette",
};

const ThemePaletteEditor = ({ theme, onColorChange }) => {
  const [openModes, setOpenModes] = useState(() =>
    Object.keys(MODE_TITLES).reduce((acc, mode) => ({ ...acc, [mode]: false }), {})
  );

  const toggleMode = (mode) => {
    setOpenModes((prev) => ({ ...prev, [mode]: !prev[mode] }));
  };

  return (
    <div className="space-y-3 mt-4">
      {Object.keys(MODE_TITLES).map((mode) => {
        const tokens = Object.keys(defaultUserTheme?.[mode] || {});
        const isOpen = openModes[mode];
        return (
          <div key={mode} className=" rounded bg-base-200">
            <button
              id={`theme-palette-toggle-${mode}`}
              type="button"
              className="w-full flex items-center justify-between px-3 py-2 text-left"
              onClick={() => toggleMode(mode)}
            >
              <div>
                <p className="text-sm text-base-content/70">{MODE_TITLES[mode]}</p>
              </div>
              <ChevronDown
                size={16}
                className={`text-base-content/70 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tokens.map((token) => {
                    const value = theme?.[mode]?.[token] || "";
                    const hexValue = oklchToHex(value);
                    return (
                      <div key={token} className="form-control">
                        <label className="label py-1">
                          <span className="label-text text-xs">{COLOR_LABEL_MAP[token] || token}</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id={`theme-color-${mode}-${token}`}
                            type="color"
                            value={hexValue}
                            onChange={(e) => {
                              const newHex = e.target.value;
                              const newOklch = hexToOklchString(newHex, value);
                              onColorChange(mode, token, newOklch);
                            }}
                            className="w-12 h-8 rounded cursor-pointer border border-base-300"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => onColorChange(mode, token, e.target.value)}
                            className="input input-sm input-bordered flex-1 font-mono text-xs"
                            placeholder="oklch(...)"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ThemePaletteEditor;
