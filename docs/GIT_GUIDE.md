# Hướng Dẫn Sử Dụng Git Chuyên Nghiệp (F&B Project)

Để quản lý code như một Senior Developer, bạn nên tuân thủ các quy tắc dưới đây. Việc này giúp code của bạn sạch sẽ, dễ truy vết lỗi và hỗ trợ làm việc nhóm cực tốt.

---

## 1. Chiến Lược Phân Nhánh (Branching Strategy)
Đừng bao giờ commit trực tiếp vào nhánh `main`. Hãy sử dụng mô hình **GitHub Flow**:

- **`main`**: Nhánh chứa code đang chạy ổn định (Production). Chỉ merge vào đây khi đã test kỹ.
- **`feature/`**: Nhánh cho các tính năng mới. 
  - Ví dụ: `feature/table-session`, `feature/image-upload`.
- **`fix/`**: Nhánh để sửa lỗi gấp.
  - Ví dụ: `fix/api-crash-bug`.
- **`refactor/`**: Nhánh để tối ưu/cấu trúc lại code hiện có.

**Quy trình làm việc:**
1. Từ nhánh `main`, tạo nhánh mới: `git checkout -b feature/ten-tinh-nang`.
2. Viết code và commit trên nhánh đó.
3. Đẩy lên server: `git push origin feature/ten-tinh-nang`.
4. Tạo **Pull Request (PR)** trên GitHub/GitLab để review rồi mới merge vào `main`.

---

## 2. Quy Tắc Viết Commit (Conventional Commits)
Sử dụng chuẩn `type: description` để nhìn vào lịch sử là biết file đó thay đổi vì mục đích gì.

**Các loại `type` phổ biến:**
- `feat`: Thêm tính năng mới (ví dụ: `feat: add shared cart logic`).
- `fix`: Sửa lỗi (ví dụ: `fix: image upload timeout`).
- `docs`: Cập nhật tài liệu/README (ví dụ: `docs: update api-testing document`).
- `style`: Thay đổi format code (không đổi logic).
- `refactor`: Sửa code nhưng không thêm tính năng hay fix lỗi.
- `perf`: Cải thiện hiệu năng.

**Cấu trúc một câu commit:**
`feat(api): integrated auto-increment image ids`

---

## 3. File .gitignore (Cực kỳ quan trọng)
Tuyệt đối không bao giờ đẩy `node_modules` hay các file chứa mật khẩu lên Git.
File `.gitignore` của bạn nên có:
```text
node_modules/
.env
.DS_Store
dist/
build/
```

---

## 4. Các lệnh Git "thần thánh" cho dự án này

### Khi bắt đầu làm tính năng mới (ví dụ: Quản lý Combo)
```bash
git checkout main
git pull origin main                      # Cập nhật code mới nhất về
git checkout -b feature/combo-management  # Tạo nhánh mới
```

### Khi đang làm mà muốn lưu lại
```bash
git add .
git commit -m "feat(combo): implement create and list api"
```

### Khi muốn gộp code vào main
```bash
git checkout main
git merge feature/combo-management
git push origin main
```

### Nếu lỡ tay commit nhầm và muốn quay lại (Reset)
```bash
git reset --soft HEAD~1  # Quay lại 1 commit nhưng vẫn giữ nguyên code đã viết
```

---

> [!TIP]
> **Mẹo nhỏ:** Mỗi lần xong một Unit nhỏ của tính năng (Xong Model, Xong Service...), hãy commit một lần. Đừng để viết xong 1000 dòng code mới commit 1 lần, lúc đó rất khó để quay xe nếu bị lỗi!
