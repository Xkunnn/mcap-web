import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

export default defineConfig({
  server: {
    host: "localhost",
    port: 3000,
  },

  plugins: [
    vinext(),
    sites(),
  ],
});
