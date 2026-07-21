import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyWebhookSignature } from '@/lib/payos';
import { processSuccessfulPayment, type Order } from '@/lib/auto-enrollment';

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
        // Extract just enough to detect test webhooks — everything else is read from the
        // verified `data` below so an unverified payload can't smuggle tampered fields in.
        // PayOS test webhook may send data directly or in data object
        const paymentData = webhookData.data || webhookData;
        const { orderCode } = paymentData;

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

        // Verify webhook payload (signature lives in the body, PayOS signs {data, signature}).
        // Use the verified `data` for everything below instead of the pre-verify `paymentData`
        // so a signature bypass can't smuggle tampered fields through.
        const { valid: isValid, data: verifiedData } = await verifyWebhookSignature(webhookData);

        if (!isValid || !verifiedData) {
            console.error('❌ Invalid webhook signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 401 }
            );
        }

        const {
            orderCode: verifiedOrderCode,
            amount: verifiedAmount,
            accountNumber: verifiedAccountNumber,
            reference: verifiedReference,
            transactionDateTime: verifiedTransactionDateTime,
            code: verifiedCode,
        } = verifiedData;

        console.log(`🔍 Processing payment for order: ${verifiedOrderCode}`);

        // Find order by exact payos_order_code match (not a fuzzy substring match on order_id)
        const ordersResult = await query(
            'SELECT * FROM orders WHERE payos_order_code = $1 LIMIT 1',
            [Number(verifiedOrderCode)]
        );

        if (ordersResult.rows.length === 0) {
            console.error('Order not found:', verifiedOrderCode);
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        const order = ordersResult.rows[0];

        // Validate amount matches — total_amount is numeric and comes back as a string from pg
        if (Number(order.total_amount) !== Number(verifiedAmount)) {
            console.error(`Amount mismatch: expected ${order.total_amount}, got ${verifiedAmount}`);
            return NextResponse.json(
                { error: 'Amount mismatch' },
                { status: 400 }
            );
        }

        // Determine payment status
        let orderStatus: string;
        let transactionStatus: string;

        if (verifiedCode === '00' || verifiedCode === 'PAID') {
            orderStatus = 'paid';
            transactionStatus = 'success';
        } else if (verifiedCode === 'CANCELLED') {
            orderStatus = 'cancelled';
            transactionStatus = 'cancelled';
        } else {
            orderStatus = 'pending';
            transactionStatus = 'pending';
        }

        // Update order status — guard against a stale/reordered webhook downgrading an
        // order that's already been marked paid (e.g. 'pending' arriving after 'paid').
        let updateResult;
        try {
            updateResult = await query(
                `UPDATE orders SET status = $1, paid_at = $2, transaction_id = $3
                 WHERE order_id = $4 AND (status != 'paid' OR $1 = 'paid')
                 RETURNING status`,
                [orderStatus, orderStatus === 'paid' ? new Date().toISOString() : null, verifiedReference, order.order_id]
            );
        } catch (updateError) {
            console.error('Error updating order:', updateError);
            return NextResponse.json(
                { error: 'Failed to update order' },
                { status: 500 }
            );
        }

        if (updateResult.rows.length === 0) {
            console.log(`ℹ️ Order ${order.order_id} already paid — ignoring downgrade to ${orderStatus}`);
            return NextResponse.json({ success: true, message: 'Order already paid, ignoring stale update' });
        }

        // Create transaction record — ON CONFLICT DO NOTHING makes this idempotent for
        // PayOS webhook retries; only the request that actually inserts a row proceeds
        // to enrollment/email below.
        let transactionInserted = false;
        try {
            const transactionResult = await query(
                `INSERT INTO transactions (
                    id, order_id, transaction_id, amount, currency, status,
                    payment_method, bank_code, account_number, paid_at, webhook_data, created_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, 'VND', $4,
                    'BANK_TRANSFER', $5, $6, $7, $8, NOW()
                )
                ON CONFLICT (transaction_id) DO NOTHING
                RETURNING id`,
                [
                    order.order_id,
                    verifiedReference,
                    verifiedAmount,
                    transactionStatus,
                    verifiedAccountNumber,
                    verifiedAccountNumber,
                    orderStatus === 'paid' ? verifiedTransactionDateTime : null,
                    JSON.stringify(webhookData),
                ]
            );
            transactionInserted = transactionResult.rows.length > 0;
        } catch (transactionError) {
            console.error('Error creating transaction:', transactionError);
            // Don't return error, order is already updated
        }

        console.log(`✅ Order ${order.order_id} updated to ${orderStatus}`);

        if (!transactionInserted) {
            console.log('Webhook already processed:', verifiedReference);
            return NextResponse.json({ success: true, message: 'Already processed' });
        }

        // Auto-enroll user if payment successful
        if (orderStatus === 'paid') {
            await processSuccessfulPayment(order as unknown as Order);
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
