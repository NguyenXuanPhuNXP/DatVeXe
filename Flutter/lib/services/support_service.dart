import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'api_service.dart';
import 'customer_service.dart';

class SupportService {
  SupportService(ApiService client) : transport = CustomerService(client);
  final CustomerService transport;
  Stream<String?> updates(bool staff) {
    late StreamController<String?> events;
    WebSocket? socket;
    Timer? reconnect;
    bool stopped = false;
    late Future<void> Function() connect;
    void retry() {
      if (stopped) return;
      reconnect?.cancel();
      events.addError(const ApiException('Đang kết nối lại cuộc trò chuyện…'));
      reconnect = Timer(const Duration(seconds: 3), connect);
    }

    connect = () async {
      try {
        // HTTP refreshes an expired access token before opening the socket.
        await conversations(staff);
        if (stopped) return;
        final uri = Uri.parse('${transport.client.baseUrl}/support/socket');
        final opening = WebSocket.connect(
          uri.replace(scheme: uri.scheme == 'https' ? 'wss' : 'ws').toString(),
        );
        final connection = await opening.timeout(
          const Duration(seconds: 15),
          onTimeout: () {
            opening.then(
              (lateSocket) => lateSocket.close(),
              onError: (Object _) {},
            );
            throw TimeoutException('Chat connection timed out');
          },
        );
        if (stopped) {
          await connection.close();
          return;
        }
        socket = connection;
        connection.pingInterval = const Duration(seconds: 20);
        connection.add(
          jsonEncode({'token': transport.client.token, 'staff': staff}),
        );
        connection.listen(
          (raw) {
            if (stopped) return;
            try {
              final event = jsonDecode(raw as String);
              if (event['type'] == 'support.ready') events.add(null);
              if (event['type'] == 'support.updated' &&
                  event['conversationId'] is String) {
                events.add(event['conversationId'] as String);
              }
            } catch (_) {
              /* Ignore messages outside the support protocol. */
            }
          },
          onError: (Object error) {
            connection.close();
            retry();
          },
          onDone: retry,
          cancelOnError: true,
        );
      } catch (_) {
        retry();
      }
    };
    void sessionChanged() {
      if (transport.client.token == null) {
        stopped = true;
        reconnect?.cancel();
        socket?.close();
      }
    }

    events = StreamController<String?>(
      onListen: () {
        transport.client.sessionChanges.addListener(sessionChanged);
        connect();
      },
      onCancel: () async {
        stopped = true;
        reconnect?.cancel();
        transport.client.sessionChanges.removeListener(sessionChanged);
        await socket?.close();
      },
    );
    return events.stream;
  }

  String path(bool staff) =>
      staff ? '/support/staff/conversations' : '/support/conversations';
  Future<Map<String, dynamic>> guides() => transport.object('/support/guides');
  Future<Map<String, dynamic>> ask(String message) => transport.object(
    '/support/chat',
    method: 'POST',
    body: {'message': message},
  );
  Future<List<dynamic>> companies() => transport.list('/support/companies');
  Future<List<dynamic>> conversations(bool staff) =>
      transport.list(path(staff));
  Future<Map<String, dynamic>> detail(String id, bool staff) =>
      transport.object('${path(staff)}/${Uri.encodeComponent(id)}');
  Future<Map<String, dynamic>> create(String companyId, String content) =>
      transport.object(
        path(false),
        method: 'POST',
        body: {'companyId': companyId, 'content': content},
      );
  Future<Map<String, dynamic>> reply(String id, bool staff, String content) =>
      transport.object(
        '${path(staff)}/${Uri.encodeComponent(id)}/messages',
        method: 'POST',
        body: {'content': content},
      );
  Future<Map<String, dynamic>> close(String id, bool staff) => transport.object(
    '${path(staff)}/${Uri.encodeComponent(id)}/close',
    method: 'PATCH',
    body: {},
  );
}

final support = SupportService(api);
