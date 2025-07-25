import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  shims: true,
  skipNodeModulesBundle: true,
  clean: true,
  target: 'node20',
  platform: 'node',
  splitting: false,
  sourcemap: true,
  minify: false,
  bundle: true,
  noExternal: [
    // Bundle our internal modules
    /^\./, 
  ],
  external: [
    // Keep all node_modules as external
    /^[^./]/,
  ],
  outDir: 'dist',
})