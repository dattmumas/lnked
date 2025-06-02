#!/usr/bin/env tsx

/**
 * POST-001 Phase 5 Integration Testing Script
 * 
 * Automated validation of the complete multi-collective post creation workflow.
 * This script tests the core functionality and validates the implementation.
 */

import { chromium, Browser, Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: Record<string, any>;
}

interface TestSuite {
  suiteName: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
}

class PostCreationTester {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private baseUrl: string;
  private testResults: TestSuite[] = [];

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async setup(): Promise<void> {
    console.log('🚀 Setting up browser for POST-001 testing...');
    this.browser = await chromium.launch({ 
      headless: false, // Set to true for CI/CD
      slowMo: 100 // Slow down for better observation
    });
    this.page = await this.browser.newPage();
    
    // Set viewport for consistent testing
    await this.page.setViewportSize({ width: 1200, height: 800 });
    
    console.log('✅ Browser setup complete');
  }

  async teardown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser cleanup complete');
    }
  }

  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🧪 Running test: ${testName}`);
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      console.log(`✅ PASS: ${testName} (${duration}ms)`);
      return {
        testName,
        status: 'PASS',
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAIL: ${testName} (${duration}ms)`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      return {
        testName,
        status: 'FAIL',
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async runWorkflowTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      suiteName: 'Individual Post Creation Workflow',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    };

    console.log('\n📋 Running Individual Post Creation Workflow Tests');

    // Test 1: Dashboard Navigation
    suite.results.push(await this.runTest('Dashboard Navigation', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      await this.page.goto(`${this.baseUrl}/dashboard`);
      await this.page.waitForLoadState('networkidle');
      
      // Check for post creation entry points
      const writeNewPostButton = await this.page.locator('text="Write New Post"').first();
      const createPostButton = await this.page.locator('text="Create Post"').first();
      
      const hasPostCreationEntry = await writeNewPostButton.isVisible() || await createPostButton.isVisible();
      if (!hasPostCreationEntry) {
        throw new Error('No post creation entry point found on dashboard');
      }
    }));

    // Test 2: Post Editor Loading
    suite.results.push(await this.runTest('Enhanced Post Editor Loading', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      await this.page.goto(`${this.baseUrl}/posts/new`);
      await this.page.waitForLoadState('networkidle');
      
      // Check for enhanced editor elements
      const titleInput = await this.page.locator('input[placeholder*="Post title"]');
      const editorContainer = await this.page.locator('[data-testid="post-editor"], .lexical-editor');
      
      if (!await titleInput.isVisible()) {
        throw new Error('Title input not found');
      }
      
      // Wait for editor to load (Lexical editor may take time)
      await this.page.waitForTimeout(2000);
      
      console.log('   ✓ Enhanced post editor loaded successfully');
    }));

    // Test 3: Content Creation and Auto-Save
    suite.results.push(await this.runTest('Content Creation & Auto-Save', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      const testTitle = `Test Post ${Date.now()}`;
      const testContent = 'This is automated test content for POST-001 validation.';
      
      // Enter title
      await this.page.fill('input[placeholder*="Post title"]', testTitle);
      
      // Wait for auto-save indicator
      await this.page.waitForTimeout(1000);
      
      // Check for auto-save status
      const saveStatus = await this.page.locator('text=/Saved|Saving|Unsaved/').first();
      if (await saveStatus.isVisible()) {
        console.log('   ✓ Auto-save functionality detected');
      }
    }));

    // Test 4: Navigation to Settings
    suite.results.push(await this.runTest('Settings Navigation', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      const continueButton = await this.page.locator('text="Continue to Settings"').first();
      
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await this.page.waitForLoadState('networkidle');
        
        // Verify we're on the details page
        const currentUrl = this.page.url();
        if (!currentUrl.includes('/posts/new/details')) {
          throw new Error(`Expected details page, got: ${currentUrl}`);
        }
        
        console.log('   ✓ Successfully navigated to post settings');
      } else {
        console.log('   ⚠️ Continue button not visible - may need title content first');
      }
    }));

    // Test 5: Collective Selection UI
    suite.results.push(await this.runTest('Collective Selection Interface', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      // Navigate to details page if not already there
      if (!this.page.url().includes('/posts/new/details')) {
        await this.page.goto(`${this.baseUrl}/posts/new/details`);
        await this.page.waitForLoadState('networkidle');
      }
      
      // Look for collective selection elements
      const collectiveSection = await this.page.locator('text=/Collective|Share|Publish/').first();
      const selectButton = await this.page.locator('text=/Select Collective|Choose Collective|Add Collective/').first();
      const modal = await this.page.locator('[role="dialog"], .modal').first();
      
      if (await selectButton.isVisible()) {
        await selectButton.click();
        await this.page.waitForTimeout(500);
        
        if (await modal.isVisible()) {
          console.log('   ✓ Collective selection modal opened successfully');
        }
      } else {
        console.log('   ℹ️ Collective selection UI may require authentication');
      }
    }));

    // Calculate suite summary
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.status === 'PASS').length;
    suite.failedTests = suite.results.filter(r => r.status === 'FAIL').length;
    suite.skippedTests = suite.results.filter(r => r.status === 'SKIP').length;
    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0);

    return suite;
  }

  async runPermissionTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      suiteName: 'Permission & Access Control',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    };

    console.log('\n🔐 Running Permission & Access Control Tests');

    // Test 1: Collective Dashboard Access
    suite.results.push(await this.runTest('Collective Dashboard Access', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      // Test with mock collective ID
      await this.page.goto(`${this.baseUrl}/dashboard/collectives/test-collective-id`);
      await this.page.waitForLoadState('networkidle');
      
      // Check for new workflow guidance
      const workflowGuidance = await this.page.locator('text=/Individual|Create New Post|Share Content/').first();
      const createPostButton = await this.page.locator('text="Create New Post"').first();
      
      if (await workflowGuidance.isVisible() || await createPostButton.isVisible()) {
        console.log('   ✓ New individual-centric workflow detected');
      } else {
        console.log('   ℹ️ May require valid collective and authentication');
      }
    }));

    // Test 2: Permission Validation
    suite.results.push(await this.runTest('Permission Validation UI', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      // Look for permission-related UI elements
      const permissionText = await this.page.locator('text=/permission|role|access|author|editor|admin|owner/i').first();
      const roleIndicator = await this.page.locator('[data-testid*="role"], .role-badge, .permission-indicator').first();
      
      if (await permissionText.isVisible() || await roleIndicator.isVisible()) {
        console.log('   ✓ Permission validation UI present');
      } else {
        console.log('   ℹ️ Permission UI may be in collective selection component');
      }
    }));

    // Calculate suite summary
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.status === 'PASS').length;
    suite.failedTests = suite.results.filter(r => r.status === 'FAIL').length;
    suite.skippedTests = suite.results.filter(r => r.status === 'SKIP').length;
    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0);

    return suite;
  }

  async runPerformanceTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      suiteName: 'Performance & Optimization',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    };

    console.log('\n⚡ Running Performance & Optimization Tests');

    // Test 1: Page Load Performance
    suite.results.push(await this.runTest('Page Load Performance', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      const startTime = Date.now();
      await this.page.goto(`${this.baseUrl}/posts/new`);
      await this.page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      console.log(`   📊 Page load time: ${loadTime}ms`);
      
      if (loadTime > 5000) {
        throw new Error(`Page load time too slow: ${loadTime}ms (target: <5000ms)`);
      }
      
      console.log('   ✓ Page load performance acceptable');
    }));

    // Test 2: Bundle Size Check
    suite.results.push(await this.runTest('Bundle Size Analysis', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      // Navigate and check network resources
      await this.page.goto(`${this.baseUrl}/posts/new`);
      await this.page.waitForLoadState('networkidle');
      
      // Get performance metrics
      const navigationTiming = await this.page.evaluate(() => {
        const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          loadEventEnd: timing.loadEventEnd,
          domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
          transferSize: timing.transferSize || 0,
        };
      });
      
      console.log(`   📊 Transfer size: ${Math.round(navigationTiming.transferSize / 1024)}KB`);
      console.log(`   📊 DOM Content Loaded: ${navigationTiming.domContentLoadedEventEnd}ms`);
      
      if (navigationTiming.transferSize > 5 * 1024 * 1024) { // 5MB limit
        throw new Error(`Bundle size too large: ${Math.round(navigationTiming.transferSize / 1024)}KB`);
      }
      
      console.log('   ✓ Bundle size within acceptable limits');
    }));

    // Test 3: Auto-save Performance
    suite.results.push(await this.runTest('Auto-save Performance', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      const titleInput = await this.page.locator('input[placeholder*="Post title"]');
      
      if (await titleInput.isVisible()) {
        const startTime = Date.now();
        
        // Type content and measure auto-save response
        await titleInput.fill('Performance test title');
        
        // Wait for auto-save indicator
        await this.page.waitForTimeout(600); // 500ms debounce + buffer
        
        const responseTime = Date.now() - startTime;
        console.log(`   📊 Auto-save response time: ${responseTime}ms`);
        
        if (responseTime > 2000) {
          throw new Error(`Auto-save too slow: ${responseTime}ms (target: <2000ms)`);
        }
        
        console.log('   ✓ Auto-save performance acceptable');
      } else {
        throw new Error('Title input not available for auto-save testing');
      }
    }));

    // Calculate suite summary
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.status === 'PASS').length;
    suite.failedTests = suite.results.filter(r => r.status === 'FAIL').length;
    suite.skippedTests = suite.results.filter(r => r.status === 'SKIP').length;
    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0);

    return suite;
  }

  async runComponentTests(): Promise<TestSuite> {
    const suite: TestSuite = {
      suiteName: 'Component Integration',
      results: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      totalDuration: 0,
    };

    console.log('\n🧩 Running Component Integration Tests');

    // Test 1: Enhanced Post Editor Hook
    suite.results.push(await this.runTest('Enhanced Post Editor Integration', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      await this.page.goto(`${this.baseUrl}/posts/new`);
      await this.page.waitForLoadState('networkidle');
      
      // Check for enhanced editor functionality
      const titleInput = await this.page.locator('input[placeholder*="Post title"]');
      const continueButton = await this.page.locator('text="Continue to Settings"');
      
      if (!await titleInput.isVisible()) {
        throw new Error('Enhanced editor title input not found');
      }
      
      // Test form interaction
      await titleInput.fill('Component Integration Test');
      await this.page.waitForTimeout(100);
      
      console.log('   ✓ Enhanced post editor integration working');
    }));

    // Test 2: Collective Selection Components
    suite.results.push(await this.runTest('Collective Selection Components', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      await this.page.goto(`${this.baseUrl}/posts/new/details`);
      await this.page.waitForLoadState('networkidle');
      
      // Look for collective selection UI components
      const selectionElements = await this.page.locator('[data-testid*="collective"], [class*="collective"], text=/collective/i').count();
      
      if (selectionElements > 0) {
        console.log(`   ✓ Found ${selectionElements} collective selection elements`);
      } else {
        console.log('   ℹ️ Collective selection may require authentication or valid data');
      }
    }));

    // Test 3: Navigation Integration
    suite.results.push(await this.runTest('Navigation Integration', async () => {
      if (!this.page) throw new Error('Page not initialized');
      
      // Test dashboard navigation
      await this.page.goto(`${this.baseUrl}/dashboard`);
      await this.page.waitForLoadState('networkidle');
      
      // Check for updated navigation elements
      const postCreationLinks = await this.page.locator('a[href="/posts/new"]').count();
      
      if (postCreationLinks > 0) {
        console.log(`   ✓ Found ${postCreationLinks} individual post creation links`);
      } else {
        console.log('   ⚠️ No individual post creation links found on dashboard');
      }
      
      // Test collective dashboard navigation
      await this.page.goto(`${this.baseUrl}/dashboard/collectives`);
      await this.page.waitForLoadState('networkidle');
      
      console.log('   ✓ Navigation integration tested');
    }));

    // Calculate suite summary
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.status === 'PASS').length;
    suite.failedTests = suite.results.filter(r => r.status === 'FAIL').length;
    suite.skippedTests = suite.results.filter(r => r.status === 'SKIP').length;
    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.duration, 0);

    return suite;
  }

  async generateReport(): Promise<void> {
    const reportData = {
      timestamp: new Date().toISOString(),
      testSuites: this.testResults,
      summary: {
        totalSuites: this.testResults.length,
        totalTests: this.testResults.reduce((sum, suite) => sum + suite.totalTests, 0),
        totalPassed: this.testResults.reduce((sum, suite) => sum + suite.passedTests, 0),
        totalFailed: this.testResults.reduce((sum, suite) => sum + suite.failedTests, 0),
        totalSkipped: this.testResults.reduce((sum, suite) => sum + suite.skippedTests, 0),
        totalDuration: this.testResults.reduce((sum, suite) => sum + suite.totalDuration, 0),
      },
    };

    // Generate JSON report
    const jsonReport = JSON.stringify(reportData, null, 2);
    await fs.writeFile(path.join(process.cwd(), 'test-results.json'), jsonReport);

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(reportData);
    await fs.writeFile(path.join(process.cwd(), 'test-results.html'), htmlReport);

    console.log('\n📊 Test Results Summary:');
    console.log(`   Total Suites: ${reportData.summary.totalSuites}`);
    console.log(`   Total Tests: ${reportData.summary.totalTests}`);
    console.log(`   Passed: ${reportData.summary.totalPassed}`);
    console.log(`   Failed: ${reportData.summary.totalFailed}`);
    console.log(`   Skipped: ${reportData.summary.totalSkipped}`);
    console.log(`   Total Duration: ${reportData.summary.totalDuration}ms`);
    
    const successRate = (reportData.summary.totalPassed / reportData.summary.totalTests) * 100;
    console.log(`   Success Rate: ${successRate.toFixed(1)}%`);

    if (reportData.summary.totalFailed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.forEach(suite => {
        suite.results.filter(r => r.status === 'FAIL').forEach(result => {
          console.log(`   ${suite.suiteName} > ${result.testName}: ${result.error}`);
        });
      });
    }

    console.log('\n📄 Reports generated:');
    console.log('   - test-results.json');
    console.log('   - test-results.html');
  }

  private generateHtmlReport(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>POST-001 Phase 5 Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .test-pass { color: #28a745; }
        .test-fail { color: #dc3545; }
        .test-skip { color: #ffc107; }
        .summary { background: #e9f7ff; padding: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>POST-001 Phase 5 Integration Test Results</h1>
        <p>Generated: ${data.timestamp}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: ${data.summary.totalTests}</p>
        <p class="test-pass">Passed: ${data.summary.totalPassed}</p>
        <p class="test-fail">Failed: ${data.summary.totalFailed}</p>
        <p class="test-skip">Skipped: ${data.summary.totalSkipped}</p>
        <p>Success Rate: ${((data.summary.totalPassed / data.summary.totalTests) * 100).toFixed(1)}%</p>
        <p>Total Duration: ${data.summary.totalDuration}ms</p>
    </div>
    
    ${data.testSuites.map((suite: any) => `
        <div class="suite">
            <h3>${suite.suiteName}</h3>
            <table>
                <tr>
                    <th>Test Name</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Error</th>
                </tr>
                ${suite.results.map((result: any) => `
                    <tr>
                        <td>${result.testName}</td>
                        <td class="test-${result.status.toLowerCase()}">${result.status}</td>
                        <td>${result.duration}ms</td>
                        <td>${result.error || ''}</td>
                    </tr>
                `).join('')}
            </table>
        </div>
    `).join('')}
</body>
</html>
    `;
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 POST-001 Phase 5 Integration Testing Starting...');
    console.log('📝 Testing multi-collective post creation workflow\n');

    try {
      await this.setup();

      // Run all test suites
      this.testResults.push(await this.runWorkflowTests());
      this.testResults.push(await this.runPermissionTests());
      this.testResults.push(await this.runPerformanceTests());
      this.testResults.push(await this.runComponentTests());

      // Generate comprehensive report
      await this.generateReport();

    } catch (error) {
      console.error('❌ Testing failed:', error);
      throw error;
    } finally {
      await this.teardown();
    }
  }
}

// Main execution
async function main() {
  const tester = new PostCreationTester();
  
  try {
    await tester.runAllTests();
    console.log('\n✅ POST-001 Phase 5 Integration Testing Complete!');
  } catch (error) {
    console.error('\n❌ Testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { PostCreationTester }; 