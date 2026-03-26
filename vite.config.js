import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const finalAdapter = process.env.VITE_DB_ADAPTER || env.VITE_DB_ADAPTER || 'supabase';

  return {
    plugins: [react()],
    base: '/ff14-raid-scheduler/',
    define: {
      'import.meta.env.VITE_DB_ADAPTER': JSON.stringify(finalAdapter),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      testTransformMode: {
        web: ['**/*']
      },
      server: {
        deps: {
          inline: true
        }
      }
    }
  }
})
