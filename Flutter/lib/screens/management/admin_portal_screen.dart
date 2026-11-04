import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../widgets/app_widgets.dart';
import '../operator/operator_bookings_screen.dart';
import '../operator/operator_management_screens.dart';
import 'catalog.dart';
import 'resource_screen.dart';
import 'insights_screens.dart';
import 'tools_screens.dart';

class AdminPortalScreen extends StatefulWidget {
  const AdminPortalScreen({super.key});
  @override
  State<AdminPortalScreen> createState() => _AdminPortalScreenState();
}

class _AdminPortalScreenState extends State<AdminPortalScreen> {
  int selected = 0;
  late final pages = <Widget>[
    const MetricsScreen(title: 'Tổng quan quản trị', path: '/admin/dashboard'),
    ResourceScreen(spec: catalog('trips')),
    const TripFilesScreen(),
    ResourceScreen(spec: catalog('routes')),
    ResourceScreen(spec: catalog('points')),
    ResourceScreen(spec: catalog('buses')),
    ResourceScreen(spec: catalog('companies')),
    const OperatorBookingsScreen(admin: true),
    const AnomaliesScreen(),
    ResourceScreen(spec: catalog('promotions')),
    ResourceScreen(spec: catalog('news')),
    const UsersScreen(),
    const CompanyAccessScreen(),
    const MetricsScreen(title: 'Báo cáo', path: '/admin/reports', filter: true),
    const IntegrationsScreen(),
    const OperatorPaymentIssuesScreen(admin: true),
  ];
  static const labels = [
    'Tổng quan',
    'Chuyến xe',
    'Import / Export chuyến',
    'Tuyến đường',
    'Điểm đón/trả',
    'Xe',
    'Nhà xe',
    'Đặt vé và thu tiền',
    'Vé nghi vấn',
    'Khuyến mãi',
    'Tin tức',
    'Người dùng',
    'Phân quyền nhà xe',
    'Báo cáo',
    'VNPAY và email',
    'Đối soát thanh toán',
  ];
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Rightway · Quản trị')),
    drawer: Drawer(
      child: SafeArea(
        child: ListView(
          children: [
            DrawerHeader(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.directions_bus,
                    color: Color(0xFFDC2626),
                    size: 40,
                  ),
                  const Text(
                    'Rightway',
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                  ),
                  Text('${api.user?['fullName'] ?? api.user?['email'] ?? ''}'),
                ],
              ),
            ),
            for (var i = 0; i < labels.length; i++)
              ListTile(
                selected: selected == i,
                leading: Icon(
                  i == 0
                      ? Icons.dashboard_outlined
                      : i == 13
                      ? Icons.analytics_outlined
                      : Icons.chevron_right,
                ),
                title: Text(labels[i]),
                onTap: () {
                  setState(() => selected = i);
                  Navigator.pop(context);
                },
              ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Đăng xuất'),
              onTap: () async {
                Navigator.pop(context);
                try {
                  await api.logout();
                } catch (e) {
                  if (context.mounted) notify(context, e);
                }
              },
            ),
          ],
        ),
      ),
    ),
    body: pages[selected],
  );
}
