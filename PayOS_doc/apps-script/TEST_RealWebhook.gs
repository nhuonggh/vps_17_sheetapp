/**
 * ========================================
 * TEST SIGNATURE WITH REAL WEBHOOK DATA
 * ========================================
 * Function để test signature verification với data THỰC TẾ
 * 
 * CÁCH DÙNG:
 * 1. Copy function này vào Apps Script
 * 2. Run: testRealWebhookSignature()
 * 3. Xem logs để thấy method nào MATCH
 */

/**
 * Test với webhook data THỰC TẾ từ PayOS
 */
function testRealWebhookSignature() {
  // Webhook data THỰC TẾ từ bạn (latest)
  const webhookData = {
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
  };
  
  Logger.log('🧪 TESTING REAL WEBHOOK SIGNATURE');
  Logger.log('═══════════════════════════════════════════════════════');
  
  const data = webhookData.data;
  const receivedSignature = webhookData.signature;
  const checksumKey = getPayOSChecksumKey();
  
  Logger.log(`\n📦 Webhook Info:`);
  Logger.log(`   Order Code: ${data.orderCode}`);
  Logger.log(`   Amount: ${data.amount} VND`);
  Logger.log(`   Reference: ${data.reference}`);
  Logger.log(`   Top-level code: "${webhookData.code}"`);
  Logger.log(`   Top-level desc: "${webhookData.desc}"`);
  Logger.log(`   Data.code: "${data.code}"`);
  Logger.log(`   Data.desc: "${data.desc}"`);
  Logger.log(`\n🔐 Received Signature:\n   ${receivedSignature}`);
  Logger.log(`\n🔑 Checksum Key (first 20 chars):\n   ${checksumKey.substring(0, 20)}...`);
  
  // Test all methods
  const methods = [
    testMethod1(data, webhookData, checksumKey, receivedSignature),
    testMethod2(data, webhookData, checksumKey, receivedSignature),
    testMethod3(data, webhookData, checksumKey, receivedSignature),
    testMethod4(data, webhookData, checksumKey, receivedSignature),
    testMethod5(data, webhookData, checksumKey, receivedSignature),
  ];
  
  // Summary
  Logger.log('\n═══════════════════════════════════════════════════════');
  Logger.log('📊 SUMMARY:');
  methods.forEach((result, index) => {
    const icon = result.match ? '✅' : '❌';
    Logger.log(`   ${icon} Method ${index + 1}: ${result.name} ${result.match ? '← WINNER!' : ''}`);
  });
  Logger.log('═══════════════════════════════════════════════════════');
  
  // Find winner
  const winner = methods.find(m => m.match);
  if (winner) {
    Logger.log(`\n🎉 FOUND WORKING METHOD: ${winner.name}`);
    Logger.log(`\n📝 Use this signature string format:`);
    Logger.log(`   ${winner.signatureString}`);
    return winner;
  } else {
    Logger.log(`\n❌ NO METHOD MATCHED! Need to investigate further.`);
    Logger.log(`\n🔍 Possible issues:`);
    Logger.log(`   1. PAYOS_CHECKSUM_KEY might be incorrect`);
    Logger.log(`   2. PayOS might use a different signature format`);
    Logger.log(`   3. Encoding issue (UTF-8, URL encoding, etc.)`);
    return null;
  }
}

/**
 * Method 1: data.code + data.desc (fallback to top-level)
 */
function testMethod1(data, webhookData, key, expectedSig) {
  const signatureString = 
    `amount=${data.amount}&` +
    `code=${data.code || webhookData.code}&` +
    `desc=${data.desc || webhookData.desc}&` +
    `orderCode=${data.orderCode}`;
  
  const calculated = calculateHmacSignature(signatureString, key);
  const match = calculated === expectedSig;
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 1: data.code OR top.code (fallback)`);
  Logger.log(`   Signature String: ${signatureString}`);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expectedSig}`);
  Logger.log(`   Match? ${match ? '✅ YES!' : '❌ No'}`);
  
  return { name: 'data.code with fallback', match, signatureString, calculated };
}

/**
 * Method 2: TOP-LEVEL code + desc ONLY
 */
function testMethod2(data, webhookData, key, expectedSig) {
  const signatureString = 
    `amount=${data.amount}&` +
    `code=${webhookData.code}&` +
    `desc=${webhookData.desc}&` +
    `orderCode=${data.orderCode}`;
  
  const calculated = calculateHmacSignature(signatureString, key);
  const match = calculated === expectedSig;
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 2: TOP-LEVEL code + desc`);
  Logger.log(`   Signature String: ${signatureString}`);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expectedSig}`);
  Logger.log(`   Match? ${match ? '✅ YES!' : '❌ No'}`);
  
  return { name: 'top-level code/desc', match, signatureString, calculated };
}

