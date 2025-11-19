import { defineConfig } from 'tsdown';

export default () => {
  return defineConfig({
    entry: ['src/**/*.ts', '!src/**/*.test.ts'],
    dts: false,
    clean: true,
    format: ['cjs'],
    unbundle: true,
    external: ['vscode', /^@sillsdev\//],
  });
};
