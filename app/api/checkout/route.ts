import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
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

        let products: any[];
        try {
            const result = await query(
                'SELECT id, name, price, is_active FROM products WHERE id = ANY($1) AND is_active = true',
                [productIds]
            );
            products = result.rows;
        } catch (fetchError) {
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
            // pg trả cột bigint dạng string (tránh mất precision) — so sánh phải ép cùng kiểu string
            const realProduct = products.find((p: any) => String(p.id) === String(itemId));

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

        // Step 1+2: create the order and its order_items inside a single DB transaction.
        // Previously these were two independent query() calls with a manual compensating
        // DELETE on failure, which didn't clean up order_items already inserted earlier in the
        // loop when a later item failed — a real transaction makes partial failure impossible.
        let order: any;
        try {
            order = await withTransaction(async (client) => {
                const orderResult = await client.query(
                    `INSERT INTO orders (
                        id, order_id, user_id, customer_email, customer_name, customer_phone,
                        total_amount, status, payment_qr_code, payment_method, payment_link_id,
                        payment_url, payment_expires_at, payos_order_code, created_at
                    ) VALUES (
                        gen_random_uuid(), $1, NULL, $2, $3, $4,
                        $5, 'pending', $6, $7, $8,
                        $9, $10, $11, NOW()
                    ) RETURNING *`,
                    [
                        orderId,
                        validation.sanitized.email,
                        validation.sanitized.name,
                        validation.sanitized.phone,
                        totalAmount,
                        qrCode,
                        paymentLinkData ? 'payos' : 'bank_transfer',
                        paymentLinkData?.paymentLinkId || null,
                        paymentLinkData?.checkoutUrl || null,
                        paymentLinkData ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
                        payosOrderCode,
                    ]
                );
                const createdOrder = orderResult.rows[0];

                for (const item of validatedItems) {
                    await client.query(
                        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, created_at)
                         VALUES ($1, $2, $3, $4, NOW())`,
                        [createdOrder.id, item.product_id, item.quantity, item.price]
                    );
                }

                return createdOrder;
            });
        } catch (error) {
            console.error('Error creating order/order_items:', error);
            return NextResponse.json(
                { error: 'Lỗi tạo đơn hàng: ' + (error instanceof Error ? error.message : String(error)) },
                { status: 500 }
            );
        }

        console.log('✅ Order and order items created successfully:', order.order_id);

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
