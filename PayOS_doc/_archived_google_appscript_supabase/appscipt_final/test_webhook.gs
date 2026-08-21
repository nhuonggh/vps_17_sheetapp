/**
 * ========================================
 * TEST COMPLETE WEBHOOK FLOW
 * ========================================
 * Test entire PayOS webhook processing flow
 * 
 * Purpose:
 * - Simulate complete webhook from PayOS
 * - Test all steps: signature, idempotency, order lookup, etc.
 * - Verify auto-enrollment works
 */

/**
 * Test complete webhook flow với sample data
 */
function testCompleteWebhookFlow() {
  Logger.log('🧪 TESTING COMPLETE WEBHOOK FLOW');
  Logger.log('='.repeat(60));
  
  // Sample webhook data (replace with actual test data)
  const webhookData = {
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      "accountNumber": "0987726236",
      "amount": 2000,
      "description": "DH1768879",  // ← CHANGE TO ACTUAL ORDER ID
      "reference": "FT_TEST_" + new Date().getTime(),  // Unique transaction ID
      "transactionDateTime": new Date().toISOString(),
      "virtualAccountNumber": "",
      "counterAccountBankId": "970422",
      "counterAccountBankName": "MB Bank",
      "counterAccountName": "Test User",
      "counterAccountNumber": "1234567890",
      "virtualAccountName": "",
      "currency": "VND",
      "orderCode": Math.floor(Math.random() * 1000000000),
      "paymentLinkId": "test-payment-link-id",
      "code": "00",
      "desc": "success"
    },
    "signature": "TEST_SIGNATURE"  // ← Will fail signature check
  };
  
  Logger.log(`📦 Test Data:`);
  Logger.log(`   Order ID: ${webhookData.data.description}`);
  Logger.log(`   Amount: ${webhookData.data.amount}`);
  Logger.log(`   Transaction ID: ${webhookData.data.reference}`);
  Logger.log('');
  
  try {
    // ⚠️ NOTE: This will FAIL signature verification unless you:
    // 1. Use real webhook data from PayOS, OR
    // 2. Temporarily bypass signature check
    
    const result = processPayOSWebhook(webhookData);
    
    Logger.log('='.repeat(60));
    Logger.log('✅ TEST PASSED!');
    Logger.log(`Result: ${JSON.stringify(result, null, 2)}`);
    Logger.log('='.repeat(60));
    
    return result;
    
  } catch (error) {
    Logger.log('='.repeat(60));
    Logger.log('❌ TEST FAILED!');
    Logger.log(`Error: ${error.message}`);
    Logger.log(`Stack: ${error.stack}`);
    Logger.log('='.repeat(60));
    
    throw error;
  }
}

/**
 * Test với real webhook data từ PayOS
 * Paste actual webhook data from PayOS logs
 */
function testRealWebhookData() {
  // ✅ Paste ACTUAL webhook data từ PayOS logs vào đây
  const realWebhookData = {
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      // ... paste real data here ...
    },
    "signature": "..."  // Real signature
  };
  
  Logger.log('🧪 TESTING WITH REAL PAYOS DATA');
  Logger.log('='.repeat(60));
  
  try {
    const result = processPayOSWebhook(realWebhookData);
    
    Logger.log('✅ SUCCESS! Webhook processed correctly.');
    Logger.log(`Result: ${JSON.stringify(result, null, 2)}`);
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ FAILED: ${error.message}`);
    throw error;
  }
}

/**
 * Test individual steps separately
 */
function testIndividualSteps() {
  Logger.log('🧪 TESTING INDIVIDUAL STEPS');
  Logger.log('='.repeat(60));
  
  // Test 1: Find order
  Logger.log('\n📝 TEST 1: Find Order');
  const orderId = 'DH1768879';  // ← CHANGE TO ACTUAL ORDER ID
  const order = findOrderById(orderId);
  
  if (order) {
    Logger.log(`✅ Order found:`);
    Logger.log(`   ID: ${order.order_id}`);
    Logger.log(`   Status: ${order.status}`);
    Logger.log(`   Amount: ${order.total_amount}`);
    Logger.log(`   Customer: ${order.customer_email}`);
  } else {
    Logger.log(`❌ Order NOT found: ${orderId}`);
  }
  
  // Test 2: Check idempotency
  Logger.log('\n📝 TEST 2: Check Idempotency');
  const testTransactionId = 'FT_TEST_12345';
  const isProcessed = isTransactionProcessed(testTransactionId);
  Logger.log(`   Transaction ID: ${testTransactionId}`);
  Logger.log(`   Already processed? ${isProcessed ? 'YES' : 'NO'}`);
  
  // Test 3: Supabase SELECT
  Logger.log('\n📝 TEST 3: Supabase Connection');
  try {
    const orders = supabaseSelect('orders', {
      select: 'order_id,status',
      limit: 1
    });
    Logger.log(`✅ Supabase connection OK`);
    Logger.log(`   Sample: ${JSON.stringify(orders[0])}`);
  } catch (error) {
    Logger.log(`❌ Supabase connection FAILED: ${error.message}`);
  }
  
  Logger.log('\n' + '='.repeat(60));
  Logger.log('Individual tests completed!');
}
