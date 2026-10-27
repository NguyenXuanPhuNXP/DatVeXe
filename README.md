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

### Phát hiện vé trùng lặp và bất thường

- [x] Xác định các thuộc tính dùng để đánh giá khả năng trùng vé.

Các thuộc tính đã được sử dụng trong `backend/src/modules/admin/anomalies.service.js` (`bookingAnomalySelect`, `scoreBookings`):

| Nhóm thuộc tính | Thuộc tính | Cách đánh giá hiện tại |
| --- | --- | --- |
| Chuyến, ngày và ghế | `tripId`, `tripDate`, `tickets[].seatCode` (dự phòng bằng `Booking.seatCode`) | Cùng chuyến, cùng ngày và cùng ghế ở nhiều booking đang hoạt động: +70 điểm. Mã ghế được bỏ khoảng trắng đầu/cuối và chuyển thành chữ hoa. |
| Danh tính, liên hệ | `passengerPhone`, `passengerEmail`, `userId` | Trùng ít nhất một thuộc tính ở nhiều booking cùng chuyến/ngày: +25 điểm, không cộng lặp theo từng thuộc tính. Điện thoại chỉ giữ chữ số; email bỏ khoảng trắng đầu/cuối và chuyển thành chữ thường. |
| Tên hành khách | `passengerName` kết hợp điện thoại/email | Tên trùng hoặc có độ tương đồng bigram từ 0,84 trong cùng chuyến/ngày, nhưng có thông tin liên hệ khác nhau: +15 điểm. Tên được chuẩn hóa chữ thường, bỏ dấu và ký tự ngoài chữ/số. |
| Thời điểm đặt | `createdAt` kết hợp điện thoại/email/tài khoản | Cùng danh tính tạo ít nhất 4 booking đang hoạt động trong cửa sổ 10 phút: +35 điểm; có thể thuộc các chuyến khác nhau. |
| Trạng thái đơn | `status` | Chỉ `pending`, `confirmed`, `completed` tham gia đối chiếu trùng ghế, lặp danh tính, tên tương tự và đặt dồn; booking `cancelled` được loại khỏi các đối chiếu này. |

Các trường `totalPrice`, giá vé, thông tin hành khách trên vé, `paymentStatus`, trạng thái vé và liên kết `SeatStatus` còn được dùng để phát hiện dữ liệu bất nhất. Đây là các tín hiệu bất thường bổ sung, không phải khóa xác định trùng ghế. `bookingCode` và `ticketCode` phục vụ tra cứu/hiển thị.

Đã xác minh bằng `node --test tests/anomalies.service.test.js` trong thư mục `backend`: 11/11 kiểm thử đạt (27/10/2026).

- Trang `/admin/anomalies` phân tích booking, vé và trạng thái ghế; API `GET /api/admin/anomalies` hỗ trợ tìm kiếm, lọc theo `tripId`, ngày khởi hành/mức rủi ro/trạng thái rà soát và phân trang. `GET /api/admin/anomalies/:bookingId` trả chi tiết vé nghi vấn, điểm, lý do và booking liên quan cùng chuyến; nếu booking không tồn tại hoặc không có phát hiện thì trả HTTP 404. Các endpoint yêu cầu xác thực và vai trò `admin`.
- Điểm nghi ngờ cộng theo tín hiệu: ghế trùng giữa booking đang hoạt động (+70), thông tin liên hệ lặp lại cùng chuyến/ngày (+25), 4+ booking trong cửa sổ 10 phút (+35), tên tương tự/trùng nhưng liên hệ khác nhau (+15), ghế/giá/thông tin hành khách/trạng thái vé không nhất quán (+25–35). Điểm hiển thị giới hạn 100; mức thấp 15–39, trung bình 40–69, cao từ 70.
- Chỉ thông tin tên đã che một phần được trả về từ API; số điện thoại và email chỉ được dùng nội bộ để so khớp, không đưa vào kết quả. Hệ thống quét tối đa 2.000 booking gần nhất mỗi lần; lọc ngày hoặc tìm kiếm để thu hẹp phạm vi khi được cảnh báo giới hạn.
- `PATCH /api/admin/anomalies/:bookingId/review` nhận `{ "status": "open" }` (chưa xử lý), `{ "status": "in_review" }` (đang kiểm tra), `{ "status": "reviewed" }` (đã xác nhận) hoặc `{ "status": "false_positive" }` (không phải bất thường), kèm `note` tùy chọn tối đa 500 ký tự. Trạng thái rà soát được lưu riêng trong `BookingAnomalyReview`; việc gắn cờ/đánh dấu không tự động hủy, sửa trạng thái booking hay giải phóng ghế.
- Sau khi cập nhật schema, chạy `npx prisma db push` và `npx prisma generate` trong thư mục `backend` để tạo bảng trạng thái rà soát. Cơ chế này là kiểm tra hậu kiểm, không thay thế unique constraint của `SeatStatus` hoặc transaction đặt ghế SERIALIZABLE.

