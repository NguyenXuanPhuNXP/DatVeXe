import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/app_access.dart';
import '../config/app_theme.dart';
import '../widgets/app_widgets.dart';
import 'home_screen.dart';
import 'my_bookings_screen.dart';
import 'booking_lookup_screen.dart';
import 'account_screen.dart';
import 'support_screen.dart';
import 'operator/operator_portal_screen.dart';
import 'management/admin_portal_screen.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int index = 0;
  @override
  void initState() {
    super.initState();
    api.sessionChanges.addListener(changed);
  }

  void changed() {
    if (mounted) {
      setState(() {
        index = 0;
      });
    }
  }

  @override
  void dispose() {
    api.sessionChanges.removeListener(changed);
    super.dispose();
  }

  Future<void> logout() async {
    try {
      await api.logout();
    } catch (e) {
      if (mounted) notify(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (api.user == null) return const LoginScreen();
    final access = AppAccess(api.user);
    if (access.admin) return const AdminPortalScreen();
    if (access.operator) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Rightway · Nhà xe'),
          actions: [
            IconButton(
              tooltip: 'Tài khoản',
              onPressed: () => open(
                context,
                Scaffold(
                  appBar: AppBar(title: const Text('Tài khoản')),
                  body: const AccountScreen(),
                ),
              ),
              icon: const Icon(Icons.person_outline),
            ),
            IconButton(
              tooltip: 'Đăng xuất',
              onPressed: logout,
              icon: const Icon(Icons.logout),
            ),
          ],
        ),
        body: const OperatorPortalScreen(),
      );
    }
    if (access.blocked) {
      return Scaffold(
        appBar: AppBar(title: const Text('Rightway')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline, size: 56, color: navy),
                heading('Chưa được cấp quyền làm việc'),
                const Text(
                  'Tài khoản nội bộ chưa có quyền đang hoạt động. Vui lòng liên hệ quản trị viên.',
                ),
                FilledButton(onPressed: logout, child: const Text('Đăng xuất')),
              ],
            ),
          ),
        ),
      );
    }
    final pages = <Widget>[
      const HomeScreen(),
      const MyBookingsScreen(),
      const BookingLookupScreen(embedded: true),
      if (access.customer) const SupportScreen(),
      const AccountScreen(),
    ];
    if (index >= pages.length) index = pages.length - 1;
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.directions_bus_filled, color: red),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Rightway',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 900),
          child: pages[index],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (v) => setState(() => index = v),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            label: 'Trang chủ',
          ),
          const NavigationDestination(
            icon: Icon(Icons.confirmation_number_outlined),
            label: 'Vé của tôi',
          ),
          const NavigationDestination(
            icon: Icon(Icons.search),
            label: 'Tra cứu',
          ),
          if (access.customer)
            const NavigationDestination(
              icon: Icon(Icons.support_agent),
              label: 'Hỗ trợ',
            ),
          const NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Tài khoản',
          ),
        ],
      ),
    );
  }
}
