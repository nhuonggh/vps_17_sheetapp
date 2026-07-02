# SheetApp

Next.js 16 (App Router) + PostgreSQL 15 tự host trên VPS + Google OAuth2/JWT tự code. Không dùng
Supabase, không deploy Vercel.

## Getting Started (local dev)

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

Cần file `.env` ở root (không commit, xem `.gitignore`) với các biến:

```env
NODE_ENV=development
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<db>
JWT_SECRET=<random secret, vd: openssl rand -base64 32>
GOOGLE_CLIENT_ID=<google oauth client id>
GOOGLE_CLIENT_SECRET=<google oauth client secret>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same as GOOGLE_CLIENT_ID>
```

## Kiến trúc & vận hành

- **Database**: PostgreSQL 15 chạy Docker trên VPS (`postgres_sheetapp`), truy cập qua
  `DATABASE_URL`, client là `pg` (node-postgres) — xem `lib/db.ts`.
- **Auth**: Google Identity Services (ID token) → verify bằng `google-auth-library` → tự ký JWT
  (`JWT_SECRET`) → cookie `session` (httpOnly). Không dùng Supabase Auth. Xem
  `lib/auth/`, `app/api/auth/`.
- **Authorization**: kiểm tra quyền ở tầng application (mỗi API route tự gọi `requireAuth()` +
  lọc theo `user.id` từ session đã verify), thay cho Supabase RLS đã gỡ bỏ.
- **Reverse proxy**: Caddy trên VPS, 1 site block/domain.
- **Deploy**: Docker + GitHub Actions — push `main` → build image → push registry riêng → SSH vào
  VPS pull & restart container. Xem `.github/workflows/deploy.yml`, `Dockerfile`.
- Chi tiết đầy đủ + audit bảo mật: xem `audit_project/` và `.specify/memory/constitution.md`.

## Learn More (Next.js)

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
