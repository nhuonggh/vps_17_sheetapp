/**
 * Auto-Enrollment Module
 * Handles automatic user enrollment after successful payment
 */

import { supabaseServer } from '@/lib/supabase-server';
import { Resend } from 'resend';

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
        // Step 1: Find or create user profile
        const userId = await findOrCreateUserProfile(
            order.customer_email,
            order.customer_name,
            order.customer_phone
        );

        if (!userId) {
            throw new Error(`Failed to get/create profile for ${order.customer_email}`);
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
            })
            .select()
            .single();

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
        const { data: profile } = await supabaseServer
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (profile) {
            console.log(`✅ Found existing profile for ${email}`);
            return profile.id;
        }

        // 2. Profile doesn't exist - create it for guest purchase
        console.log(`📝 Creating new profile for guest user: ${email}`);

        const { data: newProfile, error } = await supabaseServer
            .from('profiles')
            .insert({
                email,
                name,
                phone,
                created_via: 'purchase'
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error creating profile:', error);
            return null;
        }

        console.log(`✅ Created new profile: ${newProfile?.id}`);
        return newProfile?.id || null;

    } catch (error) {
        console.error('Exception in findOrCreateUserProfile:', error);
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
