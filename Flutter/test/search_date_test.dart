import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/screens/search_screen.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/customer_service.dart';
import 'package:datvexe/utils/formatters.dart';

class ScheduledTrips extends CustomerService {
  ScheduledTrips() : super(api);
  final queries = <Map<String, dynamic>>[];
  @override
  Future<List<dynamic>> search(Map<String, dynamic> query) async {
    queries.add(Map.of(query));
    if (query['date'] == dateKey(vietnamToday())) return [];
    return [
      for (final hour in ['08:00', '14:00', '22:00'])
        {
          'id': hour,
          'departureTime': hour,
          'arrivalTime': '23:00',
          'duration': '5 giờ',
          'price': 200000,
          'seatsAvailable': 30,
          'company': {'name': 'Hạnh Cafe'},
          'bus': {'type': 'Giường nằm'},
        },
    ];
  }
}

void main() {
  setUp(
    () => dotenv.loadFromString(envString: File('.env').readAsStringSync()),
  );
  testWidgets(
    'Empty search explains today and lets passengers find tomorrow without leaving the route',
    (tester) async {
      final source = ScheduledTrips();
      await tester.pumpWidget(
        MaterialApp(
          home: SearchScreen(
            origin: 'Mũi Né',
            destination: 'Nha Trang',
            date: dateKey(vietnamToday()),
            dataSource: source,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('Hôm nay không còn chuyến'), findsOneWidget);
      expect(find.text('Đổi ngày đi'), findsOneWidget);
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Xem chuyến ngày mai'));
      await tester.pumpAndSettle();
      expect(
        source.queries.last['date'],
        dateKey(vietnamToday().add(const Duration(days: 1))),
      );
      expect(source.queries.last['origin'], 'Mũi Né');
      expect(source.queries.last['destination'], 'Nha Trang');
      expect(find.text('Hạnh Cafe'), findsNWidgets(3));
      expect(find.textContaining('Hôm nay không còn chuyến'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
