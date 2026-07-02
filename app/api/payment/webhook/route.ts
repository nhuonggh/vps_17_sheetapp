import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payos';
import { enrollUserInProducts, sendEnrollmentEmail } from '@/lib/auto-enrollment';

/**
 * GET /api/payment/webhook
 * PayOS may send GET request to verify webhook URL
 * Return 200 OK to confirm endpoint is accessible
 */
export async function GET(request: NextRequest) {
    console.log('✅ PayOS webhook verification (GET) - returning OK');
    return NextResponse.json({
        success: true,
        message: 'Webhook endpoint is active'
    });
}

/**
 * POST /api/payment/webhook
 * PayOS webhook endpoint for payment notifications
 * This endpoint is called by PayOS when payment status changes
 * 
 * Flow:
 * 1. Verify webhook signature
 * 2. Check if test webhook (orderCode = 999999)
 * 3. Find order and validate amount
 * 4. Check idempotency
 * 5. Update order status
 * 6. Create transaction record
 * 7. Auto-enroll user if payment successful
 */
export async function POST(request: NextRequest) {
    try {
        const webhookData = await request.json();

        console.log('📨 PayOS webhook received:', JSON.stringify(webhookData, null, 2));
        // ⚠️ TEMPORARY: Return 200 OK for ALL webhooks
        // console.log('✅ TEMP MODE: Accepting all webhooks for setup');
        // return NextResponse.json({
        //     success: true,
        //     message: 'Webhook endpoint active'
        // });
        // Extract payment data - handle both formats
        // PayOS test webhook may send data directly or in data object
        const paymentData = webhookData.data || webhookData;
        const {
            orderCode,
            amount,
            description,
            accountNumber,
            reference,
            transactionDateTime,
            code, // Payment status code
            desc, // Payment status description
        } = paymentData;

        // Handle test webhook from PayOS (when configuring webhook URL)
        // PayOS sends test with orderCode = 999999 or just empty data
        // Do this BEFORE signature verification because test webhook has different signature
        const isTestWebhook =
            orderCode === 999999 ||
            orderCode === '999999' ||
            orderCode === 'TEST' ||
            webhookData.desc === 'Test webhook' ||
            !orderCode; // PayOS may send empty test

        if (isTestWebhook) {
            console.log('✅ Test webhook from PayOS detected - returning OK');
            console.log('   Test indicators:', { orderCode, desc: webhookData.desc, hasData: !!webhookData.data });
            return NextResponse.json({
                success: true,
                message: 'Test webhook received successfully'
            });
        }

        // Verify webhook signature (skip for test webhooks)
        const signature = request.headers.get('x-payos-signature') || '';
        const isValid = await verifyWebhookSignature(webhookData, signature);

        if (!isValid) {
            console.error('❌ Invalid webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        console.log(`🔍 Processing payment for order: ${orderCode}`);

        // Find order by orderCode
        const ordersResult = await query(
            'SELECT * FROM orders WHERE order_id ILIKE $1 LIMIT 1',
            [`%${orderCode}%`]
        );

        if (ordersResult.rows.length === 0) {
            console.error('Order not found:', orderCode);
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        const order = ordersResult.rows[0];

        // Validate amount matches
        if (order.total_amount !== amount) {
            console.error(`Amount mismatch: expected ${order.total_amount}, got ${amount}`);
            return NextResponse.json(
                { error: 'Amount mismatch' },
                { status: 400 }
            );
        }

        // Check if webhook already processed (idempotency)
        const existingTransactionResult = await query(
            'SELECT id FROM transactions WHERE transaction_id = $1 LIMIT 1',
            [reference]
        );
        const existingTransaction = existingTransactionResult.rows[0];

        if (existingTransaction) {
            console.log('Webhook already processed:', reference);
            return NextResponse.json({ success: true, message: 'Already processed' });
        }

        // Determine payment status
        let orderStatus: string;
        let transactionStatus: string;

        if (code === '00' || code === 'PAID') {
            orderStatus = 'paid';
            transactionStatus = 'success';
        } else if (code === 'CANCELLED') {
            orderStatus = 'cancelled';
            transactionStatus = 'cancelled';
        } else {
            orderStatus = 'pending';
            transactionStatus = 'pending';
        }

        // Update order status
        try {
            await query(
                `UPDATE orders SET status = $1, paid_at = $2, transaction_id = $3 WHERE order_id = $4`,
                [orderStatus, orderStatus === 'paid' ? new Date().toISOString() : null, reference, order.order_id]
            );
        } catch (updateError) {
            console.error('Error updating order:', updateError);
            return NextResponse.json(
                { error: 'Failed to update order' },
                { status: 500 }
            );
        }

        // Create transaction record
        try {
            await query(
                `INSERT INTO transactions (
                    id, order_id, transaction_id, amount, currency, status,
                    payment_method, bank_code, account_number, paid_at, webhook_data, created_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, 'VND', $4,
                    'BANK_TRANSFER', $5, $6, $7, $8, NOW()
                )`,
                [
                    order.order_id,
                    reference,
                    amount,
                    transactionStatus,
                    accountNumber,
                    accountNumber,
                    orderStatus === 'paid' ? transactionDateTime : null,
                    JSON.stringify(webhookData),
                ]
            );
        } catch (transactionError) {
            console.error('Error creating transaction:', transactionError);
            // Don't return error, order is already updated
        }

        console.log(`✅ Order ${order.order_id} updated to ${orderStatus}`);

        // Auto-enroll user if payment successful
        if (orderStatus === 'paid') {
            try {
                console.log(`🎓 Initiating auto-enrollment for order ${order.order_id}`);
                await enrollUserInProducts(order);
                console.log(`✅ Auto-enrollment completed`);

                // Send email notification with order details
                try {
                    const orderItemsResult = await query<{ product_id: number; quantity: number; price_at_purchase: number }>(
                        'SELECT product_id, quantity, price_at_purchase FROM order_items WHERE order_id = $1',
                        [order.id]
                    );
                    const orderItems = orderItemsResult.rows;

                    if (orderItems && orderItems.length > 0) {
                        // Get product names
                        const productIds = orderItems.map(item => item.product_id);
                        const productsResult = await query<{ id: number; name: string }>(
                            'SELECT id, name FROM products WHERE id = ANY($1)',
                            [productIds]
                        );
                        const products = productsResult.rows;

                        // Map product names to order items
                        const enrichedItems = orderItems.map(item => ({
                            product_id: item.product_id,
                            product_name: products?.find(p => p.id === item.product_id)?.name || 'Unknown Product',
                            quantity: item.quantity,
                            price: item.price_at_purchase
                        }));

                        await sendEnrollmentEmail(
                            order.customer_email,
                            enrichedItems,
                            {
                                order_id: order.order_id || 'N/A',
                                total_amount: amount
                            }
                        );
                        console.log(`📧 Email notification queued for ${order.customer_email}`);
                    }
                } catch (emailError) {
                    console.error('⚠️ Email send failed (non-critical):', emailError);
                    // Don't fail the webhook for email errors
                }

            } catch (enrollError: any) {
                console.error('❌ Auto-enrollment failed:', enrollError);

                // Log to failed_enrollments table for retry
                try {
                    await query(
                        `INSERT INTO failed_enrollments (
                            order_id, customer_email, error_message, error_details, retry_count, created_at
                        ) VALUES ($1, $2, $3, $4, 0, NOW())`,
                        [
                            order.order_id,
                            order.customer_email,
                            enrollError?.message || 'Unknown error',
                            JSON.stringify({ stack: enrollError?.stack, code: enrollError?.code }),
                        ]
                    );
                    console.log(`📝 Logged to failed_enrollments for manual review`);
                } catch (logError) {
                    console.error('Failed to log enrollment error:', logError);
                }

                // Don't fail the webhook - payment is already processed
                // This can be retried manually or via cron job
            }
        }

        // Return 200 OK to PayOS
        return NextResponse.json({
            success: true,
            message: 'Webhook processed',
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
