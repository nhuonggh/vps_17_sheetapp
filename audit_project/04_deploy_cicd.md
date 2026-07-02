# Audit — Vận hành, Deploy, CI/CD (Docker + Caddy + GitHub Actions)

## 1. Dockerfile (30 dòng)

- Base image: `node:20-alpine`, 3 stage (`deps` → `builder` → `runner`).
- **Non-root user**: có — tạo group `nodejs` (gid 1001), user `nextjs` (uid 1001), `USER nextjs`
  trước `CMD` (l.19-20, 26). Đúng chuẩn.
- **Secret không lọt vào layer**: không `ARG`/`ENV` secret nào set cứng trong Dockerfile, `.env`
  không được COPY (bị loại ở `.dockerignore`). Secret runtime truyền qua `--env-file` lúc
  `docker run` trên VPS, không bake vào image — đúng pattern.
  - Lưu ý nhỏ: stage `builder` `COPY . .` (l.9) đưa toàn bộ build context (trừ những gì
    `.dockerignore` loại) vào BuildKit/GHA cache — layer cuối chỉ giữ `public`,
    `.next/standalone`, `.next/static` (l.22-24) nên image runtime sạch, nhưng cache build vẫn chứa
    dữ liệu build context đầy đủ.
- Khớp `output: 'standalone'` (`next.config.ts:4`) — copy đúng `.next/standalone` +
  `.next/static`, chạy `node server.js` (l.29). Pattern tối ưu, đúng chuẩn.

## 2. `.github/workflows/deploy.yml` (55 dòng)

- Trigger: `push` vào `main` + `workflow_dispatch`. **Không có** trigger PR/staging, không path
  filter.
- Build: checkout → Buildx → login registry (`docker/login-action@v3`, dùng
  `REGISTRY_URL`/`REGISTRY_USER`/`REGISTRY_PASS`) → `docker/build-push-action@v6`, push 2 tag
  (`:${{ github.sha }}` và `:latest`), cache GHA.
- SSH VPS: `appleboy/ssh-action@v1.2.0`, auth bằng `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` (private
  key, không password).
- Script chạy trên VPS (l.42-54): `docker login` lại (l.43, dùng lại
  `REGISTRY_USER`/`REGISTRY_PASS` trong script SSH) → `docker pull :latest` → `docker stop
  sheetapp || true` / `docker rm sheetapp || true` → `docker run -d --name sheetapp --restart
  always --network pgnet -p 3017:3000 --env-file /home/deploy_sheetapp/app/.env ...:latest` →
  `docker image prune -f`.
