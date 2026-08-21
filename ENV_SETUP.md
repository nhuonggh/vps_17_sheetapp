# Environment Variables Setup Guide for SheetApp

## Required Environment Variables

Copy the following to your `.env.local` file:

```bash
# ==========================================
# DATABASE (self-hosted Postgres — no Supabase)
# ==========================================

DATABASE_URL=postgresql://sheetapp_user:your_db_password@localhost:5432/sheetapp_db

# ==========================================
# AUTH (custom Google OAuth2 + self-issued JWT)
# ==========================================

# Get from: https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
# GOOGLE_CLIENT_SECRET is unused by the current Google Identity Services sign-in flow —
# only needed if a server-side OAuth exchange is added later.

# Random 256-bit secret for signing session JWTs — e.g. `openssl rand -base64 32`
JWT_SECRET=your_random_256_bit_secret_here

# ==========================================
# UPSTASH REDIS (Rate Limiting)
# ==========================================

# Get from: https://upstash.com → Create database → Copy REST API credentials
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here

# ==========================================
# GOOGLE reCAPTCHA v3 (Bot Protection)
# ==========================================

# Get from: https://www.google.com/recaptcha/admin → Register site
# Public Site Key - Safe to expose
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here

# Secret Key - Server-only, NEVER expose!
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here

# ==========================================
# PAYOS PAYMENT GATEWAY
# ==========================================

# Get from: https://my.payos.vn → Settings → API Keys
# Server-only keys - NEVER expose to browser!
PAYOS_CLIENT_ID=your_payos_client_id_here
PAYOS_API_KEY=your_payos_api_key_here
PAYOS_CHECKSUM_KEY=your_payos_checksum_key_here

# ==========================================
# SEPAY PAYMENT CHANNEL (Webhook + VietQR)
# ==========================================

# Which gateway is live — ops decides, not the customer. "payos" (default) or "sepay".
PAYMENT_PROVIDER=payos

# Bank account linked to SePay at my.sepay.vn -> Tài khoản ngân hàng.
# SEPAY_BANK_NAME must match a bank short_name/alias/code from https://vietqr.app/banks.json (e.g. MBBank, Vietcombank).
SEPAY_BANK_NAME=your_bank_short_name_here
SEPAY_ACCOUNT_NUMBER=your_bank_account_number_here
SEPAY_ACCOUNT_HOLDER=YOUR_ACCOUNT_HOLDER_NAME_NO_DIACRITICS

# Prefix for the payment code embedded in the QR transfer content (e.g. "DH" -> "DH1755000000").
# Must match the prefix configured at my.sepay.vn -> Cấu hình Công ty -> Cấu trúc mã thanh toán.
SEPAY_PAYMENT_CODE_PREFIX=DH

# HMAC-SHA256 secret from my.sepay.vn -> Webhooks -> (webhook) -> Bảo mật -> HMAC-SHA256.
# Webhook URL to register there: https://<your-domain>/api/payment/sepay-webhook
SEPAY_WEBHOOK_SECRET=your_sepay_webhook_hmac_secret_here

# ==========================================
# APPLICATION SETTINGS
# ==========================================

# Production URL
NEXT_PUBLIC_APP_URL=https://sheetapp.io.vn
NEXT_PUBLIC_BASE_URL=https://sheetapp.io.vn

# Node environment
NODE_ENV=production
```

## Setup Instructions

### 1. Upstash Redis Setup
1. Go to https://upstash.com
2. Create a free account
3. Create a new Redis database
4. Copy the REST API URL and Token
5. Paste into `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 2. Google reCAPTCHA Setup
1. Go to https://www.google.com/recaptcha/admin
2. Register a new site
3. Choose reCAPTCHA v3
4. Add your domain (localhost for development)
5. Copy Site Key → `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
6. Copy Secret Key → `RECAPTCHA_SECRET_KEY`

### 3. Google OAuth Setup
1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add your domain(s) to Authorized JavaScript origins
4. Copy Client ID → `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## Security Notes

1. **NEVER** commit `.env` to git
2. Variables with `NEXT_PUBLIC_` prefix are exposed to browser
3. Server-only variables (no prefix) stay secure on server
4. Deployment is self-hosted (Docker + Caddy on the project's own VPS, GitHub Actions
   CI/CD) — not Vercel. Set variables as GitHub Actions secrets / server-side `.env`, not
   in a Vercel project.
