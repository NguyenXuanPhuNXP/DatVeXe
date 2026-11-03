# Rightway - Hệ thống Đặt Vé Xe Trực Tuyến & Trang Quản Trị Admin

Dự án đặt vé xe khách Rightway gồm **Backend Express + Prisma + SQL Server**, **web React + Vite** và **ứng dụng Flutter Android**. Hệ thống có khu vực khách hàng, nhân viên/quản lý nhà xe và quản trị viên.

## Trạng thái hiện tại

- Mobile yêu cầu đăng nhập trước; khu vực sau đăng nhập phụ thuộc quyền tài khoản.
- Khách tìm chuyến theo ngày, chọn ghế, đặt vé, tra cứu/hủy vé, nhận QR sau khi thanh toán và chat trực tiếp với nhân viên qua WebSocket.
- Staff có mục **Chuyến xe của nhà xe** để xem lịch, sơ đồ ghế và thông tin khách đã đặt; API chỉ cho xem dữ liệu nhà xe của tài khoản.
- Mobile đã bỏ mục **Quét QR xem vé**, vẫn giữ QR vé và **Xác nhận lên xe**. Trang Tài khoản đã bỏ thông tin kết nối máy chủ.
- Cổng thanh toán hiện tại vẫn là **VNPAY**; phần tích hợp SePay đã được hoàn tác. Không tích hợp Firebase/thông báo đẩy trong bản hiện tại.
- Tài liệu mobile: [Flutter/README.md](Flutter/README.md). Dữ liệu và tài khoản mẫu: [SEED_DEMO.md](SEED_DEMO.md).

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
- **Node.js**: 22.12+ hoặc 24+ để đáp ứng tooling Vite hiện tại.
- **Mobile**: Flutter đáp ứng phiên bản Dart khai báo trong [pubspec.yaml](Flutter/pubspec.yaml), Android SDK và JDK tương thích.
- **Database**: Microsoft SQL Server (hoặc Docker)

### 2. Cấu hình cơ sở dữ liệu
Khởi động SQL Server bằng Docker (nếu có):
```bash
docker compose --env-file backend/.env up -d db
```
Tạo `backend/.env` từ [backend/.env.example](backend/.env.example) nếu chưa có, rồi điền `DATABASE_URL` và `MSSQL_SA_PASSWORD` trước khi chạy Docker. Hoặc dùng SQL Server có sẵn với cấu hình trong `backend/.env`.

Tạo Database `DatVeXe` trên SQL Server:
```sql
IF DB_ID(N'DatVeXe') IS NULL
    CREATE DATABASE [DatVeXe];
```

Đẩy schema và nạp dữ liệu mẫu:
```bash
cd backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npx prisma migrate deploy
npx prisma generate
npm run db:seed
```

### 3. Khởi chạy Backend API
```bash
cd backend
npm run dev
```
API server chạy tại: `http://localhost:3000`

### Swagger / OpenAPI

Các cấu hình tích hợp dùng chung (VNPAY, SMTP, nhà cung cấp AI và email hỗ trợ) cần được cập nhật đồng thời trong `backend/.env` local và `/opt/datvexe/backend/.env` trên VPS, rồi khởi động lại backend để áp dụng. Giữ riêng `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, khóa JWT và QR của từng môi trường; không chép đè toàn bộ file hoặc đưa bí mật vào Git. URL IPN VNPAY phải trỏ về backend xử lý đúng database của đơn thanh toán; một tunnel vào local không thay thế callback cho đơn trên VPS.

Sau khi chạy backend bằng `npm run dev` trong thư mục `backend`:

- Swagger UI: http://localhost:3000/api-docs/
- OpenAPI JSON: http://localhost:3000/api-docs.json
- Với ngrok, dùng cùng đường dẫn `/api-docs/` trên tên miền API (không thêm `/api`).

Gọi `POST /api/auth/login`, sao chép `accessToken`, rồi bấm **Authorize** và nhập token để thử API cần đăng nhập. Refresh/logout sử dụng cookie do API đặt. Thao tác **Try it out** gọi API thật và có thể thay đổi dữ liệu.

Tài liệu hiện gồm health, auth (cả khôi phục mật khẩu), tìm chuyến, booking chính và hai API lịch chuyến/sơ đồ ghế dành cho staff. Chưa mô tả đầy đủ admin, thanh toán và hỗ trợ. Cấu hình nằm ở `backend/src/config/openapi.js`; cập nhật file này khi API thay đổi.

### 4. Khởi chạy Frontend
Mở một terminal mới:
```bash
cd frontend
npm ci
npm run dev
```
Trang web mở tại: `http://localhost:5173`

