import '../services/operator_service.dart';
import 'operator/operator_portal_screen.dart';

import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../utils/app_access.dart';
import '../services/api_service.dart';
import '../widgets/app_widgets.dart';
import 'login_screen.dart';
import 'forgot_password_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Widget detail(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 10),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Color(0xFF6B7280), fontSize: 13),
        ),
        const SizedBox(height: 4),
        SelectableText(
          value.trim().isEmpty ? 'Chưa cung cấp' : value,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      const CircleAvatar(
        radius: 40,
        backgroundColor: Color(0xFFFEF2F2),
        child: Icon(Icons.person, size: 44, color: red),
      ),
      heading('Tài khoản cá nhân'),
      if (api.user == null)
        const Text(
          'Đăng nhập để xem thông tin tài khoản và quản lý vé của bạn.',
        )
      else
        panel(
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              detail('Họ và tên', api.user?['fullName'] as String? ?? ''),
              const Divider(height: 1),
              detail('Email đăng nhập', api.user?['email'] as String? ?? ''),
              const Divider(height: 1),
              detail(
                'Loại tài khoản',
                AppAccess(api.user).admin
                    ? 'Quản trị viên'
                    : AppAccess(api.user).operator
                    ? 'Nhân sự nhà xe'
                    : AppAccess(api.user).customer
                    ? 'Khách hàng'
                    : 'Chưa được cấp quyền truy cập',
              ),
              if (api.user?['companyMembership']?['company']?['name'] !=
                  null) ...[
                const Divider(height: 1),
                detail(
                  'Nhà xe',
                  '${api.user!['companyMembership']['company']['name']}',
                ),
              ],
            ],
          ),
        ),
      if (api.user != null) ...[
        heading('Bảo mật tài khoản'),
        const Text(
          'Bạn có thể đặt lại mật khẩu qua email đăng ký. Sau khi đổi mật khẩu, mọi phiên đăng nhập cũ sẽ kết thúc.',
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          icon: const Icon(Icons.lock_reset),
          label: const Text('Đặt lại mật khẩu qua email'),
          onPressed: () async {
            final changed = await open<bool>(
              context,
              ForgotPasswordScreen(
                initialEmail: api.user?['email'] as String? ?? '',
              ),
            );
            if (!mounted) return;
            setState(() {});
            if (changed == true && context.mounted) {
              notify(context, 'Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
            }
          },
        ),
      ],
      const SizedBox(height: 24),
      FilledButton(
        onPressed: () async {
          if (api.user == null) {
            await open(context, const LoginScreen());
          } else {
            try {
              await api.logout();
            } catch (e) {
              if (context.mounted) notify(context, e);
            }
          }
          if (mounted) setState(() {});
        },
        child: Text(api.user == null ? 'Đăng nhập / Đăng ký' : 'Đăng xuất'),
      ),
      if (OperatorAccess.from(
        api.user?['companyMembership'] is Map
            ? Map<String, dynamic>.from(api.user!['companyMembership'])
            : null,
      ).allowed)
        OutlinedButton.icon(
          onPressed: () => open(
            context,
            Scaffold(
              appBar: AppBar(title: const Text('Khu vực làm việc')),
              body: const SafeArea(child: OperatorPortalScreen()),
            ),
          ),
          icon: const Icon(Icons.work_outline),
          label: const Text('Khu vực nhân viên / quản lý'),
        ),
    ],
  );
}
