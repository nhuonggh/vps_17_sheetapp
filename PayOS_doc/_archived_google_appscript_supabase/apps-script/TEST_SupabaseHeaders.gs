/**
 * ========================================
 * FIX SUPABASE "BROWSER DETECTION" ERROR
 * ========================================
 * 
 * ERROR: "Forbidden use of secret API key in browser"
 * 
 * ROOT CAUSE: Supabase detects Apps Script as browser environment
 * 
 * SOLUTIONS TO TRY:
 * 1. Use x-client-info header
 * 2. Remove Prefer header
 * 3. Use ANON_KEY for some operations
 * 4. Different header combination
 */

/**
 * TEST: Try different header combinations
 */
function testSupabaseHeaders() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  const anonKey = getSupabaseAnonKey();
  
  Logger.log('🧪 TESTING DIFFERENT HEADER COMBINATIONS');
  Logger.log('═══════════════════════════════════════\n');
  
  // METHOD 1: Service Key with standard headers
  Logger.log('📝 METHOD 1: Service Key (Standard)');
  const method1 = testHeaderMethod(url, serviceKey, {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  });
  
  // METHOD 2: Service Key with User-Agent
  Logger.log('\n📝 METHOD 2: Service Key + User-Agent');
  const method2 = testHeaderMethod(url, serviceKey, {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    'User-Agent': 'Apps-Script/1.0'
  });
  
  // METHOD 3: Service Key + x-client-info
  Logger.log('\n📝 METHOD 3: Service Key + x-client-info');
  const method3 = testHeaderMethod(url, serviceKey, {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    'x-client-info': 'apps-script-webhook'
  });
  
  // METHOD 4: Service Key without Prefer
  Logger.log('\n📝 METHOD 4: Service Key (No Prefer header)');
  const method4 = testHeaderMethod(url, serviceKey, {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  });
  
  // METHOD 5: ANON KEY (should work but limited permissions)
  Logger.log('\n📝 METHOD 5: ANON Key');
  const method5 = testHeaderMethod(url, anonKey, {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  });
  
  // SUMMARY
  Logger.log('\n═══════════════════════════════════════');
  Logger.log('📊 SUMMARY:');
  Logger.log(`   ${method1 ? '✅' : '❌'} Method 1: Service Key (Standard)`);
  Logger.log(`   ${method2 ? '✅' : '❌'} Method 2: Service Key + User-Agent`);
  Logger.log(`   ${method3 ? '✅' : '❌'} Method 3: Service Key + x-client-info`);
  Logger.log(`   ${method4 ? '✅' : '❌'} Method 4: Service Key (No Prefer)`);
  Logger.log(`   ${method5 ? '✅' : '❌'} Method 5: ANON Key`);
  Logger.log('═══════════════════════════════════════');
  
  // Find winner
  const methods = [method1, method2, method3, method4, method5];
  const winner = methods.findIndex(m => m);
  
  if (winner >= 0) {
    Logger.log(`\n🎉 WINNER: Method ${winner + 1}!`);
    return winner + 1;
  } else {
    Logger.log('\n❌ NO METHOD WORKED! Need different approach.');
    return null;
  }
}

/**
 * Helper: Test một header configuration
 */
function testHeaderMethod(url, key, headers) {
  const queryUrl = `${url}/rest/v1/orders?select=order_id&limit=1`;
  
  const requestOptions = {
    method: 'GET',
    headers: headers,
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(queryUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const data = response.getContentText();
    
    if (statusCode >= 200 && statusCode < 300) {
      Logger.log(`   ✅ SUCCESS (${statusCode})`);
      Logger.log(`   Data: ${data.substring(0, 100)}...`);
      return true;
    } else {
      Logger.log(`   ❌ FAILED (${statusCode})`);
      Logger.log(`   Error: ${data.substring(0, 150)}...`);
      return false;
    }
  } catch (error) {
    Logger.log(`   ❌ EXCEPTION: ${error.message}`);
    return false;
  }
}

/**
 * QUICK FIX: If ANON Key works, use it for SELECT operations
 */
function supabaseSelect_WithAnonKey(table, options = {}) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey(); // ← USE ANON KEY
  
  // Build query string
  let queryUrl = `${url}/rest/v1/${table}`;
  const params = [];
  
  if (options.select) {
    params.push(`select=${options.select}`);
  }
  
  if (options.eq) {
    Object.keys(options.eq).forEach(col => {
      params.push(`${col}=eq.${encodeURIComponent(options.eq[col])}`);
    });
  }
  
  if (options.like) {
    Object.keys(options.like).forEach(col => {
      params.push(`${col}=like.${encodeURIComponent(options.like[col])}`);
    });
  }
  
  if (options.limit) {
    params.push(`limit=${options.limit}`);
  }
  
  if (params.length > 0) {
    queryUrl += '?' + params.join('&');
  }
  
  const requestOptions = {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(queryUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const data = JSON.parse(response.getContentText());
    
    if (statusCode >= 200 && statusCode < 300) {
      Logger.log(`✅ SELECT (ANON) from ${table}: ${data.length} rows`);
      return data;
    } else {
      Logger.log(`❌ SELECT (ANON) failed: ${statusCode}`);
      Logger.log(data);
      throw new Error(`Supabase SELECT error: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    Logger.log(`❌ Supabase SELECT exception: ${error.message}`);
    throw error;
  }
}
