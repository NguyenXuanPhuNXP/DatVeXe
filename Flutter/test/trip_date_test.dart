import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/utils/formatters.dart';
import 'package:datvexe/utils/booking_rules.dart';

void main() {
  test(
    'Trip date matches the web calendarDate contract, without timezone shifts',
    () {
      for (final value in [
        '2026-10-28',
        '2026-10-28T00:00:00.000Z',
        '2026-10-28T23:00:00.000Z',
      ]) {
        expect(calendarDate(value), '2026-10-28');
        expect(tripDateLabel(value), '28/10/2026');
      }
      expect(calendarDate('2026-02-30'), '');
      expect(calendarDate('invalid'), '');
      expect(tripDateLabel(null), '—');
    },
  );
  test('Today uses the same Vietnam day boundary as the web', () {
    expect(
      dateKey(vietnamToday(DateTime.parse('2026-10-27T16:59:59Z'))),
      '2026-10-27',
    );
    expect(
      dateKey(vietnamToday(DateTime.parse('2026-10-27T17:00:00Z'))),
      '2026-10-28',
    );
    expect(
      dateKey(vietnamToday(DateTime.parse('2026-12-31T17:00:00Z'))),
      '2027-01-01',
    );
  });
  test(
    'Payment is blocked at the exact expiry boundary or for terminal orders',
    () {
      final booking = <String, dynamic>{
        'status': 'pending',
        'paymentStatus': 'unpaid',
        'createdAt': '2030-01-01T00:00:00Z',
        'expiresAt': '2030-01-01T00:05:00Z',
      };
      expect(
        canPayBooking(booking, now: DateTime.parse('2030-01-01T00:04:59Z')),
        isTrue,
      );
      expect(
        canPayBooking(booking, now: DateTime.parse('2030-01-01T00:05:00Z')),
        isFalse,
      );
      expect(
        canPayBooking({
          ...booking,
          'status': 'cancelled',
        }, now: DateTime.parse('2030-01-01T00:01:00Z')),
        isFalse,
      );
      expect(
        canPayBooking({
          ...booking,
          'paymentStatus': 'paid',
        }, now: DateTime.parse('2030-01-01T00:01:00Z')),
        isFalse,
      );
      expect(hasIssuedTickets({...booking, 'paymentStatus': 'paid'}), isTrue);
      expect(
        hasIssuedTickets({
          ...booking,
          'paymentStatus': 'paid',
          'status': 'cancelled',
        }),
        isFalse,
      );
    },
  );
}
