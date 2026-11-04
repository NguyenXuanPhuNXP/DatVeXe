# Đối chiếu Flutter với web DatVeXe (28/10/2026)

Phạm vi: đồng bộ ứng dụng khách hàng Android trong `C:\QLDA\Flutter` với backend đang có tại `C:\QLDA\DatVeXe\backend` và luồng khách hàng React. Backend tiếp tục là nguồn dữ liệu và quyết định về ghế, giá, quyền truy cập, hết hạn và thanh toán. Không thay đổi nguồn backend/web hoặc tự tạo dữ liệu booking.

## Kết quả rà soát và thay đổi

| Điểm đối chiếu | Điều chỉnh Flutter |
| --- | --- |
| `frontend/src/services/api.js`, auth routes/controllers | Bearer token, cookie refresh trong bộ nhớ; chỉ một refresh đồng thời; cập nhật giao diện khi đăng nhập/đăng xuất/hết phiên; xóa phiên khi ACCOUNT_LOCKED |
| `middleware/error-handler.js` | Giữ HTTP status, mã lỗi và details; hiển thị fieldErrors của Zod; xử lý phản hồi rate-limit không phải JSON |
| `trips.schemas.js` | Các danh sách nhà xe/loại xe/khung giờ mã hóa CSV; bỏ giá trị null/rỗng; hỗ trợ đủ 5 kiểu sắp xếp |
| `trips.service.js` | Bộ lọc lấy tùy chọn từ API; nhà xe lọc bằng tên, không dùng ID; sơ đồ ghế đọc đúng seatCode/status |
| GET `/trips/:id` | Bổ sung trang chi tiết chuyến lấy dữ liệu mới từ API trước khi chọn chỗ |
| `bookings.routes.js`, `bookings.schemas.js` | Đặt vé cần đăng nhập; gửi tripDate YYYY-MM-DD, seatCodes và thông tin khách; không gửi userId, paymentStatus hoặc totalPrice do client quyết định |
| Xung đột/phiên hết hạn | 409 quay lại chọn ghế và tải lại sơ đồ; 401 yêu cầu đăng nhập lại, không tự tạo lại đơn |
| `frontend/src/utils/trip-date.js` | Ngày chuyến là ngày lịch, lấy đúng phần YYYY-MM-DD và kiểm tra ngày hợp lệ; không cộng múi giờ vào tripDate; ngày hôm nay dùng ranh giới UTC+7 như web |
| `expiry.service.js`, `TicketPaymentPanel.jsx` | Hiển thị hạn từ expiresAt, dự phòng createdAt + 5 phút như backend; hết hạn vô hiệu hóa VNPAY; định kỳ đọc trạng thái 5 giây khi chưa thanh toán, dừng khi app nền hoặc đơn kết thúc |
| `/ticketing/capabilities` | Chỉ hiển thị thanh toán VNPAY khi backend đã cấu hình; kiểm tra trước khi tạo đơn chọn VNPAY |
| `/ticketing/bookings/:id/vnpay` | Gửi đúng JSON phone; kiểm tra lại booking trước thanh toán; mở payUrl bằng trình duyệt Android; khi quay lại đọc trạng thái từ backend |
| `/ticketing/bookings/:id/tickets` | Hiển thị ảnh PNG base64 do backend ký/cấp cho từng ghế; chỉ tải khi đã thanh toán và chưa hủy; bỏ QR cũ khi phiên bản hoặc trạng thái thay đổi |
| `/delivery`, `/resend-email` | Xem trạng thái SMTP và gửi lại tới email trên đơn; không cho nhập địa chỉ nhận tùy ý |
| `.env` | Tiếp tục là nơi khai báo URL API, tên app và cấu hình timeout/lịch; không đưa khóa thanh toán hoặc mật khẩu DB vào Flutter |

`lib/services/customer_service.dart` là bảng endpoint tập trung cho các màn hình. `api_service.dart` xử lý HTTP/xác thực. `utils/booking_rules.dart` kiểm tra điều kiện hiển thị thanh toán/QR. Các endpoint đã khớp frontend web hiện tại.

## Kiểm chứng

```powershell
cd C:\QLDA\Flutter
flutter analyze
flutter test --dart-define=BACKEND_ROOT=C:/QLDA/DatVeXe/backend
flutter build apk --debug
```

`BACKEND_ROOT` chỉ dùng cho bộ kiểm thử kết nối mã nguồn backend thật, không thay thế cấu hình API_BASE_URL trong `.env`. `flutter test` thông thường bỏ qua bài này nếu không truyền BACKEND_ROOT.

Bài `backend_contract_test.dart` khởi động chính Express app của web trên cổng loopback tạm thời và gọi bằng Flutter ApiService thật: capabilities, yêu cầu tạo đơn ẩn danh, ngày sai, bộ lọc sai, tra cứu thiếu tham số và endpoint không tồn tại. Không chạy worker, không tạo đơn và không ghi DB. Server được dừng sau test. Vì Express nạp cả các module admin/PDF nên lần đầu có thể khởi động chậm.

Các bài HTTP cục bộ khác kiểm tra JSON tạo đơn, danh sách bộ lọc, phone ở query/body, refresh cookie đồng thời, tài khoản khóa, thu hồi phiên, lỗi validation, thời hạn và ngày lịch. Các test backend có sẵn về bảo mật booking, ngày chuyến, hết hạn, QR và VNPAY cũng đã được chạy riêng.

Giới hạn xác minh: chưa thực hiện thanh toán VNPAY thực tế hay tạo booking xuyên suốt với SQL Server. Bài SQL Server của backend cần môi trường tích hợp được bật. Khi chạy thật, cần backend + SQL Server hoạt động, API_BASE_URL trỏ tới backend từ thiết bị Android và VNPAY/SMTP được cấu hình ở backend.

## Chạy ứng dụng

Trong `.env`, Android Emulator dùng `API_BASE_URL=http://10.0.2.2:3000/api`. Với điện thoại thật dùng IP LAN của máy backend; với USB có thể chạy `adb reverse tcp:3000 tcp:3000`, rồi dùng `http://127.0.0.1:3000/api`. Chạy `flutter run` sau khi chỉnh cấu hình.

Ứng dụng hiện phục vụ khách hàng. Khu vực admin, nhà xe và nhân viên tiếp tục sử dụng frontend web; chưa chuyển những trang đó sang Flutter. Phiên đăng nhập Flutter giữ trong bộ nhớ; đóng app cần đăng nhập lại. VNPAY quay về URL web do backend cấu hình, Flutter cập nhật khi người dùng quay lại app; chưa có app deep link tự chuyển về.

Kết quả kiểm tra: Flutter analyze sạch lỗi; Flutter 22/22 test đạt (có router Express thật); backend 27 test đạt, 1 bài SQL Server được skip. APK debug được build lại từ mã nguồn đã đồng bộ.

