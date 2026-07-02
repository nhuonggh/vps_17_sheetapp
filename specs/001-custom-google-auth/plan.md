# Implementation Plan: Custom Google Sign-In (thay thế Supabase Auth)

**Branch**: `001-custom-google-auth` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-custom-google-auth/spec.md`

## Summary

Bỏ hoàn toàn Supabase Auth (implicit OAuth redirect flow — nguyên nhân trực tiếp gây lỗi đăng
nhập rơi ra URL hash trên domain mới `sheetapp.io.vn` vì domain đó chưa nằm trong allow-list
"Redirect URLs" của Supabase Dashboard). Thay bằng **Google Identity Services (GIS) — luồng ID
token phía client**, không cần `redirect_uri`/callback route, không phụ thuộc allow-list domain
của bên thứ ba nào — chỉ cần domain nằm trong "Authorized JavaScript origins" của Google Cloud
Console (đã cấu hình sẵn cho cả 3 domain). Server verify ID token bằng `google-auth-library`, map
email đã xác thực vào bảng `public.profiles` có sẵn (đã migrate từ Supabase), phát hành JWT phiên
riêng (7 ngày, theo FR-006) lưu trong cookie `httpOnly`.

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20, Next.js 16 (App Router)

**Primary Dependencies**: `google-auth-library` (verify Google ID token — mới thêm),
`jsonwebtoken` (ký/verify JWT phiên — mới thêm), `pg` (Postgres client — mới thêm), Next.js
route handlers + middleware (đã có)

**Storage**: PostgreSQL 15 tự host trên VPS (Docker, `DATABASE_URL`) — bảng `public.profiles`
đã tồn tại từ lúc migrate dữ liệu Supabase (xem `conver/1.plan.md` mục 4); không tạo bảng session
riêng (JWT stateless, xem research.md mục 2).

**Testing**: Repo hiện chưa có test framework (không có jest/vitest trong `package.json`). Theo
quy ước sẵn có của dự án (script kiểm tra thủ công kiểu `check-payos-config.js`), thêm 1 script
verify thủ công cho luồng đăng nhập thay vì đưa cả framework test mới vào chỉ cho 1 feature —
xem research.md mục 5.

**Target Platform**: Linux server (Docker trên VPS), trình duyệt web (Chrome/Safari/Edge hiện đại
hỗ trợ Google Identity Services)

**Project Type**: Web app — Next.js full-stack đơn project (App Router: page + API route trong
cùng codebase), không tách frontend/backend riêng

**Performance Goals**: Hoàn tất đăng nhập dưới 10 giây (SC-002)

**Constraints**: Phiên hết hạn sau 7 ngày (FR-006); không còn phụ thuộc Supabase Auth dưới bất kỳ
hình thức nào (Constitution Principle III); phải chạy đúng như nhau trên cả
`sheetapp.luyenthiccxd.com`, `sheetapp.io.vn`, `www.sheetapp.io.vn`, `tnsoft.store`,
`www.tnsoft.store` mà không cần đăng ký riêng từng domain ở nơi nào ngoài Google Console.

**Scale/Scope**: Toàn bộ user đã có (migrate từ Supabase), traffic thấp-trung bình (web bán
khoá học/dịch vụ), 1 instance Postgres.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Nguyên tắc | Đánh giá |
|---|---|
| I. Self-Hosted Data Ownership | PASS — auth đọc/ghi qua `pg` + `DATABASE_URL`, không import `@supabase/supabase-js` cho auth nữa. |
| II. Application-Layer Authorization | Feature này chỉ dựng **danh tính đã xác thực** (ai đang đăng nhập là ai) + helper `getCurrentUser()` dùng chung; việc "ai được làm gì" với từng loại dữ liệu là phạm vi spec CRUD kế tiếp — không vi phạm, chỉ cung cấp nền tảng. |
| III. Custom Google OAuth & JWT Sessions | PASS — đúng mục tiêu feature: GIS + JWT tự phát hành, không Supabase Auth. |
| IV. Secrets Never Committed | PASS — `JWT_SECRET`, `GOOGLE_CLIENT_SECRET` chỉ nằm trong `.env` VPS / không commit; `GOOGLE_CLIENT_ID` là public-safe (dùng ở client). |
| V. CI/CD via GitHub Actions | N/A trực tiếp — pipeline đã có (Dockerfile/workflow); feature này chỉ cần thêm biến môi trường vào `.env` VPS thủ công (không qua Git). |
| VI. Migration Integrity & Verification | Trước khi implement: xác nhận bảng `public.profiles` trên Postgres VPS đã có dữ liệu đúng (đối chiếu lại row count theo quy trình đã làm ở `conver/1.plan.md` mục 4) — thêm vào research.md như điều kiện tiên quyết, không giả định. |

Không có vi phạm cần biện minh trong Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-custom-google-auth/
├── plan.md              # File này
├── research.md          # Phase 0
├── data-model.md         # Phase 1
├── quickstart.md         # Phase 1
├── contracts/            # Phase 1
│   └── auth-api.md
└── tasks.md              # Phase 2 (/speckit-tasks, chưa tạo)
```

