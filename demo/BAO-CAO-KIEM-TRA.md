# Báo cáo kiểm tra dự án Rightway

Ngày kiểm tra: 22/10/2026. Branch: `NguyenXuanphu/feature/TASK-89-Tich-hop-dat-ve-FE-BE`.

## Kết quả bàn giao

- Video `Rightway-Demo.mp4`: khoảng 2 phút 01 giây, 1440 × 900, H.264, có chú thích tiếng Việt; không có âm thanh.
- Mở đầu bằng khung hình dự án trong VS Code. Phần tiếp theo ghi thao tác thực tế trên frontend React, gọi Express API và lưu SQL Server cục bộ.
- File `Bao-cao-demo.xlsx` xuất trực tiếp từ trang báo cáo, đã mở đọc lại bằng thư viện XLSX.
- Frontend chạy `npm run build` thành công. Còn cảnh báo kích thước JavaScript bundle lớn hơn 500 kB.
- 17 mốc thao tác giao diện hoàn tất trong kịch bản ghi hình; không ghi nhận JavaScript page error hoặc API nghiệp vụ lỗi trong bản ghi cuối. HTTP 401 của thao tác refresh khi chưa đăng nhập là trường hợp dự kiến, được loại khỏi lỗi nghiệp vụ.
- 23/23 điều kiện kiểm tra API/database trong `check-results.json` đạt. Đây là phạm vi kiểm tra bên dưới, không phải chứng nhận toàn bộ sản phẩm không có lỗi.

## Chức năng đã kiểm tra

| Nhóm | Phạm vi và kết quả |
|---|---|
| Trang chủ | Hiển thị tìm kiếm, ưu đãi, tuyến phổ biến, tin tức; đã ghi hình. |
| Đăng ký / đăng nhập / đăng xuất | Đăng ký tài khoản khách demo, đăng xuất, đăng nhập admin thành công trên giao diện. |
| Tìm chuyến | Hà Nội → Đà Nẵng, 24/10/2026, hai hành khách; danh sách lấy từ SQL Server. |
| Bộ lọc | Lọc khung giờ buổi tối trên giao diện và kiểm tra API chỉ trả chuyến từ 18:00; chưa kiểm tra độc lập mọi tổ hợp bộ lọc. |
| Chi tiết chuyến | Mở trang chi tiết từ thẻ nhà xe, xem thông tin tuyến và giá. |
| Ghế | Sơ đồ lấy sức chứa xe, mã A/B/C khớp backend; ghế đặt trong bản ghi thử hiện trạng thái đã đặt khi quay lại. |
| Thông tin hành khách / xác nhận | Nhập thông tin giả lập, chọn tiền mặt, tạo một đơn gồm hai vé thật; tổng giá vé con bằng tổng đơn; có hai bản ghi giữ ghế. |
| Chống đặt trùng | Gọi lại API đặt các ghế đã đặt, nhận HTTP 409. |
| Tra cứu / vé của tôi | Xem đơn sau khi đặt, mở trang vé của khách đang đăng nhập, tra cứu lại đơn sau khi admin duyệt. |
| Hủy vé | Tạo đơn kiểm tra riêng, hủy qua API; xác minh database cập nhật Ticket và giải phóng ghế. Phần này được kiểm tra bằng script, không thao tác hủy trong video. |
| Dashboard | API trả thống kê, biểu đồ và trang hiển thị dữ liệu demo. |
| Quản lý đơn vé | Tìm mã đơn vừa tạo, duyệt đơn, tra cứu lại thấy trạng thái `confirmed`. Có giới hạn đồng bộ Ticket nêu bên dưới. |
| Trang quản lý | Đã mở danh sách chuyến, tuyến, nhà xe, khuyến mãi, tin tức, người dùng; API GET của từng trang trả 200. Chưa xác nhận toàn bộ thao tác CRUD lưu bền vững. |
| Báo cáo | Mở trang thống kê, xuất Excel, đọc lại workbook thành công. |
| Phân quyền admin | Request không đăng nhập tới dashboard bị từ chối bằng HTTP 401. |

