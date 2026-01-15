# Tasks.md - SheetApp Project
## Danh sách công việc cần giải quyết ở bước tiếp theo

> **Nguồn**: Phân tích từ tài liệu trong thư mục `_AI_DOCS`  
> **Ngày tạo**: 2026-01-12  
> **Điểm bảo mật hiện tại**: 3.5/10 ⚠️

---

## 🔴 CRITICAL - FIX NGAY (0-7 ngày)

### Bảo mật thanh toán (Payment Security)

- [ ] **#1: Giả mạo thanh toán QR Code**
  - Thêm unique transaction ID vào QR code
  - Implement dynamic QR generation với order ID
  - File cần sửa: `lib/constants.ts`
  - Impact: 💰 Nguy cơ mất tiền cao

- [ ] **#2: Không có payment webhook**
  - Tích hợp VNPay hoặc MoMo API
  - Tạo endpoint `/api/payment/webhook/route.ts`
  - Implement payment verification logic
  - Impact: 💰 Không thể tự động xác nhận thanh toán

### Bảo mật API & DDoS

- [ ] **#4: Không có Rate Limiting**
  - Cài đặt `@upstash/ratelimit` và `@upstash/redis`
  - Tạo Upstash Redis database (free tier)
  - Tạo `lib/ratelimit.ts` với các rate limiter instances
  - Apply rate limiting vào `middleware.ts`
  - Impact: 💥 App có thể bị DDoS, crash server

### Bảo mật Authentication

- [ ] **#8: Không có CSRF Protection**
  - Enable CSRF token middleware
  - Tạo `lib/csrf.ts` với generate/verify functions
  - Apply vào tất cả POST/PUT/DELETE requests
  - Impact: 🔓 Nguy cơ Account hijack

### Bảo mật dữ liệu

- [ ] **#11: Environment variables bị exposed**
  - Di chuyển Supabase calls sang server-only API routes
  - Tạo các API routes trong `app/api/`
  - Xóa `NEXT_PUBLIC_` prefix khỏi sensitive env vars
  - Client chỉ gọi API routes, không trực tiếp access Supabase
  - Impact: 🔓 Full database access bị lộ

---

## 🟠 HIGH - FIX TRONG 30 NGÀY

### Bảo mật giỏ hàng & thanh toán

- [ ] **#3: Cart Manipulation**
  - Implement server-side price validation
  - Tạo `/api/checkout/route.ts`
  - Re-calculate giá từ database, không trust client data
  - File: `context/CartContext.tsx`
  - Effort: Medium

### Bảo vệ API

- [ ] **#5: API Query Flooding**
  - Enforce max limit (100) trên server cho Supabase queries
  - Validate và sanitize tất cả query parameters
  - Effort: Low

### Bảo mật XSS

- [ ] **#6: Stored XSS qua Reviews**
  - Cài đặt `isomorphic-dompurify`
  - Sanitize tất cả user input trước khi render
  - File: `components/CourseTabs.tsx`
  - Effort: Medium

### Session Security

- [ ] **#9: Không có Session Timeout**
  - Implement session timeout checker (24h)
  - Auto logout khi session quá cũ
  - Thêm "Logout all devices" feature
  - Effort: Low

### Database Security

- [ ] **#12: Không có Row Level Security (RLS)**
  - Enable RLS trên tất cả Supabase tables
  - Tạo policies cho `products`, `orders`, `enrollments`, `reviews`
  - Policy: Users chỉ xem được own orders/reviews
  - Policy: Chỉ admin được update products
  - Effort: High
  - Impact: 🔴 CRITICAL - Nguy cơ data breach

---

## 🟡 MEDIUM - FIX TRONG 90 NGÀY

### Authentication & Password

- [ ] **#10: Weak Password Policy**
  - Enforce strong password requirements:
    - Minimum 8 characters
    - Uppercase + Lowercase + Numbers + Special chars
  - Implement password strength indicator
  - File: `app/login/page.tsx`

### Logging & Privacy

- [ ] **#13: PII Logging**
  - Remove tất cả `console.log` với sensitive data từ production
  - Implement proper logging service
  - Chỉ log error message, không log full object

### Business Logic

- [ ] **#14: Unlimited Product Access**
  - Tạo `enrollments` table trong Supabase
  - Implement enrollment check middleware
  - File: `app/learn/[slug]/lesson/[id]/page.tsx`
  - Chỉ cho phép access nếu đã mua khóa học

