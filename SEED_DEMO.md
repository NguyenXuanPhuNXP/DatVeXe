# Dữ liệu demo Rightway

Tài liệu mô tả bộ seed tại [seed.js](backend/prisma/seed.js), [seed-catalog.js](backend/prisma/seed-catalog.js) và [seed-rbac.js](backend/prisma/seed-rbac.js).

Tên nhà xe, website và nguồn ảnh được khai báo theo nguồn công khai. Giờ chạy, giá vé, số chỗ, xe, booking và thanh toán là dữ liệu mô phỏng để thử ứng dụng, không phải lịch bán vé hay giao dịch thực tế.

## Chạy migration và seed

Chạy từ thư mục gốc dự án, sau khi cấu hình `DATABASE_URL` trong `backend/.env`:

```powershell
cd backend
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw 'Migration thất bại' }
npm run db:generate
if ($LASTEXITCODE -ne 0) { throw 'Tạo Prisma Client thất bại' }
npm run db:seed
```

`migrate deploy` tạo database nếu chưa có và tài khoản kết nối có quyền tạo. `seed.js` gọi `seed-catalog.js` để lấy danh mục nhà xe/tuyến và gọi `seedRbac` từ `seed-rbac.js` để ghi vai trò/quyền. Hai module này không cần chạy riêng. Seed chính đã bao gồm booking, ticket, biên nhận và ghế.

### Bổ sung dữ liệu lịch sử bằng `seed-bookings.js`

Chạy trong thư mục `backend` nếu muốn thêm bộ booking lịch sử:

```powershell
node -r dotenv/config prisma/seed-bookings.js
```

Script kiểm tra tổng booking: nếu đã có từ 10 booking thì bỏ qua; nếu ít hơn 10 thì thêm 24 booking, mỗi booking có một ticket. Với DB vừa chạy seed chính (6 booking), kết quả là 30 booking và 30 ticket. Script không được gọi tự động bởi `npm run db:seed`.

Bộ bổ sung dùng 12 hành khách mẫu, ngày tạo ngẫu nhiên trong khoảng 25 ngày gần đây và ngày đi bằng ngày tạo cộng 3 ngày. Booking không gắn tài khoản khách hàng (`userId`), không tạo biên nhận hoặc `SeatStatus`. Vì vậy các đơn `paid` này không đóng góp vào thống kê biên nhận nhà xe; các đơn chưa trả tiền đã quá hạn có thể được worker tự hủy. Đây là dữ liệu lịch sử để xem danh sách/thống kê, không phải bộ thử đầy đủ luồng giữ ghế và thanh toán.

Seed chạy trong một transaction. Chạy lại không tạo thêm fixture có cùng ID, mã booking hoặc email. Mật khẩu tài khoản đã tồn tại được giữ nguyên; ngày booking đã tồn tại cũng không được dời sang ngày mới. Seed không đồng bộ lại mọi trường đã sửa: với chuyến đã tồn tại chỉ cập nhật `isDemo` và `sourceUrl`, với xe chỉ cập nhật ảnh và nguồn ảnh.

Seed gán lại membership demo đúng nhà xe/vai trò và bật `isActive`. Seed cũng tắt các chuyến thuộc fixture cũ theo điều kiện trong `seed.js`; không xóa lịch sử booking. Các quyền được thêm theo định nghĩa seed, quyền đã có trong DB không bị thu hồi tự động.

## Tài khoản đăng nhập

Mật khẩu mặc định cho tất cả tài khoản mới: **`RightwayDemo@2026`**.

| Email | Vai trò | Phạm vi |
| --- | --- | --- |
| `admin.seed@rightway.test` | `admin` | Quản trị hệ thống |
| `customer.demo@rightway.test` | `USER` | Khách hàng demo |
| `owner.futa@rightway.test` | `owner` | Phương Trang |
| `manager.futa@rightway.test` | `manager` | Phương Trang |
| `staff.futa@rightway.test` | `staff` | Phương Trang |
| `owner.thanhbuoi@rightway.test` | `owner` | Thành Bưởi |
| `manager.thanhbuoi@rightway.test` | `manager` | Thành Bưởi |
| `staff.thanhbuoi@rightway.test` | `staff` | Thành Bưởi |
| `owner.hanhcafe@rightway.test` | `owner` | Hạnh Cafe |
| `manager.hanhcafe@rightway.test` | `manager` | Hạnh Cafe |
| `staff.hanhcafe@rightway.test` | `staff` | Hạnh Cafe |

