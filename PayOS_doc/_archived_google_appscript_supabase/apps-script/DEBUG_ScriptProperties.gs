/**
 * DEBUG: Check Script Properties
 */
function debugScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  
  Logger.log('🔍 DEBUGGING SCRIPT PROPERTIES');
  Logger.log('═══════════════════════════════════════\n');
  
  // Get all keys
  const anonKey = props.getProperty('SUPABASE_ANON_KEY');
  const serviceKey = props.getProperty('SUPABASE_SERVICE_KEY');
  
  Logger.log('📋 Keys Info:');
  Logger.log(`\nANON_KEY:`);
  Logger.log(`   Length: ${anonKey ? anonKey.length : 0} chars`);
  Logger.log(`   First 30: ${anonKey ? anonKey.substring(0, 30) : 'NOT SET'}...`);
  Logger.log(`   Last 20: ...${anonKey ? anonKey.substring(anonKey.length - 20) : 'NOT SET'}`);
  
  Logger.log(`\nSERVICE_KEY:`);
  Logger.log(`   Length: ${serviceKey ? serviceKey.length : 0} chars`);
  Logger.log(`   First 30: ${serviceKey ? serviceKey.substring(0, 30) : 'NOT SET'}...`);
  Logger.log(`   Last 20: ...${serviceKey ? serviceKey.substring(serviceKey.length - 20) : 'NOT SET'}`);
  
  // Check if they're the same (BUG!)
  if (anonKey === serviceKey) {
    Logger.log('\n❌ CRITICAL BUG: ANON_KEY === SERVICE_KEY!');
    Logger.log('   They should be DIFFERENT keys!');
    Logger.log('   You copied the wrong key!');
    return false;
  }
  
  // Check if ANON_KEY looks like service key (starts with eyJ and has "service_role")
  if (anonKey && anonKey.includes('service_role')) {
    Logger.log('\n❌ ERROR: ANON_KEY contains "service_role"!');
    Logger.log('   This is a SERVICE_ROLE key, not ANON key!');
    Logger.log('   You need to use the ANON key from Supabase!');
    return false;
  }
  
  // Check if SERVICE_KEY looks like anon key
  if (serviceKey && serviceKey.includes('anon')) {
    Logger.log('\n❌ ERROR: SERVICE_KEY contains "anon"!');
    Logger.log('   Keys are swapped!');
    return false;
  }
  
  Logger.log('\n✅ Keys look correct (different values)');
  return true;
}

/**
 * Get correct keys from .env.local for setup
 */
function showCorrectSetup() {
  Logger.log('📝 CORRECT SETUP INSTRUCTIONS');
  Logger.log('═══════════════════════════════════════\n');
  
  Logger.log('1. Open your .env.local file');
  Logger.log('2. Find these TWO DIFFERENT keys:\n');
  
  Logger.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (PUBLIC key)');
  Logger.log('   SUPABASE_SERVICE_KEY=eyJhbGc... (SECRET key)\n');
  
  Logger.log('3. Copy to setupScriptProperties():\n');
  
  Logger.log('   const credentials = {');
  Logger.log('     SUPABASE_ANON_KEY: "eyJhbGc... YOUR ANON KEY",  ← PUBLIC');
  Logger.log('     SUPABASE_SERVICE_KEY: "eyJhbGc... YOUR SERVICE KEY"  ← SECRET');
  Logger.log('   };\n');
  
  Logger.log('4. VERIFY they are DIFFERENT!');
  Logger.log('5. Run setupScriptProperties()');
  Logger.log('6. Run debugScriptProperties() to confirm\n');
  
  Logger.log('⚠️  COMMON MISTAKE:');
  Logger.log('   Copying SAME key to both properties!');
  Logger.log('   ANON_KEY ≠ SERVICE_KEY (must be different!)');
}
