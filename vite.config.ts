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
    },
  },
});
