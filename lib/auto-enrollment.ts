/**
 * Auto-Enrollment Module
 * Handles automatic user enrollment after successful payment
 */

import { query } from '@/lib/db';
import { Resend } from 'resend';

interface Order {
    id: string;
    order_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    total_amount: number;
    user_id?: string;
}

interface OrderItem {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
}

/**
 * Main function to enroll user in products after payment
 */
export async function enrollUserInProducts(order: Order): Promise<void> {
    try {
        console.log(`🎓 Starting auto-enrollment for order: ${order.order_id}`);

        // 1. Get products from order
        // BUG THẬT phát hiện lúc migrate: order_items.order_id là UUID (tham chiếu orders.id),
        // code gốc truyền order.order_id (mã text "DH...") vào đây — sai kiểu, enrollment luôn
        // trả về rỗng. Khớp bằng chứng: bảng enrollments có 0 dòng dù products có 25 dòng.
        const products = await getProductsFromOrder(order.id);

        if (!products || products.length === 0) {
            console.warn('No products found for order:', order.order_id);
            return;
        }

        console.log(`Found ${products.length} products to enroll`);

        // 2. For each product, mark as enrolled
        for (const product of products) {
            await markProductEnrolled(order, product);
        }

        console.log(`✅ Enrollment completed for order: ${order.order_id}`);

        // 3. TODO: Send enrollment email (future enhancement)
        // await sendEnrollmentEmail(order.customer_email, products);

    } catch (error) {
        console.error('❌ Enrollment error:', error);
        // Don't throw - we already updated payment status
        // Log error for manual follow-up
    }
}

/**
 * Get products from order_items table with product details including type
 */
async function getProductsFromOrder(orderId: string): Promise<OrderItem[]> {
    try {
        const result = await query(
            `SELECT oi.*, p.name AS product_name, p.type AS product_type
             FROM order_items oi
             LEFT JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = $1`,
            [orderId]
        );

        // Transform data to include product details
        return result.rows.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.product_name || 'Unknown Product',
            product_type: item.product_type || 'course', // Default to course if missing
            quantity: item.quantity,
            price: item.price_at_purchase
        }));
    } catch (error) {
        console.error('Error fetching order items:', error);
        return [];
    }
}

/**
 * Mark product as enrolled/activated - routes to course or service activation
 */
async function markProductEnrolled(order: Order, product: any): Promise<void> {
    try {
        // Step 1: Find or create user profile
        const userId = await findOrCreateUserProfile(
            order.customer_email,
            order.customer_name,
            order.customer_phone
        );

        if (!userId) {
            throw new Error(`Failed to get/create profile for ${order.customer_email}`);
        }

        // Step 2: Activate based on product type
        const productType = product.product_type || 'course';

        if (productType === 'course') {
            await activateCourse(userId, product, order.order_id);
        } else if (productType === 'service') {
            await activateService(userId, product, order);
        } else {
            console.warn(`⚠️ Unknown product type: ${productType}, defaulting to course activation`);
            await activateCourse(userId, product, order.order_id);
        }

    } catch (error) {
        console.error(`❌ Error activating product ${product.product_id}:`, error);
        throw error;
    }
}

/**
 * Activate a course - create enrollment record
 */
async function activateCourse(
    userId: string,
    product: any,
    orderId: string
): Promise<void> {
    try {
        await query(
            `INSERT INTO enrollments (user_id, product_id, order_id, enrolled_at, progress, completed_at)
             VALUES ($1, $2, $3, NOW(), 0, NULL)`,
            [userId, product.product_id, orderId]
        );
    } catch (error: any) {
        // Handle duplicate enrollment gracefully
        if (error.code === '23505') { // Unique constraint violation
            console.log(`ℹ️ User already enrolled in course: ${product.product_name}`);
            return;
        }

        console.error(`❌ Error enrolling in course ${product.product_id}:`, error);
        throw error;
    }

    console.log(`✅ Course activated: ${product.product_name}`);
}

/**
 * Activate a service - create service activation record
 */
