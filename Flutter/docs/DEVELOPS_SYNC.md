# Đồng bộ web Develops sang Flutter

Nguồn: NguyenXuanPhuNXP/DatVeXe, nhánh Develops, commit 086a72e9ac391ec01f7578dd37967bb00ca0b3ce.
Flutter được sửa tại C:\QLDA\DatVeXe\Flutter. Không thay đổi backend hoặc frontend web.

## Chức năng

- Trang chủ theo màu sắc, ảnh hero, tìm chuyến, số hành khách, lối tắt, tuyến phổ biến, ưu đãi và tin tức của web; bố cục thích ứng điện thoại.
- Tìm chuyến/lọc/sắp xếp, chi tiết xe, chọn ghế, thông tin khách, bước thanh toán riêng, tra cứu và quản lý vé.
- Ngày đi giữ nguyên ngày lịch YYYY-MM-DD; không đổi sang UTC làm lùi ngày. Số hành khách là dữ liệu giao diện, không gửi vào query tìm chuyến.
- Phân quyền theo permission API và membership: khách, nhân viên, quản lý, chủ nhà xe, admin. Tài khoản nội bộ không đi vào luồng đặt vé khách hàng.
- Nhân viên/quản lý: vé, bán vé tại quầy, đổi vé, QR, khách hàng, email, nhân viên và vấn đề thanh toán theo quyền được cấp.
- Chủ nhà xe: quản lý xe, chuyến và doanh thu theo quyền. Backend quyết định phạm vi nhà xe.
- Admin: tổng quan, chuyến, tuyến, điểm đón trả, xe, nhà xe, vé, bất thường, ưu đãi, tin tức, người dùng/khóa tài khoản, cấp quyền nhà xe, báo cáo và tích hợp.
- Báo cáo có bộ lọc; xuất PDF/Excel; xem trước/nhập chuyến Excel. Android dùng trình chọn/lưu file hệ thống.
- Hỗ trợ: hướng dẫn, trợ lý hỏi đáp, hội thoại khách với nhà xe, trả lời/đóng hội thoại cho nhân viên có quyền.

## Cấu hình

URL và cấu hình client nằm trong .env. Giữ API_BASE_URL hiện tại; HERO_IMAGE_URL là ảnh hero trang chủ. Sau khi đổi .env phải chạy lại ứng dụng hoặc build/cài lại APK. File này là asset client, không đặt bí mật backend vào đây.

Phiên đăng nhập lưu trong bộ nhớ. Quyền API quyết định các mục hiển thị. Hội thoại hỗ trợ cập nhật bằng thao tác tải lại. Thanh toán dùng trạng thái backend trả về.

## Xác minh ngày 02/11/2026

- flutter analyze --no-pub: không phát hiện lỗi.
- flutter test --dart-define=BACKEND_ROOT=C:/QLDA/DatVeXe/backend: 41 kiểm thử đạt, gồm gọi router Express thật bằng test harness.
- node --test tool/develops_source_test.cjs: 4 kiểm tra schema/phân quyền đạt.
- Kiểm tra bố cục trang chủ kích thước điện thoại và quay lại từ bước thanh toán không mất thông tin khách.
- APK debug: build/app/outputs/flutter-apk/app-debug.apk.

Các kiểm thử hợp đồng không tạo giao dịch dữ liệu thật. Cần thử thực tế với tài khoản từng quyền và SQL Server đang chạy: đặt/đổi/hủy vé, thanh toán VNPAY, SMTP, camera QR và trình chọn/lưu file trên điện thoại. Đây là giao diện Flutter thích ứng từ web, chưa xác nhận tương đồng từng pixel trên mọi kích thước màn hình.

Các tài liệu API_SYNC.md và OPERATOR_GUIDE.md là ghi chép trước lần đồng bộ này; thông tin quyền và phạm vi chức năng mới nhất xem tài liệu này và source code.
