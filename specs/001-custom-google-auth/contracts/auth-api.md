# API Contract: Auth

## POST /api/auth/google

Xác thực đăng nhập Google (FR-001, FR-002, FR-003, FR-004).

**Request**:
```json
{ "id_token": "<Google ID token từ Google Identity Services>" }
```

**Response 200** (thành công — user mới hoặc user cũ):
```json
{ "user": { "id": "uuid", "email": "...", "name": "...", "avatar_url": "...", "role": "..." } }
```
Kèm header `Set-Cookie: session=<jwt>; HttpOnly; Secure; SameSite=Lax; Max-Age=604800; Path=/`

**Response 401** (ID token không hợp lệ / không xác thực được / `email_verified: false`):
```json
{ "error": "invalid_google_token" }
```

**Response 500** (lỗi DB hoặc lỗi hệ thống khác): `{ "error": "internal_error" }`, log chi tiết
phía server (FR-010), không lộ chi tiết lỗi cho client.

---

## POST /api/auth/logout

Đăng xuất (FR-005).

**Request**: không cần body, dựa vào cookie `session` hiện có.

**Response 200**: `{ "success": true }`, kèm header xoá cookie
(`Set-Cookie: session=; Max-Age=0; Path=/`).

---

## GET /api/auth/me

Trả thông tin user hiện tại dựa trên cookie `session` — dùng cho client biết trạng thái đăng
nhập khi tải trang (thay thế `supabase.auth.getSession()` cũ).

**Response 200** (có phiên hợp lệ):
```json
{ "user": { "id": "uuid", "email": "...", "name": "...", "avatar_url": "...", "role": "..." } }
```

**Response 401** (không có cookie / cookie hết hạn / chữ ký sai — FR-007):
```json
{ "user": null }
```
