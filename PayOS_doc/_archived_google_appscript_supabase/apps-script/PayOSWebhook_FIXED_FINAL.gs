/**
 * ========================================
 * PAYOS WEBHOOK HANDLER - FIXED VERSION
 * ========================================
 * ✅ All 3 errors FIXED:
 *    1. logTransaction() - order.order_id (TEXT) instead of order.id (UUID)
 *    2. Removed invalid columns: gateway, gateway_data
 *    3. findOrderItems() fix is in SupabaseClient_FIXED_FINAL.gs
 * 
 * HOW TO USE:
 * 1. Copy this entire file to Apps Script
 * 2. Also copy SupabaseClient_FIXED_FINAL.gs
 * 3. Run test_wh() to verify
 */

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

/**
 * Test function - simulates webhook for testing
 */
function test_wh() {
  const webhookData = {
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      "accountNumber": "0987726236",
      "amount": 2000,
      "description": "DH1768573",
      "reference": "FT26016979127088",
      "transactionDateTime": "2026-01-16 21:30:13",
      "virtualAccountNumber": "",
      "counterAccountBankId": "01202001",
      "counterAccountBankName": "",
      "counterAccountName": "VO TAN NHUONG",
      "counterAccountNumber": "3180034086",
      "virtualAccountName": "",
      "currency": "VND",
      "orderCode": 1768573777,
      "paymentLinkId": "b47e667d331643d78ed8359426e24502",
      "code": "00",
      "desc": "success"
    },
    "signature": "57bd74fa30e04b08b4af5a5ab027c8b93bd3680989f5a11a37816fead9080e9b"
  };
  
  var rs = processPayOSWebhook(webhookData);
  Logger.log('🎉 Test result: ' + JSON.stringify(rs));
}

/**
 * POST endpoint - PayOS gửi webhook đến đây
 */
