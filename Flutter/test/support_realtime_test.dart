import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/screens/support_screen.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/support_service.dart';

class LiveSupport extends SupportService {
  LiveSupport() : super(api);
  final events = StreamController<String?>.broadcast();
  final messages = <Map<String, dynamic>>[
    {'id': 'm1', 'content': 'Xin hỗ trợ', 'senderRole': 'customer'},
  ];
  String status = 'open';
  int loads = 0;
  final customerNames = ['Nguyễn Văn An'];
  @override
  Stream<String?> updates(bool staff) => events.stream;
  @override
  Future<Map<String, dynamic>> detail(String id, bool staff) async {
    loads++;
    return {'id': id, 'status': status, 'messages': List.of(messages)};
  }

  @override
  Future<List<dynamic>> conversations(bool staff) async => [
    for (var index = 0; index < customerNames.length; index++)
      {
        'id': 'c${index + 1}',
        'customer': {'fullName': customerNames[index]},
        'company': {'name': 'Rightway'},
        'status': status,
        'messages': [messages.last],
      },
  ];
}

void main() {
  setUp(
    () => dotenv.loadFromString(envString: File('.env').readAsStringSync()),
  );
  testWidgets(
    'Conversation receives replies and closure without manual refresh, reconnect catches up',
    (tester) async {
      final service = LiveSupport();
      addTearDown(service.events.close);
      await tester.pumpWidget(
        MaterialApp(
          home: ConversationScreen(id: 'c1', service: service),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Xin hỗ trợ'), findsOneWidget);
      service.messages.add({
        'id': 'm2',
        'content': 'Nhân viên đã phản hồi',
        'senderRole': 'staff',
      });
      service.events.add('c1');
      await tester.pumpAndSettle();
      expect(find.text('Nhân viên đã phản hồi'), findsOneWidget);
      final loads = service.loads;
      service.events.add('another-conversation');
      await tester.pumpAndSettle();
      expect(service.loads, loads);
      service.messages.add({
        'id': 'm3',
        'content': 'Tin nhắn khi mất mạng',
        'senderRole': 'staff',
      });
      service.events.add(null);
      await tester.pumpAndSettle();
      expect(find.text('Tin nhắn khi mất mạng'), findsOneWidget);
      expect(find.text('Nhân viên đã phản hồi'), findsOneWidget);
      service.status = 'closed';
      service.events.add('c1');
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsNothing);
      expect(find.text('Hội thoại đã kết thúc.'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      expect(service.events.hasListener, false);
    },
  );
  testWidgets(
    'Staff sees each conversation customer rather than the repeated company or logged-in staff name',
    (tester) async {
      final service = LiveSupport();
      service.customerNames.addAll(['Trần Thị Bình', '   ']);
      addTearDown(service.events.close);
      api.user = {'fullName': 'Nhân viên đang đăng nhập'};
      addTearDown(() => api.user = null);
      await tester.pumpWidget(
        MaterialApp(
          home: SupportScreen(
            key: const ValueKey('staff'),
            staff: true,
            service: service,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Nguyễn Văn An'), findsOneWidget);
      expect(find.text('Trần Thị Bình'), findsOneWidget);
      expect(find.text('Khách hàng'), findsOneWidget);
      expect(find.text('Rightway'), findsNothing);
      expect(find.text('Nhân viên đang đăng nhập'), findsNothing);
      await tester.pumpWidget(
        MaterialApp(
          home: SupportScreen(
            key: const ValueKey('customer'),
            service: service,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Rightway'), findsNWidgets(3));
      expect(find.text('Nguyễn Văn An'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'Inbox updates its message preview when a socket notification arrives',
    (tester) async {
      final service = LiveSupport();
      addTearDown(service.events.close);
      await tester.pumpWidget(
        MaterialApp(home: SupportScreen(staff: true, service: service)),
      );
      await tester.pumpAndSettle();
      service.messages.add({
        'id': 'm2',
        'content': 'Có tin mới',
        'senderRole': 'customer',
      });
      service.events.add('c1');
      await tester.pumpAndSettle();
      expect(find.textContaining('Có tin mới'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      expect(service.events.hasListener, false);
    },
  );
}
