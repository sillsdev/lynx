import library from '@repo/eslint-config/library.js';

export default [
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  ...library,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