Có thể đặt `DEMO_SEED_PASSWORD` trong `backend/.env` trước khi seed: tối thiểu 12 ký tự và tối đa 72 byte UTF-8. Biến này chỉ áp dụng khi tạo tài khoản mới. Địa chỉ `.test` phục vụ demo, không dùng để nhận email thật.

## Vai trò và quyền

`Role`, `Permission` và `RolePermission` trong SQL Server là nguồn quyền khi ứng dụng chạy. `admin` và `USER` được gán qua `UserRole`; các vai trò nhà xe được gán qua `CompanyMembership`, giới hạn theo nhà xe và phải đang hoạt động.

| Vai trò | Mô tả | Quyền seed |
| --- | --- | --- |
| `admin` | Quản trị viên hệ thống | `admin.access` |
| `USER` | Khách hàng | `booking.create` |
| `owner` | Chủ nhà xe | `operator.access`, `operator.work`, `operator.support`, `operator.fleet.manage`, `operator.trips.manage`, `operator.employees.manage`, `operator.employees.managers`, `operator.revenue.read`, `operator.payment-issues.read` |
| `manager` | Quản lý nhà xe | `operator.access`, `operator.work`, `operator.support`, `operator.employees.manage`, `operator.payment-issues.read` |
| `staff` | Nhân viên nhà xe | `operator.access`, `operator.work`, `operator.support`, `operator.board` |

Các quyền tương ứng với truy cập khu vực nhà xe (`access`), nghiệp vụ vé (`work`), hỗ trợ khách (`support`), quản lý xe (`fleet.manage`), chuyến (`trips.manage`), nhân viên (`employees.manage`), quản lý cấp quản lý (`employees.managers`), xem doanh thu (`revenue.read`), đối soát thanh toán (`payment-issues.read`) và xác nhận lên xe (`board`). Quyền cụ thể vẫn được kiểm tra tại từng API.

Trong bộ seed hiện tại, `operator.board` chỉ được gán cho `staff`; `owner` và `manager` không tự động kế thừa quyền của nhân viên.

## Nhà xe, tuyến và chuyến mẫu

| Nhà xe | Loại xe demo | Số chỗ | Số chuyến |
| --- | --- | ---: | ---: |
| Phương Trang | Limousine giường nằm 34 chỗ | 34 | 9 |
| Thành Bưởi | Giường nằm 36 chỗ | 36 | 6 |
| Hạnh Cafe | Limousine 34 phòng | 34 | 9 |

Mỗi cặp nhà xe–tuyến có ba giờ khởi hành: **08:00, 14:00, 22:00**. Chuyến lặp hằng ngày (`availableDate = null`), có nhãn `isDemo = true`; giờ đến được tính từ thời lượng, có thể sang ngày hôm sau.

| Nhà xe | Tuyến | Thời lượng | Giá demo (VND/vé) |
| --- | --- | --- | ---: |
| Phương Trang | TP.HCM → Đà Lạt | 8 giờ | 300.000 |
| Phương Trang | TP.HCM → Cần Thơ | 3 giờ 30 phút | 195.000 |
| Phương Trang | TP.HCM → Sóc Trăng | 6 giờ | 250.000 |
| Thành Bưởi | TP.HCM → Đà Lạt | 7 giờ 30 phút | 320.000 |
| Thành Bưởi | TP.HCM → Cần Thơ | 3 giờ 30 phút | 200.000 |
| Hạnh Cafe | TP.HCM → Nha Trang | 8 giờ | 300.000 |
| Hạnh Cafe | TP.HCM → Mũi Né | 4 giờ 30 phút | 200.000 |
| Hạnh Cafe | Mũi Né → Nha Trang | 5 giờ | 220.000 |

Hai nhà xe dùng chung tuyến TP.HCM → Đà Lạt và TP.HCM → Cần Thơ, nên có **6 bản ghi tuyến riêng biệt**, 8 cặp nhà xe–tuyến và 24 chuyến. Bộ seed không tạo tuyến chiều ngược lại hoặc điểm đón/trả `RouteStop`.

## Booking và thanh toán mẫu

