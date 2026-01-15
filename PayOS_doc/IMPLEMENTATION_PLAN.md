# PayOS Integration - Fix Plan for Auto-Activation

## Mục Tiêu

Hoàn tất việc tích hợp PayOS để tự động kích hoạt khóa học/dịch vụ khi user thanh toán thành công.

## Phân Tích Hiện Trạng

### ✅ Đã Hoàn Thành

1. **Cơ sở hạ tầng cơ bản**
   - PayOS SDK được tích hợp đúng ([lib/payos.ts](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/lib/payos.ts))
   - Payment link creation hoạt động
   - Webhook endpoint đã thiết lập ([app/api/payment/webhook/route.ts](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/app/api/payment/webhook/route.ts))
   - Database schema có bảng `enrollments` ([supabase_rls_policies.sql:L157-166](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/supabase_rls_policies.sql#L157-L166))

2. **Flow thanh toán**
   - Checkout API tạo orders và order_items
   - PayOS payment link được tạo với 15 phút expiry
   - Webhook nhận thông báo từ PayOS
   - Signature verification implemented
   - Idempotency check để tránh duplicate processing

### ❌ Vấn Đề Cần Fix

> [!IMPORTANT]
> **Critical Issue**: Auto-enrollment logic là placeholder, không thực sự tạo enrollment records!

1. **Enrollment không được tạo**
   - [lib/auto-enrollment.ts:L81-100](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/lib/auto-enrollment.ts#L81-L100) chỉ log message, không insert vào bảng `enrollments`
   - Comment code cho thấy intention nhưng chưa implement

2. **User ID mapping thiếu**
   - Orders table có field `user_id` nhưng luôn null (guest checkout)
   - Enrollments table yêu cầu `user_id UUID` nhưng orders không map email → user_id
   - Không có logic để tìm hoặc tạo user account từ email

3. **Email notification chưa có**
   - Function `sendEnrollmentEmail` chỉ là placeholder ([auto-enrollment.ts:L112-136](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/lib/auto-enrollment.ts#L112-L136))
   - User không nhận confirmation sau thanh toán

4. **Error handling không đầy đủ**
   - Auto-enrollment failure không được retry
   - Không có mechanism để re-process failed enrollments

## Đề Xuất Giải Pháp

### 1. Implement Real Enrollment Logic

**File**: [lib/auto-enrollment.ts](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/lib/auto-enrollment.ts)

#### Thay đổi `markProductEnrolled` function (L79-107):

```typescript
async function markProductEnrolled(order: Order, product: OrderItem): Promise<void> {
    try {
        // Step 1: Find or create user by email
        const userId = await findOrCreateUserByEmail(order.customer_email, {
            name: order.customer_name,
            phone: order.customer_phone
        });

        // Step 2: Insert enrollment record
        const { error } = await supabaseServer
            .from('enrollments')
            .insert({
                user_id: userId,
                product_id: product.product_id,
                order_id: order.order_id,
                enrolled_at: new Date().toISOString(),
                progress: 0,
                completed_at: null
            })
            .onConflict('user_id, product_id')
            .doNothing(); // Ignore if already enrolled

        if (error) {
            console.error(`❌ Error enrolling ${order.customer_email} in product ${product.product_id}:`, error);
            throw error;
        }

        console.log(`✅ Enrolled: ${order.customer_email} in ${product.product_name}`);

    } catch (error) {
        console.error(`Error enrolling in product ${product.product_id}:`, error);
        throw error;
    }
}
```

#### Thêm helper function mới:

```typescript
/**
 * Find user by email, or create if doesn't exist
 * Returns user UUID
 */
async function findOrCreateUserByEmail(
    email: string,
    profile: { name: string; phone?: string }
): Promise<string> {
    // First, try to find existing user
    const { data: existingUser } = await supabaseServer
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        return existingUser.id;
    }

    // User doesn't exist - create placeholder profile
    // Note: Real user creation should go through auth.signUp()
    // This is for guest purchases - store in a custom user_profiles table
    const { data: profile, error } = await supabaseServer
        .from('user_profiles')
        .insert({
            email: email,
            name: profile.name,
            phone: profile.phone,
            created_via: 'purchase'
        })
        .select()
        .single();

    if (error || !profile) {
        throw new Error(`Failed to create user profile for ${email}`);
    }

    return profile.id;
}
```

---

### 2. Update Database Schema

**Vấn đề**: Enrollments table yêu cầu `user_id UUID` từ `auth.users` nhưng guest checkout không tạo auth user.

**Giải pháp**: Tạo bảng `user_profiles` để lưu guest users

#### SQL Migration

**File mới**: `supabase/migrations/enrollment_fix.sql`

```sql
-- Create user_profiles table for guest users
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_via TEXT DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update enrollments to reference user_profiles instead
ALTER TABLE enrollments 
DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey,
ADD CONSTRAINT enrollments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES user_profiles(id) 
    ON DELETE CASCADE;

-- Update orders to link to user_profiles
ALTER TABLE orders
ADD COLUMN user_profile_id UUID REFERENCES user_profiles(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_product ON enrollments(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_profile ON orders(user_profile_id);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users view own profile"
ON user_profiles FOR SELECT
USING (
    auth.uid() IS NOT NULL AND (
        auth_user_id = auth.uid() OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);
```

> [!WARNING]
> **Breaking Change Alert**: Enrollments table foreign key changes.
> 
> **Migration strategy**: 
> 1. Backup existing enrollments
> 2. Create user_profiles for existing enrollments
> 3. Update foreign keys
> 4. Verify data integrity

---

### 3. Add Email Notifications

**File**: [lib/auto-enrollment.ts](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/lib/auto-enrollment.ts)

#### Implement `sendEnrollmentEmail` (L112-136):

```typescript
import { Resend } from 'resend'; // or your email service

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEnrollmentEmail(
    email: string,
    products: OrderItem[]
): Promise<void> {
    try {
        const productList = products
            .map(p => `• ${p.product_name}`)
            .join('\n');

        const { error } = await resend.emails.send({
            from: 'SheetApp <noreply@sheetapp.com>',
            to: email,
            subject: '🎉 Thanh toán thành công - Khóa học đã được kích hoạt',
            html: `
                <h2>Chào mừng bạn đến với SheetApp!</h2>
                <p>Thanh toán của bạn đã được xác nhận thành công.</p>
                
                <h3>Khóa học đã kích hoạt:</h3>
                <ul>
                    ${products.map(p => `<li>${p.product_name}</li>`).join('')}
                </ul>
                
                <p>
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL}/login" 
                       style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Đăng nhập và bắt đầu học
                    </a>
                </p>
                
                <p style="color: #666; font-size: 14px;">
                    Nếu bạn chưa có tài khoản, vui lòng đăng ký bằng email: <strong>${email}</strong>
                </p>
            `
        });

        if (error) {
            console.error('❌ Email send failed:', error);
            throw error;
        }

        console.log(`✅ Enrollment email sent to ${email}`);
    } catch (error) {
        console.error('Email error:', error);
        // Don't throw - email is nice-to-have, not critical
    }
}
```

#### Dependencies cần thêm:

```bash
npm install resend
```

#### Environment variables mới:

```bash
RESEND_API_KEY=your_resend_api_key
```

---

### 4. Update Webhook Handler

**File**: [app/api/payment/webhook/route.ts](file:///E:/2026/Github/bimvietsolutions/Sheetapp/SheetAppV2/app/api/payment/webhook/route.ts)

#### Improve error handling (L186-196):

```typescript
// Auto-enroll user if payment successful
if (orderStatus === 'paid') {
    try {
        console.log(`🎓 Initiating auto-enrollment for order ${order.order_id}`);
        await enrollUserInProducts(order);
        console.log(`✅ Auto-enrollment completed`);
        
        // Send email notification
        const { data: orderItems } = await supabaseServer
            .from('order_items')
            .select('product_id, product_name, quantity, price')
            .eq('order_id', order.id);
            
        if (orderItems && orderItems.length > 0) {
            await sendEnrollmentEmail(order.customer_email, orderItems);
        }
        
    } catch (enrollError) {
        console.error('❌ Auto-enrollment failed:', enrollError);
        
        // Log to failed_enrollments table for retry
        await supabaseServer.from('failed_enrollments').insert({
            order_id: order.order_id,
            error_message: enrollError.message,
            retry_count: 0,
            created_at: new Date().toISOString()
        });
        
        // Don't fail the webhook - payment is already processed
    }
}
```

#### Thêm bảng failed_enrollments:

```sql
CREATE TABLE IF NOT EXISTS failed_enrollments (
    id BIGSERIAL PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(order_id),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 5. Retry Mechanism (Optional - Future Enhancement)

**File mới**: `app/api/cron/retry-enrollments/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { enrollUserInProducts } from '@/lib/auto-enrollment';

export async function GET() {
    // Retry failed enrollments (max 3 retries)
    const { data: failedEnrollments } = await supabaseServer
        .from('failed_enrollments')
        .select('*, orders(*)')
        .is('resolved_at', null)
        .lt('retry_count', 3)
        .order('created_at', { ascending: true })
        .limit(10);

    if (!failedEnrollments) {
        return NextResponse.json({ processed: 0 });
    }

    let successCount = 0;
    
    for (const failed of failedEnrollments) {
        try {
            await enrollUserInProducts(failed.orders);
            
            // Mark as resolved
            await supabaseServer
                .from('failed_enrollments')
                .update({ resolved_at: new Date().toISOString() })
                .eq('id', failed.id);
                
            successCount++;
        } catch (error) {
            // Increment retry count
            await supabaseServer
                .from('failed_enrollments')
                .update({
                    retry_count: failed.retry_count + 1,
                    last_retry_at: new Date().toISOString()
                })
                .eq('id', failed.id);
        }
    }

    return NextResponse.json({ processed: successCount });
}
```

**Setup cron** trong `vercel.json`:

```json
{
    "crons": [{
        "path": "/api/cron/retry-enrollments",
        "schedule": "0 */6 * * *"
    }]
}
```

---

## Verification Plan

### Automated Testing

#### 1. Simulated Webhook Test

**Script**: `PayOS_doc/simulate-payment.js` (đã có sẵn)

```bash
# Step 1: Start dev server
npm run dev

# Step 2: Create test order
# Use checkout page or API to create order, get order code

# Step 3: Simulate payment
node PayOS_doc/simulate-payment.js [ORDER_CODE]

# Expected results:
# ✅ Webhook processed successfully
# ✅ Order status = 'paid'
# ✅ Enrollment record created
# ✅ Email sent (check logs)
```

**Verification queries**:
```sql
-- Check order updated
SELECT order_id, status, paid_at, customer_email 
FROM orders 
WHERE order_id = 'DH...';

-- Check enrollment created
SELECT e.*, p.name as product_name
FROM enrollments e
JOIN products p ON e.product_id = p.id
WHERE e.order_id = 'DH...';

-- Check user profile created
SELECT * FROM user_profiles 
WHERE email = 'customer@email.com';
```

#### 2. Unit Tests (New)

**File mới**: `__tests__/lib/auto-enrollment.test.ts`

```typescript
import { enrollUserInProducts, hasProductAccess } from '@/lib/auto-enrollment';

describe('Auto-Enrollment', () => {
    test('should create enrollment after payment', async () => {
        const mockOrder = {
            order_id: 'TEST123',
            customer_email: 'test@example.com',
            customer_name: 'Test User',
            customer_phone: '0123456789',
            total_amount: 500000
        };
        
        await enrollUserInProducts(mockOrder);
        
        const hasAccess = await hasProductAccess('test@example.com', 'product_id_1');
        expect(hasAccess).toBe(true);
    });
});
```

**Run tests**:
```bash
npm test -- auto-enrollment.test.ts
```

---

### Manual Testing

#### 3. Full PayOS Flow Test

> [!NOTE]
> Test này yêu cầu PayOS sandbox account và ngrok

**Prerequisites**:
- PayOS sandbox credentials
- ngrok installed
- Test products in database

**Steps**:

1. **Setup ngrok**
   ```bash
   ngrok http 3000
   # Copy ngrok URL: https://abc123.ngrok.io
   ```

2. **Config webhook**
   ```bash
   # Update .env.local
   NEXT_PUBLIC_BASE_URL=https://abc123.ngrok.io
   
   # Run setup script
   node PayOS_doc/setup-webhook.js
   ```

3. **Create test order**
   - Navigate to `/checkout`
   - Add test product to cart
   - Fill customer info: `test+payos@example.com`
   - Submit checkout

4. **Complete payment**
   - Click PayOS payment link
   - Complete payment on PayOS sandbox
   - Wait for redirect

5. **Verify results**
   - Check terminal logs for webhook received
   - Verify email received at `test+payos@example.com`
   - Login with email and check enrolled courses
   - SQL query:
     ```sql
     SELECT 
         o.order_id,
         o.status,
         o.paid_at,
         e.product_id,
         p.name
     FROM orders o
     LEFT JOIN enrollments e ON e.order_id = o.order_id
     LEFT JOIN products p ON p.id = e.product_id
     WHERE o.customer_email = 'test+payos@example.com'
     ORDER BY o.created_at DESC;
     ```

**Expected outcomes**:
- ✅ Order status = 'paid'
- ✅ Enrollment records created
- ✅ User profile created (check `user_profiles`)
- ✅ Email received with course links
- ✅ User can access courses after login

---

## Rollout Strategy

### Phase 1: Database Migration (Low Risk)
1. Run `enrollment_fix.sql` migration
2. Verify schema changes
3. Test with existing data

### Phase 2: Code Changes (Medium Risk)
1. Update `auto-enrollment.ts`
2. Update webhook handler
3. Deploy to staging
4. Test with simulated webhooks

### Phase 3: Email Integration (Low Risk)
1. Setup Resend account
2. Add API key to env
3. Test email sending
4. Deploy

### Phase 4: Production Testing (High Value)
1. Enable webhook in production
2. Test with small real payment
3. Monitor logs for 24h
4. Enable for all users

---

## Security Considerations

- ✅ Webhook signature verification already implemented
- ✅ Idempotency check prevents duplicate enrollments
- ✅ RLS policies on enrollments table
- ⚠️ Guest user profiles need additional validation
- ⚠️ Email sending rate limiting (future)

---

## Dependencies

### NPM Packages
```bash
npm install resend  # Email service
```

### Environment Variables
```env
# Existing
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key  
PAYOS_CHECKSUM_KEY=your_checksum_key
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# New
RESEND_API_KEY=your_resend_api_key
```

---

## Timeline Estimate

- **Database Migration**: 30 minutes
- **Auto-enrollment Logic**: 2 hours
- **Email Integration**: 1 hour
- **Testing**: 2 hours
- **Total**: ~5-6 hours

---

**Status**: Ready for implementation  
**Priority**: High - Core feature for revenue  
**Risk Level**: Medium (database schema changes)  
**Last Updated**: 2026-01-15
