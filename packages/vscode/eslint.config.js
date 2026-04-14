import library from '@repo/eslint-config/library.js';

export default [
  {
    ignores: ['types/vscode.proposed.chatParticipantAdditions.d.ts'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  ...library,
];
