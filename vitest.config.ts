import { defineConfig } from "vitest/config";

// Pure-logic tests only, so no DOM environment is needed — everything that
// touches a browser API takes it from a stub the test installs itself.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["src/test-setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
