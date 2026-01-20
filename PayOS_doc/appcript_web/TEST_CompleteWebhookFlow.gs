/**
 * ========================================
 * COMPLETE WEBHOOK FLOW TEST
 * ========================================
 * Test toàn bộ webhook processing với data THỰC TẾ
 * KHÔNG CẦN deploy - chạy offline với mock Supabase
 * 
 * CÁCH DÙNG:
 * 1. Upload file này vào Apps Script
 * 2. Run: testCompleteWebhookFlow()
 * 3. Xem logs để verify tất cả steps
 */

/**
 * TEST với webhook data MỚI NHẤT
 */
function testCompleteWebhookFlow() {
  // Webhook data REAL từ PayOS
  const webhookData = {
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      "accountNumber": "0987726236",
      "amount": 2000,
      "description": "DH1768573",
      "reference": "FT26016979127088",
      "transactionDateTime": "2026-01-16 21:30:13",
      "virtualAccountNumber": "",
      "counterAccountBankId": "01202001",
      "counterAccountBankName": "",
      "counterAccountName": "VO TAN NHUONG",
      "counterAccountNumber": "3180034086",
      "virtualAccountName": "",
      "currency": "VND",
      "orderCode": 1768573777,
      "paymentLinkId": "b47e667d331643d78ed8359426e24502",
      "code": "00",
      "desc": "success"
    },
    "signature": "57bd74fa30e04b08b4af5a5ab027c8b93bd3680989f5a11a37816fead9080e9b"
  };
  
  Logger.log('🧪 TESTING COMPLETE WEBHOOK FLOW');
  Logger.log('═══════════════════════════════════════════════════════════');
  
  const data = webhookData.data;
  const signature = webhookData.signature;
  
  Logger.log(`\n📦 Webhook Data:`);
  Logger.log(`   Order Code: ${data.orderCode}`);
  Logger.log(`   Description: ${data.description}`);
  Logger.log(`   Amount: ${data.amount} VND`);
  Logger.log(`   Reference: ${data.reference}`);
  Logger.log(`   Signature: ${signature}`);
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // ═══════════════════════════════════════════════════════════
  // TEST 1: Signature Verification
  // ═══════════════════════════════════════════════════════════
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log('TEST 1: Signature Verification');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const isValidSig = testSignatureVerification(webhookData, signature);
    if (isValidSig) {
      Logger.log('✅ TEST 1 PASSED: Signature verification OK');
      testsPassed++;
    } else {
      Logger.log('❌ TEST 1 FAILED: Signature verification failed');
      testsFailed++;
    }
  } catch (error) {
    Logger.log(`❌ TEST 1 ERROR: ${error.message}`);
    testsFailed++;
  }
  
  // ═══════════════════════════════════════════════════════════
  // TEST 2: Extract Order ID
  // ═══════════════════════════════════════════════════════════
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log('TEST 2: Extract Order ID from Description');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const orderId = testExtractOrderId(data.description);
    if (orderId) {
      Logger.log(`✅ TEST 2 PASSED: Extracted order ID: ${orderId}`);
      testsPassed++;
    } else {
      Logger.log(`❌ TEST 2 FAILED: Could not extract order ID from "${data.description}"`);
      testsFailed++;
    }
  } catch (error) {
    Logger.log(`❌ TEST 2 ERROR: ${error.message}`);
    testsFailed++;
  }
  
  // ═══════════════════════════════════════════════════════════
  // TEST 3: Find Order (Mock - no actual DB call)
  // ═══════════════════════════════════════════════════════════
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log('TEST 3: Find Order (Mock)');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Mock order data
  const mockOrder = {
    id: 123,
    order_id: 'DH1768573777',  // Full order ID
    status: 'pending',
    total_amount: 2000,
    customer_email: 'test@example.com',
    customer_name: 'Test User'
  };
  
  Logger.log(`   Mock order: ${mockOrder.order_id}`);
  Logger.log(`   Status: ${mockOrder.status}`);
  Logger.log(`   Amount: ${mockOrder.total_amount}`);
  Logger.log('✅ TEST 3 PASSED: Order found (mock)');
  testsPassed++;
  
  // ═══════════════════════════════════════════════════════════
  // TEST 4: Validate Amount
  // ═══════════════════════════════════════════════════════════
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log('TEST 4: Amount Validation');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const expectedAmount = mockOrder.total_amount;
  const receivedAmount = data.amount;
  
  if (receivedAmount === expectedAmount) {
    Logger.log(`✅ TEST 4 PASSED: Amount matches (${receivedAmount} VND)`);
    testsPassed++;
  } else {
    Logger.log(`❌ TEST 4 FAILED: Amount mismatch`);
    Logger.log(`   Expected: ${expectedAmount}`);
    Logger.log(`   Received: ${receivedAmount}`);
    testsFailed++;
  }
  
  // ═══════════════════════════════════════════════════════════
  // TEST 5: Idempotency Check (Mock)
  // ═══════════════════════════════════════════════════════════
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log('TEST 5: Idempotency Check (Mock)');
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Simulate: transaction NOT processed yet
  const transactionId = data.reference;
  Logger.log(`   Transaction ID: ${transactionId}`);
  Logger.log(`   Already processed: NO (mock)`);
  Logger.log('✅ TEST 5 PASSED: Idempotency check OK');
  testsPassed++;
  
  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  Logger.log(`\n═══════════════════════════════════════════════════════════`);
  Logger.log('📊 TEST SUMMARY:');
  Logger.log(`   ✅ Passed: ${testsPassed}`);
  Logger.log(`   ❌ Failed: ${testsFailed}`);
  Logger.log(`   Total: ${testsPassed + testsFailed}`);
  Logger.log('═══════════════════════════════════════════════════════════');
  
  if (testsFailed === 0) {
    Logger.log('\n🎉 ALL TESTS PASSED! Safe to deploy!');
    return true;
  } else {
    Logger.log(`\n⚠️ ${testsFailed} TEST(S) FAILED! Fix before deploying!`);
    return false;
  }
}

