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
 * Send payment success notification
 */
function notifyPaymentSuccess(order, paymentData) {
  const title = '💰 Thanh toán thành công';
  const subtitle = `Order ${order.order_id}`;
  const message = 
    `👤 ${order.customer_name}\n` +
    `📧 ${order.customer_email}\n` +
    `💵 ${paymentData.amount.toLocaleString()} VND\n` +
    `🏦 ${paymentData.counterAccountBankName || 'Bank Transfer'}\n` +
    `⏰ ${paymentData.transactionDateTime}`;
  
  gchat_newbug(title, subtitle, message);
}

/**
 * Send error notification
 */
function notifyError(title, errorMessage) {
  gchat_newbug('❌ Error', title, errorMessage);
}

/**
 * Send enrollment success notification
 */
function notifyEnrollmentSuccess(order, enrolledCount) {
  const title = '🎓 Enrollment Success';
  const subtitle = `Order ${order.order_id}`;
  const message = 
    `✅ ${enrolledCount} course(s) activated\n` +
    `👤 ${order.customer_email}\n` +
    `📦 Order: ${order.order_id}`;
  
  gchat_newbug(title, subtitle, message);
}

/**
 * Test Google Chat notification
 */
function testGoogleChatNotification() {
  gchat_newbug(
    'Test Notification',
    'PayOS Webhook System',
    '✅ Google Chat integration is working!'
  );
}
