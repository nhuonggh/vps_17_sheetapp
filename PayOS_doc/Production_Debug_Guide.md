# 🔍 Production Checkout Debug Guide

## Vấn đề Hiện Tại

**Triệu chứng:**
- ✅ Localhost: Hoạt động OK
- ❌ Production: "Lỗi kết nối"
- ❌ Console: 405 Method Not Allowed

## Nguyên Nhân Có Thể

### 1. Environment Variables Thiếu trên Vercel ⚠️

**Check ngay trong Vercel Dashboard:**

1. Go to: https://vercel.com/nhuongvts-projects/sheetapp-v2/settings/environment-variables

2. **Kiểm tra có ĐẦY ĐỦ các biến này không:**

```env
# Supabase (CRITICAL!)
NEXT_PUBLIC_SUPABASE_URL=https://rvizpcbmnhufyxbpahfa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiI...

# PayOS
PAYOS_CLIENT_ID=[REDACTED_ROTATE_PAYOS_CLIENT_ID]
PAYOS_API_KEY=[REDACTED_ROTATE_PAYOS_API_KEY]
PAYOS_CHECKSUM_KEY=0c730595762e694b32561037cac5cefd...

# Base URL
NEXT_PUBLIC_BASE_URL=https://www.sheetapp.io.vn
```

**Nếu thiếu bất kỳ biến nào → ADD NGAY!**

---

### 2. Vercel Build Cache

**Solution: Force Redeploy**

1. Go to Vercel → Deployments
2. Click latest deployment
3. Click "..." menu → **Redeploy**
4. ✅ Check **"Use existing Build Cache"** = **OFF**
5. Click Redeploy

---

### 3. Network/CORS Issues

**Test API directly:**

Open browser console và run:

```javascript
fetch('https://www.sheetapp.io.vn/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [{ id: 'test', quantity: 1 }],
    customer: { name: 'Test', email: 'test@test.com', phone: '0123456789' }
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Expected result:**
- ✅ Status 200 or 400 (validation error)
- ❌ Status 405 → Route not deployed
- ❌ Network error → Vercel down

---

## Quick Fixes

### Fix 1: Add Environment Variables

**Missing Supabase vars = "Lỗi kết nối"!**

1. Vercel Dashboard
2. Settings → Environment Variables
3. Add all vars from `.env.local`
4. **Redeploy**

### Fix 2: Clear Vercel Cache

1. Deployments → Latest
2. Redeploy **WITHOUT cache**
3. Wait 2-3 minutes

### Fix 3: Check Deployment Logs

1. Vercel → Latest Deployment
2. Check **Build Logs**
3. Look for errors:
   - `Module not found`
   - `Type error`
   - `Build failed`

---

## Test Checklist

- [ ] Vercel environment variables complete
- [ ] Redeploy without cache
- [ ] Check build logs (no errors)
- [ ] Test API directly (fetch command)
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Test in incognito mode

---

## Most Likely Issue: Missing Supabase Credentials

**Lý do:** Pending orders check cần query database:

```typescript
const { data } = await supabaseServer
    .from('orders')
    .select('id')
    ...
```

Nếu `SUPABASE_SERVICE_ROLE_KEY` thiếu → Database query fails → Checkout fails!

**Fix:**
1. Check Vercel env vars
2. Add missing Supabase credentials
3. Redeploy

---

## Next Steps

**PRIORITY 1: Check Vercel Environment Variables**

Go to: https://vercel.com/nhuongvts-projects/sheetapp-v2/settings/environment-variables

Compare với `.env.local` - phải giống 100%!

**PRIORITY 2: Redeploy Without Cache**

Vercel → Deployments → Redeploy (uncheck cache)

**PRIORITY 3: Test**

After redeploy, test checkout lại!

---

## Emergency Rollback

**Nếu vẫn không fix được:**

1. Vercel → Deployments
2. Find deployment TRƯỚC KHI add pending check
3. Click "..." → **Promote to Production**
4. Rollback về version cũ (working)

**Then:** Debug locally, fix, và deploy lại sau.

---

**Most likely: Missing SUPABASE_SERVICE_ROLE_KEY on Vercel!**
