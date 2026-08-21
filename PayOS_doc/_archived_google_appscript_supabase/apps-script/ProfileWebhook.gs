//LINK: https://script.google.com/macros/s/AKfycbzcOtiR1KFz-Su89xXqAtPyiLzaJb89StpbBvPgAkRMiZPEJaNFCQ5Pn25JDh-isDW8eg/exec
// =====================================================
// PROFILE WEBHOOK - Sync Supabase Profiles to Google Sheets
// =====================================================
// Deploy as Web App (Anyone can access)
// Webhook URL: https://script.google.com/macros/s/{SCRIPT_ID}/exec
// =====================================================

// ===== CONFIGURATION =====
const SHEET_ID = '1NiEaRvlatlVivqdlp2hMUFqxOXLNyyRvxIuf5bqQkq4'; // Replace with your Google Sheet ID
const SHEET_NAME = 'profiles';
const WEBHOOK_SECRET = '@Nhim2019'; // Optional: for security

/**
 * Main webhook handler - Called by Supabase when profile is inserted
 * @param {Object} e - Event object from Supabase webhook
 * @returns {ContentService} JSON response
 */
function doPost(e) {
  try {
    Logger.log('📥 Webhook received');
    
    // Parse webhook payload
    const payload = JSON.parse(e.postData.contents);
    gchat_newbug("Webhook Profile:","New User",JSON.stringify(payload))
    Logger.log('📋 Payload:', JSON.stringify(payload, null, 2));
    
    // Validate payload structure
    if (!payload.record) {
      throw new Error('Invalid payload: missing record');
    }
    
    // Optional: Verify webhook secret
    // const secret = e.parameter['X-Webhook-Secret'];
    // if (secret !== WEBHOOK_SECRET) {
    //   throw new Error('Unauthorized: Invalid webhook secret');
    // }
    
    // Extract profile data
    const record = payload.record;
    
    // Log to Google Sheets
    const result = logProfileToSheets(record);
    
    Logger.log(`✅ Success: Row ${result.row}`);
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Profile logged successfully',
      row: result.row,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('❌ Error:', error.toString());
    
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET handler - For testing webhook endpoint
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'active',
    endpoint: 'Profile Sync Webhook',
    version: '1.0',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Write profile data to Google Sheets
 * @param {Object} record - Profile record from Supabase
 * @returns {Object} Result with row number
 */
function logProfileToSheets(record) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found in spreadsheet ${SHEET_ID}`);
  }
  
  // Check for duplicate (by user ID)
  if (isProfileExists(sheet, record.id)) {
    Logger.log(`⚠️ Profile ${record.id} already exists, skipping`);
    return {
      row: -1,
      skipped: true,
      reason: 'Duplicate user_id'
    };
  }
  
  // Format timestamp
  const createdAt = formatTimestamp(record.created_at);
  
  // Prepare data row (match header order)
  const row = [
    record.id || '',
    record.email || '',
    record.full_name || '',
    record.phone || '',
    record.role || 'customer',
    createdAt,
    record.created_via || 'manual',
    record.avatar_url || ''
  ];
  
  // Append to sheet
  sheet.appendRow(row);
  
  const lastRow = sheet.getLastRow();
  
  Logger.log(`✅ Profile logged to row ${lastRow}`);
  
  return {
    row: lastRow,
    data: row
  };
}

/**
 * Check if profile already exists in sheet
 * @param {Sheet} sheet - Google Sheet object
 * @param {string} userId - User ID to check
 * @returns {boolean} True if exists
 */
function isProfileExists(sheet, userId) {
  if (!userId) return false;
  
  try {
    const data = sheet.getDataRange().getValues();
    
    // Skip header row (index 0)
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    Logger.log('⚠️ Error checking duplicates:', error);
    return false; // On error, allow insert
  }
}

/**
 * Format ISO timestamp to Vietnamese timezone
 * @param {string} isoString - ISO 8601 timestamp
 * @returns {string} Formatted date string
 */
function formatTimestamp(isoString) {
  if (!isoString) return '';
  
  try {
    const date = new Date(isoString);
    return Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    Logger.log('⚠️ Error formatting timestamp:', error);
    return isoString; // Return original if format fails
  }
}

// ===== TEST FUNCTIONS =====

/**
 * Test function - Simulate Supabase webhook call
 * Run this to test your webhook setup
 */
function testProfileWebhook() {
  const mockPayload = {
    type: 'INSERT',
    table: 'profiles',
    schema: 'public',
    record: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test_webhook@example.com',
      full_name: 'Nguyễn Văn Test',
      phone: '0987654321',
      role: 'customer',
      created_at: new Date().toISOString(),
      created_via: 'google',
      avatar_url: 'https://lh3.googleusercontent.com/a/test'
    },
    old_record: null
  };
  
  const mockRequest = {
    postData: {
      contents: JSON.stringify(mockPayload)
    },
    parameter: {
      'X-Webhook-Secret': WEBHOOK_SECRET
    }
  };
  
  Logger.log('🧪 Testing webhook with mock data...');
  
  const result = doPost(mockRequest);
  const response = JSON.parse(result.getContent());
  
  Logger.log('📊 Test Result:', JSON.stringify(response, null, 2));
  
  if (response.success) {
    Logger.log('✅ Test PASSED - Check your Google Sheet');
  } else {
    Logger.log('❌ Test FAILED:', response.error);
  }
}

/**
 * Test GET endpoint
 */
function testGetEndpoint() {
  const result = doGet({});
  Logger.log(result.getContent());
}

/**
 * Setup function - Creates headers if sheet is empty
 */
function setupSheet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found. Create it first.`);
  }
  
  // Check if headers exist
  const firstRow = sheet.getRange(1, 1, 1, 8).getValues()[0];
  
  if (firstRow[0] === 'User ID') {
    Logger.log('✅ Headers already exist');
    return;
  }
  
  // Add headers
  const headers = [
    'User ID',
    'Email',
    'Full Name',
    'Phone',
    'Role',
    'Created At',
    'Created Via',
    'Avatar URL'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4CAF50');
  headerRange.setFontColor('#FFFFFF');
  
  Logger.log('✅ Headers created successfully');
}

