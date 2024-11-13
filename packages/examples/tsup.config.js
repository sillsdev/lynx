import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  dts: true,
  clean: true,
  format: ['esm', 'cjs'],
  bundle: true,
  onSuccess: 'copy-folder src/locales dist/locales',
  esbuildPlugins: [esbuildPluginFilePathExtensions({ esmExtension: 'js' })],
  esbuildOptions(options) {
    options.supported = {
      'import-attributes': true,
    };
  },
});
