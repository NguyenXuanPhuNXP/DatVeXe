import '../services/customer_service.dart';

import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/remote.dart';
import 'login_screen.dart';
import 'booking_detail_screen.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});
  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  int revision = 0;
  @override
  Widget build(BuildContext context) {
    if (api.user == null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.confirmation_number_outlined,
              color: red,
              size: 64,
            ),
            heading('Hành trình của bạn'),
            const Text('Đăng nhập để xem các vé đã đặt.'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () async {
                await open(context, const LoginScreen());
                if (mounted) setState(() {});
              },
              child: const Text('Đăng nhập'),
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: () async => setState(() => revision++),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          heading('Vé của tôi'),
          Remote(
            key: ValueKey(revision),
            load: () => customer.myBookings(),
            builder: (data) => Column(
              children: [
                if ((data as List).isEmpty)
                  panel(
                    const Text('Bạn chưa có vé. Hãy chọn hành trình đầu tiên!'),
                  ),
                ...data.map<Widget>(
                  (b) => panel(
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(
                        Icons.confirmation_number_outlined,
                        color: red,
                      ),
                      title: Text('${b['bookingCode']}'),
                      subtitle: Text(
                        '${label(b['status'])} • ${money(b['totalPrice'])}',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () async {
                        await open(
                          context,
                          BookingDetailScreen(
                            booking: Map<String, dynamic>.from(b),
                          ),
                        );
                        if (mounted) setState(() => revision++);
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
