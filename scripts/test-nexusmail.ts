/**
 * NexusMail Test Script
 * 
 * This script tests your NexusMail setup to ensure everything is working.
 * 
 * Usage:
 * 1. Set your API key in the variable below
 * 2. Run: npx tsx scripts/test-nexusmail.ts
 */

const API_KEY = 'nxm_your_api_key_here'; // Replace with your actual API key
const API_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const TEST_RECIPIENT = 'test@example.com'; // Replace with your email for testing

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Test 1: Health Check
async function testHealthCheck() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();
    
    if (response.ok && data.database === 'connected') {
      results.push({
        test: 'Database Connection',
        status: 'PASS',
        message: 'Database is connected and healthy',
        details: data,
      });
    } else {
      results.push({
        test: 'Database Connection',
        status: 'FAIL',
        message: 'Database connection failed',
        details: data,
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Database Connection',
      status: 'FAIL',
      message: error.message,
    });
  }
}

// Test 2: Invalid API Key
async function testInvalidApiKey() {
  try {
    const response = await fetch(`${API_URL}/api/nexusmail/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretKey: 'invalid_key',
        recipient: TEST_RECIPIENT,
        templateId: 'test',
        subject: 'Test',
        body: '<p>Test</p>',
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      results.push({
        test: 'Invalid API Key Rejection',
        status: 'PASS',
        message: 'Invalid API keys are properly rejected',
        details: data,
      });
    } else {
      results.push({
        test: 'Invalid API Key Rejection',
        status: 'FAIL',
        message: 'Should reject invalid API keys with 401',
        details: data,
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Invalid API Key Rejection',
      status: 'FAIL',
      message: error.message,
    });
  }
}

// Test 3: Valid API Key (if provided)
async function testValidApiKey() {
  if (API_KEY === 'nxm_your_api_key_here') {
    results.push({
      test: 'Email Dispatch',
      status: 'FAIL',
      message: 'No API key provided. Update API_KEY variable in this script.',
    });
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/nexusmail/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretKey: API_KEY,
        recipient: TEST_RECIPIENT,
        templateId: 'test-script',
        subject: 'NexusMail Test Email',
        body: '<h1>Test Email</h1><p>This is a test from the NexusMail test script.</p>',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      results.push({
        test: 'Email Dispatch',
        status: 'PASS',
        message: 'Email sent successfully via AWS SES',
        details: data,
      });
    } else {
      results.push({
        test: 'Email Dispatch',
        status: 'FAIL',
        message: data.error || 'Failed to send email',
        details: data,
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Email Dispatch',
      status: 'FAIL',
      message: error.message,
    });
  }
}

// Test 4: Missing Fields
async function testMissingFields() {
  try {
    const response = await fetch(`${API_URL}/api/nexusmail/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretKey: API_KEY,
        // Missing required fields
      }),
    });
    
    const data = await response.json();
    
    if (response.status === 400) {
      results.push({
        test: 'Missing Fields Validation',
        status: 'PASS',
        message: 'Properly validates required fields',
        details: data,
      });
    } else {
      results.push({
        test: 'Missing Fields Validation',
        status: 'FAIL',
        message: 'Should reject requests with missing fields',
        details: data,
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Missing Fields Validation',
      status: 'FAIL',
      message: error.message,
    });
  }
}

// Print Results
function printResults() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         NexusMail Test Results                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  let passCount = 0;
  let failCount = 0;
  
  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.test}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
    
    console.log('');
    
    if (result.status === 'PASS') {
      passCount++;
    } else {
      failCount++;
    }
  });
  
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('─────────────────────────────────────────────────────────────\n');
  
  if (failCount === 0) {
    console.log('🎉 All tests passed! Your NexusMail setup is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the details above.\n');
  }
}

// Run All Tests
async function runTests() {
  console.log('🚀 Starting NexusMail tests...\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Test Recipient: ${TEST_RECIPIENT}\n`);
  
  await testHealthCheck();
  await testInvalidApiKey();
  await testMissingFields();
  await testValidApiKey(); // Run this last as it sends a real email
  
  printResults();
}

// Execute
runTests().catch(console.error);
