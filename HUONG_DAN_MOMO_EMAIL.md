# Hướng dẫn MoMo và gửi vé email khi chưa có tài khoản/tên miền

Bạn có thể làm từng phần; không cần tạo tất cả tài khoản cùng lúc. Không gửi khóa bí mật, mật khẩu SMTP hoặc mật khẩu ứng dụng vào chat. Chỉ điền vào `backend/.env` trên máy của bạn.

## 1. Những gì đã dùng được ngay

Chạy backend bằng `npm run dev` trong `backend`, frontend bằng `npm run dev` trong `frontend`. Sau khi admin cấp quyền nhà xe, đăng nhập tài khoản nhân viên:

- `/staff/counter`: bán vé tiền mặt/chuyển khoản tại quầy, ghi nhận khoản đã thu và cấp QR.
- `/staff/exchange`: đổi ghế/chuyến, báo chênh lệch, xác nhận khoản thu thêm hoặc hoàn tại quầy.
- `/staff/qr-info`: đọc QR để xem thông tin, không đánh dấu lên xe.
- `/staff/qr-board`: chọn đúng chuyến hôm nay, quét và xác nhận lên xe.
- Chủ nhà xe dùng các đường dẫn tương tự bắt đầu bằng `/company`.

Các đơn chưa trả tiền giữ ghế 5 phút rồi hủy. Vé đã trả tiền có QR để tải tại trang tra cứu. Nếu chưa cấu hình SMTP, email sẽ chờ trong hàng đợi; các chức năng còn lại vẫn hoạt động. Camera cần quyền truy cập camera; có thể chọn ảnh QR thay thế.

## 2. Cấu hình email trước, chưa cần tên miền

Một cách thử bằng tài khoản Gmail của bạn:

