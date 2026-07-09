import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `${process.env.VITE_API_BASE_URL || 'http://localhost:8000'}`,
        changeOrigin: true,
        // NOTE: no rewrite — Django mounts everything under /api/ too
        // secure: false,
      },
    },
  },

})



// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';

// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: {
//       '@': path.resolve(__dirname, './src'),
//     },
//   },
// });