- Truy cập trang khách hàng: `http://localhost:5173/`
- Truy cập trang quản trị Admin: `http://localhost:5173/admin`

## Dữ liệu đặt chỗ

Ngày chuyến là ngày lịch theo Việt Nam (`YYYY-MM-DD`), không phải thời điểm cần dịch múi giờ ở client. API tìm vé loại chuyến đã khởi hành, dù lịch vẫn còn trong trang admin. Chọn ngày khác trên mobile nếu hôm nay không còn chuyến.

- `Booking` là đơn đặt chỗ, liên kết người dùng, chuyến và ngày đi; lưu thông tin liên hệ, tổng tiền, trạng thái đơn và thanh toán.
- `Ticket` là vé cho từng ghế trong một booking; mỗi vé có mã riêng, ghế, bản chụp thông tin hành khách, giá tại thời điểm đặt và trạng thái vé. Một booking có thể chứa nhiều ticket.
- `SeatStatus` quản lý tính khả dụng của ghế theo chuyến và ngày, đồng thời liên kết booking/ticket đang giữ ghế. Booking, ticket và thao tác giữ ghế được lưu trong cùng một transaction.

Khi cập nhật một bản đã có migration, chạy `npx prisma migrate deploy` và `npm run db:generate` trong `backend`. Tài khoản chạy migration cần đủ quyền DDL; tài khoản ứng dụng trên VPS có thể không có quyền tạo bảng. Chỉ dùng `db push` cho môi trường phát triển có chủ đích.

Tài khoản người dùng có trạng thái hoạt động hoặc bị khóa. Quản trị viên có thể dùng `GET /api/admin/users/:userId/status`, `POST /api/admin/users/:userId/lock` và `POST /api/admin/users/:userId/unlock`. Khóa tài khoản sẽ thu hồi các phiên đang hoạt động; tài khoản bị khóa không thể đăng nhập, làm mới phiên hoặc gọi API được bảo vệ.

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

Chạy `npm test` trong thư mục `backend` để kiểm tra bộ test hiện có; không dùng các số lượng test của báo cáo cũ làm trạng thái kiểm thử hiện tại.

- Trang `/admin/anomalies` phân tích booking, vé và trạng thái ghế; API `GET /api/admin/anomalies` hỗ trợ tìm kiếm, lọc theo `tripId`, ngày khởi hành/mức rủi ro/trạng thái rà soát và phân trang. `GET /api/admin/anomalies/:bookingId` trả chi tiết vé nghi vấn, điểm, lý do và booking liên quan cùng chuyến; nếu booking không tồn tại hoặc không có phát hiện thì trả HTTP 404. Các endpoint yêu cầu xác thực và vai trò `admin`.
- Điểm nghi ngờ cộng theo tín hiệu: ghế trùng giữa booking đang hoạt động (+70), thông tin liên hệ lặp lại cùng chuyến/ngày (+25), 4+ booking trong cửa sổ 10 phút (+35), tên tương tự/trùng nhưng liên hệ khác nhau (+15), ghế/giá/thông tin hành khách/trạng thái vé không nhất quán (+25–35). Điểm hiển thị giới hạn 100; mức thấp 15–39, trung bình 40–69, cao từ 70.
- Chỉ thông tin tên đã che một phần được trả về từ API; số điện thoại và email chỉ được dùng nội bộ để so khớp, không đưa vào kết quả. Hệ thống quét tối đa 2.000 booking gần nhất mỗi lần; lọc ngày hoặc tìm kiếm để thu hẹp phạm vi khi được cảnh báo giới hạn.
- `PATCH /api/admin/anomalies/:bookingId/review` nhận `{ "status": "open" }` (chưa xử lý), `{ "status": "in_review" }` (đang kiểm tra), `{ "status": "reviewed" }` (đã xác nhận) hoặc `{ "status": "false_positive" }` (không phải bất thường), kèm `note` tùy chọn tối đa 500 ký tự. Trạng thái rà soát được lưu riêng trong `BookingAnomalyReview`; việc gắn cờ/đánh dấu không tự động hủy, sửa trạng thái booking hay giải phóng ghế.
- Bảng trạng thái rà soát được triển khai cùng migration của backend. Cơ chế này là kiểm tra hậu kiểm, không thay thế unique constraint của `SeatStatus` hoặc transaction đặt ghế SERIALIZABLE.

