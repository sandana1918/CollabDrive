import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const railwayHosts = [".up.railway.app", "collabdrive-client-production.up.railway.app"];

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: railwayHosts
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: railwayHosts
  }
});
