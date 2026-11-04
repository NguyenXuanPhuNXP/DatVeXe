import '../../services/management_service.dart';

import 'package:flutter/material.dart';

import '../../services/operator_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import 'operator_widgets.dart';
import 'operator_counter_screen.dart';

class OperatorBookingsScreen extends StatefulWidget {
  const OperatorBookingsScreen({
    super.key,
    this.customers = false,
    this.admin = false,
  });
  final bool customers, admin;
  @override
  State<OperatorBookingsScreen> createState() => _OperatorBookingsScreenState();
}

class _OperatorBookingsScreenState extends State<OperatorBookingsScreen> {
  final search = TextEditingController();
  String status = '', payment = '', date = '';
  int revision = 0;
  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  Future<void> editContact(Map<String, dynamic> b) async {
    await open(
      context,
      OperatorForm(
        title: 'Thông tin khách • ${b['bookingCode']}',
        fields: contactFields,
        initial: b,
        save: (v) async {
          await operatorApi.contact('${b['id']}', v);
        },
      ),
    );
    if (mounted) setState(() => revision++);
  }

  Future<void> receive(Map<String, dynamic> b) async {
    await open(
      context,
      OperatorForm(
        title: 'Ghi nhận ${money(b['totalPrice'])}',
        fields: paymentFields,
        initial: const {'method': 'cash'},
        money: true,
        save: (v) async {
          if (widget.admin) {
            await management.json.object(
              '/admin/bookings/${b['id']}/payment',
              method: 'POST',
              body: paymentBody(v),
            );
          } else {
            await operatorApi.payment('${b['id']}', paymentBody(v));
          }
        },
      ),
    );
    if (mounted) setState(() => revision++);
  }

