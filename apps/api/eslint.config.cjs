const base = require('@starium-orchestra/config');

module.exports = [
  ...base,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: [
      '**/*.spec.ts',
      '**/*.integration.spec.ts',
      'src/**/tests/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: [
      '**/*.spec.ts',
      '**/*.integration.spec.ts',
      'src/**/tests/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
