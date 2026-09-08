import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 4281,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL("../..", import.meta.url))] },
  },
  preview: { host: "127.0.0.1", port: 4281, strictPort: true },
  build: {
    outDir: "../../dist/framework-lab",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./index.html", import.meta.url)),
        showcase: fileURLToPath(new URL("./showcase.html", import.meta.url)),
        technical: fileURLToPath(new URL("./technical.html", import.meta.url)),
        library: fileURLToPath(new URL("./library.html", import.meta.url)),
        frames: fileURLToPath(new URL("./frames.html", import.meta.url)),
        studio: fileURLToPath(new URL("./studio.html", import.meta.url)),
      },
    },
    // The unchanged legacy renderer is intentionally bundled for the control.
    chunkSizeWarningLimit: 900,
  },
});