1. Vào [Tài khoản Google](https://myaccount.google.com/security), bật xác minh 2 bước nếu chưa có.
2. Vào [Mật khẩu ứng dụng](https://myaccount.google.com/apppasswords), tạo mật khẩu cho ứng dụng Rightway.
3. Chép mật khẩu ứng dụng vào `.env`; không dùng mật khẩu đăng nhập Gmail thông thường.
4. Dùng chính địa chỉ Gmail đó ở `SMTP_USER` và `MAIL_FROM`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=dia-chi-cua-ban@gmail.com
SMTP_PASS=mat-khau-ung-dung-cua-ban
MAIL_FROM="Rightway <dia-chi-cua-ban@gmail.com>"
```

Các giá trị trên là ví dụ, phải thay bằng thông tin của bạn. Mật khẩu ứng dụng chỉ dùng được với tài khoản hỗ trợ tính năng này và đã bật xác minh 2 bước. Tài khoản tổ chức hoặc bật bảo vệ nâng cao có thể không có mục này; khi đó dùng SMTP của nhà cung cấp email khác được tài khoản của bạn cho phép. Không thay bằng việc tắt xác minh 2 bước.

5. Khởi động lại backend. Worker sẽ tự gửi các vé hợp lệ đang chờ; chỉ gửi tới địa chỉ email trên booking.
6. Để thử, bán một vé kiểm thử tại quầy và nhập email của chính bạn. Kiểm tra Inbox/Spam; thư có thông tin chuyến và QR riêng cho từng ghế. QR chỉ có hiệu lực với vé đã trả tiền và còn hiệu lực trong database.

Nguồn: [Google về mật khẩu ứng dụng](https://support.google.com/mail/answer/185833?hl=vi), [SMTP Gmail](https://developers.google.com/workspace/gmail/imap/imap-smtp?hl=vi).

## 3. Chuẩn bị tài khoản MoMo merchant

Ví MoMo cá nhân không tự cung cấp ba khóa merchant mà ứng dụng cần. Bạn cần tài khoản MoMo for Business và sản phẩm thanh toán trực tuyến phù hợp:

1. Mở [MoMo for Business](https://business.momo.vn/), đăng ký/liên hệ bộ phận hỗ trợ đối tác theo loại hình của bạn.
2. Hoàn thành thông tin/hồ sơ MoMo yêu cầu cho tài khoản đối tác. Danh sách hồ sơ phụ thuộc loại đối tác; xác nhận trực tiếp với MoMo.
3. Xin thông tin tích hợp **sandbox** trước: Partner Code, Access Key, Secret Key.
4. Kiểm thử tạo liên kết, thanh toán bằng môi trường thử nghiệm, nhận IPN, QR/email, giao dịch lặp và đơn hết hạn.
5. Gửi kết quả kiểm thử theo yêu cầu MoMo, hoàn thành xác minh và xin **khóa production**. Bộ khóa sandbox và production khác nhau.

Quy trình này theo [hướng dẫn tích hợp chính thức của MoMo](https://developers.momo.vn/v3/docs/payment/onboarding/integration-process/). Chọn dùng tài khoản thật không thay thế bước MoMo duyệt/cấp quyền production.

Trong giai đoạn thử, điền:

```dotenv
MOMO_ENV=sandbox
MOMO_PARTNER_CODE=partner-code-sandbox-cua-ban
MOMO_ACCESS_KEY=access-key-sandbox-cua-ban
MOMO_SECRET_KEY=secret-key-sandbox-cua-ban
```

Ứng dụng không có nút giả lập thanh toán thành công để đánh dấu tiền thật. Khách trả tiền tại MoMo; backend chỉ công nhận thông báo IPN đã kiểm tra chữ ký và đối chiếu đơn/số tiền. Quay về trang web từ MoMo không tự làm vé thành `paid`.

## 4. Chưa có tên miền: HTTPS tạm để thử sandbox

Bạn có thể thử webhook với Cloudflare Quick Tunnel mà không cần mua domain. Địa chỉ này tạm thời, đổi khi mở tunnel mới và ngừng hoạt động khi tắt tiến trình. Chỉ dùng cho kiểm thử; không dùng làm địa chỉ nhận thanh toán production ổn định. [Tài liệu Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

Dự án đã có Vite proxy `/api` tới backend cổng 3000, nên chỉ cần một tunnel cho frontend:

1. Cài `cloudflared` theo [hướng dẫn chính thức](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). Không cần mua domain cho Quick Tunnel.
2. Mở terminal thứ nhất, chạy backend:

```powershell
cd C:\QLDA\DatVeXe\backend
npm run dev
```

3. Tạo `frontend/.env.local` với:

```dotenv
VITE_API_URL=/api
```

4. Mở terminal thứ hai, chạy frontend ở cổng cố định:

```powershell
cd C:\QLDA\DatVeXe\frontend
npm run dev -- --port 5173 --strictPort
```

5. Mở terminal thứ ba và chạy:

```powershell
cloudflared tunnel --url http://localhost:5173
```

Chương trình in ra URL HTTPS, ví dụ `https://ten-ngau-nhien.trycloudflare.com`. Đó là ví dụ, hãy dùng URL thực tế được in trên máy bạn. Tunnel công khai frontend và các API được proxy; chỉ mở bản dữ liệu kiểm thử của bạn. Không thêm lớp đăng nhập của Cloudflare trước đường dẫn IPN vì server MoMo cần gọi trực tiếp.

6. Nếu Vite báo hostname chưa được cho phép: dừng Vite, ở terminal frontend khai báo đúng hostname thực tế rồi chạy lại. Không thêm `https://` vào biến hostname:

```powershell
$env:__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS='ten-ngau-nhien.trycloudflare.com'
npm run dev -- --port 5173 --strictPort
```

7. Sửa `backend/.env` theo đúng URL tunnel của bạn:

```dotenv
MOMO_ENV=sandbox
CORS_ORIGIN=https://ten-ngau-nhien.trycloudflare.com
MOMO_IPN_URL=https://ten-ngau-nhien.trycloudflare.com/api/ticketing/momo/ipn
MOMO_REDIRECT_URL=https://ten-ngau-nhien.trycloudflare.com/payment/momo-return
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

8. Khởi động lại backend, giữ cả ba terminal mở. Mở website bằng URL HTTPS, đặt vé và thanh toán bằng tài khoản/app thử theo hướng dẫn MoMo. Không dùng khóa production cho thử nghiệm này. Nếu MoMo yêu cầu duyệt/đăng ký hostname, đăng ký URL thử theo hướng dẫn của đối tác.
9. Nếu tắt/mở tunnel và URL thay đổi, cập nhật lại hostname Vite, `CORS_ORIGIN`, `MOMO_IPN_URL`, `MOMO_REDIRECT_URL` rồi khởi động lại dịch vụ.

Khi quay lại chỉ chạy localhost, đổi `CORS_ORIGIN` về `http://localhost:5173`, `COOKIE_SECURE=false`. Cấu hình MoMo vẫn để sandbox; không dùng thanh toán thật qua cấu hình localhost.

## 5. Khi muốn nhận tiền thật

Bạn cần địa chỉ HTTPS ổn định và máy chủ chạy liên tục. Có thể dùng một domain với frontend và API cùng nguồn (ví dụ minh họa `https://ve-cua-ban.vn`), reverse proxy `/api` vào Express. Chọn đơn vị đăng ký domain/hosting phù hợp rồi cấu hình DNS/TLS theo nhà cung cấp. Tài liệu này chưa mua domain, triển khai máy chủ hoặc tạo tunnel cho bạn.

Cấu hình ví dụ sau khi có domain thật và đã được MoMo cấp quyền:

```dotenv
# backend/.env
MOMO_ENV=production
MOMO_PARTNER_CODE=partner-code-production-cua-ban
MOMO_ACCESS_KEY=access-key-production-cua-ban
MOMO_SECRET_KEY=secret-key-production-cua-ban
MOMO_IPN_URL=https://ve-cua-ban.vn/api/ticketing/momo/ipn
MOMO_REDIRECT_URL=https://ve-cua-ban.vn/payment/momo-return
CORS_ORIGIN=https://ve-cua-ban.vn
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

```dotenv
# frontend/.env.production
VITE_API_URL=/api
```

Vite proxy chỉ hoạt động khi phát triển. Khi triển khai bản build frontend, máy chủ/reverse proxy production phải tự chuyển `/api` về Express và hỗ trợ các đường dẫn React Router.

Trước khi mở cho khách, xác minh: tạo đơn thực sự tại cổng đúng môi trường, IPN tới được backend, chữ ký/amount được chấp nhận, chỉ có một biên nhận dù IPN gửi lặp, email nhận thực tế, QR quét được và hết hạn hủy đúng. Việc chuyển tiền thật/đăng ký merchant do bạn thực hiện trong tài khoản của mình.

Nếu trả tiền sau khi hết 5 phút, ứng dụng không lấy lại ghế và không cấp QR. Đơn được ghi vào trang **Đối soát MoMo** của chủ nhà xe/quản lý để xác minh và hoàn tiền trên merchant MoMo. Ứng dụng hiện chưa tự gửi lệnh hoàn tiền thật.

## 6. Kiểm tra cấu hình và xử lý lỗi thường gặp

Chạy:

```powershell
cd C:\QLDA\DatVeXe\backend
npm run integrations:check
```

Lệnh chỉ báo biến nào đã có/chưa có và kiểm tra kết nối/xác thực SMTP nếu đủ thông tin. Không in khóa, không gửi thư, không tạo giao dịch MoMo. URL HTTPS hợp lệ về định dạng không đảm bảo server MoMo truy cập được; cần thử IPN bằng môi trường phù hợp.

| Hiện tượng | Kiểm tra |
| --- | --- |
| MoMo báo chưa cấu hình | Ba khóa merchant và hai URL đã có trong `.env` chưa; đã restart backend chưa. |
| Đã trả tiền nhưng vé chưa xác nhận | Kiểm tra môi trường/khóa và IPN HTTPS có vào được backend, có bị chặn bởi lớp đăng nhập/tunnel/firewall không; xem đơn có hết 5 phút không. Không sửa `paid` theo tham số URL quay về. |
| Thanh toán muộn | Mở Đối soát MoMo, dùng mã giao dịch để liên hệ/hoàn tiền trên merchant. Không đặt lại ghế của khách khác. |
| Không có email | Chạy kiểm tra SMTP, xem hộp Spam, kiểm tra email trên đơn. Nếu dùng Gmail, dùng mật khẩu ứng dụng chứ không dùng mật khẩu đăng nhập. |
| Camera không hoạt động | Mở bằng localhost/HTTPS và cho phép camera, hoặc chọn ảnh QR rõ nét. |
| QR cũ bị từ chối | Nếu đã đổi vé/sửa liên hệ, dùng QR mới trong email hoặc tải lại tại trang tra cứu. |

Tham khảo thêm: [API thanh toán MoMo](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/), [IPN và HTTP 204](https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/).
