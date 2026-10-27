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


### Khu vực nhà xe và nhân viên

Mỗi tài khoản có tối đa một `CompanyMembership`, tách khỏi vai trò admin toàn hệ thống. Đăng ký công khai không được tự gán quyền nhà xe.

| Vai trò | Khu vực | Quyền |
| --- | --- | --- |
| Chủ nhà xe (`owner`) | `/company/bookings`, `/company/buses`, `/company/trips`, `/company/employees`, `/company/revenue` | Quản lý xe, chuyến, vé, thu tiền, nhân viên và doanh thu trong nhà xe; cấp quyền quản lý hoặc nhân viên thường. |
| Quản lý (`manager`) | `/staff/bookings`, `/staff/customers`, `/staff/employees` | Quản lý vé, thu tiền, sửa liên hệ hành khách; tạo, sửa tên, khóa/mở quyền làm việc của nhân viên thường. Không tự nâng quyền hoặc chỉnh sửa quản lý/chủ nhà xe. |
| Nhân viên thường (`staff`) | `/staff/bookings`, `/staff/customers` | Duyệt/hủy/hoàn thành vé, xác nhận thu tiền, tìm và cập nhật thông tin khách trên vé đang hoạt động. |
| Admin | `/admin/company-access`, `/admin/payments` | Gán tài khoản hiện có vào nhà xe và vai trò; thu hồi quyền; ghi nhận khoản thu cho booking. |

**Bắt đầu:** cập nhật schema bằng `npm run db:push`, tạo Prisma Client bằng `npm run db:generate`, rồi đăng nhập admin và mở **Phân quyền nhà xe**. Chọn tài khoản và nhà xe, gán vai trò chủ nhà xe. Người đó đăng nhập lại để vào khu vực làm việc và tạo nhân viên. Backend kiểm tra membership hiện hành trong mọi request nghiệp vụ, nên khóa/thu hồi có hiệu lực ở request kế tiếp, kể cả khi token chưa hết hạn.

API `/api/operator/*` luôn lấy `companyId` từ membership đã xác thực; client không được chọn nhà xe để mở rộng phạm vi. Quản lý/nhân viên không được gọi các endpoint xe, chuyến và doanh thu. Thông tin khách được sửa theo từng đơn, đồng bộ các ticket trong transaction; không thay đổi hồ sơ tài khoản khách hàng toàn hệ thống. Xe có vé đang hoạt động không được đổi số ghế. Chuyến có lịch sử booking không được đổi xe/tuyến/ngày/giờ khởi hành hoặc xóa; có thể tạm dừng bán.

### Ghi nhận thanh toán và tra cứu an toàn

- Trang đặt vé hỗ trợ `cash` (tiền mặt) và `bank_transfer` (chuyển khoản xác nhận thủ công). Đã tích hợp MoMo merchant (cấu hình ở phần dưới); chưa tích hợp VNPAY/thẻ. Lựa chọn phương thức không tự đánh dấu đã trả tiền.
- Sau khi kiểm tra tiền thực nhận, người có quyền mở **Quản lý vé → Ghi nhận thu tiền**, chọn phương thức và nhập mã tham chiếu nếu chuyển khoản. `POST /api/operator/bookings/:id/payment` hoặc `/api/admin/bookings/:id/payment` nhận `{ "method": "bank_transfer", "reference": "BANK-001" }` hoặc `{ "method": "cash" }`. API lấy số tiền từ booking, ghi `PaymentReceipt` với người xác nhận và thời điểm; ngăn thu trùng và thu trên đơn đã hủy.
- Thống kê nhà xe lọc theo ngày thu tiền (giờ Việt Nam), chỉ tính biên nhận có booking còn `paid`; hiển thị riêng khoản đã ghi nhận hoàn tiền. Booking cũ được seed `paid` nhưng không có biên nhận không nằm trong thống kê khoản thu của nhà xe. Dashboard admin hiện có vẫn theo ngày tạo booking như đã mô tả ở trên.
- Hủy đơn đã thu tiền ghi nhận `refunded` trong sổ theo dõi; ứng dụng không tự chuyển tiền qua ngân hàng. Nhà xe thực hiện hoàn tiền bên ngoài hệ thống.
- `/api/bookings/my` và `/my-bookings` yêu cầu đăng nhập, chỉ lấy `userId` từ phiên. Xem/tra cứu/hủy một booking cần tài khoản sở hữu hoặc đúng điện thoại đặt vé. Khách vãng lai cần nhập mã vé và điện thoại. Booking `completed` không được hủy; ngày khởi hành đã qua (theo múi giờ Việt Nam) không được đặt.
- Frontend có thể cấu hình URL API bằng `VITE_API_URL`, mặc định `http://localhost:3000/api`.

