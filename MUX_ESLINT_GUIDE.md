# MUX Integration ESLint Configuration Guide

This document outlines the ESLint configuration specifically designed for MUX video streaming integration in our Next.js application.

## Overview

Our ESLint configuration is structured in layers to provide appropriate rule strictness based on the type of code:

1. **Global Rules** - Applied to all files with warnings
2. **MUX-Specific Rules** - Strict rules for video streaming code
3. **API Route Rules** - Enhanced security for webhook endpoints
4. **Test Rules** - Relaxed rules for testing files
5. **Lexical Playground Rules** - Relaxed rules for editor components

## Rule Categories

### 🎥 Video Streaming & Media Handling

#### Async/Await Patterns

- `prefer-const`: Enforces immutable variables for video state
- `no-var`: Prevents `var` usage in favor of `let`/`const`
- `require-await`: Ensures async functions actually use await
- `no-return-await`: Prevents redundant await on return statements
- `prefer-promise-reject-errors`: Ensures proper error objects in rejections

#### Video Player Components

- `react-hooks/exhaustive-deps`: Enhanced to include video-specific hooks:
  - `useVideoPlayer`
  - `useMuxPlayer`
  - `useVideoAnalytics`
  - `useVideoState`

#### Performance Optimization

- `no-await-in-loop`: Prevents blocking video processing loops
- `no-promise-executor-return`: Ensures proper promise handling
- `react/jsx-no-bind`: Strict for video components to prevent re-renders

### 🔒 Security & Validation

#### MUX API Security

- `no-script-url`: Prevents script injection in video URLs
- `no-eval`: Blocks eval usage for security
- `no-implied-eval`: Prevents indirect eval usage

#### Webhook Security

- `no-restricted-globals`: Enforces proper Buffer imports for webhook validation
- `consistent-return`: Ensures all code paths return values
- `default-case`: Requires default cases in switch statements

### 📊 Data Handling

#### MUX Asset Management

- `no-underscore-dangle`: Allows MUX-specific private properties:
  - `__playbackId`
  - `__assetId`
  - `__muxData`
- `object-shorthand`: Enforces ES6 object syntax
- `prefer-destructuring`: Encourages destructuring for cleaner code

#### Video Analytics

- `no-param-reassign`: Allows modification of specific video-related objects:
  - `muxData`
  - `videoState`
  - `playerState`

### 🎛️ Component Patterns

#### MUX Player Configuration

- `react/jsx-boolean-value`: Enforces implicit boolean props
- `react/jsx-curly-brace-presence`: Prevents unnecessary braces
- `react/jsx-pascal-case`: Allows MUX web components:
  - `mux-player`
  - `mux-video`
  - `mux-audio`

#### Video Component Optimization

- `react/jsx-no-constructed-context-values`: Prevents context re-creation
- `react/jsx-no-useless-fragment`: Removes unnecessary fragments
- `react/no-unstable-nested-components`: Prevents component re-creation

### ♿ Accessibility

#### Video Player Accessibility

- `jsx-a11y/media-has-caption`: Ensures video captions (strict for video files)
- `jsx-a11y/no-autoplay`: Prevents autoplay for accessibility

### 🚨 Error Handling

#### Video-Specific Error Patterns

- `no-throw-literal`: Ensures proper Error objects
- `prefer-promise-reject-errors`: Enforces Error objects in rejections
- `no-implicit-coercion`: Prevents implicit type coercion

#### Console Usage

- `no-console`: Allows `warn`, `error`, `info` for video debugging
- `no-restricted-properties`: Suggests better console methods than `console.log`

## File-Specific Rules

### MUX Integration Files

**Applies to:**

- `**/mux/**/*.{ts,tsx}`
- `**/video/**/*.{ts,tsx}`
- `**/streaming/**/*.{ts,tsx}`
- `**/*mux*.{ts,tsx}`
- `**/*video*.{ts,tsx}`
- `**/*player*.{ts,tsx}`

**Strict Rules:**

- All async/await rules are **errors**
- Magic numbers restricted (allows common video values)
- No `console.log` in production code
- Strict accessibility requirements

### API Routes (Webhooks)

**Applies to:**

