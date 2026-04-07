# HỆ THỐNG GỌI MÓN QUA MÃ QR - SYSTEM DOCUMENTATION

Tài liệu này mô tả cấu trúc hệ thống backend mới được tối ưu hóa, kèm theo danh sách các trang web (Front-end) cần thiết để xây dựng một sản phẩm hoàn chỉnh, và danh sách các API có thể sử dụng (test).

---

## 1. Cấu Trúc Thư Mục Backend Mới (Chuyên nghiệp / Clean Architecture)

Hệ thống đã được refactor (cấu trúc lại) theo mô hình chuẩn **Controller - DTO - Service - Repository - Model**. Điều này giúp tách biệt các mối quan tâm (separation of concerns), dễ bảo trì và mở rộng trong tương lai.

- `src/models/`: Chứa các Mongoose Schema định nghĩa cấu trúc dữ liệu trong MongoDB (Table, Order, MenuItem, v.v.).
- `src/repositories/`: Lớp thao tác trực tiếp với Database. Thay vì Controller gọi lệnh `Model.find()`, nó sẽ gọi `Repository.findAll()`. Lớp này giúp tách biệt logic Database khỏi logic nghiệp vụ.
- `src/services/`: Lớp chứa **Business Logic** (logic nghiệp vụ). Ví dụ: Khi một Order được đổi trạng thái thành `paid`, Service sẽ gọi PaymentRepository để lưu thanh toán, sau đó gọi TableRepository để chuyển bàn thành trạng thái `empty`, và phát ra sự kiện Socket.io.
- `src/dtos/` (Data Transfer Object): Lớp dùng để định nghĩa và kiểm tra (validate) dữ liệu đầu vào. Đảm bảo dữ liệu gửi từ Client lên hợp lệ trước khi đưa vào Service.
- `src/security/`: Chứa các hàm xử lý JWT token và xác thực người dùng (AuthService).
- `src/controllers/`: Lớp giao tiếp trực tiếp với Client. Điểm chạm đầu tiên nhận HTTP Request (req, res), đưa dữ liệu qua DTO để kiểm tra, gọi Service để xử lý, và trả về HTTP Response. Controller hoàn toàn không chứa nghiệp vụ phức tạp.

---

## 2. Các Trang Web Frontend Cần Thiết Cho Dự Án

Dựa theo luồng nghiệp vụ của backend (bàn, món ăn, đơn hàng, hóa đơn), để dự án này có thể hoạt động thực tế, bạn sẽ cần phát triển các trang Web / App sau (sử dụng React/Next.js hoặc framework tương tự):

### A. Dành cho Khách Hàng (Customer Web / PWA)
Trang web này sẽ mở lên khi khách hàng quét mã QR trên bàn.
1. **Trang Chào Mừng / Chọn Bàn:** (Nếu mã QR đã chứa slug của bàn thì chuyển thẳng đến Menu).
2. **Trang Thực Đơn (Menu Page):** 
   - Hiển thị danh sách món ăn phân chia theo danh mục (Đồ ăn, Thức uống, Tráng miệng, ...).
   - Có giỏ hàng nổi để xem các món đã chọn.
3. **Trang Giỏ Hàng & Thanh Toán (Cart & Checkout):** 
   - Hiển thị danh sách các món, số lượng, tổng tiền.
   - Nút "Đặt Món" (Gửi đơn hàng xuống Bếp).
   - Có thể tích hợp cổng thanh toán (Momo/VNPay) ngay tại bước này hoặc cho phép thanh toán sau khi ăn xong.
4. **Trang Theo Dõi Đơn Hàng (Order Tracking):** 
   - Khách xem trạng thái món ăn: đang chờ (pending), đang nấu (cooking), đã xong (done).

### B. Dành cho Bếp / Quầy Bar (KDS - Kitchen Display System)
1. **Trang Màn Hình Bếp:**
   - Hiển thị các đơn hàng mới (real-time qua Socket.io).
   - Hiển thị số bàn, các món cần làm.
   - Nút đánh dấu: "Đang nấu", "Hoàn thành".

### C. Dành cho Quản Lý / Thu Ngân (Admin Dashboard)
1. **Trang Quản Lý Sơ Đồ Bàn (Table Management):**
   - Hiển thị trạng thái các bàn: Trống (empty), Có khách (occupied).
2. **Trang Quản Lý Đơn Hàng & Thanh Toán (POS):**
   - Thu ngân có thể chủ động tạo đơn, sửa đơn, in hóa đơn và xác nhận thanh toán.
3. **Trang Quản Lý Thực Đơn (Menu CRUD):**
   - Thêm, sửa, xóa món ăn, cập nhật giá và hình ảnh.
4. **Trang Báo Cáo Thống Kê (Dashboard/Analytics):**
   - Hiển thị doanh thu trong ngày, tháng.
   - Các món ăn bán chạy nhất, thời gian phục vụ trung bình.

---

## 3. Danh Sách API (Có Thể Test Bằng Postman)

Dưới đây là các API chính đã được tối ưu:

### 3.1. Auth & Người Dùng
- `POST /api/auth/login`
  - Body: `{ "email": "admin@example.com", "password": "..." }`
  - Trả về: JWT Token.

### 3.2. Quản Lý Bàn (Tables)
- `GET /api/tables` - Lấy danh sách tất cả các bàn.
- `POST /api/tables` - Tạo bàn mới.
  - Body: `{ "name": "Bàn 1" }`
- `PUT /api/tables/:id` - Cập nhật bàn.
- `DELETE /api/tables/:id` - Xóa bàn.

### 3.3. Thực Đơn (Menu Items)
- `GET /api/menu` - Lấy danh sách món ăn.
- `GET /api/menu/:id` - Chi tiết 1 món.
- `POST /api/menu` - Thêm món mới.
  - Body: `{ "name": "Cà phê sữa", "price": 25000, "category": "Đồ uống", "image": "url..." }`
- `PUT /api/menu/:id` - Sửa thông tin món.
- `DELETE /api/menu/:id` - Xóa món.

### 3.4. Đơn Hàng (Orders)
- `GET /api/orders` - Lấy tất cả đơn hàng.
- `GET /api/orders/table/:tableId` - Lấy đơn hàng theo Bàn (dùng ID hoặc Slug của bàn).
- `POST /api/orders` - Đặt món mới.
  - Body: `{ "tableId": "ban-1", "items": [{ "id": "...", "name": "Cà phê", "price": 25000, "quantity": 1 }], "total": 25000 }`
  - *(Khi đặt thành công, trạng thái bàn tự động đổi thành 'occupied')*
- `PUT /api/orders/:id` - Cập nhật trạng thái đơn hàng (VD: Đổi sang `cooking`, `done`, `paid`).
  - *(Nếu đổi sang `paid`, hệ thống tự động lưu Payment và đổi bàn thành `empty`)*

### 3.5. Thanh Toán (Payments)
- `GET /api/payments` - Lịch sử giao dịch.
- `POST /api/payments` - Ghi nhận thanh toán thủ công.

### 3.6. Thống Kê (Stats)
- `GET /api/stats` - Lấy thông số thống kê tổng hợp (doanh thu, đơn hàng, biểu đồ).
