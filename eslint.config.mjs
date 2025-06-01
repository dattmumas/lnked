import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Core MUX Integration Rules - Applied globally but with warnings

      // Async/Await patterns for MUX API calls
      'prefer-const': 'warn',
      'no-var': 'error',

      // Video streaming and media handling
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info'], // Allow logging for video debugging
        },
      ],

      // MUX API and webhook security
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Async patterns for video processing
      'require-await': 'warn',
      'no-return-await': 'warn',
      'prefer-promise-reject-errors': 'warn',

      // MUX data handling and validation - relaxed
      'no-magic-numbers': ['off'], // Disabled globally, enabled for MUX files

      // Video player and component patterns
      'react-hooks/exhaustive-deps': [
        'warn',
        {
          additionalHooks:
            '(useVideoPlayer|useMuxPlayer|useVideoAnalytics|useVideoState)',
        },
      ],

      // MUX webhook and API error handling
      'no-throw-literal': 'warn',
      'prefer-destructuring': [
        'warn',
        {
          array: false,
          object: true,
        },
        {
          enforceForRenamedProperties: false,
        },
      ],

      // Video metadata and asset management
      'object-shorthand': 'warn',
      'quote-props': ['warn', 'as-needed'],

      // MUX streaming URL and security
      'no-script-url': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // Video component lifecycle - relaxed
      'react/jsx-no-bind': ['warn'], // Allow arrow functions with warnings

      // MUX player configuration
      'react/jsx-boolean-value': ['warn', 'never'],
      'react/jsx-curly-brace-presence': [
        'warn',
        {
          props: 'never',
          children: 'never',
        },
      ],

      // Video analytics and tracking
      'no-param-reassign': [
        'warn',
        {
          props: true,
          ignorePropertyModificationsFor: [
            'acc',
            'accumulator',
            'e',
            'ctx',
            'context',
            'req',
            'request',
            'res',
            'response',
            'state',
            'muxData',
            'videoState',
            'playerState',
            'dom',
          ],
        },
      ],

      // MUX asset and playback ID handling - relaxed for Lexical
      'no-underscore-dangle': ['off'], // Disabled globally due to Lexical usage

      // Video streaming performance
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'warn',

      // MUX webhook validation
      'consistent-return': 'warn',
      'default-case': 'warn',
      'default-case-last': 'warn',

      // MUX configuration and environment
      'no-process-env': 'off', // Allow process.env for MUX credentials
      'no-process-exit': 'error',

      // Video component naming
      'react/jsx-pascal-case': [
        'warn',
        {
          allowAllCaps: true,
          ignore: ['mux-player', 'mux-video', 'mux-audio'],
        },
      ],

      // MUX data transformation
      'array-callback-return': [
        'warn',
        {
          allowImplicit: false,
          checkForEach: true,
        },
      ],

      // Video streaming error boundaries
      'react/no-unescaped-entities': [
        'warn',
        {
          forbid: ['>', '}', '"'],
        },
      ],

      // MUX API response handling
      'no-nested-ternary': 'warn',
      'no-unneeded-ternary': 'warn',

      // Video player state management
      'react/no-unstable-nested-components': [
        'warn',
        {
          allowAsProps: true,
        },
      ],

      // MUX streaming optimization
      'react/jsx-no-useless-fragment': [
        'warn',
        {
          allowExpressions: true,
        },
      ],

      // Video analytics patterns
      'prefer-template': 'warn',
      'template-curly-spacing': ['warn', 'never'],

      // Video component performance
      'react/jsx-no-constructed-context-values': 'warn',
      'react/no-object-type-as-default-prop': 'warn',

      // MUX player configuration validation
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "CallExpression[callee.name='setTimeout'][arguments.length!=2]",
          message:
            'setTimeout should have exactly 2 arguments for video timing',
        },
        {
          selector:
            "CallExpression[callee.name='setInterval'][arguments.length!=2]",
          message:
            'setInterval should have exactly 2 arguments for video polling',
        },
        {
          selector:
            "CallExpression[callee.property.name='addEventListener'][arguments.0.value='loadstart']",
          message:
            "Consider using 'loadedmetadata' event instead of 'loadstart' for better video loading detection",
        },
      ],

      // Video streaming best practices
      'no-restricted-properties': [
        'warn',
        {
          object: 'console',
          property: 'log',
          message:
            'Consider using console.info, console.warn, or console.error for video debugging instead of console.log',
        },
      ],

      // MUX error handling patterns
      'prefer-promise-reject-errors': 'warn',
      'no-implicit-coercion': 'warn',

      // Accessibility for video players
      'jsx-a11y/media-has-caption': [
        'warn',
        {
          audio: ['Audio'],
          video: ['Video', 'video'],
          track: ['Track', 'track'],
        },
      ],
    },
  },
  {
    // MUX-specific file patterns - STRICT RULES
    files: [
      '**/mux/**/*.{ts,tsx}',
      '**/video/**/*.{ts,tsx}',
      '**/streaming/**/*.{ts,tsx}',
      '**/*mux*.{ts,tsx}',
      '**/*video*.{ts,tsx}',
      '**/*player*.{ts,tsx}',
      '**/components/**/video*.{ts,tsx}',
      '**/components/**/player*.{ts,tsx}',
    ],
    rules: {
      // Stricter rules for MUX integration files
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'], // Only warnings and errors in production MUX code
        },
      ],
      'prefer-const': 'error',
      'no-var': 'error',
      'require-await': 'error',
      'no-return-await': 'error',

      // MUX data handling and validation
      'no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1, 100, 1000, 16, 32, 64, 128, 256, 512, 1024],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
        },
      ],

      // Video streaming performance
      'react-hooks/exhaustive-deps': 'error',
      'react/jsx-no-bind': 'warn',

      // MUX webhook validation
      'consistent-return': 'error',
      'default-case': 'error',

      // Video player accessibility - stricter for video components
      'jsx-a11y/media-has-caption': 'warn',

      // Strict async patterns for video processing
      'no-await-in-loop': 'error',
      'no-promise-executor-return': 'error',

      // Video component optimization
      'react/jsx-no-useless-fragment': 'error',
      'react/jsx-no-constructed-context-values': 'error',

      // MUX asset and playback ID handling
      'no-underscore-dangle': [
        'error',
        {
          allow: ['__playbackId', '__assetId', '__muxData'],
          allowAfterThis: false,
          allowAfterSuper: false,
          enforceInMethodNames: true,
        },
      ],

      // Strict error handling for video
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
    },
  },
  {
    // API routes for MUX webhooks and streaming - STRICT RULES
    files: [
      '**/api/mux/**/*.{ts,tsx}',
      '**/api/video/**/*.{ts,tsx}',
      '**/api/streaming/**/*.{ts,tsx}',
      '**/api/**/webhook*.{ts,tsx}',
      '**/api/**/upload*.{ts,tsx}',
    ],
    rules: {
      // Webhook security and validation
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error', 'info'], // Allow logging for webhook debugging
        },
      ],
      'require-await': 'error',
      'consistent-return': 'error',
      'no-throw-literal': 'error',

      // MUX webhook signature validation
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // API response handling
      'prefer-destructuring': 'error',
      'object-shorthand': 'error',

      // Async patterns for video processing
      'no-await-in-loop': 'error',
      'no-promise-executor-return': 'error',

      // API security patterns
      'no-restricted-globals': [
        'error',
        {
          name: 'Buffer',
          message:
            'Use Node.js buffer import instead of global Buffer for MUX webhook validation',
        },
      ],

      // Strict magic numbers for API routes
      'no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1, 200, 201, 400, 401, 403, 404, 500],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
        },
      ],
    },
  },
  {
    // Test files for MUX integration
    files: [
      '**/__tests__/**/*mux*.{ts,tsx}',
      '**/__tests__/**/*video*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
    rules: {
      // Allow console.log in tests for debugging
      'no-console': 'off',

      // Allow magic numbers in tests
      'no-magic-numbers': 'off',

      // Allow any for test mocks
      '@typescript-eslint/no-explicit-any': 'off',

      // Allow non-null assertions in tests
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Relax other rules for tests
      'no-underscore-dangle': 'off',
      'prefer-const': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    // Lexical editor files (migrated from playground) - RELAXED RULES
    files: ['**/editor/**/*.{ts,tsx}'],
    rules: {
      // Relax rules for Lexical editor code (migrated from playground)
      'no-underscore-dangle': 'off', // Lexical uses many __ prefixed properties
      'no-unused-vars': 'off', // Many unused parameters in Lexical
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

export default eslintConfig;
