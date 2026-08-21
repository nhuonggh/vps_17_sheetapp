# 🔧 Fix Vercel Build Error - Missing Supabase Credentials

## ❌ Error
```
Missing or invalid: SUPABASE_URL
Missing or invalid: SUPABASE_SERVICE_KEY
```

## ✅ Solution: Add Environment Variables to Vercel

### Bước 1: Get Supabase Credentials

1. Vào **Supabase Dashboard**
2. Select your project
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Key** (secret) → `SUPABASE_SERVICE_KEY`

---

### Bước 2: Add to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to **Vercel Dashboard**
2. Select your project: **SheetAppV2**
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` (secret key) | Production, Preview, Development |

5. **Important**: Check **all 3 environments**:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

6. Click **Save**

---

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Add environment variables
vercel env add SUPABASE_URL
# Paste your Supabase URL when prompted

vercel env add SUPABASE_SERVICE_KEY
# Paste your Service Role Key when prompted
```

---

### Bước 3: Redeploy

After adding environment variables:

#### Via Dashboard:
1. Go to **Deployments**
2. Click **...** on latest deployment
3. Click **Redeploy**
4. Select **Use existing Build Cache** (faster)

#### Via CLI:
```bash
vercel --prod
```

#### Via Git Push:
```bash
git commit --allow-empty -m "trigger rebuild"
git push origin main
```

---

## 📋 Complete Environment Variables Checklist

Required for production:

### Supabase (REQUIRED)
- [x] `SUPABASE_URL`
- [x] `SUPABASE_SERVICE_KEY`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (if using client-side Supabase)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (if using client-side Supabase)

### PayOS (REQUIRED for payments)
- [ ] `PAYOS_CLIENT_ID`
- [ ] `PAYOS_API_KEY`
- [ ] `PAYOS_CHECKSUM_KEY`
- [ ] `NEXT_PUBLIC_BASE_URL` (your Vercel URL)

### Email (OPTIONAL)
- [ ] `RESEND_API_KEY` (if enabling email notifications)

---

## 🔍 Verify Environment Variables

After adding, check they're set correctly:

```bash
# Via Vercel CLI
vercel env ls

# Should show:
# SUPABASE_URL (Production, Preview, Development)
# SUPABASE_SERVICE_KEY (Production, Preview, Development)
```

---

## 🚀 After Fix

Once environment variables are added:

1. ✅ Build will succeed
2. ✅ Deployment completes
3. ✅ App live at: `https://your-app.vercel.app`
4. ✅ PayOS webhook can be configured

---

## ⚠️ Security Notes

- ❌ **NEVER** commit `.env.local` to Git
- ✅ Use Vercel environment variables
- ✅ Service Role Key is secret - keep it safe
- ✅ Rotate keys if accidentally exposed

---

## 📝 Quick Copy-Paste (for Vercel Dashboard)

```
Variable 1:
Name: SUPABASE_URL
Value: https://your-project.supabase.co
Environments: ✅ Production ✅ Preview ✅ Development

Variable 2:
Name: SUPABASE_SERVICE_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3...
Environments: ✅ Production ✅ Preview ✅ Development
```

Replace with your actual values from Supabase Dashboard → Settings → API

---

**Next**: After adding env vars → Redeploy → Success! 🎉
