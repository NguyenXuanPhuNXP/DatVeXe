import 'package:flutter/material.dart';

import '../services/customer_service.dart';
import '../utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/remote.dart';
import '../utils/booking_navigation.dart';

class TripDetailScreen extends StatelessWidget {
  const TripDetailScreen({
    super.key,
    required this.id,
    required this.date,
    this.passengers = 1,
  });
  final String id, date;
  final int passengers;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Chi tiết chuyến xe')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Remote(
          load: () => customer.trip(id),
          builder: (t) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (t['bus']?['image'] != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(
                    '${t['bus']['image']}',
                    height: 190,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, e, st) => const SizedBox.shrink(),
                  ),
                ),
              heading(
                '${t['route']?['origin']} → ${t['route']?['destination']}',
              ),
              Text(
                '${tripDateLabel(date)} • ${t['departureTime']} → ${t['arrivalTime']}',
              ),
              const SizedBox(height: 16),
              Text('Nhà xe: ${t['company']?['name'] ?? ''}'),
              Text('Đánh giá: ${t['company']?['rating'] ?? 'Chưa có'}'),
              Text('Loại xe: ${t['bus']?['type'] ?? ''}'),
              Text('Thời lượng: ${t['duration'] ?? ''}'),
              Text('Số chỗ: ${t['bus']?['totalSeats'] ?? ''}'),
              if (t['amenities'] is List)
                Wrap(
                  spacing: 8,
                  children: (t['amenities'] as List)
                      .map<Widget>((a) => Chip(label: Text('$a')))
                      .toList(),
                ),
              heading(money(t['price'])),
              FilledButton(
                onPressed: t['isActive'] == false
                    ? null
                    : () => chooseCustomerSeats(
                        context,
                        Map<String, dynamic>.from(t),
                        date,
                        passengers,
                      ),
                child: const Text('Chọn chỗ'),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