- 6 secret dùng đúng tên, đúng mục đích, không hardcode giá trị trong yml: `REGISTRY_URL`,
  `REGISTRY_USER`, `REGISTRY_PASS`, `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.
- **Không có healthcheck/rollback**: không `HEALTHCHECK` trong Dockerfile, không bước curl/smoke
  test sau khi start container mới, không rollback về image cũ nếu container mới crash. Container
  cũ bị stop/remove **trước khi** xác nhận container mới chạy được (l.45-46 chạy trước l.47) →
  downtime chắc chắn khi deploy, và không tự phục hồi khi deploy lỗi.
- Không có tham chiếu Vercel nào trong workflow — sạch.

## 3. `docker-compose.yml` — không tồn tại

Không có file compose nào trong repo. Khớp với cách vận hành tay bằng `docker run` mô tả trong
`roadmaps/0.first_install.md` và `roadmaps/1.setup_sheetappai.md`. Cấu hình Caddy/Postgres không
nằm trong repo này (setup trực tiếp trên VPS, ngoài version control) — nghĩa là **không có bản ghi
khai báo (declarative) nào của toàn hệ thống** (app + Postgres + Caddy) để tái tạo lại VPS từ đầu
ngoài các file `roadmaps/*.md` (chứa lệnh tay + secret thật, xem file 01).

## 4. `vercel.json` — tàn dư, xem [01_supabase_tan_du.md §5](01_supabase_tan_du.md#5-vercel-json--readme-md--tàn-dư-hosting-cũ-không-phải-supabase-nhưng-cùng-nhóm-dọn-dẹp-sau-migrate)

## 5. `.dockerignore` / `.gitignore` — thiếu loại trừ `roadmaps/`

**`.dockerignore`** (10 dòng): `node_modules`, `.next`, `.git`, `.env`, `.env.*`, `conver`, `specs`,
`.claude`, `.specify`, `*.md`, `npm-debug.log*`.

**`.gitignore`** (41 dòng, phần liên quan): loại `/node_modules`, `/.next/`, `.env*`, `.env.*`,
`.vercel`, `*.tsbuildinfo`, `next-env.d.ts`, log files.

Kiểm tra độ phủ:
- `.env` — loại đúng ở cả hai file, xác nhận không bị `git ls-files` track. OK.
- `node_modules`, `.next` — loại đúng cả hai. OK.
- **`roadmaps/` — KHÔNG bị loại ở cả hai file.** Đây là vấn đề nghiêm trọng nhất của toàn bộ audit
  (xem [01_supabase_tan_du.md §7](01_supabase_tan_du.md#7-rò-rỉ-secret-thật-nghiêm-trọng-nhất-không-phải-tàn-dư-supabase-nhưng-phát-hiện-trong-lúc-audit-cùng-nhóm-file-lịch-sử-migrate)):
  thư mục chứa secret thật, hiện untracked chỉ vì chưa ai chạy `git add`, và cũng không bị loại khỏi
  Docker build context.
- `*.sql` dump — không bị loại ở cả hai file, nhưng các `.sql` đang track là migration/schema script
  (không phải data dump chứa secret) — chấp nhận được, nên rà thêm 1 lượt xem có connection string
  nào lọt vào comment SQL không (chưa audit sâu phần này).
- `.claude`, `.specify`, `specs`, `conver`, `*.md` — chỉ loại khỏi Docker context, vẫn track git —
  đúng ý đồ (docs cần lưu git nhưng không cần trong runtime image).

## 6. `GIT_PUSH_GUIDE.md` — không có branching strategy

Quy trình tài liệu hoá: `git status` → `git add .` (stage **toàn bộ**, kể cả file mới chưa review
như `roadmaps/`) → `git commit` → `git push origin main`. Có cả hướng dẫn force-push
(`git push -f origin main`, kèm cảnh báo "CAREFUL!"). **Không có nhánh feature/PR review nào** —
mọi push đi thẳng `main`, và `main` chính là branch trigger deploy production tự động
(`deploy.yml:3-5`). Kết hợp với `git add .`, quy trình này **không có lớp chặn nào** ngăn một lần
`git add .` vô ý đẩy `roadmaps/` (hoặc file secret khác) thẳng vào lịch sử git rồi build production
ngay lập tức.

## 7. `README.md` / `CLAUDE.md`

- `README.md`: nguyên bản boilerplate `create-next-app`, còn mục "Deploy on Vercel" — chưa cập nhật
  để mô tả deploy thật (Docker/Caddy/VPS/GitHub Actions), không có hướng dẫn env var cần thiết.
- `CLAUDE.md`: chỉ trỏ tới `specs/001-custom-google-auth/plan.md`, không dính Supabase/Vercel.

## SECURITY CONCERNS — tổng hợp ưu tiên

1. **`roadmaps/` chứa secret thật, chưa bị `.gitignore`/`.dockerignore` loại trừ** — vi phạm trực
   tiếp Constitution Principle IV. Hành động: thêm vào cả 2 ignore file NGAY, rotate toàn bộ secret
   đã từng nằm trong 3 file này (SSH key, DB password, Google Client Secret, registry password) vì
   không chắc đã từng bị xem/copy ra ngoài hay chưa.
2. **Không có branch/PR gate trước khi deploy production** — mọi push `main` tự động build & deploy,
   không CI test gate, không review bắt buộc, quy trình chính thức khuyến khích `git add .` và có
   sẵn hướng dẫn force-push.
3. **Không healthcheck/rollback khi deploy** — VPS dừng container cũ trước khi xác nhận container
   mới sống được; deploy lỗi = downtime, không tự phục hồi.
4. **`docker login` lặp lại trên VPS bằng script SSH** (l.43) — pattern chuẩn nhưng nên xác nhận
   `REGISTRY_PASS` là token có scope giới hạn, không phải mật khẩu root registry, và
   `~/.docker/config.json` trên VPS không lưu credential rộng hơn cần thiết.
5. **`vercel.json`, mục Vercel trong `README.md`** — mức độ thấp nhưng nên xoá để tránh hiểu nhầm
   deploy target.
6. **Không có secret-scanning/pre-commit hook** (không thấy `.pre-commit-config.yaml`, gitleaks,
   trufflehog...) để tự động chặn kiểu rò rỉ như phát hiện #1 trước khi nó vào git.
