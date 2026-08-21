/**
 * ========================================
 * PAYOS SIGNATURE TEST - USER'S ACTUAL DATA
 * ========================================
 * Test signature verification với webhook data THỰC TẾ từ user
 * OrderCode: 1768879458
 * Date: 2026-01-20 10:26:06
 */

/**
 * Main test function - Run this in Apps Script Editor
 */
function testUserWebhookSignature() {
  // ✅ User's ACTUAL webhook data (orderCode: 1768879458)
  const userWebhook = {
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      "accountNumber": "0987726236",
      "amount": 2000,
      "description": "DH1768879",
      "reference": "FT26020020271728",
      "transactionDateTime": "2026-01-20 10:26:06",
      "virtualAccountNumber": "",
      "counterAccountBankId": "970422",
      "counterAccountBankName": "",
      "counterAccountName": null,
      "counterAccountNumber": "2281072020614",
      "virtualAccountName": "",
      "currency": "VND",
      "orderCode": 1768879458,
      "paymentLinkId": "2ab920da07e748208ed76fc3e871eaa6",
      "code": "00",
      "desc": "success"
    },
    "signature": "23fbd5e1b3cc99978a10d11a8049f6c43df9d25dc91880aeda1113cafe976d44"
  };
  
  const checksumKey = getPayOSChecksumKey();
  const data = userWebhook.data;
  const receivedSig = userWebhook.signature;
  
  Logger.log('🧪 TESTING PAYOS SIGNATURE WITH USER DATA');
  Logger.log('='.repeat(60));
  Logger.log(`Order Code: ${data.orderCode}`);
  Logger.log(`Amount: ${data.amount}`);
  Logger.log(`Description: ${data.description}`);
  Logger.log(`Expected Signature: ${receivedSig}`);
  Logger.log(`Checksum Key (first 20 chars): ${checksumKey.substring(0, 20)}...`);
  Logger.log('='.repeat(60));
  
  // Test all 4 possible methods
  const results = {
    method1: testMethod1_FourFieldsDataLevel(data, userWebhook, checksumKey, receivedSig),
    method2: testMethod2_FourFieldsTopLevel(data, userWebhook, checksumKey, receivedSig),
    method3: testMethod3_AllFieldsIncludingEmpty(data, checksumKey, receivedSig),
    method4: testMethod4_AllFieldsExcludingEmpty(data, checksumKey, receivedSig)
  };
  
  // Summary
  Logger.log('\n' + '='.repeat(60));
  Logger.log('📊 SUMMARY:');
  Logger.log(`   Method 1 (4 fields, data.code/desc): ${results.method1 ? '✅ CORRECT' : '❌ WRONG'}`);
  Logger.log(`   Method 2 (4 fields, top.code/desc):  ${results.method2 ? '✅ CORRECT' : '❌ WRONG'}`);
  Logger.log(`   Method 3 (ALL fields, with empty):   ${results.method3 ? '✅ CORRECT' : '❌ WRONG'}`);
  Logger.log(`   Method 4 (ALL fields, no empty):     ${results.method4 ? '✅ CORRECT' : '❌ WRONG'}`);
  Logger.log('='.repeat(60));
  
  // Find winner
  const winner = Object.keys(results).find(key => results[key]);
  if (winner) {
    Logger.log(`\n🎯 WINNER: ${winner.toUpperCase()}`);
    Logger.log(`✅ Use this method in your webhook handler!`);
  } else {
    Logger.log('\n❌ NO METHOD MATCHED!');
    Logger.log('⚠️  Check PAYOS_CHECKSUM_KEY or contact PayOS support');
  }
  
  return results;
}

