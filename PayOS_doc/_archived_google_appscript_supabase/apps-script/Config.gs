/**
 * ========================================
 * CONFIG MODULE
 * ========================================
 * Quản lý tất cả configuration cho project
 * Sử dụng Script Properties để bảo mật credentials
 * 
 * SETUP:
 * 1. Chạy setupScriptProperties() một lần để lưu credentials
 * 2. Script Properties sẽ được encrypt bởi Google
 * 3. Không hardcode credentials trong code!
 */

// ============================================
// SUPABASE CONFIGURATION
// ============================================

/**
 * Lấy Supabase URL từ Script Properties
 */
function getSupabaseUrl() {
  const props = PropertiesService.getScriptProperties();
  let url = props.getProperty('SUPABASE_URL');
  
  if (!url) {
    // Fallback - CHỈ dùng khi dev local
    url = 'https://rvizpcbmnhufyxbpahfa.supabase.co';
    Logger.log('⚠️ WARNING: Using hardcoded Supabase URL. Run setupScriptProperties()!');
  }
  
  return url;
}

/**
 * Lấy Supabase Service Role Key từ Script Properties
 */
function getSupabaseServiceKey() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('SUPABASE_SERVICE_KEY');
  
  if (!key) {
    throw new Error('❌ SUPABASE_SERVICE_KEY not found! Run setupScriptProperties()');
  }
  
  return key;
}

/**
 * Lấy Supabase Anon Key (public key)
 */
function getSupabaseAnonKey() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('SUPABASE_ANON_KEY');
  
  if (!key) {
    throw new Error('❌ SUPABASE_ANON_KEY not found! Run setupScriptProperties()');
  }
  
  return key;
}

// ============================================
// PAYOS CONFIGURATION
// ============================================

/**
 * Lấy PayOS Checksum Key để verify signature
 */
function getPayOSChecksumKey() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('PAYOS_CHECKSUM_KEY');
  
  if (!key) {
    throw new Error('❌ PAYOS_CHECKSUM_KEY not found! Run setupScriptProperties()');
  }
  
  return key;
}

/**
 * Lấy PayOS Client ID
 */
function getPayOSClientId() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('PAYOS_CLIENT_ID') || '';
}

// ============================================
// PROJECT SETTINGS
// ============================================

/**
 * Project settings
 */
const CONFIG = {
  PROJECT_NAME: 'SheetApp',
  ENVIRONMENT: 'production', // 'development' or 'production'
  
  // Webhook settings
  WEBHOOK: {
    MAX_RETRY_COUNT: 3,
    TIMEOUT_MS: 30000
  },
  
  // Order settings
  ORDER: {
    PENDING_TIMEOUT_MINUTES: 15, // Auto-cancel after 15 min
    ALLOWED_STATUSES: ['pending', 'paid', 'cancelled', 'expired']
  },
  
  // Logging
  LOG_LEVEL: 'INFO', // 'DEBUG', 'INFO', 'ERROR'
  
  // Google Chat webhook (optional)
  GCHAT_WEBHOOK_URL: PropertiesService.getScriptProperties().getProperty('GCHAT_WEBHOOK_URL') || ''
};

// ============================================
// SETUP FUNCTIONS (Run once)
// ============================================

/**
 * SETUP SCRIPT - Chạy một lần để lưu credentials
 * 
 * Instructions:
 * 1. Mở Apps Script Editor
 * 2. Chọn function này từ dropdown
 * 3. Click Run
 * 4. Authorize khi được yêu cầu
 * 5. Properties sẽ được lưu encrypted
 */
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  
  // ⚠️ THAY ĐỔI GIÁ TRỊ THẬT TẠI ĐÂY
  const credentials = {
    // Supabase (từ .env.local)
    SUPABASE_URL: 'https://ayxnsrolwacldyzcfjuq.supabase.co',
    
    // ANON KEY (Public - role: anon)
    SUPABASE_ANON_KEY: '[REDACTED_ROTATE_SUPABASE_ANON_KEY]',
    
    // SERVICE_ROLE KEY (Secret - role: service_role)
    SUPABASE_SERVICE_KEY: '[REDACTED_ROTATE_SUPABASE_SERVICE_KEY]',
    
    // PayOS (từ .env.local)
    PAYOS_CLIENT_ID: '[REDACTED_ROTATE_PAYOS_CLIENT_ID]',
    PAYOS_CHECKSUM_KEY: '[REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]',
    
    // Google Chat (optional - để nhận alerts)
    GCHAT_WEBHOOK_URL: ''
  };
  
  // Lưu vào Script Properties (encrypted)
  props.setProperties(credentials);
  
  Logger.log('✅ Script Properties đã được setup!');
  Logger.log('🔐 Credentials được lưu encrypted.');
  Logger.log('🗑️ Bây giờ bạn có thể XÓA credentials trong code này!');
  
  return 'Setup complete!';
}

/**
 * View current Script Properties (for debugging)
 */
function viewScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  
  // Mask sensitive values
  Object.keys(all).forEach(key => {
    if (key.includes('KEY') || key.includes('SECRET')) {
      all[key] = all[key].substring(0, 10) + '...';
    }
  });
  
  Logger.log('📋 Current Script Properties:');
  Logger.log(JSON.stringify(all, null, 2));
  
  return all;
}

/**
 * Delete all Script Properties (reset)
 */
function resetScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.deleteAllProperties();
  Logger.log('🗑️ All properties deleted!');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if running in development mode
 */
function isDevelopment() {
  return CONFIG.ENVIRONMENT === 'development';
}

/**
 * Get config value safely
 */
function getConfig(path) {
  const keys = path.split('.');
  let value = CONFIG;
  
  for (const key of keys) {
    if (value[key] === undefined) {
      return null;
    }
    value = value[key];
  }
  
  return value;
}
