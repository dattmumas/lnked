// .eslintrc.cjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // Next.js core + TS + React + accessibility + import + Prettier
  ...compat.extends(
    'next/core-web-vitals',
    'next/typescript',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier',
  ),

  // ───────────────────────────────────────────────────────────────────────────────
  // Global rules for production readiness
  {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
      project: './tsconfig.json',
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': { typescript: {} },
    },
    env: {
      browser: true,
      node: true,
      es6: true,
    },
    rules: {
      //
      // ─── STRICT SAFETY (ERROR) ────────────────────────────────────────────────
      //
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'consistent-return': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-var': 'error',
      'prefer-const': 'error',
      'import/no-unresolved': 'error',
      'import/no-extraneous-dependencies': [
        'error',
        { devDependencies: false },
      ],
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',

      //
      // ─── RECOMMENDED WARNINGS ──────────────────────────────────────────────────
      //
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-floating-promises': 'warn',
      'import/order': [
        'warn',
        { 'newlines-between': 'always', alphabetize: { order: 'asc' } },
      ],
      'react/display-name': 'warn',
      'react/jsx-boolean-value': ['warn', 'never'],
      'react/jsx-curly-brace-presence': [
        'warn',
        { props: 'never', children: 'never' },
      ],
      'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'warn',
      'no-return-await': 'warn',
      'prefer-promise-reject-errors': 'warn',
      'template-curly-spacing': ['warn', 'never'],

      //
      // ─── ALLOW COSMETIC / LOW-RISK (OFF) ──────────────────────────────────────
      //
      'react/jsx-no-bind': 'off',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'off',
      'jsx-a11y/no-autofocus': 'off',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────
  // Lexical editor files (migrated from playground) – RELAXED RULES
  {
    files: ['**/editor/**/*.{ts,tsx}'],
    rules: {
      'no-underscore-dangle': 'off',
      'no-unused-vars': 'off',
      'prefer-destructuring': 'off',
      'no-param-reassign': 'off',
      'consistent-return': 'off',
      'no-magic-numbers': 'off',
      'prefer-template': 'off',
      'object-shorthand': 'off',
      'react/jsx-boolean-value': 'off',
      'react/jsx-curly-brace-presence': 'off',
      'no-nested-ternary': 'off',
      'react/no-unstable-nested-components': 'off',
      'no-implicit-coercion': 'off',
      'array-callback-return': 'off',
      'require-await': 'off',
      'no-return-await': 'off',
    },
  },
];
