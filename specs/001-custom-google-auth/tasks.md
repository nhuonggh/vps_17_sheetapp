# Tasks: Custom Google Sign-In (thay thế Supabase Auth)

**Input**: Design documents từ `/specs/001-custom-google-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.md, quickstart.md

**Tests**: Không có framework test tự động trong repo (research.md mục 5) — dùng verify thủ công
theo quickstart.md thay cho task test tự động.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: chạy song song được (khác file, không phụ thuộc task chưa xong)
- **[Story]**: US1/US2/US3 map theo spec.md

---

## Phase 1: Setup

- [X] T001 Cài package mới: `npm install google-auth-library jsonwebtoken pg` +
      `npm install -D @types/jsonwebtoken @types/pg` (theo quickstart.md)
- [X] T002 Thêm `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<giống GOOGLE_CLIENT_ID>` vào `.env` local
- [ ] T003 Thêm `NEXT_PUBLIC_GOOGLE_CLIENT_ID` vào `.env` production trên VPS
      (`/home/deploy_sheetapp/app/.env`) — thao tác thủ công trên VPS, không qua Git —
      **KHÔNG tự làm được, không có quyền SSH vào VPS từ môi trường này, cần bạn tự thực hiện**

**Checkpoint**: Deps sẵn sàng, không code gì ở phase này.

---

## Phase 2: Foundational (Blocking — bắt buộc xong trước mọi User Story)

**⚠️ CRITICAL**: Không bắt đầu US1/US2/US3 tới khi phase này xong.

- [X] T004 [P] Tạo `lib/db.ts` — Postgres `Pool` dùng chung từ `DATABASE_URL`, export hàm
      `query<T>(text, params)` tối giản (research.md mục 3)
- [X] T005 [P] Tạo `lib/auth/google.ts` — hàm `verifyGoogleIdToken(idToken: string)` dùng
      `google-auth-library` `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`,
      trả về `{ email, email_verified, name, picture }` hoặc throw nếu không hợp lệ (FR-002)
- [X] T006 [P] Tạo `lib/auth/session.ts` — `signSession(payload)` (jsonwebtoken, HS256,
      `JWT_SECRET`, `expiresIn: '7d'` — FR-006), `verifySession(token)` (throw nếu sai chữ ký/hết
      hạn), hằng số tên cookie `SESSION_COOKIE = 'session'`
- [X] T007 [US-shared] Tạo `lib/auth/get-current-user.ts` — đọc cookie `session` từ
      `Request`/`cookies()` (Next.js), gọi `verifySession`, trả `null` nếu thiếu/sai/hết hạn thay
      vì throw (dùng được thẳng trong API route/Server Component) — phụ thuộc T004, T006
- [X] T008 [P] Tạo `lib/auth/use-current-user.ts` — client hook `useCurrentUser()`: gọi
      `GET /api/auth/me`, trả `{ user, loading }`, dùng chung cho mọi component thay vì gọi
      `supabase.auth.getSession()` (thay 8 chỗ liệt kê ở plan.md)
- [X] T009 [P] Tạo `lib/auth/client-signout.ts` — hàm `signOut()`: `fetch('/api/auth/logout', {
      method: 'POST' })` rồi reload/redirect — dùng chung thay 5 chỗ gọi `supabase.auth.signOut()`

**Checkpoint**: Có đủ hạ tầng auth (verify Google, ký/verify JWT, đọc user hiện tại cả server lẫn
client) để bắt đầu US1.

---

## Phase 3: User Story 1 — Người dùng hiện tại đăng nhập lại bằng Google (P1) 🎯 MVP

**Goal**: Đăng nhập Google hoạt động trên mọi domain, khớp đúng hồ sơ cũ, trang yêu cầu đăng nhập
hiển thị bình thường sau khi đăng nhập (spec.md US1).

**Independent Test**: Đăng nhập bằng 1 tài khoản Google đã có trong `profiles` (email khớp), xác
nhận vào đúng hồ sơ cũ (không tạo trùng), mở `/profile` thấy dữ liệu bình thường.

### Implementation

- [X] T010 [US1] Tạo `app/api/auth/google/route.ts` — `POST`: nhận `{ id_token }`, gọi
      `verifyGoogleIdToken` (T005); nếu `email_verified !== true` → 401 `invalid_google_token`
      (FR-002); `SELECT id, role FROM profiles WHERE email = $1`; nếu có → dùng lại; nếu không →
      `INSERT INTO profiles (id, email, name, full_name, avatar_url, role, created_via) VALUES
      (gen_random_uuid(), $1, $2, $2, $3, 'customer', 'google')` (FR-003, data-model.md); ký JWT
      (T006) với `{ sub: profile.id, email, role: profile.role }`; `Set-Cookie` httpOnly/secure/
      SameSite=Lax/Max-Age=604800 (FR-004, FR-006); trả `{ user }` (contracts/auth-api.md)
- [X] T011 [US1] Tạo `app/api/auth/me/route.ts` — `GET`: dùng `get-current-user.ts` (T007), trả
      `{ user }` hoặc `{ user: null }` (contracts/auth-api.md)
- [X] T012 [US1] Sửa `app/login/page.tsx` — bỏ 2 chỗ `supabase.auth.signInWithOAuth`, thêm nút
      "Đăng nhập bằng Google" dùng Google Identity Services JS SDK (script
      `https://accounts.google.com/gsi/client`, `google.accounts.id.initialize({ client_id:
      NEXT_PUBLIC_GOOGLE_CLIENT_ID, callback })`), callback nhận `credential` (ID token) →
      `POST /api/auth/google` → nếu 200 thì `router.push('/')`, nếu 401 hiện thông báo lỗi rõ
      ràng (Edge Case: "Google trả lỗi/gián đoạn")
- [X] T013 [US1] Xoá `app/auth/callback/` (cả `page.tsx` và `AuthLogic.tsx`) — không còn cần
      callback route vì GIS không redirect
- [X] T014 [US1] Sửa `app/profile/page.tsx` — thay `supabase.auth.getSession()` bằng
      `useCurrentUser()` (T008); nếu `user === null` sau khi load xong → redirect `/login`
- [X] T015 [US1] Sửa `components/Navbar.tsx` — thay `supabase.auth.getSession()` +
      `onAuthStateChange` bằng `useCurrentUser()` (T008)
- [X] T016 [US1] Sửa `components/MobileHeader.tsx` — thay `supabase.auth.getSession()` bằng
      `useCurrentUser()` (T008)
- [X] T017 [P] [US1] Sửa `components/CourseTabs.tsx` — thay `supabase.auth.getSession()` bằng
      `useCurrentUser()` (T008)
- [X] T018 [P] [US1] Sửa `components/mobile/CategoriesView.tsx` — thay
      `supabase.auth.getSession()` bằng `useCurrentUser()` (T008) (phần signOut xử lý ở US2/T023)
- [X] T019 [US1] Sửa `app/checkout/page.tsx` — thay `supabase.auth.getSession()` bằng
      `useCurrentUser()` (T008)
- [X] T019b [P] [US1] Sửa `context/CartContext.tsx:70` — thay `supabase.auth.getSession()` bằng
      `useCurrentUser()` (T008) (bỏ sót lần audit đầu — phát hiện khi grep lại toàn repo)
- [~] T020 [US1] Verify thủ công theo quickstart.md bước 1-3 — **verify được phần máy làm được**:
      build Docker thật + container chạy, `GET /api/auth/me` không cookie → `{user:null}` đúng,
      `POST /api/auth/google` token rác → 401 đúng. **CHƯA verify được**: luồng đăng nhập Google
      thật qua trình duyệt (cần tài khoản Google thật + browser, không có công cụ nào ở đây làm
      được) — bạn cần tự bấm thử nút "Đăng nhập bằng Google" trên `/login` sau khi deploy

**Checkpoint**: US1 chạy độc lập được — đăng nhập, xem hồ sơ, không phụ thuộc US2/US3.

---

## Phase 4: User Story 2 — Đăng xuất và phiên hết hạn an toàn (P2)

**Goal**: Đăng xuất vô hiệu phiên ngay lập tức; phiên tự hết hạn sau 7 ngày (spec.md US2).

**Independent Test**: Đăng xuất → truy cập `/profile` bị chuyển hướng `/login`. Sửa tạm JWT hết
hạn (hoặc chờ) → truy cập bị từ chối tương tự.

### Implementation

- [X] T021 [US2] Tạo `app/api/auth/logout/route.ts` — `POST`: `Set-Cookie: session=;
      Max-Age=0; Path=/`, trả `{ success: true }` (contracts/auth-api.md, FR-005)
- [X] T022 [US2] Sửa `components/profile/ProfileDesktop.tsx` và
      `components/profile/ProfileMobile.tsx` — thay `supabase.auth.signOut()` bằng `signOut()`
      (T009)
- [X] T023 [US2] Sửa nút đăng xuất còn lại trong `components/Navbar.tsx`,
      `components/MobileHeader.tsx`, `components/mobile/CategoriesView.tsx` — thay
      `supabase.auth.signOut()` bằng `signOut()` (T009)
- [X] T024 [US2] Quyết định `app/update-password/page.tsx`: đăng nhập giờ chỉ qua Google (không
      còn mật khẩu nội bộ) → route này không còn áp dụng được. THỰC HIỆN: T012 đã viết lại
      `app/login/page.tsx` bỏ hẳn toàn bộ UI email/mật khẩu/đăng ký/quên mật khẩu (không chỉ
      Facebook) — không còn nút "Quên mật khẩu?" nào trỏ tới `/update-password` nữa, lối vào duy
      nhất đã bị gỡ mà không cần sửa thêm gì trong `update-password/page.tsx`. Route vẫn còn (không
      xoá, tránh 404 cho bookmark cũ) nhưng unreachable từ UI.
- [X] T025 [US2] Verify thủ công theo quickstart.md bước 4: `curl -i -X POST
      /api/auth/logout` trong container Docker thật → xác nhận header
      `Set-Cookie: session=; Path=/; Max-Age=0` đúng như mong đợi

**Checkpoint**: US1 + US2 cùng chạy được — đăng nhập, xem hồ sơ, đăng xuất, phiên hết hạn đúng
hạn.

---

## Phase 5: User Story 3 — Truy cập trái phép bị chặn nhất quán (P3)

**Goal**: Request không có phiên hợp lệ (thiếu/hết hạn/giả mạo) tới route được bảo vệ luôn bị từ
chối (spec.md US3, FR-007).

**Independent Test**: Gọi thẳng route được bảo vệ bằng `curl` không kèm cookie → 401. Sửa 1 ký tự
trong JWT hợp lệ rồi gọi lại → vẫn 401.

### Implementation

- [X] T026 [US3] Tạo helper `requireAuth()` trong `lib/auth/get-current-user.ts` (bổ sung cạnh
      `getCurrentUser`) — trả về user hoặc ném lỗi 401 chuẩn hoá, dùng ở đầu mọi API route cần
      đăng nhập
- [X] T027 [US3] Áp `requireAuth()` vào `app/api/auth/me/route.ts` không áp — route này CHỦ Ý cho
      gọi không cần đăng nhập (trả `null` thay vì 401) để client biết trạng thái; ghi rõ comment
      giải thích lý do khác biệt so với các route khác
- [X] T028 [US3] Thêm log lỗi xác thực thất bại (FR-010) trong `lib/auth/get-current-user.ts` —
      `console.error` kèm lý do (thiếu cookie / hết hạn / sai chữ ký), không log giá trị token
- [X] T029 [US3] Verify thủ công theo quickstart.md bước 6: `curl -X POST /api/auth/google -d
      '{"id_token":"garbage"}'` trong container Docker thật → xác nhận `HTTP 401
      {"error":"invalid_google_token"}` nhất quán

**Checkpoint**: Cả 3 user story chạy độc lập, đúng spec.md.

---

## Phase 6: Polish & Cross-Cutting

- [X] T029b Xoá hàm `getServerUser()` trong `lib/supabase-server.ts` (dòng ~44-67) — dead code
      xác nhận không còn nơi nào gọi (`grep -r "getServerUser"` chỉ ra chính file định nghĩa),
      là logic Supabase Auth còn sót trong file vốn giữ lại cho mục đích CRUD (không xoá cả file,
      chỉ xoá hàm này + phần comment liên quan)
- [ ] T030 Xoá `lib/supabase.ts` SAU KHI xác nhận không còn file nào import (`grep -r "from
      '@/lib/supabase'"` phải chỉ còn ra `lib/supabase-server.ts`-liên-quan, không còn client-side
      nào) — nếu vẫn còn chỗ dùng ngoài phạm vi auth (vd. `components/ProductList.tsx`,
      `components/BookingModal.tsx`, `components/ConsultationModal.tsx`) thì GIỮ LẠI, vì đó thuộc
      phạm vi spec CRUD kế tiếp, không xoá vội làm gãy trang khác