Tất cả booking thuộc `customer.demo@rightway.test`, số điện thoại `0900000001`, ghế `A1`. Ngày đi bằng ngày Việt Nam tại thời điểm tạo cộng 2 ngày. Tên hành khách lần lượt là `Khách demo 1` đến `Khách demo 6`.

| Mã booking | Nhà xe | Tuyến | Giờ đi | Trạng thái đơn/vé | Thanh toán |
| --- | --- | --- | --- | --- | --- |
| `DEMO2026001` | Phương Trang | TP.HCM → Đà Lạt | 08:00 | `confirmed` | `paid` |
| `DEMO2026002` | Phương Trang | TP.HCM → Đà Lạt | 14:00 | `cancelled` | `unpaid` |
| `DEMO2026003` | Thành Bưởi | TP.HCM → Đà Lạt | 08:00 | `confirmed` | `paid` |
| `DEMO2026004` | Thành Bưởi | TP.HCM → Đà Lạt | 14:00 | `cancelled` | `unpaid` |
| `DEMO2026005` | Hạnh Cafe | TP.HCM → Nha Trang | 08:00 | `confirmed` | `paid` |
| `DEMO2026006` | Hạnh Cafe | TP.HCM → Nha Trang | 14:00 | `cancelled` | `unpaid` |

Mỗi booking có một ticket với mã `<mã booking>-A1`. Phương thức thanh toán lưu là `cash`. Ba booking đã trả tiền có biên nhận do tài khoản `staff` của nhà xe ghi nhận, tham chiếu `DEMO-NO-REAL-PAYMENT`, và bản ghi `SeatStatus` ở trạng thái `booked` liên kết đúng booking/ticket. Ba booking đã hủy không có biên nhận hoặc ghế bị chiếm.

Seed không gọi cổng thanh toán, không tạo `PaymentAttempt` hoặc job gửi email vé.

## Tổng dữ liệu khi seed vào DB mới

| Dữ liệu | Số lượng |
| --- | ---: |
| Tài khoản | 11 |
| Vai trò | 5 |
| Quyền phân biệt | 12 |
| Liên kết vai trò–quyền | 20 |
| Membership nhà xe | 9 |
| Nhà xe / xe | 3 / 3 |
| Tuyến / chuyến | 6 / 24 |
| Booking / ticket | 6 / 6 |
| Biên nhận / ghế đã đặt | 3 / 3 |
| Khuyến mãi / tin tức | 1 / 1 |

Khuyến mãi: **Ưu đãi demo khách mới**, mã `DEMO10`, giảm 10%, mô phỏng và không đại diện ưu đãi của nhà xe. Tin tức: **Hướng dẫn dùng dữ liệu demo Rightway**, danh mục `Hướng dẫn`.

## Nguồn nhà xe và ảnh

Các liên kết dưới đây là nguồn được lưu trong catalog, không phải xác nhận lịch chạy hoặc giá vé hiện hành.

| Nhà xe | Website | Nguồn ảnh | Đường dẫn ảnh trong ứng dụng |
| --- | --- | --- | --- |
| Phương Trang | [futabus.vn](https://futabus.vn/) | [Bài giới thiệu xe tuyến Sài Gòn–Sóc Trăng](https://futabus.vn/tin-tuc/cong-ty-phuong-trang-nang-cap-dong-xe-tuyen-sai-gon-soc-trang) | `/images/buses/phuong-trang.png` |
| Thành Bưởi | [thanhbuoi.com.vn](https://thanhbuoi.com.vn/) | [Hệ thống đội xe](https://thanhbuoi.com.vn/he-thong-doi-xe/xe-khach) | `/images/buses/thanh-buoi.jpg` |
| Hạnh Cafe | [nhaxehanhcafe.vn](https://nhaxehanhcafe.vn/) | [Trang nhà xe](https://nhaxehanhcafe.vn/) | `/images/buses/hanh-cafe.webp` |

Catalog còn lưu `imageDownloadUrl`; seed chỉ ghi đường dẫn và nguồn ảnh vào DB, không tự tải file ảnh.

## Lưu ý môi trường

Seed bị chặn khi `NODE_ENV=production`, trừ khi đặt rõ `ALLOW_DEMO_SEED=true`. Chỉ dùng bộ tài khoản và mật khẩu công khai này cho môi trường demo. Reset database sẽ xóa dữ liệu đang có; chạy seed thông thường không thay thế thao tác reset.
