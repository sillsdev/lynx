import library from '@repo/eslint-config/library.mjs';

export default [
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  ...library,
];
