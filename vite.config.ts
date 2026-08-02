import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// DevExpress packages are in the Angular project's node_modules.
// We cannot install them here (disk constraints) so we alias them.
const angularNodeModules = "/Users/lelai/work/freelancer/POS/v2/pos_web/node_modules";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.join(__dirname, "./src") },
      { find: "@assets", replacement: path.resolve(__dirname, "./src/assets") },
      { find: "@utils", replacement: path.resolve(__dirname, "./src/utils") },
      // DevExpress aliases → Angular project node_modules
      { find: "devexpress-reporting", replacement: `${angularNodeModules}/devexpress-reporting` },
      { find: "@devexpress/analytics-core", replacement: `${angularNodeModules}/@devexpress/analytics-core` },
      { find: "devextreme", replacement: `${angularNodeModules}/devextreme` },
      { find: "knockout", replacement: `${angularNodeModules}/knockout/build/output/knockout-latest.js` },
      { find: "jquery", replacement: `${angularNodeModules}/jquery/dist/jquery.js` },
      // ace-builds is pulled in by the report designer; keep it on the same copy
      // as devexpress so both sides agree on the module instance.
      { find: "ace-builds", replacement: `${angularNodeModules}/ace-builds` },
    ],
  },
  define: {
    "process.env": process.env,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
    // Exclude devexpress packages from pre-bundling — serve them as native ESM
    exclude: [
      "devexpress-reporting",
      "@devexpress/analytics-core",
      "devextreme",
    ],
    // ace.js is a UMD bundle. Served raw it exposes no `default`, which is what
    // the designer imports, so pre-bundle it and force the CJS interop wrapper.
    include: ["ace-builds/src-noconflict/ace"],
    needsInterop: ["ace-builds/src-noconflict/ace"],
  },
  build: {
    target: "esnext",
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      "/app": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // Proxy DevExpress report viewer requests to avoid CORS from localhost
      "/DXXRDV": {
        target: "https://api.posmobile.vn",
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: "https://posmobile.vn",
          Referer: "https://posmobile.vn/",
        },
      },
      // Proxy DevExpress report designer requests to avoid CORS from localhost
      "/DXXRD": {
        target: "https://api.posmobile.vn",
        changeOrigin: true,
        secure: true,
        headers: {
          Origin: "https://posmobile.vn",
          Referer: "https://posmobile.vn/",
        },
      },
    },
  },
});
