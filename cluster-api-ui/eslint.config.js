import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import js from "@eslint/js";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 
      react: pluginReact 
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off"
    }
  },
  {
    ignores: ["dist", "node_modules", ".eslintrc.cjs"],
  }
];
