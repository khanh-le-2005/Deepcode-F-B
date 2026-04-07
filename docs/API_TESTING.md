# TÀI LIỆU TEST API (POSTMAN)

Dưới đây là danh sách các Endpoint và dữ liệu mẫu (JSON) để bạn copy paste vào Postman.

## 1. Mở Bàn Mới
- `POST /api/tables`
```json
{
  "name": "Bàn VIP 1"
}
```

## 2. Thêm Món Vào Thực Đơn (Hỗ trợ Topping/Size)
- `POST /api/menu`
```json
{
  "name": "Trà Sữa Trân Châu",
  "price": 25000,
  "category": "Đồ Uống",
  "image": "https://example.com/trasua.jpg",
  "options": [
    { "name": "Size M", "priceExtra": 0 },
    { "name": "Size L", "priceExtra": 10000 }
  ],
  "addons": [
    { "name": "Thêm Trân Châu Trắng", "priceExtra": 5000 },
    { "name": "Thêm Pudding", "priceExtra": 8000 }
  ]
}
```

## 3. Tạo Combo Khuyến Mãi
- `POST /api/combos`
```json
{
  "name": "Combo Ăn Sáng + Café",
  "description": "Bao gồm 1 Phở và 1 Ly Cafe Sữa",
  "price": 75000,
  "menuItemIds": [
    "ID_CỦA_MÓN_PHỞ_TRONG_DB",
    "ID_CỦA_MÓN_CAFE_TRONG_DB"
  ]
}
```

## 4. Quét QR -> Kiểm tra Bàn có Phiên nào Tồn tại không?
*(Frontend sẽ gọi API này khi khách quyét QR)*
- `GET /api/orders/table/ban-vip-1/active-session`
*(Lưu ý: "ban-vip-1" là slug của bàn)*

## 5. Khách Đặt Món Lần 1 (Tạo Phiên Mới) HOẶC Lần 2 (Thêm vô Phiên Cũ)
- `POST /api/orders`
```json
{
  "tableId": "ban-vip-1",
  "items": [
    {
      "menuItemId": "ID_MÓN_TRÀ_SỮA",
      "name": "Trà Sữa Trân Châu",
      "basePrice": 25000,
      "quantity": 2,
      "selectedOption": { "name": "Size L", "priceExtra": 10000 },
      "selectedAddons": [
        { "name": "Thêm Trân Châu Trắng", "priceExtra": 5000 }
      ]
    },
    {
      "menuItemId": "ID_COMBO_ĂN_SÁNG",
      "isCombo": true,
      "name": "Combo Ăn Sáng + Café",
      "basePrice": 75000,
      "quantity": 1
    }
  ]
}
```
*(Backend sẽ tự động tính `totalPrice` cho từng item dựa theo basePrice + option + addon, sau đó cập nhật tổng tiền `total` của Phiên ăn)*

## 6. Nhân viên / Bếp: Cập Nhật Trạng Thái Từng Món Khách Gọi
(Món mới gửi xuống luồng là `pending_approval`, nhân viên duyệt chuyển sang `cooking`, Bếp làm xong chuyển sang `served`).
- `PUT /api/orders/:session_id/item/:item_id/status`
```json
{
  "status": "cooking" 
}
```
*(Các trạng thái hợp lệ: `pending_approval`, `cooking`, `served`, `cancelled`)*

## 7. Thanh Toán & Đóng Phiên
- `PUT /api/orders/:session_id`
```json
{
  "status": "paid",
  "paymentMethod": "Tiền mặt"
}
```
*(Hệ thống sẽ tự động giải phóng bàn thành `empty`, đóng Session, và chuyển thông tin sang bảng `Payment`)*
