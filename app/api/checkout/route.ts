import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { validateFormInput } from '@/lib/validators';
import { createPaymentLinkDirect } from '@/lib/payos-direct';
import { isPayOSConfigured } from '@/lib/payos';

/**
 * POST /api/checkout
 * Creates order and initiates PayOS payment
 * Fallback to static QR code if PayOS is not configured
 */
export async function POST(request: NextRequest) {
    // Log request arrival
    console.log('🚀 ============ CHECKOUT API CALLED ============');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', request.method);
    console.log('URL:', request.url);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('=============================================');

    try {
        const body = await request.json();
        const { items, customer } = body;

        console.log('📦 Request body received:', {
            itemsCount: items?.length,
            customerEmail: customer?.email
        });

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: 'Giỏ hàng trống' },
                { status: 400 }
            );
        }

        if (!customer) {
            return NextResponse.json(
                { error: 'Thiếu thông tin khách hàng' },
                { status: 400 }
            );
        }

        // Validate customer info
        const validation = validateFormInput({
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
        });

        if (!validation.isValid) {
            return NextResponse.json(
                { error: 'Thông tin khách hàng không hợp lệ', details: validation.errors },
                { status: 400 }
            );
        }

        // Fetch real prices from database
        const productIds = items.map((item: any) => item.product_id || item.id);

        const { data: products, error: fetchError } = await supabaseServer
            .from('products')
            .select('id, name, price, is_active')
            .in('id', productIds)
            .eq('is_active', true);

        if (fetchError || !products) {
            console.error('Error fetching products:', fetchError);
            return NextResponse.json(
                { error: 'Lỗi khi kiểm tra sản phẩm' },
                { status: 500 }
            );
        }

        // Validate all products exist
        if (products.length !== productIds.length) {
            return NextResponse.json(
                { error: 'Một số sản phẩm không còn tồn tại' },
                { status: 400 }
            );
        }

        // Calculate total with real prices
        let totalAmount = 0;
        const validatedItems = [];

        for (const cartItem of items) {
            const itemId = cartItem.product_id || cartItem.id;
            const realProduct = products.find((p: any) => p.id === itemId);

            if (!realProduct) {
                return NextResponse.json(
                    { error: `Sản phẩm ${itemId} không tìm thấy` },
                    { status: 400 }
                );
            }

            const quantity = parseInt(cartItem.quantity) || 1;
            if (quantity < 1 || quantity > 10) {
                return NextResponse.json(
                    { error: 'Số lượng không hợp lệ' },
                    { status: 400 }
                );
            }

            const itemTotal = realProduct.price * quantity;
            totalAmount += itemTotal;

            validatedItems.push({
                product_id: realProduct.id,
                product_name: realProduct.name,
                quantity,
                price: realProduct.price,
                subtotal: itemTotal,
            });
        }

        // Generate unique order ID
        const orderId = `DH${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        console.log('Creating order:', orderId, 'Total:', totalAmount);

        // Try to create PayOS payment link
        let paymentLinkData: any = null;
        let qrCode: string | null = null;
        let payosOrderCode: number | null = null; // ✅ Store orderCode for database

        if (isPayOSConfigured()) {
            console.log('✅ PayOS configured - creating payment link via direct API...');

            // Use Unix timestamp as orderCode (required integer by PayOS)
            const orderCodeInt = Math.floor(Date.now() / 1000);
            payosOrderCode = orderCodeInt; // ✅ Save for database
            const domain = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

            const paymentResult = await createPaymentLinkDirect({
                orderCode: orderCodeInt,
                amount: totalAmount,
                description: orderId.substring(0, 9), // Max 9 chars for MB Bank
                returnUrl: `${domain}/payment/callback?orderCode=${orderId}`,
                cancelUrl: `${domain}/payment/callback?cancelled=true&orderCode=${orderId}`,
                items: validatedItems.map(item => ({
                    name: item.product_name,
                    quantity: item.quantity,
                    price: item.price,
                })),
                buyerName: validation.sanitized.name,
                buyerEmail: validation.sanitized.email,
                buyerPhone: validation.sanitized.phone,
                expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
            });

            if (paymentResult.success && paymentResult.data) {
                paymentLinkData = paymentResult.data;
                qrCode = paymentResult.data.qrCode || null;
                console.log('✅ PayOS payment link created:', paymentLinkData.checkoutUrl);
            } else {
                console.warn('⚠️ PayOS payment link creation failed, falling back to static QR:', paymentResult.error);
            }
        } else {
            console.warn('⚠️ PayOS not configured, using static QR code');
        }

        // Fallback to static QR if PayOS failed or not configured
        if (!paymentLinkData) {
            qrCode = generatePaymentQR(orderId, totalAmount);
            console.log('Using static VietQR code');
        }

        // Step 1: Create order in database with customer info
        const { data: order, error: orderError } = await supabaseServer
            .from('orders')
            .insert({
                order_id: orderId,
                user_id: null, // Guest checkout - no user_id required
                customer_email: validation.sanitized.email,
                customer_name: validation.sanitized.name,
                customer_phone: validation.sanitized.phone,
                total_amount: totalAmount,
                status: 'pending',
                payment_qr_code: qrCode,
                payment_method: paymentLinkData ? 'payos' : 'bank_transfer',
                payment_link_id: paymentLinkData?.paymentLinkId || null,
                payment_url: paymentLinkData?.checkoutUrl || null,
                payment_expires_at: paymentLinkData ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
                payos_order_code: payosOrderCode, // ✅ NEW: Save PayOS orderCode
            })
            .select()
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            return NextResponse.json(
                { error: 'Lỗi tạo đơn hàng: ' + orderError.message },
                { status: 500 }
            );
        }

        console.log('✅ Order created successfully:', order.order_id);

        // Step 2: Insert order items into order_items table
        const orderItems = validatedItems.map(item => ({
            order_id: order.id, // UUID from orders table
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_purchase: item.price,
        }));

        const { error: itemsError } = await supabaseServer
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            console.error('Error creating order items:', itemsError);

            // Rollback: Delete the order if items insertion fails
            await supabaseServer
                .from('orders')
                .delete()
                .eq('id', order.id);

            return NextResponse.json(
                { error: 'Lỗi tạo chi tiết đơn hàng: ' + itemsError.message },
                { status: 500 }
            );
        }

        console.log('✅ Order items created successfully');

        // Return success with payment info
        return NextResponse.json({
            success: true,
            order: {
                id: order.order_id,
                totalAmount,
                items: validatedItems,
                qrCode, // PayOS QR or static VietQR
                paymentUrl: order.payment_url, // PayOS checkout URL (if available)
                expiresAt: order.payment_expires_at,
                status: 'pending',
            },
        });

    } catch (error) {
        // Enhanced error logging for debugging
        console.error('❌ ============ CHECKOUT ERROR ============');
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('Timestamp:', new Date().toISOString());
        console.error('==========================================');

        // Detailed error response with more context
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorType = error?.constructor?.name || 'Unknown';

        return NextResponse.json(
            {
                success: false,
                error: 'Lỗi hệ thống',
                details: errorMessage,
                errorType: errorType,
                timestamp: new Date().toISOString(),
                // Include stack trace in development only
                ...(process.env.NODE_ENV === 'development' && error instanceof Error && { stack: error.stack })
            },
            { status: 500 }
        );
    }
}

/**
 * Generate static VietQR payment code
 */
function generatePaymentQR(orderId: string, amount: number): string {
    const bankId = '970422'; // MBBank
    const accountNo = '0987726236';
    const accountName = 'VO TAN NHUONG';

    // Nội dung chuyển khoản: SheetApp + Mã đơn hàng
    const transactionInfo = `SheetApp ${orderId}`;

    // Generate VietQR URL
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(transactionInfo)}&accountName=${encodeURIComponent(accountName)}`;
}
