import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/extension.ts', 'src/server.ts'],
  dts: false,
  clean: true,
  format: ['cjs'],
  external: ['vscode', /^@sillsdev\//],
  sourcemap: true,
  unbundle: true,
});
