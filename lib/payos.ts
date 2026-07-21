/**
 * PayOS Payment Gateway Integration
 * Documentation: https://payos.vn/docs
 *
 * @payos/node v2 exposes a PayOS class (object constructor options), not the
 * positional-args v1 API. Resources live under payOS.webhooks / payOS.paymentRequests.
 */

import { PayOS } from '@payos/node';

let payOSInstance: PayOS | null = null;

function getPayOS(): PayOS {
    if (!payOSInstance) {
        payOSInstance = new PayOS({
            clientId: process.env.PAYOS_CLIENT_ID || '',
            apiKey: process.env.PAYOS_API_KEY || '',
            checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
        });
    }
    return payOSInstance;
}

/**
 * Create a payment link for an order
 * @param orderData Order information to create payment for
 * @returns Payment link object
 */
export async function createPaymentLink(orderData: {
    orderId: string;
    amount: number;
    description: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
}) {
    try {
        const domain = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const payOS = getPayOS();

        // PayOS payment link creation
        // PayOS requirements:
        // - orderCode: unique integer (timestamp-based để avoid collision)
        // - description: max 9 chars for non-linked accounts
        const orderCodeInt = Math.floor(Date.now() / 1000); // Unix timestamp as unique int

        const paymentLinkResponse = await payOS.paymentRequests.create({
            orderCode: orderCodeInt,
            amount: orderData.amount,
            description: orderData.description.substring(0, 9), // Max 9 chars per PayOS spec
            items: orderData.items,
            returnUrl: `${domain}/payment/callback?orderCode=${orderData.orderId}`,
            cancelUrl: `${domain}/payment/callback?cancelled=true&orderCode=${orderData.orderId}`,
            buyerName: orderData.buyerName,
            buyerEmail: orderData.buyerEmail,
            buyerPhone: orderData.buyerPhone,
            expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes expiration
        });

        return {
            success: true,
            data: {
                paymentLinkId: paymentLinkResponse.paymentLinkId,
                checkoutUrl: paymentLinkResponse.checkoutUrl,
                qrCode: paymentLinkResponse.qrCode,
                orderCode: orderData.orderId,
            },
        };
    } catch (error: any) {
        console.error('PayOS createPaymentLink error:', error);
        return {
            success: false,
            error: error.message || 'Failed to create payment link',
        };
    }
}

/**
 * Verify webhook payload from PayOS (signature lives inside the body, not a header).
 * @param webhookData Full parsed webhook body: { code, desc, data, signature }
 * @returns Verified `data` on success; `valid:false` if signature/data invalid
 */
export async function verifyWebhookSignature(
    webhookData: any
): Promise<{ valid: boolean; data?: any }> {
    try {
        const payOS = getPayOS();
        const data = await payOS.webhooks.verify(webhookData);
        return { valid: true, data };
    } catch (error) {
        console.error('PayOS webhook verification error:', error);
        return { valid: false };
    }
}

/**
 * Get payment information from PayOS
 * @param id Payment link ID or order code to check
 * @returns Payment info
 */
export async function getPaymentInfo(id: string | number) {
    try {
        const payOS = getPayOS();
        // Narrow to one overload at a time — a bare `string | number` union doesn't
        // match either `get(paymentLinkId: string)` / `get(orderCode: number)` signature.
        const paymentInfo = typeof id === 'number'
            ? await payOS.paymentRequests.get(id)
            : await payOS.paymentRequests.get(id);
        return {
            success: true,
            data: paymentInfo,
        };
    } catch (error: any) {
        console.error('PayOS getPaymentInfo error:', error);
        return {
            success: false,
            error: error.message || 'Failed to get payment info',
        };
    }
}

/**
 * Cancel a payment link
 * @param id Payment link ID or order code to cancel
 * @returns Cancel result
 */
export async function cancelPaymentLink(id: string | number, cancellationReason?: string) {
    try {
        const payOS = getPayOS();
        const cancelResult = typeof id === 'number'
            ? await payOS.paymentRequests.cancel(id, cancellationReason)
            : await payOS.paymentRequests.cancel(id, cancellationReason);
        return {
            success: true,
            data: cancelResult,
        };
    } catch (error: any) {
        console.error('PayOS cancelPaymentLink error:', error);
        return {
            success: false,
            error: error.message || 'Failed to cancel payment link',
        };
    }
}

/**
 * Check if PayOS is configured properly
 */
export function isPayOSConfigured(): boolean {
    return !!(
        process.env.PAYOS_CLIENT_ID &&
        process.env.PAYOS_API_KEY &&
        process.env.PAYOS_CHECKSUM_KEY
    );
}
