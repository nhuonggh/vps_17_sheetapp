/**
 * ========================================
 * DEBUG PAYOS CHECKSUM KEY
 * ========================================
 * Verify PAYOS_CHECKSUM_KEY is correctly set
 */

/**
 * Show current Script Properties
 */
function debugShowScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  
  Logger.log('📋 SCRIPT PROPERTIES:');
  Logger.log('='.repeat(60));
  
  Object.keys(allProps).forEach(key => {
    const value = allProps[key];
    
    if (key.includes('KEY') || key.includes('SECRET')) {
      // Mask sensitive values
      Logger.log(`${key}: ${value.substring(0, 20)}... (${value.length} chars)`);
    } else {
      Logger.log(`${key}: ${value}`);
    }
  });
  
  Logger.log('='.repeat(60));
  
  // Specifically check PAYOS_CHECKSUM_KEY
  const checksumKey = props.getProperty('PAYOS_CHECKSUM_KEY');
  
  if (!checksumKey) {
    Logger.log('❌ PAYOS_CHECKSUM_KEY is NOT SET!');
    Logger.log('   Run setupScriptProperties() to set it');
  } else {
    Logger.log('✅ PAYOS_CHECKSUM_KEY is set');
    Logger.log(`   Length: ${checksumKey.length} chars`);
    Logger.log(`   Full value: ${checksumKey}`);
    Logger.log('');
    Logger.log('📝 EXPECTED from .env.local:');
    Logger.log('   [REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]');
    Logger.log('');
    Logger.log(`   Match? ${checksumKey === '[REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]' ? '✅ YES' : '❌ NO'}`);
  }
}

/**
 * Test HMAC calculation with known values
 * Reference: PayOS documentation
 */
function testHMACCalculationDirect() {
  // Test data from user's webhook
  const testData = 'amount=2000&code=00&desc=success&orderCode=1768879458';
  const expectedSignature = '23fbd5e1b3cc99978a10d11a8049f6c43df9d25dc91880aeda1113cafe976d44';
  
  // Test with EXPECTED checksum key from .env.local
  const correctKey = '[REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]';
  
  Logger.log('🧪 TESTING HMAC WITH CORRECT KEY');
  Logger.log('='.repeat(60));
  Logger.log(`Data: ${testData}`);
  Logger.log(`Key:  ${correctKey}`);
  Logger.log('');
  
  const calculated = calculateHMAC(testData, correctKey);
  
  Logger.log(`Calculated: ${calculated}`);
  Logger.log(`Expected:   ${expectedSignature}`);
  Logger.log(`Match: ${calculated === expectedSignature ? '✅ YES' : '❌ NO'}`);
  
  if (calculated !== expectedSignature) {
    Logger.log('');
    Logger.log('⚠️  Still no match! Try these debug steps:');
    Logger.log('   1. Check if PayOS changed their signature algorithm');
    Logger.log('   2. Verify signature format in PayOS dashboard');
    Logger.log('   3. Contact PayOS support for signature documentation');
  }
}

/**
 * Calculate HMAC (same as test script)
 */
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

/**
 * Setup Script Properties with correct values
 * Run this if PAYOS_CHECKSUM_KEY is wrong or missing
 */
function setupPayOSChecksumKey() {
  const props = PropertiesService.getScriptProperties();
  
  // ✅ CORRECT value from .env.local
  const correctChecksumKey = '[REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]';
  
  props.setProperty('PAYOS_CHECKSUM_KEY', correctChecksumKey);
  
  Logger.log('✅ PAYOS_CHECKSUM_KEY updated!');
  Logger.log(`   Set to: ${correctChecksumKey}`);
  Logger.log('');
  Logger.log('⚠️  IMPORTANT: Redeploy webhook after this!');
  Logger.log('   Deploy → Manage deployments → Edit → New version → Deploy');
}
