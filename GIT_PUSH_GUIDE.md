# 🚀 Git Push Commands

## Bước 1: Check Status
```bash
git status
```

## Bước 2: Add All Changes
```bash
git add .
```

## Bước 3: Commit với Message
```bash
git commit -m "feat: Implement PayOS auto-enrollment system

- ✅ Added enrollments and failed_enrollments tables
- ✅ Implemented auto-enrollment logic in lib/auto-enrollment.ts
- ✅ Enhanced webhook handler with email notifications
- ✅ Guest user handling with failed_enrollments logging
- ✅ Fixed payment callback page for production build
- ✅ Added comprehensive testing suite
- ✅ Created detailed documentation

Tested and verified:
- Registered users auto-enroll successfully
- Guest users logged to failed_enrollments
- Ready for production deployment"
```

## Bước 4: Push to GitHub
```bash
git push origin main
```

Hoặc nếu branch khác:
```bash
git push origin <branch-name>
```

## 🔄 Nếu cần force push (CAREFUL!)
```bash
# Only if you know what you're doing
git push -f origin main
```

---

## 📝 Alternative: Shorter Commit Message
```bash
git commit -m "feat: PayOS auto-enrollment - production ready"
```

---

## ✅ Complete Sequence (Copy & Paste)
```bash
# Check changes
git status

# Add all
git add .

# Commit
git commit -m "feat: Implement PayOS auto-enrollment system with testing suite"

# Push
git push origin main
```

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
