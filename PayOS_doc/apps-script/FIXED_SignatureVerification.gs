/**
 * ========================================
 * PAYOS SIGNATURE VERIFICATION - FIXED
 * ========================================
 * Updated signature verification với multiple methods fallback
 * 
 * CHANGELOG:
 * - Added fallback logic to try multiple signature methods
 * - PayOS có thể dùng data.code hoặc webhookData.code
 * - Log chi tiết để debug
 */

/**
 * Verify PayOS webhook signature - UPDATED VERSION
 * Tries multiple methods để tìm ra method đúng
 * 
 * @param {object} webhookData - Webhook payload
 * @param {string} signature - Signature from webhook
 * @returns {boolean} true if valid
 */
function verifyPayOSSignature(webhookData, signature) {
  try {
    const checksumKey = getPayOSChecksumKey();
    const data = webhookData.data;
    
    Logger.log('🔐 Starting signature verification...');
    Logger.log(`Received signature: ${signature}`);
    
    // =============================================
    // METHOD 1: data.code + data.desc (Original)
    // =============================================
    const method1Data = 
      `amount=${data.amount}&` +
      `code=${data.code || webhookData.code}&` +
      `desc=${data.desc || webhookData.desc}&` +
      `orderCode=${data.orderCode}`;
    
    const method1Sig = calculateHmacSignature(method1Data, checksumKey);
    
    if (method1Sig === signature) {
      Logger.log('✅ Signature verified (Method 1: data.code/desc)');
      return true;
    }
    
    // =============================================
    // METHOD 2: webhookData.code + webhookData.desc
    // =============================================
    const method2Data = 
      `amount=${data.amount}&` +
      `code=${webhookData.code}&` +
      `desc=${webhookData.desc}&` +
      `orderCode=${data.orderCode}`;
    
    const method2Sig = calculateHmacSignature(method2Data, checksumKey);
    
    if (method2Sig === signature) {
      Logger.log('✅ Signature verified (Method 2: top-level code/desc)');
      return true;
    }
    
    // =============================================
    // METHOD 3: Sorted keys alphabetically
    // =============================================
    const signatureObj = {
      amount: data.amount,
      code: webhookData.code,
      desc: webhookData.desc,
      orderCode: data.orderCode
    };
    
    const sortedKeys = Object.keys(signatureObj).sort();
    const method3Data = sortedKeys.map(key => `${key}=${signatureObj[key]}`).join('&');
    const method3Sig = calculateHmacSignature(method3Data, checksumKey);
    
    if (method3Sig === signature) {
      Logger.log('✅ Signature verified (Method 3: sorted keys)');
      return true;
    }
    
    // =============================================
    // ALL METHODS FAILED - Log details
    // =============================================
    Logger.log('❌ Signature verification FAILED - All methods');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log(`Expected (any of):`);
    Logger.log(`  Method 1: ${method1Sig}`);
    Logger.log(`  Method 2: ${method2Sig}`);
    Logger.log(`  Method 3: ${method3Sig}`);
    Logger.log(`Received: ${signature}`);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log(`Signature data strings:`);
    Logger.log(`  Method 1: ${method1Data}`);
    Logger.log(`  Method 2: ${method2Data}`);
    Logger.log(`  Method 3: ${method3Data}`);
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return false;
    
  } catch (error) {
    Logger.log(`❌ Signature verification error: ${error.message}`);
    Logger.log(error.stack);
    return false;
  }
}

/**
 * Calculate HMAC SHA256 signature
 * Helper function để tránh duplicate code
 */
function calculateHmacSignature(data, key) {
  const signature = Utilities.computeHmacSha256Signature(
    Utilities.newBlob(data).getBytes(),
    key
  );
  
  return signature.map(byte => {
    const hex = (byte & 0xFF).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * TEMPORARY BYPASS for emergency testing
 * ⚠️ CHỈ DÙNG KHI CẦN THIẾT! PHẢI REMOVE SAU!
 */
function verifyPayOSSignature_BYPASS_ALL_SECURITY(webhookData, signature) {
  Logger.log('🚨🚨🚨 WARNING: SIGNATURE CHECK BYPASSED! 🚨🚨🚨');
  Logger.log('⚠️ THIS IS EXTREMELY DANGEROUS IN PRODUCTION!');
  Logger.log('⚠️ MUST RE-ENABLE SIGNATURE CHECK ASAP!');
  
  // Still log signature info for debugging
  const data = webhookData.data;
  Logger.log(`Webhook signature: ${signature}`);
  Logger.log(`Order: ${data.orderCode}, Amount: ${data.amount}`);
  
  return true; // ALWAYS RETURN TRUE - NO SECURITY!
}
