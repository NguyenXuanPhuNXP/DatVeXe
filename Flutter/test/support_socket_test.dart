import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/support_service.dart';

void main() {
  test('Support websocket authenticates, delivers events, reconnects and closes on logout', () async {
    dotenv.loadFromString(envString: File('.env').readAsStringSync());
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final client = ApiService(baseUrl: 'http://127.0.0.1:${server.port}/api')
      ..token = 'test-token';
    final service = SupportService(client);
    final sockets = <WebSocket>[];
    final first = Completer<WebSocket>(), second = Completer<WebSocket>();
    final reconnected = Completer<void>(), changed = Completer<void>();
    var loads = 0, ready = 0;
    final events = <String?>[], errors = <Object>[];
    StreamSubscription<String?>? subscription;
    addTearDown(() async {
      await subscription?.cancel();
      for (final socket in sockets) {
        await socket.close();
      }
      client.close();
      await server.close(force: true);
    });
    server.listen((request) async {
      if (!WebSocketTransformer.isUpgradeRequest(request)) {
        expect(request.uri.path, '/api/support/staff/conversations');
        expect(request.headers.value('Authorization'), 'Bearer test-token');
        loads++;
        request.response.write('[]');
        await request.response.close();
        return;
      }
      expect(request.uri.path, '/api/support/socket');
      expect(request.uri.queryParameters.containsKey('token'), false);
      final socket = await WebSocketTransformer.upgrade(request);
      sockets.add(socket);
      socket.listen((raw) {
        expect(jsonDecode(raw as String), {
          'token': 'test-token',
          'staff': true,
        });
        socket.add(jsonEncode({'type': 'support.ready'}));
        if (!first.isCompleted) {
          first.complete(socket);
        } else {
          second.complete(socket);
        }
      });
    });
    subscription = service.updates(true).listen((id) {
      events.add(id);
      if (id == null && ++ready == 2) reconnected.complete();
      if (id == 'c1' && !changed.isCompleted) changed.complete();
    }, onError: (Object error) => errors.add(error));
    final socket = await first.future.timeout(const Duration(seconds: 5));
    socket.add(jsonEncode({'type': 'support.updated', 'conversationId': 'c1'}));
    await changed.future.timeout(const Duration(seconds: 5));
    expect(events, [null, 'c1']);
    await socket.close();
    await reconnected.future.timeout(const Duration(seconds: 10));
    expect(loads, 2);
    expect(errors, isNotEmpty);
    final newSocket = await second.future;
    final closed = newSocket.done;
    client.clearSession();
    await closed.timeout(const Duration(seconds: 5));
    expect(events, [null, 'c1', null]);
  });
}
