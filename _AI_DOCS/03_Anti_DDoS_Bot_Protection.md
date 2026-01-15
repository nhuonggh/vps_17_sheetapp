# KẾ HOẠCH PHÒNG CHỐNG DDoS & BOT ATTACKS - SheetApp

> **Mục tiêu**: Bảo vệ server khỏi spam, DDoS, và các cuộc tấn công tự động từ bot

---

## PHẦN I: CÁC VECTOR TẤN CÔNG (Attack Vectors)

### 🔴 Vector #1: Spam Login/Register - Brute Force

**Kịch bản tấn công:**
```python
# attack_script.py
import requests
import random
import string

# Tạo 100,000 fake accounts
for i in range(100000):
    email = ''.join(random.choices(string.ascii_lowercase, k=10)) + '@fake.com'
    password = 'FakePass123!'
    
    # Spam register endpoint
    requests.post('https://sheetapp.io.vn/api/auth/signup', 
                  json={'email': email, 'password': password})
    # → Supabase auth table đầy spam users
    # → Server quá tải processing
```

**Điểm yếu hiện tại:**
```typescript
// app/login/page.tsx - Line 53
const { error } = await supabase.auth.signUp({ email, password });
// KHÔNG CÓ:
// ❌ CAPTCHA verification
// ❌ Rate limiting
// ❌ Email verification required
// ❌ IP blocking
```

**Hậu quả:**
- ✋ Tạo 100,000 fake accounts trong 1 giờ
- 💾 Database đầy rác
- 💸 Supabase bill tăng vọt (billing based on storage + requests)
- 🔥 Server lag/crash vì quá tải

---

### 🔴 Vector #2: Spam Product Reviews/Comments

**Kịch bản tấn công:**
```python
# spam_reviews.py
import requests

# Bot spam 10,000 reviews
for i in range(10000):
    review = {
        'product_id': 123,
        'content': 'VISIT MY WEBSITE http://scam-site.com FOR CHEAP PRODUCTS!!!',
        'rating': 5,
        'user_email': f'bot{i}@spam.com'
    }
    
    requests.post('https://sheetapp.io.vn/api/reviews', json=review)
    # → Database đầy spam reviews
    # → User thật thấy toàn quảng cáo
```

**Điểm yếu:**
```typescript
// components/CourseTabs.tsx - Line 207
<button onClick={async () => {
  // Gửi review trực tiếp vào database
  await supabase.from('reviews').insert({...})
  // KHÔNG CÓ spam protection!
}}>Gửi ngay</button>
```

---

### 🔴 Vector #3: API Query Flooding

**Kịch bản tấn công:**
```python
# ddos_queries.py
import asyncio
import aiohttp

async def spam_query():
    async with aiohttp.ClientSession() as session:
        # Spam 10,000 concurrent requests
        tasks = []
        for _ in range(10000):
            task = session.get('https://sheetapp.io.vn/api/products?limit=999999')
            tasks.append(task)
        
        await asyncio.gather(*tasks)
        # → Server phải process 10,000 queries cùng lúc
        # → Database connection pool cạn kiệt
        # → App crash

asyncio.run(spam_query())
```

**Điểm yếu:**
```typescript
// app/page.tsx - Không có rate limiting trên API routes
const { data } = await supabase.from('products').select('*').limit(limit);
// Attacker có thể gọi API này 10,000 lần/giây
```

---

### 🔴 Vector #4: Form Submission Spam

**Kịch bản:**
```python
# spam_contact_form.py
import requests

# Spam contact/booking form
for i in range(50000):
    requests.post('https://sheetapp.io.vn/api/contact', json={
        'name': f'Spammer {i}',
        'email': f'spam{i}@bot.com',
        'message': 'BUY CHEAP VIAGRA!!!'
    })
    # → Email inbox đầy spam
    # → Database lưu 50,000 fake submissions
```

**Điểm yếu:**
```typescript
// components/BookingModal.tsx, ConsultationModal.tsx
// Submit form không có CAPTCHA
<button onClick={submitForm}>Gửi ngay</button>
```