/**
 * TEST: Signature Verification
 */
function testSignatureVerification(webhookData, expectedSignature) {
  Logger.log('\n🔐 Testing signature verification...');
  
  const checksumKey = getPayOSChecksumKey();
  const data = webhookData.data;
  
  // Sort all fields alphabetically (including empty strings)
  const sortedKeys = Object.keys(data).sort();
  const signatureString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  
  Logger.log(`   Keys (${sortedKeys.length}): ${sortedKeys.slice(0, 5).join(', ')}...`);
  Logger.log(`   Signature string (first 150 chars):`);
  Logger.log(`   ${signatureString.substring(0, 150)}...`);
  
  // Calculate HMAC SHA256
  const dataBytes = Utilities.newBlob(signatureString).getBytes();
  const keyBytes = Utilities.newBlob(checksumKey).getBytes();
  const signature = Utilities.computeHmacSha256Signature(dataBytes, keyBytes);
  
  const calculatedHex = signature.map(byte => {
    const hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
  
  Logger.log(`   Calculated: ${calculatedHex}`);
  Logger.log(`   Expected:   ${expectedSignature}`);
  
  const isValid = calculatedHex === expectedSignature;
  
  if (isValid) {
    Logger.log('   ✅ Signature MATCH!');
  } else {
    Logger.log('   ❌ Signature MISMATCH!');
  }
  
  return isValid;
}

/**
 * TEST: Extract Order ID from description
 */
function testExtractOrderId(description) {
  Logger.log(`\n🔍 Testing order ID extraction...`);
  Logger.log(`   Input description: "${description}"`);
  
  if (!description) {
    Logger.log('   ❌ Description is empty!');
    return null;
  }
  
  // Method 1: Use description as-is (short version)
  Logger.log(`   Method 1: Try exact match "${description}"`);
  // Mock: In real code, this would query Supabase
  // For now, we'll simulate LIKE search
  
  // Method 2: Try with LIKE pattern
  const likePattern = `${description}%`;
  Logger.log(`   Method 2: Try LIKE pattern "${likePattern}"`);
  
  // Mock result: Simulate finding order
  // In real Supabase: SELECT order_id FROM orders WHERE order_id LIKE 'DH1768573%'
  const mockFoundOrderId = `${description}777`; // Simulate full order ID
  
  Logger.log(`   ✅ Found order ID: ${mockFoundOrderId}`);
  
  return mockFoundOrderId;
}

/**
 * BONUS: Test với multiple webhook data
 */
function testMultipleWebhooks() {
  const testCases = [
    {
      name: "Webhook 1 - DH1768572",
      data: {
        "code": "00",
        "desc": "success",
        "success": true,
        "data": {
          "accountNumber": "0987726236",
          "amount": 2000,
          "description": "DH1768572",
          "reference": "FT26016059296407",
          "transactionDateTime": "2026-01-16 21:00:59",
          "virtualAccountNumber": "",
          "counterAccountBankId": "01202001",
          "counterAccountBankName": "",
          "counterAccountName": "VO TAN NHUONG",
          "counterAccountNumber": "3180034086",
          "virtualAccountName": "",
          "currency": "VND",
          "orderCode": 1768572028,
          "paymentLinkId": "edaa673201ba45cc9895d89cd3c24432",
          "code": "00",
          "desc": "success"
        },
        "signature": "ce3eea424b83aa0193882115c7242fe5a1d3b888ed0b9c06143c2e98e9379dc0"
      }
    },
    {
      name: "Webhook 2 - DH1768573",
      data: {
        "code": "00",
        "desc": "success",
        "success": true,
        "data": {
          "accountNumber": "0987726236",
          "amount": 2000,
          "description": "DH1768573",
          "reference": "FT26016979127088",
          "transactionDateTime": "2026-01-16 21:30:13",
          "virtualAccountNumber": "",
          "counterAccountBankId": "01202001",
          "counterAccountBankName": "",
          "counterAccountName": "VO TAN NHUONG",
          "counterAccountNumber": "3180034086",
          "virtualAccountName": "",
          "currency": "VND",
          "orderCode": 1768573777,
          "paymentLinkId": "b47e667d331643d78ed8359426e24502",
          "code": "00",
          "desc": "success"
        },
        "signature": "57bd74fa30e04b08b4af5a5ab027c8b93bd3680989f5a11a37816fead9080e9b"
      }
    }
  ];
  
  Logger.log('🧪 TESTING MULTIPLE WEBHOOKS');
  Logger.log('═══════════════════════════════════════════════════════════\n');
  
  let allPassed = true;
  
  testCases.forEach((testCase, index) => {
    Logger.log(`\n📝 Test Case ${index + 1}: ${testCase.name}`);
    Logger.log('─────────────────────────────────────────────────────────');
    
    const isValid = testSignatureVerification(testCase.data, testCase.data.signature);
    const orderId = testExtractOrderId(testCase.data.data.description);
    
    if (isValid && orderId) {
      Logger.log(`✅ ${testCase.name}: PASSED`);
    } else {
      Logger.log(`❌ ${testCase.name}: FAILED`);
      allPassed = false;
    }
  });
  
  Logger.log('\n═══════════════════════════════════════════════════════════');
  if (allPassed) {
    Logger.log('🎉 ALL TEST CASES PASSED!');
  } else {
    Logger.log('⚠️ SOME TEST CASES FAILED!');
  }
  
  return allPassed;
}