### Thống kê Dashboard Admin

`GET /api/admin/dashboard` trả tổng số người dùng, booking, chuyến và nhà xe; số chuyến đang hoạt động; booking theo trạng thái; booking theo trạng thái thanh toán; doanh thu; 7 ngày, 8 tuần và 6 tháng thống kê booking/doanh thu; 5 tuyến có doanh thu cao nhất; 5 nhà xe có nhiều chuyến nhất và 10 booking mới nhất. Booking và doanh thu theo thời gian được nhóm theo ngày tạo booking (`createdAt`, UTC). Doanh thu chỉ tính booking có `paymentStatus: "paid"`; booking đã hoàn tiền không còn được tính. Schema hiện không có bản ghi giao dịch hoặc thời điểm thanh toán riêng, nên biểu đồ dùng ngày tạo booking làm mốc thời gian.

### Import chuyến xe từ Excel

- `POST /api/admin/trips/import/preview` đọc và kiểm tra file multipart Excel, field tên `file`; `POST /api/admin/trips/import` import các dòng hợp lệ. Cả hai endpoint nhận query `sheetName`; nếu bỏ trống sẽ dùng sheet đầu tiên.
- Chấp nhận `.xlsx`, giới hạn 5 MB, 20 MB sau giải nén và 300 dòng dữ liệu. Header bắt buộc: `routeId`, `busId`, `companyId`, `departureTime`, `arrivalTime`, `duration`, `price`. Header tùy chọn: `availableDate`, `isActive`. Ví dụ: `routeId=route_1`, `busId=bus_1`, `companyId=company_1`, `departureTime=08:30`, `arrivalTime=13:00`, `duration=4h30`, `price=250000`, `availableDate=2026-10-25`, `isActive=true`.
- ID tuyến/xe/nhà xe phải tồn tại và xe phải thuộc đúng nhà xe. Giá phải là số nguyên dương; thời gian dùng `HH:mm`; ngày có dạng `YYYY-MM-DD` hoặc ô ngày Excel; `isActive` chấp nhận boolean hoặc `1`/`0`. Bỏ trống `availableDate` nghĩa là chuyến định kỳ.
- Preview trả `totalRows`, `validRows`, `invalidRows` và tối đa 100 dòng xem trước kèm lỗi từng dòng. Import kiểm tra lại file, bỏ qua dòng sai/trùng và trả `importedRows`, `failedRows`, `validationFailures`, `importFailures`. Trùng lịch được xác định theo tuyến, xe, nhà xe, giờ khởi hành và ngày chạy; dòng lỗi không được ghi vào database.
- Giao diện tại `/admin/trips` cho phép chọn file, chọn sheet tùy chọn, xem lỗi theo dòng/cột trước khi ghi, xác nhận import và xem số dòng thành công/thất bại. Backend tests chạy bằng `npm test` trong thư mục `backend`.

### Xuất chuyến xe ra Excel

- `GET /api/admin/trips/export-excel` xuất danh sách chuyến xe ra `.xlsx`. Endpoint nằm trong router Admin, yêu cầu xác thực và vai trò `admin`; workbook gồm mã chuyến, tuyến, xe, nhà xe, giờ đi/đến, thời lượng, giá vé, ngày chạy và trạng thái.
- Trang `/admin/trips` có nút **Xuất Excel** để tải file về. Nếu không có chuyến xe, API trả HTTP 404 với mã `NO_TRIPS_TO_EXPORT`; các lỗi khác được chuyển qua error handler chung.