### Thống kê Dashboard Admin

`GET /api/admin/dashboard` trả tổng số người dùng, booking, chuyến và nhà xe; số chuyến đang hoạt động; booking theo trạng thái; booking theo trạng thái thanh toán; doanh thu; thống kê theo thời gian, tuyến/nhà xe nổi bật và booking mới nhất. Dashboard admin hiện nhóm theo ngày tạo booking (`createdAt`, UTC), chỉ tính doanh thu từ booking `paid`. Đây là mốc báo cáo của endpoint này; schema đã có `PaymentReceipt` và `PaymentAttempt` để theo dõi khoản thu/giao dịch riêng.

### Import chuyến xe từ Excel

- `POST /api/admin/trips/import/preview` đọc và kiểm tra file multipart Excel, field tên `file`; `POST /api/admin/trips/import` import các dòng hợp lệ. Cả hai endpoint nhận query `sheetName`; nếu bỏ trống sẽ dùng sheet đầu tiên.
- Chấp nhận `.xlsx`, giới hạn 5 MB, 20 MB sau giải nén và 300 dòng dữ liệu. Header bắt buộc: `routeId`, `busId`, `companyId`, `departureTime`, `arrivalTime`, `duration`, `price`. Header tùy chọn: `availableDate`, `isActive`. Ví dụ: `routeId=route_1`, `busId=bus_1`, `companyId=company_1`, `departureTime=08:30`, `arrivalTime=13:00`, `duration=4h30`, `price=250000`, `availableDate=2026-10-25`, `isActive=true`.
- ID tuyến/xe/nhà xe phải tồn tại và xe phải thuộc đúng nhà xe. Giá phải là số nguyên dương; thời gian dùng `HH:mm`; ngày có dạng `YYYY-MM-DD` hoặc ô ngày Excel; `isActive` chấp nhận boolean hoặc `1`/`0`. Bỏ trống `availableDate` nghĩa là chuyến định kỳ.
- Preview trả `totalRows`, `validRows`, `invalidRows` và tối đa 100 dòng xem trước kèm lỗi từng dòng. Import kiểm tra lại file, bỏ qua dòng sai/trùng và trả `importedRows`, `failedRows`, `validationFailures`, `importFailures`. Trùng lịch được xác định theo tuyến, xe, nhà xe, giờ khởi hành và ngày chạy; dòng lỗi không được ghi vào database.
- Giao diện tại `/admin/trips` cho phép chọn file, chọn sheet tùy chọn, xem lỗi theo dòng/cột trước khi ghi, xác nhận import và xem số dòng thành công/thất bại. Backend tests chạy bằng `npm test` trong thư mục `backend`.

### Xuất chuyến xe ra Excel