async function activateService(
    userId: string,
    product: any,
    order: Order
): Promise<void> {
    try {
        await query(
            `INSERT INTO service_activations (user_id, product_id, order_id, status, customer_notes, created_at)
             VALUES ($1, $2, $3, 'pending', NULL, NOW())`,
            [userId, product.product_id, order.order_id]
        );
    } catch (error: any) {
        // Handle duplicate activation gracefully
        if (error.code === '23505') { // Unique constraint violation
            console.log(`ℹ️ Service already activated: ${product.product_name}`);
            return;
        }

        console.error(`❌ Error activating service ${product.product_id}:`, error);
        throw error;
    }

    console.log(`✅ Service activated (pending): ${product.product_name}`);

    // Notify admin about new service that needs handling
    try {
        await notifyAdminAboutNewService(userId, product, order.order_id);
    } catch (notifyError) {
        console.error('⚠️ Failed to notify admin (non-critical):', notifyError);
        // Don't throw - notification is nice-to-have
    }
}

/**
 * Find user by email or create profile for guest users
 * Returns user UUID
 */
async function findOrCreateUserProfile(
    email: string,
    name: string,
    phone: string
): Promise<string | null> {
    try {
        // 1. Check if profile exists
        const existing = await query<{ id: string }>('SELECT id FROM profiles WHERE email = $1 LIMIT 1', [email]);
        const profile = existing.rows[0];

        if (profile) {
            console.log(`✅ Found existing profile for ${email}`);
            return profile.id;
        }

        // 2. Profile doesn't exist - create it for guest purchase
        console.log(`📝 Creating new profile for guest user: ${email}`);

        try {
            const inserted = await query<{ id: string }>(
                `INSERT INTO profiles (id, email, name, phone, created_via, role, created_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, 'purchase', 'customer', NOW())
                 RETURNING id`,
                [email, name, phone]
            );
            const newProfile = inserted.rows[0];
            console.log(`✅ Created new profile: ${newProfile?.id}`);
            return newProfile?.id || null;
        } catch (error) {
            console.error('Error creating profile:', error);
            return null;
        }

    } catch (error) {
        console.error('Exception in findOrCreateUserProfile:', error);
        return null;
    }
}

/**
 * Send enrollment confirmation email
 * TODO: Integrate with Resend or SendGrid
 */
/**
 * Send notification to admin about new service activation
 */
async function notifyAdminAboutNewService(
    userId: string,
    product: any,
    orderId: string
): Promise<void> {
    try {
        // Skip if no admin email configured
        if (!process.env.ADMIN_EMAIL) {
            console.log('⚠️ ADMIN_EMAIL not configured - skipping admin notification');
            return;
        }

        // Skip if no Resend API key
        if (!process.env.RESEND_API_KEY) {
            console.log('⚠️ RESEND_API_KEY not configured - skipping admin notification');
            return;
        }

        // Get user profile details
        const profileResult = await query<{ name: string; email: string; phone: string }>(
            'SELECT name, email, phone FROM profiles WHERE id = $1 LIMIT 1',
            [userId]
        );
        const profile = profileResult.rows[0];

        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
            from: 'SheetApp System <system@sheetapp.io.vn>',
            to: process.env.ADMIN_EMAIL,
            subject: `🔔 Dịch vụ mới cần xử lý - ${product.product_name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #ef4444; margin-bottom: 20px;">🔔 Dịch vụ mới cần assign</h2>
                    
                    <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>⚡ Hành động cần thiết:</strong> Assign dịch vụ này cho staff và liên hệ khách hàng trong vòng 24h.
                        </p>
                    </div>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">📋 Thông tin dịch vụ:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; width: 40%;"><strong>Dịch vụ:</strong></td>
                                <td style="padding: 8px 0; color: #1f2937;">${product.product_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;"><strong>Mã đơn hàng:</strong></td>
                                <td style="padding: 8px 0; color: #1f2937;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;"><strong>Giá trị:</strong></td>
                                <td style="padding: 8px 0; color: #1f2937;">${product.price?.toLocaleString('vi-VN')} ₫</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">👤 Thông tin khách hàng:</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; width: 40%;"><strong>Họ tên:</strong></td>
                                <td style="padding: 8px 0; color: #1f2937;">${profile?.name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td>
                                <td style="padding: 8px 0; color: #1f2937;"><a href="mailto:${profile?.email}" style="color: #3b82f6;">${profile?.email}</a></td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280;"><strong>SĐT:</strong></td>
                                <td style="padding: 8px 0; color: #1f2937;">${profile?.phone || 'Chưa cung cấp'}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/services" 
                           style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Xem trong Admin Dashboard →
                        </a>
                    </p>
                    
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                        Email tự động từ hệ thống SheetApp. Vui lòng không reply email này.
                    </p>
                </div>
            `
        });

        console.log(`📧 Admin notified about new service: ${product.product_name}`);

    } catch (error) {
        console.error('❌ Failed to send admin notification:', error);
        // Don't throw - notification is nice-to-have, not critical
    }
}

