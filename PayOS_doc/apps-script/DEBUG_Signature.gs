/**
 * ========================================
 * PAYOS SIGNATURE DEBUG SCRIPT
 * ========================================
 * Script để debug signature verification issue
 * 
 * CÁCH DÙNG:
 * 1. Copy webhook data thực tế từ PayOS
 * 2. Paste vào sampleWebhook
 * 3. Run testSignatureDebug()
 * 4. Xem logs để thấy signature calculation
 */

/**
 * Test signature với webhook data THỰC TẾ từ PayOS
 */
function testSignatureDebug() {
  // Webhook data THỰC TẾ từ bạn
  const realWebhook = {
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      "accountNumber": "0987726236",
      "amount": 2000,
      "description": "DH1768571",
      "reference": "FT26016339085826",
      "transactionDateTime": "2026-01-16 20:44:40",
      "virtualAccountNumber": "",
      "counterAccountBankId": "01202001",
      "counterAccountBankName": "",
      "counterAccountName": "VO TAN NHUONG",
      "counterAccountNumber": "3180034086",
      "virtualAccountName": "",
      "currency": "VND",
      "orderCode": 1768571046,
      "paymentLinkId": "4a1caa3574ef4bd8a6ab40adb2b7dc1b",
      "code": "00",
      "desc": "success"
    },
    "signature": "045a881779352c41a805037058ad9ad4bbdb84bd7c8b71fed6d5cbd4de5f6622"
  };
  
  Logger.log('🧪 DEBUG: Testing signature with REAL webhook data...');
  Logger.log('================================================');
  
  const checksumKey = getPayOSChecksumKey();
  Logger.log(`🔑 Checksum Key: ${checksumKey.substring(0, 20)}...`);
  
  const data = realWebhook.data;
  const receivedSignature = realWebhook.signature;
  
  Logger.log(`📦 Webhook Data:`);
  Logger.log(`   amount: ${data.amount}`);
  Logger.log(`   orderCode: ${data.orderCode}`);
  Logger.log(`   code (in data): ${data.code}`);
  Logger.log(`   desc (in data): ${data.desc}`);
  Logger.log(`   code (top level): ${realWebhook.code}`);
  Logger.log(`   desc (top level): ${realWebhook.desc}`);
  
  // =============================================
  // METHOD 1: Using data.code and data.desc
  // =============================================
  Logger.log('\n📝 METHOD 1: data.code + data.desc');
  const signatureData1 = 
    `amount=${data.amount}&` +
    `code=${data.code}&` +
    `desc=${data.desc}&` +
    `orderCode=${data.orderCode}`;
  
  Logger.log(`   Signature String: ${signatureData1}`);
  
  const calc1 = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(signatureData1).getBytes(),
    checksumKey
  );
  
  const hex1 = calc1.map(byte => {
    const h = (byte & 0xFF).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
  
  Logger.log(`   Calculated: ${hex1}`);
  Logger.log(`   Received:   ${receivedSignature}`);
  Logger.log(`   Match? ${hex1 === receivedSignature ? '✅ YES' : '❌ NO'}`);
  
  // =============================================
  // METHOD 2: Using top-level code/desc
  // =============================================
  Logger.log('\n📝 METHOD 2: webhookData.code + webhookData.desc');
  const signatureData2 = 
    `amount=${data.amount}&` +
    `code=${realWebhook.code}&` +
    `desc=${realWebhook.desc}&` +
    `orderCode=${data.orderCode}`;
  
  Logger.log(`   Signature String: ${signatureData2}`);
  
  const calc2 = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(signatureData2).getBytes(),
    checksumKey
  );
  
  const hex2 = calc2.map(byte => {
    const h = (byte & 0xFF).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
  
  Logger.log(`   Calculated: ${hex2}`);
  Logger.log(`   Received:   ${receivedSignature}`);
  Logger.log(`   Match? ${hex2 === receivedSignature ? '✅ YES' : '❌ NO'}`);
  
  // =============================================
  // METHOD 3: Sorted alphabetically (PayOS V2?)
  // =============================================
  Logger.log('\n📝 METHOD 3: Sorted keys (PayOS V2)');
  
  // Build object with all relevant fields
  const signatureObj = {
    amount: data.amount,
    code: realWebhook.code,
    desc: realWebhook.desc,
    orderCode: data.orderCode
  };
  
  // Sort keys alphabetically
  const sortedKeys = Object.keys(signatureObj).sort();
  const sortedPairs = sortedKeys.map(key => `${key}=${signatureObj[key]}`);
  const signatureData3 = sortedPairs.join('&');
  
  Logger.log(`   Signature String: ${signatureData3}`);
  
  const calc3 = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(signatureData3).getBytes(),
    checksumKey
  );
  
  const hex3 = calc3.map(byte => {
    const h = (byte & 0xFF).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
  
  Logger.log(`   Calculated: ${hex3}`);
  Logger.log(`   Received:   ${receivedSignature}`);
  Logger.log(`   Match? ${hex3 === receivedSignature ? '✅ YES' : '❌ NO'}`);
  
  // =============================================
  // METHOD 4: All data fields (full object)
  // =============================================
  Logger.log('\n📝 METHOD 4: Full data object');
  
  // Try với TẤT CẢ fields trong data
  const dataKeys = Object.keys(data).filter(k => 
    k !== 'virtualAccountNumber' && 
    k !== 'virtualAccountName' && 
    k !== 'counterAccountBankName' &&
    data[k] !== '' && 
    data[k] !== null
  ).sort();
  
  const fullPairs = dataKeys.map(key => `${key}=${data[key]}`);
  const signatureData4 = fullPairs.join('&');
  
  Logger.log(`   Keys used: ${dataKeys.join(', ')}`);
  Logger.log(`   Signature String (first 100 chars): ${signatureData4.substring(0, 100)}...`);
  
  const calc4 = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(signatureData4).getBytes(),
    checksumKey
  );
  
  const hex4 = calc4.map(byte => {
    const h = (byte & 0xFF).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
  
  Logger.log(`   Calculated: ${hex4}`);
  Logger.log(`   Received:   ${receivedSignature}`);
  Logger.log(`   Match? ${hex4 === receivedSignature ? '✅ YES' : '❌ NO'}`);
  
  // =============================================
  // SUMMARY
  // =============================================
  Logger.log('\n================================================');
  Logger.log('📊 SUMMARY:');
  Logger.log(`   Method 1 (data.code/desc): ${hex1 === receivedSignature ? '✅' : '❌'}`);
  Logger.log(`   Method 2 (top.code/desc): ${hex2 === receivedSignature ? '✅' : '❌'}`);
  Logger.log(`   Method 3 (sorted): ${hex3 === receivedSignature ? '✅' : '❌'}`);
  Logger.log(`   Method 4 (full data): ${hex4 === receivedSignature ? '✅' : '❌'}`);
  Logger.log('================================================');
  
  // Return result
  return {
    method1: hex1 === receivedSignature,
    method2: hex2 === receivedSignature,
    method3: hex3 === receivedSignature,
    method4: hex4 === receivedSignature
  };
}

/**
 * FALLBACK: Temporarily disable signature check for testing
 * ⚠️ CHỈ DÙNG CHO TESTING! PHẢI ENABLE LẠI CHO PRODUCTION!
 */
function verifyPayOSSignature_BYPASS(webhookData, signature) {
  Logger.log('⚠️ BYPASS MODE: Signature check disabled for testing!');
  Logger.log('⚠️ MUST RE-ENABLE FOR PRODUCTION!');
  return true; // Always return true
}
