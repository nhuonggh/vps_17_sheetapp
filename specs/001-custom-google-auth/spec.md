# Feature Specification: Custom Google Sign-In (thay thế Supabase Auth)

**Feature Branch**: `001-custom-google-auth`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Thay Supabase Auth bằng Google OAuth2 tự cấu hình và JWT tự phát hành — bước 1 trong chuỗi migrate: auth → CRUD → đẩy code lên GitHub để deploy"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Người dùng hiện tại đăng nhập lại bằng Google (Priority: P1)

Người dùng đã có tài khoản (được tạo qua Google Sign-In trên hệ thống cũ) đăng nhập lại bằng
đúng tài khoản Google đó sau khi hệ thống chuyển sang nền tảng auth mới, và thấy đúng hồ sơ,
quyền hạn (học viên/giảng viên...), lịch sử của mình như trước — không phải tạo tài khoản mới,
không mất dữ liệu.

**Why this priority**: Đây là yêu cầu sống còn của việc migrate — nếu người dùng cũ không đăng
nhập lại được hoặc bị mất liên kết tới dữ liệu của họ, migrate coi như thất bại.

**Independent Test**: Lấy một tài khoản Google đã từng đăng nhập trên hệ thống cũ, đăng nhập trên
hệ thống mới, xác nhận vào đúng hồ sơ cũ (không tạo bản ghi trùng) và các trang cần đăng nhập
truy cập được bình thường.

**Acceptance Scenarios**:

1. **Given** một người dùng đã có tài khoản từ trước (khớp theo email Google đã xác thực), **When**
   họ đăng nhập bằng Google trên hệ thống mới, **Then** hệ thống nhận diện đúng tài khoản cũ, không
   tạo tài khoản trùng, và họ có quyền truy cập như trước khi migrate.
2. **Given** người dùng đã đăng nhập thành công, **When** họ mở một trang yêu cầu đăng nhập, **Then**
   trang hiển thị bình thường, không bị chuyển hướng ra trang đăng nhập.
3. **Given** người dùng đăng nhập lần đầu bằng một tài khoản Google chưa từng tồn tại trong hệ
   thống, **When** họ hoàn tất đăng nhập, **Then** hệ thống tạo hồ sơ mới cho họ với quyền mặc định.

---

### User Story 2 - Người dùng đăng xuất và phiên đăng nhập hết hạn an toàn (Priority: P2)

Người dùng chủ động đăng xuất, hoặc phiên đăng nhập tự hết hạn sau một thời gian không hoạt động,
và từ thời điểm đó không còn truy cập được các trang/dữ liệu yêu cầu đăng nhập cho tới khi đăng
nhập lại.

**Why this priority**: Đảm bảo tính bảo mật cơ bản của hệ thống auth mới — không có phiên đăng
nhập "treo" vĩnh viễn hay bị chiếm dụng sau khi đăng xuất.

**Independent Test**: Đăng xuất thủ công, thử truy cập lại trang yêu cầu đăng nhập — phải bị từ
chối / chuyển hướng đăng nhập. Chờ phiên hết hạn, xác nhận truy cập bị từ chối tương tự.

**Acceptance Scenarios**:

1. **Given** người dùng đang đăng nhập, **When** họ bấm đăng xuất, **Then** phiên đăng nhập bị vô
   hiệu ngay lập tức và truy cập trang yêu cầu đăng nhập bị từ chối.
2. **Given** phiên đăng nhập đã quá thời gian hiệu lực, **When** người dùng thao tác tiếp, **Then**
   hệ thống yêu cầu đăng nhập lại thay vì cho phép thao tác với phiên cũ.

---

### User Story 3 - Truy cập trái phép bị chặn (Priority: P3)

Một request không có phiên đăng nhập hợp lệ (không token, token giả, token hết hạn, token của
người khác) cố truy cập trang hoặc API yêu cầu đăng nhập, và bị từ chối một cách nhất quán.

**Why this priority**: Đây là điều kiện bắt buộc để coi hệ thống auth mới an toàn tương đương
hoặc hơn hệ thống Supabase cũ, nhưng có thể kiểm chứng độc lập sau khi đăng nhập/đăng xuất đã
chạy đúng.

**Independent Test**: Gửi request tới route được bảo vệ mà không có phiên hợp lệ (thiếu token,
token sửa đổi, token hết hạn) — mọi trường hợp đều bị từ chối, không có trường hợp lọt qua.

**Acceptance Scenarios**:

1. **Given** không có phiên đăng nhập, **When** truy cập route được bảo vệ, **Then** hệ thống từ
   chối và yêu cầu đăng nhập.
2. **Given** phiên đăng nhập bị sửa đổi/giả mạo, **When** dùng để truy cập route được bảo vệ,
   **Then** hệ thống từ chối truy cập.

---

### Edge Cases

- Người dùng đổi email Google (hoặc dùng email Google khác) sau migrate → hệ thống không tự động
  khớp được với tài khoản cũ; xử lý như người dùng mới, không tự gộp tài khoản.
- Người dùng thu hồi quyền truy cập ứng dụng từ phía Google → phiên đăng nhập hiện tại (nếu chưa
  hết hạn) vẫn hoạt động cho tới khi hết hạn tự nhiên hoặc đăng xuất; lần đăng nhập tiếp theo sẽ
  yêu cầu cấp quyền lại.
