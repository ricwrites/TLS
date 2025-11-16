import { defineConfig} from "vite";

export default defineConfig ({
root: ".",
build: {
    outDir: "dis",
},
server: {
    port: 5174,
    open: true,
    },
});
