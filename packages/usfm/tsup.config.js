import { fixImportsPlugin } from 'esbuild-fix-imports-plugin';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  dts: true,
  clean: true,
  format: ['esm', 'cjs'],
  bundle: false,
  esbuildPlugins: [fixImportsPlugin()],
});
