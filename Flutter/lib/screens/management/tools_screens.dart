import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../services/management_service.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/remote.dart';
import '../operator/operator_widgets.dart';
import 'resource_screen.dart';
import 'catalog.dart';

class TripFilesScreen extends StatefulWidget {
  const TripFilesScreen({super.key});
  @override
  State<TripFilesScreen> createState() => _TripFilesScreenState();
}

class _TripFilesScreenState extends State<TripFilesScreen> {
  final sheet = TextEditingController();
  Uint8List? bytes;
  String? name, error;
  Map<String, dynamic>? preview, result;
  bool busy = false;
  @override
  void dispose() {
    sheet.dispose();
    super.dispose();
  }

  Future<void> run(Future<void> Function() action) async {
    setState(() => busy = true);
    try {
      await action();
      if (mounted) setState(() => error = null);
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Import / Export chuyến xe')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Excel .xlsx, tối đa 5 MB và 300 dòng. Luôn xem trước lỗi theo dòng trước khi import.',
        ),
        OutlinedButton.icon(
          onPressed: busy
              ? null
              : () => run(() async {
                  final file = await DeviceFiles.pickExcel();
                  if (file == null) return;
                  if (mounted) {
                    setState(() {
                      bytes = file['bytes'] as Uint8List;
                      name = '${file['name']}';
                      preview = null;
                      result = null;
                    });
                  }
                }),
          icon: const Icon(Icons.upload_file),
          label: Text(name ?? 'Chọn file Excel'),
        ),
        TextField(
          controller: sheet,
          decoration: const InputDecoration(
            labelText: 'Tên sheet (trống: sheet đầu)',
          ),
          onChanged: (_) => setState(() => preview = null),
        ),
        FilledButton(
          onPressed: busy || bytes == null
              ? null
              : () => run(() async {
                  final d = await management.upload(
                    '/admin/trips/import/preview',
                    bytes!,
                    name!,
                    sheet: sheet.text.trim(),
                  );
                  if (mounted) setState(() => preview = d);
                }),
          child: const Text('Xem trước'),
        ),
        if (preview != null) ...[
          heading('Kiểm tra dữ liệu'),
          Text(
            'Tổng: ${preview!['totalRows']} • Hợp lệ: ${preview!['validRows']} • Lỗi: ${preview!['invalidRows']}',
          ),
          for (final row in preview!['preview'] as List? ?? [])
            panel(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Dòng ${row['rowNumber']} • ${row['status'] == 'valid' ? 'Hợp lệ' : 'Có lỗi'}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  if (row['data'] is Map)
                    Text(
                      '${row['data']['departureTime'] ?? ''} → ${row['data']['arrivalTime'] ?? ''} • ${row['data']['price'] ?? ''} đ',
                    ),
                  for (final e in row['errors'] as List? ?? [])
                    Text(
                      e is Map
                          ? '${e['field'] ?? e['column'] ?? ''}: ${e['message'] ?? ''}'
                          : '$e',
                    ),
                ],
              ),
            ),
          FilledButton(
            onPressed: busy || (preview!['validRows'] as num? ?? 0) == 0
                ? null
                : () => run(() async {
                    if (await opConfirm(
                          context,
                          'Import chuyến xe?',
                          'Chỉ các dòng hợp lệ được ghi. Backend kiểm tra lại toàn bộ file.',
                        ) !=
                        true) {
                      return;
                    }
                    final d = await management.upload(
                      '/admin/trips/import',
                      bytes!,
                      name!,
                      sheet: sheet.text.trim(),
                    );
                    if (mounted) {
                      setState(() {
                        result = d;
                        preview = null;
                      });
                    }
                  }),
            child: const Text('Xác nhận import'),
          ),
        ],
        if (result != null)
          Text(
            'Thành công: ${result!['importedRows']} • Không nhập: ${result!['failedRows']}',
          ),
        const Divider(height: 32),
        OutlinedButton.icon(
          onPressed: busy
              ? null
              : () => run(() async {
                  final file = await management.download(
                    '/admin/trips/export-excel',
                  );
                  await DeviceFiles.save(
                    'danh-sach-chuyen.xlsx',
                    file,
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  );
                }),
          icon: const Icon(Icons.download),
          label: const Text('Xuất danh sách chuyến'),
        ),
        if (error != null) Text(error!),
        if (busy) const LinearProgressIndicator(),
      ],
    ),
  );
}

