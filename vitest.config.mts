import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig, defineProject } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const rootAlias = { "@": path.resolve(rootDir, ".") };

const sharedTestExclude = [
  ...configDefaults.exclude,
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
] as const;

/** Per-project; Vitest projects do not inherit root `resolve` unless using untyped `extends` on inline configs. */
const sharedProjectResolve = { resolve: { alias: rootAlias } };

const isCi = Boolean(process.env.CI);

export default defineConfig({
  resolve: {
    alias: rootAlias,
  },
  test: {
    /** Explicit: fail CI if a project’s `include` matches nothing (catch mis-typed globs). */
    passWithNoTests: false,
    /** Generous default for DOM + React work in slower environments. */
    testTimeout: 10_000,
    clearMocks: true,
    restoreMocks: true,
    projects: [
      defineProject({
        ...sharedProjectResolve,
        test: {
          name: "unit",
          include: ["lib/**/*.spec.ts"],
          environment: "node",
          exclude: [...sharedTestExclude],
        },
      }),
      defineProject({
        ...sharedProjectResolve,
        plugins: [react()],
        test: {
          name: "components",
          include: ["components/**/*.spec.{ts,tsx}"],
          environment: "happy-dom",
          setupFiles: [path.resolve(rootDir, "vitest.setup.ts")],
          exclude: [...sharedTestExclude],
        },
      }),
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["lib/**/*.ts", "components/**/*.{ts,tsx}"],
      exclude: [
        "**/*.spec.*",
        "**/*.test.*",
        "**/*.d.ts",
        "components/ui/**",
        "node_modules/**",
        ".next/**",
      ],
    },
    reporters: isCi ? ["default", "github-actions"] : ["default"],
  },
});
