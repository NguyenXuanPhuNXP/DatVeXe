# Rightway — Ứng dụng Flutter Android

Ứng dụng dùng chung API Express với web Rightway. Tài liệu cài backend, database và web nằm ở [README chính](../README.md); dữ liệu và tài khoản demo nằm ở [SEED_DEMO.md](../SEED_DEMO.md).

## Chức năng hiện có

| Khu vực | Chức năng |
| --- | --- |
| Đăng nhập | Đăng ký, đăng nhập, khôi phục mật khẩu bằng mã email; mở app phải đăng nhập trước. |
| Khách hàng | Trang chủ, tìm/lọc/sắp xếp chuyến, chi tiết chuyến, chọn nhiều ghế, nhập hành khách, đặt/tra cứu/hủy vé, vé của tôi, QR và email vé. |
| Hỗ trợ | Chat trực tiếp với nhân viên qua WebSocket; trợ lý AI theo tài liệu hướng dẫn của backend. |
| Staff | Vé/khách hàng của nhà xe, xác nhận thu tiền, bán/đổi vé, email vé, trả lời chat, xem lịch chuyến và ghế đã đặt, xác nhận lên xe. |
| Manager/owner | Công cụ quản lý theo permission: nhân viên, xe/chuyến, đối soát và doanh thu. |
| Admin | Tổng quan, quản lý dữ liệu, tài khoản/phân quyền, vé nghi vấn, báo cáo và kiểm tra tích hợp. |

Quyền thực tế lấy từ backend. Một tài khoản không tự chọn nhà xe để xem dữ liệu ngoài phạm vi được cấp.

Mobile đã bỏ mục **Quét QR xem vé**, vẫn giữ **QR trên vé** và **Xác nhận lên xe**. Trang Tài khoản giữ thông tin cá nhân và bảo mật, chỉ bỏ phần kết nối máy chủ. Các thẻ dùng chung chiều rộng/khoảng cách; hộp thoại dài có thể cuộn.

## Cấu hình kết nối

Tạo/chỉnh `Flutter/.env`. Ví dụ cho Android Emulator kết nối backend local:

```dotenv
API_BASE_URL=http://10.0.2.2:3000/api
APP_NAME=Rightway
CONNECT_TIMEOUT_SECONDS=15
REQUEST_TIMEOUT_SECONDS=20
BOOKING_ADVANCE_DAYS=365
HERO_IMAGE_URL=
```

| Môi trường | `API_BASE_URL` |
| --- | --- |
| VPS đang dùng của dự án | `http://180.93.113.176:8081/api` |
| Android Emulator → backend trên máy tính | `http://10.0.2.2:3000/api` |
| Điện thoại cùng LAN | `http://<IP-LAN-máy-chạy-backend>:3000/api` |
| Điện thoại qua USB, sau `adb reverse tcp:3000 tcp:3000` | `http://127.0.0.1:3000/api` |

URL phải kết thúc bằng `/api`. Địa chỉ `10.0.2.2` chỉ dành cho Emulator. Nếu dùng ngrok, tunnel phải đang hoạt động và trỏ tới đúng backend; nếu đi qua Vite, proxy `/api` cần hỗ trợ WebSocket.

`.env` là asset đóng gói trong APK: sau khi sửa phải dừng/chạy lại app hoặc build/cài APK mới. Đóng/mở APK cũ không cập nhật URL. Không đặt API key AI, SMTP, mật khẩu database hoặc khóa thanh toán trong Flutter; các bí mật chỉ nằm ở `backend/.env`.

## Chạy và build

Yêu cầu Flutter đáp ứng Dart SDK trong [pubspec.yaml](pubspec.yaml), Android SDK và JDK tương thích. Chạy backend trước theo [hướng dẫn chính](../README.md), sau đó từ thư mục gốc:

```powershell
cd Flutter
flutter pub get
flutter run
```

Kiểm tra và tạo APK debug:

```powershell
flutter analyze
flutter test
flutter build apk --debug
```

APK: `Flutter/build/app/outputs/flutter-apk/app-debug.apk` tính từ thư mục gốc dự án.

Kiểm tra đọc API thật theo `.env`, không tạo đơn hay thanh toán:

```powershell
flutter test tool/check_api_test.dart
```

Chạy test Flutter với router Express của dự án; thay đường dẫn nếu đặt repository ở nơi khác:

```powershell
flutter test --dart-define=BACKEND_ROOT=F:/DuAn/DatVeXe/backend
```

`BACKEND_ROOT` chỉ phục vụ test, không thay `API_BASE_URL`. Test router Express được bỏ qua nếu không cung cấp biến này.

## Luồng tài khoản và đặt vé

1. Mở app → đăng nhập hoặc đăng ký → vào khu vực theo quyền tài khoản.
2. Chọn tuyến, ngày và số hành khách; xem chuyến và chọn ghế trống.
3. Nhập thông tin liên hệ, chọn phương thức thanh toán và tạo đơn.
4. Ghế được giữ **5 phút**. Chọn phương thức hoặc duyệt đơn không đồng nghĩa đã trả tiền.
5. QR từng ghế chỉ được cấp khi booking đã `paid` và chưa hủy. Tiền mặt/chuyển khoản cần nhân viên xác nhận khoản thu; thanh toán cổng cần IPN hợp lệ.

