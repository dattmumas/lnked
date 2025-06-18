#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

console.log('Running ESLint with JSON format...');

try {
  // Run ESLint with JSON format
  const output = execSync('pnpm eslint --format json .', {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50, // 50MB buffer for large outputs
  });

  // Parse and pretty-print the JSON
  const jsonData = JSON.parse(output);
  const prettyJson = JSON.stringify(jsonData, null, 2);

  // Write to file
  writeFileSync('eslint.json', prettyJson);

  console.log('✅ ESLint report generated successfully: eslint.json');

  // Show summary
  const totalFiles = jsonData.length;
  const filesWithErrors = jsonData.filter((file) => file.errorCount > 0).length;
  const filesWithWarnings = jsonData.filter(
    (file) => file.warningCount > 0,
  ).length;
  const totalErrors = jsonData.reduce((sum, file) => sum + file.errorCount, 0);
  const totalWarnings = jsonData.reduce(
    (sum, file) => sum + file.warningCount,
    0,
  );

  console.log('\nSummary:');
  console.log(`- Total files analyzed: ${totalFiles}`);
  console.log(`- Files with errors: ${filesWithErrors}`);
  console.log(`- Files with warnings: ${filesWithWarnings}`);
  console.log(`- Total errors: ${totalErrors}`);
  console.log(`- Total warnings: ${totalWarnings}`);
} catch (error) {
  // ESLint exits with non-zero code when there are lint errors
  // But the output is still valid JSON, so we try to parse it
  if (error.stdout) {
    try {
      const jsonData = JSON.parse(error.stdout);
      const prettyJson = JSON.stringify(jsonData, null, 2);

      writeFileSync('eslint.json', prettyJson);

      console.log('✅ ESLint report generated (with lint errors): eslint.json');

      // Show summary
      const totalFiles = jsonData.length;
      const filesWithErrors = jsonData.filter(
        (file) => file.errorCount > 0,
      ).length;
      const filesWithWarnings = jsonData.filter(
        (file) => file.warningCount > 0,
      ).length;
      const totalErrors = jsonData.reduce(
        (sum, file) => sum + file.errorCount,
        0,
      );
      const totalWarnings = jsonData.reduce(
        (sum, file) => sum + file.warningCount,
        0,
      );

      console.log('\nSummary:');
      console.log(`- Total files analyzed: ${totalFiles}`);
      console.log(`- Files with errors: ${filesWithErrors}`);
      console.log(`- Files with warnings: ${filesWithWarnings}`);
      console.log(`- Total errors: ${totalErrors}`);
      console.log(`- Total warnings: ${totalWarnings}`);

      process.exit(0);
    } catch (parseError) {
      console.error('❌ Failed to parse ESLint output as JSON');
      console.error('Raw output:', error.stdout);
      process.exit(1);
    }
  } else {
    console.error('❌ ESLint failed with error:', error.message);
    process.exit(1);
  }
}
