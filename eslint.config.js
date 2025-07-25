import tsParser from "@typescript-eslint/parser";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import js from "@eslint/js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default [
    {
        ignores: ["node_modules/**", "dist/**", "*.js", "**/*.js"],
    },
    js.configs.recommended,
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: __dirname,
            },
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        rules: {
            ...typescriptEslint.configs.recommended.rules,
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/explicit-function-return-type": ["warn", {
                allowExpressions: true,
                allowTypedFunctionExpressions: true,
                allowHigherOrderFunctions: true,
                allowDirectConstAssertionInArrowFunctions: true,
            }],
        },
    },
];