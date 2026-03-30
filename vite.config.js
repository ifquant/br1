import path from "node:path";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

const host = process.env.TAURI_DEV_HOST;
const foliateRoot = path.resolve("../foliate-js");
const constructStyleSheetsPolyfill = path.resolve(
  "node_modules/construct-style-sheets-polyfill"
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      "foliate-js": foliateRoot,
      "@pdfjs/pdf.min.mjs": path.resolve("src/lib/vendor/pdfjs-host-entry.js"),
      "construct-style-sheets-polyfill": constructStyleSheetsPolyfill,
    },
  },
  optimizeDeps: {
    exclude: ["foliate-js", "foliate-js/view.js"],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    fs: {
      allow: [foliateRoot],
    },
  },
});