- [ ] **#15: Không có Order Expiration**
  - Auto-cancel pending orders sau 24h
  - Tạo `/api/cron/cancel-expired-orders/route.ts`
  - Setup Vercel Cron Job trong `vercel.json`

### Infrastructure

- [ ] **#16: Không có Error Monitoring**
  - Install `@sentry/nextjs`
  - Setup Sentry error tracking
  - Configure environment và sample rate

- [ ] **#17: Không có Backup Strategy**
  - Enable Supabase Point-in-Time Recovery (PITR)
  - Setup automated daily backups
  - Test restore procedure

### Compliance

- [ ] **#18: Thiếu Privacy Policy / Terms of Service**
  - Tạo page `/privacy-policy`
  - Tạo page `/terms-of-service`
  - Thêm checkbox "I agree to Terms" khi đăng ký
  - Implement cookie consent banner
  - Impact: Vi phạm GDPR, PDPA

---

## 🛡️ BOT PROTECTION - 4-5 TUẦN IMPLEMENTATION

### Week 1: Rate Limiting (CRITICAL)

- [ ] Install `@upstash/ratelimit` và `@upstash/redis`
- [ ] Tạo Upstash Redis database (free tier)
- [ ] Tạo `lib/ratelimit.ts`:
  - `authRateLimit`: 5 requests per 15 mins
  - `apiRateLimit`: 100 requests per minute
  - `formRateLimit`: 3 submissions per hour
- [ ] Setup `middleware.ts` để apply rate limiting
- [ ] Test với curl script để verify

### Week 2: CAPTCHA Integration

- [ ] Đăng ký Google reCAPTCHA v3 keys
- [ ] Install `react-google-recaptcha-v3`
- [ ] Wrap app với `GoogleReCaptchaProvider` trong `app/layout.tsx`
- [ ] Thêm CAPTCHA vào:
  - Register form (`app/login/page.tsx`)
  - Contact form (`components/ConsultationModal.tsx`)
  - Booking form (`components/BookingModal.tsx`)
  - Review submission (`components/CourseTabs.tsx`)
- [ ] Tạo `/api/verify-captcha/route.ts` (server-side verification)
- [ ] Test với bot simulation script

### Week 3: Database Security & RLS

- [ ] Enable RLS trên tất cả Supabase tables:
  - `products`
  - `orders`
  - `reviews`
  - `enrollments`
  - `chapters`
  - `lessons`
- [ ] Tạo RLS policies:
  - Public read cho `products` (where `is_active = true`)
  - Only admins update `products`
  - Users view own `orders`
  - Rate limit: Max 5 reviews/day per user
  - Unique constraint: 1 review per user/product
- [ ] Test với spam script

### Week 4: Advanced Protection

- [ ] **Honeypot Fields**
  - Thêm hidden honeypot field vào mọi form
  - Reject submission nếu honeypot có value
  - Files: `BookingModal.tsx`, `ConsultationModal.tsx`

- [ ] **CSRF Token**
  - Tạo `lib/csrf.ts`
  - Apply CSRF middleware cho POST/PUT/DELETE
  - Generate token và set cookie

- [ ] **IP Blocking**
  - Tạo `lib/ip-check.ts`
  - Maintain blocklist của malicious IPs
  - Optional: Geo-blocking cho high-risk countries

- [ ] **Input Sanitization**
  - Install `isomorphic-dompurify` và `validator`
  - Tạo `lib/validators.ts`
  - Sanitize tất cả user inputs
  - Block spam keywords (viagra, casino, etc.)

### Week 5: Monitoring & Testing

- [ ] Setup Sentry error tracking
- [ ] Tạo alerts cho:
  - Spike trong 429 errors (rate limit triggered)
  - Spike trong failed login attempts
  - Database connection errors
- [ ] Monitor Upstash Redis usage
- [ ] Setup logging cho blocked IPs
- [ ] Tạo dashboard để track:
  - Bot detection rate
  - CAPTCHA success/failure rate
  - Rate limit triggers per endpoint

---

## 🚧 FEATURES ĐANG DỞ DANG (In Progress)

### Learning Platform

- [ ] Tạo `/learn/[slug]/lesson/[id]` page
- [ ] Implement video player
- [ ] Progress tracking system
- [ ] Save watch history

### Payment Gateway

- [ ] Research VNPay vs MoMo API
- [ ] Đăng ký merchant account
- [ ] Implement payment flow
- [ ] Webhook handling
- [ ] Receipt generation

### Order Management