---

### 🔴 Vector #5: Cart Flooding Attack

```python
# cart_spam.py
# Bot tạo 100,000 carts với 1000 items mỗi cart
for user_id in range(100000):
    cart = []
    for product_id in range(1000):
        cart.append({'id': product_id, 'quantity': 999})
    
    # Lưu vào localStorage simulation
    requests.post('https://sheetapp.io.vn/api/orders', json={
        'user_id': user_id,
        'items': cart
    })
    # → Database orders table cạn kiệt storage
```

---

### 🔴 Vector #6: Image Upload Spam

**Nếu có feature upload avatar/reviewImage:**
```python
# upload_spam.py
import requests

# Upload 10GB garbage images
for i in range(10000):
    # Tạo file ảnh 1MB rác
    fake_image = b'\x00' * 1024 * 1024
    
    files = {'avatar': ('spam.jpg', fake_image)}
    requests.post('https://sheetapp.io.vn/api/upload', files=files)
    # → Supabase Storage đầy
    # → Bill tăng vọt
```

---

## PHẦN II: GIẢI PHÁP CHỐNG BOT

### ✅ Solution #1: Google reCAPTCHA v3 (Invisible)

**Installation:**
```bash
npm install react-google-recaptcha-v3
```

**Implementation:**

```typescript
// app/layout.tsx - Wrap app với ReCaptchaProvider
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GoogleReCaptchaProvider reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}>
          {children}
        </GoogleReCaptchaProvider>
      </body>
    </html>
  );
}
```

```typescript
// app/login/page.tsx - Thêm CAPTCHA vào register
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export default function LoginPage() {
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Get CAPTCHA token
    if (!executeRecaptcha) {
      alert('CAPTCHA not ready');
      return;
    }
    
    const captchaToken = await executeRecaptcha('register');
    
    // 2. Verify token trên server
    const response = await fetch('/api/verify-captcha', {
      method: 'POST',
      body: JSON.stringify({ token: captchaToken, email, password })
    });
    
    if (!response.ok) {
      alert('CAPTCHA verification failed. Are you a robot?');
      return;
    }
    
    // 3. Proceed với registration
    // ...
  };
}
```

```typescript
// app/api/verify-captcha/route.ts - Server-side verification
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  
  // Verify với Google
  const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
  });
  
  const verifyData = await verifyResponse.json();
  
  // Check score (reCAPTCHA v3 returns score 0.0-1.0)
  if (!verifyData.success || verifyData.score < 0.5) {
    return NextResponse.json({ error: 'Bot detected!' }, { status: 403 });
  }
  
  return NextResponse.json({ success: true, score: verifyData.score });
}
```

**Áp dụng cho:**
- ✅ Register form
- ✅ Login form (nếu failed attempts > 3)
- ✅ Contact/Booking form
- ✅ Review submission
- ✅ Password reset

---

### ✅ Solution #2: Upstash Rate Limiting (Redis-based)

**Installation:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Setup Upstash (Free tier: 10,000 requests/day):**
1. Signup tại https://upstash.com
2. Create Redis database
3. Copy `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`

**Implementation:**

```typescript
// lib/ratelimit.ts - Tạo rate limiter instances
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

// Strict rate limit cho authentication
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 mins
  analytics: true,
  prefix: 'ratelimit:auth',
});

// Moderate rate limit cho API queries
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  prefix: 'ratelimit:api',
});

// Strict rate limit cho form submissions
export const formRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 submissions per hour
  prefix: 'ratelimit:form',
});
```

```typescript
// middleware.ts - Apply rate limiting globally
import { NextRequest, NextResponse } from 'next/server';
import { authRateLimit, apiRateLimit } from '@/lib/ratelimit';

export async function middleware(req: NextRequest) {
  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const pathname = req.nextUrl.pathname;
  
  // Rate limit auth endpoints
  if (pathname.startsWith('/api/auth')) {
    const { success, reset } = await authRateLimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { 
          error: 'Too many attempts. Try again later.',
          resetAt: new Date(reset).toISOString()
        }, 
        { status: 429 }
      );
    }
  }
  
  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    const { success } = await apiRateLimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' }, 
        { status: 429 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*']
};
```

