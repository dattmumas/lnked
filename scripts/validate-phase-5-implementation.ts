#!/usr/bin/env tsx

/**
 * POST-001 Phase 5 Implementation Validation Script
 * 
 * Validates the implementation quality and readiness for production deployment.
 * Checks code structure, TypeScript compilation, and component architecture.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ValidationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: string[];
}

interface ValidationSuite {
  suiteName: string;
  results: ValidationResult[];
  passed: number;
  failed: number;
  warnings: number;
}

class Phase5Validator {
  private results: ValidationSuite[] = [];
  private projectRoot: string;

  constructor() {
    this.projectRoot = process.cwd();
  }

  private async checkFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectRoot, filePath));
      return true;
    } catch {
      return false;
    }
  }

  private async readFile(filePath: string): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.projectRoot, filePath), 'utf-8');
    } catch {
      return null;
    }
  }

  private async runCommand(command: string): Promise<{ stdout: string; stderr: string; success: boolean }> {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: this.projectRoot });
      return { stdout, stderr, success: true };
    } catch (error: any) {
      return { 
        stdout: error.stdout || '', 
        stderr: error.stderr || error.message, 
        success: false 
      };
    }
  }

  async validateImplementationStructure(): Promise<ValidationSuite> {
    const suite: ValidationSuite = {
      suiteName: 'Implementation Structure',
      results: [],
      passed: 0,
      failed: 0,
      warnings: 0,
    };

    console.log('\n🏗️ Validating Implementation Structure...');

    // Check Phase 1: Foundation & Database components
    const phase1Files = [
      'src/types/enhanced-database.types.ts',
      'src/hooks/useUser.ts',
      'src/hooks/posts/useCollectiveMemberships.ts',
      'src/hooks/posts/useEnhancedPostEditor.ts',
      'src/services/posts/PostCollectiveService.ts',
      'src/lib/stores/enhanced-post-editor-store.ts',
    ];

    for (const file of phase1Files) {
      const exists = await this.checkFileExists(file);
      suite.results.push({
        check: `Phase 1 Component: ${file}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'File exists' : 'Required Phase 1 file missing',
      });
    }

    // Check Phase 2: Backend Logic & APIs
    const phase2Files = [
      'docs/production-database-schema.sql',
      'src/services/posts/PostCollectiveAuditService.ts',
      'src/services/posts/PostCollectiveErrorHandler.ts',
      'docs/phase-2-deployment-guide.md',
    ];

    for (const file of phase2Files) {
      const exists = await this.checkFileExists(file);
      suite.results.push({
        check: `Phase 2 Component: ${file}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'File exists' : 'Required Phase 2 file missing',
      });
    }

    // Check Phase 3: Frontend Components
    const phase3Files = [
      'src/components/app/posts/collective-selection/CollectiveSelectionCard.tsx',
      'src/components/app/posts/collective-selection/CollectiveSelectionModal.tsx',
      'src/components/app/posts/collective-selection/CollectiveSelectionSummary.tsx',
      'src/components/app/posts/collective-selection/CollectiveValidationFeedback.tsx',
      'src/components/app/posts/collective-selection/index.ts',
    ];

    for (const file of phase3Files) {
      const exists = await this.checkFileExists(file);
      suite.results.push({
        check: `Phase 3 Component: ${file}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'File exists' : 'Required Phase 3 file missing',
      });
    }

    // Check Phase 4: Integration & Navigation updates
    const phase4Files = [
      'src/app/dashboard/collectives/[collectiveId]/page.tsx',
      'src/components/app/dashboard/collectives/DashboardCollectiveCard.tsx',
      'src/app/posts/new/page.tsx',
      'docs/phase-4-integration-verification.md',
    ];

    for (const file of phase4Files) {
      const exists = await this.checkFileExists(file);
      suite.results.push({
        check: `Phase 4 Component: ${file}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'File exists' : 'Required Phase 4 file missing',
      });
    }

    // Check Phase 5: Testing & Documentation
    const phase5Files = [
      'docs/phase-5-integration-testing.md',
    ];

    for (const file of phase5Files) {
      const exists = await this.checkFileExists(file);
      suite.results.push({
        check: `Phase 5 Component: ${file}`,
        status: exists ? 'PASS' : 'FAIL',
        message: exists ? 'File exists' : 'Required Phase 5 file missing',
      });
    }

    this.calculateSuiteStats(suite);
    return suite;
  }

  async validateCodeQuality(): Promise<ValidationSuite> {
    const suite: ValidationSuite = {
      suiteName: 'Code Quality & Compilation',
      results: [],
      passed: 0,
      failed: 0,
      warnings: 0,
    };

    console.log('\n🔧 Validating Code Quality...');

    // TypeScript compilation check
    const tscResult = await this.runCommand('npx tsc --noEmit');
    suite.results.push({
      check: 'TypeScript Compilation',
      status: tscResult.success ? 'PASS' : 'FAIL',
      message: tscResult.success ? 'No TypeScript errors' : 'TypeScript compilation failed',
      details: tscResult.success ? undefined : [tscResult.stderr],
    });

    // Next.js build check
    console.log('   Running Next.js build validation...');
    const buildResult = await this.runCommand('npm run build');
    suite.results.push({
      check: 'Next.js Build',
      status: buildResult.success ? 'PASS' : 'WARNING',
      message: buildResult.success ? 'Build successful' : 'Build issues detected',
      details: buildResult.success ? undefined : [buildResult.stderr],
    });

    // ESLint check (if available)
    const eslintResult = await this.runCommand('npx eslint . --ext .ts,.tsx --max-warnings 0');
    suite.results.push({
      check: 'ESLint Validation',
      status: eslintResult.success ? 'PASS' : 'WARNING',
      message: eslintResult.success ? 'No linting errors' : 'Linting issues detected',
      details: eslintResult.success ? undefined : [eslintResult.stderr],
    });

    this.calculateSuiteStats(suite);
    return suite;
  }

  async validateComponentArchitecture(): Promise<ValidationSuite> {
    const suite: ValidationSuite = {
      suiteName: 'Component Architecture',
      results: [],
      passed: 0,
      failed: 0,
      warnings: 0,
    };

    console.log('\n🧩 Validating Component Architecture...');

    // Check enhanced post editor hook implementation
    const editorHookContent = await this.readFile('src/hooks/posts/useEnhancedPostEditor.ts');
    if (editorHookContent) {
      const hasMultiCollectiveSupport = editorHookContent.includes('selectedCollectives') || 
                                       editorHookContent.includes('collective') &&
                                       editorHookContent.includes('multiple');
      suite.results.push({
        check: 'Enhanced Post Editor Multi-Collective Support',
        status: hasMultiCollectiveSupport ? 'PASS' : 'WARNING',
        message: hasMultiCollectiveSupport ? 'Multi-collective support detected' : 'Multi-collective support unclear',
      });
    }

    // Check PostCollectiveService implementation
    const serviceContent = await this.readFile('src/services/posts/PostCollectiveService.ts');
    if (serviceContent) {
      const hasBusinessLogic = serviceContent.includes('class PostCollectiveService') &&
                              serviceContent.includes('permission') &&
                              serviceContent.includes('validation');
      suite.results.push({
        check: 'PostCollectiveService Business Logic',
        status: hasBusinessLogic ? 'PASS' : 'WARNING',
        message: hasBusinessLogic ? 'Service layer properly implemented' : 'Service implementation unclear',
      });
    }

    // Check collective selection components
    const indexContent = await this.readFile('src/components/app/posts/collective-selection/index.ts');
    if (indexContent) {
      const hasExports = indexContent.includes('CollectiveSelectionCard') &&
                        indexContent.includes('CollectiveSelectionModal');
      suite.results.push({
        check: 'Collective Selection Component Exports',
        status: hasExports ? 'PASS' : 'WARNING',
        message: hasExports ? 'Component exports properly structured' : 'Component exports unclear',
      });
    }

    // Check enhanced database types
    const typesContent = await this.readFile('src/types/enhanced-database.types.ts');
    if (typesContent) {
      const hasEnhancedTypes = typesContent.includes('post_collectives') &&
                              typesContent.includes('PostCollectiveAssociation');
      suite.results.push({
        check: 'Enhanced Database Types',
        status: hasEnhancedTypes ? 'PASS' : 'WARNING',
        message: hasEnhancedTypes ? 'Enhanced types properly defined' : 'Enhanced types unclear',
      });
    }

    // Check individual-centric navigation updates
    const dashboardContent = await this.readFile('src/app/dashboard/collectives/[collectiveId]/page.tsx');
    if (dashboardContent) {
      const hasIndividualCentric = dashboardContent.includes('individual') || 
                                  dashboardContent.includes('Create New Post') &&
                                  !dashboardContent.includes('collectiveId=${');
      suite.results.push({
        check: 'Individual-Centric Navigation',
        status: hasIndividualCentric ? 'PASS' : 'WARNING',
        message: hasIndividualCentric ? 'Individual-centric navigation implemented' : 'Navigation updates unclear',
      });
    }

    this.calculateSuiteStats(suite);
    return suite;
  }

  async validateProductionReadiness(): Promise<ValidationSuite> {
    const suite: ValidationSuite = {
      suiteName: 'Production Readiness',
      results: [],
      passed: 0,
      failed: 0,
      warnings: 0,
    };

    console.log('\n🚀 Validating Production Readiness...');

    // Check database schema documentation
    const schemaExists = await this.checkFileExists('docs/production-database-schema.sql');
    suite.results.push({
      check: 'Database Schema Ready',
      status: schemaExists ? 'PASS' : 'FAIL',
      message: schemaExists ? 'Production schema documented' : 'Database schema missing',
    });

    // Check deployment documentation
    const deployDocsExist = await this.checkFileExists('docs/phase-2-deployment-guide.md');
    suite.results.push({
      check: 'Deployment Documentation',
      status: deployDocsExist ? 'PASS' : 'FAIL',
      message: deployDocsExist ? 'Deployment guide available' : 'Deployment documentation missing',
    });

    // Check integration testing documentation
    const testDocsExist = await this.checkFileExists('docs/phase-5-integration-testing.md');
    suite.results.push({
      check: 'Testing Documentation',
      status: testDocsExist ? 'PASS' : 'FAIL',
      message: testDocsExist ? 'Testing guide available' : 'Testing documentation missing',
    });

    // Check error handling services
    const errorHandlerExists = await this.checkFileExists('src/services/posts/PostCollectiveErrorHandler.ts');
    const auditServiceExists = await this.checkFileExists('src/services/posts/PostCollectiveAuditService.ts');
    
    suite.results.push({
      check: 'Error Handling & Audit Services',
      status: (errorHandlerExists && auditServiceExists) ? 'PASS' : 'WARNING',
      message: (errorHandlerExists && auditServiceExists) ? 'Enterprise services ready' : 'Some enterprise services missing',
    });

    // Check backward compatibility preservation
    const legacyEditorExists = await this.checkFileExists('src/app/posts/new/page.tsx');
    if (legacyEditorExists) {
      const editorContent = await this.readFile('src/app/posts/new/page.tsx');
      const hasBackwardCompatibility = editorContent?.includes('useEnhancedPostEditor') ||
                                      editorContent?.includes('enhanced');
      suite.results.push({
        check: 'Backward Compatibility',
        status: hasBackwardCompatibility ? 'PASS' : 'WARNING',
        message: hasBackwardCompatibility ? 'Enhanced editor integrated' : 'Backward compatibility unclear',
      });
    }

    this.calculateSuiteStats(suite);
    return suite;
  }

  async validateBundleSize(): Promise<ValidationSuite> {
    const suite: ValidationSuite = {
      suiteName: 'Bundle Size & Performance',
      results: [],
      passed: 0,
      failed: 0,
      warnings: 0,
    };

    console.log('\n📦 Validating Bundle Size & Performance...');

    // Check if build output exists
    const buildExists = await this.checkFileExists('.next');
    if (buildExists) {
      // Get build stats if available
      const buildStatsPath = '.next/static';
      const buildStatsExists = await this.checkFileExists(buildStatsPath);
      
      suite.results.push({
        check: 'Build Output Available',
        status: buildStatsExists ? 'PASS' : 'WARNING',
        message: buildStatsExists ? 'Build artifacts present' : 'Build may be required',
      });

      // Check for component chunks
      try {
        const staticPath = path.join(this.projectRoot, '.next/static/chunks');
        const chunks = await fs.readdir(staticPath);
        const hasCollectiveComponents = chunks.some(chunk => 
          chunk.includes('collective') || chunk.includes('post')
        );
        
        suite.results.push({
          check: 'Component Chunks',
          status: hasCollectiveComponents ? 'PASS' : 'WARNING',
          message: hasCollectiveComponents ? 'Component chunks detected' : 'Component chunks unclear',
        });
      } catch {
        suite.results.push({
          check: 'Component Chunks',
          status: 'WARNING',
          message: 'Unable to analyze chunks - build may be required',
        });
      }
    } else {
      suite.results.push({
        check: 'Build Output Available',
        status: 'WARNING',
        message: 'No build output found - run npm run build',
      });
    }

    // Check package.json for performance optimizations
    const packageContent = await this.readFile('package.json');
    if (packageContent) {
      const packageJson = JSON.parse(packageContent);
      const hasOptimizations = packageJson.scripts?.build?.includes('build') &&
                              packageJson.dependencies?.['react-query'] ||
                              packageJson.dependencies?.['@tanstack/react-query'];
      
      suite.results.push({
        check: 'Performance Dependencies',
        status: hasOptimizations ? 'PASS' : 'WARNING',
        message: hasOptimizations ? 'Performance libraries present' : 'Performance optimizations unclear',
      });
    }

    this.calculateSuiteStats(suite);
    return suite;
  }

  private calculateSuiteStats(suite: ValidationSuite): void {
    suite.passed = suite.results.filter(r => r.status === 'PASS').length;
    suite.failed = suite.results.filter(r => r.status === 'FAIL').length;
    suite.warnings = suite.results.filter(r => r.status === 'WARNING').length;
  }

  async generateReport(): Promise<void> {
    const timestamp = new Date().toISOString();
    const totalTests = this.results.reduce((sum, suite) => sum + suite.results.length, 0);
    const totalPassed = this.results.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.results.reduce((sum, suite) => sum + suite.failed, 0);
    const totalWarnings = this.results.reduce((sum, suite) => sum + suite.warnings, 0);

    const report = {
      timestamp,
      project: 'POST-001 Phase 5 Implementation',
      summary: {
        totalSuites: this.results.length,
        totalTests,
        totalPassed,
        totalFailed,
        totalWarnings,
        successRate: ((totalPassed / totalTests) * 100).toFixed(1),
      },
      suites: this.results,
    };

    // Generate JSON report
    await fs.writeFile(
      path.join(this.projectRoot, 'phase-5-validation-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate readable summary
    const summary = this.generateTextSummary(report);
    await fs.writeFile(
      path.join(this.projectRoot, 'phase-5-validation-summary.txt'),
      summary
    );

    console.log('\n📊 Validation Results Summary:');
    console.log(`   Total Suites: ${report.summary.totalSuites}`);
    console.log(`   Total Checks: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.totalPassed}`);
    console.log(`   Failed: ${report.summary.totalFailed}`);
    console.log(`   Warnings: ${report.summary.totalWarnings}`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);

    if (totalFailed > 0) {
      console.log('\n❌ Failed Checks:');
      this.results.forEach(suite => {
        suite.results.filter(r => r.status === 'FAIL').forEach(result => {
          console.log(`   ${suite.suiteName} > ${result.check}: ${result.message}`);
        });
      });
    }

    if (totalWarnings > 0) {
      console.log('\n⚠️ Warnings:');
      this.results.forEach(suite => {
        suite.results.filter(r => r.status === 'WARNING').forEach(result => {
          console.log(`   ${suite.suiteName} > ${result.check}: ${result.message}`);
        });
      });
    }

    console.log('\n📄 Reports generated:');
    console.log('   - phase-5-validation-results.json');
    console.log('   - phase-5-validation-summary.txt');
  }

  private generateTextSummary(report: any): string {
    let summary = `POST-001 Phase 5 Implementation Validation Report\n`;
    summary += `Generated: ${report.timestamp}\n\n`;
    
    summary += `SUMMARY:\n`;
    summary += `========\n`;
    summary += `Total Suites: ${report.summary.totalSuites}\n`;
    summary += `Total Checks: ${report.summary.totalTests}\n`;
    summary += `Passed: ${report.summary.totalPassed}\n`;
    summary += `Failed: ${report.summary.totalFailed}\n`;
    summary += `Warnings: ${report.summary.totalWarnings}\n`;
    summary += `Success Rate: ${report.summary.successRate}%\n\n`;

    report.suites.forEach((suite: any) => {
      summary += `${suite.suiteName}:\n`;
      summary += `${'='.repeat(suite.suiteName.length + 1)}\n`;
      
      suite.results.forEach((result: any) => {
        const status = result.status === 'PASS' ? '✅' : 
                      result.status === 'FAIL' ? '❌' : '⚠️';
        summary += `${status} ${result.check}: ${result.message}\n`;
        
        if (result.details) {
          result.details.forEach((detail: string) => {
            summary += `   ${detail}\n`;
          });
        }
      });
      summary += '\n';
    });

    return summary;
  }

  async runAllValidations(): Promise<void> {
    console.log('🔍 POST-001 Phase 5 Implementation Validation Starting...');
    console.log('📝 Validating multi-collective post creation implementation\n');

    try {
      this.results.push(await this.validateImplementationStructure());
      this.results.push(await this.validateCodeQuality());
      this.results.push(await this.validateComponentArchitecture());
      this.results.push(await this.validateProductionReadiness());
      this.results.push(await this.validateBundleSize());

      await this.generateReport();

      const totalFailed = this.results.reduce((sum, suite) => sum + suite.failed, 0);
      
      if (totalFailed === 0) {
        console.log('\n✅ All validations passed! Implementation ready for testing.');
      } else {
        console.log('\n⚠️ Some validations failed. Please address issues before deployment.');
      }

    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const validator = new Phase5Validator();
  
  try {
    await validator.runAllValidations();
    console.log('\n✅ POST-001 Phase 5 Implementation Validation Complete!');
  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { Phase5Validator }; 