- [ ] Admin dashboard để quản lý orders
- [ ] Order status workflow (pending → paid → completed)
- [ ] Order filtering và search
- [ ] Export orders to Excel/CSV

### Email Notifications

- [ ] Setup SMTP hoặc SendGrid
- [ ] Email templates:
  - Order confirmation
  - Payment receipt
  - Password reset
  - Welcome email
  - Course access granted

### Reviews System Backend

- [ ] Tạo `reviews` table trong Supabase
- [ ] API routes cho CRUD reviews
- [ ] Implement review moderation
- [ ] User reputation system

### Instructor Profile Page

- [ ] `/instructor/[id]` page layout
- [ ] List courses by instructor
- [ ] Instructor bio, stats, ratings
- [ ] Social links

### Advanced Search

- [ ] Autocomplete suggestions
- [ ] Recent searches (localStorage)
- [ ] Search history tracking
- [ ] Filter by multiple criteria

### Wishlist/Favorites

- [ ] Tạo `wishlist` table
- [ ] Add/Remove favorite products
- [ ] Wishlist page
- [ ] Share wishlist feature

---

## 📋 PLANNED FEATURES (Future)

- [ ] **Admin CMS**: Quản lý products, courses, posts
- [ ] **Google Sheets Sync**: Import/Export data
- [ ] **Video Hosting**: Tích hợp Vimeo/YouTube API
- [ ] **Certificate Generation**: Chứng chỉ hoàn thành khóa học
- [ ] **Affiliate System**: Hoa hồng cho người giới thiệu
- [ ] **Multi-language Support**: i18n implementation
- [ ] **Progressive Web App (PWA)**: Offline support
- [ ] **Push Notifications**: Real-time updates
- [ ] **Analytics Dashboard**: User behavior tracking
- [ ] **A/B Testing**: Conversion optimization

---

## 📊 PRIORITIZATION MATRIX

| Category | Tasks | Priority | Timeline | Impact |
|----------|-------|----------|----------|--------|
| Payment Security | #1, #2 | 🔴 CRITICAL | Week 1 | Rất cao - Mất tiền |
| API Security | #4, #5 | 🔴 CRITICAL | Week 1-2 | Rất cao - App crash |
| Auth Security | #8, #9, #10 | 🟠 HIGH | Week 2-3 | Cao - Account hijack |
| Data Security | #11, #12 | 🔴 CRITICAL | Week 2-3 | Rất cao - Data breach |
| Bot Protection | All Week 1-5 | 🟠 HIGH | 4-5 weeks | Cao - Spam/DDoS |
| Input Validation | #6, #7, #13 | 🟡 MEDIUM | Week 3-4 | Trung bình - XSS |
| Business Logic | #14, #15 | 🟡 MEDIUM | Month 2-3 | Trung bình - Revenue loss |
| Infrastructure | #16, #17, #18 | 🟡 MEDIUM | Month 2-3 | Trung bình - Compliance |

---

## ⚠️ KHUYẾN NGHỊ QUAN TRỌNG

1. **KHÔNG LAUNCH** app cho users thật cho đến khi fix xong các lỗ hổng CRITICAL (🔴)
2. Thuê security expert để penetration testing sau khi implement xong
3. Setup bug bounty program sau khi fix các lỗ hổng chính
4. Regular security audits (quarterly)
5. **Chi phí ước tính để start: $0/month** (sử dụng free tiers của reCAPTCHA, Upstash, Cloudflare)

---

## 📈 KẾT QUẢ DỰ KIẾN SAU KHI HOÀN THÀNH

- 🛡️ Block **99.9%** bot registration attempts
- 🛡️ Block **95%** spam form submissions  
- 🛡️ Prevent DDoS overload với rate limiting
- 🛡️ Giảm **90%** fake reviews/comments
- 🔒 Điểm bảo mật tăng từ **3.5/10** lên **8.5/10**

---

## 📝 NOTES

- Tất cả tasks được phân loại theo mức độ ưu tiên: 🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM, 🟢 LOW
- Timeline tổng thể: **4-5 tuần** cho bảo mật cơ bản, **3-6 tháng** cho tất cả features
- Regular updates: Cập nhật file này mỗi khi hoàn thành task
- Next review date: **2026-02-12**

**Người tạo**: AI Assistant  
**Dựa trên phân tích**: `_AI_DOCS/01_Technical_Context_Summary.md`, `02_Security_Audit_Report.md`, `03_Anti_DDoS_Bot_Protection.md`
