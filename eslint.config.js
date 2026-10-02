import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

const browserGlobals = {
  File: "readonly",
  HTMLElement: "readonly",
  Image: "readonly",
  Node: "readonly",
  URL: "readonly",
  crypto: "readonly",
  document: "readonly",
  getComputedStyle: "readonly",
  localStorage: "readonly",
  navigator: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  Buffer: "readonly",
  __dirname: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  fetch: "readonly",
  process: "readonly",
  queueMicrotask: "readonly",
  require: "readonly",
  setImmediate: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
};

export default tseslint.config(
  { ignores: ["dist/**", "release/**", "build/**", "graphify-out/**", ".agents/**", ".claude/**", ".codex/**", ".hermes/**", ".impeccable/**", ".pi/**", "prototype/**"] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: browserGlobals },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  {
    files: ["**/*.{mjs,cjs}", "vite.config.ts", "src/**/*.test.ts"],
    languageOptions: { globals: nodeGlobals },
  },

  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },

  {
    files: ["**/*.d.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
