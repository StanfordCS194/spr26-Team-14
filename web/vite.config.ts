import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.VITE_API_PORT || "3000";

  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Bind all interfaces so localhost / 127.0.0.1 / LAN URLs all reach the dev server.
      host: true,
      strictPort: true,
      // Hot reload uses a WebSocket; some embedded/preview browsers never complete the handshake
      // and the tab keeps loading. Disabling HMR fixes that (refresh the page after edits).
      hmr: false,
      warmup: {
        clientFiles: ["./index.html", "./src/main.tsx", "./src/App.tsx"],
      },
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${apiPort}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
