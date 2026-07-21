# Audit UI/Frontend

## Mức Cao

**1. `components/pc/CategoriesView.tsx` + `app/categories/page.tsx:85-121` — Bộ lọc desktop hoàn toàn không hoạt động.**
Parent truyền `onUpdateParam`, `onToggleFilter`, `checkCategoryMatch` bằng hàm stub rỗng (`() => {}`, `() => true`). Toàn bộ tab (Online/Zoom/AppSheet/Automation), radio giá, checkbox ngành/công nghệ trên desktop chỉ là UI chết — click không lọc gì. PC chỉ nhận `products.filter(p => p.type === 'course')` nên mục "Dịch vụ" không bao giờ có sản phẩm hiển thị dù tab vẫn hiện. Bản mobile (`components/mobile/CategoriesView.tsx`) có filter logic đầy đủ bằng `useMemo`. Khách dùng máy tính không tìm/lọc được sản phẩm, mất hẳn mảng Dịch vụ.
**Fix**: nối PC view vào cùng state filter thật (giống mobile) thay vì stub.

**2. `components/profile/ProfileDesktop.tsx:22-30,344-389` — Hiển thị dữ liệu giả làm đơn hàng/tài sản thật.**
Tab "Tài sản" và "Lịch sử mua hàng" render `MOCK_ASSETS`/`MOCK_ORDERS` hard-code (đơn `DH001`, `DH002`, 1.500.000đ...) thay vì gọi API. Khách đăng nhập thật trên desktop sẽ thấy đơn hàng/khóa học không phải của họ. `ProfileMobile.tsx` gọi đúng API và hiện empty-state chính xác. Lệch dữ liệu nghiêm trọng giữa 2 bản, ảnh hưởng trực tiếp lòng tin khách hàng.

**3. `components/profile/ProfileDesktop.tsx:391-396` vs `ProfileMobile.tsx` — Thiếu tính năng trên desktop.**
Desktop không có tab Mã giảm giá / Cộng tác viên / Góp ý (mobile có đủ, gọi `/api/coupons`, `/api/profile/affiliate-request`, `/api/feedback`). Tab "Đặt lịch"/"Thông báo" desktop chỉ hiện "Chức năng đang được phát triển..." dù API đã tồn tại và mobile dùng tốt. Khách PC bị mất tính năng so với mobile.

**4. `app/booking/page.tsx:68-84` — Form "Đăng ký tư vấn" không hoạt động.**
`<form>` không có `onSubmit`, input/textarea không có `value`/`onChange`, nút `type="button"` không có `onClick`. Bấm "Gửi yêu cầu" không làm gì — mất lead hoàn toàn. `BookingModal.tsx` (mở qua `MobileBottomNav`) hoạt động đầy đủ với captcha + API thật.
**Fix**: xoá form giả này hoặc tái dùng logic của `BookingModal`.

**5. `components/ProductActions.tsx:84-89` — "Học thử" phát video sai/giả cho mọi sản phẩm.**
Modal video hard-code `youtube.com/embed/dQw4w9WgXcQ`, giống nhau ở mọi khóa học/dịch vụ, không liên quan `product`. Gây mất uy tín ngay tại điểm chuyển đổi mua hàng.

**6. `app/payment/success/page.tsx:154-159` — Link "Xem đơn hàng" trỏ `/my-orders`, route không tồn tại** → 404 ngay sau khi khách vừa thanh toán thành công.

## Mức Trung bình

**7. `components/Footer.tsx:169-194` — Banner "Thiết kế bởi..." cố định vĩnh viễn** (`fixed bottom-0 z-[9999]`), không đóng được, chồng lấn `FloatingContact` và badge reCAPTCHA (phải né bằng CSS riêng trong `globals.css`). Nên bỏ hoặc thu gọn thành link thường trong footer.

**8. Z-index rải rác không theo hệ thống**: 80/90/100/110/120/150/200/9999 xuất hiện tùy tiện ở nhiều file — dễ xung đột khi thêm modal/overlay mới, không có token z-index chuẩn hoá.

