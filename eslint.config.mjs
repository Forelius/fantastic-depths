// eslint.config.mjs
import globals from "globals";
import json from "@eslint/json";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

const readonlyGlobals = Object.fromEntries(
   Object.keys(globals.browser).map((k) => [k, "readonly"])
);

export default defineConfig([
   // Global ignores – place this FIRST
   {
      ignores: [
         "module/**", 
         "node_modules/**",     // common: ignore node_modules
         "**/*.min.js",         // ignore minified files
         "package-lock.json",         // ignore minified files
      ],
   },
   // ── TypeScript files ───────────────────────────────────────────────────
   // First, the base TypeScript‑eslint configs (recommended + optional strict)
   ...tseslint.configs.recommended,
   // Uncomment the next line if you want the stricter rule set as well
   // ...tseslint.configs.strict,
   // Then add your project‑specific overrides for TS files
   {
      files: ["**/*.{ts,tsx}"],
      languageOptions: {
         parser: tseslint.parser,
         parserOptions: {
            project: "./tsconfig.json",
            tsconfigRootDir: import.meta.dirname,
         },
         globals: {
            ...readonlyGlobals,
            Settings: "readonly",
            canvas: "readonly",
            game: "readonly",
            foundry: "readonly",
            CONFIG: "readonly",
            CONST: "readonly",
            Hooks: "readonly",
            Item: "readonly",
            Actor: "readonly",
            ChatMessage: "readonly",
            Token: "readonly",
            TextEditor: "readonly",
            Roll: "readonly",
            $: "readonly",
            ui: "readonly",
            fromUuid: "readonly",
            fromUuidSync: "readonly",
         },
      },
      rules: {
         // Example overrides – adjust to your style guide
         "@typescript-eslint/explicit-module-boundary-types": "off",
         "no-unused-vars": "off", // let @typescript-eslint handle it
         "@typescript-eslint/no-unused-vars": [
            "error",
            {
               argsIgnorePattern: "^_",        // ignores _owner, _args, etc.
               varsIgnorePattern: "^_",        // ignores local _variables too
               caughtErrorsIgnorePattern: "^_" // optional: allows catch(_err)
            }
         ],
      },      
   },

   // ── JSON / JSONC files ───────────────────────────────────────────────────
   {
      files: ["**/*.json"],
      plugins: { json },
      language: "json/json",
      extends: ["json/recommended"],
   },
   {
      files: ["**/*.jsonc"],
      plugins: { json },
      language: "json/jsonc",
      extends: ["json/recommended"],
   },
]);