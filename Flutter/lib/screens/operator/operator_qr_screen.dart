import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../services/operator_service.dart';
import '../../utils/formatters.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/remote.dart';
import 'operator_widgets.dart';

class OperatorQrScreen extends StatefulWidget {
  const OperatorQrScreen({super.key, this.board = false});
  final bool board;
  @override
  State<OperatorQrScreen> createState() => _OperatorQrScreenState();
}

class _OperatorQrScreenState extends State<OperatorQrScreen> {
  final qr = TextEditingController();
  String tripId = '', date = dateKey(vietnamToday());
  bool busy = false;
  Map<String, dynamic>? result;
  String? error;
  @override
  void dispose() {
    qr.dispose();
    super.dispose();
  }

  Future<void> inspect() async {
    if (qr.text.trim().isEmpty) return;
    setState(() {
      busy = true;
      result = null;
      error = null;
    });
    try {
      final data = await operatorApi.inspect(qr.text.trim());
      if (mounted) setState(() => result = data);
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> scan() async {
    final data = await open<String>(context, const QrCameraScreen());
    if (data != null && mounted) {
      qr.text = data;
      await inspect();
    }
  }

  Future<void> board() async {
    if (await opConfirm(
          context,
          'Xác nhận lên xe?',
          'Ghi nhận ghế ${result?['ticket']?['seatCode']} đã lên đúng chuyến hôm nay?',
        ) !=
        true) {
      return;
    }
    setState(() => busy = true);
    try {
      await operatorApi.board(qr.text.trim(), tripId, date);
      if (mounted) {
        setState(() => result = null);
        notify(context, 'Đã xác nhận lên xe.');
      }
    } catch (e) {
      if (mounted) setState(() => error = '$e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final booking = result?['booking'];
    final ticket = result?['ticket'];
    final ready =
        result?['valid'] == true &&
        ticket?['checkedInAt'] == null &&
        booking?['tripId'] == tripId &&
        calendarDate(booking?['tripDate']) == date &&
        date == dateKey(vietnamToday());
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.board ? 'Xác nhận lên xe' : 'Quét QR xem vé'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (widget.board) ...[
            Remote(
              load: operatorApi.trips,
              builder: (data) => DropdownButtonFormField<String>(
                isExpanded: true,
                decoration: const InputDecoration(
                  labelText: 'Chuyến đang đón khách',
                ),
                items: (data as List)
                    .map<DropdownMenuItem<String>>(
                      (t) => DropdownMenuItem(
                        value: '${t['id']}',
                        child: Text(
                          '${t['route']?['origin']} → ${t['route']?['destination']} • ${t['departureTime']}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    )
                    .toList(),
                onChanged: busy ? null : (v) => setState(() => tripId = v!),
              ),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Ngày lên xe hôm nay'),
              subtitle: Text(tripDateLabel(date)),
            ),
          ],
          FilledButton.icon(
            onPressed: busy ? null : scan,
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('Mở camera quét QR'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: qr,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Hoặc dán dữ liệu QR vé',
            ),
            onChanged: (_) => setState(() => result = null),
          ),
          OutlinedButton(
            onPressed: busy ? null : inspect,
            child: Text(busy ? 'Đang kiểm tra…' : 'Kiểm tra vé'),
          ),
          if (error != null)
            Text(
              error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          if (result != null)
            panel(
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  heading('${booking?['bookingCode']}'),
                  Text(
                    '${booking?['passengerName']} • Ghế ${ticket?['seatCode']}',
                  ),
                  Text(
                    '${tripDateLabel(booking?['tripDate'])} • ${booking?['trip']?['departureTime'] ?? ''}',
                  ),
                  Text(
                    '${label(booking?['status'])} • ${label(booking?['paymentStatus'])}',
                  ),
                  Text(
                    result!['valid'] == true
                        ? 'QR còn hiệu lực'
                        : 'Vé không còn đủ điều kiện lên xe',
                  ),
                  if (ticket?['checkedInAt'] != null)
                    const Text('Ghế này đã xác nhận lên xe.'),
                ],
              ),
            ),
          if (widget.board) ...[
            const Text(
              'Chỉ xác nhận vé đúng chuyến đã chọn, đúng ngày hôm nay, đã thanh toán và chưa lên xe.',
            ),
            FilledButton(
              onPressed: busy || !ready ? null : board,
              child: const Text('Xác nhận hành khách đã lên xe'),
            ),
          ],
        ],
      ),
    );
  }
}

class QrCameraScreen extends StatefulWidget {
  const QrCameraScreen({super.key});
  @override
  State<QrCameraScreen> createState() => _QrCameraScreenState();
}

class _QrCameraScreenState extends State<QrCameraScreen> {
  final controller = MobileScannerController(formats: [BarcodeFormat.qrCode]);
  bool read = false;
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Quét QR vé')),
    body: MobileScanner(
      controller: controller,
      errorBuilder: (c, e) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Không mở được camera. Hãy cấp quyền camera hoặc quay lại để dán dữ liệu QR.',
            ),
            TextButton(
              onPressed: () => Navigator.pop(c),
              child: const Text('Quay lại'),
            ),
          ],
        ),
      ),
      onDetect: (capture) async {
        if (read) return;
        final values = capture.barcodes
            .map((b) => b.rawValue)
            .whereType<String>()
            .where((s) => s.isNotEmpty);
        if (values.isEmpty) return;
        read = true;
        await controller.stop();
        if (context.mounted) Navigator.pop(context, values.first);
      },
    ),
  );
}
