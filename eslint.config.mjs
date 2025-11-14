import globals from "globals";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";

const readonlyGlobals = Object.fromEntries(Object.keys(globals.browser).map(k => [k, "readonly"]));

export default defineConfig([
   {
      files: ["**/*.{mjs,js,cjs}"],          // remaining JS/cjs files
      languageOptions: {
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
            TextEditor: "readonly",
            Roll: "readonly",
            $: "readonly",
            ui: "readonly",
            fromUuid: "readonly",
            fromUuidSync: "readonly"
         },
         sourceType: "module",
         ecmaVersion: 2025
      }
   },
   { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
   { files: ["**/*.jsonc"], plugins: { json }, language: "json/jsonc", extends: ["json/recommended"] },
]); 