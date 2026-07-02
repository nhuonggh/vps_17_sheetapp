# Quickstart: Custom Google Sign-In

## Trước khi bắt đầu code

1. Xác nhận `public.profiles` đã có dữ liệu trên Postgres VPS (research.md mục 4):
   ```bash
   docker exec -i postgres_sheetapp psql -U sheetapp_user -d sheetapp_db -c "SELECT count(*) FROM public.profiles;"
   ```
   Nếu 0 hoặc lỗi bảng không tồn tại → dừng, quay lại `conver/1.plan.md` mục 4 (migrate dữ liệu)
   trước.

2. Google Cloud Console → Credentials → xác nhận "Authorized JavaScript origins" đã có đủ:
   `https://sheetapp.luyenthiccxd.com`, `https://sheetapp.io.vn`, `https://www.sheetapp.io.vn`,
   `https://tnsoft.store`, `https://www.tnsoft.store`, `http://localhost:3000` (đã hướng dẫn ở
   phần trước — chỉ xác nhận lại).

## Biến môi trường cần thêm

`.env` hiện đã có `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `DATABASE_URL`. Cần
thêm 1 biến mới — bản public (client-side) của Client ID để Google Identity Services JS SDK dùng
trên trình duyệt (Client ID không phải bí mật, an toàn để lộ ra client, khác với
`GOOGLE_CLIENT_SECRET`):

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<giá trị giống GOOGLE_CLIENT_ID>
```

Thêm vào cả `.env` local và `.env` production trên VPS (`/home/deploy_sheetapp/app/.env`).

## Package mới cần cài

```bash
npm install google-auth-library jsonwebtoken
npm install -D @types/jsonwebtoken
npm install pg
npm install -D @types/pg
```

## Verify thủ công sau khi implement (thay test tự động — xem research.md mục 5)

1. Chạy local (`npm run dev`), mở `/login`, đăng nhập bằng nút Google.
2. Kiểm tra DevTools → Application → Cookies: có cookie `session`, `HttpOnly`, hạn ~7 ngày.
3. Gọi `GET /api/auth/me` — phải trả đúng user vừa đăng nhập.
4. Đăng xuất → cookie bị xoá → `GET /api/auth/me` trả `{ "user": null }`.
5. Deploy lên VPS, lặp lại bước 1-4 trên cả 3 domain: `sheetapp.luyenthiccxd.com`,
   `sheetapp.io.vn`, `tnsoft.store` — không domain nào được lỗi (SC-001, SC-003).
6. Thử request tới 1 API route được bảo vệ mà không có cookie `session` → phải bị từ chối
   (FR-007).
