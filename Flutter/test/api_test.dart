import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/utils/formatters.dart';

void main() {
  setUp(() {
    dotenv.loadFromString(envString: File('.env').readAsStringSync());
  });
  late HttpServer server;
  late ApiService client;
  setUp(() async {
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    client = ApiService(baseUrl: 'http://127.0.0.1:${server.port}/api');
  });
  tearDown(() async => server.close(force: true));
  test('Search encodes Vietnamese city and date parameters', () async {
    server.listen((req) async {
      expect(req.uri.queryParameters['origin'], 'Hồ Chí Minh');
      expect(req.uri.queryParameters['date'], '2026-11-01');
      req.response.headers.contentType = ContentType.json;
      req.response.write('[]');
      await req.response.close();
    });
    expect(
      await client.request(
        '/trips/search',
        query: {'origin': 'Hồ Chí Minh', 'date': '2026-11-01'},
      ),
      isEmpty,
    );
  });
  test(
    '409 preserves server seat conflict and does not retry booking',
    () async {
      var requests = 0;
      server.listen((req) async {
        requests++;
        final body = jsonDecode(await utf8.decoder.bind(req).join());
        expect(body['seatCodes'], ['A1', 'B1']);
        req.response.statusCode = 409;
        req.response.write(
          jsonEncode({
            'error': {'message': 'Ghế đã được đặt'},
          }),
        );
        await req.response.close();
      });
      await expectLater(
        client.request(
          '/bookings',
          method: 'POST',
          body: {
            'seatCodes': ['A1', 'B1'],
          },
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.status, 'status', 409)
              .having((e) => e.message, 'message', 'Ghế đã được đặt'),
        ),
      );
      expect(requests, 1);
    },
  );
  test(
    '401 refreshes cookie session and retries with new access token',
    () async {
      var refreshes = 0;
      server.listen((req) async {
        req.response.headers.contentType = ContentType.json;
        if (req.uri.path == '/api/auth/login') {
          req.response.cookies.add(Cookie('refreshToken', 'session-1'));
          req.response.write(
            jsonEncode({
              'accessToken': 'expired',
              'user': {'id': 'u1'},
            }),
          );
        } else if (req.uri.path == '/api/auth/refresh') {
          refreshes++;
          expect(req.headers.value('cookie'), 'refreshToken=session-1');
          req.response.write(
            jsonEncode({
              'accessToken': 'new-token',
              'user': {'id': 'u1'},
            }),
          );
        } else if (req.headers.value('authorization') == 'Bearer new-token') {
          req.response.write('[]');
        } else {
          req.response.statusCode = 401;
          req.response.write('{}');
        }
        await req.response.close();
      });
      await client.authenticate({'email': 'a@b.com', 'password': 'password'});
      expect(await client.request('/bookings/my'), isEmpty);
      expect(refreshes, 1);
      expect(client.token, 'new-token');
    },
  );
  test('Date and price formatting preserve booking contract', () {
    expect(dateKey(DateTime(2026, 1, 2)), '2026-01-02');
    expect(money(250000), '250.000 đ');
  });
}
