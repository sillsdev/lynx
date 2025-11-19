import { defineConfig } from 'tsdown';

export default (config = { hasLocalizations: false }) => {
  let configOptions = {};
  if (config.hasLocalizations) {
    configOptions = {
      ...configOptions,
      onSuccess: 'cpy "src/**/locales/**" dist',
    };
  }

  return defineConfig({
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    dts: true,
    clean: true,
    format: ['esm', 'cjs'],
    unbundle: true,
    ...configOptions,
  });
};