**9. Thiếu design token màu.** `tailwind.config.ts` chỉ định nghĩa `background`/`foreground`. Màu thương hiệu "xanh" lệch sắc độ giữa các trang: `#044F40` (`app/booking/page.tsx:15`), `#009065` (`BookingModal.tsx:98,125,164`) so với `emerald-600` (#059669) dùng hầu hết nơi khác.

**10. Toàn bộ validate form dùng `window.alert()`** (`app/cart/page.tsx:35`, `app/checkout/page.tsx:53,98,129`, `BookingModal.tsx`, `ConsultationModal.tsx`, `ProfileMobile.tsx`) thay vì lỗi inline cạnh field. Chặn UI, không hợp thao tác mobile, không có `aria-live`.

**11. `app/cart/page.tsx:13-31,33-66` — Mã giảm giá tính hoàn toàn ở client** (`SAVE10`/`SAVE20`/`VIP50` hard-code), không qua API; `checkoutData`/`handleCheckout` khai báo nhưng không dùng (nút thực chỉ `router.push('/checkout')`). `app/checkout/page.tsx` tính lại `totalAmount` từ đầu, không mang discount qua — gây hiểu lầm về giá cuối cùng cho khách.

**12. `app/payment/callback/page.tsx:260-276` — Khối "Debug Information (Testing)" hiển thị công khai** (`window.location.search`) ngay trên trang khách hàng thật đang chờ xác nhận thanh toán — lộ giao diện debug nội bộ ra production.

**13. Quá nhiều CTA `animate-pulse`/`animate-bounce` vô thời hạn cùng lúc**: "Đăng ký ngay" (`ProductActions.tsx:41`), hotline (`Navbar.tsx:180`, `MobileHeader.tsx:78`, `Footer.tsx:189`), nút nổi đăng ký tư vấn/gọi điện (`FloatingContact.tsx:36,77`) — nhiều yếu tố nhấp nháy cùng lúc, không tôn trọng `prefers-reduced-motion`.

**14. Accessibility — ô tìm kiếm chỉ có `placeholder`, không `label`/`aria-label`** (`Navbar.tsx:173`, `MobileHeader.tsx:101-108`, `mobile/CategoriesView.tsx:273-280`). Nhiều nút chỉ-icon thiếu `aria-label`: Copy/Share2/Send/Mail sidebar sản phẩm (`app/product/[slug]/page.tsx:238-241`), nút đóng modal (X).

**15. `app/booking/page.tsx:70-79` — `<label>` không gắn `htmlFor`/`id` với input tương ứng** — không liên kết đúng cho screen reader dù nhìn trực quan đúng vị trí.

**16. Performance — dùng `<img>` thường thay vì `next/image` rải khắp**: `app/page.tsx`, `ProductCard.tsx`, `app/product/[slug]/page.tsx`, `Navbar.tsx`, `Footer.tsx`, `MobileHeader.tsx`, `ProfileDesktop/Mobile.tsx`, `CategoriesView` (cả 2 bản). `app/cart/page.tsx`/`app/checkout/page.tsx` lại dùng đúng `next/image` — không nhất quán, đúng chỗ ảnh hưởng LCP nhiều nhất (ảnh sản phẩm) lại chưa tối ưu.

## Mức Thấp

**17. `app/page.tsx:41-62` — Không xử lý error state khi fetch `/api/products` thất bại**, chỉ `console.error`. API lỗi → mục "Khóa học mới nhất"/"Dịch vụ" trống trắng vĩnh viễn, không thông báo/nút thử lại.

**18. `app/product/[slug]/page.tsx:236-242` — Nút "Chia sẻ ngay" không có `onClick`**, chỉ trang trí.

**19. `components/MobileHeader.tsx:65` — `if (pathname === '/categories') return null;`** ẩn header chung ở `/categories` mobile, buộc `CategoriesViewMobile.tsx` tự dựng lại header/search/menu riêng — code trùng lặp phải giữ đồng bộ thủ công.

**20. `components/profile/ProfileDesktop.tsx:365-389` — Bảng "Lịch sử đơn hàng" không bọc `overflow-x-auto`.** Layout cố định `grid-cols-12` (3/9), không có breakpoint tablet riêng, nguy cơ tràn ngang nhẹ ở viewport hẹp hơn (vẫn ≥ md).