/**
 * Method 3: data.code + data.desc ONLY (no fallback)
 */
function testMethod3(data, webhookData, key, expectedSig) {
  const signatureString = 
    `amount=${data.amount}&` +
    `code=${data.code}&` +
    `desc=${data.desc}&` +
    `orderCode=${data.orderCode}`;
  
  const calculated = calculateHmacSignature(signatureString, key);
  const match = calculated === expectedSig;
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 3: data.code + data.desc (no fallback)`);
  Logger.log(`   Signature String: ${signatureString}`);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expectedSig}`);
  Logger.log(`   Match? ${match ? '✅ YES!' : '❌ No'}`);
  
  return { name: 'data.code/desc only', match, signatureString, calculated };
}

/**
 * Method 4: Sorted keys alphabetically
 */
function testMethod4(data, webhookData, key, expectedSig) {
  const obj = {
    amount: data.amount,
    code: webhookData.code,
    desc: webhookData.desc,
    orderCode: data.orderCode
  };
  
  const sortedKeys = Object.keys(obj).sort();
  const signatureString = sortedKeys.map(k => `${k}=${obj[k]}`).join('&');
  
  const calculated = calculateHmacSignature(signatureString, key);
  const match = calculated === expectedSig;
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 4: Sorted keys (alphabetically)`);
  Logger.log(`   Keys order: ${sortedKeys.join(', ')}`);
  Logger.log(`   Signature String: ${signatureString}`);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expectedSig}`);
  Logger.log(`   Match? ${match ? '✅ YES!' : '❌ No'}`);
  
  return { name: 'sorted keys', match, signatureString, calculated };
}

/**
 * Method 5: String values (code/desc as strings)
 */
function testMethod5(data, webhookData, key, expectedSig) {
  // Try with explicit string conversion
  const signatureString = 
    `amount=${String(data.amount)}&` +
    `code=${String(webhookData.code)}&` +
    `desc=${String(webhookData.desc)}&` +
    `orderCode=${String(data.orderCode)}`;
  
  const calculated = calculateHmacSignature(signatureString, key);
  const match = calculated === expectedSig;
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 5: Explicit String() conversion`);
  Logger.log(`   Signature String: ${signatureString}`);
  Logger.log(`   Calculated: ${calculated}`);
  Logger.log(`   Expected:   ${expectedSig}`);
  Logger.log(`   Match? ${match ? '✅ YES!' : '❌ No'}`);
  
  return { name: 'string conversion', match, signatureString, calculated };
}

/**
 * Helper: Calculate HMAC SHA256
 * FIXED: Convert key to byte array!
 */
function calculateHmacSignature(data, key) {
  try {
    // Convert both data and key to byte arrays
    const dataBytes = Utilities.newBlob(data).getBytes();
    const keyBytes = Utilities.newBlob(key).getBytes();
    
    // Calculate HMAC SHA256
    const signature = Utilities.computeHmacSha256Signature(dataBytes, keyBytes);
    
    // Convert to hex string
    return signature.map(byte => {
      const hex = (byte & 0xFF).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  } catch (error) {
    Logger.log(`❌ Error calculating signature: ${error.message}`);
    return 'ERROR';
  }
}

/**
 * Verify checksum key is correct
 */
function verifyChecksumKey() {
  const key = getPayOSChecksumKey();
  
  Logger.log('🔑 Verifying PAYOS_CHECKSUM_KEY...');
  Logger.log(`   Length: ${key.length} characters`);
  Logger.log(`   First 20 chars: ${key.substring(0, 20)}...`);
  Logger.log(`   Last 20 chars: ...${key.substring(key.length - 20)}`);
  
  // Expected from .env.local
  const expectedKey = '0c730595762e694b32561037cac5cefd2843ece4319034b5bd69a1979a31c593';
  
  if (key === expectedKey) {
    Logger.log('   ✅ Key matches .env.local');
  } else {
    Logger.log('   ⚠️ Key does NOT match .env.local!');
    Logger.log(`   Expected: ${expectedKey}`);
    Logger.log(`   Got:      ${key}`);
  }
  
  return key;
}

/**
 * Quick test - Just run this!
 */
function quickTest() {
  Logger.log('🚀 QUICK SIGNATURE TEST\n');
  
  // 1. Verify checksum key
  verifyChecksumKey();
  
  Logger.log('\n');
  
  // 2. Test signature
  const result = testRealWebhookSignature();
  
  if (result) {
    Logger.log(`\n\n✅ SUCCESS! Use this code in PayOSWebhook.gs:`);
    Logger.log(`\nconst signatureString = \`${result.signatureString}\`;`);
  } else {
    Logger.log(`\n\n❌ FAILED! Check checksum key or contact PayOS support.`);
  }
}
