const tseslint = require('typescript-eslint');

module.exports = [
  ...tseslint.config({
    extends: [...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  }),
  {
    files: ['**/eslint.config.js', '**/eslint.config.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];
