# DatVeXe API

Backend API cho ứng dụng đặt vé xe, xây dựng bằng Express, JavaScript, Prisma và Microsoft SQL Server.

## Chức năng

- Đăng ký tài khoản, băm mật khẩu bằng bcrypt và đăng nhập.
- Access token JWT thời hạn 15 phút; refresh token dạng ngẫu nhiên chỉ lưu hash trong session.
- Làm mới token có xoay vòng; logout thu hồi session và access token của session đó mất hiệu lực ngay.
- Role/permission lưu trong database. Tài khoản mới nhận role `USER`; role `ADMIN` được khởi tạo qua seed.
- Middleware xác thực JWT/session, kiểm tra role Admin và kiểm tra permission.

## Cấu trúc MVC

- `src/modules/*/*.routes.js`: khai báo URL, middleware và controller.
- `src/modules/*/*.controller.js`: nhận request, validate input và định dạng response.
- `src/modules/*/*.service.js`: nghiệp vụ xác thực, session và phân quyền.
- `src/models/**/*.model.js`: truy cập dữ liệu SQL Server qua Prisma.
- `prisma/schema.prisma`: định nghĩa các model và quan hệ database.

## Chạy local

Yêu cầu Node.js 20+, npm và Docker Compose (hoặc SQL Server 2019+ tương thích).
Chạy tất cả lệnh bên dưới trong thư mục `backend`.

### Dùng SQL Server Express đã cài trên Windows

1. Mở SQL Server Configuration Manager bằng **Run as administrator**.
2. Trong **SQL Server Network Configuration > Protocols for SQLEXPRESS**, bật **TCP/IP**. Mở properties của TCP/IP, vào **IP Addresses > IPAll**, xóa `TCP Dynamic Ports` và đặt `TCP Port` là `1433`.
3. Trong **SQL Server Services**, khởi động lại **SQL Server (SQLEXPRESS)**.
4. Trong `.env`, đặt connection string để Prisma dùng Windows Authentication:

	```env
	DATABASE_URL="sqlserver://localhost:1433;database=DatVeXe;integratedSecurity=true;trustServerCertificate=true;schema=dbo"
	```

	Với cách này không cần bật Mixed Mode hoặc dùng `sa`; chạy Node/Prisma bằng tài khoản Windows có quyền trên database.

1. Sao chép `.env.example` thành `.env`. Thay `JWT_ACCESS_SECRET` bằng secret ngẫu nhiên dài tối thiểu 32 ký tự, và thiết lập `ADMIN_EMAIL`/`ADMIN_PASSWORD`. Nếu dùng Docker, đặt `MSSQL_SA_PASSWORD` và cùng password đó trong `DATABASE_URL`; nếu dùng SQL Server Express trên Windows, làm theo mục trên và dùng Windows Authentication.
2. Nếu dùng Docker, khởi động SQL Server bằng `docker compose up -d db`.
3. Tạo database `DatVeXe` một lần bằng SQL Server Management Studio hoặc `sqlcmd`:

   ```sql
   IF DB_ID(N'DatVeXe') IS NULL
       CREATE DATABASE [DatVeXe];
   ```

4. Cài dependencies, tạo schema và seed dữ liệu:

	```sh
	npm install
	npx prisma migrate dev --name init
	npm run db:seed
	```

5. Chạy API bằng `npm run dev`. Mặc định API ở `http://localhost:3000`.

## API

Các endpoint nằm dưới `/api`:

| Method | Path | Mô tả |
| --- | --- | --- |
| POST | `/auth/register` | Tạo tài khoản `USER` |
| POST | `/auth/login` | Đăng nhập, trả access token và đặt refresh cookie HttpOnly |
| POST | `/auth/refresh` | Xoay vòng refresh token cookie, trả access token mới |
| POST | `/auth/logout` | Thu hồi session hiện tại và xóa refresh cookie |
| GET | `/auth/me` | Lấy user hiện tại; yêu cầu Bearer access token |
| GET | `/admin/users` | Liệt kê user; yêu cầu role `ADMIN` và `users:read` |
| PUT | `/admin/users/:userId/roles` | Cập nhật role user; yêu cầu role `ADMIN` và `users:manage` |
| GET | `/admin/roles` | Liệt kê role/permission; yêu cầu role `ADMIN` và `roles:read` |

Gửi access token qua `Authorization: Bearer <token>`. Refresh cookie chỉ áp dụng trên đường dẫn `/api/auth`; client trình duyệt cần gửi request với credentials. Cấu hình `CORS_ORIGIN`, `COOKIE_SECURE` và `COOKIE_SAME_SITE` phù hợp khi deploy. Nếu frontend và API khác site, dùng HTTPS, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none` và bổ sung cơ chế CSRF phù hợp.

Định dạng lỗi: `{ "error": { "code": "...", "message": "..." } }`.

## Kiểm tra bằng Postman

Import `postman/DatVeXe.postman_collection.json`. Đặt `adminEmail` và `adminPassword` trong collection variables theo tài khoản đã seed, sau đó chạy API và chọn **Run collection** theo thứ tự. Collection tự sinh email đăng ký mới, lưu access token/user ID, giữ refresh cookie trong Postman cookie jar và kiểm tra cả quyền `USER`/`ADMIN`, refresh cùng logout. Chạy riêng folder **Health** để kiểm tra API không cần kết nối database.
