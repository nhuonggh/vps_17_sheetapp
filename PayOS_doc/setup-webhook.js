/**
 * Script để config webhook URL cho PayOS
 * Chạy: node PayOS_doc/setup-webhook.js
 */

const PAYOS_API_BASE = 'https://api-merchant.payos.vn';

async function setupWebhook() {
    // Load environment variables
    const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID;
    const PAYOS_API_KEY = process.env.PAYOS_API_KEY;
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Validate credentials
    if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY) {
        console.error('❌ ERROR: PayOS credentials not found in environment variables');
        console.log('\nPlease set:');
        console.log('  PAYOS_CLIENT_ID');
        console.log('  PAYOS_API_KEY');
        process.exit(1);
    }

    const webhookUrl = `${BASE_URL}/api/payment/webhook`;

    console.log('🔧 PayOS Webhook Setup');
    console.log('='.repeat(50));
    console.log(`Webhook URL: ${webhookUrl}`);
    console.log('');

    // Warning for localhost
    if (BASE_URL.includes('localhost')) {
        console.log('⚠️  WARNING: Using localhost URL');
        console.log('   PayOS cannot send webhooks to localhost.');
        console.log('   Use ngrok for local testing:');
        console.log('   1. Run: ngrok http 3000');
        console.log('   2. Update NEXT_PUBLIC_BASE_URL with ngrok URL');
        console.log('   3. Run this script again');
        console.log('');
    }

    try {
        console.log('📡 Sending request to PayOS...');

        const response = await fetch(`${PAYOS_API_BASE}/confirm-webhook`, {
            method: 'POST',
            headers: {
                'x-client-id': PAYOS_CLIENT_ID,
                'x-api-key': PAYOS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                webhookUrl: webhookUrl
            })
        });

        const data = await response.json();

        if (response.ok && data.code === '00') {
            console.log('✅ Webhook configured successfully!');
            console.log('');
            console.log('Details:');
            console.log(`  Webhook URL: ${data.data.webhookUrl}`);
            console.log(`  Account: ${data.data.accountName}`);
            console.log(`  Account Number: ${data.data.accountNumber}`);
            console.log(`  Channel Name: ${data.data.name}`);
            console.log('');
            console.log('🎉 You can now receive payment webhooks!');
        } else {
            console.error('❌ Failed to configure webhook');
            console.error('Response:', data);

            if (response.status === 400) {
                console.log('\n💡 Tip: Make sure webhook URL is:');
                console.log('   - Valid HTTPS URL (in production)');
                console.log('   - Accessible from internet');
                console.log('   - Returns 2XX status code when called');
            } else if (response.status === 401) {
                console.log('\n💡 Tip: Check your PayOS credentials');
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Check internet connection');
        console.log('   2. Verify PayOS credentials');
        console.log('   3. Test webhook endpoint manually');
    }
}

// Load env from .env.local
require('dotenv').config({ path: '.env.local' });

// Run setup
setupWebhook();
