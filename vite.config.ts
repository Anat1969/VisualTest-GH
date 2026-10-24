import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // relative asset paths for the GitHub-hosted mirror (VITE_HASH=1); absolute for Vercel
  base: process.env.VITE_HASH ? './' : '/',
  plugins: [react()],
  test: { environment: 'node' },
} as never);