- `GET /api/admin/trips/export-excel` xuất danh sách chuyến xe ra `.xlsx`. Endpoint nằm trong router Admin, yêu cầu xác thực và vai trò `admin`; workbook gồm mã chuyến, tuyến, xe, nhà xe, giờ đi/đến, thời lượng, giá vé, ngày chạy và trạng thái.
- Trang `/admin/trips` có nút **Xuất Excel** để tải file về. Nếu không có chuyến xe, API trả HTTP 404 với mã `NO_TRIPS_TO_EXPORT`; các lỗi khác được chuyển qua error handler chung.


### Khu vực nhà xe và nhân viên

Mỗi tài khoản có tối đa một `CompanyMembership`, tách khỏi vai trò admin toàn hệ thống. Đăng ký công khai không được tự gán quyền nhà xe.

| Vai trò | Khu vực | Quyền |
| --- | --- | --- |
| Chủ nhà xe (`owner`) | `/company/bookings`, `/company/buses`, `/company/trips`, `/company/employees`, `/company/revenue` | Quản lý xe, chuyến, vé, thu tiền, nhân viên và doanh thu trong nhà xe; cấp quyền quản lý hoặc nhân viên thường. |
| Quản lý (`manager`) | `/staff/bookings`, `/staff/customers`, `/staff/employees` | Quản lý vé, thu tiền, sửa liên hệ hành khách; tạo, sửa tên, khóa/mở quyền làm việc của nhân viên thường. Không tự nâng quyền hoặc chỉnh sửa quản lý/chủ nhà xe. |
| Nhân viên thường (`staff`) | `/staff/bookings`, `/staff/customers` | Duyệt/hủy/hoàn thành vé, xác nhận thu tiền, tìm và cập nhật thông tin khách trên vé đang hoạt động. |
| Admin | `/admin/company-access`, `/admin/payments` | Gán tài khoản hiện có vào nhà xe và vai trò; thu hồi quyền; ghi nhận khoản thu cho booking. |

**Bắt đầu:** chạy migration và `npm run db:generate`, nạp quyền theo [SEED_DEMO.md](SEED_DEMO.md) trên môi trường demo, rồi đăng nhập admin và mở **Phân quyền nhà xe**. Chọn tài khoản và nhà xe, gán vai trò chủ nhà xe. Người đó đăng nhập lại để vào khu vực làm việc và tạo nhân viên. Backend kiểm tra membership hiện hành trong mọi request nghiệp vụ; quyền thực tế lấy từ dữ liệu `RolePermission`, không chỉ từ tên vai trò.

API `/api/operator/*` luôn lấy `companyId` từ membership đã xác thực; client không được chọn nhà xe để mở rộng phạm vi. Với `operator.work`, staff được đọc lịch qua `GET /api/operator/trip-board?date=YYYY-MM-DD` và ghế/đặt chỗ qua `GET /api/operator/trip-board/:id/seats?date=YYYY-MM-DD`. Quyền đọc này không cấp quyền sửa chuyến; quản lý xe/chuyến và doanh thu có permission riêng. Thông tin khách được sửa theo từng đơn, đồng bộ ticket trong transaction, không đổi hồ sơ tài khoản khách toàn hệ thống. Xe có vé đang hoạt động không được đổi số ghế. Chuyến có lịch sử booking không được đổi xe/tuyến/ngày/giờ khởi hành hoặc xóa; có thể tạm dừng bán.

### Ghi nhận thanh toán và tra cứu an toàn

