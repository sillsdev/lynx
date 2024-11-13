import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  dts: true,
  clean: true,
  format: ['esm', 'cjs'],
  bundle: true,
  esbuildPlugins: [esbuildPluginFilePathExtensions({ esmExtension: 'js' })],
});