class IntegrationsScreen extends StatefulWidget {
  const IntegrationsScreen({super.key});
  @override
  State<IntegrationsScreen> createState() => _IntegrationsScreenState();
}

class _IntegrationsScreenState extends State<IntegrationsScreen> {
  int revision = 0;
  bool busy = false;
  String? notice;
  Future<void> act(String path) async {
    setState(() => busy = true);
    try {
      final r = await management.json.object(path, method: 'POST', body: {});
      if (mounted) {
        setState(() {
          notice =
              '${r['message'] ?? 'Đã kiểm tra kết nối. Tải lại để xem trạng thái.'}';
          revision++;
        });
      }
    } catch (e) {
      if (mounted) setState(() => notice = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('VNPAY và email'),
      actions: [
        IconButton(
          onPressed: busy ? null : () => setState(() => revision++),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          spacing: 8,
          children: [
            OutlinedButton(
              onPressed: busy ? null : () => act('/admin/integrations/check'),
              child: const Text('Kiểm tra kết nối'),
            ),
            OutlinedButton(
              onPressed: busy
                  ? null
                  : () => act('/admin/integrations/test-email'),
              child: const Text('Gửi email thử đến tài khoản tôi'),
            ),
          ],
        ),
        if (notice != null) Text(notice!),
        Remote(
          key: ValueKey(revision),
          load: () => management.json.object('/admin/integrations'),
          builder: (d) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final key in ['database', 'vnpay', 'smtp'])
                if (d[key] is Map)
                  panel(
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        heading(
                          key == 'database'
                              ? 'Cơ sở dữ liệu'
                              : key == 'vnpay'
                              ? 'VNPAY'
                              : 'Email SMTP',
                        ),
                        Text(
                          '${d[key]['message'] ?? (d[key]['connected'] == true ? 'Đã kết nối' : 'Chưa kết nối')}',
                        ),
                        if (d[key]['environment'] != null)
                          Text('Môi trường: ${d[key]['environment']}'),
                        if (d[key]['configured'] != null)
                          Text(
                            'Cấu hình: ${d[key]['configured'] == true ? 'Sẵn sàng' : 'Chưa đủ'}',
                          ),
                      ],
                    ),
                  ),
              heading('Email vé'),
              for (final j in d['emailJobs'] as List? ?? [])
                panel(
                  ListTile(
                    title: Text('${j['booking']?['bookingCode']}'),
                    subtitle: Text('${j['status']} • ${j['attempts']} lần thử'),
                    trailing: TextButton(
                      onPressed: busy
                          ? null
                          : () => act(
                              '/admin/integrations/bookings/${j['bookingId']}/resend-email',
                            ),
                      child: const Text('Gửi lại'),
                    ),
                  ),
                ),
              heading('Giao dịch gần đây'),
              for (final p in d['payments'] as List? ?? [])
                panel(
                  ListTile(
                    title: Text('${p['booking']?['bookingCode']}'),
                    subtitle: Text('${p['provider']} • ${p['status']}'),
                  ),
                ),
            ],
          ),
        ),
      ],
    ),
  );
}

class UsersScreen extends StatelessWidget {
  const UsersScreen({super.key});
  @override
  Widget build(BuildContext context) => ResourceScreen(
    spec: catalog('users'),
    rowActions: (c, u, reload) => [
      TextButton(
        onPressed: () async {
          final locked = u['isLocked'] == true;
          if (await opConfirm(
                c,
                locked ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?',
                'Thao tác ảnh hưởng các phiên đăng nhập của ${u['email']}.',
              ) !=
              true) {
            return;
          }
          try {
            await management.json.object(
              '/admin/users/${u['id']}/${locked ? 'unlock' : 'lock'}',
              method: 'POST',
              body: {},
            );
            await reload();
          } catch (e) {
            if (c.mounted) notify(c, e);
          }
        },
        child: Text(u['isLocked'] == true ? 'Mở khóa' : 'Khóa tài khoản'),
      ),
    ],
  );
}
