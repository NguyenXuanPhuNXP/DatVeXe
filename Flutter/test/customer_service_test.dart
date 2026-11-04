import 'dart:convert';
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/customer_service.dart';

void main() {
  late HttpServer server;
  late ApiService api;
  late CustomerService customer;
  setUp(() async {
    dotenv.loadFromString(envString: File('.env').readAsStringSync());
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    api = ApiService(baseUrl: 'http://127.0.0.1:${server.port}/api');
    customer = CustomerService(api);
  });
  tearDown(() async {
    api.close();
    await server.close(force: true);
  });
  test(
    'Lists become comma separated filters; absent values are omitted',
    () async {
      server.listen((req) async {
        expect(req.uri.path, '/api/trips/search');
        expect(req.uri.queryParameters['companies'], 'Phương Trang,Nhà xe A');
        expect(req.uri.queryParameters['departurePeriods'], 'morning,evening');
        expect(req.uri.queryParameters.containsKey('minPrice'), isFalse);
        expect(req.uri.queryParameters.containsKey('busTypes'), isFalse);
        req.response.write('[]');
        await req.response.close();
      });
      await customer.search({
        'companies': ['Phương Trang', 'Nhà xe A'],
        'departurePeriods': ['morning', 'evening'],
        'busTypes': [],
        'minPrice': null,
      });
    },
  );
  test(
    'Booking JSON uses date-only and seatCodes without trusting a client total',
    () async {
      server.listen((req) async {
        final body = jsonDecode(await utf8.decoder.bind(req).join());
        expect(req.method, 'POST');
        expect(req.uri.path, '/api/bookings');
        expect(body['tripDate'], '2026-10-28');
        expect(body['seatCodes'], ['A1', 'C2']);
        expect(body.containsKey('userId'), isFalse);
        expect(body.containsKey('totalPrice'), isFalse);
        req.response.write('{"id":"b1","tripDate":"2026-10-28T00:00:00.000Z"}');
        await req.response.close();
      });
      final booking = await customer.createBooking({
        'tripId': 't1',
        'tripDate': '2026-10-28',
        'seatCodes': ['A1', 'C2'],
        'passengerName': 'Test',
        'passengerPhone': '0901234567',
        'passengerEmail': '',
        'paymentMethod': 'cash',
      });
      expect(booking['id'], 'b1');
    },
  );
  test('Ticketing routes carry only the permitted phone identity', () async {
    final paths = <String>[];
    server.listen((req) async {
      paths.add('${req.method} ${req.uri.path}');
      if (req.method == 'POST' || req.method == 'PATCH') {
        expect(jsonDecode(await utf8.decoder.bind(req).join()), {
          'phone': '0901234567',
        });
      } else if (req.uri.path != '/api/ticketing/capabilities') {
        expect(req.uri.queryParameters['phone'], '0901234567');
      }
      req.response.write('{}');
      await req.response.close();
    });
    await customer.capabilities();
    await customer.pay('b1', phone: '0901234567');
    await customer.tickets('b1', phone: '0901234567');
    await customer.delivery('b1', phone: '0901234567');
    await customer.resend('b1', phone: '0901234567');
    await customer.cancel('b1', phone: '0901234567');
    expect(paths, [
      'GET /api/ticketing/capabilities',
      'POST /api/ticketing/bookings/b1/vnpay',
      'GET /api/ticketing/bookings/b1/tickets',
      'GET /api/ticketing/bookings/b1/delivery',
      'POST /api/ticketing/bookings/b1/resend-email',
      'PATCH /api/bookings/b1/cancel',
    ]);
  });
  test(
    'Authorized requests omit a missing phone, never send the string null',
    () async {
      server.listen((req) async {
        expect(req.uri.queryParameters.containsKey('phone'), isFalse);
        req.response.write('{}');
        await req.response.close();
      });
      await customer.booking('b1');
    },
  );
  test(
    'Locked account clears the shared session and exposes backend code',
    () async {
      api.token = 'token';
      api.user = {'id': 'u1'};
      server.listen((req) async {
        req.response.statusCode = 403;
        req.response.write(
          '{"error":{"code":"ACCOUNT_LOCKED","message":"Account locked"}}',
        );
        await req.response.close();
      });
      await expectLater(
        customer.myBookings(),
        throwsA(
          isA<ApiException>().having((e) => e.code, 'code', 'ACCOUNT_LOCKED'),
        ),
      );
      expect(api.token, isNull);
      expect(api.user, isNull);
    },
  );
  test(
    'Concurrent 401 responses share a single refresh-cookie rotation',
    () async {
      var refreshes = 0;
      server.listen((req) async {
        if (req.uri.path.endsWith('/auth/login')) {
          req.response.cookies.add(Cookie('refreshToken', 'r1'));
          req.response.write('{"accessToken":"old","user":{"id":"u1"}}');
        } else if (req.uri.path.endsWith('/auth/refresh')) {
          refreshes++;
          await Future<void>.delayed(const Duration(milliseconds: 40));
          req.response.cookies.add(Cookie('refreshToken', 'r2'));
          req.response.write('{"accessToken":"new","user":{"id":"u1"}}');
        } else if (req.headers.value('authorization') == 'Bearer new') {
          req.response.write('[]');
        } else {
          req.response.statusCode = 401;
          req.response.write('{}');
        }
        await req.response.close();
      });
      await api.authenticate({'email': 'a@b.com', 'password': 'password'});
      await Future.wait([customer.myBookings(), customer.myBookings()]);
      expect(refreshes, 1);
    },
  );
  test(
    'Refresh rejection ends the session without retrying booking mutation',
    () async {
      var bookingRequests = 0;
      server.listen((req) async {
        if (req.uri.path.endsWith('/auth/login')) {
          req.response.cookies.add(Cookie('refreshToken', 'bad'));
          req.response.write('{"accessToken":"old","user":{"id":"u1"}}');
        } else {
          if (req.uri.path == '/api/bookings') bookingRequests++;
          req.response.statusCode = 401;
          req.response.write(
            '{"error":{"code":"SESSION_REVOKED","message":"revoked"}}',
          );
        }
        await req.response.close();
      });
      await api.authenticate({'email': 'a@b.com', 'password': 'password'});
      await expectLater(
        customer.createBooking({}),
        throwsA(isA<ApiException>()),
      );
      expect(bookingRequests, 1);
      expect(api.user, isNull);
    },
  );
  test('Zod field errors remain available to the UI', () async {
    server.listen((req) async {
      req.response.statusCode = 400;
      req.response.write(
        jsonEncode({
          'error': {
            'code': 'VALIDATION_ERROR',
            'message': 'Request validation failed',
            'details': {
              'fieldErrors': {
                'tripDate': ['Date must use YYYY-MM-DD format'],
              },
            },
          },
        }),
      );
      await req.response.close();
    });
    await expectLater(
      customer.search({'date': 'invalid'}),
      throwsA(
        isA<ApiException>()
            .having((e) => e.code, 'code', 'VALIDATION_ERROR')
            .having((e) => e.message, 'message', contains('tripDate')),
      ),
    );
  });
}