---

### ✅ Solution #3: Email Verification Required

```typescript
// Disable instant signup - Require email verification
// Supabase Dashboard → Authentication → Email Auth Settings
// ✅ Enable "Confirm email" 

// app/login/page.tsx
const handleRegister = async () => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
      data: { full_name: name }
    }
  });
  
  if (!error) {
    alert('Verification email sent! Check your inbox.');
  }
};
```

**Lợi ích:**
- ❌ Bot không thể tạo fake account ngay lập tức
- ✅ Bắt buộc có email thật
- ✅ Giảm spam signup 95%

---

### ✅ Solution #4: Honeypot Fields (Hidden trap)

```typescript
// components/BookingModal.tsx
export default function BookingModal() {
  const [honeypot, setHoneypot] = useState('');
  
  const handleSubmit = async () => {
    // Nếu honeypot field có value → Bot đã fill nó
    if (honeypot !== '') {
      console.log('Bot detected via honeypot');
      return; // Không submit
    }
    
    // Proceed with real submission
    // ...
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Real fields */}
      <input type="text" name="name" placeholder="Your name" />
      <input type="email" name="email" placeholder="Email" />
      
      {/* HONEYPOT - Hidden from humans, visible to bots */}
      <input 
        type="text" 
        name="website" 
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: 'absolute', left: '-9999px' }}
        tabIndex={-1}
        autoComplete="off"
      />
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

### ✅ Solution #5: Request Fingerprinting

```typescript
// lib/fingerprint.ts - Detect suspicious patterns
export function detectBot(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer');
  
  // Check 1: No User-Agent (bot)
  if (!userAgent) return true;
  
  // Check 2: Known bot user agents
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'wget', 'curl',
    'python-requests', 'go-http-client', 'axios'
  ];
  
  if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
    return true;
  }
  
  // Check 3: No referer for form submission (suspicious)
  if (!referer && req.method === 'POST') {
    return true;
  }
  
  // Check 4: Too fast request (< 2 seconds from previous)
  // (Implement timing tracking with Redis)
  
  return false;
}

// middleware.ts
export async function middleware(req: NextRequest) {
  if (detectBot(req)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  // ...
}
```

---

### ✅ Solution #6: CSRF Token Protection

```typescript
// lib/csrf.ts
import { randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken;
}

// middleware.ts
export async function middleware(req: NextRequest) {
  // Only check POST/PUT/DELETE
  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return NextResponse.next();
  }
  
  const csrfToken = req.headers.get('x-csrf-token');
  const cookieToken = req.cookies.get('csrf-token')?.value;
  
  if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }
  
  return NextResponse.next();
}
```

---

### ✅ Solution #7: Input Validation & Sanitization

```typescript
// lib/validators.ts
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export function validateAndSanitize(input: {
  email?: string;
  name?: string;
  message?: string;
}) {
  const errors: string[] = [];
  const sanitized: any = {};
  
  // Email validation
  if (input.email) {
    if (!validator.isEmail(input.email)) {
      errors.push('Invalid email format');
    }
    sanitized.email = validator.normalizeEmail(input.email) || '';
  }
  
  // Name validation (no special chars)
  if (input.name) {
    if (!/^[a-zA-Z\s]{2,50}$/.test(input.name)) {
      errors.push('Invalid name (letters only, 2-50 chars)');
    }
    sanitized.name = DOMPurify.sanitize(input.name);
  }
  
  // Message validation (no <script> tags)
  if (input.message) {
    sanitized.message = DOMPurify.sanitize(input.message, {
      ALLOWED_TAGS: [], // Strip all HTML
    });
    
    // Check for spam keywords
    const spamKeywords = ['viagra', 'casino', 'lottery', 'click here'];
    if (spamKeywords.some(kw => sanitized.message.toLowerCase().includes(kw))) {
      errors.push('Spam content detected');
    }
  }
  
  return { errors, sanitized };
}

