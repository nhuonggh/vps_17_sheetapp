# Audit Bảo mật

> Đối chiếu với `security_audit.md` (root, cũ, đã bị comment out) và `audit_project/01_supabase_tan_du.md` + `05_khuyen_nghi_hanh_dong.md` (2026-07-02).

`security_audit.md` nói dự án "chưa có bất kỳ cơ chế chống bot nào". Hiện tại code **đã có hạ tầng** CAPTCHA (`react-google-recaptcha-v3` + `/api/verify-captcha`) và rate limit (Upstash) — nhưng finding bên dưới cho thấy hạ tầng này **không thực sự khoá được** endpoint ghi dữ liệu. File bị comment hơi sớm: vấn đề gốc (spam booking/lead) chưa giải quyết triệt để, chỉ mới "trông như đã có" CAPTCHA/rate-limit ở phía client.

## 🔴 1. CAPTCHA hoàn toàn có thể bỏ qua

**File**: `app/api/bookings/route.ts:4-22`, `app/api/leads/route.ts:4-22`.

Hai route insert thẳng vào DB, **không** kiểm tra token CAPTCHA nào. Việc gọi `/api/verify-captcha` chỉ do frontend tự nguyện thực hiện (`components/BookingModal.tsx:46-58`, `components/ConsultationModal.tsx:27-42`) trước khi gọi API ghi — hai bước này không liên kết với nhau ở server.

**Kịch bản**: `curl -X POST /api/bookings -d '{"fullName":"x","phone":"0900000000"}'` lặp vô hạn, không cần captcha token, không cần qua `/api/verify-captcha`.

**Fix**: bắt buộc `POST /api/bookings`/`/api/leads` nhận `captchaToken`, tự verify server-side (dùng lại logic đã có trong `verify-captcha/route.ts`) trước khi INSERT, từ chối nếu thiếu/token fail.

## 🔴 2. Rate limit không áp dụng cho endpoint dễ bị spam nhất

`formRateLimit` (3 request/giờ/IP, `lib/ratelimit.ts:82-89`) **không được import/dùng ở bất kỳ đâu**. `middleware.ts:81-111` chỉ áp `apiRateLimit` (100 req/phút/IP) dùng chung cho mọi `/api/*` — booking/lead spam được phép tới 100 lần/phút mỗi IP, cao hơn nhiều so với thiết kế ban đầu (3/giờ).

**Fix**: import `formRateLimit`, gọi trong `bookings/route.ts`, `leads/route.ts`, `feedback/route.ts` trước khi insert.

## 🔴 3. `getClientIp()` tin header có thể giả mạo → bypass toàn bộ rate limit

`lib/ratelimit.ts:94-108`:
```
const forwardedFor = request.headers.get('x-forwarded-for');
if (forwardedFor) return forwardedFor.split(',')[0].trim();
```
Lấy phần tử đầu tiên của `X-Forwarded-For` — giá trị client tự gửi được, không phải IP thật do proxy (Caddy) thêm vào. Không có allowlist proxy tin cậy.

**Kịch bản**: gửi header `X-Forwarded-For: <random-ip>` khác nhau mỗi request → bypass hoàn toàn `authRateLimit` (chống brute-force login) lẫn `apiRateLimit`/spam booking/lead.

**Fix**: chỉ tin `X-Forwarded-For` khi request đến từ IP proxy tin cậy (Caddy nội bộ), hoặc lấy IP ở hop cuối cùng, hoặc dùng header riêng do Caddy ghi đè (không phải header client set được).

## 🟠 4. Không validate/sanitize input ở `bookings`/`leads` dù đã có sẵn thư viện

`app/api/bookings/route.ts:6-15`, `app/api/leads/route.ts:6-15` — nhận `fullName/phone/message` và insert thẳng, không dùng `validateFormInput()` (`lib/validators.ts`) dù `checkout` đã dùng đúng cách. Không giới hạn độ dài `message`, không kiểm tra format `phone`. Không SQL injection (parameterized `$1,$2`) nhưng dữ liệu thô (kể cả `<script>`) lưu nguyên vẹn — rủi ro stored-XSS nếu sau này có màn hình admin/CRM hiển thị lại không escape.

**Fix**: dùng lại `validateFormInput()` như checkout.

## 🟠 5. `dangerouslySetInnerHTML` render HTML từ DB, không sanitize

`components/CourseTabs.tsx:89` (`product.content_html`), `app/news/[slug]/page.tsx:141` (`post.content_html`).