- Trang đặt vé hỗ trợ `cash`, `bank_transfer` (nhân viên xác nhận tiền thực nhận) và `vnpay` (cổng thanh toán). Lựa chọn phương thức không tự đánh dấu đã trả tiền. Tạo giao dịch MoMo mới đã đóng; callback cũ còn được giữ để xử lý lịch sử.
- Sau khi kiểm tra tiền thực nhận, người có quyền mở **Quản lý vé → Ghi nhận thu tiền**, chọn phương thức và nhập mã tham chiếu nếu chuyển khoản. `POST /api/operator/bookings/:id/payment` hoặc `/api/admin/bookings/:id/payment` nhận `{ "method": "bank_transfer", "reference": "BANK-001" }` hoặc `{ "method": "cash" }`. API lấy số tiền từ booking, ghi `PaymentReceipt` với người xác nhận và thời điểm; ngăn thu trùng và thu trên đơn đã hủy.
- Thống kê nhà xe lọc theo ngày thu tiền (giờ Việt Nam), chỉ tính biên nhận có booking còn `paid`; hiển thị riêng khoản đã ghi nhận hoàn tiền. Booking cũ được seed `paid` nhưng không có biên nhận không nằm trong thống kê khoản thu của nhà xe. Dashboard admin hiện có vẫn theo ngày tạo booking như đã mô tả ở trên.
- Hủy đơn đã thu tiền ghi nhận `refunded` trong sổ theo dõi; ứng dụng không tự chuyển tiền qua ngân hàng. Nhà xe thực hiện hoàn tiền bên ngoài hệ thống.
- `/api/bookings/my` và `/my-bookings` yêu cầu đăng nhập, chỉ lấy `userId` từ phiên. Xem/tra cứu/hủy một booking cần tài khoản sở hữu hoặc đúng điện thoại đặt vé. Khách vãng lai cần nhập mã vé và điện thoại. Booking `completed` không được hủy; ngày khởi hành đã qua (theo múi giờ Việt Nam) không được đặt.
- Frontend có thể cấu hình URL API bằng `VITE_API_URL`, mặc định `http://localhost:3000/api`.


### Giữ ghế 5 phút, vé tại quầy và QR

- Tạo booking là thời điểm bắt đầu giữ ghế: `expiresAt = now + 5 phút`, SeatStatus là `held`. Mọi đơn chưa thanh toán (kể cả đã duyệt) hết hạn sẽ chuyển `cancelled`, vé bị hủy, ghế giải phóng trong cùng transaction. Không gia hạn khi tải lại trang hoặc thử thanh toán. Đơn cũ chưa có `expiresAt` tính hạn bằng `createdAt + 5 phút`.
- Worker giải phóng ghế chạy mỗi 5 giây khi khởi động bằng `npm start`/`npm run dev`; việc tìm chuyến, xem ghế, tạo đơn và thu tiền cũng kiểm tra hạn. Hạn thanh toán được kiểm tra tại giao dịch, không dựa vào đồng hồ trình duyệt. Worker email chạy riêng, SMTP chậm không làm chậm giải phóng ghế.
- Trang `/staff/counter` (chủ nhà xe: `/company/counter`) bán vé tại quầy. Nhân viên chọn chuyến/ngày/ghế, nhập tên, điện thoại, email, xác nhận đã thu đủ tiền mặt/chuyển khoản. Booking, tickets, ghế, biên nhận và job gửi email được ghi cùng transaction; vé được xác nhận ngay.
- `/staff/exchange` hoặc `/company/exchange`: tìm vé đã thanh toán, chưa lên xe và chưa khởi hành, chọn chuyến/ghế mới trong cùng nhà xe, giữ nguyên số vé. API báo giá trước khi đổi; xác nhận số tiền thu thêm hoặc hoàn lại tại quầy. BookingChange lưu lịch sử, người xử lý, chênh lệch và mã tham chiếu. Biên nhận gốc được giữ nguyên; thống kê cộng/trừ các khoản chênh lệch đúng ngày xử lý. QR cũ bị vô hiệu; QR mới được gửi lại qua email.
- `/staff/qr-info` hoặc `/company/qr-info`: quét camera, chọn ảnh QR hoặc dán nội dung mã để xem thông tin, không thay đổi trạng thái vé.
- `/staff/qr-board` hoặc `/company/qr-board`: chọn chuyến hôm nay, quét, kiểm tra thông tin và nhấn **Xác nhận khách đã lên xe**. API kiểm tra chữ ký, phiên bản QR, nhà xe, chuyến, ngày, trạng thái thanh toán, trạng thái vé và chống xác nhận trùng. Camera cần HTTPS hoặc localhost và quyền camera của trình duyệt; chọn ảnh là phương án thay thế.
- QR được ký HMAC-SHA256, chứa mã vé, ghế, tên hành khách, chuyến, tuyến, ngày/giờ và phiên bản. Không chứa email/điện thoại hoặc khóa bí mật. Trạng thái hiệu lực luôn lấy từ database; không tin thông tin tự khai trong mã QR. QR của booking cũ không có hiệu lực sau đổi vé/sửa liên hệ.
- Sau thu tiền hoặc IPN hợp lệ của cổng thanh toán, đơn chuyển `confirmed/paid`, ticket được xác nhận và `TicketEmailJob` được tạo trong cùng transaction. Job email chứa phiên bản vé, tự thử lại khi SMTP lỗi, không làm mất giao dịch thanh toán. Job của phiên bản cũ bị bỏ qua. Có thể tải QR tại trang tra cứu và gửi lại email tới đúng địa chỉ trên đơn. Nếu tiến trình dừng sau khi SMTP nhận thư nhưng trước khi ghi trạng thái, email có thể được gửi lặp; hiệu lực và chống quét trùng vẫn theo database.