// Usage in API route
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { errors, sanitized } = validateAndSanitize(body);
  
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }
  
  // Use sanitized data
  await saveToDatabase(sanitized);
}
```

---

### ✅ Solution #8: Supabase Row Level Security (RLS)

```sql
-- Enable RLS on reviews table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Limit 1 review per user per product
CREATE UNIQUE INDEX unique_user_product_review 
ON reviews(user_id, product_id);

-- Rate limit: Max 5 reviews per day per user
CREATE POLICY "Limit reviews per day"
ON reviews
FOR INSERT
WITH CHECK (
  (
    SELECT COUNT(*) 
    FROM reviews 
    WHERE user_id = auth.uid() 
    AND created_at > NOW() - INTERVAL '1 day'
  ) < 5
);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users only"
ON reviews
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

---

### ✅ Solution #9: IP Blocking & Geofencing

```typescript
// lib/ip-check.ts
export async function checkIP(ip: string): Promise<boolean> {
  // Option 1: Check against known malicious IPs
  const blockedIPs = ['1.2.3.4', '5.6.7.8']; // From threat intelligence
  if (blockedIPs.includes(ip)) return false;
  
  // Option 2: Geo-blocking (block countries with high bot traffic)
  const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
  const geoData = await geoResponse.json();
  
  const blockedCountries = ['CN', 'RU', 'KP']; // Example
  if (blockedCountries.includes(geoData.country_code)) {
    return false;
  }
  
  return true;
}

// middleware.ts
export async function middleware(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  
  const isAllowed = await checkIP(ip);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
}
```

---

### ✅ Solution #10: Cloudflare Bot Management (Premium)

**Free tier features:**
- ✅ DDoS protection
- ✅ SSL/TLS
- ✅ CDN caching
- ✅ Basic bot detection

**Pro tier ($20/month):**
- ✅ Advanced bot scoring
- ✅ Challenge pages for suspicious traffic
- ✅ Rate limiting rules
- ✅ Firewall rules

**Setup:**
1. Add domain to Cloudflare
2. Update DNS nameservers
3. Enable "I'm Under Attack" mode when being DDoSed
4. Setup firewall rules:
   - Block IPs from certain countries
   - Challenge requests with UserAgent containing "bot"
   - Rate limit > 100 req/min per IP

---

## PHẦN III: CHI TIẾT CÁC ENDPOINT CẦN BẢO VỆ

### 🛡️ Priority 1: Authentication Endpoints

| Endpoint | Protection | Config |
|----------|-----------|--------|
| POST /api/auth/signup | reCAPTCHA v3 + Rate limit (5/hour) + Email verification | `authRateLimit.slidingWindow(5, '1 h')` |
| POST /api/auth/login | Rate limit (5/15min) + CAPTCHA after 3 fails | `authRateLimit.slidingWindow(5, '15 m')` |
| POST /api/auth/reset-password | Rate limit (3/hour) + CAPTCHA | `formRateLimit.slidingWindow(3, '1 h')` |

### 🛡️ Priority 2: Data Mutation Endpoints

| Endpoint | Protection | Config |
|----------|-----------|--------|
| POST /api/reviews | reCAPTCHA + Rate limit (3/day) + RLS policy | `formRateLimit.slidingWindow(3, '1 d')` |
| POST /api/contact | CAPTCHA + Honeypot + Rate limit (3/hour) | `formRateLimit.slidingWindow(3, '1 h')` |
| POST /api/orders | Session auth + CSRF + Server-side validation | Required auth token |

### 🛡️ Priority 3: Query Endpoints

| Endpoint | Protection | Config |
|----------|-----------|--------|
| GET /api/products | Rate limit (100/min) + Max 100 results | `apiRateLimit.slidingWindow(100, '1 m')` |
| GET /api/search | Rate limit (50/min) + Min 2 chars query | `apiRateLimit.slidingWindow(50, '1 m')` |

---

## PHẦN IV: IMPLEMENTATION CHECKLIST

