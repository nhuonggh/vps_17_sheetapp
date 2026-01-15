/**
 * Script để simulate payment webhook từ PayOS
 * Dùng để test luồng thanh toán mà KHÔNG cần thực sự chuyển khoản
 * 
 * Usage: node PayOS_doc/simulate-payment.js [ORDER_CODE]
 */

const ORDER_CODE_FROM_ARG = process.argv[2]; // Lấy từ command line argument

async function simulatePaymentWebhook(orderCode) {
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const webhookUrl = `${BASE_URL}/api/payment/webhook`;

    // Simulate webhook data từ PayOS sau khi payment thành công
    const webhookData = {
        "code": "00",
        "desc": "success",
        "success": true,
        "data": {
            "orderCode": parseInt(orderCode) || 123456789, // Convert to number
            "amount": 5000000, // 5 triệu (adjust theo actual order)
            "description": `Thanh toan don hang ${orderCode}`,
            "accountNumber": "0987726236",
            "reference": `TXN_SIMULATED_${Date.now()}`, // Unique transaction ID
            "transactionDateTime": new Date().toISOString().replace('T', ' ').substring(0, 19),
            "currency": "VND",
            "paymentLinkId": "simulated_payment_link",
            "code": "00",
            "desc": "Thành công",
            "counterAccountBankId": "970422",
            "counterAccountBankName": "MB Bank",
            "counterAccountName": "NGUYEN VAN TEST",
            "counterAccountNumber": "0123456789",
            "virtualAccountName": "",
            "virtualAccountNumber": ""
        },
        "signature": "simulated_signature_will_fail_verification"
    };

    console.log('🚀 Simulating Payment Webhook');
    console.log('='.repeat(50));
    console.log(`Webhook URL: ${webhookUrl}`);
    console.log(`Order Code: ${webhookData.data.orderCode}`);
    console.log(`Amount: ${webhookData.data.amount.toLocaleString()} VND`);
    console.log(`Reference: ${webhookData.data.reference}`);
    console.log('');

    console.log('⚠️  NOTE: Signature verification sẽ FAIL vì đây là simulated data');
    console.log('   → Nếu muốn test FULL flow, cần disable signature check tạm thời');
    console.log('');

    try {
        console.log('📡 Sending webhook request...');

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-payos-signature': webhookData.signature,
            },
            body: JSON.stringify(webhookData)
        });

        const result = await response.json();

        console.log('');
        console.log('📥 Response from webhook:');
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('Body:', JSON.stringify(result, null, 2));
        console.log('');

        if (response.status === 401) {
            console.log('❌ Expected: Signature verification failed (simulated data)');
            console.log('');
            console.log('💡 To test FULL flow with simulated payment:');
            console.log('   Option 1: Temporarily comment out signature verification');
            console.log('   Option 2: Use real PayOS payment (ngrok + sandbox)');
            console.log('   Option 3: Add test mode flag to skip signature for simulation');
        } else if (response.status === 200) {
            console.log('✅ Webhook processed successfully!');
            console.log('');
            console.log('🎉 Check database:');
            console.log('   - Order status should be "paid"');
            console.log('   - Transaction record created');
            console.log('   - Auto-enrollment triggered');
        } else {
            console.log(`⚠️ Unexpected status: ${response.status}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('');
        console.log('💡 Troubleshooting:');
        console.log('   1. Check dev server running: npm run dev');
        console.log('   2. Check webhook URL correct');
        console.log('   3. Check network connection');
    }
}

// Load env
require('dotenv').config({ path: '.env.local' });

// Get order code from screenshot or command line
const ORDER_CODE = ORDER_CODE_FROM_ARG || '1768462088498867'; // From screenshot: DH1768462088498867A8T28IME

console.log('');
console.log('╔══════════════════════════════════════════════════╗');
console.log('║   PayOS Payment Simulation Script               ║');
console.log('╚══════════════════════════════════════════════════╝');
console.log('');

if (!ORDER_CODE_FROM_ARG) {
    console.log('💡 Usage: node PayOS_doc/simulate-payment.js [ORDER_CODE]');
    console.log(`   Using default: ${ORDER_CODE}`);
    console.log('');
}

// Run simulation
simulatePaymentWebhook(ORDER_CODE);
