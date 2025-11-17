import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: ".",  // <-- points to your index.html

  build: {
    outDir: path.resolve(__dirname, "build"),  // <-- build goes here
    emptyOutDir: true
  }
});

