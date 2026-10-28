# Chatbot AI hỗ trợ website

## Chỉ chuyển câu hỏi nhà xe khi thiếu dữ liệu

AI phân loại mỗi câu hỏi: `answered` (đủ dữ liệu), `missing_transport_data` (liên quan dịch vụ nhà xe nhưng thiếu dữ liệu), `out_of_scope` (ngoài chủ đề), hoặc `clarification` (cần hỏi rõ). Chỉ `missing_transport_data` làm xuất hiện nút **Chuyển câu hỏi cho nhân viên**. Câu hỏi ngoài chủ đề, chào hỏi và kết quả lỗi/không hợp lệ không hiển thị nút chuyển. Phân loại do mô hình thực hiện, cần đánh giá thêm bằng các câu hỏi thực tế.

Nút chuyển mang nguyên câu hỏi sang form, khách chọn nhà xe rồi gửi. Chỉ sau khi API lưu thành công mới báo **Đã chuyển câu hỏi tới nhân viên nhà xe**. Tab **Hội thoại hỗ trợ** dùng xem/trả lời các hội thoại cũ, không tự tạo yêu cầu mới. AI không tự gửi thông tin hoặc nói đã chuyển khi khách chưa gửi.

## Phân tách khách hàng và tài khoản nội bộ

Chatbot AI và kênh gửi yêu cầu cho nhân viên chỉ dành cho người đăng nhập với vai trò USER, không có membership nhà xe và không kèm vai trò nội bộ khác. Khách chưa đăng nhập vẫn xem được nội dung công khai nhưng không có nút chatbot. Backend kiểm tra quyền tương ứng, không chỉ ẩn giao diện.

Admin/owner/manager/staff truy cập trang chủ, tìm chuyến, chi tiết chuyến, các bước đặt vé, thanh toán khách hàng hoặc tra cứu/vé của tôi sẽ được chuyển về cổng làm việc. Tab **Trả lời khách hàng** ở `/staff/support` hoặc `/company/support` cho phép mở tối đa 6 khung chat, từng khung giữ ô soạn tin độc lập. Đóng khung chỉ đóng giao diện; **Kết thúc hội thoại** mới khóa gửi thêm tin. Quyền bán vé tại quầy của nhân viên vẫn ở cổng nghiệp vụ.

Membership ngừng hoạt động hoặc tài khoản nội bộ chưa được cấp quyền không được trở thành khách; chuyển tới trang thông báo cần cấp quyền. Không có chatbot AI trong cổng nhân viên/quản trị.

## Kết nối nhân viên trên website

- Khách chọn tab **Kết nối nhân viên**, đăng nhập, chọn nhà xe, nhập yêu cầu rồi gửi. Chỉ hiện nhà xe có tài khoản owner/manager/staff đang hoạt động và không bị khóa; danh sách không khẳng định nhân viên đang online.
- Nhân viên/manager vào **Hỗ trợ khách hàng** tại `/staff/support`; chủ nhà xe vào `/company/support`. Mỗi tài khoản chỉ xem/trả lời hội thoại thuộc nhà xe của mình. Khách chỉ xem hội thoại do chính mình tạo.
- Hộp thư và hội thoại tự cập nhật mỗi 5 giây khi mở. Không có push notification, thông báo email tự động hay cam kết nhân viên trực tức thời. Hộp thư hiển thị tối đa 100 hội thoại và 200 tin nhắn gần nhất/hội thoại.
- Khách hoặc nhân viên có thể kết thúc hội thoại; không gửi thêm tin vào hội thoại đã kết thúc. Khách có thể tạo yêu cầu mới. Hội thoại lưu trong SQL Server qua bảng `SupportConversation`, `SupportMessage`; không gửi những tin nhắn này tới dịch vụ AI và không tự sao chép lịch sử AI.
- Triển khai schema bằng `npx prisma migrate deploy` và `npx prisma generate` trong backend rồi restart server. Migration chỉ thêm bảng hỗ trợ, khóa ngoại và index.
- Database phát triển hiện tại chưa baseline migration history (Prisma báo P3005). Ở phiên triển khai này đã dùng `prisma db execute --file prisma/migrations/20261029000000_add_human_support/migration.sql --schema prisma/schema.prisma` để thêm riêng hai bảng, sau đó generate client. Không chạy lại file SQL này trên DB đã có bảng; cần baseline lịch sử hiện hữu trước khi chuyển DB này sang quản lý bằng migrate deploy.
- Kiểm thử HTTP/SQL cách ly khách/nhà xe, phân quyền, gửi/đọc tin, đóng hội thoại: đặt `RUN_DB_TESTS=1` rồi chạy `node --test tests/human-support.integration.test.js` trên database phát triển. Test tạo fixture riêng và tự xóa.

Các đoạn mô tả chưa có kết nối trực tiếp bên dưới là giới hạn của tab AI; tab Kết nối nhân viên là kênh hỗ trợ riêng.

## Test bằng Gemini free tier

Backend hỗ trợ cả Google Gemini và OpenAI. Để thử Gemini, tạo key tại https://aistudio.google.com/apikey và đặt trong `backend/.env`:

