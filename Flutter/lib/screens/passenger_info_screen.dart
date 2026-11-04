import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/booking_steps.dart';
import 'payment_screen.dart';

class PassengerInfoScreen extends StatefulWidget {
  const PassengerInfoScreen({
    super.key,
    required this.trip,
    required this.date,
    required this.seats,
  });
  final Map<String, dynamic> trip;
  final String date;
  final List<String> seats;
  @override
  State<PassengerInfoScreen> createState() => _PassengerInfoScreenState();
}

class _PassengerInfoScreenState extends State<PassengerInfoScreen> {
  final form = GlobalKey<FormState>();
  final name = TextEditingController(text: api.user?['fullName'] ?? ''),
      phone = TextEditingController(),
      email = TextEditingController(text: api.user?['email'] ?? '');
  bool terms = true;
  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    email.dispose();
    super.dispose();
  }

  Future<void> next() async {
    if (!form.currentState!.validate()) return;
    if (!terms) {
      notify(context, 'Bạn cần đồng ý với điều khoản đặt vé.');
      return;
    }
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PaymentScreen(
          trip: widget.trip,
          date: widget.date,
          seats: widget.seats,
          contact: {
            'passengerName': name.text.trim(),
            'passengerPhone': phone.text.trim(),
            'passengerEmail': email.text.trim(),
          },
        ),
      ),
    );
    if (mounted && result == 'seatConflict') {
      Navigator.pop(context, 'seatConflict');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Thông tin hành khách')),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const BookingSteps(current: 2),
          heading('Thông tin liên hệ'),
          TextFormField(
            controller: name,
            maxLength: 120,
            decoration: const InputDecoration(labelText: 'Họ và tên'),
            validator: requiredValue,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Số điện thoại'),
            maxLength: 20,
            validator: (v) =>
                RegExp(r'^(?:0[35789]\d{8}|84[35789]\d{8})$')
                    .hasMatch(v?.trim() ?? '')
                ? null
                : 'Số điện thoại không đúng định dạng',
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: email,
            keyboardType: TextInputType.emailAddress,
            maxLength: 254,
            decoration: const InputDecoration(labelText: 'Email nhận vé'),
            validator: (v) =>
                RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v?.trim() ?? '')
                ? null
                : 'Nhập email hợp lệ',
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: terms,
            onChanged: (v) => setState(() => terms = v ?? false),
            title: const Text(
              'Tôi đồng ý với điều khoản đặt vé và chính sách nhà xe.',
            ),
          ),
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
                heading(
                  money((widget.trip['price'] as num) * widget.seats.length),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: next,
            child: const Text('Tiếp tục thanh toán'),
          ),
        ],
      ),
    ),
  );
}
