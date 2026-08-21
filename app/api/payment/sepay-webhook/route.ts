import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifySepayWebhookSignature, type SepayWebhookPayload } from '@/lib/sepay';
import { processSuccessfulPayment, type Order } from '@/lib/auto-enrollment';

/**
 * POST /api/payment/sepay-webhook
 * SePay Webhook + VietQR (Luồng A) — https://developer.sepay.vn.
 *
 * SePay only counts a delivery successful on HTTP 200/201 + exact body {"success": true}
 * within 30s, otherwise it retries (Fibonacci backoff, up to 7 times over ~33 minutes) —
 * so every branch below returns that shape even when we're intentionally ignoring the
 * transaction (wrong signature aside, which must fail loudly with 401).
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();

    const { valid, reason } = verifySepayWebhookSignature(
        rawBody,
        request.headers.get('x-sepay-signature'),
        request.headers.get('x-sepay-timestamp')
    );
    if (!valid) {
        console.error('[sepay-webhook] signature rejected:', reason);
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    let payload: SepayWebhookPayload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    if (!payload || typeof payload.id === 'undefined') {
        return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    // Only money in triggers payment confirmation — ignore money out, but still ack so
    // SePay doesn't treat it as a delivery failure and retry.
    if (payload.transferType !== 'in') {
        return NextResponse.json({ success: true });
    }

    try {
        // Prefer SePay's own extracted `code` (configured at my.sepay.vn); fall back to a
        // substring search on the raw transfer content for orders created before that
        // dashboard config existed, or if it's off.
        const candidateCode = payload.code || null;
        const ordersResult = candidateCode
            ? await query('SELECT * FROM orders WHERE sepay_payment_code = $1 LIMIT 1', [candidateCode])
            : { rows: [] as any[] };

        let order = ordersResult.rows[0];
        if (!order && payload.content) {
            const contentMatch = await query(
                `SELECT * FROM orders
                 WHERE sepay_payment_code IS NOT NULL AND status = 'pending' AND $1 ILIKE '%' || sepay_payment_code || '%'
                 ORDER BY created_at DESC LIMIT 1`,
                [payload.content]
            );
            order = contentMatch.rows[0];
        }

        if (!order) {
            // Not one of ours (or already resolved) — ack so SePay stops retrying.
            console.log('[sepay-webhook] no matching order for transaction', payload.id);
            return NextResponse.json({ success: true });
        }

        // Accept transferAmount >= order total rather than an exact match — VND has no
        // decimals so this only matters for accidental over-payment, and exact-equality
        // amount checks are exactly the bug class that broke the PayOS webhook (numeric
        // column returned as string by `pg`, see audit/04_payment_payos.md #4).
        if (Number(payload.transferAmount) < Number(order.total_amount)) {
            console.error(
                `[sepay-webhook] underpaid: order ${order.order_id} expects ${order.total_amount}, got ${payload.transferAmount}`
            );
            return NextResponse.json({ success: true });
        }

        // Atomic status update with a downgrade guard (mirrors the PayOS webhook) — only
        // the request that actually flips pending->paid proceeds to enrollment/email.
        const updateResult = await query(
            `UPDATE orders SET status = 'paid', paid_at = NOW(), transaction_id = $1
             WHERE order_id = $2 AND status != 'paid'
             RETURNING *`,
            [String(payload.id), order.order_id]
        );

        if (updateResult.rows.length === 0) {
            return NextResponse.json({ success: true, message: 'Order already paid' });
        }
        order = updateResult.rows[0];

        // Idempotency: transactions.transaction_id is UNIQUE — ON CONFLICT DO NOTHING means
        // a SePay retry/manual "Phát lại" of the same transaction id never double-enrolls.
        const transactionResult = await query(
            `INSERT INTO transactions (
                id, order_id, transaction_id, amount, currency, status,
                payment_method, bank_code, account_number, paid_at, webhook_data, created_at
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, 'VND', 'success',
                'SEPAY', $4, $5, NOW(), $6, NOW()
            )
            ON CONFLICT (transaction_id) DO NOTHING
            RETURNING id`,
            [
                order.order_id,
                `SEPAY-${payload.id}`,
                payload.transferAmount,
                payload.gateway,
                payload.accountNumber,
                JSON.stringify(payload),
            ]
        );

        if (transactionResult.rows.length > 0) {
            await processSuccessfulPayment(order as unknown as Order);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[sepay-webhook] internal error:', error);
        // 500 is fine here — it tells SePay to retry, which is the safe default for an
        // unexpected error (as opposed to swallowing it and silently losing the payment).
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
    }
}
