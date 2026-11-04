import 'dart:convert';
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/operator_service.dart';

void main() {
  late HttpServer server;
  late ApiService client;
  late OperatorService service;
  setUp(() async {
    dotenv.loadFromString(envString: File('.env').readAsStringSync());
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    client = ApiService(baseUrl: 'http://127.0.0.1:${server.port}/api');
    service = OperatorService(client);
  });
  tearDown(() async {
    client.close();
    await server.close(force: true);
  });
  test('Staff/manager/owner capabilities match backend and unknown roles fail closed', () {
    const staff = OperatorAccess('staff', true, [
          'operator.access',
          'operator.work',
          'operator.board',
        ]),
        manager = OperatorAccess('manager', true, [
          'operator.access',
          'operator.work',
          'operator.employees.manage',
        ]),
        owner = OperatorAccess('owner', true, [
          'operator.access',
          'operator.work',
          'operator.employees.manage',
          'operator.employees.managers',
        ]);
    expect(staff.allowed, isTrue);
    expect(staff.manageEmployees, isFalse);
    expect(staff.board, isTrue);
    expect(manager.manageEmployees, isTrue);
    expect(manager.board, isFalse);
    expect(owner.manageEmployees, isTrue);
    expect(const OperatorAccess('manager', false).allowed, isFalse);
    expect(const OperatorAccess('admin', true).allowed, isFalse);
    expect(OperatorAccess.from(null).allowed, isFalse);
  });
  test(
    'Company scoped reads do not send a client-selected companyId',
    () async {
      final paths = <String>[];
      server.listen((req) async {
        paths.add(req.uri.path);
        expect(req.uri.queryParameters.containsKey('companyId'), isFalse);
        req.response.write(req.uri.path.endsWith('/me') ? '{}' : '[]');
        await req.response.close();
      });
      await service.me();
      await service.bookings(query: {'search': 'RW001', 'date': '2026-10-28'});
      await service.bookings(customers: true);
      await service.employees();
      await service.trips();
      await service.emailJobs();
      await service.paymentIssues();
      expect(paths, [
        '/api/operator/me',
        '/api/operator/bookings',
        '/api/operator/customers',
        '/api/operator/employees',
        '/api/operator/counter/trips',
        '/api/operator/email-jobs',
        '/api/operator/payment-issues',
      ]);
    },
  );
  test(
    'Status, payment and contacts use web methods and strict JSON payloads',
    () async {
      final seen = <String, Map<String, dynamic>>{};
      server.listen((req) async {
        seen['${req.method} ${req.uri.path}'] = Map<String, dynamic>.from(
          jsonDecode(await utf8.decoder.bind(req).join()),
        );
        req.response.write('{}');
        await req.response.close();
      });
      await service.status('b1', 'confirmed');
      await service.payment('b1', {
        'method': 'bank_transfer',
        'reference': 'BANK-01',
      });
      await service.contact('b1', {
        'passengerName': 'Test',
        'passengerPhone': '0901234567',
        'passengerEmail': 'test@example.com',
      });
      expect(seen['PATCH /api/operator/bookings/b1/status'], {
        'status': 'confirmed',
      });
      expect(seen['POST /api/operator/bookings/b1/payment'], {
        'method': 'bank_transfer',
        'reference': 'BANK-01',
      });
      expect(
        seen['PATCH /api/operator/customers/b1']!['passengerPhone'],
        '0901234567',
      );
    },
  );
  test('Employee updates address membership id, not the user id', () async {
    final seen = <String>[];
    server.listen((req) async {
      seen.add('${req.method} ${req.uri.path}');
      final body = jsonDecode(await utf8.decoder.bind(req).join());
      expect(body.containsKey('companyId'), isFalse);
      req.response.write('{}');
      await req.response.close();
    });
    await service.createEmployee({
      'fullName': 'Staff',
      'email': 'staff@example.com',
      'password': 'password123',
      'role': 'staff',
    });
    await service.updateEmployee('membership-1', {'isActive': false});
    expect(seen, [
      'POST /api/operator/employees',
      'PATCH /api/operator/employees/membership-1',
    ]);
  });
  test(
    'Counter and exchange retain date, quote version and settlement contract',
    () async {
      final seen = <String, dynamic>{};
      server.listen((req) async {
        seen[req.uri.path] = jsonDecode(await utf8.decoder.bind(req).join());
        req.response.write('{}');
        await req.response.close();
      });
      final destination = {
        'tripId': 't1',
        'tripDate': '2026-10-28',
        'seatCodes': ['A1'],
      };
      await service.sale({
        'booking': {
          ...destination,
          'passengerName': 'Test',
          'passengerPhone': '0901234567',
          'passengerEmail': '',
          'paymentMethod': 'cash',
        },
        'payment': {'method': 'cash'},
      });
      await service.quote('b1', destination);
      await service.exchange('b1', {
        ...destination,
        'expectedTotal': 250000,
        'expectedDifference': 50000,
        'expectedVersion': 2,
        'settleDifference': true,
        'method': 'cash',
      });
      expect(
        seen['/api/operator/counter/sales']['booking']['tripDate'],
        '2026-10-28',
      );
      expect(seen['/api/operator/bookings/b1/exchange/quote'], destination);
      expect(seen['/api/operator/bookings/b1/exchange']['expectedVersion'], 2);
    },
  );
  test(
    'QR boarding passes selected trip and calendar date; inspect is read-only',
    () async {
      final seen = <String, dynamic>{};
      server.listen((req) async {
        seen[req.uri.path] = jsonDecode(await utf8.decoder.bind(req).join());
        req.response.write('{}');
        await req.response.close();
      });
      await service.inspect('signed-qr');
      await service.board('signed-qr', 't1', '2026-10-28');
      expect(seen['/api/operator/qr/inspect'], {'qr': 'signed-qr'});
      expect(seen['/api/operator/qr/board'], {
        'qr': 'signed-qr',
        'tripId': 't1',
        'tripDate': '2026-10-28',
      });
    },
  );
}
