const defaultTheme = require("./public/themes/default-user-theme.json");

const shapeTokens = {
  "--rounded-box": "0.3rem",
  "--rounded-btn": "0.1rem",
  "--rounded-badge": "0.3rem",
  "--border-btn": "0.3px",
  "--tab-radius": "0.3rem",
  "--btn-text-case": "none",
};

const shapeTokensDark = {
  ...shapeTokens,
  "--border-select": "0.3px",
};

const buildTheme = (tokens, colorScheme = "light") => ({
  "color-scheme": colorScheme,
  ...tokens,
  ...(colorScheme === "dark" ? shapeTokensDark : shapeTokens),
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: 0, transform: "scale(0.98)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        scaleIn: {
          "0%": { opacity: 0, transform: "scale(0.95)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in-scale": "fade-in-scale 300ms ease-out",
        fadeIn: "fadeIn 300ms ease-out",
        scaleIn: "scaleIn 300ms ease-out",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    require("daisyui"),
    function ({ addBase }) {
      addBase({
        /* Light Theme Scrollbar */
        '[data-theme="light"] ::-webkit-scrollbar': {
          width: "8px",
        },
        '[data-theme="light"] ::-webkit-scrollbar-thumb': {
          background: "rgba(200, 200, 200, 0.7)",
          borderRadius: "4px",
          border: "2px solid transparent",
          backgroundClip: "padding-box",
          transition: "background 0.3s ease-in-out",
        },
        '[data-theme="light"] ::-webkit-scrollbar-thumb:hover': {
          background: "rgba(180, 180, 180, 0.9)",
        },
        '[data-theme="light"] ::-webkit-scrollbar-track': {
          background: "rgba(240, 240, 240, 0.6)",
          borderRadius: "4px",
        },
        /* Dark Theme Scrollbar */
        '[data-theme="dark"] ::-webkit-scrollbar': {
          width: "8px",
        },
        '[data-theme="dark"] ::-webkit-scrollbar-thumb': {
          background: "rgba(80, 80, 80, 0.7)",
          borderRadius: "4px",
          border: "2px solid transparent",
          backgroundClip: "padding-box",
          transition: "background 0.3s ease-in-out",
        },
        '[data-theme="dark"] ::-webkit-scrollbar-thumb:hover': {
          background: "rgba(100, 100, 100, 0.9)",
        },
        '[data-theme="dark"] ::-webkit-scrollbar-track': {
          background: "rgba(34, 34, 34, 0.6)",
          borderRadius: "4px",
        },
        /* Firefox support */
        '[data-theme="light"] *': {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(200, 200, 200, 0.4) rgba(240, 240, 240, 0.3)",
        },
        '[data-theme="dark"] *': {
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(80, 80, 80, 0.6) rgba(34, 34, 34, 0.3)",
        },
      });
    },
  ],

  daisyui: {
    themes: [
      {
        light: buildTheme(defaultTheme.light, "light"),
      },
      {
        dark: buildTheme(defaultTheme.dark, "dark"),
      },
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
};
