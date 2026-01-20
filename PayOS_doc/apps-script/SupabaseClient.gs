/**
 * ========================================
 * SUPABASE CLIENT MODULE
 * ========================================
 * Helper functions để đọc/ghi Supabase từ Apps Script
 * 
 * Features:
 * - SELECT queries với filters
 * - INSERT records
 * - UPDATE records  
 * - Error handling
 * - Logging
 */

// ============================================
// CORE SUPABASE FUNCTIONS
// ============================================

/**
 * Execute SELECT query
 * 
 * @param {string} table - Tên bảng
 * @param {object} options - Query options
 * @returns {Array} Rows returned
 * 
 * Example:
 * const orders = supabaseSelect('orders', {
 *   select: 'id,order_id,status,customer_email',
 *   eq: { order_id: 'DH1768561' },
 *   limit: 1
 * });
 */
function supabaseSelect(table, options = {}) {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey(); // ← Use ANON KEY to bypass browser detection
  
  // Build query string
  let queryUrl = `${url}/rest/v1/${table}`;
  const params = [];
  
  // SELECT columns
  if (options.select) {
    params.push(`select=${options.select}`);
  }
  
  // WHERE clauses
  if (options.eq) {
    Object.keys(options.eq).forEach(col => {
      params.push(`${col}=eq.${encodeURIComponent(options.eq[col])}`);
    });
  }
  
  if (options.neq) {
    Object.keys(options.neq).forEach(col => {
      params.push(`${col}=neq.${encodeURIComponent(options.neq[col])}`);
    });
  }
  
  if (options.gt) {
    Object.keys(options.gt).forEach(col => {
      params.push(`${col}=gt.${encodeURIComponent(options.gt[col])}`);
    });
  }
  
  if (options.lt) {
    Object.keys(options.lt).forEach(col => {
      params.push(`${col}=lt.${encodeURIComponent(options.lt[col])}`);
    });
  }
  
  if (options.like) {
    Object.keys(options.like).forEach(col => {
      params.push(`${col}=like.${encodeURIComponent(options.like[col])}`);
    });
  }
  
  // LIMIT
  if (options.limit) {
    params.push(`limit=${options.limit}`);
  }
  
  // ORDER BY
  if (options.order) {
    params.push(`order=${options.order}`);
  }
  
  // Add params to URL
  if (params.length > 0) {
    queryUrl += '?' + params.join('&');
  }
  
  // Make request
  const requestOptions = {
    method: 'GET',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'User-Agent': 'Apps-Script-Webhook/1.0'
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(queryUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const data = JSON.parse(response.getContentText());
    
    if (statusCode >= 200 && statusCode < 300) {
      Logger.log(`✅ SELECT from ${table}: ${data.length} rows`);
      return data;
    } else {
      Logger.log(`❌ SELECT failed: ${statusCode}`);
      Logger.log(data);
      throw new Error(`Supabase SELECT error: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    Logger.log(`❌ Supabase SELECT exception: ${error.message}`);
    throw error;
  }
}

/**
 * Execute INSERT query
 * 
 * @param {string} table - Tên bảng
 * @param {object|Array} data - Data to insert (single object or array)
 * @param {object} options - Insert options
 * @returns {Array} Inserted rows
 * 
 * Example:
 * const result = supabaseInsert('transactions', {
 *   order_id: 'DH1768561',
 *   transaction_id: 'FT26016246051263',
 *   amount: 2000,
 *   status: 'success'
 * });
 */
function supabaseInsert(table, data, options = {}) {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey(); // ← SERVICE KEY for writes (may work)
  
  let queryUrl = `${url}/rest/v1/${table}`;
  
  const requestOptions = {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(Array.isArray(data) ? data : [data]),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(queryUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());
    
    if (statusCode >= 200 && statusCode < 300) {
      Logger.log(`✅ INSERT into ${table}: ${result.length} rows`);
      return result;
    } else {
      Logger.log(`❌ INSERT failed: ${statusCode}`);
      Logger.log(result);
      
      // Check for duplicate key error (graceful handling)
      if (statusCode === 409 || (result.message && result.message.includes('duplicate'))) {
        Logger.log('⚠️ Duplicate key - record already exists');
        return null; // Return null for duplicates
      }
      
      throw new Error(`Supabase INSERT error: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    Logger.log(`❌ Supabase INSERT exception: ${error.message}`);
    throw error;
  }
}

/**
 * Execute UPDATE query
 * 
 * @param {string} table - Tên bảng
 * @param {object} data - Data to update
 * @param {object} where - WHERE conditions
 * @returns {Array} Updated rows
 * 
 * Example:
 * const result = supabaseUpdate('orders', 
 *   { status: 'paid', paid_at: new Date().toISOString() },
 *   { order_id: 'DH1768561' }
 * );
 */
function supabaseUpdate(table, data, where) {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey(); // ← SERVICE KEY for writes (may work)
  
  // Build query string
  let queryUrl = `${url}/rest/v1/${table}`;
  const params = [];
  
  // WHERE clauses (required!)
  if (!where || Object.keys(where).length === 0) {
    throw new Error('UPDATE requires WHERE clause!');
  }
  
  Object.keys(where).forEach(col => {
    params.push(`${col}=eq.${encodeURIComponent(where[col])}`);
  });
  
  queryUrl += '?' + params.join('&');
  
  const requestOptions = {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(queryUrl, requestOptions);
    const statusCode = response.getResponseCode();
    const result = JSON.parse(response.getContentText());
    
    if (statusCode >= 200 && statusCode < 300) {
      Logger.log(`✅ UPDATE ${table}: ${result.length} rows`);
      return result;
    } else {
      Logger.log(`❌ UPDATE failed: ${statusCode}`);
      Logger.log(result);
      throw new Error(`Supabase UPDATE error: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    Logger.log(`❌ Supabase UPDATE exception: ${error.message}`);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS (Specific to SheetApp)
// ============================================

/**
 * Tìm order theo order_id
 * @param {string} orderId - Order ID (e.g., 'DH1768561')
 * @returns {object|null} Order object hoặc null
 */
function findOrderById(orderId) {
  try {
    const results = supabaseSelect('orders', {
      select: '*',
      eq: { order_id: orderId },
      limit: 1
    });
    
    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    Logger.log(`❌ Error finding order ${orderId}: ${error.message}`);
    return null;
  }
}

/**
 * Tìm order items của một order
 * @param {number} orderId - Order's internal ID
 * @returns {Array} Order items
 */
function findOrderItems(orderId) {
  try {
    return supabaseSelect('order_items', {
      select: 'id,product_id,product_name,quantity,price',
      eq: { order_id: orderId }
    });
  } catch (error) {
    Logger.log(`❌ Error finding order items: ${error.message}`);
    return [];
  }
}

/**
 * Tìm user profile theo email
 * @param {string} email - User email
 * @returns {object|null} Profile object hoặc null
 */
function findUserByEmail(email) {
  try {
    const results = supabaseSelect('profiles', {
      select: 'id,email,full_name,phone',
      eq: { email: email },
      limit: 1
    });
    
    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    Logger.log(`❌ Error finding user ${email}: ${error.message}`);
    return null;
  }
}

/**
 * Check if transaction already processed (idempotency)
 * @param {string} transactionId - PayOS transaction reference
 * @returns {boolean} true if already processed
 */
function isTransactionProcessed(transactionId) {
  try {
    const results = supabaseSelect('transactions', {
      select: 'id',
      eq: { transaction_id: transactionId },
      limit: 1
    });
    
    return results && results.length > 0;
  } catch (error) {
    Logger.log(`❌ Error checking transaction: ${error.message}`);
    return false;
  }
}

/**
 * Create enrollment record
 * @param {string} userId - User UUID
 * @param {string} productId - Product UUID
 * @param {number} orderId - Order ID (internal)
 * @returns {object|null} Created enrollment
 */
function createEnrollment(userId, productId, orderId) {
  try {
    const enrollment = {
      user_id: userId,
      product_id: productId,
      order_id: orderId,
      enrolled_at: new Date().toISOString(),
      progress: 0,
      completed_at: null
    };
    
    const result = supabaseInsert('enrollments', enrollment);
    
    if (result) {
      Logger.log(`✅ Enrollment created: user=${userId}, product=${productId}`);
    } else {
      Logger.log(`⚠️ Enrollment already exists (duplicate)`);
    }
    
    return result;
  } catch (error) {
    Logger.log(`❌ Error creating enrollment: ${error.message}`);
    throw error;
  }
}

/**
 * Log failed enrollment for manual review
 * @param {number} orderId - Order ID
 * @param {string} customerEmail - Customer email
 * @param {string} errorMessage - Error description
 */
function logFailedEnrollment(orderId, customerEmail, errorMessage) {
  try {
    supabaseInsert('failed_enrollments', {
      order_id: orderId,
      customer_email: customerEmail,
      error_message: errorMessage,
      retry_count: 0,
      created_at: new Date().toISOString()
    });
    
    Logger.log(`📝 Failed enrollment logged for ${customerEmail}`);
  } catch (error) {
    Logger.log(`❌ Error logging failed enrollment: ${error.message}`);
  }
}

// ============================================
// TESTING FUNCTIONS
// ============================================

/**
 * Test Supabase connection
 */
function testSupabaseConnection() {
  try {
    Logger.log('🧪 Testing Supabase connection...');
    
    // Test SELECT
    const orders = supabaseSelect('orders', {
      select: 'order_id,status',
      limit: 1
    });
    
    Logger.log(`✅ Connection OK! Sample order: ${JSON.stringify(orders)}`);
    return true;
  } catch (error) {
    Logger.log(`❌ Connection failed: ${error.message}`);
    return false;
  }
}

/**
 * Test find order by ID
 */
function testFindOrder() {
  const orderId = 'DH1768561800'; // Replace với order thực tế
  
  Logger.log(`🧪 Testing findOrderById('${orderId}')...`);
  const order = findOrderById(orderId);
  
  if (order) {
    Logger.log(`✅ Order found:`);
    Logger.log(JSON.stringify(order, null, 2));
  } else {
    Logger.log(`❌ Order not found`);
  }
  
  return order;
}
