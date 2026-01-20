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
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eG5zcm9sd2FjbGR5emNmanVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjgzMDQsImV4cCI6MjA4MjA0NDMwNH0.YI9iWDpg3zYkVsPRhs-re7k_0270l2cwXdEEIdognuY',
    
    // SERVICE_ROLE KEY (Secret - role: service_role)
    SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eG5zcm9sd2FjbGR5emNmanVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2ODMwNCwiZXhwIjoyMDgyMDQ0MzA0fQ.0FlnJZLxkuk4bYIdyDI4_80h0z7I6w-HRNTdPnVmNu8',
    
    // PayOS
    PAYOS_CLIENT_ID: '1439988e-4729-42ce-a04b-5d609f063ec0',
    PAYOS_CHECKSUM_KEY: '0c730595762e694b32561037cac5cefd2843ece4319034b5bd69a1979a31c593',
    
    GCHAT_WEBHOOK_URL: ''
  };
  
  props.setProperties(credentials);
  Logger.log('✅ Properties re-set!\n');
  
  // Verify
  Logger.log('🔍 Verifying...');
  debugWhatKeyIsUsed();
}