```dotenv
CHAT_PROVIDER=gemini
GEMINI_API_KEY=<key Google AI Studio>
GEMINI_MODEL=gemini-3.5-flash-lite
```

Khởi động lại backend sau khi lưu. OpenAI key không dùng được cho Gemini. Để chuyển lại OpenAI đặt `CHAT_PROVIDER=openai`. Hạn mức free tier phụ thuộc tài khoản/project; kiểm tra quota trong AI Studio. Không bật billing nếu mục đích chỉ thử free tier. Gemini 3.5 Flash-Lite hiện có input/output miễn phí ở free tier theo https://ai.google.dev/gemini-api/docs/pricing. Google ghi dữ liệu free tier có thể được dùng cải thiện sản phẩm; chỉ thử bằng nội dung không nhạy cảm.

Với Gemini, backend dùng API generateContent của Google, cùng tài liệu và kiểm tra nguồn; không gửi câu hỏi sang OpenAI. Các mô tả Responses API và `store: false` bên dưới chỉ áp dụng khi chọn OpenAI.

Khung chat nằm ở góc phải các trang dành cho khách. Backend dùng OpenAI Responses API, gửi câu hỏi và bộ tài liệu nhỏ trong `backend/src/modules/support/knowledge.json` ở mỗi lượt. Không cần vector database với bộ tài liệu hiện tại. Mỗi câu hỏi độc lập; không gửi lịch sử chat hoặc dữ liệu booking từ database tới AI.

## Kích hoạt

Trong `backend/.env`, cấu hình các biến sau rồi khởi động lại backend:

```dotenv
OPENAI_API_KEY=<API key của dự án OpenAI>
OPENAI_MODEL=gpt-4o-mini
CHAT_SUPPORT_EMAIL=<email hỗ trợ thực tế, có thể để trống>
```

API key phải ở backend, không đưa vào frontend hay biến `VITE_*`. ChatGPT subscription không thay thế cấu hình API. Khi thiếu key, khung chat vẫn hiển thị hướng dẫn và thông báo AI chưa kích hoạt. Email để trống thì giao diện hướng khách dùng thông tin nhà xe trên vé/xác nhận đặt vé nếu có. Chưa có chức năng chuyển hội thoại trực tiếp cho staff.

## Quản lý tài liệu

Sửa `backend/src/modules/support/knowledge.json` và khởi động lại backend. Mỗi mục gồm `id` duy nhất, `title`, `url` nội bộ và `content`. Chỉ đưa nội dung đã được xác nhận, phù hợp mọi nhà xe vào bộ tài liệu dùng chung này. Hiện có hướng dẫn đặt vé, giữ ghế 5 phút, tra cứu và giới hạn hỗ trợ. Chưa có chính sách hành lý, đổi/hủy và hoàn tiền riêng từng nhà xe. Nếu cần các chính sách riêng, cần bổ sung lựa chọn nhà xe và lọc tài liệu theo nhà xe trước khi bật nội dung đó; không trộn chính sách các nhà xe trong tài liệu chung.

Nguồn được hiển thị dưới câu trả lời, có thể mở nội dung tài liệu và trang thao tác liên quan. AI được yêu cầu trả lời dựa trên tài liệu, không tự xác nhận thanh toán hoặc bịa chính sách. Đây là giới hạn bằng chỉ dẫn và kiểm tra nguồn, không bảo đảm tuyệt đối nội dung do AI sinh ra; cần kiểm tra chất lượng bằng câu hỏi thực tế trước khi sử dụng chính thức.

## API và giới hạn

- `GET /api/support/guides`: tài liệu công khai và email hỗ trợ.
- `POST /api/support/chat`: `{ "message": "Ghế được giữ bao lâu?" }`.
- Trả `answer`, `sources`, `needsStaff`, `supportEmail`.
- Giới hạn 1.200 ký tự/câu hỏi, 10 yêu cầu/phút/IP, timeout provider 20 giây, tối đa 1.000 output tokens. Rate limiter lưu trong bộ nhớ từng process; triển khai nhiều instance cần shared store và giới hạn ngân sách nhà cung cấp.
- Nội dung người dùng nhập được gửi tới OpenAI; giao diện thông báo điều này. Backend không ghi log/lưu chat; `store: false` không tương đương với cam kết zero data retention của nhà cung cấp.
- Không truy vấn dữ liệu vé cá nhân, không thực hiện đặt/hủy/thanh toán. Lịch sử chỉ ở bộ nhớ trang, mất khi tải lại.

## Kiểm tra

Chạy `node --test tests/support.service.test.js` trong `backend` và `npm run build` trong `frontend`. Test provider dùng mock, không tốn phí API. Sau khi cấu hình key, kiểm tra câu hỏi đặt vé, giữ ghế, chính sách chưa có tài liệu và yêu cầu bỏ qua quy tắc; kiểm tra nguồn và việc hướng sang nhân viên. Kiểm thử tự động không chứng minh chất lượng câu trả lời thực tế của mô hình.

Tích hợp tham khảo [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).