/**
 * Clear all data (keep headers) - USE WITH CAUTION
 */
function clearAllData() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`);
  }
  
  const lastRow = sheet.getLastRow();
  
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
    Logger.log(`✅ Deleted ${lastRow - 1} rows`);
  } else {
    Logger.log('ℹ️ No data to delete');
  }
}

/**
 * ========================================
 * GOOGLE CHAT NOTIFICATION HELPER
 * ========================================
 * Send notifications to Google Chat
 * 
 * Setup:
 * 1. Tạo Google Chat Space
 * 2. Add webhook: Space menu → Apps & integrations → Webhooks
 * 3. Copy webhook URL
 * 4. Lưu vào Script Properties: GCHAT_WEBHOOK_URL
 */

/**
 * Send notification to Google Chat
 * 
 * @param {string} title - Notification title
 * @param {string} subtitle - Subtitle/category
 * @param {string} message - Main message
 */
const scriptname = "BOT PROFILE SYNC"
function gchat_newbug(title, subtitle, message) {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('GCHAT_WEBHOOK_URL');
    
    if (!webhookUrl) {
      Logger.log('⚠️ Google Chat webhook URL not configured');
      return;
    }
    
    // Format message for Google Chat
    const payload = {
      text: `*${title}*\n_${subtitle}_\n\n${message}`
    };
    
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    
    if (response.getResponseCode() === 200) {
      Logger.log('✅ Google Chat notification sent');
    } else {
      Logger.log(`⚠️ Google Chat notification failed: ${response.getResponseCode()}`);
    }
    
  } catch (error) {
    Logger.log(`❌ Google Chat error: ${error.message}`);
    // Don't throw - notification failure shouldn't break main flow
  }
}

/**
 * Test Google Chat notification
 */
function testGoogleChatNotification() {
  gchat_newbug(
    'Test Notification',
    'Profile Sync Webhook System',
    '✅ Google Chat integration is working!'
  );
}
