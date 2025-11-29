
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Detección precisa del entorno de despliegue
const isVercel = process.env.VERCEL === '1';
const isCloudRun = process.env.K_SERVICE || (process.env.PORT && !isVercel);

// Configuración de Rutas
// Vercel espera 'dist'. Cloud Run necesita '/tmp/dist' para evitar errores de escritura en GCS Fuse.
let buildOutput = 'dist';
let cacheLocation = 'node_modules/.vite';

if (isCloudRun) {
  console.log('Configuring for Cloud Run environment...');
  buildOutput = '/tmp/dist';
  cacheLocation = '/tmp/.vite';
} else {
  console.log('Configuring for Standard/Vercel environment (Output: dist)...');
}

export default defineConfig({
  plugins: [react()],
  cacheDir: cacheLocation,
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_GOOGLE_API_KEY || process.env.API_KEY)
  },
  build: {
    outDir: buildOutput, 
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: [
        // No externalizar React para evitar conflictos en Vercel
      ]
    }
  },
  server: {
    host: true,
    port: 8080
  }
});
