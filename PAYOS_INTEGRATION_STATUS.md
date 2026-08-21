# 🛒 Cart & PayOS Integration Checklist

## ✅ Deployment Status
- [x] Website deployed successfully
- [x] Data loading properly (products, courses visible)
- [x] RLS policies configured
- [x] Supabase environment variables set

---

## 🔍 Cart Functionality Check

### Components to Verify:

**1. Add to Cart**
- [ ] "Add to Cart" button visible on product pages
- [ ] Cart count updates when adding items
- [ ] Cart icon shows correct quantity

**2. View Cart**
- [ ] Cart page accessible (usually `/cart` or `/checkout`)
- [ ] Cart items display correctly
- [ ] Quantity can be adjusted
- [ ] Remove items works
- [ ] Total price calculates correctly

**3. Checkout Flow**
- [ ] Checkout button accessible
- [ ] Customer info form (name, email, phone)
- [ ] Form validation works
- [ ] Order summary displays

**4. Payment Options**
- [ ] PayOS payment link generation
- [ ] QR code fallback (if PayOS not configured)

---

## 💳 PayOS Integration Components

### Already Implemented ✅:

**Files Checked:**
- ✅ `lib/payos.ts` - PayOS SDK wrapper
- ✅ `app/api/checkout/route.ts` - Order creation + PayOS link
- ✅ `app/api/payment/webhook/route.ts` - Payment webhook handler
- ✅ `lib/auto-enrollment.ts` - Auto-enrollment logic

**Database:**
- ✅ `orders` table with PayOS fields
- ✅ `order_items` table
- ✅ `transactions` table
- ✅ `enrollments` table
- ✅ `failed_enrollments` table

**Code Features:**
- ✅ Payment link creation
- ✅ Webhook signature verification
- ✅ Auto-enrollment on payment success
- ✅ Guest user handling
- ✅ Email notification (template ready)

---

## 🚀 PayOS Configuration Required

### Environment Variables (Vercel):

**Already in .env.local (need to add to Vercel):**

1. `PAYOS_CLIENT_ID`
   - Value: `[REDACTED_ROTATE_PAYOS_CLIENT_ID]`
   - Environment: Production, Preview, Development

2. `PAYOS_API_KEY`
   - Value: `[REDACTED_ROTATE_PAYOS_API_KEY]`
   - Environment: Production, Preview, Development

3. `PAYOS_CHECKSUM_KEY`
   - Value: `[REDACTED_ROTATE_PAYOS_CHECKSUM_KEY]`
   - Environment: Production, Preview, Development

4. `NEXT_PUBLIC_BASE_URL`
   - Value: `https://your-app.vercel.app` (replace with actual Vercel URL)
   - Environment: Production, Preview, Development

---

## 📋 PayOS Dashboard Configuration

### Webhook URL Setup:

**After adding env vars and deploying:**

1. Go to **PayOS Dashboard** (https://payos.vn)
2. Navigate to **Settings** → **Webhook**
3. Add webhook URL:
   ```
   https://your-app.vercel.app/api/payment/webhook
   ```
4. Select events:
   - ✅ Payment Success
   - ✅ Payment Cancelled
5. Save configuration

---

## 🧪 Testing Flow

### Test Checkout Process:

**1. Local Test (Development)**
```bash
# Start local server
npm run dev

# Test checkout
# Add product to cart
# Fill customer info
# Submit order
# Check QR code or payment link appears
```

**2. Production Test (Vercel)**
```
1. Visit https://your-app.vercel.app
2. Add product to cart
3. Go to checkout
4. Fill customer info
5. Submit order
6. Verify PayOS payment link created
7. Test payment (sandbox/real)
8. Check webhook logs
9. Verify enrollment created
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: PayOS not configured
**Symptom**: QR code fallback shown instead of PayOS link
**Solution**: Add PayOS env vars to Vercel

### Issue 2: Webhook not received
**Symptom**: Order stays "pending" after payment
**Solution**: 
- Check webhook URL in PayOS dashboard
- Verify webhook signature
- Check Vercel function logs

### Issue 3: Enrollment not created
**Symptom**: Payment success but no enrollment
**Solution**:
- Check Vercel function logs for errors
- Verify user exists in profiles table
- Check failed_enrollments table

### Issue 4: CORS errors
**Symptom**: API calls fail from browser
**Solution**: Check Next.js API route configuration

---

## 📊 Monitoring & Logs

### Vercel Function Logs:
```bash
# Via CLI
vercel logs --follow

# Via Dashboard
Vercel → Your Project → Functions → Logs
```

### Check Database:
```sql
-- Recent orders
SELECT * FROM orders ORDER BY created_at DESC LIMIT 10;

-- Recent enrollments
SELECT * FROM enrollments ORDER BY enrolled_at DESC LIMIT 10;

-- Failed enrollments (if any)
SELECT * FROM failed_enrollments WHERE resolved_at IS NULL;
```

---

## ✅ Pre-Launch Checklist

Before going live with PayOS:

- [ ] All environment variables added to Vercel
- [ ] Webhook URL configured in PayOS dashboard
- [ ] Test order created successfully
- [ ] PayOS payment link generates
- [ ] Test payment completes
- [ ] Webhook received and processed
- [ ] Order status updates to "paid"
- [ ] Enrollment record created
- [ ] Email notification sent (if enabled)
- [ ] No errors in Vercel logs

---

## 🎯 Next Steps

1. **Verify cart functionality** - Test add/remove/checkout
2. **Add PayOS env vars to Vercel**
3. **Update NEXT_PUBLIC_BASE_URL** with actual Vercel URL
4. **Redeploy**
5. **Configure webhook in PayOS dashboard**
6. **Test end-to-end payment flow**
7. **Monitor and fix any issues**

---

**Current Status**: Ready for PayOS environment variables configuration! 🚀
