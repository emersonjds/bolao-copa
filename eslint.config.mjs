// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "eslint-config-next/core-web-vitals";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

// Plugins (react, react-hooks, jsx-a11y, import) já carregados pelo eslint-config-next.
// Reaproveita o objeto para que as regras customizadas abaixo os encontrem.
const nextPlugins = nextConfig.find((config) => config.plugins?.react)?.plugins ?? {};

export default defineConfig([
  // Next.js recommended rules (includes react, react-hooks, jsx-a11y, import)
  ...nextConfig,

  // TypeScript + project-specific overrides
  // Registra os plugins explicitamente para que as regras abaixo os encontrem
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: { ...nextPlugins, "@typescript-eslint": tseslint.plugin },
    rules: {
      // TypeScript
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // React
      "react/self-closing-comp": "warn",
      "react/jsx-no-useless-fragment": ["warn", { allowExpressions: true }],

      // Accessibility — reforça WCAG 2.2 / eMAG
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/label-has-associated-control": "error",

      // Imports
      "import/no-duplicates": "error",

      // General quality
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
    },
  },

  // Prettier — desativa regras de formatação que conflitam com o Prettier
  // DEVE ser o último item para ter prioridade sobre as outras configs
  prettierConfig,

  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".vercel/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "public/mockServiceWorker.js",
    // Artefatos gerados pelo Playwright (relatório/trace/UI) — não é código nosso.
    "playwright-report/**",
    "test-results/**",
  ]),
]);
