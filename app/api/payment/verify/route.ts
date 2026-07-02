import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getPaymentInfo } from '@/lib/payos';

export async function POST(request: NextRequest) {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json(
                { success: false, error: 'Missing orderId' },
                { status: 400 }
            );
        }

        // 1. Get order from database
        const orderResult = await query('SELECT * FROM orders WHERE order_id = $1 LIMIT 1', [orderId]);
        const order = orderResult.rows[0];

        if (!order) {
            return NextResponse.json(
                { success: false, error: 'Order not found' },
                { status: 404 }
            );
        }

        // 2. If already paid, return success immediately
        if (order.status === 'paid') {
            return NextResponse.json({
                success: true,
                paid: true,
                message: 'Order already paid',
            });
        }

        // 3. Check if payment link exists
        if (!order.payment_link_id) {
            return NextResponse.json(
                { success: false, error: 'No payment link found' },
                { status: 400 }
            );
        }

        // 4. Query PayOS for payment status
        try {
            const paymentInfo = await getPaymentInfo(order.payment_link_id);

            // 5. Check if payment query was successful
            if (!paymentInfo.success || !paymentInfo.data) {
                // PayOS query failed or no data
                return NextResponse.json({
                    success: true,
                    paid: false,
                    message: 'Payment not yet detected. Please wait a moment.',
                });
            }

            // 6. Check if payment is completed
            if (paymentInfo.data.status === 'PAID') {
                // Update order to paid
                try {
                    await query(
                        `UPDATE orders SET status = 'paid', paid_at = $1, transaction_id = $2 WHERE order_id = $3`,
                        [new Date().toISOString(), paymentInfo.data.id || paymentInfo.data.transactionId, orderId]
                    );
                } catch (updateError) {
                    console.error('Error updating order:', updateError);
                }

                // Create transaction record
                await query(
                    `INSERT INTO transactions (
                        id, order_id, transaction_id, payment_link_id, amount, status, paid_at, webhook_data, created_at
                    ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'success', $5, $6, NOW())`,
                    [
                        orderId,
                        paymentInfo.data.id || paymentInfo.data.transactionId || `TXN-${Date.now()}`,
                        order.payment_link_id,
                        order.total_amount,
                        new Date().toISOString(),
                        JSON.stringify(paymentInfo.data),
                    ]
                );

                return NextResponse.json({
                    success: true,
                    paid: true,
                    message: 'Payment verified successfully',
                    transactionId: paymentInfo.data.id || paymentInfo.data.transactionId,
                });
            } else {
                // Payment not yet completed
                return NextResponse.json({
                    success: true,
                    paid: false,
                    message: 'Payment not yet received',
                    status: paymentInfo.data.status || 'PENDING',
                });
            }
        } catch (payosError: any) {
            console.error('PayOS query error:', payosError);

            // If PayOS returns 404, payment not found yet
            return NextResponse.json({
                success: true,
                paid: false,
                message: 'Payment not yet detected. Please wait a moment.',
            });
        }
    } catch (error) {
        console.error('Verify payment error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}