- Trong lúc cutover, người dùng đang có phiên đăng nhập cũ (từ hệ thống Supabase Auth) — xem
  Câu hỏi làm rõ Q1.
- Google trả lỗi/gián đoạn khi đăng nhập → người dùng thấy thông báo lỗi rõ ràng, không bị treo
  trang, không tạo tài khoản dở dang.
- Hai tài khoản Google khác nhau nhưng cùng người dùng cố ý dùng chung một hồ sơ → ngoài phạm vi
  (không hỗ trợ gộp tài khoản thủ công trong bản này).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hệ thống MUST cho phép người dùng đăng nhập bằng tài khoản Google của họ.
- **FR-002**: Hệ thống MUST xác thực danh tính Google là thật (không chấp nhận thông tin danh
  tính do client tự khai) trước khi cấp phiên đăng nhập.
- **FR-003**: Hệ thống MUST khớp người dùng đăng nhập với hồ sơ đã tồn tại dựa trên email Google
  đã xác thực; nếu chưa tồn tại, MUST tạo hồ sơ mới với quyền mặc định.
- **FR-004**: Hệ thống MUST cấp một phiên đăng nhập (session) sau khi xác thực thành công, và mọi
  trang/API yêu cầu đăng nhập MUST kiểm tra phiên này ở phía server trước khi cho truy cập.
- **FR-005**: Hệ thống MUST cho phép người dùng chủ động đăng xuất, vô hiệu phiên ngay lập tức.
- **FR-006**: Hệ thống MUST tự động hết hạn phiên đăng nhập sau 7 ngày kể từ lúc đăng nhập; hết
  hạn thì bắt buộc đăng nhập lại.
- **FR-007**: Hệ thống MUST từ chối mọi request tới route được bảo vệ khi không có phiên hợp lệ
  (thiếu, hết hạn, hoặc bị sửa đổi/giả mạo).
- **FR-008**: Hệ thống MUST giữ nguyên quyền hạn/vai trò (học viên, giảng viên, admin...) đã có
  của người dùng từ hệ thống cũ sau khi họ đăng nhập lại trên hệ thống mới.
- **FR-009**: Khi cutover, hệ thống MUST ngừng chấp nhận hoàn toàn phiên đăng nhập/token từ
  Supabase Auth — không chạy song song hai hệ xác thực. Toàn bộ người dùng bắt buộc đăng nhập lại
  qua hệ Google Sign-In tự build ngay tại thời điểm cutover.
- **FR-010**: Hệ thống MUST ghi nhận (log) các sự kiện đăng nhập thất bại/bị từ chối để phục vụ
  giám sát bảo mật.

### Key Entities

- **User Account (Hồ sơ người dùng)**: đại diện một người dùng của hệ thống; thuộc tính chính:
  email đã xác thực, vai trò/quyền hạn, thời điểm tạo — được migrate nguyên trạng từ hệ thống cũ,
  chỉ thay đổi cách xác thực danh tính. Liên kết tới các dữ liệu nghiệp vụ khác (đơn hàng,
  khoá học...) không đổi.
- **Session (Phiên đăng nhập)**: đại diện một lần đăng nhập còn hiệu lực của một User Account; có
  thời điểm tạo, thời điểm hết hạn, trạng thái còn hiệu lực/đã thu hồi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% người dùng đã hoạt động trước cutover đăng nhập lại thành công bằng đúng tài
  khoản Google của họ và vào đúng hồ sơ cũ (0 tài khoản bị tạo trùng, 0 tài khoản bị mất).
- **SC-002**: Người dùng hoàn tất đăng nhập (từ bấm "Đăng nhập bằng Google" tới vào được trang
  chính) trong dưới 10 giây trong điều kiện mạng bình thường.
- **SC-003**: 100% request tới route được bảo vệ không có phiên hợp lệ đều bị từ chối trong kiểm
  thử bảo mật (0 trường hợp lọt qua).
- **SC-004**: 100% quyền hạn/vai trò của người dùng hiện tại được giữ nguyên sau khi chuyển đổi,
  xác nhận qua đối chiếu danh sách người dùng trước/sau cutover.

## Assumptions

- Google Sign-In tiếp tục là phương thức đăng nhập duy nhất (đúng theo hệ thống hiện tại và theo
  nguyên tắc dự án) — không bổ sung đăng nhập email/mật khẩu trong bản này.
- Dữ liệu hồ sơ người dùng (email, vai trò, quyền hạn) đã được migrate sang PostgreSQL trên VPS
  thông qua nỗ lực migrate dữ liệu riêng (xem `conver/1.plan.md` mục 4) trước khi tính năng này
  triển khai — spec này chỉ xử lý cơ chế xác thực, không xử lý việc chuyển dữ liệu.
- Việc "ai được làm gì" với từng loại dữ liệu (CRUD authorization) là spec kế tiếp trong chuỗi
  migrate; spec này chỉ đảm bảo "ai đang đăng nhập là ai" một cách đáng tin cậy.
- Không cần hỗ trợ đăng nhập từ ứng dụng di động native trong phạm vi bản này (chỉ web).
