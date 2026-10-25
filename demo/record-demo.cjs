// Run from the repository root with the backend and frontend already running.
const { chromium } = require('C:/Users/Nxuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const base = 'http://127.0.0.1:5173';
const pause = ms => new Promise(r=>setTimeout(r,ms));
const results = { startedAt: new Date().toISOString(), checks: [], errors: [] };

(async () => {
 const browser = await chromium.launch({executablePath:'C:/Users/Nxuan/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe',headless:true});
 const context = await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:path.join(root,'raw'),size:{width:1440,height:900}},acceptDownloads:true});
 const page = await context.newPage();
 page.setDefaultTimeout(10000);
 page.on('request',r=>{if(r.method()==='POST')console.log('POST '+r.url())});
 page.on('pageerror',e=>results.errors.push(e.message));
 page.on('dialog',async d=>{results.errors.push('Dialog: '+d.message());await d.accept()});
 page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=400&&!(r.status()===401&&r.url().endsWith('/auth/refresh'))) results.errors.push(`${r.status()} ${r.url()}`)});
 const caption = async (title,detail='') => {
  await page.evaluate(({title,detail})=>{
   let el=document.getElementById('demo-caption'); if(!el){el=document.createElement('div');el.id='demo-caption';document.body.append(el)}
   Object.assign(el.style,{position:'fixed',bottom:'16px',left:'50%',transform:'translateX(-50%)',width:'calc(100% - 96px)',boxSizing:'border-box',padding:'15px 24px',background:'rgba(15,23,42,.96)',borderLeft:'5px solid #ef4444',borderRadius:'12px',color:'#fff',fontFamily:'Segoe UI,Arial,sans-serif',zIndex:'2147483647',pointerEvents:'none',boxShadow:'0 8px 30px #0004'});
   el.replaceChildren();const a=document.createElement('div');a.textContent=title;Object.assign(a.style,{fontSize:'21px',fontWeight:'700'});el.append(a);if(detail){const b=document.createElement('div');b.textContent=detail;Object.assign(b.style,{fontSize:'16px',marginTop:'6px',color:'#cbd5e1'});el.append(b)}
  },{title,detail});
  console.log(title); await pause(3200);
 };
 const shot = async name=>page.screenshot({path:path.join(root,name+'.png')});
 const check = (name,extra={})=>results.checks.push({name,passed:true,...extra});
 try {
  await page.setContent('<html><body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh"><img style="width:100%;height:100%;object-fit:contain" src="data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'vscode-clean.jpg')).toString('base64')+'"></body></html>');
  await caption('RIGHTWAY | Demo hệ thống đặt vé xe trực tuyến','Dự án trong Visual Studio Code • React + Express + Prisma + SQL Server');await pause(3000);
  await page.goto(base+'/register',{waitUntil:'domcontentloaded'});
  const demoEmail='demo.video.'+Date.now()+'@example.com';results.customerEmail=demoEmail;
  await page.locator('#register-name').fill('Nguyễn Khách Demo');await page.locator('#register-email').fill(demoEmail);await page.locator('#register-password').fill('Demo@123456');await page.locator('#register-confirm').fill('Demo@123456');
  await caption('Tạo tài khoản khách hàng demo','Đăng ký với email giả lập tại example.com để quản lý vé theo tài khoản.');
  await page.getByRole('button',{name:'Đăng ký',exact:true}).click();await page.waitForURL(base+'/');check('Customer registration');
  await page.getByRole('button',{name:'Tìm chuyến xe'}).waitFor();
  await caption('01 | Trang chủ và nội dung dịch vụ','Tìm chuyến theo tuyến, ngày đi, số khách; ưu đãi, tuyến phổ biến và tin tức.');await shot('01-home');
  await page.getByPlaceholder('Nhập điểm đi',{exact:true}).fill('Hà Nội');
  await page.getByPlaceholder('Nhập điểm đến ví dụ Đà Nẵng').fill('Đà Nẵng');
  await page.locator('input[type=date]').fill('2026-10-24');
  await page.locator('.search-form select').selectOption('2');await pause(1200);
  await page.getByRole('button',{name:'Tìm chuyến xe'}).click();
  await page.getByRole('button',{name:'Chọn chuyến',exact:true}).first().waitFor();check('Search trips');
  await caption('02 | Tìm chuyến Hà Nội → Đà Nẵng','Ngày 24/10/2026 • 2 hành khách • Danh sách chuyến lấy từ SQL Server.');await shot('02-search');
  await page.getByLabel('Tối 18:00 - 24:00').check();await pause(1400);
  await caption('Bộ lọc khung giờ khởi hành','Chỉ hiển thị các chuyến chạy buổi tối (18:00–24:00).');check('Departure time filter');
  await page.getByLabel('Tối 18:00 - 24:00').uncheck();await pause(1200);
  const detailLink=page.locator('.trip-company-link').first();await detailLink.click();await page.getByRole('button',{name:/Chọn chuyến này/}).waitFor();
  await caption('03 | Chi tiết chuyến xe','Thông tin nhà xe, lộ trình, thời gian, giá vé và tiện ích.');check('Trip detail');await shot('03-detail');
  await page.goBack();await page.getByRole('button',{name:'Chọn chuyến',exact:true}).first().click();
  await page.locator('.seat:not(.booked)').first().waitFor();
  await caption('04 | Chọn ghế theo chuyến và ngày','Sơ đồ hai tầng; ghế trống, đang chọn và đã đặt có trạng thái riêng.');
  await page.locator('.seat:not(.booked)').nth(1).click();await page.locator('.seat:not(.booked)').nth(2).click();await pause(1000);await shot('04-seats');
  await page.getByRole('button',{name:/Tiếp tục nhập thông tin/}).click();
  await page.getByPlaceholder('Ví dụ: Nguyễn Văn A').fill('Nguyễn Khách Demo');
  await page.getByPlaceholder('Ví dụ: 0912345678').fill('0900000000');
  await page.getByPlaceholder('Ví dụ: email@gmail.com').fill(demoEmail);
  await caption('05 | Thông tin hành khách','Dùng thông tin giả lập cho demo; kiểm tra họ tên, số điện thoại và email.');await shot('05-passenger');
  await page.getByRole('button',{name:'Tiếp tục thanh toán'}).click();
  await page.getByText('Thanh toán bằng tiền mặt khi lên xe',{exact:true}).click();
  await caption('06 | Xác nhận đơn vé','Chọn tiền mặt khi lên xe. Các lựa chọn thanh toán trực tuyến hiện là giao diện, chưa giao dịch thật.');await shot('06-payment');
  const [response]=await Promise.all([page.waitForResponse(r=>r.url().includes('/api/bookings')&&r.request().method()==='POST'),page.locator('.booking-sidebar button').click()]);
  const booking=await response.json();if(response.status()>=400)throw new Error(JSON.stringify(booking));
  results.booking=booking;check('Create booking with two tickets',{bookingCode:booking.bookingCode});
  await page.waitForURL('**/lookup?**');await pause(2200);
  await caption('07 | Đặt vé thành công và tra cứu','Mã đơn '+booking.bookingCode+' • Đơn chờ quản trị viên duyệt, đã lưu vào database.');await shot('07-lookup');
  await page.goto(base+'/my-bookings',{waitUntil:'domcontentloaded'});await pause(1800);await caption('Vé của tôi','Khách hàng đăng nhập xem danh sách vé đã đặt theo tài khoản.');check('Customer bookings page');await shot('my-bookings');
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await pause(800);
  await page.goto(base+'/login',{waitUntil:'domcontentloaded'});await page.getByLabel('Email',{exact:true}).fill('admin@rightway.com');await page.getByLabel('Mật khẩu',{exact:true}).fill('Admin@123');
  await caption('08 | Đăng nhập quản trị','Tài khoản admin dùng dữ liệu mẫu của dự án.');
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/admin');await pause(1800);
  await caption('09 | Dashboard quản trị','Tổng đơn, doanh thu, thành viên, chuyến xe và biểu đồ từ dữ liệu đã nạp.');check('Admin login and dashboard');await shot('08-dashboard');
  await page.goto(base+'/admin/bookings');await page.getByPlaceholder('Tìm theo mã vé, tên, SĐT...').fill(booking.bookingCode);await pause(1700);
  await caption('10 | Quản lý đơn vé','Tìm đúng đơn vừa đặt; xem hành khách, ghế, giá tiền và trạng thái.');
  await page.getByTitle('Duyệt vé cho khách').click();await pause(1500);
  await caption('Duyệt đơn đặt vé','Trạng thái đơn được chuyển từ Chờ xử lý sang Đã duyệt.');check('Approve booking');await shot('09-approved');
  for(const [url,title,detail] of [
   ['trips','11 | Quản lý chuyến xe','Xem danh sách chuyến từ database; phần thêm/sửa cần hoàn thiện kết nối dữ liệu.'],
   ['routes','12 | Quản lý tuyến đường','Theo dõi các tuyến đi/đến và khoảng cách.'],
   ['companies','13 | Quản lý nhà xe','Danh sách hãng xe, thông tin và đánh giá.'],
   ['promotions','14 | Quản lý khuyến mãi','Danh sách chương trình ưu đãi và trạng thái hoạt động.'],
   ['news','15 | Quản lý tin tức','Theo dõi và biên tập nội dung tin tức.'],
   ['users','16 | Quản lý người dùng','Danh sách thành viên và vai trò trong hệ thống.'],
   ['reports','17 | Báo cáo và thống kê','Lọc dữ liệu, xem doanh thu và xuất báo cáo Excel.']]) {
    await page.goto(base+'/admin/'+url,{waitUntil:'domcontentloaded'});await pause(1600);await caption(title,detail);await shot('admin-'+url);check('Admin page: '+url);
   }
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất Báo cáo Excel'}).click();const file=await download;await file.saveAs(path.join(root,'Bao-cao-demo.xlsx'));check('Export Excel');
  await caption('Xuất báo cáo Excel thành công','File Bao-cao-demo.xlsx được lưu cùng video.');
  await page.goto(base+'/lookup?code='+booking.bookingCode+'&phone=0900000000');await pause(1800);
  await caption('18 | Kiểm tra lại kết quả từ phía khách hàng','Tra cứu lại đơn '+booking.bookingCode+' sau khi quản trị viên duyệt.');await shot('10-final-lookup');check('Lookup approved booking');
  await page.setContent('<body style="margin:0;height:100vh;background:linear-gradient(135deg,#0f172a,#1e293b);color:white;display:grid;place-items:center;font-family:Segoe UI"><main style="max-width:1050px"><div style="color:#f87171;font-size:23px;letter-spacing:5px">RIGHTWAY</div><h1 style="font-size:60px;margin:20px 0">Hoàn tất demo chức năng</h1><p style="font-size:28px;line-height:1.7">Tìm chuyến → Chọn ghế → Đặt vé → Tra cứu<br>Quản trị → Duyệt đơn → Báo cáo Excel</p><p style="font-size:20px;color:#cbd5e1">Dữ liệu lưu trên SQL Server cục bộ • Thông tin hành khách dùng cho demo</p></main></body>');await pause(6000);
 }catch(e){results.errors.push(e.stack);await shot('error');console.error(e);process.exitCode=1}
 finally{const video=page.video();await context.close();results.video=await video.path();fs.writeFileSync(path.join(root,'recording-result.json'),JSON.stringify(results,null,2));await browser.close();console.log(JSON.stringify({video:results.video,checks:results.checks.length,errors:results.errors}));}
})();