### Tích hợp VNPAY (hiện hành)

- `POST /api/ticketing/bookings/:id/vnpay`: tạo URL đã ký HMAC-SHA512, lấy số tiền từ database nhân 100, thời gian GMT+7, `vnp_ExpireDate` bằng hạn giữ ghế gốc.
- `GET /api/ticketing/vnpay/ipn`: xác minh chữ ký, TmnCode, mã giao dịch, số tiền và cả ResponseCode/TransactionStatus. Trả JSON RspCode theo giao thức VNPAY: 00 đã ghi nhận, 02 đã xử lý, 01 không tìm thấy, 04 sai số tiền, 97 sai chữ ký, 99 lỗi. Chỉ IPN hợp lệ ghi khoản thu/cấp QR/xếp lịch email; `/payment/vnpay-return` chỉ đọc trạng thái.
- PaymentAttempt có `provider` để cách ly VNPAY và giao dịch lịch sử MoMo. URL tạo thanh toán MoMo đã đóng; callback MoMo cũ được giữ cho đối soát lịch sử.
- Trang đối soát dùng tên chung **Đối soát thanh toán**, admin tại `/admin/payment-issues`, nhà xe/quản lý tại khu vực riêng. Khoản trả muộn không lấy lại ghế đã giải phóng, được gắn cờ cần hoàn tiền thủ công.
- `npm test` chạy bộ test hiện có trong backend theo thứ tự. Các test mock/unit không xác minh một giao dịch thật tại cổng thanh toán; cần kiểm thử sandbox riêng trước khi phát hành.


### Vận hành VNPAY và email

Admin có trang `/admin/integrations`; nhà xe/nhân viên có `/company/email-jobs` và `/staff/email-jobs`. Trang quản trị cho kiểm tra kết nối, gửi thư thử tới chính email tài khoản quản trị, xem giao dịch và hàng đợi. Gửi lại email luôn kiểm tra trạng thái paid, phiên bản QR, nhà xe và thời gian chờ; không cho truyền email nhận tùy ý. Khách có API `/api/ticketing/bookings/:id/delivery` được bảo vệ bằng tài khoản sở hữu hoặc số điện thoại đúng để xem trạng thái gửi vé.

Chạy `npm run integrations:check` trong backend để kiểm tra kết nối mà không gửi thư/thu tiền. Cổng 587 dùng `SMTP_SECURE=false` + STARTTLS; cổng 465 dùng `true`. Các biến cấu hình được mô tả trong [backend/.env.example](backend/.env.example). Khi chạy integration tests có ghi database, tạm dừng server/worker dùng cùng DB để worker thật không xử lý fixture email của tests.

## Bộ seed và tài khoản demo

