import '../../config/config_api.dart';

import 'package:flutter/material.dart';

import '../../services/operator_service.dart';
import '../../services/customer_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/remote.dart';
import '../booking_detail_screen.dart' show TicketQr;

class OperatorCounterScreen extends StatefulWidget {
  const OperatorCounterScreen({super.key, this.booking});
  final Map<String, dynamic>? booking;
  @override
  State<OperatorCounterScreen> createState() => _OperatorCounterScreenState();
}

class _OperatorCounterScreenState extends State<OperatorCounterScreen> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController(),
      phone = TextEditingController(),
      email = TextEditingController(),
      reference = TextEditingController(),
      manual = TextEditingController();
  late String tripId = '${widget.booking?['tripId'] ?? ''}';
  late String date = widget.booking == null
      ? dateKey(vietnamToday())
      : calendarDate(widget.booking!['tripDate']);
  String method = 'cash';
  bool busy = false, ack = false;
  int revision = 0;
  final selected = <String>{};
  Map<String, dynamic>? quote, result;
  String? error;
  bool get exchange => widget.booking != null;
  void changed() {
    quote = null;
    ack = false;
    error = null;
  }

  Map<String, dynamic> get destination => {
    'tripId': tripId,
    'tripDate': date,
    'seatCodes': selected.toList(),
  };
  Map<String, dynamic> get payment => {
    'method': method,
    if (reference.text.trim().isNotEmpty) 'reference': reference.text.trim(),
  };
  @override
  void dispose() {
    for (final c in [name, phone, email, reference, manual]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> calculate() async {
    if (tripId.isEmpty || selected.isEmpty || !form.currentState!.validate()) {
      return;
    }
    setState(() => busy = true);
    try {
      final q = await operatorApi.quote(
        '${widget.booking!['id']}',
        destination,
      );
      if (mounted) {
        setState(() {
          quote = q;
          ack = false;
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> submit() async {
    if (!form.currentState!.validate() ||
        tripId.isEmpty ||
        selected.isEmpty ||
        !ack ||
        busy) {
      return;
    }
    if (method == 'bank_transfer' && reference.text.trim().isEmpty) {
      setState(() => error = 'Chuyển khoản cần mã tham chiếu.');
      return;
    }
    if (exchange && quote == null) return;
    setState(() => busy = true);
    try {
      final data = exchange
          ? await operatorApi.exchange('${widget.booking!['id']}', {
              ...destination,
              'expectedTotal': quote!['newTotal'],
              'expectedDifference': quote!['difference'],
              'expectedVersion': quote!['version'],
              'settleDifference': ack,
              ...payment,
            })
          : await operatorApi.sale({
              'booking': {
                ...destination,
                'passengerName': name.text.trim(),
                'passengerPhone': phone.text.trim(),
                'passengerEmail': email.text.trim(),
                'paymentMethod': method,
              },
              'payment': payment,
            });
      if (mounted) {
        setState(() {
          result = data;
          quote = null;
          ack = false;
          selected.clear();
          manual.clear();
          error = null;
          revision++;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
          quote = null;
          ack = false;
          revision++;
        });
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(exchange ? 'Đổi ghế / chuyến' : 'Bán vé tại quầy'),
    ),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (exchange)
            panel(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  heading('${widget.booking!['bookingCode']}'),
                  Text(
                    '${widget.booking!['passengerName']} • ${widget.booking!['seatCode']}',
                  ),
                  Text('Đã trả: ${money(widget.booking!['totalPrice'])}'),
                  const Text(
                    'Giữ nguyên số lượng vé. Backend kiểm tra chuyến, ghế và chênh lệch trước khi đổi.',
                  ),
                ],
              ),
            ),
          Remote(
            load: operatorApi.trips,
            builder: (data) {
              final trips = data as List;
              final matches = trips.where((t) => t['id'] == tripId);
              final chosen = matches.isEmpty ? null : matches.first;
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: chosen == null ? null : tripId,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Chuyến xe trong nhà xe',
                    ),
                    items: trips
                        .map<DropdownMenuItem<String>>(
                          (t) => DropdownMenuItem(
                            value: '${t['id']}',
                            child: Text(
                              '${t['route']?['origin']} → ${t['route']?['destination']} • ${t['departureTime']}',
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        )
                        .toList(),
                    onChanged: busy
                        ? null
                        : (v) => setState(() {
                            tripId = v!;
                            selected.clear();
                            manual.clear();
                            changed();
                          }),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Chọn chuyến xe' : null,
                  ),
                  if (chosen != null) ...[
                    Text('Giá mỗi ghế: ${money(chosen['price'])}'),
                    if (!exchange)
                      heading(
                        'Tổng cần thu: ${money((chosen['price'] as num) * selected.length)}',
                      ),
                  ],
                ],
              );
            },
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Ngày khởi hành'),
            subtitle: Text(tripDateLabel(date)),
            trailing: const Icon(Icons.calendar_month),
            onTap: busy
                ? null
                : () async {
                    final today = vietnamToday();
                    final parsed = DateTime.tryParse(date) ?? today;
                    final d = await showDatePicker(
                      context: context,
                      initialDate: parsed.isBefore(today) ? today : parsed,
                      firstDate: today,
                      lastDate: today.add(
                        Duration(days: ApiConfig.bookingAdvanceDays),
                      ),
                    );
                    if (d != null) {
                      setState(() {
                        date = dateKey(d);
                        selected.clear();
                        manual.clear();
                        changed();
                      });
                    }
                  },
          ),
          if (tripId.isNotEmpty)
            Remote(
              key: ValueKey('$tripId|$date|$revision'),
              load: () => customer.seats(tripId, date),
              builder: (data) => Wrap(
                spacing: 8,
                children: (data as List).map<Widget>((s) {
                  final code = '${s['seatCode']}';
                  final own =
                      exchange &&
                      tripId == widget.booking!['tripId'] &&
                      date == calendarDate(widget.booking!['tripDate']) &&
                      '${widget.booking!['seatCode']}'
                          .split(',')
                          .map((x) => x.trim())
                          .contains(code);
                  return FilterChip(
                    label: Text(code),
                    selected: selected.contains(code),
                    onSelected: busy || s['status'] != 'available' && !own
                        ? null
                        : (on) => setState(() {
                            on ? selected.add(code) : selected.remove(code);
                            manual.text = selected.join(', ');
                            changed();
                          }),
                  );
                }).toList(),
              ),
            ),
          if (exchange)
            TextFormField(
              controller: manual,
              decoration: const InputDecoration(
                labelText: 'Danh sách ghế mới (A1, B2...)',
              ),
              onChanged: busy
                  ? null
                  : (text) => setState(() {
                      selected
                        ..clear()
                        ..addAll(
                          text
                              .toUpperCase()
                              .split(',')
                              .map((s) => s.trim())
                              .where((s) => s.isNotEmpty),
                        );
                      changed();
                    }),
              validator: (_) =>
                  selected.length != (widget.booking!['tickets'] as List).length
                  ? 'Số ghế phải bằng số vé trong đơn'
                  : null,
            ),
          if (!exchange) ...[
            heading('Thông tin hành khách'),
            TextFormField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Họ tên'),
              maxLength: 120,
              validator: requiredValue,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Số điện thoại'),
              validator: (v) => RegExp(r'^0\d{9}$').hasMatch(v?.trim() ?? '')
                  ? null
                  : 'Nhập số điện thoại 10 số',
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Email nhận vé (tùy chọn)',
              ),
              maxLength: 254,
              validator: (v) =>
                  v == null ||
                      v.trim().isEmpty ||
                      RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())
                  ? null
                  : 'Email không hợp lệ',
            ),
          ],
          Text('Ghế: ${selected.join(', ')}'),
          if (exchange && result == null)
            OutlinedButton(
              onPressed: busy || selected.isEmpty ? null : calculate,
              child: const Text('Tính chênh lệch'),
            ),
          if (quote != null)
            panel(
              Column(
                children: [
                  Text('Giá mới: ${money(quote!['newTotal'])}'),
                  Text(
                    'Chênh lệch thu thêm (+) / hoàn lại (−): ${money(quote!['difference'])}',
                  ),
                ],
              ),
            ),
          if (result == null) ...[
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: method,
              decoration: const InputDecoration(
                labelText: 'Phương thức thu/hoàn tiền',
              ),
              items: const [
                DropdownMenuItem(value: 'cash', child: Text('Tiền mặt')),
                DropdownMenuItem(
                  value: 'bank_transfer',
                  child: Text('Chuyển khoản'),
                ),
              ],
              onChanged: busy
                  ? null
                  : (v) => setState(() {
                      method = v!;
                      ack = false;
                    }),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: reference,
              maxLength: 100,
              decoration: const InputDecoration(
                labelText: 'Mã giao dịch chuyển khoản',
              ),
            ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: ack,
              onChanged: busy ? null : (v) => setState(() => ack = v ?? false),
              title: Text(
                exchange
                    ? 'Đã xác nhận đổi vé và đã thu/hoàn đủ chênh lệch theo báo giá.'
                    : 'Tôi đã kiểm tra và thu đủ tiền cho các ghế đã chọn.',
              ),
            ),
            if (error != null)
              Text(
                error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            FilledButton(
              onPressed:
                  busy ||
                      !ack ||
                      selected.isEmpty ||
                      (exchange && quote == null)
                  ? null
                  : submit,
              child: Text(
                busy
                    ? 'Đang xử lý…'
                    : exchange
                    ? 'Xác nhận đổi vé'
                    : 'Thu tiền và xuất vé',
              ),
            ),
          ],
          if (result != null) ...[
            heading('Thành công • ${result!['bookingCode']}'),
            Text(
              'Ghế: ${result!['seatCode']} • ${money(result!['totalPrice'])}',
            ),
            Remote(
              key: ValueKey(result!['qrVersion']),
              load: () => customer.tickets(
                '${result!['id']}',
                phone: '${result!['passengerPhone']}',
              ),
              builder: (d) => Column(
                children: (d['tickets'] as List)
                    .map<Widget>(
                      (t) => panel(
                        Column(
                          children: [
                            Text('Ghế ${t['seatCode']}'),
                            TicketQr(dataUrl: '${t['qrImage']}'),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const Text(
              'Mã QR cũ mất hiệu lực sau khi đổi vé. Vé mới sẽ được gửi qua email nếu dịch vụ gửi vé khả dụng.',
            ),
            if (!exchange)
              TextButton(
                onPressed: () => setState(() => result = null),
                child: const Text('Bán vé tiếp theo'),
              ),
          ],
        ],
      ),
    ),
  );
}
