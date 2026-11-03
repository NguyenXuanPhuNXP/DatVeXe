import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../services/customer_service.dart';
import '../utils/formatters.dart';
import '../utils/app_access.dart';
import '../widgets/app_widgets.dart';
import '../widgets/booking_steps.dart';
import 'booking_detail_screen.dart';
import 'login_screen.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({
    super.key,
    required this.trip,
    required this.date,
    required this.seats,
    required this.contact,
  });
  final Map<String, dynamic> trip, contact;
  final String date;
  final List<String> seats;
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String method = 'vnpay';
  bool busy = false;
  String? error;
  Future<void> submit() async {
    if (busy) return;
    if (!AppAccess(api.user).customer) {
      await open(context, const LoginScreen());
      if (!AppAccess(api.user).customer) return;
    }
    setState(() => busy = true);
    try {
      if (method == 'vnpay' &&
          (await customer.capabilities())['vnpay'] != true) {
        throw const ApiException(
          'Thanh toán trực tuyến chưa khả dụng. Vui lòng chọn phương thức khác.',
        );
      }
      final b = await customer.createBooking({
        'tripId': widget.trip['id'],
        'tripDate': widget.date,
        'seatCodes': widget.seats,
        ...widget.contact,
        'paymentMethod': method,
      });
      if (!mounted) return;
      await Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => BookingDetailScreen(booking: b)),
        (route) => route.isFirst,
      );
    } catch (e) {
      if (!mounted) return;
      if (e is ApiException && e.status == 409) {
        notify(context, '$e. Vui lòng chọn lại ghế.');
        Navigator.pop(context, 'seatConflict');
      } else {
        setState(() => error = '$e');
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Thanh toán')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const BookingSteps(current: 3),
        heading('Thông tin đặt vé'),
        panel(
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${widget.trip['route']?['origin']} → ${widget.trip['route']?['destination']}',
              ),
              Text(
                '${tripDateLabel(widget.date)} • ${widget.trip['departureTime']}',
              ),
              Text('Ghế: ${widget.seats.join(', ')}'),
              Text(
                '${widget.contact['passengerName']} • ${widget.contact['passengerPhone']}',
              ),
              Text('${widget.contact['passengerEmail']}'),
              heading(
                money((widget.trip['price'] as num) * widget.seats.length),
              ),
            ],
          ),
        ),
        heading('Chọn phương thức thanh toán'),
        DropdownButtonFormField<String>(
          initialValue: method,
          decoration: const InputDecoration(labelText: 'Phương thức'),
          items: const [
            DropdownMenuItem(value: 'vnpay', child: Text('VNPAY')),
            DropdownMenuItem(value: 'cash', child: Text('Tiền mặt tại nhà xe')),
            DropdownMenuItem(
              value: 'bank_transfer',
              child: Text('Chuyển khoản xác nhận thủ công'),
            ),
          ],
          onChanged: busy ? null : (v) => setState(() => method = v!),
        ),
        const SizedBox(height: 16),
        const Text(
          'Sau khi tạo đơn, ghế được giữ trong thời hạn do hệ thống quy định. Chọn phương thức không tự xác nhận đã trả tiền. Thanh toán trong thời gian giữ ghế.',
        ),
        if (error != null)
          Text(
            error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: busy ? null : submit,
          child: Text(busy ? 'Đang đặt vé…' : 'Xác nhận đặt vé'),
        ),
      ],
    ),
  );
}
