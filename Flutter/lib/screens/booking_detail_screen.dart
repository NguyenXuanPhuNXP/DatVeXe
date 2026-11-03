import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../config/app_theme.dart';
import '../services/customer_service.dart';
import '../services/api_service.dart';
import '../utils/booking_rules.dart';
import '../utils/formatters.dart';
import '../widgets/app_widgets.dart';

class BookingDetailScreen extends StatefulWidget {
  const BookingDetailScreen({super.key, required this.booking, this.phone});
  final Map<String, dynamic> booking;
  final String? phone;
  @override
  State<BookingDetailScreen> createState() => _BookingDetailScreenState();
}

class _BookingDetailScreenState extends State<BookingDetailScreen>
    with WidgetsBindingObserver {
  late Map<String, dynamic> b = widget.booking;
  Map<String, dynamic>? capabilities, assets, delivery;
  String? error, assetError;
  bool busy = false, refreshing = false, active = true;
  Timer? timer;
  int ticks = 0;
  String? get phone => widget.phone ?? b['passengerPhone'] as String?;
  String get id => '${b['id']}';
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(initialize());
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || !active) return;
      if (!hasIssuedTickets(b) &&
          b['status'] != 'cancelled' &&
          b['status'] != 'completed') {
        setState(() {});
        // At most one request per five seconds, below the ticketing rate limit.
        if (++ticks % 5 == 0) unawaited(refresh());
      }
    });
  }

  Future<void> initialize() async {
    try {
      final data = await customer.capabilities();
      if (mounted) setState(() => capabilities = data);
    } catch (_) {
      /* Booking and offline receipts remain viewable. */
    }
    await refresh();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    active = state == AppLifecycleState.resumed;
    if (active) unawaited(refresh());
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> refresh() async {
    if (refreshing || busy) return;
    refreshing = true;
    try {
      final data = await customer.booking(id, phone: phone);
      if (!mounted) return;
      final changed =
          data['qrVersion'] != b['qrVersion'] ||
          data['paymentStatus'] != b['paymentStatus'] ||
          data['status'] != b['status'];
      setState(() {
        b = data;
        error = null;
        if (changed || !hasIssuedTickets(b)) {
          assets = null;
          delivery = null;
        }
      });
      if (hasIssuedTickets(b) && assets == null) await loadTickets();
    } catch (e) {
      if (mounted) setState(() => error = '$e');
      if (e is ApiException && (e.status == 401 || e.status == 403)) {
        active = false;
      }
    } finally {
      refreshing = false;
    }
  }

  Future<void> loadTickets() async {
    try {
      final data = await customer.tickets(id, phone: phone);
      if (mounted && hasIssuedTickets(b)) {
        setState(() {
          assets = data;
          assetError = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => assetError = '$e');
    }
    await loadDelivery();
  }

  Future<void> loadDelivery() async {
    try {
      final data = await customer.delivery(id, phone: phone);
      if (mounted) setState(() => delivery = data);
    } catch (e) {
      if (mounted) setState(() => delivery = {'loadError': '$e'});
    }
  }

  Future<void> action(Future<void> Function() fn) async {
    if (busy || refreshing) return;
    setState(() => busy = true);
    try {
      await fn();
    } catch (e) {
      if (mounted) notify(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> pay() async {
    // Re-read server state immediately before requesting a payment link.
    final current = await customer.booking(id, phone: phone);
    if (!mounted) return;
    setState(() => b = current);
    if (!canPayBooking(b)) {
      notify(context, 'Đơn đã hết hạn hoặc không còn chờ thanh toán.');
      return;
    }
    final result = await customer.pay(id, phone: phone);
    final url = Uri.tryParse('${result['payUrl'] ?? ''}');
    if (url == null ||
        !url.hasAuthority ||
        !['https', 'http'].contains(url.scheme)) {
      throw StateError('Chưa mở được trang thanh toán. Vui lòng thử lại.');
    }
    try {
      await const MethodChannel('rightway/browser')
          .invokeMethod<bool>('open', {'url': url.toString()});
    } on PlatformException {
      await copyPayment(url.toString());
    } on MissingPluginException {
      await copyPayment(url.toString());
    }
  }

  Future<void> copyPayment(String url) async {
    await Clipboard.setData(ClipboardData(text: url));
    if (mounted) {
      notify(
        context,
        'Đã sao chép liên kết VNPAY. Mở trình duyệt để thanh toán, rồi quay lại cập nhật trạng thái.',
      );
    }
  }

  Future<void> cancel() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        scrollable: true,
        title: const Text('Hủy vé này?'),
        content: const Text(
          'Ghế sẽ được giải phóng. Khoản hoàn tiền cần nhà xe xử lý theo chính sách.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Giữ vé'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Hủy vé'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    await action(() async {
      final data = await customer.cancel(id, phone: phone);
      if (mounted) {
        setState(() {
          b = data;
          assets = null;
          delivery = null;
        });
      }
    });
  }

  String deliveryMessage() {
    if (delivery == null) return 'Chưa tải trạng thái email.';
    if (delivery!['loadError'] != null) {
      return 'Chưa kiểm tra được email. QR vẫn dùng được.';
    }
    if (delivery!['configured'] != true) {
      return 'Dịch vụ email chưa sẵn sàng. Bạn có thể xuất trình QR bên dưới.';
    }
    final job = delivery!['job'];
    if (job is Map && job['status'] == 'sent') {
      return 'Vé đã được gửi tới ${delivery!['email']}. Kiểm tra Hộp thư đến hoặc Spam.';
    }
    return 'Vé đang chờ gửi email hoặc hệ thống đang thử lại.';
  }

  @override
  Widget build(BuildContext context) {
    final paid = hasIssuedTickets(b);
    final deadline = bookingDeadline(b);
    final seconds = deadline == null
        ? 0
        : (deadline.difference(DateTime.now()).inMilliseconds / 1000)
              .ceil()
              .clamp(0, 86400);
    final tickets = assets?['tickets'] as List? ?? [];
    final attempts = b['paymentAttempts'] as List? ?? [];
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết đặt vé')),
      body: RefreshIndicator(
        onRefresh: refresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: [
            const Icon(Icons.confirmation_number, color: red, size: 64),
            heading('${b['bookingCode']}'),
            panel(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${b['trip']?['route']?['origin'] ?? ''} → ${b['trip']?['route']?['destination'] ?? ''}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Ngày đi: ${tripDateLabel(b['tripDate'])} • ${b['trip']?['departureTime'] ?? ''}',
                  ),
                  Text('Nhà xe: ${b['trip']?['company']?['name'] ?? ''}'),
                  Text('Ghế: ${b['seatCode'] ?? ''}'),
                  Text('Hành khách: ${b['passengerName'] ?? ''}'),
                  Text('Điện thoại: ${b['passengerPhone'] ?? ''}'),
                  const Divider(height: 28),
                  Text('Trạng thái: ${label(b['status'])}'),
                  Text('Thanh toán: ${label(b['paymentStatus'])}'),
                  heading(money(b['totalPrice'])),
                ],
              ),
            ),
            if (error != null) Text(error!, style: const TextStyle(color: red)),
            OutlinedButton.icon(
              onPressed: busy || refreshing ? null : refresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Cập nhật trạng thái'),
            ),
            if (!paid && b['status'] == 'pending') ...[
              heading(
                seconds > 0
                    ? 'Giữ ghế còn ${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}'
                    : 'Đã hết thời gian giữ ghế',
              ),
              const Text(
                'Vui lòng thanh toán trước khi hết hạn giữ ghế. Nếu trả tiền mặt hoặc chuyển khoản, cần nhà xe xác nhận trước hạn.',
              ),
              const SizedBox(height: 12),
              if (capabilities?['vnpay'] == true)
                FilledButton(
                  onPressed: busy || refreshing || !canPayBooking(b)
                      ? null
                      : () => action(pay),
                  child: const Text('Thanh toán VNPAY'),
                )
              else
                Text(
                  capabilities == null
                      ? 'Chưa kiểm tra được cổng thanh toán. Thử tải lại trang vé.'
                      : 'Thanh toán trực tuyến chưa khả dụng. Vui lòng liên hệ nhà xe.',
                ),
            ],
            if (attempts.any((a) => a['status'] == 'refund_required'))
              const Text(
                'Có khoản thanh toán cần đối soát/hoàn tiền. Liên hệ nhà xe và cung cấp mã đặt vé.',
                style: TextStyle(color: red),
              ),
            if (paid) ...[
              heading('Vé điện tử'),
              const Text(
                'Mỗi ghế có một mã QR riêng. Sau khi đổi vé, hãy sử dụng mã QR mới.',
              ),
              if (assetError != null)
                Text(assetError!, style: const TextStyle(color: red)),
              if (assets == null)
                OutlinedButton(
                  onPressed: busy ? null : () => action(loadTickets),
                  child: const Text('Tải QR vé'),
                ),
              ...tickets.map<Widget>(
                (t) => panel(
                  Column(
                    children: [
                      Text('Ghế ${t['seatCode']} • ${t['ticketCode']}'),
                      const SizedBox(height: 12),
                      TicketQr(dataUrl: '${t['qrImage'] ?? ''}'),
                      if (t['checkedInAt'] != null) const Text('Đã lên xe'),
                    ],
                  ),
                ),
              ),
              Text(deliveryMessage()),
              Wrap(
                spacing: 8,
                children: [
                  TextButton(
                    onPressed: busy ? null : () => action(loadDelivery),
                    child: const Text('Kiểm tra email'),
                  ),
                  TextButton(
                    onPressed: busy || (b['passengerEmail'] ?? '').isEmpty
                        ? null
                        : () => action(() async {
                            await customer.resend(id, phone: phone);
                            if (context.mounted) {
                              notify(
                                context,
                                'Đã yêu cầu gửi vé đến email trên đơn.',
                              );
                            }
                            await loadDelivery();
                          }),
                    child: const Text('Gửi lại vé qua email'),
                  ),
                ],
              ),
            ],
            if (b['status'] == 'pending' || b['status'] == 'confirmed')
              TextButton(
                onPressed: busy || refreshing ? null : cancel,
                child: const Text('Hủy đặt vé'),
              ),
          ],
        ),
      ),
    );
  }
}

class TicketQr extends StatelessWidget {
  const TicketQr({super.key, required this.dataUrl});
  final String dataUrl;
  @override
  Widget build(BuildContext context) {
    try {
      if (!dataUrl.startsWith('data:image/png;base64,')) {
        return const Text('QR không đúng định dạng.');
      }
      final bytes = base64Decode(
        dataUrl.substring('data:image/png;base64,'.length),
      );
      return Image.memory(
        bytes,
        width: 280,
        height: 280,
        fit: BoxFit.contain,
        semanticLabel: 'QR vé điện tử',
        errorBuilder: (_, error, trace) => const Text('Không đọc được ảnh QR.'),
      );
    } catch (_) {
      return const Text('Không đọc được ảnh QR.');
    }
  }
}