function doPost(e) {
  const startTime = new Date();
  const webhookData = JSON.parse(e.postData.contents);
  gchat_newbug("Data trả về:", "Dopost", JSON.stringify(webhookData));
  
  try {
    Logger.log('📨 PayOS webhook received');
    Logger.log(`📦 Webhook data: ${JSON.stringify(webhookData)}`);
    
    // Process webhook
    const result = processPayOSWebhook(webhookData);
    
    const duration = new Date() - startTime;
    Logger.log(`✅ Webhook processed in ${duration}ms`);
    
    // Return 200 OK
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: result.message || 'Payment processed successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log(`❌ Webhook error: ${error.message}`);
    Logger.log(error.stack);
    
    // Send alert
    notifyError('Webhook Processing Error', error.message);
    
    // Still return 200 OK to prevent PayOS retry
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET endpoint - Health check
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    service: 'PayOS Webhook',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// CORE WEBHOOK PROCESSING
// ============================================

/**
 * Process PayOS webhook with full validation
 */
function processPayOSWebhook(webhookData) {
  if (!webhookData || !webhookData.data) {
    throw new Error('Invalid webhook structure');
  }
  
  const data = webhookData.data;
  const signature = webhookData.signature;
  
  Logger.log(`🔍 Processing payment for order: ${data.orderCode}`);
  
  // STEP 1: Verify signature ✅ VERIFIED METHOD
  const isValidSignature = verifyPayOSSignature(webhookData, signature);
  if (!isValidSignature) {
    throw new Error('Invalid webhook signature - possible fraud attempt!');
  }
  Logger.log('✅ Signature verified');
  
  // STEP 2: Check idempotency
  const transactionId = data.reference;
  if (isTransactionProcessed(transactionId)) {
    Logger.log(`⚠️ Transaction ${transactionId} already processed - skipping`);
    return { 
      success: true, 
      message: 'Already processed',
      duplicate: true 
    };
  }
  Logger.log('✅ Idempotency check passed');
  
  // STEP 3: Extract order ID
  const description = data.description;
  const orderId = extractOrderId(description);
  
  if (!orderId) {
    throw new Error(`Cannot extract order ID from description: ${description}`);
  }
  Logger.log(`📦 Order ID: ${orderId}`);
  
  // STEP 4: Find order
  const order = findOrderById(orderId);
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }
  Logger.log(`✅ Order found: ${order.customer_email}`);
  
  // STEP 5: Validate order status
  if (order.status !== 'pending') {
    Logger.log(`⚠️ Order status is '${order.status}' (not pending)`);
    
    if (order.status === 'paid') {
      return { 
        success: true, 
        message: 'Order already paid',
        duplicate: true 
      };
    }
    
    throw new Error(`Order status is '${order.status}', expected 'pending'`);
  }
  Logger.log('✅ Order status valid (pending)');
  
  // STEP 6: Validate amount
  const expectedAmount = Math.round(order.total_amount);
  const receivedAmount = data.amount;
  
  if (receivedAmount < expectedAmount) {
    throw new Error(`Amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`);
  }
  
  if (receivedAmount > expectedAmount) {
    Logger.log(`⚠️ Overpayment: received ${receivedAmount}, expected ${expectedAmount}`);
  }
  Logger.log('✅ Amount validated');
  
  // STEP 7: Update order to 'paid'
  const updatedOrder = supabaseUpdate('orders', 
    {
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_method: 'bank_transfer',
      updated_at: new Date().toISOString()
    },
    { order_id: orderId }
  );
  
  if (!updatedOrder || updatedOrder.length === 0) {
    throw new Error('Failed to update order status');
  }
  Logger.log('✅ Order updated to PAID');
  
  // STEP 8: Log transaction
  logTransaction(order, data, transactionId);
  Logger.log('✅ Transaction logged');
  
  // STEP 9: Auto-enrollment
  try {
    enrollUserInProducts(order);
    Logger.log('✅ Auto-enrollment completed');
  } catch (enrollError) {
    Logger.log(`❌ Auto-enrollment failed: ${enrollError.message}`);
    logFailedEnrollment(order.id, order.customer_email, enrollError.message);
  }
  
  // STEP 10: Send notification
  notifyPaymentSuccess(order, data);
  
  return {
    success: true,
    message: 'Payment processed successfully',
    orderId: orderId,
    amount: receivedAmount
  };
}

// ============================================
// SIGNATURE VERIFICATION - ✅ VERIFIED
// ============================================

/**
 * Verify PayOS webhook signature
 * 
 * METHOD: Sort ALL fields alphabetically (including empty strings)
 * TESTED: ✅ PASSED with webhooks DH1768572 & DH1768573
 * 
 * @param {object} webhookData - Webhook payload
 * @param {string} signature - Signature from webhook
 * @returns {boolean} true if valid
 */
function verifyPayOSSignature(webhookData, signature) {
  try {
    const checksumKey = getPayOSChecksumKey();
    const data = webhookData.data;
    
    // CORRECT METHOD: Sort ALL fields alphabetically (including empty strings)
    const sortedKeys = Object.keys(data).sort();
    const signatureString = sortedKeys.map(key => `${key}=${data[key]}`).join('&');
    
    Logger.log(`🔐 Signature string (first 100 chars): ${signatureString.substring(0, 100)}...`);
    
    // Calculate HMAC SHA256
    const dataBytes = Utilities.newBlob(signatureString).getBytes();
    const keyBytes = Utilities.newBlob(checksumKey).getBytes();
    const calculatedSig = Utilities.computeHmacSha256Signature(dataBytes, keyBytes);
    
    // Convert to hex
    const calculatedHex = calculatedSig.map(byte => {
      const hex = (byte & 0xFF).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    const isValid = calculatedHex === signature;
    
    if (!isValid) {
      Logger.log(`❌ Signature mismatch:`);
      Logger.log(`   Calculated: ${calculatedHex}`);
      Logger.log(`   Received:   ${signature}`);
    }
    
    return isValid;
    
  } catch (error) {
    Logger.log(`❌ Signature verification error: ${error.message}`);
    return false;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract order ID from description
 */
function extractOrderId(description) {
  if (!description) return null;
  
  // Try exact match first
  let order = findOrderById(description);
  if (order) return description;
  
  // Try with LIKE search
  try {
    const results = supabaseSelect('orders', {
      select: 'order_id',
      like: { order_id: `${description}%` },
      limit: 1
    });
    
    if (results && results.length > 0) {
      return results[0].order_id;
    }
  } catch (error) {
    Logger.log(`Error in order ID extraction: ${error.message}`);
  }
  
  return null;
}

/**
 * ✅ FIXED - Log transaction to database
 * 
 * FIXES:
 * 1. Changed order.id → order.order_id (TEXT type)
 * 2. Removed gateway column (doesn't exist in schema)
 * 3. Removed gateway_data column (doesn't exist in schema)
 */
function logTransaction(order, paymentData, transactionId) {
  try {
    supabaseInsert('transactions', {
      order_id: order.order_id,  // ✅ FIX 1: Changed from order.id to order.order_id (TEXT)
      transaction_id: transactionId,
      amount: paymentData.amount,
      status: 'success',
      payment_method: 'bank_transfer',
      // ✅ FIX 2 & 3: Removed gateway and gateway_data (columns don't exist)
      created_at: paymentData.transactionDateTime || new Date().toISOString()
    });
  } catch (error) {
    Logger.log(`⚠️ Failed to log transaction: ${error.message}`);
  }
}

/**
 * Send payment success notification
 */
function notifyPaymentSuccess(order, paymentData) {
  try {
    const message = 
      `✅ *Thanh toán thành công!*\n\n` +
      `📦 Đơn hàng: ${order.order_id}\n` +
      `💰 Số tiền: ${paymentData.amount.toLocaleString()} VND\n` +
      `👤 Khách hàng: ${order.customer_name}\n` +
      `📧 Email: ${order.customer_email}\n` +
      `🏦 Ngân hàng: ${paymentData.counterAccountBankName || paymentData.counterAccountBankId}\n` +
      `⏰ Thời gian: ${paymentData.transactionDateTime}`;
    
    gchat_newbug('PayOS Webhook', 'Payment Success', message);
  } catch (error) {
    Logger.log(`⚠️ Notification failed: ${error.message}`);
  }
}

/**
 * Send error notification
 */
function notifyError(title, message) {
  try {
    gchat_newbug('PayOS Webhook', title, `❌ ${message}`);
  } catch (error) {
    Logger.log(`⚠️ Error notification failed: ${error.message}`);
  }
}