### Source Code (repository root)

**Structure Decision**: Web app đơn project (Next.js App Router), không tách frontend/backend.
Thêm thư mục `lib/auth/` cho logic xác thực mới, `lib/db.ts` cho Postgres client dùng chung
(feature CRUD sau này sẽ tái sử dụng), 2 API route mới, sửa `app/login/page.tsx` và xoá
`app/auth/callback/` (không còn cần callback route vì GIS không redirect).

```text
app/
├── login/
│   └── page.tsx                 # SỬA: thay supabase.auth.signInWithOAuth bằng nút Google Identity Services
├── api/
│   └── auth/
│       ├── google/route.ts      # MỚI: POST — nhận id_token, verify, tạo/khớp profile, set cookie JWT
│       ├── logout/route.ts      # MỚI: POST — xoá cookie session
│       └── me/route.ts          # MỚI: GET — trả user hiện tại từ cookie (dùng cho client biết trạng thái đăng nhập)
├── auth/callback/                # XOÁ: không còn cần (GIS không dùng redirect/hash)

lib/
├── db.ts                         # MỚI: pg Pool dùng chung (DATABASE_URL)
├── auth/
│   ├── google.ts                 # MỚI: verify Google ID token (google-auth-library)
│   ├── session.ts                # MỚI: sign/verify JWT phiên, đọc/ghi cookie httpOnly
│   ├── get-current-user.ts       # MỚI: helper server-side (API route/Server Component) lấy user đã xác thực
│   ├── use-current-user.ts       # MỚI: hook client-side gọi GET /api/auth/me — thay 8 chỗ đang gọi supabase.auth.getSession() rải rác
│   └── client-signout.ts         # MỚI: helper client gọi POST /api/auth/logout — thay 5 chỗ đang gọi supabase.auth.signOut() rải rác
├── supabase.ts                   # XOÁ sau khi không còn nơi nào import (client-side Supabase)
├── supabase-server.ts            # GIỮ tạm (còn dùng ở checkout/webhook/products — thuộc phạm vi spec CRUD kế tiếp)

middleware.ts                     # SỬA: thêm kiểm tra cookie session cho route cần đăng nhập (giữ nguyên phần rate limit đã có)
```

**Toàn bộ điểm chạm Supabase Auth hiện có cần chuyển** (grep thật trên repo, 2026-07-02):
`app/login/page.tsx` (2 chỗ `signInWithOAuth`), `app/auth/callback/AuthLogic.tsx` (xoá cả file),
`app/profile/page.tsx`, `app/update-password/page.tsx` (đăng nhập chỉ qua Google → trang đổi mật
khẩu không còn áp dụng, cần quyết định ẩn/xoá — xem US2), `app/checkout/page.tsx`,
`components/Navbar.tsx`, `components/MobileHeader.tsx`, `components/CourseTabs.tsx`,
`components/mobile/CategoriesView.tsx`, `components/profile/ProfileDesktop.tsx`,
`components/profile/ProfileMobile.tsx`, **`context/CartContext.tsx`** (bỏ sót lần grep đầu, grep
lại phạm vi toàn repo 2026-07-02 mới ra). Ngoài ra `lib/supabase-server.ts` có hàm `getServerUser()`
dùng `supabaseServer.auth.getUser()` — xác nhận không còn nơi nào gọi (dead code), là logic
Supabase Auth nằm lẫn trong file vốn giữ lại cho mục đích CRUD — xoá riêng hàm này (không xoá cả
file).

## Complexity Tracking

*Không có vi phạm Constitution cần biện minh.*