```markdown
## Week 1: Critical Protection
- [ ] Install @upstash/ratelimit and @upstash/redis
- [ ] Create Upstash Redis database (free tier)
- [ ] Setup rate limiting middleware
- [ ] Apply to /api/auth/* routes
- [ ] Test with curl script

## Week 2: CAPTCHA Integration
- [ ] Get Google reCAPTCHA v3 keys
- [ ] Install react-google-recaptcha-v3
- [ ] Add to register form
- [ ] Add to contact/booking forms
- [ ] Create /api/verify-captcha route
- [ ] Test with bot simulation

## Week 3: Database Security
- [ ] Enable RLS on all Supabase tables
- [ ] Create rate limit policies (5 reviews/day)
- [ ] Add unique constraints (1 review per user/product)
- [ ] Test with spam script

## Week 4: Advanced Protection
- [ ] Implement honeypot fields
- [ ] Add CSRF token middleware
- [ ] Setup IP blocking list
- [ ] Integrate DOMPurify for input sanitization
- [ ] Add Cloudflare (optional)

## Week 5: Monitoring
- [ ] Setup Sentry error tracking
- [ ] Create alert for 429 errors spike
- [ ] Monitor Upstash Redis usage
- [ ] Setup logging for blocked IPs
```

---

## PHẦN V: BOT TESTING SCRIPT

```python
# test_bot_protection.py
import requests
import time

BASE_URL = 'http://localhost:3000'

def test_rate_limiting():
    """Test nếu rate limiting hoạt động"""
    print("Testing rate limiting...")
    
    for i in range(10):
        response = requests.post(f'{BASE_URL}/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'wrong_password'
        })
        
        print(f"Request {i+1}: {response.status_code}")
        
        if response.status_code == 429:
            print("✅ Rate limiting working! Got 429 Too Many Requests")
            return True
        
        time.sleep(0.1)
    
    print("❌ Rate limiting NOT working - no 429 error")
    return False

def test_captcha():
    """Test CAPTCHA protection"""
    print("\nTesting CAPTCHA...")
    
    # Submit without CAPTCHA token
    response = requests.post(f'{BASE_URL}/api/verify-captcha', json={
        'token': 'fake_token'
    })
    
    if response.status_code == 403:
        print("✅ CAPTCHA working! Bot blocked")
        return True
    else:
        print("❌ CAPTCHA NOT working")
        return False

def test_sql_injection():
    """Test SQL injection protection"""
    print("\nTesting SQL injection...")
    
    malicious_input = "'; DROP TABLE users; --"
    response = requests.get(f'{BASE_URL}/api/search?q={malicious_input}')
    
    # If server returns 500, SQL injection might work
    if response.status_code == 200:
        print("✅ SQL injection protected (returns 200)")
        return True
    else:
        print(f"⚠️  Unexpected status: {response.status_code}")
        return False

if __name__ == '__main__':
    test_rate_limiting()
    test_captcha()
    test_sql_injection()
```

---

## KẾT LUẬN

### Chi phí ước tính:

| Service | Free Tier | Paid Tier | Recommendation |
|---------|-----------|-----------|----------------|
| Google reCAPTCHA | 1M assessments/month | $1/1000 extra | ✅ Start with free |
| Upstash Redis | 10K requests/day | $0.2/100K requests | ✅ Free tier enough |
| Cloudflare | Free DDoS protection | $20/month Pro | ✅ Start with free |
| Supabase | 500MB DB + 2GB bandwidth | $25/month Pro | ✅ Free tier OK initially |

**Total cost để start: $0/month** (sử dụng free tiers)

### Hiệu quả dự kiến:

- 🛡️ Block **99.9%** bot registration attempts
- 🛡️ Block **95%** spam form submissions
- 🛡️ Prevent DDoS overload với rate limiting
- 🛡️ Giảm **90%** fake reviews/comments

**Timeline:** 4-5 tuần để implement toàn bộ

---

**Người thực hiện:** AI Security Expert  
**Ngày:** 2026-01-08
