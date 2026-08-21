# Archived — Google Apps Script + Supabase webhook pipeline (disconnected)

Ngắt tạm thời 2026-08-21. 3 thư mục con (`appcript_web/`, `apps-script/`, `appscipt_final/`)
là code Google Apps Script (`.gs`) cho một luồng nhận webhook PayOS **cũ**, viết ra để ghi
thẳng vào Supabase qua `SupabaseClient.gs`.

Xác nhận trước khi archive:
- Webhook PayOS trên my.payos.vn **không còn trỏ** về URL Apps Script (`script.google.com/macros/...`) nào trong các file này.
- Supabase project không còn dùng cho dự án.
- Webhook PayOS thật hiện tại là `/api/payment/webhook` (Next.js), webhook SePay là `/api/payment/sepay-webhook` — cả hai đều ghi Postgres tự host, không liên quan Supabase.

Giữ lại thư mục này để tham khảo lịch sử/debug cũ, không phải code đang chạy. Xoá hẳn nếu
chắc chắn không cần nữa.