## Dữ liệu demo

Đã bổ sung ba chuyến cùng tuyến Hà Nội → Đà Nẵng để thể hiện khác biệt giờ chạy/giá. Tổng dữ liệu chuyến hiện có là tám. Đã bổ sung 16 đơn lịch sử có nhãn `Khách Demo`, địa chỉ `demo.history.*@example.com`, gồm các trạng thái chờ, đã duyệt, hoàn thành và hủy. Dữ liệu này tạo cả Ticket và trạng thái ghế tương ứng.

Các lượt chạy thử/ghi hình còn lưu các đơn và tài khoản demo riêng. Script kiểm tra hủy tạo đơn riêng, không hủy đơn đã quay. Mã đơn và email tài khoản trong bản ghi cuối được lưu tại `recording-result.json`. Không xóa dữ liệu có sẵn.

## Các sửa đổi để luồng demo chạy được

1. `PaymentPage.jsx`: bỏ import `useState` trùng gây lỗi build; bỏ khối tạo booking lần hai dùng các biến không tồn tại.
2. `SeatSelectionPage.jsx`: tạo mã ghế A/B/C theo sức chứa xe đúng quy tắc backend; tải thông tin chuyến đầy đủ khi chuyển từ kết quả tìm kiếm; chuẩn hóa ghế đã đặt và tính số ghế trống theo xe.
3. `TripCard.jsx`: giữ điểm đi, điểm đến và số hành khách trên URL khi chuyển sang chọn ghế.

Không tạo commit hoặc đổi branch. Các script, hướng dẫn và báo cáo nằm trong `demo/`.

## Giới hạn và lỗi còn lại

1. **Đồng bộ trạng thái vé con:** đã xác minh trong database: endpoint admin duyệt đơn chỉ cập nhật Booking, Ticket của đơn vẫn `pending`. Tương tự, nhánh admin đổi trạng thái không gọi logic giải phóng ghế khi hủy. Cần dùng transaction chung cho Booking, Ticket và SeatStatus.
2. **CRUD quản trị có nhánh mô phỏng:** các trang chuyến, tuyến, nhà xe, khuyến mãi, tin tức dùng cập nhật state cục bộ khi API lỗi. Ví dụ form chuyến gửi `route`/`company` dạng chuỗi, trong khi schema API cần `routeId`, `busId`, `companyId` và các trường khác. Vì vậy thấy dòng mới trên màn hình chưa chứng minh dữ liệu đã được lưu. Video chỉ giới thiệu danh sách các trang này.
3. **Thanh toán online:** hiện chọn phương thức rồi tạo đơn; chưa thấy luồng chuyển cổng thanh toán, callback/webhook và xác minh giao dịch. Video sử dụng tiền mặt, không thực hiện thanh toán thật.
4. **Quyền truy cập booking cần rà soát:** qua đọc mã, các route `/api/bookings/my*` dùng optional authentication, nhận tiêu chí từ query; nếu không có tiêu chí thì service dùng `where: {}`. Logic hủy cũng chưa yêu cầu đối chiếu điện thoại trong mọi trường hợp khách vãng lai. Đây là phát hiện từ mã nguồn, chưa sửa trong phạm vi quay demo.
5. **Đổi vé / hỗ trợ:** thao tác nhanh Đổi/Hủy dẫn về trang tra cứu; chưa thấy luồng đổi sang chuyến khác. Hỗ trợ khách hàng hiện dùng đường dẫn `#`.
6. **Hình ảnh:** một số logo trỏ tên file không có trong public hoặc URL bên ngoài; có thể thấy ảnh lỗi trong giao diện. Không thay thế bằng dữ liệu giả trong bản ghi.

Các phần trên cần hoàn thiện trước khi xem hệ thống là đã triển khai đầy đủ. Báo cáo tách rõ phần chạy và kiểm tra thực tế với phát hiện chỉ qua đọc mã nguồn.
