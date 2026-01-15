/**
 * PayOS Payment Gateway Integration
 * Documentation: https://payos.vn/docs
 * 
 * Using dynamic import to avoid Next.js 15 build issues with constructor
 */

// PayOS instance cache
let payOSInstance: any = null;

async function getPayOS() {
    if (!payOSInstance) {
        // Dynamic import to avoid build-time constructor issues
        const PayOSModule = await import('@payos/node');
        const PayOSClient = PayOSModule.default || PayOSModule;

        payOSInstance = new (PayOSClient as any)(
            process.env.PAYOS_CLIENT_ID || '',
            process.env.PAYOS_API_KEY || '',
            process.env.PAYOS_CHECKSUM_KEY || ''
        );
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
        const payOS = await getPayOS();

        // PayOS payment link creation
        // PayOS requirements:
        // - orderCode: unique integer (timestamp-based để avoid collision)
        // - description: max 9 chars for non-linked accounts
        const orderCodeInt = Math.floor(Date.now() / 1000); // Unix timestamp as unique int

        const paymentLinkResponse = await payOS.createPaymentLink({
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
 * Verify webhook signature from PayOS
 * @param webhookData Webhook data from PayOS
 * @param signature Signature header from webhook request
 * @returns Whether the webhook is valid
 */
export async function verifyWebhookSignature(
    webhookData: any,
    signature: string
): Promise<boolean> {
    try {
        const payOS = await getPayOS();
        const isValid = payOS.verifyPaymentWebhookData(webhookData);
        return isValid;
    } catch (error) {
        console.error('PayOS webhook verification error:', error);
        return false;
    }
}

/**
 * Get payment information from PayOS
 * @param orderCode Order code to check
 * @returns Payment info
 */
export async function getPaymentInfo(orderCode: number) {
    try {
        const payOS = await getPayOS();
        const paymentInfo = await payOS.getPaymentLinkInformation(orderCode);
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
 * @param orderCode Order code to cancel
 * @returns Cancel result
 */
export async function cancelPaymentLink(orderCode: number) {
    try {
        const payOS = await getPayOS();
        const cancelResult = await payOS.cancelPaymentLink(orderCode);
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