// ============================================
// METHOD 1: 4 fields only (data.code/desc)
// ============================================
function testMethod1_FourFieldsDataLevel(data, webhook, key, expected) {
  Logger.log('\n📝 METHOD 1: 4 Fields (data.code + data.desc)');
  Logger.log('   Fields: amount, code (from data), desc (from data), orderCode');
  
  const sigString = `amount=${data.amount}&code=${data.code}&desc=${data.desc}&orderCode=${data.orderCode}`;
  Logger.log(`   Signature String: ${sigString}`);
  
  const calculated = calculateHMAC(sigString, key);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expected}`);
  
  const match = calculated === expected;
  Logger.log(`   Match: ${match ? '✅ YES' : '❌ NO'}`);
  
  if (match) {
    Logger.log('   🎯 METHOD 1 IS CORRECT!');
  }
  
  return match;
}

// ============================================
// METHOD 2: 4 fields only (top-level code/desc)
// ============================================
function testMethod2_FourFieldsTopLevel(data, webhook, key, expected) {
  Logger.log('\n📝 METHOD 2: 4 Fields (top-level code + desc)');
  Logger.log('   Fields: amount, code (from webhook), desc (from webhook), orderCode');
  
  const sigString = `amount=${data.amount}&code=${webhook.code}&desc=${webhook.desc}&orderCode=${data.orderCode}`;
  Logger.log(`   Signature String: ${sigString}`);
  
  const calculated = calculateHMAC(sigString, key);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expected}`);
  
  const match = calculated === expected;
  Logger.log(`   Match: ${match ? '✅ YES' : '❌ NO'}`);
  
  if (match) {
    Logger.log('   🎯 METHOD 2 IS CORRECT!');
  }
  
  return match;
}

// ============================================
// METHOD 3: ALL data fields sorted (including empty/null)
// ============================================
function testMethod3_AllFieldsIncludingEmpty(data, key, expected) {
  Logger.log('\n📝 METHOD 3: ALL Data Fields Sorted (INCLUDING empty/null)');
  
  const sortedKeys = Object.keys(data).sort();
  const sigString = sortedKeys.map(k => `${k}=${data[k]}`).join('&');
  
  Logger.log(`   Fields (${sortedKeys.length}): ${sortedKeys.join(', ')}`);
  Logger.log(`   Signature String (first 120 chars): ${sigString.substring(0, 120)}...`);
  Logger.log(`   Full String Length: ${sigString.length} chars`);
  
  const calculated = calculateHMAC(sigString, key);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expected}`);
  
  const match = calculated === expected;
  Logger.log(`   Match: ${match ? '✅ YES' : '❌ NO'}`);
  
  if (match) {
    Logger.log('   🎯 METHOD 3 IS CORRECT!');
  }
  
  return match;
}

// ============================================
// METHOD 4: ALL data fields sorted (EXCLUDING empty/null)
// ============================================
function testMethod4_AllFieldsExcludingEmpty(data, key, expected) {
  Logger.log('\n📝 METHOD 4: ALL Data Fields Sorted (EXCLUDING empty/null)');
  
  // Filter out empty strings, null, and undefined
  const filteredData = {};
  Object.keys(data).forEach(k => {
    const val = data[k];
    if (val !== '' && val !== null && val !== undefined) {
      filteredData[k] = val;
    }
  });
  
  const sortedKeys = Object.keys(filteredData).sort();
  const sigString = sortedKeys.map(k => `${k}=${filteredData[k]}`).join('&');
  
  Logger.log(`   Fields INCLUDED (${sortedKeys.length}): ${sortedKeys.join(', ')}`);
  
  // Show excluded fields
  const excludedKeys = Object.keys(data).filter(k => !sortedKeys.includes(k));
  if (excludedKeys.length > 0) {
    Logger.log(`   Fields EXCLUDED (${excludedKeys.length}): ${excludedKeys.join(', ')}`);
  }
  
  Logger.log(`   Signature String (first 120 chars): ${sigString.substring(0, 120)}...`);
  Logger.log(`   Full String Length: ${sigString.length} chars`);
  
  const calculated = calculateHMAC(sigString, key);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expected}`);
  
  const match = calculated === expected;
  Logger.log(`   Match: ${match ? '✅ YES' : '❌ NO'}`);
  
  if (match) {
    Logger.log('   🎯 METHOD 4 IS CORRECT!');
  }
  
  return match;
}

// ============================================
// HELPER: Calculate HMAC SHA256
// ============================================
function calculateHMAC(data, key) {
  const signature = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(data).getBytes(),
    Utilities.newBlob(key).getBytes()
  );
  
  return signature.map(byte => {
    const hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// ============================================
// VERIFICATION: Check if checksum key is set
// ============================================
function verifyChecksumKey() {
  const key = getPayOSChecksumKey();
  
  if (!key || key.length === 0) {
    Logger.log('❌ ERROR: PAYOS_CHECKSUM_KEY is not set!');
    Logger.log('   Run setupScriptProperties() first');
    return false;
  }
  
  Logger.log('✅ PAYOS_CHECKSUM_KEY is set');
  Logger.log(`   Length: ${key.length} chars`);
  Logger.log(`   First 20 chars: ${key.substring(0, 20)}...`);
  
  return true;
}
