/**
 * ========================================
 * PAYOS WEBHOOK HANDLER
 * ========================================
 * Xử lý webhook từ PayOS với full validation & security
 * 
 * Security features:
 * - ✅ Signature verification
 * - ✅ Idempotency check
 * - ✅ Amount validation
 * - ✅ Order status check
 * - ✅ Transaction logging
 * - ✅ Error handling
 * 
 * Flow:
 * 1. Verify webhook signature
 * 2. Check idempotency (prevent duplicate)
 * 3. Find order in database
 * 4. Validate order status, amount, description
 * 5. Update order to 'paid'
 * 6. Log transaction
 * 7. Trigger auto-enrollment
 * 8. Return 200 OK
 */

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

/**
 * POST endpoint - PayOS gửi webhook đến đây
 */
function doPost(e) {
  const startTime = new Date();
  
  try {
    Logger.log('📨 PayOS webhook received');
    
    // Parse webhook data
    const webhookData = JSON.parse(e.postData.contents);
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
    // (We logged the error for manual review)
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
 * 
 * @param {object} webhookData - Parsed webhook payload
 * @returns {object} Processing result
 */
function processPayOSWebhook(webhookData) {
  // Validate webhook structure
  if (!webhookData || !webhookData.data) {
    throw new Error('Invalid webhook structure');
  }
  
  const data = webhookData.data;
  const signature = webhookData.signature;
  
  Logger.log(`🔍 Processing payment for order: ${data.orderCode}`);
  
  // STEP 1: Verify signature
  const isValidSignature = verifyPayOSSignature(webhookData, signature);
  if (!isValidSignature) {
    throw new Error('Invalid webhook signature - possible fraud attempt!');
  }
  Logger.log('✅ Signature verified');
  
  // STEP 2: Check idempotency (prevent duplicate processing)
  const transactionId = data.reference; // FT26016246051263
  if (isTransactionProcessed(transactionId)) {
    Logger.log(`⚠️ Transaction ${transactionId} already processed - skipping`);
    return { 
      success: true, 
      message: 'Already processed',
      duplicate: true 
    };
  }
  Logger.log('✅ Idempotency check passed');
  
  // STEP 3: Extract order ID from description
  const description = data.description; // "DH1768561"
  const orderId = extractOrderId(description);
  
  if (!orderId) {
    throw new Error(`Cannot extract order ID from description: ${description}`);
  }
  Logger.log(`📦 Order ID: ${orderId}`);
  
  // STEP 4: Find order in database
  const order = findOrderById(orderId);
  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }
  Logger.log(`✅ Order found: ${order.customer_email}`);
  
  // STEP 5: Validate order status
  if (order.status !== 'pending') {
    Logger.log(`⚠️ Order status is '${order.status}' (not pending) - may be duplicate webhook`);
    
    // If already paid, just return success (idempotent)
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
    Logger.log(`⚠️ Received ${receivedAmount}, expected ${expectedAmount} (overpayment)`);
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
    // Don't throw - payment is already processed
    // Log for manual review
    logFailedEnrollment(order.id, order.customer_email, enrollError.message);
  }
  
  // STEP 10: Send notification (optional)
  notifyPaymentSuccess(order, data);
  
  return {
    success: true,
    message: 'Payment processed successfully',
    orderId: orderId,
    amount: receivedAmount
  };
}

// ============================================
// SIGNATURE VERIFICATION
// ============================================

/**
 * Verify PayOS webhook signature
 * 
 * @param {object} webhookData - Webhook payload
 * @param {string} signature - Signature from webhook
 * @returns {boolean} true if valid
 */
function verifyPayOSSignature(webhookData, signature) {
  try {
    const checksumKey = getPayOSChecksumKey();
    
    // Build signature data string (theo PayOS docs)
    const data = webhookData.data;
    const signatureData = 
      `amount=${data.amount}&` +
      `code=${data.code || webhookData.code}&` +
      `desc=${data.desc || webhookData.desc}&` +
      `orderCode=${data.orderCode}`;
    
    // Calculate HMAC SHA256
    const calculatedSignature = Utilities.computeHmacSha256Signature(
      Utilities.newBlob(signatureData).getBytes(),
      checksumKey
    );
    
    // Convert to hex string
    const hexSignature = calculatedSignature.map(byte => {
      const hex = (byte & 0xFF).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    const isValid = hexSignature === signature;
    
    if (!isValid) {
      Logger.log(`❌ Signature mismatch:`);
      Logger.log(`Expected: ${hexSignature}`);
      Logger.log(`Received: ${signature}`);
      Logger.log(`Data: ${signatureData}`);
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
 * @param {string} description - "DH1768561" or "DH1768561800"
 * @returns {string} Full order ID
 */
function extractOrderId(description) {
  // Description có thể là:
  // - "DH1768561" (short)
  // - "DH1768561800" (full with random suffix)
  // - "DH1768561800A8T28IME" (full with suffix)
  
  if (!description) return null;
  
  // Try exact match first
  let order = findOrderById(description);
  if (order) return description;
  
  // Try with LIKE search (nếu description là short version)
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
 * Log transaction to database
 */
function logTransaction(order, paymentData, transactionId) {
  try {
    supabaseInsert('transactions', {
      order_id: order.id, // Internal order ID
      transaction_id: transactionId,
      amount: paymentData.amount,
      status: 'success',
      payment_method: 'bank_transfer',
      gateway: 'payos',
      gateway_data: JSON.stringify(paymentData),
      created_at: paymentData.transactionDateTime || new Date().toISOString()
    });
  } catch (error) {
    Logger.log(`⚠️ Failed to log transaction: ${error.message}`);
    // Don't throw - transaction logging is not critical
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

// ============================================
// TESTING FUNCTIONS
// ============================================

/**
 * Test webhook với sample data
 */
function testWebhookProcessing() {
  const sampleWebhook = {
    "code": "00",
    "desc": "success",
    "success": true,
    "data": {
      "accountNumber": "0987726236",
      "amount": 2000,
      "description": "DH1768561",
      "reference": "FT26016246051263",
      "transactionDateTime": "2026-01-16 18:11:08",
      "virtualAccountNumber": "",
      "counterAccountBankId": "01202001",
      "counterAccountBankName": "",
      "counterAccountName": "VO TAN NHUONG",
      "counterAccountNumber": "3180034086",
      "virtualAccountName": "",
      "currency": "VND",
      "orderCode": 1768561800,
      "paymentLinkId": "ab75abf6e373459692aafb53c47b07cf",
      "code": "00",
      "desc": "success"
    },
    "signature": "8bce3e64398f8740579c77d277af04d1d904f1c708a7336614684c7480f537b8"
  };
  
  Logger.log('🧪 Testing webhook processing...');
  
  try {
    const result = processPayOSWebhook(sampleWebhook);
    Logger.log(`✅ Test passed: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    Logger.log(`❌ Test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test signature verification
 */
function testSignatureVerification() {
  const sampleData = {
    "code": "00",
    "desc": "success",
    "data": {
      "amount": 2000,
      "orderCode": 1768561800,
      "code": "00",
      "desc": "success"
    },
    "signature": "8bce3e64398f8740579c77d277af04d1d904f1c708a7336614684c7480f537b8"
  };
  
  Logger.log('🧪 Testing signature verification...');
  
  const isValid = verifyPayOSSignature(sampleData, sampleData.signature);
  
  if (isValid) {
    Logger.log('✅ Signature is valid');
  } else {
    Logger.log('❌ Signature is invalid');
  }
  
  return isValid;
}
