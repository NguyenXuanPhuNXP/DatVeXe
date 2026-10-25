# Demo Rightway

Video: `Rightway-Demo.mp4` (có chú thích tiếng Việt, không có thuyết minh âm thanh).

Video mở đầu bằng khung hình dự án trong Visual Studio Code, sau đó ghi trực tiếp thao tác trên ứng dụng chạy cục bộ. Các request nghiệp vụ sử dụng backend và SQL Server thật. Không sử dụng mock API để tạo video.

Tệp bàn giao:

- `Rightway-Demo.mp4`: video hoàn chỉnh.
- `Bao-cao-demo.xlsx`: file xuất từ chức năng báo cáo.
- `BAO-CAO-KIEM-TRA.md`: chức năng đã kiểm tra và các giới hạn còn lại.
- `check-results.json`: kết quả kiểm tra API/database.
- `recording-result.json`: kết quả ghi hình và mã đơn tạo trong video.

## Chạy ứng dụng

Trong terminal thứ nhất tại `backend`, chạy `npm run dev`. Trong terminal thứ hai tại `frontend`, chạy `npm run dev`.

- Frontend: http://localhost:5173
- Backend: http://localhost:3000/health
- Admin mẫu: `admin@rightway.com` / `Admin@123`.

Database cần kết nối được theo `backend/.env`. Dữ liệu demo đã được thêm; không cần chạy lại seed gốc.

## Tái chạy kịch bản

Chạy từ thư mục gốc dự án:

```powershell
node demo/seed-demo.cjs
node demo/record-demo.cjs
node demo/verify-demo.cjs
node demo/export-video.cjs
```

`seed-demo.cjs` bổ sung dữ liệu có nhãn Demo, kiểm tra tồn tại trước khi tạo các đơn lịch sử. Mỗi lần ghi hình tạo tài khoản khách hàng và đơn vé mới. Script kiểm tra tạo một đơn riêng để kiểm tra hủy vé, không hủy đơn trong video.

Kịch bản ghi hình cần Playwright từ runtime đã cài trên máy này, Chromium cục bộ, FFmpeg của Playwright và khung hình `vscode-clean.jpg`. Script xuất MP4 dùng FFmpeg tại `demo/tools/node_modules/ffmpeg-static/ffmpeg.exe`. Video gốc, ảnh chụp, log và bộ công cụ được bỏ qua trong Git qua `demo/.gitignore`.