### Kiểm thử các sửa đổi

```powershell
# backend: bộ test không ghi database
cd backend
npm test
# Kiểm thử HTTP và SQL Server với dữ liệu riêng, tự dọn sau kiểm thử
$env:RUN_DB_TESTS='1'
node --test tests/operator.integration.test.js
Remove-Item Env:RUN_DB_TESTS
# frontend
cd ../frontend
npm run lint
npm run build
```

Test tích hợp tạo fixture riêng cho hai nhà xe và ba cấp nhân sự; kiểm tra cách ly dữ liệu, chống nâng quyền, thu tiền trùng, cập nhật khách/ticket, giới hạn sửa xe/chuyến, chặn đặt ngày cũ, quyền xem/hủy vé, thống kê và khóa nhân viên. Chỉ bật `RUN_DB_TESTS` với database phát triển dùng cho kiểm thử.


### Giữ ghế 5 phút, vé tại quầy và QR

- Tạo booking là thời điểm bắt đầu giữ ghế: `expiresAt = now + 5 phút`, SeatStatus là `held`. Mọi đơn chưa thanh toán (kể cả đã duyệt) hết hạn sẽ chuyển `cancelled`, vé bị hủy, ghế giải phóng trong cùng transaction. Không gia hạn khi tải lại trang hoặc thử thanh toán. Đơn cũ chưa có `expiresAt` tính hạn bằng `createdAt + 5 phút`.
- Worker giải phóng ghế chạy mỗi 5 giây khi khởi động bằng `npm start`/`npm run dev`; việc tìm chuyến, xem ghế, tạo đơn và thu tiền cũng kiểm tra hạn. Hạn thanh toán được kiểm tra tại giao dịch, không dựa vào đồng hồ trình duyệt. Worker email chạy riêng, SMTP chậm không làm chậm giải phóng ghế.
- Trang `/staff/counter` (chủ nhà xe: `/company/counter`) bán vé tại quầy. Nhân viên chọn chuyến/ngày/ghế, nhập tên, điện thoại, email, xác nhận đã thu đủ tiền mặt/chuyển khoản. Booking, tickets, ghế, biên nhận và job gửi email được ghi cùng transaction; vé được xác nhận ngay.
- `/staff/exchange` hoặc `/company/exchange`: tìm vé đã thanh toán, chưa lên xe và chưa khởi hành, chọn chuyến/ghế mới trong cùng nhà xe, giữ nguyên số vé. API báo giá trước khi đổi; xác nhận số tiền thu thêm hoặc hoàn lại tại quầy. BookingChange lưu lịch sử, người xử lý, chênh lệch và mã tham chiếu. Biên nhận gốc được giữ nguyên; thống kê cộng/trừ các khoản chênh lệch đúng ngày xử lý. QR cũ bị vô hiệu; QR mới được gửi lại qua email.
- `/staff/qr-info` hoặc `/company/qr-info`: quét camera, chọn ảnh QR hoặc dán nội dung mã để xem thông tin, không thay đổi trạng thái vé.
- `/staff/qr-board` hoặc `/company/qr-board`: chọn chuyến hôm nay, quét, kiểm tra thông tin và nhấn **Xác nhận khách đã lên xe**. API kiểm tra chữ ký, phiên bản QR, nhà xe, chuyến, ngày, trạng thái thanh toán, trạng thái vé và chống xác nhận trùng. Camera cần HTTPS hoặc localhost và quyền camera của trình duyệt; chọn ảnh là phương án thay thế.
- QR được ký HMAC-SHA256, chứa mã vé, ghế, tên hành khách, chuyến, tuyến, ngày/giờ và phiên bản. Không chứa email/điện thoại hoặc khóa bí mật. Trạng thái hiệu lực luôn lấy từ database; không tin thông tin tự khai trong mã QR. QR của booking cũ không có hiệu lực sau đổi vé/sửa liên hệ.
- Sau thu tiền hoặc IPN MoMo hợp lệ, đơn tự chuyển `confirmed/paid`, ticket được xác nhận và `TicketEmailJob` được tạo trong cùng transaction. Job email chứa phiên bản vé, tự thử lại khi SMTP lỗi, không làm mất giao dịch thanh toán. Job của phiên bản cũ bị bỏ qua. Có thể tải QR tại trang tra cứu và yêu cầu gửi lại email tới đúng địa chỉ đã lưu trên đơn. Trong trường hợp tiến trình dừng sau khi SMTP nhận thư nhưng trước khi ghi trạng thái, email có thể được gửi lặp; tính hợp lệ và chống quét trùng vẫn theo database.

