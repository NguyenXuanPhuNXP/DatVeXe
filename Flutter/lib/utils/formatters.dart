String dateKey(DateTime d) =>
    '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
String money(dynamic n) =>
    '${(num.tryParse('$n') ?? 0).round().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ';
String label(dynamic status) =>
    const {
      'pending': 'Chờ xác nhận',
      'confirmed': 'Đã xác nhận',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy',
      'paid': 'Đã thanh toán',
      'unpaid': 'Chưa thanh toán',
      'refunded': 'Đã ghi nhận hoàn tiền',
    }[status] ??
    '$status';

/// Same contract as frontend/src/utils/trip-date.js: tripDate is a calendar
/// date, stored by the backend as YYYY-MM-DDT00:00:00.000Z, not an instant.
String calendarDate(dynamic value) {
  final raw = '${value ?? ''}';
  if (raw.length < 10) return '';
  final day = raw.substring(0, 10);
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(day)) return '';
  final parsed = DateTime.tryParse('${day}T00:00:00Z');
  return parsed != null && dateKey(parsed) == day ? day : '';
}

String tripDateLabel(dynamic value) {
  final day = calendarDate(value);
  if (day.isEmpty) return '—';
  return '${day.substring(8, 10)}/${day.substring(5, 7)}/${day.substring(0, 4)}';
}

DateTime vietnamToday([DateTime? instant]) {
  final vn = (instant ?? DateTime.now()).toUtc().add(const Duration(hours: 7));
  return DateTime(vn.year, vn.month, vn.day);
}
