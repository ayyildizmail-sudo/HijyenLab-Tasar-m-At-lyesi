import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
    ".sites-runtime/**",
    "outputs/**",
    "work/**",
    // Upstream browser runtimes and test decoder are kept verbatim.
    "frontend/vendor/**",
    "tests/qr-vendor/**",
  ]),
  {
    // These scripts are CommonJS or expose a CommonJS branch to Node tests.
    files: [
      "tests/**/*.cjs",
      "frontend/{declared-quote,flat-artwork,flat-placement-evidence,light-surface,mark-orientation,photo-fidelity,rear-logo,rear-photo,white-carrier}.js",
    ],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
