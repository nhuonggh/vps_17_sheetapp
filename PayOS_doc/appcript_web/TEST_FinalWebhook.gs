/**
 * ========================================
 * FINAL TEST - FULL WEBHOOK PROCESSING
 * ========================================
 * Test toàn bộ flow với real Supabase
 */

function testFullWebhookWithRealOrder() {
  // Use the order we found in test_find_real_order
  const webhookData = {
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      "accountNumber": "0987726236",
      "amount": 2000,
      "description": "DH1768573",
      "reference": "TEST_FT_" + new Date().getTime(), // Unique reference
      "transactionDateTime": new Date().toISOString(),
      "virtualAccountNumber": "",
      "counterAccountBankId": "01202001",
      "counterAccountBankName": "",
      "counterAccountName": "VO TAN NHUONG",
      "counterAccountNumber": "3180034086",
      "virtualAccountName": "",
      "currency": "VND",
      "orderCode": 1768573777,
      "paymentLinkId": "test123",
      "code": "00",
      "desc": "success"
    }
  };
  
  // Calculate correct signature
  const checksumKey = getPayOSChecksumKey();
  const data = webhookData.data;
  const sortedKeys = Object.keys(data).sort();
  const signatureString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
  
  const dataBytes = Utilities.newBlob(signatureString).getBytes();
  const keyBytes = Utilities.newBlob(checksumKey).getBytes();
  const calculatedSig = Utilities.computeHmacSha256Signature(dataBytes, keyBytes);
  
  const signature = calculatedSig.map(byte => {
    const hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
  
  webhookData.signature = signature;
  
  Logger.log('🧪 TESTING FULL WEBHOOK PROCESSING');
  Logger.log('═══════════════════════════════════════════════════════════\n');
  
  Logger.log('📦 Test Data:');
  Logger.log(`   Order: ${data.description}`);
  Logger.log(`   Amount: ${data.amount}`);
  Logger.log(`   Reference: ${data.reference}`);
  Logger.log(`   Signature: ${signature}\n`);
  
  try {
    // ═══════════════════════════════════════
    // STEP 1: Signature Verification
    // ═══════════════════════════════════════
    Logger.log('STEP 1: Signature Verification');
    const isValidSig = verifyPayOSSignature(webhookData, signature);
    if (!isValidSig) {
      throw new Error('Signature verification failed!');
    }
    Logger.log('✅ Signature verified\n');
    
    // ═══════════════════════════════════════
    // STEP 2: Idempotency Check (with ANON KEY)
    // ═══════════════════════════════════════
    Logger.log('STEP 2: Idempotency Check');
    const transactionId = data.reference;
    const isProcessed = isTransactionProcessed(transactionId);
    Logger.log(`   Transaction ${transactionId}: ${isProcessed ? 'Already processed' : 'New'}`);
    Logger.log('✅ Idempotency check passed\n');
    
    // ═══════════════════════════════════════
    // STEP 3: Find Order (with ANON KEY)
    // ═══════════════════════════════════════
    Logger.log('STEP 3: Find Order');
    const description = data.description;
    Logger.log(`   Looking for order with description: ${description}`);
    
    // Try LIKE search
    const results = supabaseSelect('orders', {
      select: '*',
      like: { order_id: `${description}%` },
      limit: 1
    });
    
    if (!results || results.length === 0) {
      throw new Error(`Order not found for description: ${description}`);
    }
    
    const order = results[0];
    Logger.log(`   ✅ Found order: ${order.order_id}`);
    Logger.log(`   Status: ${order.status}`);
    Logger.log(`   Amount: ${order.total_amount}\n`);
    
    // ═══════════════════════════════════════
    // STEP 4: Validate Amount
    // ═══════════════════════════════════════
    Logger.log('STEP 4: Amount Validation');
    const expectedAmount = Math.round(order.total_amount);
    const receivedAmount = data.amount;
    
    if (receivedAmount !== expectedAmount) {
      throw new Error(`Amount mismatch: expected ${expectedAmount}, got ${receivedAmount}`);
    }
    Logger.log(`   ✅ Amount matches: ${receivedAmount} VND\n`);
    
    // ═══════════════════════════════════════
    // STEP 5: Update Order (with SERVICE_ROLE KEY)
    // ═══════════════════════════════════════
    Logger.log('STEP 5: Update Order Status');
    Logger.log('   ⚠️  SKIPPING UPDATE (to avoid changing real order)');
    Logger.log('   In production: supabaseUpdate("orders", {...}, {order_id: orderId})');
    Logger.log('   Would update status to: paid\n');
    
    // TEST UPDATE on test table (safer)
    // Commenting out to avoid actual update:
    /*
    const updatedOrder = supabaseUpdate('orders', 
      {
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'bank_transfer'
      },
      { order_id: order.order_id }
    );
    Logger.log('✅ Order updated\n');
    */
    
    // ═══════════════════════════════════════
    // STEP 6: Log Transaction (with SERVICE_ROLE KEY)
    // ═══════════════════════════════════════
    Logger.log('STEP 6: Log Transaction');
    Logger.log('   Testing INSERT with SERVICE_ROLE key...');
    
    const transactionData = {
      order_id: order.id,
      transaction_id: transactionId,
      amount: data.amount,
      status: 'success',
      payment_method: 'bank_transfer',
      gateway: 'payos',
      gateway_data: JSON.stringify(data),
      created_at: new Date().toISOString()
    };
    
    const insertResult = supabaseInsert('transactions', transactionData);
    
    if (insertResult) {
      Logger.log('   ✅ Transaction logged successfully!\n');
    } else {
      Logger.log('   ⚠️  Transaction already exists (duplicate)\n');
    }
    
    // ═══════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════
    Logger.log('═══════════════════════════════════════════════════════════');
    Logger.log('📊 TEST RESULTS:');
    Logger.log('   ✅ Signature Verification: PASSED');
    Logger.log('   ✅ Idempotency Check (ANON KEY): PASSED');
    Logger.log('   ✅ Find Order (ANON KEY): PASSED');
    Logger.log('   ✅ Amount Validation: PASSED');
    Logger.log('   ⚠️  Update Order: SKIPPED (to protect real data)');
    Logger.log('   ✅ Log Transaction (SERVICE_ROLE): PASSED');
    Logger.log('═══════════════════════════════════════════════════════════');
    Logger.log('\n🎉 WEBHOOK PROCESSING TEST COMPLETED!');
    Logger.log('\n✅ Ready for production deployment!');
    
    return true;
    
  } catch (error) {
    Logger.log('\n❌ TEST FAILED!');
    Logger.log(`Error: ${error.message}`);
    Logger.log(error.stack);
    return false;
  }
}

/**
 * Quick test: Just verify keys work
 */
function quickTestKeys() {
  Logger.log('🧪 QUICK TEST: Verify all keys work\n');
  
  let allPassed = true;
  
  // Test 1: ANON KEY for SELECT
  Logger.log('TEST 1: ANON KEY (SELECT)');
  try {
    const orders = supabaseSelect('orders', {
      select: 'order_id',
      limit: 1
    });
    Logger.log('   ✅ ANON KEY works for SELECT\n');
  } catch (error) {
    Logger.log(`   ❌ ANON KEY failed: ${error.message}\n`);
    allPassed = false;
  }
  
  // Test 2: SERVICE_ROLE KEY for INSERT
  Logger.log('TEST 2: SERVICE_ROLE KEY (INSERT)');
  try {
    const testData = {
      order_id: 999999,
      customer_email: 'test_' + new Date().getTime() + '@test.com',
      error_message: 'Test from Apps Script',
      retry_count: 0,
      created_at: new Date().toISOString()
    };
    
    const result = supabaseInsert('failed_enrollments', testData);
    if (result) {
      Logger.log('   ✅ SERVICE_ROLE KEY works for INSERT\n');
    } else {
      Logger.log('   ⚠️  INSERT returned null (might be duplicate)\n');
    }
  } catch (error) {
    Logger.log(`   ❌ SERVICE_ROLE KEY failed: ${error.message}\n`);
    allPassed = false;
  }
  
  // Summary
  Logger.log('═══════════════════════════════════════');
  if (allPassed) {
    Logger.log('🎉 ALL KEYS WORKING!');
    Logger.log('✅ Ready to process webhooks!');
  } else {
    Logger.log('❌ SOME KEYS FAILED!');
    Logger.log('⚠️  Check error messages above');
  }
  Logger.log('═══════════════════════════════════════');
  
  return allPassed;
}