  Future<void> change(Map<String, dynamic> b, String target) async {
    final yes = await opConfirm(
      context,
      '${label(target)} • ${b['bookingCode']}',
      'Cập nhật trạng thái vé? Nếu hủy vé đã thanh toán, nhà xe cần xử lý hoàn tiền bên ngoài hệ thống.',
    );
    if (yes != true) return;
    try {
      if (widget.admin) {
        await management.json.object(
          '/admin/bookings/${b['id']}/status',
          method: 'PATCH',
          body: {'status': target},
        );
      } else {
        await operatorApi.status('${b['id']}', target);
      }
      if (mounted) setState(() => revision++);
    } catch (e) {
      if (mounted) notify(context, e);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.customers ? 'Thông tin khách hàng' : 'Quản lý vé'),
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: search,
          decoration: InputDecoration(
            labelText: 'Mã vé, tên, điện thoại hoặc email',
            suffixIcon: IconButton(
              onPressed: () => setState(() => revision++),
              icon: const Icon(Icons.search),
            ),
          ),
          onSubmitted: (_) => setState(() => revision++),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: status,
          decoration: const InputDecoration(labelText: 'Trạng thái đơn'),
          items: [
            const DropdownMenuItem(value: '', child: Text('Tất cả')),
            ...[
              'pending',
              'confirmed',
              'completed',
              'cancelled',
            ].map((s) => DropdownMenuItem(value: s, child: Text(label(s)))),
          ],
          onChanged: (v) => setState(() {
            status = v!;
            revision++;
          }),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: payment,
          decoration: const InputDecoration(labelText: 'Thanh toán'),
          items: [
            const DropdownMenuItem(value: '', child: Text('Tất cả')),
            ...[
              'unpaid',
              'paid',
              'refunded',
            ].map((s) => DropdownMenuItem(value: s, child: Text(label(s)))),
          ],
          onChanged: (v) => setState(() {
            payment = v!;
            revision++;
          }),
        ),
        Row(
          children: [
            Expanded(
              child: Text(
                date.isEmpty ? 'Tất cả ngày khởi hành' : tripDateLabel(date),
              ),
            ),
            TextButton(
              onPressed: () async {
                final d = await showDatePicker(
                  context: context,
                  initialDate: vietnamToday(),
                  firstDate: DateTime(2020),
                  lastDate: DateTime(2100),
                );
                if (d != null) {
                  setState(() {
                    date = dateKey(d);
                    revision++;
                  });
                }
              },
              child: const Text('Chọn ngày'),
            ),
            if (date.isNotEmpty)
              IconButton(
                onPressed: () => setState(() {
                  date = '';
                  revision++;
                }),
                icon: const Icon(Icons.clear),
              ),
          ],
        ),
        _BookingRows(
          key: ValueKey(revision),
          load: () => widget.admin
              ? management.list(
                  '/admin/bookings',
                  query: {
                    'search': search.text.trim(),
                    'status': status,
                    'paymentStatus': payment,
                    'date': date,
                  },
                )
              : operatorApi.bookings(
                  customers: widget.customers,
                  query: {
                    'search': search.text.trim(),
                    'status': status,
                    'paymentStatus': payment,
                    'date': date,
                  },
                ),
          item: (b) => panel(
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                heading('${b['bookingCode']}'),
                Text(
                  '${b['trip']?['route']?['origin'] ?? ''} → ${b['trip']?['route']?['destination'] ?? ''}',
                ),
                Text('${tripDateLabel(b['tripDate'])} • Ghế ${b['seatCode']}'),
                Text('${b['passengerName']} • ${b['passengerPhone']}'),
                Text('${b['passengerEmail'] ?? ''}'),
                Text('${label(b['status'])} • ${label(b['paymentStatus'])}'),
                Text(money(b['totalPrice'])),
                if (b['receipt'] != null)
                  Text('Đã ghi nhận thu: ${money(b['receipt']['amount'])}'),
                Wrap(
                  spacing: 8,
                  children: [
                    if (!widget.admin &&
                        ['pending', 'confirmed'].contains(b['status']))
                      TextButton(
                        onPressed: () => editContact(b),
                        child: const Text('Sửa liên hệ'),
                      ),
                    if (!widget.customers) ...[
                      if (['pending', 'confirmed'].contains(b['status']) &&
                          b['paymentStatus'] == 'unpaid')
                        TextButton(
                          onPressed: () => receive(b),
                          child: const Text('Ghi nhận thu tiền'),
                        ),
                      if (b['status'] == 'pending')
                        TextButton(
                          onPressed: () => change(b, 'confirmed'),
                          child: const Text('Duyệt vé'),
                        ),
                      if (b['status'] == 'confirmed' &&
                          b['paymentStatus'] == 'paid')
                        TextButton(
                          onPressed: () => change(b, 'completed'),
                          child: const Text('Hoàn thành'),
                        ),
                      if (['pending', 'confirmed'].contains(b['status']))
                        TextButton(
                          onPressed: () => change(b, 'cancelled'),
                          child: const Text('Hủy vé'),
                        ),
                      if (!widget.admin &&
                          b['status'] == 'confirmed' &&
                          b['paymentStatus'] == 'paid')
                        TextButton(
                          onPressed: () async {
                            await open(
                              context,
                              OperatorCounterScreen(booking: b),
                            );
                            if (mounted) setState(() => revision++);
                          },
                          child: const Text('Đổi ghế/chuyến'),
                        ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

class _BookingRows extends StatefulWidget {
  const _BookingRows({super.key, required this.load, required this.item});
  final Future<List<dynamic>> Function() load;
  final Widget Function(Map<String, dynamic>) item;
  @override
  State<_BookingRows> createState() => _BookingRowsState();
}

class _BookingRowsState extends State<_BookingRows> {
  late Future<List<dynamic>> future = widget.load();
  @override
  Widget build(BuildContext context) => FutureBuilder<List<dynamic>>(
    future: future,
    builder: (c, s) {
      if (s.connectionState != ConnectionState.done) {
        return const Center(child: CircularProgressIndicator());
      }
      if (s.hasError) {
        return panel(
          Column(
            children: [
              Text('${s.error}'),
              TextButton(
                onPressed: () => setState(() => future = widget.load()),
                child: const Text('Thử lại'),
              ),
            ],
          ),
        );
      }
      if (s.data!.isEmpty) return panel(const Text('Không có vé phù hợp.'));
      return Column(
        children: s.data!
            .map((b) => widget.item(Map<String, dynamic>.from(b)))
            .toList(),
      );
    },
  );
}
