import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Writes this build's version and full list of hashed files into dist/sw.js and dist/version.json.
 * The service worker precaches them, and the app compares version.json to spot a newer deploy.
 */
function swManifest(): Plugin {
  const version = Date.now().toString(36);
  let outDir = 'dist';
  return {
    name: 'merhav-sw-manifest',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    define: undefined,
    config: () => ({ define: { __MERHAV_VERSION__: JSON.stringify(version) } }),
    writeBundle(_opts, bundle) {
      const assets = Object.keys(bundle).filter((f) => f.startsWith('assets/')).map((f) => '/' + f);
      const sw = resolve(outDir, 'sw.js');
      try {
        const src = readFileSync(sw, 'utf8');
        writeFileSync(sw, src.replace("'__MERHAV_VERSION__'", JSON.stringify(version)).replace('__MERHAV_ASSETS__', JSON.stringify(assets)));
      } catch {
        /* the mirror build has no service worker */
      }
      writeFileSync(resolve(outDir, 'version.json'), JSON.stringify({ version }));
    },
  } as Plugin;
}

export default defineConfig({
  // relative asset paths for the GitHub-hosted mirror (VITE_HASH=1); absolute for Vercel
  base: process.env.VITE_HASH ? './' : '/',
  plugins: [react(), swManifest()],
  test: { environment: 'node' },
} as never);
