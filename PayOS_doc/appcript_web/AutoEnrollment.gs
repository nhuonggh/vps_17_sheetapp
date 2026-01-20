/**
 * ========================================
 * AUTO-ENROLLMENT MODULE
 * ========================================
 * Tự động kích hoạt khóa học sau khi thanh toán thành công
 * 
 * Features:
 * - Tìm user theo email
 * - Lấy products từ order
 * - Tạo enrollment records
 * - Handle guest users
 * - Error logging
 * 
 * Integration: Được gọi từ PayOSWebhook.gs
 */

// ============================================
// MAIN ENROLLMENT FUNCTION
// ============================================

/**
 * Enroll user vào tất cả products trong order
 * 
 * @param {object} order - Order object from database
 * @returns {object} Enrollment result
 * 
 * Called after payment confirmed
 */
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  
  // ⚠️ THAY ĐỔI GIÁ TRỊ THẬT TẠI ĐÂY
  const credentials = {
    // Supabase (từ .env.local)
    SUPABASE_URL: 'https://ayxnsrolwacldyzcfjuq.supabase.co',
    
    // ANON KEY (Public - role: anon)
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eG5zcm9sd2FjbGR5emNmanVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjgzMDQsImV4cCI6MjA4MjA0NDMwNH0.YI9iWDpg3zYkVsPRhs-re7k_0270l2cwXdEEIdognuY',
    
    // SERVICE_ROLE KEY (Secret - role: service_role)
    SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5eG5zcm9sd2FjbGR5emNmanVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjQ2ODMwNCwiZXhwIjoyMDgyMDQ0MzA0fQ.0FlnJZLxkuk4bYIdyDI4_80h0z7I6w-HRNTdPnVmNu8',
    
    // PayOS (từ .env.local)
    PAYOS_CLIENT_ID: '1439988e-4729-42ce-a04b-5d609f063ec0',
    PAYOS_CHECKSUM_KEY: '0c730595762e694b32561037cac5cefd2843ece4319034b5bd69a1979a31c593',
    
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
function enrollUserInProducts(order) {
  Logger.log(`🎓 Starting auto-enrollment for order ${order.order_id}`);
  
  try {
    // STEP 1: Find user by email
    const user = findUserByEmail(order.customer_email);
    
    if (!user) {
      // Guest user - No account yet
      Logger.log(`⚠️ Guest purchase detected: ${order.customer_email}`);
      Logger.log(`📝 User needs to signup to access courses`);
      
      // Log for manual activation later
      logFailedEnrollment(
        order.id,
        order.customer_email,
        'Guest user - no account found. User needs to signup.'
      );
      
      // Send invitation email (optional - implement later)
      // sendSignupInvitation(order.customer_email, order.customer_name);
      
      return {
        success: false,
        reason: 'guest_user',
        message: 'User needs to create account to activate courses'
      };
    }
    
    Logger.log(`✅ User found: ${user.id} (${user.email})`);
    
    // STEP 2: Get order items (products)
    const orderItems = findOrderItems(order.id);
    
    if (!orderItems || orderItems.length === 0) {
      throw new Error('No products found in order');
    }
    
    Logger.log(`📦 Found ${orderItems.length} products to enroll`);
    
    // STEP 3: Create enrollment for each product
    let enrolledCount = 0;
    let skippedCount = 0;
    
    for (const item of orderItems) {
      try {
        const enrollment = createEnrollment(user.id, item.product_id, order.id);
        
        if (enrollment) {
          enrolledCount++;
          Logger.log(`✅ Enrolled in: ${item.product_name}`);
        } else {
          skippedCount++;
          Logger.log(`⚠️ Already enrolled in: ${item.product_name}`);
        }
        
      } catch (enrollError) {
        Logger.log(`❌ Failed to enroll in ${item.product_name}: ${enrollError.message}`);
        
        // Log individual product enrollment failure
        logFailedEnrollment(
          order.id,
          order.customer_email,
          `Failed to enroll in product ${item.product_id}: ${enrollError.message}`
        );
      }
    }
    
    Logger.log(`📊 Enrollment summary: ${enrolledCount} created, ${skippedCount} skipped`);
    
    // STEP 4: Send confirmation email (optional)
    if (enrolledCount > 0) {
      try {
        sendEnrollmentConfirmation(order, user, orderItems);
      } catch (emailError) {
        Logger.log(`⚠️ Email notification failed: ${emailError.message}`);
        // Don't throw - email is nice-to-have
      }
    }
    
    return {
      success: true,
      enrolled: enrolledCount,
      skipped: skippedCount,
      total: orderItems.length
    };
    
  } catch (error) {
    Logger.log(`❌ Auto-enrollment error: ${error.message}`);
    Logger.log(error.stack);
    
    // Log failed enrollment
    logFailedEnrollment(
      order.id,
      order.customer_email,
      `Enrollment failed: ${error.message}`
    );
    
    throw error;
  }
}

// ============================================
// EMAIL NOTIFICATION
// ============================================

/**
 * Send enrollment confirmation email
 * 
 * @param {object} order - Order object
 * @param {object} user - User profile
 * @param {Array} products - Enrolled products
 */
function sendEnrollmentConfirmation(order, user, products) {
  try {
    Logger.log(`📧 Sending enrollment confirmation to ${user.email}`);
    
    const productList = products
      .map(p => `• ${p.product_name}`)
      .join('\n');
    
    const message = 
      `🎉 *Kích hoạt khóa học thành công!*\n\n` +
      `Xin chào ${user.full_name || order.customer_name},\n\n` +
      `Thanh toán của bạn đã được xác nhận. Các khóa học sau đã được kích hoạt:\n\n` +
      `${productList}\n\n` +
      `🔗 Đăng nhập tại: https://www.sheetapp.io.vn/login\n` +
      `📚 Bắt đầu học ngay: https://www.sheetapp.io.vn/courses\n\n` +
      `Cảm ơn bạn đã tin tưởng SheetApp! 🙏`;
    
    // Send via Google Chat (hoặc email service)
    gchat_newbug(
      'Auto-Enrollment',
      `Enrollment Success: ${order.order_id}`,
      message
    );
    
    // TODO: Integrate real email service (Resend, SendGrid, etc.)
    // sendEmail({
    //   to: user.email,
    //   subject: '🎉 Khóa học đã được kích hoạt - SheetApp',
    //   body: message
    // });
    
    Logger.log('✅ Confirmation sent');
    
  } catch (error) {
    Logger.log(`❌ Email error: ${error.message}`);
    // Don't throw - email failure shouldn't break enrollment
  }
}

// ============================================
// GUEST USER HANDLING
// ============================================

/**
 * Send signup invitation to guest user
 * (For future implementation)
 * 
 * @param {string} email - Guest email
 * @param {string} name - Guest name
 */
function sendSignupInvitation(email, name) {
  try {
    Logger.log(`📧 Sending signup invitation to ${email}`);
    
    const message = 
      `👋 *Hoàn tất kích hoạt khóa học*\n\n` +
      `Xin chào ${name},\n\n` +
      `Cảm ơn bạn đã thanh toán! Để bắt đầu học, vui lòng:\n\n` +
      `1️⃣ Đăng ký tài khoản tại: https://www.sheetapp.io.vn/signup\n` +
      `2️⃣ Sử dụng email: *${email}*\n` +
      `3️⃣ Khóa học sẽ tự động kích hoạt sau khi đăng ký\n\n` +
      `⚡ Lưu ý: Cần dùng chính email ${email} để nhận khóa học!\n\n` +
      `Có thắc mắc? Liên hệ support@sheetapp.io.vn`;
    
    gchat_newbug(
      'Guest Purchase',
      `Invitation sent: ${email}`,
      message
    );
    
    // TODO: Send actual email
    
  } catch (error) {
    Logger.log(`❌ Invitation email failed: ${error.message}`);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user has access to a product
 * 
 * @param {string} userId - User UUID
 * @param {string} productId - Product UUID
 * @returns {boolean} true if enrolled
 */
function hasProductAccess(userId, productId) {
  try {
    const enrollments = supabaseSelect('enrollments', {
      select: 'id',
      eq: {
        user_id: userId,
        product_id: productId
      },
      limit: 1
    });
    
    return enrollments && enrollments.length > 0;
  } catch (error) {
    Logger.log(`❌ Error checking access: ${error.message}`);
    return false;
  }
}

/**
 * Get all enrollments for a user
 * 
 * @param {string} userId - User UUID
 * @returns {Array} Enrollment records with product details
 */
function getUserEnrollments(userId) {
  try {
    // Note: Apps Script doesn't support JOIN directly
    // Need to fetch enrollments then products separately
    const enrollments = supabaseSelect('enrollments', {
      select: 'id,product_id,enrolled_at,progress,completed_at',
      eq: { user_id: userId }
    });
    
    return enrollments || [];
  } catch (error) {
    Logger.log(`❌ Error fetching enrollments: ${error.message}`);
    return [];
  }
}

/**
 * Retry failed enrollments (manual trigger or cron)
 */
function retryFailedEnrollments() {
  Logger.log('🔄 Starting failed enrollment retry...');
  
  try {
    // Get failed enrollments that haven't been resolved
    const failed = supabaseSelect('failed_enrollments', {
      select: '*',
      eq: { resolved_at: null },
      lt: { retry_count: 3 }, // Max 3 retries
      limit: 10
    });
    
    if (!failed || failed.length === 0) {
      Logger.log('✅ No failed enrollments to retry');
      return { processed: 0 };
    }
    
    Logger.log(`📋 Found ${failed.length} failed enrollments`);
    
    let successCount = 0;
    
    for (const failedEnrollment of failed) {
      try {
        // Re-fetch order
        const order = supabaseSelect('orders', {
          select: '*',
          eq: { id: failedEnrollment.order_id },
          limit: 1
        })[0];
        
        if (!order) {
          Logger.log(`⚠️ Order ${failedEnrollment.order_id} not found`);
          continue;
        }
        
        // Retry enrollment
        const result = enrollUserInProducts(order);
        
        if (result.success) {
          // Mark as resolved
          supabaseUpdate('failed_enrollments',
            { 
              resolved_at: new Date().toISOString(),
              retry_count: failedEnrollment.retry_count + 1
            },
            { id: failedEnrollment.id }
          );
          
          successCount++;
          Logger.log(`✅ Retry successful for ${order.customer_email}`);
        }
        
      } catch (retryError) {
        Logger.log(`❌ Retry failed: ${retryError.message}`);
        
        // Increment retry count
        supabaseUpdate('failed_enrollments',
          { 
            retry_count: failedEnrollment.retry_count + 1,
            last_retry_at: new Date().toISOString()
          },
          { id: failedEnrollment.id }
        );
      }
    }
    
    Logger.log(`📊 Retry complete: ${successCount}/${failed.length} successful`);
    
    return {
      total: failed.length,
      successful: successCount,
      failed: failed.length - successCount
    };
    
  } catch (error) {
    Logger.log(`❌ Retry process error: ${error.message}`);
    throw error;
  }
}

// ============================================
// TESTING FUNCTIONS
// ============================================

/**
 * Test enrollment với order ID thực tế
 */
function testEnrollment() {
  const orderId = 'DH1768561800'; // Replace với order thực tế
  
  Logger.log(`🧪 Testing enrollment for order: ${orderId}`);
  
  try {
    const order = findOrderById(orderId);
    
    if (!order) {
      Logger.log(`❌ Order not found: ${orderId}`);
      return;
    }
    
    const result = enrollUserInProducts(order);
    
    Logger.log(`✅ Enrollment test completed:`);
    Logger.log(JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    Logger.log(`❌ Test failed: ${error.message}`);
    Logger.log(error.stack);
    throw error;
  }
}

/**
 * Test check user access
 */
function testUserAccess() {
  const userEmail = 'test@example.com'; // Replace
  const productId = 'product-uuid-here'; // Replace
  
  Logger.log(`🧪 Testing access for ${userEmail}`);
  
  const user = findUserByEmail(userEmail);
  
  if (!user) {
    Logger.log(`❌ User not found`);
    return false;
  }
  
  const hasAccess = hasProductAccess(user.id, productId);
  
  Logger.log(`Access: ${hasAccess ? 'YES ✅' : 'NO ❌'}`);
  
  return hasAccess;
}