/**
 * Send enrollment confirmation email to customer
 */
export async function sendEnrollmentEmail(
    email: string,
    products: OrderItem[],
    orderDetails?: { order_id: string; total_amount: number }
): Promise<void> {
    try {
        // Skip if no API key configured
        if (!process.env.RESEND_API_KEY) {
            console.log('⚠️ Resend not configured - skipping email (set RESEND_API_KEY)');
            return;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        const productList = products
            .map(p => `• ${p.product_name} - ${p.price.toLocaleString('vi-VN')}₫`)
            .join('\n');

        console.log(`📧 Sending enrollment email to ${email}...`);

        const { error } = await resend.emails.send({
            from: 'SheetApp <noreply@sheetapp.io.vn>',
            to: email,
            subject: '🎉 Thanh toán thành công - Khóa học đã được kích hoạt!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #10b981; margin-bottom: 20px;">Cảm ơn bạn đã mua hàng tại SheetApp!</h2>
                    <p style="font-size: 16px; line-height: 1.6;">Thanh toán của bạn đã được xác nhận thành công.</p>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #1f2937;">🎓 Khóa học đã kích hoạt:</h3>
                        <ul style="line-height: 1.8; color: #4b5563;">
                            ${products.map(p => `<li><strong>${p.product_name}</strong> - ${p.price.toLocaleString('vi-VN')}₫</li>`).join('')}
                        </ul>
                    </div>
                    
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" 
                           style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                            Đăng nhập và bắt đầu học ngay →
                        </a>
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                    
                    <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>📌 Quan trọng:</strong> Nếu bạn chưa có tài khoản, vui lòng đăng ký bằng email: <strong>${email}</strong>
                        </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                        <strong>Mã đơn hàng:</strong> ${orderDetails?.order_id}<br>
                        <strong>Tổng tiền:</strong> ${orderDetails?.total_amount?.toLocaleString('vi-VN')} ₫
                    </p>
                    
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                        © 2026 SheetApp. Giải pháp Google Sheets & AppSheet chuyên nghiệp.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('❌ Email send failed:', error);
            throw error;
        }

        console.log(`✅ Enrollment email sent to ${email}`);

    } catch (error) {
        console.error('❌ Email error:', error);
        // Don't throw - email is nice-to-have, not critical
    }
}

/**
 * Check if user has access to a product
 * Can be used in UI to gate content
 */
export async function hasProductAccess(
    email: string,
    productId: string
): Promise<boolean> {
    // Check if user has any paid order containing this product
    const result = await query(
        `SELECT o.order_id
         FROM orders o
         INNER JOIN order_items oi ON oi.order_id = o.id
         WHERE o.customer_email = $1 AND o.status = 'paid' AND oi.product_id = $2
         LIMIT 1`,
        [email, productId]
    );

    return result.rows.length > 0;
}

/**
 * Get all products user has access to
 */
export async function getUserProducts(email: string): Promise<string[]> {
    const result = await query<{ product_id: string }>(
        `SELECT DISTINCT oi.product_id
         FROM orders o
         INNER JOIN order_items oi ON oi.order_id = o.id
         WHERE o.customer_email = $1 AND o.status = 'paid'`,
        [email]
    );

    return result.rows.map((row) => row.product_id).filter(Boolean);
}
