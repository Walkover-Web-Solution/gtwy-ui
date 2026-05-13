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
    "./utils/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    { pattern: /bg-(red|green|yellow|orange|gray)-500\/(20|30)/ },
    { pattern: /border-(red|green|yellow|orange|gray)-500/ },
    { pattern: /border-l-4/ },
    { pattern: /text-(red|green|yellow|orange|gray)-(400|500|600)/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "sans-serif"],
      },
      zIndex: {
        "very-low": "0",
        low: "1",
        "low-medium": "50",
        medium: "999",
        high: "9999",
        "very-high": "999999",
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
        slideInLeft: {
          "0%": { transform: "translateX(-100%)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: 0 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        slideInRightSmooth: {
          "0%": { transform: "translateX(30%)", opacity: 0 },
          "40%": { opacity: 1 },
          "100%": { transform: "translateX(0)", opacity: 1 },
        },
        scroll: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        slideIn: {
          from: { transform: "translateX(-100%)", opacity: 0 },
          to: { transform: "translateX(0)", opacity: 1 },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in-scale": "fade-in-scale 300ms ease-out",
        fadeIn: "fadeIn 300ms ease-out",
        scaleIn: "scaleIn 300ms ease-out",
        scroll: "scroll 20s linear infinite",
        slideIn: "slideIn 0.3s ease-out forwards",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "bg-zoom": "linear-gradient(to left, #002eae, #3c30b9, #942ed4)",
        "hero-bg": "radial-gradient(circle farthest-side at center top, hsl(276, 100%, 50%) 0%, hsl(0, 0%, 0%) 70%)",
        "hero-bg-center":
          "radial-gradient(circle farthest-corner at center, hsl(263, 100%, 70%) 0%, hsl(0, 0%, 0%) 100%)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui"),
    function ({ addBase, addUtilities }) {
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

      addUtilities({
        ".info": {
          "font-weight": "500",
          color: "#6b7280",
          cursor: "help",
          "text-decoration": "underline",
          "text-decoration-style": "dotted",
          "text-underline-offset": "2px",
          "text-decoration-color": "#9ca3af",
          "&:hover": {
            "text-decoration-color": "#4b5563",
          },
        },
        ".promptSummary-info": {
          cursor: "help",
          "text-decoration": "underline",
          "text-decoration-style": "dotted",
          "text-underline-offset": "2px",
          "text-decoration-color": "#9ca3af",
          "&:hover": {
            "text-decoration-color": "#4b5563",
          },
        },
        ".bg-zoom": {
          background: "linear-gradient(to left, #002eae, #3c30b9, #942ed4)",
        },
        ".hero-bg": {
          "background-color": "hsl(0, 0%, 0%)",
          "background-image":
            "radial-gradient(circle farthest-side at center top, hsl(276, 100%, 50%) 0%, hsl(0, 0%, 0%) 70%)",
          "background-repeat": "no-repeat",
          "background-size": "cover",
          "background-position": "center top",
        },
        ".hero-bg-center": {
          "background-color": "hsl(0, 0%, 0%)",
          "background-image":
            "radial-gradient(circle farthest-corner at center, hsl(263, 100%, 70%) 0%, hsl(0, 0%, 0%) 100%)",
          "background-repeat": "no-repeat",
          "background-size": "cover",
          "background-position": "center",
        },
        ".animate-scroll": {
          animation: "scroll 20s linear infinite",
          "animation-fill-mode": "forwards",
          "white-space": "nowrap",
          display: "flex",
        },
        ".animate-slideIn": {
          animation: "slideIn 0.3s ease-out forwards",
        },
        ".line-clamp-5": {
          display: "-webkit-box",
          "-webkit-line-clamp": "5",
          "-webkit-box-orient": "vertical",
          overflow: "hidden",
          "text-overflow": "ellipsis",
        },
        ".hover-row:hover": {
          visibility: "visible",
        },
        ".show-on-hover:hover .see-on-hover": {
          opacity: "1 !important",
        },
        ".see-on-hover": {
          opacity: "0",
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
