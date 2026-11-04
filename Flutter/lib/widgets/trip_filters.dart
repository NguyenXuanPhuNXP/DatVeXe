import 'package:flutter/material.dart';

import '../services/customer_service.dart';
import 'app_widgets.dart';
import 'remote.dart';

class TripFilters extends StatefulWidget {
  const TripFilters({super.key, required this.initial});
  final Map<String, dynamic> initial;
  @override
  State<TripFilters> createState() => _TripFiltersState();
}

class _TripFiltersState extends State<TripFilters> {
  final form = GlobalKey<FormState>();
  late final min = TextEditingController(
    text: '${widget.initial['minPrice'] ?? ''}',
  );
  late final max = TextEditingController(
    text: '${widget.initial['maxPrice'] ?? ''}',
  );
  late final companies = Set<String>.from(widget.initial['companies'] ?? []);
  late final buses = Set<String>.from(widget.initial['busTypes'] ?? []);
  late final periods = Set<String>.from(
    widget.initial['departurePeriods'] ?? [],
  );
  late String rating = '${widget.initial['rating'] ?? ''}';
  @override
  void dispose() {
    min.dispose();
    max.dispose();
    super.dispose();
  }

  String? price(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final n = int.tryParse(value.trim());
    return n == null || n < 0 || n > 2147483647
        ? 'Nhập số tiền nguyên không âm hợp lệ'
        : null;
  }

  Widget chips(List<dynamic> values, Set<String> selected) => Wrap(
    spacing: 8,
    children: values.map<Widget>((v) {
      final text = '$v';
      return FilterChip(
        label: Text(text),
        selected: selected.contains(text),
        onSelected: (on) => setState(() {
          on ? selected.add(text) : selected.remove(text);
        }),
      );
    }).toList(),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Bộ lọc chuyến xe')),
    body: Form(
      key: form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          heading('Khoảng giá'),
          TextFormField(
            controller: min,
            decoration: const InputDecoration(labelText: 'Giá thấp nhất (đ)'),
            keyboardType: TextInputType.number,
            validator: price,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: max,
            decoration: const InputDecoration(labelText: 'Giá cao nhất (đ)'),
            keyboardType: TextInputType.number,
            validator: (v) {
              final error = price(v);
              if (error != null) return error;
              final lo = int.tryParse(min.text);
              final hi = int.tryParse(v ?? '');
              return lo != null && hi != null && lo > hi
                  ? 'Giá cao nhất phải lớn hơn hoặc bằng giá thấp nhất'
                  : null;
            },
          ),
          heading('Giờ khởi hành'),
          Wrap(
            spacing: 8,
            children:
                const {
                      'early': '00:00–06:00',
                      'morning': '06:00–12:00',
                      'afternoon': '12:00–18:00',
                      'evening': '18:00–24:00',
                    }.entries
                    .map(
                      (e) => FilterChip(
                        label: Text(e.value),
                        selected: periods.contains(e.key),
                        onSelected: (v) => setState(() {
                          v ? periods.add(e.key) : periods.remove(e.key);
                        }),
                      ),
                    )
                    .toList(),
          ),
          heading('Đánh giá tối thiểu'),
          DropdownButtonFormField<String>(
            initialValue: rating,
            items: const [
              DropdownMenuItem(value: '', child: Text('Tất cả')),
              DropdownMenuItem(value: '3', child: Text('3 sao')),
              DropdownMenuItem(value: '4', child: Text('4 sao')),
              DropdownMenuItem(value: '4.5', child: Text('4,5 sao')),
            ],
            onChanged: (v) => setState(() => rating = v!),
          ),
          Remote(
            load: customer.filterOptions,
            builder: (data) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                heading('Nhà xe'),
                chips(
                  (data['companies'] as List).map((c) => c['name']).toList(),
                  companies,
                ),
                heading('Loại xe'),
                chips(data['busTypes'] as List, buses),
              ],
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () {
              if (!form.currentState!.validate()) return;
              Navigator.pop(context, <String, dynamic>{
                if (min.text.trim().isNotEmpty)
                  'minPrice': int.parse(min.text.trim()),
                if (max.text.trim().isNotEmpty)
                  'maxPrice': int.parse(max.text.trim()),
                if (companies.isNotEmpty) 'companies': companies.toList(),
                if (buses.isNotEmpty) 'busTypes': buses.toList(),
                if (periods.isNotEmpty) 'departurePeriods': periods.toList(),
                if (rating.isNotEmpty) 'rating': num.parse(rating),
              });
            },
            child: const Text('Áp dụng bộ lọc'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, <String, dynamic>{}),
            child: const Text('Xóa bộ lọc'),
          ),
        ],
      ),
    ),
  );
}
