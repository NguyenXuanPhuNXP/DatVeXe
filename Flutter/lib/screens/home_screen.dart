import 'package:flutter/material.dart';

import '../config/config_api.dart';
import '../config/app_theme.dart';
import '../services/api_service.dart';
import '../services/customer_service.dart';
import '../utils/formatters.dart';
import '../utils/app_access.dart';
import '../widgets/app_widgets.dart';
import '../widgets/remote.dart';
import 'search_screen.dart';
import 'news_screen.dart';
import 'login_screen.dart';
import 'my_bookings_screen.dart';
import 'booking_lookup_screen.dart';
import 'support_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.dataSource});
  final CustomerService? dataSource;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  CustomerService get source => widget.dataSource ?? customer;
  String? origin, destination;
  DateTime date = vietnamToday();
  int passengers = 1;
  Future<void> supportPage() async {
    if (api.user == null) {
      await open(context, const LoginScreen());
    }
    if (!mounted) return;
    if (AppAccess(api.user).customer) {
      await open(context, const SupportScreen());
    }
  }

  Widget quick(String title, IconData icon, VoidCallback action) => Expanded(
    child: InkWell(
      onTap: action,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 4),
        child: Column(
          children: [
            Icon(icon, color: red, size: 27),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
            ),
          ],
        ),
      ),
    ),
  );
  void find() {
    if (origin == null || destination == null || origin == destination) {
      notify(context, 'Chọn hai điểm đi và đến khác nhau.');
      return;
    }
    open(
      context,
      SearchScreen(
        origin: origin!,
        destination: destination!,
        date: dateKey(date),
        passengers: passengers,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Positioned.fill(
              child: ApiConfig.heroImage.isEmpty
                  ? const ColoredBox(color: navy)
                  : Image.network(
                      ApiConfig.heroImage,
                      fit: BoxFit.cover,
                      errorBuilder: (_, e, t) => const ColoredBox(color: navy),
                    ),
            ),
            Positioned.fill(
              child: Container(
                decoration: const BoxDecoration(color: Color(0xD91E3A5F)),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'RIGHTWAY · ĐỒNG HÀNH CÙNG BẠN',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      letterSpacing: 1.4,
                    ),
                  ),
                  SizedBox(height: 18),
                  Text(
                    'Hành trình đẹp hơn\ncùng Rightway',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      height: 1.15,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Không chỉ là chuyến đi, đó là những trải nghiệm đáng nhớ.',
                    style: TextStyle(color: Colors.white70),
                  ),
                  SizedBox(height: 22),
                  Wrap(
                    spacing: 14,
                    runSpacing: 8,
                    children: [
                      _TrustBadge('An toàn'),
                      _TrustBadge('Đúng giờ'),
                      _TrustBadge('Thoải mái'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      heading('Tìm chuyến xe của bạn'),
      Remote(
        load: source.cities,
        builder: (d) {
          final cities = List<String>.from(d);
          return panel(
            Column(
              children: [
                DropdownButtonFormField<String>(
                  key: ValueKey('from$origin'),
                  initialValue: origin,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Từ',
                    prefixIcon: Icon(Icons.trip_origin),
                  ),
                  items: cities
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) => setState(() => origin = v),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: IconButton(
                    tooltip: 'Đổi chiều',
                    onPressed: () => setState(() {
                      final tmp = origin;
                      origin = destination;
                      destination = tmp;
                    }),
                    icon: const Icon(Icons.swap_vert, color: red),
                  ),
                ),
                DropdownButtonFormField<String>(
                  key: ValueKey('to$destination'),
                  initialValue: destination,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Đến',
                    prefixIcon: Icon(Icons.location_on_outlined),
                  ),
                  items: cities
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) => setState(() => destination = v),
                ),
                const SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.calendar_month, color: red),
                  title: const Text('Ngày đi'),
                  subtitle: Text(tripDateLabel(dateKey(date))),
                  trailing: const Icon(Icons.expand_more),
                  onTap: () async {
                    final today = vietnamToday();
                    final value = await showDatePicker(
                      context: context,
                      initialDate: date.isBefore(today) ? today : date,
                      firstDate: today,
                      lastDate: today.add(
                        Duration(days: ApiConfig.bookingAdvanceDays),
                      ),
                    );
                    if (value != null && mounted) setState(() => date = value);
                  },
                ),
                DropdownButtonFormField<int>(
                  initialValue: passengers,
                  decoration: const InputDecoration(
                    labelText: 'Số hành khách',
                    prefixIcon: Icon(Icons.person_outline),
                  ),
                  items: [
                    for (var i = 1; i <= 4; i++)
                      DropdownMenuItem(value: i, child: Text('$i người')),
                  ],
                  onChanged: (v) => setState(() => passengers = v!),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: find,
                    icon: const Icon(Icons.search),
                    label: const Text('Tìm chuyến xe'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
      panel(
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            quick(
              'Tra cứu vé',
              Icons.search,
              () => open(
                context,
                const Scaffold(body: SafeArea(child: BookingLookupScreen())),
              ),
            ),
            quick(
              'Đổi / Hủy vé',
              Icons.swap_horiz,
              () => open(
                context,
                const Scaffold(body: SafeArea(child: BookingLookupScreen())),
              ),
            ),
            quick(
              'Vé của tôi',
              Icons.confirmation_number_outlined,
              () => open(
                context,
                const Scaffold(body: SafeArea(child: MyBookingsScreen())),
              ),
            ),
            quick('Hỗ trợ', Icons.headset_mic_outlined, supportPage),
          ],
        ),
      ),
      heading('Ưu đãi nổi bật'),
      Remote(
        load: source.promotions,
        builder: (data) => Column(
          children: [
            if ((data as List).isEmpty)
              panel(const Text('Chưa có ưu đãi đang áp dụng.')),
            ...data.map<Widget>(
              (p) => panel(
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (p['image'] != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          '${p['image']}',
                          height: 140,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorBuilder: (_, e, t) => const Icon(
                            Icons.local_offer_outlined,
                            color: red,
                          ),
                        ),
                      ),
                    heading('${p['title']}'),
                    Text('${p['description'] ?? ''}'),
                    if (p['code'] != null)
                      Chip(
                        avatar: const Icon(Icons.discount_outlined, size: 16),
                        label: Text('${p['code']}'),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      heading('Tuyến xe phổ biến'),
      Remote(
        load: source.popularRoutes,
        builder: (data) => Column(
          children: [
            if ((data as List).isEmpty) const Text('Chưa có tuyến xe.'),
            ...data.map<Widget>(
              (r) => panel(
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(
                    backgroundColor: Color(0xFFFEF2F2),
                    child: Icon(Icons.directions_bus, color: red),
                  ),
                  title: Text(
                    '${r['origin']} → ${r['destination']}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    '${r['topCompany'] ?? ''} • Từ ${money(r['minPrice'])}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => open(
                    context,
                    SearchScreen(
                      origin: r['origin'],
                      destination: r['destination'],
                      date: dateKey(date),
                      passengers: passengers,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      heading('Tin tức mới nhất'),
      Remote(
        load: source.news,
        builder: (data) => Column(
          children: [
            ...(data as List)
                .take(6)
                .map<Widget>(
                  (n) => panel(
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('${n['title']}'),
                      subtitle: Text(
                        '${n['summary'] ?? ''}',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => open(context, NewsScreen(id: '${n['id']}')),
                    ),
                  ),
                ),
          ],
        ),
      ),
      const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Text(
          'Rightway · An toàn trên từng hành trình',
          textAlign: TextAlign.center,
          style: TextStyle(color: navy),
        ),
      ),
    ],
  );
}

class _TrustBadge extends StatelessWidget {
  const _TrustBadge(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      const Icon(Icons.check_circle_outline, color: Colors.white, size: 15),
      const SizedBox(width: 5),
      Text(text, style: const TextStyle(color: Colors.white)),
    ],
  );
}
