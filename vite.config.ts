import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  
  // Performance optimizations
  build: {
    // Enable code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          icons: ['lucide-react'],
          utils: ['axios', 'bcryptjs']
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    // Enable source maps for debugging but smaller
    sourcemap: false
  },
  
  // Development optimizations
  server: {
    // Enable HMR for faster development
    hmr: true,
    // Faster startup
    warmup: {
      clientFiles: [
        './app/routes/_adminLayout.tsx',
        './app/routes/login.tsx',
        './app/routes/dashboard/index.tsx'
      ]
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['axios', 'lucide-react', 'react', 'react-dom', 'react-router-dom'],
    force: true
  }
});