- `**/api/mux/**/*.{ts,tsx}`
- `**/api/video/**/*.{ts,tsx}`
- `**/api/streaming/**/*.{ts,tsx}`
- `**/api/**/webhook*.{ts,tsx}`
- `**/api/**/upload*.{ts,tsx}`

**Enhanced Security:**

- Strict async patterns
- HTTP status code magic numbers allowed
- Enhanced security validations
- Proper error handling required

### Test Files

**Applies to:**

- `**/__tests__/**/*mux*.{ts,tsx}`
- `**/__tests__/**/*video*.{ts,tsx}`
- `**/*.test.{ts,tsx}`
- `**/*.spec.{ts,tsx}`

**Relaxed Rules:**

- Console logging allowed
- Magic numbers allowed
- TypeScript `any` allowed for mocks
- Non-null assertions allowed

### Lexical Playground

**Applies to:**

- `**/lexical-playground/**/*.{ts,tsx}`

**Relaxed Rules:**

- Underscore dangles allowed (Lexical convention)
- Unused variables allowed
- Most style rules disabled

## Best Practices

### 1. Video Player Implementation

```typescript
// ✅ Good - Proper async handling
const handleVideoLoad = async () => {
  try {
    const metadata = await player.getVideoMetadata();
    setVideoState(metadata);
  } catch (error) {
    console.error('Failed to load video:', error);
  }
};

// ❌ Bad - Missing error handling
const handleVideoLoad = async () => {
  const metadata = await player.getVideoMetadata();
  setVideoState(metadata);
};
```

### 2. MUX Webhook Validation

```typescript
// ✅ Good - Proper Buffer import
import { Buffer } from 'node:buffer';

const validateWebhook = (signature: string, body: string) => {
  const hash = Buffer.from(signature, 'hex');
  // ... validation logic
};

// ❌ Bad - Global Buffer usage
const validateWebhook = (signature: string, body: string) => {
  const hash = Buffer.from(signature, 'hex'); // ESLint error
};
```

### 3. Video Component Accessibility

```typescript
// ✅ Good - Accessible video player
<mux-player
  playback-id={playbackId}
  metadata={{
    video_title: "Video Title",
    viewer_user_id: userId
  }}
  captions="auto"
  autoplay={false}
/>

// ❌ Bad - Missing accessibility features
<mux-player
  playback-id={playbackId}
  autoplay // ESLint error
/>
```

### 4. Error Handling Patterns

```typescript
// ✅ Good - Proper error objects
const uploadVideo = async (file: File) => {
  if (!file) {
    throw new Error('File is required');
  }
  // ... upload logic
};

// ❌ Bad - Throwing literals
const uploadVideo = async (file: File) => {
  if (!file) {
    throw 'File is required'; // ESLint error
  }
};
```

## Configuration Commands

### Run Linting

```bash
# Check all files
pnpm lint

# Check specific MUX files
pnpm lint "**/mux/**/*.{ts,tsx}"

# Fix auto-fixable issues
pnpm lint --fix
```

### Disable Rules (When Necessary)

```typescript
// Disable for specific lines
// eslint-disable-next-line no-console
console.log('Debug video state:', videoState);

// Disable for entire file (use sparingly)
/* eslint-disable no-magic-numbers */
```

## Integration with CI/CD

The ESLint configuration is designed to:

- **Pass** with warnings in development
- **Fail** on errors in CI/CD
- Provide **helpful messages** for video-specific issues
- **Scale** as the MUX integration grows

## Extending the Configuration

To add new MUX-specific rules:

1. Add patterns to the appropriate `files` array
2. Define rules in the corresponding `rules` object
3. Test with existing MUX code
4. Update this documentation

## Troubleshooting

### Common Issues

1. **"Unexpected console statement"**

   - Use `console.warn`, `console.error`, or `console.info`
   - Or disable for debugging: `// eslint-disable-next-line no-console`

2. **"Magic number" warnings**

   - Define constants for video-specific values
   - Or add to the `ignore` array if commonly used

3. **"Missing await expression"**

   - Remove `async` if not using `await`
   - Or add proper `await` usage

4. **Accessibility warnings**
   - Add captions to video players
   - Disable autoplay
   - Provide proper ARIA labels

This configuration ensures high-quality, secure, and accessible MUX video streaming integration while maintaining developer productivity.