Xem [SEED_DEMO.md](SEED_DEMO.md) để biết 5 vai trò lưu trong database, tài khoản demo, cách chạy migration/seed và nguồn dữ liệu/ảnh nhà xe.

## Hỗ trợ khách hàng và khôi phục mật khẩu

- Hội thoại dùng các API `/api/support/conversations` cho khách và `/api/support/staff/conversations` cho nhân viên. Quyền đọc/trả lời lấy từ tài khoản và nhà xe của membership.
- WebSocket `/api/support/socket` báo `support.ready` hoặc `support.updated`; client tải lại dữ liệu qua HTTP. Cần proxy HTTP/1.1 với header `Upgrade` và `Connection`. Frontend web giữ polling làm dự phòng; mobile tự kết nối lại khi mất mạng.
- Mobile hiển thị tên khách ở màn trả lời của staff, tên nhà xe ở màn khách. API hiện vẫn tạo một hội thoại mới cho mỗi yêu cầu mới: cùng khách/nhà xe có thể có nhiều hội thoại đang mở; chưa có cơ chế tự gộp hoặc dùng lại hội thoại.
- `POST /api/auth/forgot-password` và `POST /api/auth/reset-password` hỗ trợ mã email 8 chữ số, hạn 10 phút, một lần dùng, tối đa 5 lần thử; giới hạn gửi lại theo tài khoản và theo IP. Đổi mật khẩu thu hồi các phiên cũ. Cần migration `20261103000000_password_reset` và SMTP hoạt động.
- AI hỗ trợ `CHAT_PROVIDER=gemini` hoặc `openai`, dùng model/API key tương ứng trong backend. Không có key sẽ trả `CHAT_NOT_CONFIGURED`; SMTP không thay thế cấu hình AI.

## Kiểm tra, triển khai và giới hạn

Chạy từ đúng thư mục thành phần:

```powershell
# backend
npm test
npm run integrations:check

# frontend
npm run lint
npm run build

# Flutter
flutter analyze
flutter test
flutter test tool/check_api_test.dart
flutter build apk --debug
```

VPS của dự án dùng web/API công khai tại `http://180.93.113.176:8081`, Swagger tại `/api-docs/` và API tại `/api`. Nginx chuyển tiếp tới backend nội bộ cổng `3001`; dịch vụ systemd là `datvexe`, thư mục backend là `/opt/datvexe/backend`. Local mặc định API cổng `3000`, Vite `5173`. Đây là thông tin cấu hình triển khai, không phải xác nhận dịch vụ luôn hoạt động.

Trước khi cập nhật VPS, sao lưu file liên quan và cấu hình. Chạy migration/Prisma Client khi bản cập nhật cần thay đổi schema; kiểm tra cấu hình Nginx bằng `nginx -t` trước khi reload. Giữ riêng database, cổng và khóa nội bộ giữa local/VPS; các cấu hình tích hợp chung cần được cập nhật ở cả hai bên. Không ghi API key, SMTP password hoặc khóa thanh toán vào README/Git.

Giới hạn hiện tại:

- VPS đang cấu hình HTTP; cần HTTPS và signing Android riêng trước khi phát hành chính thức.
- IPN phải trỏ về đúng backend/database tạo đơn; URL ngrok hết hiệu lực hoặc trỏ vào máy khác sẽ không xác nhận được thanh toán.
- QR vé chỉ có khi đơn đã thanh toán và chưa hủy. Mã QR thanh toán khác QR lên xe.
- Ghế có nhiều booking được hiển thị/cảnh báo để đối soát, không tự sửa hoặc xóa dữ liệu.
- Test widget và API không thay thế kiểm tra trên điện thoại thật. Chưa xác minh đầy đủ giao dịch VNPAY xuyên suốt.
- Không có Firebase/thông báo đẩy; tích hợp SePay đã hoàn tác. Chat hiện phát sự kiện trong một tiến trình API; cần pub/sub chung nếu chạy nhiều instance.
