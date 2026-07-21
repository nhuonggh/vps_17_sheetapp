import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth/get-current-user';
import { query } from '@/lib/db';

interface OrderRow {
    id: string;
    order_id: string;
    created_at: string;
    total_amount: string;
    status: string;
}

interface OrderItemRow {
    order_id: string;
    product_name: string;
    quantity: number;
    price_at_purchase: string;
}

/**
 * GET /api/profile/orders
 * Paid order history for the current user — replaces MOCK_ORDERS previously
 * hardcoded on the desktop profile page (mobile just showed static empty text).
 */
export async function GET() {
    try {
        const user = await requireAuth();

        const ordersResult = await query<OrderRow>(
            `SELECT id, order_id, created_at, total_amount, status
             FROM orders
             WHERE user_id = $1 AND status = 'paid'
             ORDER BY created_at DESC`,
            [user.id]
        );

        const orders = ordersResult.rows;
        if (orders.length === 0) {
            return NextResponse.json({ orders: [] });
        }

        const itemsResult = await query<OrderItemRow>(
            `SELECT oi.order_id, p.name AS product_name, oi.quantity, oi.price_at_purchase
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ANY($1)`,
            [orders.map((o) => o.id)]
        );

        const itemsByOrder = new Map<string, OrderItemRow[]>();
        for (const item of itemsResult.rows) {
            const list = itemsByOrder.get(item.order_id) ?? [];
            list.push(item);
            itemsByOrder.set(item.order_id, list);
        }

        return NextResponse.json({
            orders: orders.map((o) => ({
                order_id: o.order_id,
                created_at: o.created_at,
                total_amount: Number(o.total_amount),
                status: o.status,
                items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
                    product_name: i.product_name,
                    quantity: i.quantity,
                    price: Number(i.price_at_purchase),
                })),
            })),
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
        console.error('Error fetching orders:', error);
        return NextResponse.json({ error: 'internal_error' }, { status: 500 });
    }
}
