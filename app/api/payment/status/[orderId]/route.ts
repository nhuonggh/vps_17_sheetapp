import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/payment/status/[orderId]
 * Check payment status for an order
 * Used by client to poll payment status after checkout
 */
export async function GET(
    request: NextRequest,
    segmentData: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await segmentData.params;

        if (!orderId) {
            return NextResponse.json(
                { error: 'Order ID is required' },
                { status: 400 }
            );
        }

        // Fetch order from database
        const result = await query(
            'SELECT order_id, status, total_amount, paid_at, transaction_id, payment_expires_at FROM orders WHERE order_id = $1 LIMIT 1',
            [orderId]
        );
        const order = result.rows[0];

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404 }
            );
        }

        // Check if payment expired
        const isExpired = order.payment_expires_at &&
            new Date(order.payment_expires_at) < new Date();

        const status = isExpired && order.status === 'pending'
            ? 'expired'
            : order.status;

        return NextResponse.json({
            orderId: order.order_id,
            status,
            totalAmount: order.total_amount,
            paidAt: order.paid_at,
            transactionId: order.transaction_id,
            expiresAt: order.payment_expires_at,
        });

    } catch (error) {
        console.error('Payment status check error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
