import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: ".",  // <-- points to your index.html
  base: "/admin/",                           // <-- important for Render routing
  build: {
    outDir: path.resolve(__dirname, "dis"),  // <-- build goes here
    emptyOutDir: true
  }
});

