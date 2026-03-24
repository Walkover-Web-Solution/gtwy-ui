const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex) => {
  if (!hex) return null;
  let normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (normalized.length !== 6) return null;
  const intValue = parseInt(normalized, 16);
  if (Number.isNaN(intValue)) return null;
  return {
    r: ((intValue >> 16) & 255) / 255,
    g: ((intValue >> 8) & 255) / 255,
    b: (intValue & 255) / 255,
  };
};

const srgbToLinear = (value) => (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));

const linearToSrgb = (value) => (value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055);

const rgbToOklch = ({ r, g, b }) => {
  if ([r, g, b].some((v) => typeof v !== "number")) return null;
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  let h = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { L, C, h };
};

const formatOklchString = ({ L, C, h }) => `oklch(${(L * 100).toFixed(2)}% ${C.toFixed(4)} ${h.toFixed(2)})`;

const parseOklchString = (value) => {
  if (!value) return null;
  const normalized = value.replace(/,/g, " ");
  const match = normalized.match(/oklch\(\s*([0-9.+-]+)(%?)\s+([0-9.+-]+)\s+([0-9.+-]+)\s*\)/i);
  if (!match) return null;
  let L = parseFloat(match[1]);
  if (Number.isNaN(L)) return null;
  if (match[2] === "%") {
    L = L / 100;
  }
  const C = parseFloat(match[3]);
  const h = parseFloat(match[4]);
  if ([C, h].some((n) => Number.isNaN(n))) return null;
  return { L, C, h };
};

const oklchToRgb = ({ L, C, h }) => {
  const hRad = (h * Math.PI) / 180;
  const a = Math.cos(hRad) * C;
  const bVal = Math.sin(hRad) * C;

  const l_ = L + 0.3963377774 * a + 0.2158037573 * bVal;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bVal;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bVal;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  let r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  r = clamp(linearToSrgb(r));
  g = clamp(linearToSrgb(g));
  bl = clamp(linearToSrgb(bl));

  return { r, g, b: bl };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((v) =>
      clamp(Math.round(v * 255), 0, 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;

const oklchToHex = (value, fallback = "#000000") => {
  const parsed = parseOklchString(value);
  if (!parsed) return fallback;
  const rgb = oklchToRgb(parsed);
  if (!rgb) return fallback;
  return rgbToHex(rgb);
};

const hexToOklchString = (hex, fallback = "") => {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallback;
  const oklch = rgbToOklch(rgb);
  if (!oklch) return fallback;
  return formatOklchString(oklch);
};

export {
  clamp,
  hexToRgb,
  srgbToLinear,
  linearToSrgb,
  rgbToOklch,
  formatOklchString,
  parseOklchString,
  oklchToRgb,
  rgbToHex,
  oklchToHex,
  hexToOklchString,
};
