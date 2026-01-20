/**
 * ADVANCED WEBHOOK SIGNATURE TEST
 * Test với sorted ALL fields trong webhookData.data
 */

function testAllFieldsSorted() {
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
  
  Logger.log('🧪 TESTING: ALL FIELDS SORTED (PayOS Spec)');
  Logger.log('══════════════════════════════════════════════════════════');
  
  const data = webhookData.data;
  const expectedSignature = webhookData.signature;
  const checksumKey = getPayOSChecksumKey();
  
  // Get ALL keys from data, sort alphabetically
  const allKeys = Object.keys(data).sort();
  
  Logger.log(`\n📋 All keys (${allKeys.length} total):`);
  Logger.log(`   ${allKeys.join(', ')}`);
  
  // BUILD METHODS WITH DIFFERENT FIELD COMBINATIONS
  
  // METHOD 1: All fields (including empty strings)
  const method1String = allKeys.map(key => `${key}=${data[key]}`).join('&');
  const method1Sig = calculateHmacSignature(method1String, checksumKey);
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 1: All fields (with empty strings)`);
  Logger.log(`   Signature String (first 200 chars):`);
  Logger.log(`   ${method1String.substring(0, 200)}...`);
  Logger.log(`   Calculated: ${method1Sig}`);
  Logger.log(`   Expected:   ${expectedSignature}`);
  Logger.log(`   Match? ${method1Sig === expectedSignature ? '✅ YES!' : '❌ No'}`);
  
  // METHOD 2: All fields EXCLUDING empty strings
  const nonEmptyKeys = allKeys.filter(key => data[key] !== '' && data[key] !== null);
  const method2String = nonEmptyKeys.map(key => `${key}=${data[key]}`).join('&');
  const method2Sig = calculateHmacSignature(method2String, checksumKey);
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 2: Exclude empty strings`);
  Logger.log(`   Non-empty keys (${nonEmptyKeys.length}): ${nonEmptyKeys.join(', ')}`);
  Logger.log(`   Signature String (first 200 chars):`);
  Logger.log(`   ${method2String.substring(0, 200)}...`);
  Logger.log(`   Calculated: ${method2Sig}`);
  Logger.log(`   Expected:   ${expectedSignature}`);
  Logger.log(`   Match? ${method2Sig === expectedSignature ? '✅ YES!' : '❌ No'}`);
  
  // METHOD 3: Only core fields (like payment link creation)
  const coreFields = ['amount', 'code', 'desc', 'orderCode'];
  const coreFieldsInData = coreFields.filter(f => data[f] !== undefined).sort();
  const method3String = coreFieldsInData.map(key => `${key}=${data[key]}`).join('&');
  const method3Sig = calculateHmacSignature(method3String, checksumKey);
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 3: Core fields only (amount, code, desc, orderCode)`);
  Logger.log(`   Signature String: ${method3String}`);
  Logger.log(`   Calculated: ${method3Sig}`);
  Logger.log(`   Expected:   ${expectedSignature}`);
  Logger.log(`   Match? ${method3Sig === expectedSignature ? '✅ YES!' : '❌ No'}`);
  
  // METHOD 4: URL encode values
  const method4String = nonEmptyKeys.map(key => {
    return `${key}=${encodeURIComponent(String(data[key]))}`;
  }).join('&');
  const method4Sig = calculateHmacSignature(method4String, checksumKey);
  
  Logger.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Logger.log(`📝 METHOD 4: URL Encoded values`);
  Logger.log(`   Signature String (first 200 chars):`);
  Logger.log(`   ${method4String.substring(0, 200)}...`);
  Logger.log(`   Calculated: ${method4Sig}`);
  Logger.log(`   Expected:   ${expectedSignature}`);
  Logger.log(`   Match? ${method4Sig === expectedSignature ? '✅ YES!' : '❌ No'}`);
  
  // SUMMARY
  Logger.log(`\n══════════════════════════════════════════════════════════`);
  Logger.log('📊 SUMMARY:');
  Logger.log(`   ${method1Sig === expectedSignature ? '✅' : '❌'} Method 1: All fields (with empty)`);
  Logger.log(`   ${method2Sig === expectedSignature ? '✅' : '❌'} Method 2: Non-empty fields only`);
  Logger.log(`   ${method3Sig === expectedSignature ? '✅' : '❌'} Method 3: Core fields only`);
  Logger.log(`   ${method4Sig === expectedSignature ? '✅' : '❌'} Method 4: URL encoded`);
  Logger.log('══════════════════════════════════════════════════════════');
  
  // Check if any matched
  const results = [
    { name: 'All fields', match: method1Sig === expectedSignature, string: method1String },
    { name: 'Non-empty only', match: method2Sig === expectedSignature, string: method2String },
    { name: 'Core fields', match: method3Sig === expectedSignature, string: method3String },
    { name: 'URL encoded', match: method4Sig === expectedSignature, string: method4String },
  ];
  
  const winner = results.find(r => r.match);
  
  if (winner) {
    Logger.log(`\n🎉 WINNER FOUND: ${winner.name}!`);
    Logger.log(`\n✅ CORRECT SIGNATURE STRING FORMAT:`);
    Logger.log(`   ${winner.string.substring(0, 300)}...`);
    return winner;
  } else {
    Logger.log(`\n❌ NO METHOD MATCHED!`);
    Logger.log(`\n🔍 DEBUGGING INFO:`);
    Logger.log(`   All methods calculated same signature: ${method1Sig === method2Sig && method2Sig === method3Sig}`);
    Logger.log(`   This suggests the issue is:`);
    Logger.log(`     1. Wrong CHECKSUM_KEY, OR`);
    Logger.log(`     2. PayOS uses completely different signature algorithm`);
    return null;
  }
}

/**
 * Helper: Calculate HMAC signature
 */
function calculateHmacSignature(data, key) {
  try {
    const dataBytes = Utilities.newBlob(data).getBytes();
    const keyBytes = Utilities.newBlob(key).getBytes();
    const signature = Utilities.computeHmacSha256Signature(dataBytes, keyBytes);
    
    return signature.map(byte => {
      const hex = (byte & 0xFF).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
    return 'ERROR';
  }
}
