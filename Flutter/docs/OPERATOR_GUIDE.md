# Khu vực nhân viên và quản lý trên Flutter

## Đăng nhập và mở trang

Cài APK mới, đăng nhập bằng tài khoản có `companyMembership.isActive = true` trong backend DatVeXe. Tài khoản `staff` hoặc `manager` tự chuyển sang tab **Làm việc** sau khi đăng nhập; cũng có thể mở từ **Tài khoản → Khu vực nhân viên / quản lý**. Mỗi lần mở khu vực làm việc, app đọc `/api/operator/me` để lấy vai trò và nhà xe hiện hành.

Tài khoản khách đăng ký công khai không tự có quyền nhân viên. Nếu chưa được phân quyền, dùng chức năng **Phân quyền nhà xe** của admin web để cấp membership, rồi đăng xuất/đăng nhập lại app. Không thêm tài khoản mẫu hoặc thay dữ liệu backend trong quá trình tạo các trang.

## Chức năng theo vai trò

| Trang/chức năng | Nhân viên staff | Quản lý manager |
| --- | --- | --- |
| Quản lý vé: tìm theo mã/liên hệ, trạng thái, thanh toán và ngày | Có | Có |
| Duyệt/hủy/hoàn thành đơn | Có, theo điều kiện backend | Có, theo điều kiện backend |
| Ghi nhận thu tiền mặt/chuyển khoản | Có | Có |
| Thông tin khách trên vé đang hoạt động | Có | Có |
| Bán vé tại quầy và xuất QR | Có | Có |
| Đổi ghế/chuyến, báo giá và thu/hoàn chênh lệch | Có | Có |
| Email vé: xem trạng thái, gửi lại vé | Có | Có |
| Quét QR xem thông tin vé | Có | Có |
| Quét QR xác nhận lên xe | Có | Không, đúng với backend hiện tại |
| Thêm/sửa/khóa/mở nhân viên thường | Không | Có |
| Đối soát khoản thanh toán cần hoàn | Không | Có |

Chủ nhà xe `owner` cũng có thể dùng các trang nghiệp vụ chung, quản lý nhân viên và cấp vai trò manager/staff. Quản lý xe/chuyến và doanh thu riêng cho owner vẫn dùng web; các trang admin toàn hệ thống không nằm trong phạm vi lần bổ sung này.

## Các luồng chính

- **Ghi nhận thu tiền:** xem số tiền trên đơn, chọn phương thức, nhập tham chiếu nếu chuyển khoản và đánh dấu đã thực nhận đủ tiền trước khi lưu. Backend kiểm tra trùng thu, hạn giữ ghế và quyền nhà xe.
- **Bán vé:** chọn chuyến và ngày, chọn ghế, xem tổng tiền, nhập liên hệ, xác nhận đã thu đủ tiền. Backend tạo đơn/biên nhận/vé trong transaction; app hiển thị QR do backend cấp.
- **Đổi vé:** từ Quản lý vé chọn đơn confirmed + paid, bấm Đổi ghế/chuyến. Chọn đủ số ghế, tính báo giá, xác nhận thu/hoàn chênh lệch, gửi expectedTotal/expectedDifference/expectedVersion. Đổi chuyến/ngày/ghế sẽ xóa báo giá cũ. Backend xử lý các trường hợp ghế bị lấy, giá hoặc vé vừa thay đổi. Sau khi đổi, app lấy QR mới.
- **Lên xe:** chọn đúng chuyến đang đón khách, quét QR hoặc dán dữ liệu QR; xem thông tin trước rồi xác nhận. Chỉ cho thao tác khi đúng chuyến và ngày Việt Nam hôm nay, vé còn hiệu lực và chưa lên xe. Backend kiểm tra lại mọi điều kiện.
- **Quản lý nhân viên:** quản lý chỉ tạo/sửa staff; không có lựa chọn nâng lên manager/owner. API cập nhật bằng membership ID, không nhầm với user ID. Khóa/mở là quyền làm việc trong nhà xe, không phải khóa toàn bộ tài khoản khách.

## API và mã nguồn

`lib/services/operator_service.dart` tập trung các endpoint `/operator/*`, dùng chung bearer token/refresh cookie với khách hàng. Các trang nằm tại `lib/screens/operator/`.

App không truyền companyId để lựa chọn nhà xe. Backend lấy nhà xe từ membership trong mỗi request. Ẩn menu là hỗ trợ UX; backend tiếp tục quyết định phân quyền và từ chối request nếu quyền đã bị thu hồi. Lỗi backend được hiển thị trên trang; không có dữ liệu giả khi tải lỗi.

Các thao tác tiền, đổi vé, gửi email hoặc tạo nhân viên chỉ chạy khi người dùng nhấn nút trên app. Bộ kiểm thử dùng HTTP server cục bộ và fixture, không thực hiện các thao tác này trên dữ liệu thật.

## Camera và cấu hình

Dùng `mobile_scanner` 7.4.2. Android có permission CAMERA và camera không bắt buộc để cài app. Camera chỉ mở khi bấm **Mở camera quét QR**; nếu từ chối quyền hoặc thiết bị không có camera, có thể quay lại và dán dữ liệu QR. Chưa kiểm chứng camera vật lý trên điện thoại trong phiên triển khai này.

API tiếp tục lấy URL ngrok/timeout từ `.env`. Không đổi tunnel hoặc cấu hình backend cho các trang mới.

## Kiểm tra

```powershell
flutter analyze
flutter test --dart-define=BACKEND_ROOT=C:/QLDA/DatVeXe/backend
flutter build apk --debug
```

Analyze sạch lỗi. 32 test Flutter đạt, gồm menu staff/manager, quyền bị thu hồi, form thu tiền bắt buộc xác nhận và mã tham chiếu, hợp đồng JSON cho operator. 15 test backend liên quan đến phân quyền và an toàn booking đạt. Bộ test router Express thật xác minh xác thực/validation; chưa thực hiện tạo nhân viên, thu tiền, bán/đổi vé hoặc lên xe xuyên suốt với SQL Server thật.
