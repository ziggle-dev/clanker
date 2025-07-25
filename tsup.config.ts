import { defineConfig } from 'tsup'

export default defineConfig([
  // Main bundle
  {
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
  },
  // Built-in tools - compile each tool separately
  {
    entry: ['src/tools/dynamic/*.tsx'],
    format: ['esm'],
    dts: false,
    skipNodeModulesBundle: true,
    clean: false,
    target: 'node20', 
    platform: 'node',
    splitting: false,
    sourcemap: false,
    minify: false,
    bundle: false, // Don't bundle, just transpile
    outDir: 'dist',
    // Keep the directory structure
    esbuildOptions(options) {
      options.outbase = 'src'
    }
  }
])