// PayOS Configuration Checker
// Run: node check-payos-config.js

console.log('=== PayOS Configuration Check ===\n');

// Check environment variables
const requiredVars = [
    'PAYOS_CLIENT_ID',
    'PAYOS_API_KEY',
    'PAYOS_CHECKSUM_KEY',
    'NEXT_PUBLIC_BASE_URL'
];

let allConfigured = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== 'your_' && value.length > 10) {
        console.log(`✅ ${varName}: Configured (${value.substring(0, 10)}...)`);
    } else {
        console.log(`❌ ${varName}: NOT configured or placeholder`);
        allConfigured = false;
    }
});

console.log('\n=== Result ===');
if (allConfigured) {
    console.log('✅ All PayOS credentials are configured!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run database migration in Supabase');
    console.log('2. Install ngrok: choco install ngrok');
    console.log('3. Start testing: npm run dev');
} else {
    console.log('❌ Missing PayOS credentials');
    console.log('\n📝 To fix:');
    console.log('1. Go to https://my.payos.vn → Settings → API Keys');
    console.log('2. Copy credentials to .env.local');
    console.log('3. Restart dev server');
}
