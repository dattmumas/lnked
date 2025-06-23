import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import unusedImportsPluginRaw from 'eslint-plugin-unused-imports';
import unicornPlugin from 'eslint-plugin-unicorn';
// import securityNodePlugin from 'eslint-plugin-security-node'; // Temporarily disabled due to plugin crash

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Some plugins export as CommonJS, others as ESM default; normalise here
const unusedImportsPlugin =
  (unusedImportsPluginRaw && unusedImportsPluginRaw.default) ||
  unusedImportsPluginRaw;

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const eslintConfig = [
  {
    // Ignore **all** test files entirely; they remain un‑linted
    ignores: [
      // Test files
      '**/__tests__/**/*',
      '**/*.test.*',
      '**/*.spec.*',

      // Generated files
      'src/types/database.types.ts',
      'src/lib/database.types.ts',
      'src/lib/database.types.updated.ts',

      // Data access layer
      'src/lib/data-access/**/*',

      // Lexical editor files (third-party code)
      'src/components/editor/nodes/**/*',
      'src/components/editor/plugins/**/*',
      'src/components/editor/themes/**/*',
      'src/components/editor/ui/**/*',
      'src/components/editor/utils/**/*',
      'src/components/editor/hooks/**/*',
      'src/components/editor/images/**/*',
      'src/components/editor/context/**/*',
      'src/components/editor/config/**/*',
      'src/components/editor/**/*',

      // Landing page files
      'src/components/landing/**/*',

      // Scripts directory
      'src/scripts/**/*',

      // Build outputs
      '.next/**',
      'out/**',
      'build/**',
      '.vercel/**',

      // Dependencies
      'node_modules/**',
      '.pnp/**',
      '.yarn/**',

      // Coverage
      'coverage/**',

      // Env files
      'next-env.d.ts',

      // Misc
      '*.tsbuildinfo',
      'public/**',
      '.swc/**',
      '.idea/**',
      '.vscode/**',
      '.cursor/**',
      'cursor-memory-bank/**',

      // Scripts and database
      '**/*.sh',
      'supabase/**',

      // Config files that shouldn't be linted
      'eslint.config.mjs',
      'run-eslint-json.mjs',
      'test-fix.mjs',
      'postcss.config.mjs',
      'jest.config.js',
      'supabase-image-loader.js',

      // Other files
      '**/*.json',
      '**/*.md',
      '**/*.css',
      '**/*.scss',
      '**/*.svg',
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.ico',
      '**/*.webp',
      '**/*.mp4',
      '**/*.webm',
      '**/*.ogg',
      '**/*.mp3',
      '**/*.wav',
      '**/*.flac',
      '**/*.aac',
      '**/*.woff',
      '**/*.woff2',
      '**/*.eot',
      '**/*.ttf',
      '**/*.otf',
    ],
  },
  {
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImportsPlugin,
      unicorn: unicornPlugin,
      // 'security-node': securityNodePlugin, // Temporarily disabled due to plugin crash
    },
  },
  ...compat.extends(
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'next/core-web-vitals',
    'next/typescript',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:import/recommended',
    // 'plugin:security-node/recommended', // Temporarily disabled due to plugin crash
    'plugin:react/jsx-runtime',
  ),
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImportsPlugin,
      unicorn: unicornPlugin,
      // 'security-node': securityNodePlugin, // Temporarily disabled due to plugin crash
    },
    rules: {
      // CORE SAFETY RULES
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implicit-coercion': 'error',
      'no-unsafe-finally': 'error',
      'no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1], // allow common defaults
          ignoreArrayIndexes: true,
        },
      ],

      // IMPORT / SECURITY / UNICORN BEST‑PRACTICE
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-cycle': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unicorn/no-null': 'off', // Disabled project-wide: database uses null, keeping consistency
      'unicorn/prefer-switch': 'error',
      'jsx-a11y/no-autofocus': 'error',

      // TYPESCRIPT SAFETY
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',

      // REACT/HOOKS
      'react/jsx-no-bind': 'error',
      'react/no-unescaped-entities': 'error',
      'react/display-name': 'error',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/jsx-curly-brace-presence': [
        'error',
        { props: 'never', children: 'never' },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',

      // ACCESSIBILITY
      'jsx-a11y/media-has-caption': 'error',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',

      // NEXT.JS
      '@next/next/no-img-element': 'error',

      // MISC
      'object-shorthand': 'error',
      'quote-props': ['error', 'as-needed'],
      'prefer-destructuring': [
        'error',
        { array: false, object: true },
        { enforceForRenamedProperties: false },
      ],
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['acc', 'ctx', 'req', 'res', 'state'],
        },
      ],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-process-exit': 'error',
      'no-script-url': 'error',
      'no-underscore-dangle': [
        'error',
        { allow: [], allowAfterThis: false, allowAfterSuper: false },
      ],
      'no-promise-executor-return': 'error',
      'prefer-template': 'error',
      'template-curly-spacing': ['error', 'never'],
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: false }],
      'react/jsx-no-constructed-context-values': 'error',
      'react/no-object-type-as-default-prop': 'error',
      'react/no-unstable-nested-components': ['error', { allowAsProps: false }],
      'no-unneeded-ternary': 'error',
    },
  },
  {
    // TEST FILES: RELAX RULES FOR TESTING ONLY
    files: [
      '**/__tests__/**/*.{ts,tsx,js,jsx}',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: null,
      },
    },
    rules: {
      'no-console': 'off',
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-array-delete': 'off',
      'no-underscore-dangle': 'off',
      'prefer-const': 'off',
      'no-unused-vars': 'off',
      'require-await': 'off',
      'no-return-await': 'off',
      'react/jsx-no-bind': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/strict-boolean-expressions': 'warn',
      'no-magic-numbers': [
        'warn',
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
        },
      ],
      'react/jsx-no-bind': 'warn',
      'consistent-return': 'warn',
      'require-await': 'warn',
      'no-return-await': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/exhaustive-deps': 'warn',
      'no-param-reassign': [
        'warn',
        {
          props: true,
          ignorePropertyModificationsFor: ['acc', 'ctx', 'req', 'res', 'state'],
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-underscore-dangle': ['warn', { allow: [], allowAfterThis: false }],
      'no-promise-executor-return': 'warn',
      'react/jsx-no-useless-fragment': ['warn', { allowExpressions: false }],
      'react/no-unescaped-entities': 'warn',
      '@next/next/no-img-element': 'warn',
      eqeqeq: ['warn', 'always'],
      'no-restricted-properties': 'warn',
      'no-alert': 'warn',
      'jsx-a11y/aria-role': 'warn',
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
    },
  },
  // CONSTANTS FILES OVERRIDE – bank numeric literals here without linter noise
  {
    files: ['src/lib/constants/**/*.ts'],
    rules: {
      'no-magic-numbers': 'off',
    },
  },

  // FINAL TEST OVERRIDE TO ENSURE CRITICAL RULES ARE DISABLED FOR FILES NOT INCLUDED IN TS PROJECT
  {
    files: [
      '**/__tests__/**/*.{ts,tsx,js,jsx}',
      '**/*.test.{ts,tsx,js,jsx}',
      '**/*.spec.{ts,tsx,js,jsx}',
    ],
    rules: {
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-array-delete': 'off',
    },
  },
];

export default eslintConfig;
