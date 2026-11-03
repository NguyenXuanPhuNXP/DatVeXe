import 'trip_detail_screen.dart';

import 'package:flutter/material.dart';

import '../config/app_theme.dart';
import '../config/config_api.dart';
import '../services/customer_service.dart';
import '../widgets/trip_filters.dart';
import '../utils/formatters.dart';
import '../widgets/app_widgets.dart';
import '../widgets/remote.dart';
import '../utils/booking_navigation.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({
    super.key,
    required this.origin,
    required this.destination,
    required this.date,
    this.passengers = 1,
    this.dataSource,
  });
  final String origin, destination, date;
  final int passengers;
  final CustomerService? dataSource;
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late String date = widget.date;
  CustomerService get source => widget.dataSource ?? customer;
  String sort = 'departure_asc';
  Map<String, dynamic> filters = {};
  Future<void> changeDate() async {
    final today = vietnamToday();
    final selected = DateTime.parse(date);
    final value = await showDatePicker(
      context: context,
      initialDate: selected.isBefore(today) ? today : selected,
      firstDate: today,
      lastDate: today.add(Duration(days: ApiConfig.bookingAdvanceDays)),
    );
    if (value != null && mounted) setState(() => date = dateKey(value));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Chọn chuyến xe')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        heading('${widget.origin} → ${widget.destination}'),
        Text('${tripDateLabel(date)} • ${widget.passengers} hành khách'),
        TextButton.icon(
          onPressed: changeDate,
          icon: const Icon(Icons.calendar_month_outlined),
          label: const Text('Đổi ngày đi'),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () async {
            final result = await open<Map<String, dynamic>>(
              context,
              TripFilters(initial: filters),
            );
            if (result != null && mounted) setState(() => filters = result);
          },
          icon: const Icon(Icons.tune),
          label: Text(
            filters.isEmpty ? 'Bộ lọc' : 'Bộ lọc (${filters.length})',
          ),
        ),
        DropdownButtonFormField<String>(
          initialValue: sort,
          decoration: const InputDecoration(labelText: 'Sắp xếp'),
          items: const [
            DropdownMenuItem(
              value: 'departure_asc',
              child: Text('Khởi hành sớm nhất'),
            ),
            DropdownMenuItem(value: 'price_asc', child: Text('Giá thấp nhất')),
            DropdownMenuItem(value: 'price_desc', child: Text('Giá cao nhất')),
            DropdownMenuItem(
              value: 'departure_desc',
              child: Text('Khởi hành muộn nhất'),
            ),
            DropdownMenuItem(
              value: 'rating_desc',
              child: Text('Đánh giá cao nhất'),
            ),
          ],
          onChanged: (v) => setState(() => sort = v!),
        ),
        const SizedBox(height: 16),
        Remote(
          key: ValueKey('$date|$sort|${filters.toString()}'),
          load: () => source.search({
            'origin': widget.origin,
            'destination': widget.destination,
            'date': date,
            'sort': sort,
            ...filters,
          }),
          builder: (data) => Column(
            children: [
              if ((data as List).isEmpty)
                panel(
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        filters.isNotEmpty
                            ? 'Không có chuyến phù hợp với bộ lọc đã chọn.'
                            : date == dateKey(vietnamToday())
                            ? 'Hôm nay không còn chuyến sắp khởi hành trên tuyến này. Các chuyến đã khởi hành không hiển thị khi tìm vé.'
                            : 'Không có chuyến mở bán cho ngày ${tripDateLabel(date)} trên tuyến này.',
                      ),
                      if (filters.isNotEmpty)
                        TextButton(
                          onPressed: () => setState(() => filters = {}),
                          child: const Text('Xóa bộ lọc'),
                        ),
                      if (date == dateKey(vietnamToday()))
                        TextButton(
                          onPressed: () => setState(
                            () => date = dateKey(
                              vietnamToday().add(const Duration(days: 1)),
                            ),
                          ),
                          child: const Text('Xem chuyến ngày mai'),
                        ),
                    ],
                  ),
                ),
              ...data.map<Widget>(
                (t) => panel(
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (t['bus']?['image'] != null)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            '${t['bus']['image']}',
                            height: 140,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (_, e, st) => const SizedBox.shrink(),
                          ),
                        ),
                      if (t['isDemo'] == true)
                        const Chip(label: Text('Dữ liệu minh họa')),
                      Text(
                        '${t['company']?['name'] ?? 'Nhà xe'}',
                        style: const TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.bold,
                          color: navy,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${t['departureTime']}  ─── ${t['duration']} ───  ${t['arrivalTime']}',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${t['bus']?['type'] ?? ''} • Còn ${t['seatsAvailable']} chỗ',
                      ),
                      TextButton(
                        onPressed: () => open(
                          context,
                          TripDetailScreen(
                            id: '${t['id']}',
                            date: date,
                            passengers: widget.passengers,
                          ),
                        ),
                        child: const Text('Chi tiết chuyến'),
                      ),
                      const Divider(height: 28),
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              money(t['price']),
                              style: const TextStyle(
                                fontSize: 22,
                                color: red,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          FilledButton(
                            onPressed:
                                (t['seatsAvailable'] as num? ?? 0) <
                                    widget.passengers
                                ? null
                                : () => chooseCustomerSeats(
                                    context,
                                    Map<String, dynamic>.from(t),
                                    date,
                                    widget.passengers,
                                  ),
                            child: const Text('Chọn chỗ'),
                          ),
                        ],
                      ),
                    ],
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
