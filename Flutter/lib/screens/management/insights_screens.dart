import 'package:flutter/material.dart';

import '../../services/management_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/remote.dart';
import '../operator/operator_widgets.dart';
import 'resource_screen.dart';

class MetricsScreen extends StatefulWidget {
  const MetricsScreen({
    super.key,
    required this.title,
    required this.path,
    this.filter = false,
  });
  final String title, path;
  final bool filter;
  @override
  State<MetricsScreen> createState() => _MetricsScreenState();
}

class _MetricsScreenState extends State<MetricsScreen> {
  final from = TextEditingController(), to = TextEditingController();
  String companyId = '',
      routeId = '',
      status = '',
      paymentStatus = '',
      reportType = 'bookings';
  final search = TextEditingController();
  int revision = 0;
  @override
  void dispose() {
    search.dispose();
    from.dispose();
    to.dispose();
    super.dispose();
  }

  Map<String, dynamic> get query => {
    'fromDate': from.text.trim(),
    'toDate': to.text.trim(),
    if (widget.path == '/admin/reports') ...{
      'companyId': companyId,
      'routeId': routeId,
      'status': status,
      'paymentStatus': paymentStatus,
      'search': search.text.trim(),
    },
  };
  Widget filters(Map<String, dynamic> data) => Column(
    children: [
      TextField(
        controller: search,
        decoration: const InputDecoration(labelText: 'Mã vé / tên / liên hệ'),
        onSubmitted: (_) => setState(() => revision++),
      ),
      DropdownButtonFormField<String>(
        initialValue: companyId,
        decoration: const InputDecoration(labelText: 'Nhà xe'),
        items: [
          const DropdownMenuItem(value: '', child: Text('Tất cả nhà xe')),
          for (final c in data['filterOptions']?['companies'] as List? ?? [])
            DropdownMenuItem(value: '${c['id']}', child: Text('${c['name']}')),
        ],
        onChanged: (v) => setState(() {
          companyId = v!;
          revision++;
        }),
      ),
      DropdownButtonFormField<String>(
        initialValue: routeId,
        isExpanded: true,
        decoration: const InputDecoration(labelText: 'Tuyến'),
        items: [
          const DropdownMenuItem(value: '', child: Text('Tất cả tuyến')),
          for (final r in data['filterOptions']?['routes'] as List? ?? [])
            DropdownMenuItem(
              value: '${r['id']}',
              child: Text('${r['name']}', overflow: TextOverflow.ellipsis),
            ),
        ],
        onChanged: (v) => setState(() {
          routeId = v!;
          revision++;
        }),
      ),
      DropdownButtonFormField<String>(
        initialValue: status,
        decoration: const InputDecoration(labelText: 'Trạng thái đơn'),
        items: [
          const DropdownMenuItem(value: '', child: Text('Tất cả')),
          ...[
            'pending',
            'confirmed',
            'cancelled',
            'completed',
          ].map((s) => DropdownMenuItem(value: s, child: Text(label(s)))),
        ],
        onChanged: (v) => setState(() {
          status = v!;
          revision++;
        }),
      ),
      DropdownButtonFormField<String>(
        initialValue: paymentStatus,
        decoration: const InputDecoration(labelText: 'Thanh toán'),
        items: [
          const DropdownMenuItem(value: '', child: Text('Tất cả')),
          ...[
            'paid',
            'unpaid',
            'refunded',
          ].map((s) => DropdownMenuItem(value: s, child: Text(label(s)))),
        ],
        onChanged: (v) => setState(() {
          paymentStatus = v!;
          revision++;
        }),
      ),
      DropdownButtonFormField<String>(
        initialValue: reportType,
        decoration: const InputDecoration(labelText: 'Loại báo cáo PDF'),
        items: const [
          DropdownMenuItem(value: 'bookings', child: Text('Đặt vé')),
          DropdownMenuItem(value: 'revenue', child: Text('Doanh thu')),
          DropdownMenuItem(value: 'trips', child: Text('Chuyến xe')),
          DropdownMenuItem(value: 'overview', child: Text('Tổng quan')),
        ],
        onChanged: (v) => setState(() => reportType = v!),
      ),
      const SizedBox(height: 16),
    ],
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.title),
      actions: [
        IconButton(
          onPressed: () => setState(() => revision++),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (widget.filter) ...[
          TextField(
            controller: from,
            decoration: const InputDecoration(labelText: 'Từ ngày YYYY-MM-DD'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: to,
            decoration: const InputDecoration(labelText: 'Đến ngày YYYY-MM-DD'),
          ),
          TextButton(
            onPressed: () => setState(() => revision++),
            child: const Text('Lọc'),
          ),
        ],
        Remote(
          key: ValueKey(revision),
          load: () => management.json.object(widget.path, query: query),
          builder: (raw) {
            final data = Map<String, dynamic>.from(raw);
            final summary = data['summary'] is Map
                ? data['summary'] as Map
                : data;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.path == '/admin/reports') filters(data),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final e in summary.entries.where(
                      (e) => e.value is num,
                    ))
                      SizedBox(
                        width: 160,
                        child: panel(
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(metricLabels[e.key] ?? e.key),
                              Text(
                                e.key.toLowerCase().contains('revenue') ||
                                        e.key == 'averageOrderValue' ||
                                        e.key == 'adjustmentTotal'
                                    ? money(e.value)
                                    : '${e.value}',
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
                if (data['dailyStats'] is List) ...[
                  heading('Thống kê theo ngày'),
                  for (final row in data['dailyStats'])
                    panel(
                      Row(
                        children: [
                          Expanded(
                            child: Text('${row['date'] ?? row['label'] ?? ''}'),
                          ),
                          Text(
                            '${row['bookings'] ?? row['count'] ?? 0} vé • ${money(row['revenue'])}',
                          ),
                        ],
                      ),
                    ),
                ],
                for (final key in [
                  'topRoutes',
                  'recentBookings',
                  'receipts',
                  'legacyBookings',
                  'adjustments',
                  'bookings',
                ])
                  if (data[key] is List && data[key].isNotEmpty) ...[
                    heading(metricLabels[key] ?? key),
                    for (final r in (data[key] as List).take(100))
                      panel(
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${r['bookingCode'] ?? r['routeName'] ?? r['booking']?['bookingCode'] ?? ''}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '${r['passengerName'] ?? r['method'] ?? ''} ${r['reference'] ?? ''}',
                            ),
                            Text(
                              money(
                                r['totalPrice'] ??
                                    r['amount'] ??
                                    r['revenue'] ??
                                    r['difference'],
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                if (widget.path == '/admin/reports')
                  Wrap(
                    spacing: 8,
                    children: [
                      for (final format in ['pdf', 'excel'])
                        OutlinedButton.icon(
                          onPressed: () async {
                            try {
                              final bytes = await management.download(
                                '/admin/reports/export-$format',
                                query: {
                                  ...query,
                                  if (format == 'pdf') 'type': reportType,
                                },
                              );
                              await DeviceFiles.save(
                                'bao-cao.${format == 'excel' ? 'xlsx' : format}',
                                bytes,
                                format == 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                              );
                            } catch (e) {
                              if (context.mounted) notify(context, e);
                            }
                          },
                          icon: const Icon(Icons.download),
                          label: Text('Xuất ${format.toUpperCase()}'),
                        ),
                    ],
                  ),
              ],
            );
          },
        ),
      ],
    ),
  );
}

const metricLabels = {
  'totalUsers': 'Người dùng',
  'totalBookings': 'Đơn đặt vé',
  'totalTrips': 'Chuyến xe',
  'activeTrips': 'Chuyến đang bán',
  'totalCompanies': 'Nhà xe',
  'revenue': 'Doanh thu',
  'totalRevenue': 'Tổng doanh thu',
  'legacyRevenue': 'Doanh thu dữ liệu cũ',
  'adjustmentTotal': 'Chênh lệch đổi vé',
  'paidCount': 'Đơn đã trả',
  'pendingCount': 'Chờ xác nhận',
  'cancelledCount': 'Đơn đã hủy',
  'completedCount': 'Đã hoàn thành',
  'averageOrderValue': 'Giá trị đơn TB',
  'topRoutes': 'Tuyến nổi bật',
  'recentBookings': 'Vé gần đây',
  'receipts': 'Biên nhận thu tiền',
  'legacyBookings': 'Đơn cũ chưa có biên nhận',
  'adjustments': 'Điều chỉnh đổi vé',
  'bookings': 'Danh sách vé',
};

class AnomaliesScreen extends StatefulWidget {
  const AnomaliesScreen({super.key});
  @override
  State<AnomaliesScreen> createState() => _AnomaliesScreenState();
}

class _AnomaliesScreenState extends State<AnomaliesScreen> {
  int revision = 0, page = 1;
  String severity = '', review = '';
  final search = TextEditingController();
  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Vé nghi vấn')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: search,
          decoration: const InputDecoration(labelText: 'Tìm mã vé'),
          onSubmitted: (_) => setState(() {
            page = 1;
            revision++;
          }),
        ),
        DropdownButtonFormField<String>(
          initialValue: severity,
          items: const [
            DropdownMenuItem(value: '', child: Text('Mọi mức rủi ro')),
            DropdownMenuItem(value: 'high', child: Text('Cao')),
            DropdownMenuItem(value: 'medium', child: Text('Trung bình')),
            DropdownMenuItem(value: 'low', child: Text('Thấp')),
          ],
          onChanged: (v) => setState(() {
            severity = v!;
            page = 1;
            revision++;
          }),
        ),
        Remote(
          key: ValueKey('$page|$revision'),
          load: () => management.json.object(
            '/admin/anomalies',
            query: {
              'page': page,
              'pageSize': 30,
              'search': search.text.trim(),
              'severity': severity,
              'reviewStatus': review,
            },
          ),
          builder: (d) => Column(
            children: [
              if (d['scanLimitReached'] == true)
                const Text(
                  'Kết quả giới hạn số đơn được quét. Lọc thêm để thu hẹp phạm vi.',
                ),
              for (final r in d['items'] as List)
                panel(
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      heading('${r['bookingCode']}'),
                      Text(
                        'Điểm: ${r['score'] ?? r['riskScore'] ?? ''} • ${r['riskLevel'] ?? r['severity'] ?? ''}',
                      ),
                      for (final reason in r['reasons'] as List? ?? [])
                        Text(
                          reason is Map
                              ? '${reason['message'] ?? reason['description'] ?? reason}'
                              : '$reason',
                        ),
                      TextButton(
                        onPressed: () async {
                          final result = await open<bool>(
                            context,
                            OperatorForm(
                              title: 'Rà soát ${r['bookingCode']}',
                              fields: const [
                                OpField(
                                  'status',
                                  'Kết quả',
                                  options: {
                                    'open': 'Chưa xử lý',
                                    'in_review': 'Đang kiểm tra',
                                    'reviewed': 'Đã xác nhận',
                                    'false_positive': 'Không bất thường',
                                  },
                                ),
                                OpField(
                                  'note',
                                  'Ghi chú',
                                  required: false,
                                  max: 500,
                                ),
                              ],
                              initial: {
                                'status': r['review']?['status'] ?? 'open',
                                'note': r['review']?['note'] ?? '',
                              },
                              save: (v) async {
                                await management.json.object(
                                  '/admin/anomalies/${r['bookingId']}/review',
                                  method: 'PATCH',
                                  body: v,
                                );
                              },
                            ),
                          );
                          if (result == true && mounted) {
                            setState(() => revision++);
                          }
                        },
                        child: const Text('Cập nhật rà soát'),
                      ),
                    ],
                  ),
                ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: page <= 1 ? null : () => setState(() => page--),
                    child: const Text('Trang trước'),
                  ),
                  Text(
                    'Trang $page • ${d['pagination']?['total'] ?? 0} kết quả',
                  ),
                  TextButton(
                    onPressed: page * 30 >= (d['pagination']?['total'] ?? 0)
                        ? null
                        : () => setState(() => page++),
                    child: const Text('Trang sau'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class CompanyAccessScreen extends StatefulWidget {
  const CompanyAccessScreen({super.key});
  @override
  State<CompanyAccessScreen> createState() => _CompanyAccessScreenState();
}

class _CompanyAccessScreenState extends State<CompanyAccessScreen> {
  int revision = 0;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Phân quyền nhà xe'),
      actions: [
        IconButton(
          onPressed: () async {
            final saved = await open<bool>(
              context,
              const DataEditor(
                spec: ResourceSpec('quyền nhà xe', '/admin/company-access', [
                  DataField('userId', 'Tài khoản', ref: '/admin/users'),
                  DataField('companyId', 'Nhà xe', ref: '/admin/companies'),
                  DataField(
                    'role',
                    'Vai trò',
                    options: {
                      'owner': 'Chủ nhà xe',
                      'manager': 'Quản lý',
                      'staff': 'Nhân viên',
                    },
                    value: 'staff',
                  ),
                ]),
              ),
            );
            if (saved == true && mounted) setState(() => revision++);
          },
          icon: const Icon(Icons.person_add),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Remote(
          key: ValueKey(revision),
          load: () => management.list('/admin/company-access'),
          builder: (d) => Column(
            children: [
              for (final r in d as List)
                panel(
                  ListTile(
                    title: Text('${r['user']?['email']}'),
                    subtitle: Text(
                      '${r['company']?['name']} • ${r['role']} • ${r['isActive'] == true ? 'Hoạt động' : 'Đã khóa'}',
                    ),
                    trailing: IconButton(
                      tooltip: 'Thu hồi quyền',
                      icon: const Icon(Icons.person_remove),
                      onPressed: () async {
                        if (await opConfirm(
                              context,
                              'Thu hồi quyền?',
                              'Tài khoản sẽ mất quyền làm việc tại nhà xe.',
                            ) !=
                            true) {
                          return;
                        }
                        try {
                          await management.delete(
                            '/admin/company-access',
                            '${r['id']}',
                          );
                          if (mounted) setState(() => revision++);
                        } catch (e) {
                          if (context.mounted) notify(context, e);
                        }
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