`isomorphic-dompurify` đã bị gỡ (theo lịch sử commit), không có sanitizer thay thế wire vào trước khi render. `lib/validators.ts:176-180` có `sanitizeHtml()` dùng `validator.escape()` (escape toàn bộ HTML, sẽ phá nát nội dung có định dạng) nhưng **không có caller nào** gọi hàm này trước 2 chỗ render trên.

Hiện `content_html` chỉ ghi tay qua DB/migration, không qua API công khai nào — chưa có đường khai thác trực tiếp từ user thường lúc này. Nhưng đây là gap phòng thủ thật: nếu tương lai có admin panel hoặc sync content từ nguồn ngoài (Google Sheets), sẽ là stored XSS ngay lập tức.

**Fix**: dùng sanitizer server-side tương thích Vercel/edge runtime (`sanitize-html`, hoặc `dompurify`+`jsdom` chạy Node runtime) trước khi render hoặc tại thời điểm ghi.

## 🟡 6. Security headers thiếu hoàn toàn

Grep `next.config.ts`, `middleware.ts`, toàn bộ `.ts/.tsx` cho `X-Frame-Options`, `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`: **0 kết quả**. Không chống clickjacking, không CSP (làm tăng mức nguy hiểm của finding #5 nếu bị khai thác). HSTS/nosniff có thể set ở Caddy ngoài repo — chưa verify được trong phạm vi này.

**Fix**: thêm `headers()` trong `next.config.ts` hoặc block trong `middleware.ts`: tối thiểu `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, CSP (report-only trước khi enforce, vì đang có `dangerouslySetInnerHTML`).

## 🟢 7. `lib/csrf.ts` tồn tại nhưng không dùng ở đâu (informational)

Grep `csrf` toàn `app/`+`components/`: 0 kết quả ngoài chính file này. Rủi ro CSRF thực tế với route có auth đã giảm nhẹ vì cookie session đúng chuẩn (`httpOnly:true, secure:true, sameSite:'lax'`) — SameSite=Lax chặn phần lớn CSRF cross-site cổ điển. Route public (bookings/leads/checkout) không mang session nên CSRF không phải vấn đề chính ở đó — vấn đề chính là spam (finding #1-4).

**Đề xuất**: xoá `lib/csrf.ts` nếu không định dùng, hoặc wire vào form nhạy cảm nếu muốn defense-in-depth đầy đủ.

## 🟢 8. Không có guard chống trùng lặp yêu cầu Affiliate ở server

`app/api/profile/affiliate-request/route.ts` — `POST` (dòng 22-46) insert không điều kiện, chỉ `GET` (dòng 5-20) kiểm tra request đã tồn tại. User có thể gọi POST nhiều lần tạo nhiều dòng `pending` trùng — khác giả định trong audit cũ ("đã làm một phần logic check existing").

## Đã kiểm tra và xác nhận ĐÃ FIX (so với audit_project cũ)

- `roadmaps/` và `.env` gitignore đúng (`.gitignore:40 /roadmaps/`, `.gitignore:34 .env*`), và trong `.dockerignore`; `git log --all -- roadmaps/` và `-- .env` đều rỗng → **chưa từng lọt vào lịch sử git**.
- `next.config.ts` không còn whitelist `**.supabase.co`.
- Supabase đã gỡ hoàn toàn khỏi dependencies/code chạy.
- `GIT_PUSH_GUIDE.md` đã sửa: không còn khuyến khích `git add .` mù quáng, có cảnh báo rõ push `main` = deploy production ngay, có mục hướng dẫn bật gitleaks hook.
- `checkout/route.ts` dùng đúng `validateFormInput()` + transaction thật (`withTransaction`) — không còn compensating delete thủ công.

## Còn mở

- **Chưa xác nhận được** (ngoài phạm vi repo): rotate secret trong `roadmaps/1.setup_sheetappai.md` — file này **vẫn còn tồn tại trên đĩa với SSH private key thật + Google client secret dạng plaintext**. Không thể xác nhận đã rotate trên VPS/Google Console hay chưa — việc phải làm tay ngoài repo.
- **Mới phát hiện**: hook `gitleaks` ở `.githooks/pre-commit` tồn tại nhưng **chưa active** — `git config --get core.hooksPath` rỗng, `gitleaks` không có trong PATH → lớp bảo vệ pre-commit hiện đang vô hiệu.

## Dependency

`next@16.1.1`, `jsonwebtoken@9.0.3`, `pg@8.22.0`, `react/react-dom@19.2.3` — không có đủ cơ sở để khẳng định CVE cụ thể đang mở (Next 16.x là bản rất mới). Khuyến nghị chạy `npm audit` thay vì đoán.
