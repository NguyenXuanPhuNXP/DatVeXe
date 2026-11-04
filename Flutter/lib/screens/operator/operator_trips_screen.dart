import 'package:flutter/material.dart';

import '../../services/operator_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/remote.dart';

class OperatorTripsScreen extends StatefulWidget {
  const OperatorTripsScreen({super.key, this.service});
  final OperatorService? service;
  @override
  State<OperatorTripsScreen> createState() => _OperatorTripsScreenState();
}

class _OperatorTripsScreenState extends State<OperatorTripsScreen> {
  DateTime date = vietnamToday();
  int revision = 0;
  OperatorService get service => widget.service ?? operatorApi;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Chuyến xe của nhà xe'),
      actions: [
        IconButton(
          tooltip: 'Cập nhật',
          onPressed: () => setState(() => revision++),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        panel(
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_month_outlined),
            title: const Text('Ngày khởi hành'),
            subtitle: Text(tripDateLabel(dateKey(date))),
            trailing: const Icon(Icons.expand_more),
            onTap: () async {
              final selected = await showDatePicker(
                context: context,
                initialDate: date,
                firstDate: DateTime(2020),
                lastDate: DateTime(2100),
              );
              if (selected != null && mounted) setState(() => date = selected);
            },
          ),
        ),
        Remote(
          key: ValueKey('${dateKey(date)}-$revision'),
          load: () => service.tripBoard(dateKey(date)),
          builder: (data) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if ((data as List).isEmpty)
                panel(const Text('Nhà xe chưa có chuyến vào ngày này.')),
              for (final trip in data)
                panel(
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${trip['route']['origin']} → ${trip['route']['destination']}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      Text('${trip['departureTime']} – ${trip['arrivalTime']}'),
                      Text(
                        '${trip['bus']['name']} • ${trip['bus']['totalSeats']} ghế',
                      ),
                      Text(
                        trip['isActive'] == true
                            ? 'Đang mở bán'
                            : 'Ngừng mở bán',
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: () => open(
                          context,
                          OperatorSeatMapScreen(
                            tripId: '${trip['id']}',
                            date: dateKey(date),
                            service: service,
                          ),
                        ),
                        icon: const Icon(Icons.event_seat_outlined),
                        label: const Text('Xem sơ đồ ghế'),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    ),
  );
}

class OperatorSeatMapScreen extends StatefulWidget {
  const OperatorSeatMapScreen({
    super.key,
    required this.tripId,
    required this.date,
    this.service,
  });
  final String tripId, date;
  final OperatorService? service;
  @override
  State<OperatorSeatMapScreen> createState() => _OperatorSeatMapScreenState();
}

class _OperatorSeatMapScreenState extends State<OperatorSeatMapScreen> {
  int revision = 0;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Sơ đồ ghế'),
      actions: [
        IconButton(
          tooltip: 'Cập nhật',
          onPressed: () => setState(() => revision++),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          tripDateLabel(widget.date),
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        const Text(
          'Chọn ghế để xem thông tin. Trống: viền xám • Đã giữ/đặt: nền xanh.',
        ),
        const SizedBox(height: 16),
        Remote(
          key: ValueKey(revision),
          load: () => (widget.service ?? operatorApi).tripSeats(
            widget.tripId,
            widget.date,
          ),
          builder: (data) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              heading(
                '${data['trip']['route']['origin']} → ${data['trip']['route']['destination']}',
              ),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  mainAxisExtent: 72,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: (data['seats'] as List).length,
                itemBuilder: (context, index) {
                  final seat = data['seats'][index];
                  final occupied = seat['status'] != 'available';
                  return OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      backgroundColor: occupied
                          ? const Color(0xFF1E3A5F)
                          : Colors.white,
                      foregroundColor: occupied
                          ? Colors.white
                          : const Color(0xFF1E3A5F),
                      padding: const EdgeInsets.all(8),
                    ),
                    onPressed: () => showDialog<void>(
                      context: context,
                      builder: (context) => AlertDialog(
                        scrollable: true,
                        title: Text('Ghế ${seat['seatCode']}'),
                        content: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(occupied ? 'Ghế đã giữ/đặt' : 'Ghế còn trống'),
                            if ((seat['bookings'] as List).length > 1)
                              const Padding(
                                padding: EdgeInsets.only(top: 12),
                                child: Text(
                                  'Ghế có nhiều đơn đặt chỗ. Vui lòng kiểm tra với quản lý.',
                                  style: TextStyle(color: Color(0xFFB45309)),
                                ),
                              ),
                            for (final booking in seat['bookings'] as List) ...[
                              const SizedBox(height: 16),
                              Text('Mã vé: ${booking['bookingCode']}'),
                              SelectableText(
                                'Khách: ${booking['passengerName']}',
                              ),
                              SelectableText(
                                'Điện thoại: ${booking['passengerPhone']}',
                              ),
                              Text('Trạng thái: ${label(booking['status'])}'),
                              Text(
                                'Thanh toán: ${label(booking['paymentStatus'])}',
                              ),
                            ],
                          ],
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Đóng'),
                          ),
                        ],
                      ),
                    ),
                    child: Text(
                      '${seat['seatCode']}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
