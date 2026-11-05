import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import localMealApi from "./scripts/local-meal-api.mjs";

export default defineConfig({
  plugins: [react(), localMealApi()],
});
