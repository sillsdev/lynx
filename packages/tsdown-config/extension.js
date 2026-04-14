import { defineConfig } from 'tsdown';

export default () => {
  return defineConfig({
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    dts: false,
    clean: true,
    format: ['esm'],
    unbundle: true,
    external: ['vscode', /^@sillsdev\//],
  });
};
