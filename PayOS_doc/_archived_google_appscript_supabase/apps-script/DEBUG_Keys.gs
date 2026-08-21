/**
 * DEBUG: Check what key is actually being used
 */
function debugWhatKeyIsUsed() {
  Logger.log('🔍 DEBUGGING: Which key is being used?');
  Logger.log('═══════════════════════════════════════\n');
  
  // Check Script Properties
  const props = PropertiesService.getScriptProperties();
  const anonKey = props.getProperty('SUPABASE_ANON_KEY');
  const serviceKey = props.getProperty('SUPABASE_SERVICE_KEY');
  
  Logger.log('📋 Script Properties:');
  Logger.log(`\nANON_KEY:`);
  Logger.log(`   First 50: ${anonKey ? anonKey.substring(0, 50) : 'NOT SET'}...`);
  Logger.log(`   Contains "anon": ${anonKey ? anonKey.includes('anon') : 'N/A'}`);
  Logger.log(`   Contains "service_role": ${anonKey ? anonKey.includes('service_role') : 'N/A'}`);
  
  Logger.log(`\nSERVICE_KEY:`);
  Logger.log(`   First 50: ${serviceKey ? serviceKey.substring(0, 50) : 'NOT SET'}...`);
  Logger.log(`   Contains "anon": ${serviceKey ? serviceKey.includes('anon') : 'N/A'}`);
  Logger.log(`   Contains "service_role": ${serviceKey ? serviceKey.includes('service_role') : 'N/A'}`);
  
  // Check what getSupabaseAnonKey() returns
  Logger.log('\n🔑 Testing getSupabaseAnonKey():');
  const keyFromFunction = getSupabaseAnonKey();
  Logger.log(`   First 50: ${keyFromFunction.substring(0, 50)}...`);
  Logger.log(`   Contains "anon": ${keyFromFunction.includes('anon')}`);
  Logger.log(`   Contains "service_role": ${keyFromFunction.includes('service_role')}`);
  
  // Decode JWT to check role
  try {
    const parts = keyFromFunction.split('.');
    if (parts.length === 3) {
      const payload = Utilities.newBlob(Utilities.base64Decode(parts[1])).getDataAsString();
      const decoded = JSON.parse(payload);
      Logger.log(`\n🔓 Decoded JWT:`);
      Logger.log(`   Role: ${decoded.role}`);
      Logger.log(`   Issuer: ${decoded.iss}`);
      
      if (decoded.role === 'service_role') {
        Logger.log('\n❌ PROBLEM: ANON_KEY is actually SERVICE_ROLE key!');
        Logger.log('   You set the wrong key!');
        return false;
      } else if (decoded.role === 'anon') {
        Logger.log('\n✅ Correct: ANON_KEY has role "anon"');
        return true;
      }
    }
  } catch (error) {
    Logger.log(`\n❌ Error decoding JWT: ${error.message}`);
  }
}

/**
 * FORCE REFRESH: Delete and re-setup Script Properties
 */
function forceRefreshScriptProperties() {
  Logger.log('🔄 FORCE REFRESH: Deleting and re-setting properties...\n');
  
  // Delete all
  const props = PropertiesService.getScriptProperties();
  props.deleteAllProperties();
  Logger.log('✅ All properties deleted\n');
  
  // Re-setup with CORRECT keys
  const credentials = {
    SUPABASE_URL: 'https://ayxnsrolwacldyzcfjuq.supabase.co',
    
    // ANON KEY (Public - MUST have role: anon)
    SUPABASE_ANON_KEY: '[REDACTED_ROTATE_SUPABASE_ANON_KEY]',
    
    // SERVICE_ROLE KEY (Secret - role: service_role)
    SUPABASE_SERVICE_KEY: '[REDACTED_ROTATE_SUPABASE_SERVICE_KEY]',
    
    // PayOS
    PAYOS_CLIENT_ID: '[REDACTED_ROTATE_PAYOS_CLIENT_ID]',
    PAYOS_CHECKSUM_KEY: '[REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]',
    
    GCHAT_WEBHOOK_URL: ''
  };
  
  props.setProperties(credentials);
  Logger.log('✅ Properties re-set!\n');
  
  // Verify
  Logger.log('🔍 Verifying...');
  debugWhatKeyIsUsed();
}
