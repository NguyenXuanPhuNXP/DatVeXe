import '../widgets/booking_steps.dart';
import '../utils/app_access.dart';
import '../services/customer_service.dart';

import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/remote.dart';
import 'login_screen.dart';
import 'passenger_info_screen.dart';

class SeatSelectionScreen extends StatefulWidget {
  const SeatSelectionScreen({
    super.key,
    required this.trip,
    required this.date,
    this.passengers = 1,
  });
  final Map<String, dynamic> trip;
  final String date;
  final int passengers;
  @override
  State<SeatSelectionScreen> createState() => _SeatSelectionScreenState();
}

class _SeatSelectionScreenState extends State<SeatSelectionScreen> {
  final selected = <String>{};
  int revision = 0;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Chọn chỗ ngồi')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        heading(
          '${widget.trip['route']?['origin']} → ${widget.trip['route']?['destination']}',
        ),
        Text('${widget.date} • ${widget.trip['departureTime']}'),
        const SizedBox(height: 18),
        const BookingSteps(current: 1),
        const SizedBox(height: 16),
        const Text('Trắng: còn trống • Đỏ: đang chọn • Xám: đã giữ/đặt'),
        Remote(
          key: ValueKey(revision),
          load: () => customer.seats('${widget.trip['id']}', widget.date),
          builder: (data) => panel(
            Column(
              children: [
                const Icon(Icons.directions_bus, size: 40, color: navy),
                const SizedBox(height: 24),
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 3,
                  childAspectRatio: 1.8,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 22,
                  children: (data as List).map<Widget>((s) {
                    final code = '${s['seatCode']}';
                    final available = s['status'] == 'available';
                    return OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        backgroundColor: !available
                            ? Colors.grey.shade200
                            : selected.contains(code)
                            ? red
                            : Colors.white,
                        foregroundColor: selected.contains(code)
                            ? Colors.white
                            : navy,
                      ),
                      onPressed: available
                          ? () => setState(() {
                              if (!selected.contains(code) &&
                                  selected.length >= 40) {
                                return;
                              }
                              selected.contains(code)
                                  ? selected.remove(code)
                                  : selected.add(code);
                            })
                          : null,
                      child: Text(code),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text('Ghế: ${selected.isEmpty ? 'Chưa chọn' : selected.join(', ')}'),
        heading(money((widget.trip['price'] as num) * selected.length)),
        FilledButton(
          onPressed: selected.isEmpty
              ? null
              : () async {
                  if (api.user == null) {
                    await open(context, const LoginScreen());
                    if (!mounted || !AppAccess(api.user).customer) return;
                  }
                  if (!context.mounted) return;
                  final result = await open(
                    context,
                    PassengerInfoScreen(
                      trip: widget.trip,
                      date: widget.date,
                      seats: selected.toList(),
                    ),
                  );
                  if (context.mounted) {
                    if (result == 'seatConflict') {
                      notify(
                        context,
                        'Ghế đã thay đổi. Vui lòng chọn lại ghế trống.',
                      );
                    }
                    setState(() {
                      selected.clear();
                      revision++;
                    });
                  }
                },
          child: const Text('Tiếp tục'),
        ),
      ],
    ),
  );
}
