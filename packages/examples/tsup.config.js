import { fixImportsPlugin } from 'esbuild-fix-imports-plugin';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  dts: true,
  clean: true,
  format: ['esm', 'cjs'],
  bundle: false,
  onSuccess: 'copy-folder src/locales dist/locales',
  esbuildPlugins: [fixImportsPlugin()],
  esbuildOptions(options) {
    options.supported = {
      'import-attributes': true,
    };
  },
});
