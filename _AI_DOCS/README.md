# 📚 AI Documentation - SheetApp Project

> **Mục đích**: Tài liệu tham khảo đầy đủ cho AI/Developer để hiểu toàn bộ dự án SheetApp

---

## 📁 Danh sách Tài liệu

### 1. **Technical Context Summary** (`01_Technical_Context_Summary.md`)
- **Nội dung**: Tóm tắt ngữ cảnh kỹ thuật chi tiết của toàn bộ dự án
- **Bao gồm**:
  - Project Overview (Mục tiêu, luồng vận hành)
  - Tech Stack & Architecture (Next.js 16, Supabase, TypeScript)
  - Folder Structure (Giải thích từng thư mục)
  - Core Logic & Functions (Auth, Cart, Filters, Data fetching)
  - Source Code Examples (Base code quan trọng)
  - Current Progress (Features completed/in-progress)
  - Coding Style & Rules (Naming conventions, patterns)
  - Mobile vs PC Layout (Responsive strategy)
- **Sử dụng**: Đọc trước khi làm việc với dự án để hiểu tổng quan

### 2. **Security Audit Report** (`02_Security_Audit_Report.md`)
- **Nội dung**: Báo cáo kiểm toán bảo mật - 18 lỗ hổng nghiêm trọng
- **Bao gồm**:
  - Payment Security (QR Code fraud, Cart manipulation)
  - DDoS & Rate Limiting (Brute force, API flooding)
  - XSS & Injection (Stored XSS, SQL injection risks)
  - Authentication (CSRF, Session timeout, Weak passwords)
  - Data Exposure (Env vars exposed, No RLS)
  - Business Logic (Unlimited access, No order expiration)
  - Infrastructure (No monitoring, No backups)
  - Compliance (Privacy Policy missing)
- **Sử dụng**: Reference khi implement security features

### 3. **Anti-DDoS & Bot Protection** (`03_Anti_DDoS_Bot_Protection.md`)
- **Nội dung**: Kế hoạch chi tiết phòng chống DDoS, spam và bot attacks
- **Bao gồm**:
  - 6 Attack Vectors (Spam login, Review flooding, API queries, Form spam)
  - 10 Protection Solutions (reCAPTCHA, Rate limiting, Honeypot, RLS, IP blocking)
  - Endpoint Protection Matrix (Priority endpoints + configs)
  - Implementation Checklist (4-week roadmap)
  - Testing Scripts (Python scripts để verify protection)
  - Cost Estimate ($0/month với free tiers)
- **Sử dụng**: Follow step-by-step khi implement bot protection

---

## 🎯 Cách sử dụng

### Cho AI Assistant (như tôi):
```
1. Đọc "01_Technical_Context_Summary.md" để hiểu toàn bộ codebase
2. Tham khảo "02_Security_Audit_Report.md" khi implement security fixes
3. Follow "03_Anti_DDoS_Bot_Protection.md" khi setup rate limiting/CAPTCHA
```

### Cho Developer mới:
```
1. Đọc Technical Context Summary để onboard
2. Review Security Audit để aware về các risks
3. Implement protection theo Anti-DDoS guide
```

---

## 📊 Metrics

| Document | Pages | Complexity | Priority |
|----------|-------|------------|----------|
| Technical Context | ~25 | Medium | ⭐⭐⭐⭐⭐ Must Read |
| Security Audit | ~15 | High | 🔴 Critical |
| Anti-DDoS Protection | ~20 | High | 🔴 Critical |

---

## 🚀 Quick Start

**Nếu AI đọc lần đầu:**
1. ✅ Đọc `01_Technical_Context_Summary.md` (30 phút)
2. ✅ Skim `02_Security_Audit_Report.md` (phần Executive Summary)
3. ✅ Note các lỗ hổng CRITICAL cần fix

**Nếu cần implement tính năng:**
1. Check Technical Context xem pattern hiện tại
2. Check Security Audit xem có lỗ hổng liên quan không
3. Implement theo coding style đã define

---

## 📝 Notes

- Tài liệu được tạo: 2026-01-08
- Last updated: 2026-01-08
- Version: 1.0
- Maintainer: AI Assistant

**⚠️ QUAN TRỌNG**: 
- Các file này chứa thông tin nhạy cảm về security vulnerabilities
- KHÔNG commit vào public repository
- Thêm `_AI_DOCS/` vào `.gitignore`

---

## 📞 Support

Nếu có câu hỏi về tài liệu:
1. Đọc kỹ phần Executive Summary của từng file
2. Search keyword trong file (Ctrl+F)
3. Hỏi AI assistant với context cụ thể