Tìm vé chỉ trả chuyến đang mở bán và chưa khởi hành theo giờ Việt Nam. Admin có thể vẫn thấy lịch đã qua giờ chạy. Trên màn kết quả có **Đổi ngày đi** và, khi hôm nay hết chuyến, **Xem chuyến ngày mai**.

Cổng thanh toán hiện tại vẫn là **VNPAY**. Thử nghiệm tích hợp SePay đã được hoàn tác. VNPAY mở trình duyệt Android; khi quay lại app, màn vé đọc lại trạng thái từ backend. Không tin trang chuyển hướng thành công để tự đánh dấu đã thanh toán. Hủy vé đã trả tiền chỉ ghi nhận trạng thái hoàn tiền; tiền hoàn thực tế do nhà xe xử lý bên ngoài hệ thống.

Phiên đăng nhập hiện được giữ trong bộ nhớ. Khi ứng dụng bị đóng hoàn toàn, người dùng cần đăng nhập lại.

## Khôi phục mật khẩu

Chọn **Quên mật khẩu?** ở màn đăng nhập hoặc **Đặt lại mật khẩu qua email** trong Tài khoản. Mã có 8 chữ số, hạn 10 phút, dùng một lần và tối đa 5 lần thử. Hai yêu cầu gửi mã cách nhau ít nhất 60 giây; backend còn có giới hạn theo IP. Đổi thành công sẽ thu hồi các phiên đăng nhập cũ.

Backend cần migration `20261103000000_password_reset` và SMTP hoạt động. Thiếu cấu hình email sẽ trả `EMAIL_UNAVAILABLE`. Phản hồi yêu cầu mã không công khai email có tồn tại hay không.

## Chat và tên khách hàng

- API gửi/lưu tin nhắn vẫn dùng HTTP. Socket `/api/support/socket` báo cập nhật, sau đó app tải dữ liệu mới.
- Khung xác thực đầu tiên: `{ "token": "<accessToken>", "staff": false }`; dùng `true` cho nhân viên. Các sự kiện là `support.ready` và `support.updated` kèm `conversationId`.
- Mất mạng sẽ tự kết nối lại và tải bù dữ liệu. Rời màn hình hoặc đăng xuất sẽ đóng kết nối.
- Màn **Trả lời khách hàng** hiển thị tên khách tạo hội thoại; màn khách hiển thị tên nhà xe.
- **Giới hạn hiện tại:** mỗi lần tạo yêu cầu hỗ trợ vẫn tạo hội thoại mới. Một khách có thể có nhiều hội thoại đang mở với cùng nhà xe; chúng chưa tự gộp hoặc tái sử dụng. Đây là các bản ghi riêng, không nên xóa lịch sử chỉ vì nhìn giống nhau.

Reverse proxy cần chuyển tiếp `Upgrade`, `Connection` và HTTP/1.1 cho WebSocket. Backend phát sự kiện trong một tiến trình; cần pub/sub chung trước khi chạy nhiều instance API. Không tích hợp Firebase/thông báo đẩy trong bản này.

Trợ lý AI cần cấu hình `CHAT_PROVIDER` cùng API key/model tương ứng trong backend. Gmail/SMTP không thay thế dịch vụ AI.

## Lịch chuyến và ghế dành cho staff

Trong khu vực làm việc, chọn **Chuyến xe của nhà xe** → chọn ngày → **Xem sơ đồ ghế**. Chọn ghế đã đặt để xem mã vé, tên khách, điện thoại và trạng thái thanh toán.

- `GET /api/operator/trip-board?date=YYYY-MM-DD`
- `GET /api/operator/trip-board/:id/seats?date=YYYY-MM-DD`

Hai API yêu cầu membership đang hoạt động, `operator.access` và `operator.work`; backend lấy nhà xe từ membership. Quyền đọc không cấp quyền sửa chuyến. Nếu một ghế có nhiều đơn, app hiển thị các đơn và cảnh báo cần kiểm tra, không tự xóa/sửa dữ liệu.

## Cấu trúc và giới hạn kiểm tra

- `lib/config/`: cấu hình API và theme.
- `lib/services/`: HTTP, phiên đăng nhập, API khách/nhà xe/quản lý/hỗ trợ.
- `lib/screens/`: màn khách, tài khoản, operator và admin.
- `lib/widgets/`: thẻ, tải dữ liệu, tiêu đề và các bước đặt vé dùng chung.
- `lib/utils/`: ngày Việt Nam, quy tắc booking, định dạng và kiểm tra quyền.
- `test/`: test HTTP, phân quyền, chat/socket, chọn ngày và bố cục.

Hiện ưu tiên Android; iOS/Web chưa được cấu hình đầy đủ. APK debug dùng để thử nghiệm; bản phát hành cần signing riêng và HTTPS. Kết quả test widget không thay thế kiểm tra camera, QR, mạng và thanh toán trên điện thoại thật. Chưa xác minh đầy đủ giao dịch VNPAY xuyên suốt.

Các tài liệu đối chiếu trước đây: [API_SYNC.md](docs/API_SYNC.md), [OPERATOR_GUIDE.md](docs/OPERATOR_GUIDE.md), [DEVELOPS_SYNC.md](docs/DEVELOPS_SYNC.md). Với chức năng/cấu hình hiện hành, ưu tiên README này và mã nguồn.
