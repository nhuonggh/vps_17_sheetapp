/**
 * Auto-Enrollment Module
 * Handles automatic user enrollment after successful payment
 */

import { supabaseServer } from '@/lib/supabase-server';

interface Order {
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
        const products = await getProductsFromOrder(order.order_id);

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
 * Get products from order_items table
 */
async function getProductsFromOrder(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabaseServer
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

    if (error) {
        console.error('Error fetching order items:', error);
        return [];
    }

    return data || [];
}

/**
 * Mark product as enrolled - creates actual enrollment record
 */
async function markProductEnrolled(order: Order, product: OrderItem): Promise<void> {
    try {
        // Step 1: Find user by email
        const userId = await findUserByEmail(order.customer_email);

        if (!userId) {
            // Guest user - log for manual review
            console.warn(`⚠️ Guest purchase detected: ${order.customer_email} - Product: ${product.product_name}`);
            console.log(`📧 TODO: Send email invitation to ${order.customer_email} to signup and activate course`);

            // Log to failed_enrollments for manual activation
            await supabaseServer.from('failed_enrollments').insert({
                order_id: order.order_id,
                customer_email: order.customer_email,
                error_message: 'Guest user - no profile found',
                error_details: {
                    product_id: product.product_id,
                    product_name: product.product_name,
                    reason: 'User needs to signup to activate enrollment'
                },
                retry_count: 0
            });

            return; // Skip enrollment for now
        }

        // Step 2: Create enrollment record
        const { error } = await supabaseServer
            .from('enrollments')
            .insert({
                user_id: userId,
                product_id: product.product_id,
                order_id: order.order_id,
                enrolled_at: new Date().toISOString(),
                progress: 0,
                completed_at: null
            });

        if (error) {
            // Handle duplicate enrollment gracefully
            if (error.code === '23505') { // Unique constraint violation
                console.log(`ℹ️ User already enrolled in ${product.product_name}`);
                return;
            }

            console.error(`❌ Error enrolling ${order.customer_email} in product ${product.product_id}:`, error);
            throw error;
        }

        console.log(`✅ Enrolled: ${order.customer_email} in ${product.product_name}`);

    } catch (error) {
        console.error(`Error enrolling in product ${product.product_id}:`, error);
        throw error;
    }
}

/**
 * Find user by email in profiles table
 * Returns user UUID or null if not found
 */
async function findUserByEmail(email: string): Promise<string | null> {
    try {
        // Check profiles table (for registered users)
        const { data: profile, error } = await supabaseServer
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (error) {
            console.error('Error finding user by email:', error);
            return null;
        }

        return profile?.id || null;
    } catch (error) {
        console.error('Exception in findUserByEmail:', error);
        return null;
    }
}

/**
 * Send enrollment confirmation email
 * TODO: Integrate with Resend or SendGrid
 */
export async function sendEnrollmentEmail(
    email: string,
    products: OrderItem[],
    orderDetails?: { order_id: string; total_amount: number }
): Promise<void> {
    try {
        const productList = products
            .map(p => `• ${p.product_name}`)
            .join('\n');

        // TODO: Replace console.log with actual email service
        console.log(`📧 Sending enrollment email to ${email}`);
        console.log(`Products: ${products.length} items`);

        // Email template for future implementation:
        const emailTemplate = {
            to: email,
            subject: '🎉 Thanh toán thành công - Khóa học đã được kích hoạt!',
            html: `
                <h2>Cảm ơn bạn đã mua hàng tại SheetApp!</h2>
                <p>Thanh toán của bạn đã được xác nhận thành công.</p>
                
                <h3>🎓 Khóa học đã kích hoạt:</h3>
                <ul>
                    ${products.map(p => `<li>${p.product_name}</li>`).join('')}
                </ul>
                
                <p>
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" 
                       style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Đăng nhập và bắt đầu học ngay
                    </a>
                </p>
                
                <hr>
                <p style="color: #666; font-size: 14px;">
                    Mã đơn hàng: <strong>${orderDetails?.order_id}</strong><br>
                    Tổng tiền: <strong>${orderDetails?.total_amount?.toLocaleString('vi-VN')} ₫</strong>
                </p>
            `,
            text: `
🎉 Thanh toán thành công!

Cảm ơn bạn đã mua hàng tại SheetApp!

Khóa học đã kích hoạt:
${productList}

Đăng nhập tại: ${process.env.NEXT_PUBLIC_BASE_URL}/login

Mã đơn hàng: ${orderDetails?.order_id}
Tổng tiền: ${orderDetails?.total_amount?.toLocaleString('vi-VN')} ₫
            `
        };

        // Log email template for now
        console.log('📧 Email template ready:', {
            to: emailTemplate.to,
            subject: emailTemplate.subject,
            productCount: products.length
        });

        /* 
        // Uncomment when integrating with email service:
        
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: 'SheetApp <noreply@sheetapp.com>',
            ...emailTemplate
        });
        
        console.log(`✅ Enrollment email sent to ${email}`);
        */

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
    const { data: orders } = await supabaseServer
        .from('orders')
        .select(`
            order_id,
            status,
            order_items!inner(product_id)
        `)
        .eq('customer_email', email)
        .eq('status', 'paid')
        .eq('order_items.product_id', productId);

    return !!(orders && orders.length > 0);
}

/**
 * Get all products user has access to
 */
export async function getUserProducts(email: string): Promise<string[]> {
    const { data: orders } = await supabaseServer
        .from('orders')
        .select(`
            order_items(product_id)
        `)
        .eq('customer_email', email)
        .eq('status', 'paid');

    if (!orders) return [];

    // Extract unique product IDs
    const productIds = new Set<string>();
    orders.forEach((order: any) => {
        order.order_items?.forEach((item: any) => {
            if (item.product_id) {
                productIds.add(item.product_id);
            }
        });
    });

    return Array.from(productIds);
}
