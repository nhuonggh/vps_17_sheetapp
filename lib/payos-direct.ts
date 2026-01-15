/**
 * Direct PayOS API Implementation - بypass SDK
 * 
 * SDK createPaymentLink failing silently → implement raw API per PayOS spec
 */

import crypto from 'crypto';

interface PaymentLinkData {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    expiredAt?: number;
}

export async function createPaymentLinkDirect(data: PaymentLinkData) {
    const clientId = process.env.PAYOS_CLIENT_ID!;
    const apiKey = process.env.PAYOS_API_KEY!;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY!;

    console.log('🔧 Direct PayOS API call initiated');
    console.log('Request data:', { orderCode: data.orderCode, amount: data.amount, description: data.description });

    // Generate signature per PayOS spec
    // Format: amount=$amount&cancelUrl=$cancelUrl&description=$description&orderCode=$orderCode&returnUrl=$returnUrl
    const sortedData = `amount=${data.amount}&cancelUrl=${encodeURIComponent(data.cancelUrl)}&description=${encodeURIComponent(data.description)}&orderCode=${data.orderCode}&returnUrl=${encodeURIComponent(data.returnUrl)}`;

    console.log('📝 Signature data string:', sortedData);

    const signature = crypto
        .createHmac('sha256', checksumKey)
        .update(sortedData)
        .digest('hex');

    console.log('🔐 Generated signature:', signature);

    const requestBody = {
        orderCode: data.orderCode,
        amount: data.amount,
        description: data.description,
        items: data.items,
        returnUrl: data.returnUrl,
        cancelUrl: data.cancelUrl,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone: data.buyerPhone,
        expiredAt: data.expiredAt,
        signature,
    };

    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': clientId,
                'x-api-key': apiKey,
            },
            body: JSON.stringify(requestBody),
        });

        console.log('📥 PayOS Response Status:', response.status);

        const result = await response.json();

        console.log('📥 PayOS Response Body:', JSON.stringify(result, null, 2));

        if (result.code === '00') {
            console.log('✅ PayOS payment link created successfully!');
            return {
                success: true,
                data: {
                    paymentLinkId: result.data.paymentLinkId,
                    checkoutUrl: result.data.checkoutUrl,
                    qrCode: result.data.qrCode,
                },
            };
        } else {
            console.error('❌ PayOS API returned error code:', result.code);
            console.error('Error description:', result.desc);
            throw new Error(`PayOS Error [${result.code}]: ${result.desc}`);
        }
    } catch (error: any) {
        console.error('❌ PayOS API call failed');
        console.error('Error type:', error.constructor?.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return {
            success: false,
            error: error.message || 'Failed to create payment link',
        };
    }
}
