import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Disable problematic rules for production build
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn", // Change to warn instead of error
      "@next/next/no-img-element": "warn", // Change to warn instead of error
      "@next/next/no-page-custom-font": "warn", // Change to warn instead of error
    },
  },
];

export default eslintConfig;
