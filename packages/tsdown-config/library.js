import { defineConfig } from 'tsdown';

export default (config = { hasLocalizations: false }) => {
  let configOptions = {};
  if (config.hasLocalizations) {
    configOptions = {
      ...configOptions,
      copy: { from: 'src/**/locales/**', flatten: false },
    };
  }

  return defineConfig({
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    dts: true,
    clean: true,
    format: ['esm', 'cjs'],
    unbundle: true,
    skipNodeModulesBundle: true,
    ...configOptions,
  });
};
