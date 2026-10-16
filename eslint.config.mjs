import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Un parámetro con guion bajo adelante es "acá no lo uso, pero la firma
      // lo exige". Es lo que pasa en src/lib/inventario/apiExterna.ts, donde
      // los métodos están reservados para la integración futura.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Código generado por Prisma: no se revisa ni se edita a mano.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
