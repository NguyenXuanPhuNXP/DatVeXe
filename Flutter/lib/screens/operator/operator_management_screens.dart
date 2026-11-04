import '../../services/management_service.dart';

import 'package:flutter/material.dart';

import '../../services/operator_service.dart';
import '../../widgets/app_widgets.dart';
import 'operator_widgets.dart';

class OperatorEmployeesScreen extends StatefulWidget {
  const OperatorEmployeesScreen({super.key, required this.access});
  final OperatorAccess access;
  @override
  State<OperatorEmployeesScreen> createState() =>
      _OperatorEmployeesScreenState();
}

class _OperatorEmployeesScreenState extends State<OperatorEmployeesScreen> {
  int revision = 0;
  Future<void> edit([Map<String, dynamic>? member]) async {
    if (!widget.access.manageEmployees) return;
    final result = await open<bool>(
      context,
      OperatorForm(
        title: member == null ? 'Thêm nhân viên' : 'Sửa nhân viên',
        fields: [
          const OpField('fullName', 'Họ tên'),
          if (member == null) ...[
            const OpField('email', 'Email', email: true, max: 254),
            const OpField('password', 'Mật khẩu', secret: true, max: 72),
          ],
          if (widget.access.manageManagers)
            const OpField(
              'role',
              'Vai trò',
              options: {'staff': 'Nhân viên', 'manager': 'Quản lý'},
            ),
        ],
        initial: {
          'fullName': member?['user']?['fullName'] ?? '',
          'role': member?['role'] ?? 'staff',
        },
        save: (v) async {
          if (member == null) {
            await operatorApi.createEmployee({
              ...v,
              if (!widget.access.manageManagers) 'role': 'staff',
            });
          } else {
            await operatorApi.updateEmployee('${member['id']}', v);
          }
        },
      ),
    );
    if (result == true && mounted) setState(() => revision++);
  }

  Future<void> toggle(
    Map<String, dynamic> m,
    Future<void> Function() reload,
  ) async {
    final enable = m['isActive'] != true;
    if (await opConfirm(
          context,
          enable ? 'Mở quyền làm việc?' : 'Khóa quyền làm việc?',
          'Thay đổi quyền làm việc trong nhà xe của ${m['user']?['email']}?',
        ) !=
        true) {
      return;
    }
    try {
      await operatorApi.updateEmployee('${m['id']}', {'isActive': enable});
      await reload();
    } catch (e) {
      if (mounted) notify(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.access.manageEmployees) {
      return const Scaffold(
        body: Center(child: Text('Không có quyền quản lý nhân viên.')),
      );
    }
    return OperatorList(
      key: ValueKey(revision),
      title: 'Quản lý nhân viên',
      load: operatorApi.employees,
      actions: [
        IconButton(
          tooltip: 'Thêm nhân viên',
          onPressed: () => edit(),
          icon: const Icon(Icons.person_add),
        ),
      ],
      item: (c, m, reload) => panel(
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            heading('${m['user']?['fullName'] ?? ''}'),
            Text('${m['user']?['email']}'),
            Text(
              '${m['role'] == 'manager' ? 'Quản lý' : 'Nhân viên'} • ${m['isActive'] == true ? 'Đang làm việc' : 'Đã khóa quyền'}',
            ),
            Wrap(
              children: [
                TextButton(
                  onPressed: () => edit(m),
                  child: const Text('Sửa thông tin'),
                ),
                TextButton(
                  onPressed: () => toggle(m, reload),
                  child: Text(
                    m['isActive'] == true ? 'Khóa quyền' : 'Mở quyền',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class OperatorEmailScreen extends StatelessWidget {
  const OperatorEmailScreen({super.key});
  @override
  Widget build(BuildContext context) => OperatorList(
    title: 'Email vé',
    load: operatorApi.emailJobs,
    item: (c, j, reload) => panel(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          heading('${j['booking']?['bookingCode']}'),
          Text('${j['booking']?['passengerEmail'] ?? ''}'),
          Text(
            'Trạng thái: ${const {'pending': 'Chờ gửi', 'sending': 'Đang gửi', 'sent': 'Đã gửi', 'failed': 'Lỗi'}[j['status']] ?? j['status']} • Thử ${j['attempts']} lần',
          ),
          if (j['lastError'] != null)
            const Text('Lần gửi trước gặp lỗi. Có thể thử lại.'),
          if (j['booking']?['paymentStatus'] == 'paid' &&
              j['booking']?['status'] != 'cancelled')
            TextButton(
              onPressed: () async {
                try {
                  await operatorApi.resend('${j['bookingId']}');
                  await reload();
                  if (c.mounted) {
                    notify(c, 'Đã yêu cầu gửi lại vé đến email trên đơn.');
                  }
                } catch (e) {
                  if (c.mounted) notify(c, e);
                }
              },
              child: const Text('Gửi lại vé'),
            ),
        ],
      ),
    ),
  );
}

class OperatorPaymentIssuesScreen extends StatelessWidget {
  const OperatorPaymentIssuesScreen({super.key, this.admin = false});
  final bool admin;
  @override
  Widget build(BuildContext context) => OperatorList(
    title: 'Đối soát thanh toán',
    load: admin
        ? () => management.list('/admin/payment-issues')
        : operatorApi.paymentIssues,
    item: (c, a, reload) => panel(
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          heading('${a['booking']?['bookingCode']}'),
          Text(
            '${a['booking']?['passengerName'] ?? ''} • ${a['booking']?['passengerPhone'] ?? ''}',
          ),
          Text('Cổng: ${a['provider'] ?? ''}'),
          Text('Trạng thái: ${a['status']}'),
          Text('${a['message'] ?? 'Khoản tiền cần đối soát và hoàn lại'}'),
          const Text(
            'Đối soát với cổng thanh toán và xử lý hoàn tiền bên ngoài hệ thống. Trang này không tự chuyển tiền.',
          ),
        ],
      ),
    ),
  );
}