- [ ] T031 Gỡ `@supabase/supabase-js` khỏi `package.json` CHỈ KHI T030 xác nhận không còn import
      nào trong toàn repo (kể cả `lib/supabase-server.ts` và các route CRUD — nếu còn thì để lại
      cho spec CRUD xử lý)
- [X] T032 Chạy `docker build` thật (Linux, không phải Windows local — xem lý do ở lịch sử CI
      trước đó) → build thành công, `docker run` smoke test → homepage 200,
      `/api/auth/me` không cookie → `{user:null}`, `/api/auth/google` token rác → 401,
      `/api/auth/logout` → xoá cookie đúng. Đã dọn container/image test sau khi xong.
- [ ] T033 Verify thủ công theo quickstart.md bước 5: deploy, thử đăng nhập/đăng xuất trên cả 3
      domain (`sheetapp.luyenthiccxd.com`, `sheetapp.io.vn`, `tnsoft.store`) — không domain nào
      lỗi (SC-001, SC-003) — **KHÔNG tự làm được, cần deploy thật lên VPS (phụ thuộc T003) rồi
      bạn tự bấm thử trên trình duyệt thật với tài khoản Google thật**

---

## Dependencies & Execution Order

- **Setup (Phase 1)**: không phụ thuộc gì, làm trước
- **Foundational (Phase 2)**: phụ thuộc Setup — CHẶN toàn bộ User Story
- **US1 (Phase 3)**: phụ thuộc Foundational — không phụ thuộc US2/US3
- **US2 (Phase 4)**: phụ thuộc Foundational; T022/T023 phụ thuộc T021; có thể làm song song US1
  nếu 2 người, nhưng US1 nên xong trước vì US2 cần luồng đăng nhập hoạt động để test đăng xuất
