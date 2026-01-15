/**
 * Test Script for PayOS Webhook
 * 
 * Usage:
 * 1. Start dev server: npm run dev
 * 2. Run this script: node PayOS_doc/test-webhook.js
 * 
 * This simulates what PayOS sends to your webhook endpoint
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${BASE_URL}/api/payment/webhook`;

// Test 1: Test Webhook (what PayOS sends when configuring)
async function testConfigurationWebhook() {
    console.log('\n🧪 Test 1: Configuration Webhook');
    console.log('=====================================');

    const testWebhook = {
        code: '00',
        desc: 'Test webhook',
        success: true,
        data: {
            orderCode: 999999,
            amount: 1000,
            description: 'TEST_WEBHOOK',
            reference: 'TEST_REF_123',
            transactionDateTime: '2024-01-15 10:00:00',
            paymentLinkId: 'test_payment_link_id'
        },
        signature: 'test_signature'
    };

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-payos-signature': 'test_sig', // Will be validated
            },
            body: JSON.stringify(testWebhook),
        });

        const result = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));

        if (response.status === 200) {
            console.log('✅ Test webhook handled correctly!');
        } else {
            console.log('❌ Test webhook failed');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Test 2: Simulated Real Payment Webhook
async function testRealPaymentWebhook() {
    console.log('\n🧪 Test 2: Real Payment Webhook (Simulated)');
    console.log('=====================================');
    console.log('⚠️  Note: This will fail signature validation (expected)');
    console.log('   To test real webhooks, use PayOS sandbox or ngrok\n');

    const realWebhook = {
        code: '00',
        desc: 'success',
        success: true,
        data: {
            orderCode: 123, // Replace with real order code
            amount: 100000,
            description: 'Test Order',
            accountNumber: '12345678',
            reference: 'TXN_TEST_123',
            transactionDateTime: '2024-01-15 12:00:00',
            currency: 'VND',
            paymentLinkId: 'payment_link_123',
            code: '00',
            desc: 'Thành công',
            counterAccountBankId: '',
            counterAccountBankName: '',
            counterAccountName: '',
            counterAccountNumber: '',
        },
        signature: 'fake_signature_for_testing'
    };

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-payos-signature': 'fake_signature',
            },
            body: JSON.stringify(realWebhook),
        });

        const result = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));

        if (response.status === 401) {
            console.log('✅ Signature validation working (401 Unauthorized expected)');
        } else {
            console.log('⚠️  Unexpected status code');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('🚀 PayOS Webhook Test Suite');
    console.log('============================');
    console.log(`Webhook URL: ${WEBHOOK_URL}\n`);

    await testConfigurationWebhook();
    await testRealPaymentWebhook();

    console.log('\n✨ Tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. For local testing: Use ngrok (ngrok http 3000)');
    console.log('2. Update .env.local with ngrok URL');
    console.log('3. Run: node PayOS_doc/setup-webhook.js');
    console.log('4. Test real checkout flow');
}

runTests().catch(console.error);