### Cấu hình MoMo thật và email

Điền biến trong `backend/.env` theo `backend/.env.example`, không commit khóa thật:

- `MOMO_ENV=production`, `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`: lấy từ tài khoản merchant MoMo đã được cấp quyền production. Đây là cấu hình merchant chung của nền tảng.
- `MOMO_IPN_URL=https://<api-domain>/api/ticketing/momo/ipn`: URL HTTPS công khai để MoMo gọi từ server; không dùng localhost. `MOMO_REDIRECT_URL=https://<frontend-domain>/payment/momo-return`: trang khách quay về sau khi trả tiền. Cập nhật `CORS_ORIGIN`, `VITE_API_URL` và cấu hình cookie theo tên miền triển khai.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`: tài khoản gửi thư của nhà cung cấp SMTP. Cổng 587 yêu cầu STARTTLS; cổng 465 dùng `SMTP_SECURE=true`. Khi chưa có SMTP, thanh toán vẫn được lưu và job chờ gửi, QR có thể tải trực tiếp. Khi cấu hình xong và khởi động lại, worker xử lý hàng đợi.
- `TICKET_QR_SECRET`: khóa riêng ổn định tối thiểu 32 ký tự. Bỏ trống sẽ dùng khóa dẫn xuất riêng từ `JWT_ACCESS_SECRET`; đổi khóa sẽ làm QR đã phát hành không còn xác minh được.

Backend gọi `captureWallet` tại `https://payment.momo.vn/v2/gateway/api/create`, ký và xác minh HMAC-SHA256, lưu order/request/amount trước khi gọi cổng, dùng lại cùng requestId khi timeout. Chỉ IPN đã xác minh mới ghi nhận thanh toán. Tham số trên URL khách quay về không được dùng để đánh dấu `paid`. IPN kiểm tra partner/order/request/amount và chữ ký, chống ghi biên nhận/email lặp và trả HTTP 204 khi đã xử lý.

Nếu MoMo xác nhận tiền sau khi booking hết hạn/hủy hoặc đã thanh toán bằng cách khác, hệ thống **không lấy lại ghế hoặc phát hành vé**. PaymentAttempt chuyển `refund_required`, lưu mã giao dịch để chủ nhà xe/quản lý xem tại `/company/payment-issues` hoặc `/staff/payment-issues`, đối soát và hoàn tiền trên merchant MoMo. Ứng dụng không tự thực hiện chuyển/hoàn tiền thật. Hạn giữ ghế của ứng dụng không đồng nghĩa cổng MoMo đã vô hiệu liên kết thanh toán; khoản trả muộn được xử lý theo luồng đối soát trên.

Tài liệu MoMo chính thức: [Thanh toán ví một lần](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/), [Thông báo IPN](https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/), [Tài khoản và môi trường](https://developers.momo.vn/v3/docs/payment/onboarding/integration-process/).

Kiểm thử tích hợp mới (fixture riêng, không thu tiền/gửi thư thật):

```powershell
cd backend
$env:RUN_DB_TESTS='1'
node --test tests/ticketing.integration.test.js
Remove-Item Env:RUN_DB_TESTS
```

Test dùng SQL Server thật và giả lập cổng MoMo/SMTP: hết hạn/giải phóng ghế, bán tại quầy, đổi chuyến và chênh lệch, vô hiệu QR cũ, chống quét sai chuyến/quét trùng, chữ ký IPN, replay và thanh toán muộn, email lỗi/thử lại. Cần xác minh merchant production, IPN công khai và SMTP thật trước khi mở cho khách thanh toán thực tế.

Hướng dẫn dành cho người chưa có merchant/tên miền/SMTP: [HUONG_DAN_MOMO_EMAIL.md](HUONG_DAN_MOMO_EMAIL.md). Kiểm tra cấu hình không in khóa và không thu tiền bằng `npm run integrations:check` trong backend.
