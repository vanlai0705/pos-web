import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

// DevExpress lives in this project's node_modules on CI (it is declared in
// package.json). Some local checkouts instead share the Angular project's copy,
// so fall back to that path only when the package is missing here — never
// hardcode it, or the build breaks anywhere that path does not exist (Vercel).
const localNodeModules = path.join(__dirname, "node_modules");
const angularNodeModules = "/Users/lelai/work/freelancer/POS/v2/pos_web/node_modules";

function pkgDir(pkg: string) {
  const local = path.join(localNodeModules, pkg);
  if (fs.existsSync(local)) return local;
  const shared = path.join(angularNodeModules, pkg);
  if (fs.existsSync(shared)) return shared;
  // Let Vite resolve it normally rather than aliasing to a path that is not there.
  return null;
}

/** Alias entry only when we can point at a directory that actually exists. */
function aliasIfPresent(find: string, pkg: string, subPath = "") {
  const dir = pkgDir(pkg);
  return dir ? [{ find, replacement: subPath ? path.join(dir, subPath) : dir }] : [];
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.join(__dirname, "./src") },
      { find: "@assets", replacement: path.resolve(__dirname, "./src/assets") },
      { find: "@utils", replacement: path.resolve(__dirname, "./src/utils") },
      // DevExpress + its UMD friends. Each is skipped when the package is not on
      // disk, so plain node_modules resolution takes over.
      ...aliasIfPresent("devexpress-reporting", "devexpress-reporting"),
      ...aliasIfPresent("@devexpress/analytics-core", "@devexpress/analytics-core"),
      ...aliasIfPresent("devextreme", "devextreme"),
      ...aliasIfPresent("knockout", "knockout", "build/output/knockout-latest.js"),
      ...aliasIfPresent("jquery", "jquery", "dist/jquery.js"),
      // ace-builds is pulled in by the report designer; keep it on the same copy
      // as devexpress so both sides agree on the module instance.
      ...aliasIfPresent("ace-builds", "ace-builds"),
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
