const STYLE_TAG_ID = "gtwy-theme-style";

const VAR_ALIAS_MAP = {
  "base-100": ["--b1"],
  "base-200": ["--b2"],
  "base-300": ["--b3"],
  "base-400": ["--b4"],
  "base-content": ["--bc"],
  primary: ["--p"],
  "primary-content": ["--pc"],
  secondary: ["--s"],
  "secondary-content": ["--sc"],
  accent: ["--a"],
  "accent-content": ["--ac"],
  neutral: ["--n"],
  "neutral-content": ["--nc"],
  info: ["--in"],
  "info-content": ["--inc"],
  success: ["--su"],
  "success-content": ["--suc"],
  warning: ["--wa"],
  "warning-content": ["--wac"],
  error: ["--er"],
  "error-content": ["--erc"],
};

const normalizeColor = (value) => {
  if (!value) return value;
  const trimmed = value.trim();
  if (trimmed.startsWith("oklch(") && trimmed.endsWith(")")) {
    return trimmed.slice(6, -1);
  }
  return trimmed;
};

const buildThemeCssBlock = (themeName, tokens = {}) => {
  const lines = [];

  Object.entries(tokens).forEach(([key, raw]) => {
    if (!raw) return;
    const normalized = normalizeColor(raw);
    lines.push(`  --${key}: ${normalized};`);

    const aliases = VAR_ALIAS_MAP[key];
    if (aliases) {
      aliases.forEach((alias) => lines.push(`  ${alias}: ${normalized};`));
    }
  });

  return `:root[data-theme="${themeName}"] {\n${lines.join("\n")}\n}`;
};

const injectThemeCss = (theme) => {
  if (typeof document === "undefined") return;

  let styleEl = document.getElementById(STYLE_TAG_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_TAG_ID;
    document.head.appendChild(styleEl);
  }

  const blocks = [];
  if (theme.light) {
    blocks.push(buildThemeCssBlock("light", theme.light));
  }
  if (theme.dark) {
    blocks.push(buildThemeCssBlock("dark", theme.dark));
  }

  styleEl.textContent = blocks.join("\n");
};

export const applyThemeObject = (theme) => {
  if (!theme || typeof theme !== "object") {
    throw new Error("Invalid theme object supplied");
  }
  injectThemeCss(theme);
  return theme;
};

export default {
  applyThemeObject,
};
