# 🚀 Git Push Commands

> ⚠️ Push vào `main` tự động build & deploy production (`.github/workflows/deploy.yml`) — không có
> PR/review gate. Kiểm tra kỹ `git status`/`git diff` trước khi commit, đặc biệt các thư mục docs/
> roadmap mới có thể chứa secret (xem `.specify/memory/constitution.md` Principle IV).

## Bước 1: Check Status
```bash
git status
git diff
```

## Bước 2: Add Changes (chỉ định rõ file, không add mù)
```bash
# Add từng file/thư mục đã review — KHÔNG dùng `git add .` khi có file mới chưa chắc chắn
git add path/to/file1 path/to/file2

# Nếu chắc chắn mọi thay đổi đều an toàn (đã đọc qua `git status` phía trên), có thể add all:
git add -A
```

## Bước 3: Commit với Message
```bash
git commit -m "feat: mô tả ngắn gọn thay đổi"
```

## Bước 4: Push to GitHub
```bash
git push origin main
```

Hoặc nếu branch khác:
```bash
git push origin <branch-name>
```

## 🔄 Force push (CAREFUL — ghi đè lịch sử remote)
```bash
# Chỉ dùng khi chắc chắn không ai khác đang dựa vào commit bị ghi đè
git push -f origin main
```

---

## 🔒 Secret scanning trước khi push

Repo có hook `gitleaks` chặn commit chứa secret (SSH key, password, API key...). Cài 1 lần:

```bash
git config core.hooksPath .githooks
```

Nếu chưa có `gitleaks` trên máy, hook sẽ tự bỏ qua và in cảnh báo — cài thêm để bảo vệ đầy đủ:
https://github.com/gitleaks/gitleaks#installing

---

## 🚨 If Git Remote Not Set
```bash
# Check remote
git remote -v

# Add remote if needed
git remote add origin https://github.com/your-username/your-repo.git

# Then push
git push -u origin main
```
