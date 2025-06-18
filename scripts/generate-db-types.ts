#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

/**
 * Generate Database Types
 * 
 * This script reads the Supabase-generated database types and creates
 * transformed versions where all nullable fields use undefined instead of null.
 * This allows us to maintain ESLint compliance while working with Supabase.
 */

const SUPABASE_TYPES_PATH = path.join(process.cwd(), 'src/lib/database.types.ts');
const OUTPUT_PATH = path.join(process.cwd(), 'src/lib/data-access/generated/db-types.ts');

async function generateTypes(): Promise<void> {
  try {
    // Read the Supabase types file
    const content = await fs.readFile(SUPABASE_TYPES_PATH, 'utf-8');
    
    // Transform null to undefined in type definitions
    let transformed = content
      // Replace `: type | null` with `?: type`
      .replace(/: ([\w\[\]]+) \| null/g, '?: $1')
      // Replace `: type | null;` with `?: type;`
      .replace(/: ([\w\[\]]+) \| null;/g, '?: $1;')
      // Handle complex types like Json | null
      .replace(/: (Json|unknown) \| null/g, '?: $1')
      // Handle nullable arrays
      .replace(/: ([\w]+)\[\] \| null/g, '?: $1[]');
    
    // Add header comment
    const header = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * This file is generated from src/lib/database.types.ts
 * All nullable fields have been transformed to use undefined instead of null
 * to maintain ESLint compliance throughout the application.
 * 
 * Run 'pnpm generate:db-types' to regenerate this file.
 */

`;
    
    transformed = header + transformed;
    
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write the transformed file
    await fs.writeFile(OUTPUT_PATH, transformed, 'utf-8');
    
    console.log('✅ Generated transformed database types at:', OUTPUT_PATH);
  } catch (error) {
    console.error('❌ Error generating database types:', error);
    process.exit(1);
  }
}

// Run the generator
void generateTypes(); 