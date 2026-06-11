import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import unusedImports from "eslint-plugin-unused-imports";
import _import from "eslint-plugin-import";
import noCommentedCode from "eslint-plugin-no-commented-code";
import prettier from "eslint-plugin-prettier";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/node_modules/",
    "**/.next/",
    "**/out/",
    "**/dist/",
    "**/build/",
    "**/.cache/",
    "**/.turbo/",
    "**/.env",
    "**/.env.local",
    "**/*.log",
    "**/*.tsbuildinfo",
    "**/public/",
]), {
    extends: fixupConfigRules(compat.extends(
        "next",
        "next/core-web-vitals",
        "plugin:import/recommended",
        "plugin:prettier/recommended",
    )),

    plugins: {
        "unused-imports": unusedImports,
        import: fixupPluginRules(_import),
        "no-commented-code": noCommentedCode,
        prettier: fixupPluginRules(prettier),
    },

    settings: {
        "import/resolver": {
            node: {
                extensions: [".js", ".jsx", ".ts", ".tsx"],
            },

            alias: {
                map: [["@", "."]],
                extensions: [".js", ".jsx", ".ts", ".tsx"],
            },
        },
    },

    rules: {
        "import/no-unresolved": ["error", {
            commonjs: true,
            caseSensitive: false,
        }],

        "react/no-unescaped-entities": "off",
        "react-hooks/exhaustive-deps": "off",
        "react-hooks/rules-of-hooks": "off",
        "react/jsx-key": "off",
        "react/display-name": "off",
        "unused-imports/no-unused-imports": "error",

        "unused-imports/no-unused-vars": ["error", {
            vars: "all",
            varsIgnorePattern: "^_",
            args: "none",
            ignoreRestSiblings: true,
        }],

        "import/no-unused-modules": ["error", {
            unusedExports: true,
            missingExports: false,

            ignoreExports: [
                "app/**/*",
                "components/**/*",
                "hooks/**/*",
                "customHooks/**/*",
                "store/**/*",
                "utils/**/*",
            ],
        }],

        "no-commented-code/no-commented-code": "error",
    },
}, {
    files: ["app/**/*.{js,jsx,ts,tsx}"],

    rules: {
        "import/no-unused-modules": "off",
    },
}, {
    files: [
        "components/**/*.{js,jsx,ts,tsx}",
        "hooks/**/*.{js,jsx,ts,tsx}",
        "customHooks/**/*.{js,jsx,ts,tsx}",
        "store/**/*.{js,jsx,ts,tsx}",
        "utils/**/*.{js,jsx,ts,tsx}",
    ],

    rules: {
        "import/no-unused-modules": "off",
    },
}]);