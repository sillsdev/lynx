import { fixFolderImportsPlugin } from './fix-folder-imports-plugin.js';
import { fixExtensionsPlugin } from './fix-extensions-plugin.js';
import { defineConfig } from 'tsup';

export default (config = { hasLocalizations: false }) => {
  let configOptions = {};
  if (config.hasLocalizations) {
    configOptions = {
      ...configOptions,
      onSuccess: 'cpy "src/**/locales/**" dist',
      esbuildOptions(options) {
        options.supported = {
          'import-attributes': true,
        };
      },
    };
  }

  return defineConfig({
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    dts: true,
    clean: true,
    format: ['esm', 'cjs'],
    bundle: false,
    esbuildPlugins: [fixFolderImportsPlugin(), fixExtensionsPlugin()],
    ...configOptions,
  });
};