- **US3 (Phase 5)**: phụ thuộc Foundational (đặc biệt T007); độc lập với US1/US2 về code nhưng
  nên làm sau cùng vì cần route thật để test 401
- **Polish (Phase 6)**: sau khi US1+US2+US3 xong

### Parallel Opportunities

- T004, T005, T006 (Phase 2) chạy song song — khác file, không phụ thuộc nhau
- T008, T009 (Phase 2) chạy song song sau khi T007 xong
- T017, T018 (Phase 3) chạy song song — khác file
- Trong Phase 3: T010 (API route) và T012 (login page) có thể làm song song, nhưng T012 cần
  T010 xong mới test được end-to-end

---

## Implementation Strategy

### MVP trước (chỉ US1)

1. Setup + Foundational (Phase 1-2)
2. US1 (Phase 3) — đăng nhập chạy được, xem hồ sơ được
3. **DỪNG lại verify T020** trước khi làm tiếp US2/US3
4. Deploy thử, xác nhận sửa đúng bug gốc (login rơi hash trên `sheetapp.io.vn`)

### Giao dần

1. Setup + Foundational
2. US1 → verify độc lập → có thể deploy (MVP — sửa được bug chính đang gặp)
3. US2 → verify độc lập → deploy
4. US3 → verify độc lập → deploy
5. Polish (dọn Supabase client cũ, xác nhận build sạch, verify đa domain)

---

## Notes

- Không có task test tự động (research.md mục 5) — mọi "verify" task đều là thao tác thủ công
  theo quickstart.md, PHẢI thực hiện thật trước khi đánh dấu task đó xong, không suy đoán.
- `lib/supabase-server.ts` và các route dùng nó (checkout/webhook/products) **KHÔNG đụng tới**
  trong feature này — thuộc phạm vi spec CRUD kế tiếp (Constitution: mỗi phần migrate là 1 spec
  riêng).
- Commit sau mỗi task hoặc nhóm task liên quan, không gộp tất cả vào 1 commit khổng lồ.
