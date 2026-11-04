import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../services/operator_service.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/remote.dart';
import '../support_screen.dart';
import '../management/catalog.dart';
import '../management/resource_screen.dart';
import '../management/insights_screens.dart';
import 'operator_bookings_screen.dart';
import 'operator_counter_screen.dart';
import 'operator_management_screens.dart';
import 'operator_qr_screen.dart';
import 'operator_trips_screen.dart';

class OperatorPortalScreen extends StatefulWidget {
  const OperatorPortalScreen({super.key, this.loadMembership});
  final Future<Map<String, dynamic>> Function()? loadMembership;
  @override
  State<OperatorPortalScreen> createState() => _OperatorPortalScreenState();
}

class _OperatorPortalScreenState extends State<OperatorPortalScreen> {
  int revision = 0;
  Widget tile(String title, String subtitle, IconData icon, Widget page) =>
      panel(
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Icon(icon),
          title: Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          subtitle: Text(subtitle),
          trailing: const Icon(Icons.chevron_right),
          onTap: () => open(context, page),
        ),
      );
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      Row(
        children: [
          Expanded(child: heading('Khu vực làm việc')),
          IconButton(
            tooltip: 'Kiểm tra lại quyền',
            onPressed: () => setState(() => revision++),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      Remote(
        key: ValueKey(revision),
        load: widget.loadMembership ?? operatorApi.me,
        builder: (raw) {
          final member = Map<String, dynamic>.from(raw);
          final access = OperatorAccess.from(member);
          if (!access.allowed) {
            return const Text('Tài khoản chưa có quyền làm việc tại nhà xe.');
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              panel(
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    heading('${member['company']?['name'] ?? 'Nhà xe'}'),
                    Text(
                      '${access.label} • ${api.user?['fullName'] ?? api.user?['email'] ?? ''}',
                    ),
                  ],
                ),
              ),
              if (access.has('operator.fleet.manage'))
                tile(
                  'Quản lý xe',
                  'Thêm, sửa và xóa xe trong nhà xe',
                  Icons.directions_bus_outlined,
                  ResourceScreen(spec: catalog('buses', owner: true)),
                ),
              if (access.has('operator.trips.manage'))
                tile(
                  'Quản lý chuyến',
                  'Tuyến, xe, giá và lịch khởi hành',
                  Icons.route,
                  ResourceScreen(spec: catalog('trips', owner: true)),
                ),
              if (access.work) ...[
                tile(
                  'Chuyến xe của nhà xe',
                  'Lịch chuyến, sơ đồ ghế và thông tin đặt chỗ',
                  Icons.event_seat_outlined,
                  const OperatorTripsScreen(),
                ),
                tile(
                  'Quản lý vé',
                  'Tìm, duyệt, hủy, hoàn thành và ghi nhận thu tiền',
                  Icons.confirmation_number_outlined,
                  const OperatorBookingsScreen(),
                ),
                tile(
                  'Thông tin khách hàng',
                  'Liên hệ trên vé đang hoạt động',
                  Icons.people_outline,
                  const OperatorBookingsScreen(customers: true),
                ),
                tile(
                  'Bán vé tại quầy',
                  'Chọn ghế, thu tiền và xuất QR',
                  Icons.point_of_sale,
                  const OperatorCounterScreen(),
                ),
                tile(
                  'Đổi ghế / chuyến',
                  'Chọn vé đã thanh toán để báo giá và đổi',
                  Icons.swap_horiz,
                  const OperatorBookingsScreen(),
                ),
                tile(
                  'Email vé',
                  'Trạng thái gửi và yêu cầu gửi lại',
                  Icons.email_outlined,
                  const OperatorEmailScreen(),
                ),
              ],
              if (access.has('operator.support'))
                tile(
                  'Trả lời khách hàng',
                  'Hội thoại hỗ trợ của nhà xe',
                  Icons.support_agent,
                  const SupportScreen(staff: true),
                ),
              if (access.board)
                tile(
                  'Xác nhận lên xe',
                  'Đúng chuyến và ngày khởi hành',
                  Icons.how_to_reg,
                  const OperatorQrScreen(board: true),
                ),
              if (access.manageEmployees)
                tile(
                  'Quản lý nhân viên',
                  access.manageManagers
                      ? 'Cấp quyền quản lý/nhân viên'
                      : 'Chỉ thêm và sửa nhân viên thường',
                  Icons.manage_accounts,
                  OperatorEmployeesScreen(access: access),
                ),
              if (access.has('operator.payment-issues.read'))
                tile(
                  'Đối soát thanh toán',
                  'Các khoản cần hoàn/đối soát',
                  Icons.account_balance_outlined,
                  const OperatorPaymentIssuesScreen(),
                ),
              if (access.has('operator.revenue.read'))
                tile(
                  'Thống kê doanh thu',
                  'Theo biên nhận và khoản điều chỉnh',
                  Icons.analytics_outlined,
                  const MetricsScreen(
                    title: 'Doanh thu nhà xe',
                    path: '/operator/revenue',
                    filter: true,
                  ),
                ),
            ],
          );
        },
      ),
    ],
  );
}
