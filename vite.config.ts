
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Strategy to break the deployment loop:
// In Cloud Run, the project directory is often mounted via GCS Fuse which is slow and unstable for heavy write operations.
// We switch BOTH the build output AND the Vite cache to the system's temporary directory (/tmp) which is RAM-based.
const isCloudEnvironment = process.env.K_SERVICE || process.env.PORT;
const buildOutput = isCloudEnvironment ? '/tmp/build' : 'build';
const cacheLocation = isCloudEnvironment ? '/tmp/.vite' : 'node_modules/.vite';

export default defineConfig({
  plugins: [react()],
  cacheDir: cacheLocation, // CRITICAL FIX: Prevent writing cache to node_modules on GCS Fuse
  // CRITICAL: Explicitly inject the API Key into the browser code
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  build: {
    outDir: buildOutput, 
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react-dom/client',
        '@google/genai',
        'recharts',
        'lucide-react'
      ]
    }
  },
  server: {
    host: true,
    port: 8080
  }
});
