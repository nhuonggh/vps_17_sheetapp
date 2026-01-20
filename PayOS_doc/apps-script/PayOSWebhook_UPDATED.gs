/**
 * ✅ FIXED - Log transaction to database với PayOS payer information
 * 
 * CHANGES:
 * 1. order.order_id thay vì order.id (TEXT foreign key)
 * 2. Thêm payos_order_code
 * 3. Thêm thông tin người chuyển (payer bank, account, name)
 * 4. Thêm payment_datetime
 */
function logTransaction(order, paymentData, transactionId) {
  try {
    supabaseInsert('transactions', {
      order_id: order.order_id,  // ✅ TEXT foreign key
      transaction_id: transactionId,
      amount: paymentData.amount,
      status: 'success',
      payment_method: 'bank_transfer',
      
      // ✅ NEW: PayOS orderCode
      payos_order_code: paymentData.orderCode,
      
      // ✅ NEW: Payer information
      payer_bank_id: paymentData.counterAccountBankId,
      payer_bank_name: paymentData.counterAccountBankName || '',
      payer_account_number: paymentData.counterAccountNumber,
      payer_account_name: paymentData.counterAccountName,
      payment_datetime: paymentData.transactionDateTime,
      
      created_at: paymentData.transactionDateTime || new Date().toISOString()
    });
    
    Logger.log('✅ Transaction logged with payer info');
    
    // ✅ NEW: Log to Google Sheets for reconciliation
    try {
      logToGoogleSheets(order, paymentData, transactionId);
    } catch (sheetError) {
      Logger.log(`⚠️ Google Sheets logging failed: ${sheetError.message}`);
    }
    
  } catch (error) {
    Logger.log(`⚠️ Failed to log transaction: ${error.message}`);
  }
}

/**
 * ✅ NEW - Log transaction to Google Sheets for reconciliation
 * Sheet ID: 1NiEaRvlatlVivqdlp2hMUFqxOXLNyyRvxIuf5bqQkq4
 * Sheet name: transactions
 */
function logToGoogleSheets(order, paymentData, transactionId) {
  try {
    const sheetId = '1NiEaRvlatlVivqdlp2hMUFqxOXLNyyRvxIuf5bqQkq4';
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    let sheet = spreadsheet.getSheetByName('transactions');
    
    // Create sheet if doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet('transactions');
      
      // Add headers
      sheet.appendRow([
        'Timestamp',
        'Order ID',
        'PayOS Order Code',
        'Transaction ID',
        'Amount',
        'Payer Bank ID',
        'Payer Bank Name',
        'Payer Account Number',
        'Payer Name',
        'Payment DateTime',
        'Customer Email',
        'Customer Name',
        'Status'
      ]);
      
      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 13);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');
    }
    
    // Add row data
    const row = [
      new Date(),                                    // Timestamp
      order.order_id,                                // Order ID
      paymentData.orderCode,                         // PayOS Order Code
      transactionId,                                 // Transaction ID
      paymentData.amount,                            // Amount
      paymentData.counterAccountBankId,              // Payer Bank ID
      paymentData.counterAccountBankName || 'N/A',   // Payer Bank Name
      paymentData.counterAccountNumber,              // Payer Account Number
      paymentData.counterAccountName,                // Payer Name
      paymentData.transactionDateTime,               // Payment DateTime
      order.customer_email,                          // Customer Email
      order.customer_name || 'N/A',                  // Customer Name
      'success'                                      // Status
    ];
    
    sheet.appendRow(row);
    Logger.log('✅ Transaction logged to Google Sheets');
    
  } catch (error) {
    Logger.log(`❌ Google Sheets logging error: ${error.message}`);
    throw error;
  }
}
