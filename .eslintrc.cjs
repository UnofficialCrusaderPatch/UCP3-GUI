// Tutorial: https://dev.to/drunckj/setting-up-code-formatting-with-eslint-typescript-and-prettier-in-visual-studio-code-44an
module.exports = {
  extends: [
    // These are taken from https://github.com/electron-react-boilerplate/eslint-config-erb
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    // By extending from a plugin config, we can get recommended rules without having to add them manually.
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:import/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:promise/recommended',
    // "plugin:compat/recommended",
    'plugin:@typescript-eslint/recommended',
    // "plugin:prettier/recommended",
    // This disables the formatting rules in ESLint that Prettier is going to be responsible for handling.
    // Make sure it's always the last config, so it gets the chance to override other configs.
    'eslint-config-prettier',
  ],
  env: {
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  settings: {
    react: {
      // Tells eslint-plugin-react to automatically detect the version of React to use.
      version: 'detect',
    },
    // Tells eslint how to resolve imports
    'import/resolver': {
      node: {
        paths: ['src'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
  rules: {
    // Add your own rules here to override ones from the extended configs.
    // suppress errors for missing 'import React' in files
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    'prettier/prettier': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-console': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  plugins: ['prettier'],
};
