/** @type {import('prettier').Config} */
module.exports = {
  // Formatting
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "es5",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",
  endOfLine: "lf",

  // Tailwind CSS — ordena classes automaticamente
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindStylesheet: "./src/app/globals.css",
};
