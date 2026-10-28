# VNPAY sandbox và email cho dự án DatVeXe

Dự án hiện dùng VNPAY làm cổng thanh toán trực tuyến mặc định. Giữ ghế 5 phút, bán/đổi vé tại quầy, QR và email giữ nguyên luồng nghiệp vụ. MoMo không còn được đưa ra để khách tạo thanh toán mới; callback MoMo cũ được giữ để không bỏ sót đối soát giao dịch lịch sử.

## 1. Đăng ký sandbox

Mở [Đăng ký merchant môi trường test](https://sandbox.vnpayment.vn/devreg/). Trang đã được kiểm tra trực tiếp trong trình duyệt ngày 27/10/2026 và hiển thị form đăng ký.

Điền các ô trên form:

| Ô | Nội dung |
| --- | --- |
| Tên website | `Rightway DatVeXe - thu nghiem` hoặc tên dự án của bạn. |
| Địa chỉ URL | URL bản thử của bạn. Có thể thử `http://localhost:5173` khi chạy tại máy; nếu cổng yêu cầu website công khai, dùng URL HTTPS tạm theo mục 3. Việc form chấp nhận URL phụ thuộc quy định VNPAY. |
| Email đăng ký | Email thật của bạn để nhận thông tin kết nối. |
| Mật khẩu / Nhập lại mật khẩu | Tự tạo mật khẩu riêng cho tài khoản sandbox. |
| Mã xác nhận | Bạn tự nhập CAPTCHA đang hiện trên trang rồi nhấn Đăng ký. |

Sau đó kiểm tra email và Spam theo hướng dẫn của VNPAY. Thông tin tích hợp cần lấy là `vnp_TmnCode` và `vnp_HashSecret`. Không nhầm mật khẩu đăng nhập cổng với HashSecret, không gửi HashSecret vào chat.

Sandbox là môi trường thử, không phải tài khoản để nhận tiền thật. Khi muốn nhận tiền thật, cần làm thủ tục và được VNPAY cấp thông tin production; không mặc định đủ điều kiện production chỉ vì đăng ký được sandbox.

Nguồn: [Tài liệu thanh toán VNPAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html). Tài liệu cho biết thông tin kết nối test được gửi về email đăng ký.

## 2. Điền cấu hình vào dự án

Mở `backend/.env`, thêm/sửa các biến sau bằng thông tin của chính bạn:

```dotenv
VNPAY_ENV=sandbox
VNPAY_TMN_CODE=ma-website-VNPAY-cap
VNPAY_HASH_SECRET=chuoi-bi-mat-VNPAY-cap
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay-return
VNPAY_IPN_URL=https://dia-chi-cong-khai-cua-ban/api/ticketing/vnpay/ipn
VNPAY_PAYMENT_URL=
```

Dòng trống `VNPAY_PAYMENT_URL` ở sandbox dùng URL chuẩn `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`. Các giá trị khác ở trên là ví dụ, không phải khóa/địa chỉ đã hoạt động.

**Return URL** là trang khách quay về sau khi thanh toán. **IPN URL** là API VNPAY gọi từ máy chủ của họ để xác nhận kết quả, phải truy cập được từ Internet. IPN không được gửi như tham số tùy ý trên URL thanh toán: cần khai báo/đăng ký IPN với VNPAY theo hướng dẫn trong email/cổng test hoặc hỗ trợ kỹ thuật của VNPAY. Có thể cung cấp cho họ:

- Phương thức: `GET`.
- Địa chỉ: `https://<domain>/api/ticketing/vnpay/ipn`.
- Phản hồi: JSON `RspCode` / `Message`.

Nếu IPN chưa được khai báo hoặc không vào được backend, khách có thể quay về website nhưng vé chưa được đánh dấu đã trả tiền. Ứng dụng không tin tham số trên Return URL để tự chuyển đơn thành `paid`.

Chạy kiểm tra cấu hình trong backend:

```powershell
cd C:\QLDA\DatVeXe\backend
npm run integrations:check
```

Lệnh không in khóa, không tạo giao dịch và không thu tiền. Khi có SMTP, lệnh kiểm tra kết nối/xác thực SMTP nhưng không gửi thư. Sau mỗi lần sửa `.env`, khởi động lại backend.

## 3. Chưa có domain: dùng HTTPS tạm chỉ để thử sandbox

Dự án có Vite proxy `/api` tới backend cổng 3000. Có thể dùng một Cloudflare Quick Tunnel cho frontend; URL tunnel sẽ đổi khi tạo lại và không phù hợp chạy production. Xem [tài liệu Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

1. Chạy backend cổng 3000 bằng `npm run dev` trong `backend`.
2. Tạo `frontend/.env.local` với `VITE_API_URL=/api`.
3. Chạy frontend cố định cổng 5173:

```powershell
cd C:\QLDA\DatVeXe\frontend
npm run dev -- --port 5173 --strictPort
```

4. Cài cloudflared theo tài liệu chính thức, rồi mở terminal khác:

```powershell
cloudflared tunnel --url http://localhost:5173
```

5. Lấy URL HTTPS thực tế được in ra. Ví dụ minh họa là `https://ten-thu-nghiem.trycloudflare.com`; thay bằng địa chỉ trên máy bạn. Tunnel sẽ công khai dịch vụ thử, nên dùng dữ liệu kiểm thử.
6. Nếu Vite báo hostname chưa được cho phép, dừng Vite và chạy lại với hostname cụ thể:

```powershell
$env:__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS='ten-thu-nghiem.trycloudflare.com'
npm run dev -- --port 5173 --strictPort
```

7. Sửa backend theo URL thật của tunnel:

```dotenv
CORS_ORIGIN=https://ten-thu-nghiem.trycloudflare.com
VNPAY_RETURN_URL=https://ten-thu-nghiem.trycloudflare.com/payment/vnpay-return
VNPAY_IPN_URL=https://ten-thu-nghiem.trycloudflare.com/api/ticketing/vnpay/ipn
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

8. Restart backend và đăng ký/cập nhật IPN với VNPAY. Không đặt màn hình đăng nhập của tunnel trước API IPN. Giữ backend, frontend và tunnel cùng chạy khi thử.
9. Khi tunnel đổi URL, cập nhật hostname Vite, CORS, Return URL và IPN đăng ký với VNPAY. Khi trở lại chỉ chạy localhost, dùng `CORS_ORIGIN=http://localhost:5173` và `COOKIE_SECURE=false`.

## 4. Email gửi vé

Có thể cấu hình Gmail cho giai đoạn thử nếu tài khoản hỗ trợ mật khẩu ứng dụng:

1. Bật xác minh 2 bước của Google.
2. Tạo [mật khẩu ứng dụng](https://myaccount.google.com/apppasswords).
3. Điền backend `.env` (thay bằng tài khoản của bạn):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=email-cua-ban@gmail.com
SMTP_PASS=mat-khau-ung-dung
MAIL_FROM="Rightway <email-cua-ban@gmail.com>"
```

Không dùng mật khẩu đăng nhập Gmail thông thường. Nếu tài khoản không hỗ trợ mật khẩu ứng dụng, dùng SMTP khác được tài khoản/nhà cung cấp cho phép. Nguồn: [Google về mật khẩu ứng dụng](https://support.google.com/mail/answer/185833?hl=vi).

Sau khi nhận IPN thanh toán hợp lệ, hệ thống xác nhận booking, cấp QR và xếp lịch email trong cùng transaction. SMTP lỗi thì job thử lại; khách vẫn tải được QR tại trang tra cứu. Không có SMTP thì email ở trạng thái chờ.

## 5. Thử thanh toán

- Dùng thông tin thẻ/tài khoản **test** do VNPAY cung cấp trong tài liệu/email, không dùng thẻ thật cho sandbox.
- Tạo đơn mới và chọn VNPAY; đơn giữ ghế 5 phút từ lúc tạo, không gia hạn khi thử lại.
- Bấm **Thanh toán bằng VNPAY**, hoàn thành trên cổng test rồi kiểm tra trang trả về.
- Backend kiểm tra chữ ký SHA512, TmnCode, mã tham chiếu, số tiền (VNPAY dùng đơn vị nhân 100), `vnp_ResponseCode=00` và `vnp_TransactionStatus=00` trước khi cấp vé.
- IPN gửi lặp không tạo thêm khoản thu/email. Thất bại/hủy ở cổng không được coi là đã trả tiền.
- VNPAY nhận tiền sau khi đơn hết hạn/hủy: đơn không chiếm lại ghế và không có QR mới; khoản tiền nằm ở **Đối soát thanh toán** để xử lý hoàn tiền trên merchant. Ứng dụng chưa tự gọi lệnh hoàn tiền thật.

## 6. Chuyển sang production sau này

Chỉ chuyển khi VNPAY đã duyệt/cấp tài khoản production và website có HTTPS ổn định:

- `VNPAY_ENV=production`.
- Thay TmnCode/HashSecret bằng khóa production.
- `VNPAY_PAYMENT_URL`: endpoint production VNPAY cấp cho merchant.
- Return URL và IPN dùng domain HTTPS cố định của bạn; đăng ký IPN đúng môi trường.
- Dùng bản build frontend với reverse proxy `/api` tới Express. Vite proxy chỉ dành cho phát triển.

Không sao chép khóa demo trên mạng để nhận tiền: tiền hoặc IPN có thể thuộc tài khoản khác. Với dự án hiện tại, bạn chỉ cần bắt đầu bằng tài khoản sandbox của chính mình.


## Theo dõi và kiểm tra trong ứng dụng

- Admin: `/admin/integrations` (**VNPAY và email**). Xem cấu hình đã đủ chưa (không hiện khóa), kiểm tra SMTP + IPN/Return công khai, xem các giao dịch và 50 email vé gần nhất. Nút gửi thư thử chỉ gửi nội dung cố định tới email tài khoản quản trị đang đăng nhập, không nhận địa chỉ/nội dung tùy ý.
- Nhà xe: `/company/email-jobs`; nhân viên/quản lý: `/staff/email-jobs`. Chỉ thấy email thuộc nhà xe của mình, được gửi lại vé đã thanh toán còn hiệu lực. Đơn đang gửi không bị đặt lại, gửi lại sau khi thành công cần chờ ít nhất 1 phút. Hàng đợi tự thử lại khi SMTP lỗi.
- Khách: trang vé/tra cứu có trạng thái email, nút kiểm tra và gửi lại; vẫn tải QR được khi email gặp lỗi. Thanh toán thất bại được thông báo để thử lại trong hạn giữ ghế gốc. Trang trả về không tự đánh dấu vé đã trả tiền.
- `npm run integrations:check` kiểm tra SMTP, database/các bảng email-thanh toán, đường IPN và Return. Lệnh không gửi thư hoặc thanh toán. IPN trả 97 cho yêu cầu không chữ ký chỉ chứng minh API truy cập được; cần một giao dịch sandbox hoàn tất để xác nhận VNPAY thực sự gọi IPN.

### Kết quả kiểm tra ngày 28/10/2026

Đã sửa SMTP cổng 587 sang STARTTLS (`SMTP_SECURE=false`), xác thực Gmail thành công. Đã khôi phục Windows authentication vào cùng database đang cấu hình do tài khoản SQL trước đó không đăng nhập được. Đã cập nhật CORS, Return và IPN sang tunnel ngrok HTTPS đang chạy; backend tin header proxy chỉ từ địa chỉ loopback.

Đã kiểm tra mở tới màn hình chọn phương thức thanh toán của VNPAY sandbox bằng yêu cầu được ký với cấu hình hiện tại, chưa chọn ngân hàng/nhập thẻ/thực hiện thanh toán. Yêu cầu HTTP cần giữ cookie giữa các redirect như trình duyệt; bỏ cookie có thể làm cổng trả trang lỗi chung và không chứng minh khóa sai.

IPN hiện tại cần khai báo với VNPAY:

```text
https://handed-employer-radio.ngrok-free.dev/api/ticketing/vnpay/ipn
```

Return URL hiện tại:

```text
https://handed-employer-radio.ngrok-free.dev/payment/vnpay-return
```

Đường IPN không chữ ký đã trả đúng `RspCode=97` và trang Return truy cập được. Chưa xác minh giao dịch sandbox hoàn tất/IPN thực từ VNPAY, chưa kiểm tra thư xuất hiện trong hộp thư người nhận. SMTP xác thực hoặc nhận thư không bảo đảm thư đã vào Inbox; cần kiểm tra cả Spam.
