# Rightway - Hệ thống Đặt Vé Xe Trực Tuyến & Trang Quản Trị Admin

Dự án fullstack đặt vé xe khách Rightway gồm **Backend Express (JavaScript + Prisma + SQL Server)** và **Frontend React (Vite + React Router)** mô phỏng sát 100% thiết kế giao diện Figma, kèm theo **Trang Quản trị Admin**.

---

## Tổng quan giao diện

1. **Trang chủ (`/`)**:
   - Hero banner "Hành trình đẹp hơn cùng Rightway", các huy hiệu bảo đảm dịch vụ.
   - Thanh tìm kiếm chuyến xe (Điểm đi, Điểm đến, Ngày đi, Số hành khách).
   - Thao tác nhanh: Tra cứu vé, Đổi/Hủy vé, Vé của tôi, Hỗ trợ khách hàng.
   - Ưu đãi nổi bật với các thẻ khuyến mãi.
   - Tuyến xe phổ biến dạng bảng biểu có gắn thẻ trạng thái.
   - Tin tức mới nhất và Footer chuẩn nhận diện thương hiệu.

2. **Tìm vé & Bộ lọc (`/search`)**:
   - Thanh tóm tắt lộ trình tìm kiếm.
   - Bộ lọc chi tiết: Khung giờ khởi hành, Hãng xe, Khoảng giá, Đánh giá sao.
   - Danh sách thẻ chuyến xe (giờ đi - thời gian - giờ đến, nhà xe, hạng ghế, giá vé).

3. **Chọn chỗ ngồi (`/booking/seats`)**:
   - Quy trình 4 bước: Chọn chuyến -> Chọn chỗ -> Thông tin hành khách -> Thanh toán.
   - Sơ đồ ghế tầng dưới / tầng trên, hiển thị trực quan trạng thái ghế: *Trống*, *Đang chọn*, *Đã đặt*.
   - Khung thông tin đặt vé tóm tắt ở cột phải.

4. **Thông tin hành khách (`/booking/passenger`)** & **Thanh toán (`/booking/payment`)**.

5. **Trang Quản trị Admin (`/admin`)**:
   - Bảng điều khiển (Dashboard) thống kê đặt vé, doanh thu, thành viên, chuyến xe.
   - Quản lý chuyến xe (`/admin/trips`)
   - Quản lý tuyến đường (`/admin/routes`)
   - Quản lý nhà xe (`/admin/companies`)
   - Quản lý đơn đặt vé (`/admin/bookings`)
   - Quản lý khuyến mãi (`/admin/promotions`)
   - Quản lý tin tức (`/admin/news`)
   - Quản lý người dùng (`/admin/users`)


---

## Cài đặt & Khởi chạy

### 1. Yêu cầu môi trường
- **Node.js**: v20+
- **Database**: Microsoft SQL Server (hoặc Docker)

### 2. Cấu hình cơ sở dữ liệu
Khởi động SQL Server bằng Docker (nếu có):
```bash
docker compose up -d db
```
Hoặc đảm bảo SQL Server của bạn đang chạy với cấu hình trong file `backend/.env`.

Tạo Database `DatVeXe` trên SQL Server:
```sql
IF DB_ID(N'DatVeXe') IS NULL
    CREATE DATABASE [DatVeXe];
```

Đẩy schema và nạp dữ liệu mẫu:
```bash
cd backend
copy .env.example .env
npm install
npx prisma db push
npm run db:seed
```

### 3. Khởi chạy Backend API
```bash
cd backend
npm run dev
```
API server chạy tại: `http://localhost:3000`

### 4. Khởi chạy Frontend
Mở một terminal mới:
```bash
cd frontend
npm run dev
```
Trang web mở tại: `http://localhost:5173`

- Truy cập trang khách hàng: `http://localhost:5173/`
- Truy cập trang quản trị Admin: `http://localhost:5173/admin`

## Dữ liệu đặt chỗ

- `Booking` là đơn đặt chỗ, liên kết người dùng, chuyến và ngày đi; lưu thông tin liên hệ, tổng tiền, trạng thái đơn và thanh toán.
- `Ticket` là vé cho từng ghế trong một booking; mỗi vé có mã riêng, ghế, bản chụp thông tin hành khách, giá tại thời điểm đặt và trạng thái vé. Một booking có thể chứa nhiều ticket.
- `SeatStatus` quản lý tính khả dụng của ghế theo chuyến và ngày, đồng thời liên kết booking/ticket đang giữ ghế. Booking, ticket và thao tác giữ ghế được lưu trong cùng một transaction.

Sau khi cập nhật cấu trúc Prisma, chạy `npx prisma db push` trong thư mục `backend` để cập nhật cơ sở dữ liệu.

Tài khoản người dùng có trạng thái hoạt động hoặc bị khóa. Sau khi cập nhật schema, chạy lại `npx prisma db push` và `npx prisma generate` trong thư mục `backend`. Quản trị viên có thể dùng `GET /api/admin/users/:userId/status`, `POST /api/admin/users/:userId/lock` và `POST /api/admin/users/:userId/unlock`. Khóa tài khoản sẽ thu hồi các phiên đang hoạt động; tài khoản bị khóa không thể đăng nhập, làm mới phiên hoặc gọi API được bảo vệ.

### API quản lý booking dành cho Admin

- `GET /api/admin/bookings` trả về danh sách booking kèm khách hàng, chuyến, xe, vé và ghế. Hỗ trợ lọc bằng `search`, `status`, `paymentStatus`, `date` (ngày khởi hành) hoặc `fromDate`/`toDate` (khoảng ngày khởi hành).
- `GET /api/admin/bookings/:id` trả về chi tiết booking và các dữ liệu liên quan.
- `PATCH /api/admin/bookings/:id/status` nhận JSON `{ "status": "confirmed" }`. Trạng thái cho phép chuyển `pending` sang `confirmed` hoặc `cancelled`, `confirmed` sang `completed` hoặc `cancelled`. Hủy booking đã thanh toán sẽ chuyển thanh toán thành `refunded`; ghế và vé được cập nhật trong cùng transaction.

Trạng thái không hợp lệ hoặc không thể chuyển sẽ trả HTTP 409 cùng mã lỗi cụ thể; booking không tồn tại trả HTTP 404.

### Thống kê Dashboard Admin

`GET /api/admin/dashboard` trả tổng số người dùng, booking, chuyến và nhà xe; số chuyến đang hoạt động; booking theo trạng thái; booking theo trạng thái thanh toán; doanh thu; 7 ngày, 8 tuần và 6 tháng thống kê booking/doanh thu; 5 tuyến có doanh thu cao nhất; 5 nhà xe có nhiều chuyến nhất và 10 booking mới nhất. Booking và doanh thu theo thời gian được nhóm theo ngày tạo booking (`createdAt`, UTC). Doanh thu chỉ tính booking có `paymentStatus: "paid"`; booking đã hoàn tiền không còn được tính. Schema hiện không có bản ghi giao dịch hoặc thời điểm thanh toán riêng, nên biểu đồ dùng ngày tạo booking làm mốc thời gian.
