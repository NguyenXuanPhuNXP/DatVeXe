import 'package:flutter/material.dart';

import '../services/customer_service.dart';
import '../widgets/app_widgets.dart';
import 'booking_detail_screen.dart';

class BookingLookupScreen extends StatefulWidget {
  const BookingLookupScreen({super.key, this.embedded = false});
  final bool embedded;
  @override
  State<BookingLookupScreen> createState() => _BookingLookupScreenState();
}

class _BookingLookupScreenState extends State<BookingLookupScreen> {
  final form = GlobalKey<FormState>();
  final code = TextEditingController(), phone = TextEditingController();
  bool busy = false;
  @override
  void dispose() {
    code.dispose();
    phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Form(
    key: form,
    child: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        heading('Tra cứu vé'),
        const Text('Nhập mã đặt vé và số điện thoại đã dùng khi đặt.'),
        const SizedBox(height: 24),
        TextFormField(
          controller: code,
          decoration: const InputDecoration(labelText: 'Mã đặt vé'),
          validator: requiredValue,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: phone,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Số điện thoại'),
          validator: requiredValue,
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: busy
              ? null
              : () async {
                  if (!form.currentState!.validate()) return;
                  setState(() => busy = true);
                  try {
                    final data = await customer.lookup(code.text, phone.text);
                    if (context.mounted) {
                      await open(
                        context,
                        BookingDetailScreen(
                          booking: Map<String, dynamic>.from(data),
                          phone: phone.text.trim(),
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) notify(context, e);
                  } finally {
                    if (mounted) setState(() => busy = false);
                  }
                },
          child: Text(busy ? 'Đang tìm…' : 'Tra cứu vé'),
        ),
      ],
    ),
  );
}
