# 📖 TÀI LIỆU API ĐẦY ĐỦ — HỆ THỐNG QR DINE (F&B)

> **Phiên bản:** 3.0 — Cập nhật 04/04/2026  
> **Base URL:** `http://localhost:3000/api`  
> **Môi trường sản xuất:** `https://api.yourdomain.vn/api`

---

## 📋 MỤC LỤC

1. [Tổng Quan & Quy Ước Chung](#1-tổng-quan--quy-ước-chung)
2. [Xác Thực (Auth)](#2-xác-thực-auth)
3. [Quản Lý Bàn (Tables)](#3-quản-lý-bàn-tables)
4. [Danh Mục Món Ăn (Categories)](#4-danh-mục-món-ăn-categories)
5. [Thực Đơn (Menu)](#5-thực-đơn-menu)
6. [Thực Đơn Tuần (Weekly Menu)](#6-thực-đơn-tuần-weekly-menu)
7. [Combo (Gói Khuyến Mãi)](#7-combo-gói-khuyến-mãi)
8. [Luồng Khách: Quét QR → Đặt Món (Orders)](#8-luồng-khách-quét-qr--đặt-món-orders)
9. [Luồng Nhân Viên: Xử Lý Bếp & POS](#9-luồng-nhân-viên-xử-lý-bếp--pos)
10. [Thanh Toán (Payments)](#10-thanh-toán-payments)
11. [Tài Khoản Ngân Hàng (Bank Accounts)](#11-tài-khoản-ngân-hàng-bank-accounts)
12. [Thống Kê (Stats)](#12-thống-kê-stats)
13. [WebSocket Thời Gian Thực](#13-websocket-thời-gian-thực)
14. [Cấu Trúc Dữ Liệu Trả Về](#14-cấu-trúc-dữ-liệu-trả-về)

---

## 1. Tổng Quan & Quy Ước Chung

### Phân quyền truy cập

| Ký hiệu | Nghĩa |
|---|---|
| ⚡ **Public** | Không cần token — Khách hàng gọi được |
| 🔐 **Staff/Admin** | Cần Header `Authorization: Bearer <token>` |
| 👨‍🍳 **Chef** | Quyền Đầu Bếp (Chỉ xem và duyệt đơn bếp) |
| 👑 **Admin only** | Chỉ tài khoản Admin |
| 🤖 **System only** | Chỉ hệ thống nội bộ (Bot Python) |

### Header cần thiết (khi cần Auth)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

> 💡 **Quan trọng về JWT Middleware:**  
> Hệ thống luôn **thử parse token** nếu có Header `Authorization`. Ngay cả các route Public, nếu Staff gửi kèm token hợp lệ, `req.user` vẫn được set đầy đủ.

### Rate Limiting
| Endpoint | Giới hạn |
|---|---|
| Tất cả `/api/*` | 1000 req / 15 phút / IP |
| `/api/orders` | **30 req / phút / IP** |
| `/api/payments` | **10 req / phút / IP** |

### Cấu trúc Response lỗi (Chuẩn hóa)
```json
// Lỗi nghiệp vụ (400 / 404)
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Mô tả lỗi cụ thể"
  }
}

// Lỗi xác thực (401)
{ "error": "Unauthorized: No token provided" }

// Lỗi phân quyền (403)
{ "error": "Forbidden: You do not have permission" }

// Vượt Rate Limit (429)
{ "error": "Quá nhiều request. Vui lòng thử lại sau 1 phút." }
```

### 📦 Các thư viện bổ sung (Cần cài đặt)
Nếu bạn setup môi trường mới, đảm bảo đã cài các thư viện sau:
- **Backend**: `bcryptjs` (Mã hóa pass), `cookie-parser` (Đọc Cookies).
- **Frontend**: `react-is` (Hệ thống Recharts yêu cầu).

### Phân Quyền API Tổng Hợp

| API | Phương Thức | Quyền | Ghi chú |
|---|---|---|---|
| `/api/categories` | GET | ⚡ Public | Lấy danh mục lọc món |
| `/api/categories` | POST/PUT/DELETE | 👑 Admin | Upload ảnh qua `form-data` |
| `/api/weekly-menu/active` | GET | ⚡ Public | Lấy thực đơn bán của Tuần hiện tại |
| `/api/weekly-menu` | GET | 🔐 Staff/Admin | Xem tất cả lịch bán |
| `/api/weekly-menu` | POST/PUT/DELETE | 👑 Admin | Quản lý lịch tuần |
| `/api/menu` | GET | ⚡ Public | Lấy tất cả món, lọc `?categoryId=` |
| `/api/menu` | POST/PUT/DELETE | 👑 Admin | Upload ảnh qua `form-data` |
| `/api/combos` | GET | ⚡ Public | - |
| `/api/combos` | POST/PUT/DELETE | 👑 Admin | - |
| `/api/tables` | GET | ⚡ Public | - |
| `/api/tables` | POST/PUT/DELETE | 🔐 Staff/Admin | - |
| `/api/orders/table/:id/active-session` | GET | ⚡ Public | Quét QR kiểm tra bàn |
| `/api/orders` | POST | ⚡ Public | Thêm món vào giỏ |
| `/api/orders/:id/checkout` | POST | ⚡ Public | Gửi bếp |
| `/api/orders/:id/status` | GET | ⚡ Public | Kiểm tra trạng thái bill |
| `/api/orders/:id/item/:itemId` | DELETE | ⚡ Public | Xóa món khỏi giỏ |
| `/api/orders` | GET | 🔐 Staff/Admin | - |
| `/api/orders/counter` | POST | 🔐 Staff/Admin | Tạo đơn tại quầy POS |
| `/api/orders/kitchen/all` | GET | 🔐 Staff/Admin/👨‍🍳 | Xem đơn bếp |
| `/api/orders/:id/item/:itemId/status` | PUT | 🔐 Staff/Admin/👨‍🍳 | Bếp duyệt từng món |
| `/api/orders/:id/approve-all` | PUT | 🔐 Staff/Admin/👨‍🍳 | Bếp duyệt tất cả |
| `/api/orders/:id/complete` | POST | 🔐 Staff/Admin | Chốt đơn & Giải phóng bàn |
| `/api/payments/generate-qr/:orderId` | POST | ⚡ Public | Tạo QR thanh toán |
| `/api/payments/webhook` | POST | 🤖 Bot Python | - |
| `/api/payments/mock` | POST | 🔐 Staff/Admin | Đóng bill tay |
| `/api/payments` | POST | 🔐 Staff/Admin | Thu tiền mặt |
| `/api/payments` | GET | 🔐 Staff/Admin | Lịch sử thanh toán |
| `/api/bank-accounts/default` | GET | ⚡ Public | Lấy STK mặc định |
| `/api/bank-accounts` | POST/PUT/DELETE | 👑 Admin | - |

---

## 2. Xác Thực (Auth)

### 2.1 Đăng Nhập ⚡ Public
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "123"
}
```

**Response 200:**
```json
{
  "success": true,
  "user": {
    "id": "65abc123...",
    "name": "Nguyễn Văn Admin",
    "email": "admin@gmail.com",
    "role": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

> 💡 **Lưu ý bảo mật:** `refreshToken` cũng được tự động set vào **Http-Only Cookie** tên là `refreshToken`. Frontend nên ưu tiên dùng Cookie nếu trình duyệt hỗ trợ.

**Tài khoản mặc định (môi trường dev):**
| Email | Mật khẩu | Role |
|---|---|---|
| `admin@gmail.com` | `123` | admin |
| `staff@gmail.com` | `123` | staff |
| `chef@gmail.com` | `123` | chef |

---

### 2.2 Lấy Thông Tin Tài Khoản 🔐 Staff/Admin
```http
GET /api/auth/me
```

**Response 200:**
```json
{
  "id": "65abc123...",
  "name": "Nguyễn Văn Admin",
  "email": "admin@gmail.com",
  "role": "admin"
}
```

---

### 2.3 Cấp Lại Access Token (Refresh Token) ⚡ Public
Dùng khi `accessToken` hết hạn (thường sau 15 phút). API này sẽ kiểm tra `refreshToken` (trong Cookie hoặc gửi kèm) để cấp cặp mã mới.

```http
POST /api/auth/refresh-token
```

**Response 200:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1Ni..."
}
```
> Hệ thống sẽ tự động xoay vòng (Rotate) và cập nhật `refreshToken` mới vào Cookie.

---

### 2.4 Đăng Xuất (Logout) ⚡ Public
Xoá phiên làm việc và thu hồi Refresh Token.

```http
POST /api/auth/logout
```

---

## 3. Quản Lý Bàn (Tables)

### 3.1 Lấy Danh Sách Bàn ⚡ Public
```http
GET /api/tables
```
**Response 200:**
```json
[
  {
    "_id": "65abc001",
    "name": "Bàn VIP 1",
    "slug": "ban-vip-1",
    "status": "empty"
  },
  {
    "_id": "65abc002",
    "name": "Bàn Số 2",
    "slug": "ban-so-2",
    "status": "occupied"
  }
]
```

| Status | Ý nghĩa |
|---|---|
| `empty` | Bàn trống, sẵn sàng đón khách |
| `occupied` | Đang có khách ngồi |

---

### 3.2 Tạo Bàn 👑 Admin
```http
POST /api/tables
```
```json
{ "name": "Bàn VIP 3" }
```

---

### 3.3 Cập Nhật / Xóa Bàn 🔐 Staff/Admin
```http
PUT    /api/tables/:id
DELETE /api/tables/:id
```

---

## 4. Danh Mục Món Ăn (Categories)

Danh mục là các "Thư mục chủ đề" do Admin tự tạo (Ví dụ: Lẩu, Nướng, Đồ uống). Khi thêm món ăn, phải gán món vào đúng danh mục.

### 4.1 Lấy Tất Cả Danh Mục ⚡ Public
```http
GET /api/categories
```

**Response 200:**
```json
[
  {
    "_id": "65cat001",
    "name": "Lẩu",
    "slug": "lau",
    "image": "65img001",
    "displayOrder": 1,
    "status": "available"
  },
  {
    "_id": "65cat002",
    "name": "Đồ Uống Lạnh",
    "slug": "do-uong-lanh",
    "image": "65img002",
    "displayOrder": 2,
    "status": "available"
  }
]
```

> 💡 `image` là ID ảnh — dùng `GET /api/images/:id` để hiển thị.  
> 💡 Kết quả được sắp xếp theo `displayOrder` tăng dần.

---

### 4.2 Thêm Danh Mục 👑 Admin
```http
POST /api/categories
Content-Type: multipart/form-data
```

| Key (form-data) | Type | Bắt buộc | Mô tả |
|---|---|---|---|
| `name` | Text | ✅ | Tên danh mục (Phải duy nhất) |
| `displayOrder` | Text | ❌ | Thứ tự hiển thị (số nhỏ lên đầu) |
| `status` | Text | ❌ | `available` hoặc `unavailable` |
| `image` | **File** | ❌ | Ảnh icon danh mục (JPG/PNG/WEBP) |

> 💡 Hệ thống **tự động sinh `slug`** từ `name`. Ví dụ: `"Đồ Uống Lạnh"` → slug: `"do-uong-lanh"`.

**Response 201:**
```json
{
  "_id": "65cat003",
  "name": "Đồ Uống Lạnh",
  "slug": "do-uong-lanh",
  "image": "65img003",
  "displayOrder": 2,
  "status": "available",
  "createdAt": "2026-04-04T00:00:00.000Z"
}
```

---

### 4.3 Cập Nhật Danh Mục 👑 Admin
```http
PUT /api/categories/:id
Content-Type: multipart/form-data
```
> ⚠️ Nếu upload ảnh mới, ảnh cũ sẽ bị **ghi đè hoàn toàn**.

---

### 4.4 Xóa Danh Mục 👑 Admin
```http
DELETE /api/categories/:id
```

---

## 5. Thực Đơn (Menu)

Mỗi món ăn phải được gán vào một **Danh mục (Category)**. Kết quả trả về đã bao gồm thông tin chi tiết của danh mục bên trong (không cần gọi thêm API).

### 5.1 Lấy Toàn Bộ Thực Đơn ⚡ Public
```http
GET /api/menu
GET /api/menu?categoryId=65cat001
```

> 💡 Dùng query param `?categoryId=` để lọc món theo danh mục.

**Response 200:**
```json
[
  {
    "_id": "65def001",
    "name": "Lẩu Thái Hải Sản",
    "price": 250000,
    "categoryId": {
      "_id": "65cat001",
      "name": "Lẩu",
      "slug": "lau",
      "image": "65img001",
      "status": "available"
    },
    "description": "Nước lẩu đậm đà chua cay",
    "images": ["65img010", "65img011"],
    "options": [
      { "name": "Nước dùng Nhạt", "priceExtra": 0 },
      { "name": "Nước dùng Cay", "priceExtra": 10000 }
    ],
    "addons": [
      { "name": "Thêm Bún", "priceExtra": 15000 },
      { "name": "Thêm Thịt Bò", "priceExtra": 50000 }
    ],
    "status": "available"
  }
]
```

| Trường | Kiểu | Mô tả |
|---|---|---|
| `categoryId` | `object` | Thông tin danh mục (được populate tự động) |
| `images` | `string[]` | Mảng ID ảnh — URL: `GET /api/images/:id` |
| `options` | `array` | Khách chọn **1 trong số** (VD: Size S/M/L) |
| `addons` | `array` | Khách chọn **nhiều hoặc không** (VD: Thêm lòng) |

---

### 5.2 Lấy Chi Tiết 1 Món ⚡ Public
```http
GET /api/menu/:id
```

---

### 5.3 Lấy Ảnh Món Ăn / Danh Mục ⚡ Public
```http
GET /api/images/:imageId
```
Trả về file ảnh trực tiếp — dùng thẳng trong thẻ `<img src="http://localhost:3000/api/images/65img001">`.

---

### 5.4 Thêm Món Ăn 👑 Admin
```http
POST /api/menu
Content-Type: multipart/form-data
```

| Key (form-data) | Type | Bắt buộc | Mô tả |
|---|---|---|---|
| `images` | **File** | ❌ | Upload nhiều ảnh (tối đa 5) |
| `data` | Text (JSON) | ✅ | Thông tin món ăn dạng JSON string |

**Giá trị field `data`:**
```json
{
  "name": "Lẩu Thái Hải Sản",
  "price": 250000,
  "categoryId": "65cat001",
  "description": "Nước lẩu đậm đà chua cay",
  "options": [
    { "name": "Nước dùng Nhạt", "priceExtra": 0 },
    { "name": "Nước dùng Cay", "priceExtra": 10000 }
  ],
  "addons": [
    { "name": "Thêm Bún", "priceExtra": 15000 }
  ],
  "status": "available"
}
```

---

### 5.5 Cập Nhật Món Ăn 👑 Admin
```http
PUT /api/menu/:id
Content-Type: multipart/form-data
```
> ⚠️ Nếu upload ảnh mới vào `images`, toàn bộ ảnh cũ sẽ bị **ghi đè**. Nếu không upload ảnh, ảnh cũ giữ nguyên.

---

### 5.6 Xóa Món 👑 Admin
```http
DELETE /api/menu/:id
```

---

## 6. Thực Đơn Tuần (Weekly Menu)

Hệ thống cho phép Admin lên lịch bán món ăn theo từng tuần. Chỉ những món có mặt trong lịch bán tuần đang active mới cho phép khách đặt.

> [!WARNING]
> Khi đã có lịch tuần **active**, mọi lệnh đặt món chứa `menuItemId` không có trong danh sách sẽ bị **từ chối lỗi 400**.  
> Nếu **chưa có lịch tuần nào**, hệ thống cho phép đặt tất cả món (chế độ không giới hạn — tiện cho giai đoạn test/setup ban đầu).

### 6.1 Lấy Thực Đơn Đang Bán Hôm Nay ⚡ Public

Đây là API **chính** mà App Khách hàng gọi để hiển thị menu. Hệ thống tự động tính toán "hôm nay là tuần nào" và trả về đúng danh sách món.

```http
GET /api/weekly-menu/active
```

**Response 200 — Có lịch bán trong tuần này:**
```json
{
  "_id": "65week001",
  "title": "Thực đơn Tuần 1 - Tháng 4",
  "startDate": "2026-04-01T00:00:00.000Z",
  "endDate": "2026-04-07T23:59:59.000Z",
  "menuItems": [
    {
      "_id": "65def001",
      "name": "Lẩu Thái Hải Sản",
      "price": 250000,
      "categoryId": { "_id": "65cat001", "name": "Lẩu", "slug": "lau" },
      "images": ["65img010"],
      "options": [...],
      "addons": [...],
      "status": "available"
    }
  ],
  "status": "active"
}
```

**Response 200 — Chưa cấu hình lịch tuần:**
```json
null
```
> Frontend nhận `null` → Hiển thị toàn bộ menu không giới hạn, hoặc báo "Quán chưa có thực đơn tuần".

---

### 6.2 Lấy Tất Cả Lịch Bán 🔐 Staff/Admin
```http
GET /api/weekly-menu
```

**Response 200:**
```json
[
  {
    "_id": "65week001",
    "title": "Thực đơn Tuần 1 - Tháng 4",
    "startDate": "2026-04-01T00:00:00.000Z",
    "endDate": "2026-04-07T23:59:59.000Z",
    "menuItems": ["65def001", "65def002"],
    "status": "active"
  },
  {
    "_id": "65week002",
    "title": "Thực đơn Tuần 2 - Tháng 4",
    "startDate": "2026-04-08T00:00:00.000Z",
    "endDate": "2026-04-14T23:59:59.000Z",
    "menuItems": ["65def003"],
    "status": "active"
  }
]
```

---

### 6.3 Lấy Chi Tiết Một Lịch Bán 🔐 Staff/Admin
```http
GET /api/weekly-menu/:id
```
> Trả về đầy đủ thông tin món ăn (đã populate) bên trong lịch đó.

---

### 6.4 Tạo Lịch Bán Mới 👑 Admin
```http
POST /api/weekly-menu
```

**Request Body:**
```json
{
  "title": "Thực đơn Tuần 1 - Tháng 4",
  "startDate": "2026-04-01T00:00:00.000Z",
  "endDate": "2026-04-07T23:59:59.000Z",
  "menuItems": [
    "65def001",
    "65def002",
    "65def003"
  ],
  "status": "active"
}
```

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `title` | ✅ | Tên lịch bán (VD: Tuần 1 Tháng 4) |
| `startDate` | ✅ | Ngày bắt đầu (ISO 8601) |
| `endDate` | ✅ | Ngày kết thúc (ISO 8601) |
| `menuItems` | ✅ | Mảng ID của các món ăn được phép bán |
| `status` | ❌ | `active` hoặc `draft` (Mặc định: `draft`) |

> ⚠️ Nếu khoảng thời gian **trùng** với lịch tuần đã tồn tại, hệ thống sẽ trả về lỗi 400.

**Response 201:**
```json
{
  "_id": "65week001",
  "title": "Thực đơn Tuần 1 - Tháng 4",
  "startDate": "2026-04-01T00:00:00.000Z",
  "endDate": "2026-04-07T23:59:59.000Z",
  "menuItems": ["65def001", "65def002"],
  "status": "active",
  "createdAt": "2026-04-01T10:00:00.000Z"
}
```

---

### 6.5 Cập Nhật Lịch Bán 👑 Admin
```http
PUT /api/weekly-menu/:id
```
> Có thể đổi danh sách món, đổi ngày, đổi `status` sang `draft` để tạm dừng.

---

### 6.6 Xóa Lịch Bán 👑 Admin
```http
DELETE /api/weekly-menu/:id
```

---

## 7. Combo (Gói Khuyến Mãi)

### 7.1 Lấy Danh Sách Combo ⚡ Public
```http
GET /api/combos
```

**Response 200:**
```json
[
  {
    "_id": "65ghi001",
    "name": "Combo 3 Món Siêu Lời",
    "description": "Lẩu + Trà Chanh x2",
    "price": 299000,
    "menuItemIds": ["65def001", "65def002"]
  }
]
```

---

### 7.2 Tạo / Sửa / Xóa Combo 👑 Admin
```http
POST   /api/combos
PUT    /api/combos/:id
DELETE /api/combos/:id
```

**Request Body:**
```json
{
  "name": "Combo 3 Món Siêu Lời",
  "description": "Lẩu + Trà Chanh x2",
  "price": 299000,
  "menuItemIds": ["ID_MÓN_LẨU", "ID_MÓN_TRÀ"]
}
```

---

## 8. Luồng Khách: Quét QR → Đặt Món (Orders)

> 💡 **Toàn bộ section này là Public — không cần token.** Đây là luồng Frontend phục vụ khách hàng.

---

### BƯỚC 1 — Khách quét mã QR trên bàn

Mã QR dán tại bàn chứa URL: `https://yourdomain.vn/table/ban-vip-1`

Frontend lấy `tableId` từ URL, gọi API kiểm tra:

```http
GET /api/orders/table/:tableId/active-session
```

> 💡 `tableId` hỗ trợ 3 dạng:
> - **ObjectID MongoDB:** `65abc001...`
> - **Slug bàn:** `ban-vip-1`
> - **Số thứ tự:** `1`, `2`, `5`...

**Response 404** — Bàn trống, chưa có ai:
```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "No active session found for this table" }
}
```
→ **Frontend hiển thị Menu** để khách bắt đầu đặt món mới.

**Response 200** — Bàn đang có khách:
```json
{
  "_id": "65jkl001",
  "tableId": "65abc001",
  "tableName": "Bàn VIP 1",
  "total": 250000,
  "status": "active",
  "paymentStatus": "unpaid",
  "items": [
    {
      "_id": "65jkl001_item1",
      "menuItemId": "65def001",
      "name": "Lẩu Thái Hải Sản",
      "basePrice": 250000,
      "quantity": 1,
      "totalPrice": 260000,
      "selectedOption": { "name": "Nước dùng Cay", "priceExtra": 10000 },
      "selectedAddons": [],
      "status": "cooking"
    }
  ],
  "createdAt": "2026-04-01T10:00:00.000Z"
}
```
→ Frontend render danh sách món đã gọi để khách biết mình đã ăn gì.

---

### BƯỚC 2 — Khách thêm món vào giỏ

```http
POST /api/orders
```

**Request Body:**
```json
{
  "tableId": "ban-vip-1",
  "items": [
    {
      "menuItemId": "65def001",
      "name": "Lẩu Thái Hải Sản",
      "basePrice": 250000,
      "quantity": 1,
      "selectedOption": { "name": "Nước dùng Cay", "priceExtra": 10000 },
      "selectedAddons": [
        { "name": "Thêm Bún", "priceExtra": 15000 }
      ]
    },
    {
      "menuItemId": "65def002",
      "name": "Trà Đá",
      "basePrice": 5000,
      "quantity": 2,
      "selectedOption": null,
      "selectedAddons": []
    }
  ]
}
```

**Server tự tính `totalPrice` cho mỗi món:**
```
totalPrice = (basePrice + option.priceExtra + sum(addons.priceExtra)) * quantity
```

**Logic Backend:**
- Bàn đã có session active & unpaid → **nhồi thêm** món vào session đó
- Bàn chưa có session → tạo session mới + chuyển bàn thành `occupied`
- Bàn có session nhưng đã thanh toán → tạo session MỚI

> ⚠️ **Nếu có lịch Weekly Menu active:** Backend kiểm tra từng `menuItemId`. Món không có trong lịch tuần → lỗi 400.
> ✅ **Nếu chưa có lịch Weekly Menu:** Cho phép đặt tất cả món.

---

### BƯỚC 2.5 — Khách hủy món khỏi giỏ
> 💡 Chỉ xóa được nếu món còn trạng thái `in_cart`.

```http
DELETE /api/orders/:sessionId/item/:itemId
```
**Response 200:** Session sau khi trừ món và cập nhật lại `total`.

---

### BƯỚC 3 — Khách gửi xuống Bếp (Checkout)

```http
POST /api/orders/:sessionId/checkout
```

**Response 200:** Session đã cập nhật — tất cả `in_cart` → `pending_approval`

> 🔔 Socket `order-updated` được bắn ngay lập tức → Màn hình bếp reo chuông!

---

### BƯỚC 4 — Khách tạo mã QR thanh toán

```http
POST /api/payments/generate-qr/:orderId
```

**Response 200:**
```json
{
  "orderId": "65jkl001",
  "amount": 285000,
  "qrBase64": "iVBORw0KGgoAAAANSUhEUgAAA...",
  "paymentContent": "HD65JKL001"
}
```

```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA..." />
```

---

### BƯỚC 5 — Thanh toán tự động qua MBBank

1. Bot Python quét sao kê MBBank mỗi **45 giây**
2. Phát hiện giao dịch khớp → Bắn Webhook nội bộ sang Node.js
3. Node.js xác thực, đóng bill, giải phóng bàn
4. Frontend nhận socket `order-paid` → Tắt popup QR, hiện "Thanh toán thành công"

---

### BƯỚC 6 — Khách theo dõi trạng thái món (Real-time)

```http
GET /api/orders/:id/status
```

**Response 200:**
```json
{
  "_id": "65jkl001",
  "tableId": "65abc001",
  "tableName": "Bàn VIP 1",
  "status": "active",
  "paymentStatus": "unpaid",
  "total": 285000,
  "items": [
    { "_id": "item1", "name": "Lẩu Thái", "quantity": 1, "status": "cooking" },
    { "_id": "item2", "name": "Trà Đá", "quantity": 2, "status": "served" }
  ]
}
```

**Vòng đời trạng thái từng món:**

| Status | Ý nghĩa | Ai thấy |
|---|---|---|
| `in_cart` | Trong giỏ hàng, chưa gửi bếp | Public |
| `pending_approval` | Đã gửi bếp, chờ đầu bếp nhận | Public |
| `cooking` | Đang nấu | Staff nhận, khách thấy |
| `served` | Đã mang ra bàn | Staff xác nhận |
| `cancelled` | Đã hủy (hết nguyên liệu...) | Staff/Admin |

> 💡 Khách hàng cũng nhận socket `order-updated` để xem trạng thái cập nhật tức thì mà không cần F5.

---

## 9. Luồng Nhân Viên: Xử Lý Bếp & POS

> 🔐 **Toàn bộ section này yêu cầu Token Staff hoặc Admin.**

---

### 9.1 Tạo Đơn Tại Quầy POS 🔐 Staff/Admin

```http
POST /api/orders/counter
```

**Body — Khách ngồi tại bàn (Staff bấm hộ):**
```json
{
  "tableId": "65abc001",
  "items": [{ "menuItemId": "65def001", "name": "Lẩu Thái", "basePrice": 250000, "quantity": 1 }]
}
```

**Body — Khách mang đi (Takeaway / Giao hàng):**
```json
{
  "tableName": "Anh Nam - Mua về",
  "orderType": "takeaway",
  "items": [{ "menuItemId": "65def002", "name": "Trà Đá", "basePrice": 5000, "quantity": 3 }]
}
```
> Không truyền `tableId` → Hệ thống tự sinh một "Bàn Ảo". Trợ giúp truyền thêm `orderType` là `takeaway` hoặc `delivery` để dễ bề lấy báo cáo. Mặc định là `dine_in`.

> ⚡ Các món được tạo thẳng ở trạng thái `pending_approval` — bay thẳng vào hàng đợi bếp.

---

### 9.2 Màn Hình Bếp 🔐 Staff/Admin/👨‍🍳 Chef

```http
GET /api/orders/kitchen/all
GET /api/orders/kitchen/active
```
Trả về danh sách các đơn có món ở trạng thái `pending_approval` hoặc `cooking`.

---

### 9.3 Duyệt Từng Món 🔐 Staff/Admin/👨‍🍳 Chef

```http
PUT /api/orders/:sessionId/item/:itemId/status
```

```json
{ "status": "cooking" }
```

> 💡 Hệ thống tự động ghi nhận `actionByName`, `actionBy`, `actionAt` khi nhân viên thao tác.

---

### 9.4 Duyệt Nhanh Tất Cả Món 🔐 Staff/Admin/👨‍🍳 Chef

```http
PUT /api/orders/:sessionId/approve-all
```
Chuyển tất cả `pending_approval` → `cooking` trong 1 lần bấm.

---

### 9.5 Xem Lịch Sử Đơn Hàng 🔐 Staff/Admin

```http
GET /api/orders/history/all?page=1&limit=10&start=2026-04-01&end=2026-04-30&type=dine_in
```

| Param | Kiểu | Mô tả |
|---|---|---|
| `page` | number | Trang hiện tại (Mặc định: 1) |
| `limit` | number | Số đơn mỗi trang (Mặc định: 20) |
| `start` | YYYY-MM-DD | Từ ngày |
| `end` | YYYY-MM-DD | Đến ngày |
| `type` | string | `dine_in` (Tại quán), `takeaway` (Mang về), `delivery` (Giao hàng). Dùng dấu phẩy nếu nhiều loại. |

---

### 9.6 Xem / Cập Nhật / Xóa Đơn 🔐 Staff/Admin

```http
GET    /api/orders/:id
PUT    /api/orders/:id
DELETE /api/orders/:id
```

---

### 9.7 Đóng Bàn / Chốt Phiên (Complete Order) 🔐 Staff/Admin
Dùng khi khách đã thanh toán xong (bằng tiền mặt/chuyển khoản) và bạn muốn giải phóng bàn về trạng thái trống (`empty`).

```http
POST /api/orders/:id/complete
```
> API này sẽ chuyển `status` sang `completed`, ghi nhận `completedAt` và tự động đổi trạng thái bàn sang `empty`.

---

## 10. Thanh Toán (Payments)

### 10.1 Tạo QR Thanh Toán MBBank ⚡ Public

```http
POST /api/payments/generate-qr/:orderId
```

**Response 200:**
```json
{
  "orderId": "65jkl001",
  "amount": 285000,
  "qrBase64": "iVBORw0KGgoAAAANSUhEUgAAA...",
  "paymentContent": "HD65JKL001"
}
```

> ⚠️ Nếu lỗi kết nối cổng ngân hàng → Backend trả về 503 (Service Unavailable), Frontend nên fallback sang "Thu tiền mặt".

---

### 10.2 Webhook MBBank 🤖 Bot Python

```http
POST /api/payments/webhook
```

Khi nhận Webhook hợp lệ, hệ thống sẽ tự động:
- Đổi `paymentStatus` → `"paid"`
- Đổi `status` → `"completed"`
- Giải phóng bàn → `"empty"`
- Ghi nhận Payment record
- Bắn socket: `order-paid`, `tables-updated`

---

### 10.3 Thu Tiền Mặt 🔐 Staff/Admin

```http
POST /api/payments
```

```json
{
  "orderId": "65jkl001",
  "method": "Tiền mặt",
  "amount": 285000
}
```

---

### 10.4 Giả Lập Webhook (Test) 👑 Admin

```http
POST /api/payments/webhook-mock/:orderId
```

---

### 10.5 Xem Lịch Sử Thanh Toán 🔐 Staff/Admin

```http
GET /api/payments
```

---

## 11. Tài Khoản Ngân Hàng (Bank Accounts)

### 11.1 Lấy Tài Khoản Mặc Định ⚡ Public

```http
GET /api/bank-accounts/default
```
Trả về tài khoản được đánh dấu `isDefault: true` để dùng tạo QR cho khách.

---

### 11.2 Quản Lý Tài Khoản 👑 Admin

```http
GET    /api/bank-accounts
POST   /api/bank-accounts
PUT    /api/bank-accounts/:id
DELETE /api/bank-accounts/:id
```

**Request Body (POST/PUT):**
```json
{
  "bankName": "MBBank",
  "accountNumber": "0123456789",
  "accountName": "NGUYEN VAN A",
  "isDefault": true
}
```

---

## 12. Thống Kê Dashboard (Stats)

> 🔐 **Lưu ý:** Toàn bộ API Thống kê yêu cầu quyền **Staff** hoặc **Admin**.
> 💡 **Bộ lọc thời gian chung:** Có thể truyền query `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`. Nếu không truyền, hệ thống sẽ mặc định tính trong ngày hôm nay.

### 12.1 Tổng Quan KPIs (Overview)
Lấy các thẻ số liệu báo cáo ngắn gọn ở trên cùng trang Dashboard.

```http
GET /api/stats/overview
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 15000000,
    "totalOrders": 45,
    "averageOrderValue": 333333,
    "cancelledItemRatio": 2.5,
    "tablesServed": 40
  }
}
```
---

### 12.2 Biểu Đồ Doanh Thu (Revenue Chart)
Cung cấp dữ liệu để vẽ biểu đồ đường (Line chart) hoặc cột (Bar chart). Hỗ trợ nhóm theo ngày, tuần, tháng.

```http
GET /api/stats/revenue-chart?groupBy=day
```
> `groupBy` có thể là `day`, `week`, `month`.

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "label": "2026-04-01", "revenue": 2000000, "orders": 10 },
    { "label": "2026-04-02", "revenue": 3500000, "orders": 15 }
  ]
}
```
---

### 12.3 Top Món Bán Chạy (Top Items)
Phục vụ mục Bestseller, giúp biết món nào bán chạy theo số lượng và doanh thu.

```http
GET /api/stats/top-items?limit=10
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "menuItemId": "65def001",
      "name": "Lẩu Thái Hải Sản",
      "totalQuantitySold": 120,
      "totalRevenue": 30000000
    }
  ]
}
```
---

### 12.4 Hiệu Suất Nhà Bếp (Kitchen Performance)
Đánh giá tình trạng chế biến của Đầu Bếp (Thời gian chờ).

```http
GET /api/stats/kitchen-performance
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "averageCookingTimeMin": 14.5,
    "totalItemsCooked": 450,
    "pendingApprovalItems": 12,
    "longestWaitTimeMin": 45
  }
}
```

---

## 13. WebSocket Thời Gian Thực

### Kết nối
```javascript
import { io } from 'socket.io-client';
const socket = io("http://localhost:3000");
```

### Danh Sách Tất Cả Events

| Event | Khi nào bắn | Data trả về | Frontend dùng để |
|---|---|---|---|
| `categories-updated` | Thêm / Sửa / Xóa danh mục | `Category[]` | Tải lại bộ lọc danh mục |
| `menu-updated` | Thêm / Sửa / Xóa món ăn | `MenuItem[]` | Cập nhật giá, tắt/bật món tức thì |
| `weekly-menu-updated` | Thay đổi lịch tuần | (Signal) | Tải lại thực đơn tuần |
| `new-order` | Bàn mới mở / Khách đầu tiên | `Order object` | Nổi chuông ở màn hình lễ tân |
| `order-updated` | Trạng thái món thay đổi | `Order object` | Cập nhật màn hình bếp & giỏ hàng khách |
| `order-paid` | Thanh toán tự động thành công | `{ orderId, paymentStatus }` | Tắt popup QR, hiện "Thành công" |
| `tables-updated` | Bất kỳ thay đổi trạng thái bàn | `Table[]` | Render lại sơ đồ bàn |

### Ví Dụ Sử Dụng Đầy Đủ

```javascript
// App khách hàng (trang /table/ban-vip-1)
socket.on("order-paid", ({ orderId }) => {
  if (orderId === currentSessionId) {
    showSuccessModal("Thanh toán thành công! 🎉");
    closeQRModal();
  }
});

// Khách xem trạng thái món real-time
socket.on("order-updated", (order) => {
  if (order._id === currentSessionId) {
    updateItemStatusUI(order.items);
  }
});

// Màn hình Menu hiển thị thực đơn tuần tự cập nhật
socket.on("menu-updated", (menuItems) => {
  renderMenu(menuItems);
});

socket.on("categories-updated", (categories) => {
  renderCategoryFilter(categories);
});

// Màn hình POS (sơ đồ bàn)
socket.on("tables-updated", (tables) => {
  renderTableMap(tables);
});

// Màn hình bếp
socket.on("order-updated", (order) => {
  updateKitchenDisplay(order);
});

// Màn hình lễ tân
socket.on("new-order", (order) => {
  playAlertSound();
  addToOrderQueue(order);
});
```

---

## 14. Cấu Trúc Dữ Liệu Trả Về

### Order Object (Phiên ăn)
```typescript
{
  _id: string;                      // Session ID
  tableId: string;                  // ObjectID của bàn
  tableName: string;                // Tên bàn (lưu cứng khi tạo phiên)
  sessionToken: string;             // Token nhận dạng phiên
  total: number;                    // Tổng tiền (VNĐ)
  status: "active" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  orderType: "dine_in" | "takeaway" | "delivery";   // Loại đơn: Tại quán, Mang về, Giao hàng
  completedAt?: Date;
  completedByName?: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}
```

### OrderItem Object (Món trong phiên)
```typescript
{
  _id: string;
  menuItemId: string;
  isCombo: boolean;
  name: string;
  basePrice: number;
  quantity: number;
  totalPrice: number;              // (basePrice + options + addons) * quantity
  selectedOption?: { name: string; priceExtra: number; };
  selectedAddons: { name: string; priceExtra: number; }[];
  status: "in_cart" | "pending_approval" | "cooking" | "served" | "cancelled";
  actionByName?: string;           // Nhân viên duyệt
  actionAt?: Date;                 // Thời gian duyệt
}
```

### Payment Object (Biên lai)
```typescript
{
  _id: string;
  orderId: string | Order;
  amount: number;
  method: string;                  // "Tiền mặt", "Chuyển khoản", ...
  bankAccountId?: string | BankAccount;
  tableName: string;               // Snapshot tên bàn lúc thu tiền
  orderTypeSnapshot: string;       // Snapshot loại đơn (dine_in, takeaway, delivery)
  bankNameSnapshot: string;        // Snapshot ngân hàng + STK lúc thu tiền
  cashierName: string;             // Snapshot tên thu ngân
  status: "success";
  createdAt: Date;
}
```

### WeeklyMenu Object (Lịch bán tuần)
```typescript
{
  _id: string;
  title: string;                   // VD: "Tuần 1 Tháng 4"
  startDate: Date;
  endDate: Date;
  menuItems: string[] | MenuItem[]; // Mảng ID hoặc đã populate
  status: "active" | "draft";
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🗺️ Sơ Đồ Luồng Tổng Thể

```
KHÁCH VÀO QUÁN
     │
     ▼
Quét QR bàn → GET /orders/table/:id/active-session
     │
     ├── 404: Bàn trống → Lấy thực đơn tuần (GET /weekly-menu/active) → Hiển thị Menu
     │
     └── 200: Bàn có người → Hiển thị bill hiện tại + Menu thêm món
     │
     ▼
Chọn món → POST /orders                   [items.status = "in_cart"]
     │      ⚠️ Kiểm tra Weekly Menu nếu có lịch active
     ▼
Bấm "Gửi Bếp" → POST /orders/:id/checkout [items.status = "pending_approval"]
     │                                      🔔 Socket: order-updated → Bếp nhận
     ▼
Bếp xử lý:
  PUT /orders/:id/item/:itemId/status      [pending_approval → cooking → served]
  PUT /orders/:id/approve-all             [bulk: pending → cooking]
     │
     ▼
Muốn tính tiền → POST /payments/generate-qr/:orderId
     │
     └── Hiển thị QR Base64 cho khách quét
     │      ⚠️ Nếu lỗi bank → Fallback "Thu tiền mặt"
     ▼
Bot Python phát hiện (45s/lần) → POST /payments/webhook
     │
     ▼ Tự động:
  ✅ order.paymentStatus = "paid"
  ✅ order.status = "completed"
  ✅ table.status = "empty"
  ✅ Payment record được tạo
  ✅ Socket: order-paid, tables-updated → Frontend cập nhật tức thì

KHÁCH RỜI BÀN — BÀN TRỐNG SẴN SÀNG ĐÓN KHÁCH MỚI
```
