import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Find order by orderCode prefix
 * Used by payment callback page to check if payment is complete
 * 
 * POST /api/payment/status/find
 * Body: { orderCodePrefix: "DH1768655550" }
 * 
 * Returns: { success, found, paid, orderId, status, ... }
 */
export async function POST(request: NextRequest) {
    try {
        const { orderCodePrefix } = await request.json();

        if (!orderCodePrefix) {
            return NextResponse.json(
                { success: false, error: 'Missing orderCodePrefix' },
                { status: 400 }
            );
        }

        console.log(`🔍 Finding order with prefix: ${orderCodePrefix}`);

        // Find order using LIKE pattern
        // Example: orderCodePrefix = "DH1768655550"
        //          matches order_id = "DH1768655550621557OQONTU22G"
        let orders;
        try {
            const result = await query('SELECT * FROM orders WHERE order_id LIKE $1 LIMIT 1', [`${orderCodePrefix}%`]);
            orders = result.rows;
        } catch (error) {
            console.error('❌ Database error:', error);
            return NextResponse.json(
                { success: false, error: error instanceof Error ? error.message : String(error) },
                { status: 500 }
            );
        }

        if (!orders || orders.length === 0) {
            console.log('⚠️ Order not found');
            return NextResponse.json({
                success: true,
                found: false,
                paid: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];
        const isPaid = order.status === 'paid';

        console.log(`✅ Found order: ${order.order_id}, status: ${order.status}, paid: ${isPaid}`);

        return NextResponse.json({
            success: true,
            found: true,
            paid: isPaid,
            orderId: order.order_id,
            status: order.status,
            totalAmount: order.total_amount,
            customerEmail: order.customer_email,
            paidAt: order.paid_at,
        });

    } catch (error) {
        console.error('❌ Find order error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            },
            { status: 500 }
        );
    }
}
