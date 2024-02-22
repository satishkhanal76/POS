import react from "@vitejs/plugin-react";

import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import dotenv from "dotenv";

export interface ENV {
  BASE_URL: string;
}

const process = dotenv.config().parsed;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({ registerType: "autoUpdate" })],
  base: process?.BASE_URL,
});
