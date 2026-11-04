import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/management_service.dart';
import 'package:datvexe/services/support_service.dart';
import 'package:datvexe/utils/app_access.dart';
import 'package:datvexe/services/operator_service.dart';

void main() {
  late HttpServer server;
  late ApiService client;
  late ManagementService management;
  late SupportService support;
  setUp(() async {
    dotenv.loadFromString(envString: File('.env').readAsStringSync());
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    client = ApiService(baseUrl: 'http://127.0.0.1:${server.port}/api');
    management = ManagementService(client);
    support = SupportService(client);
  });
  tearDown(() async {
    client.close();
    await server.close(force: true);
  });
  test('Develops routing uses persisted permissions and separates internal accounts', () {
    expect(const AppAccess(null).blocked, isFalse);
    expect(
      AppAccess({
        'permissions': ['booking.create'],
        'companyMembership': null,
      }).customer,
      isTrue,
    );
    expect(
      AppAccess({
        'permissions': ['booking.create'],
        'companyMembership': {'isActive': false},
      }).blocked,
      isTrue,
    );
    expect(
      AppAccess({
        'permissions': ['admin.access'],
        'companyMembership': null,
      }).admin,
      isTrue,
    );
    expect(const OperatorAccess('owner', true).allowed, isFalse);
    expect(
      const OperatorAccess('staff', true, [
        'operator.access',
        'operator.employees.manage',
      ]).manageEmployees,
      isTrue,
    );
    expect(
      const OperatorAccess('manager', true, [
        'operator.access',
        'operator.board',
      ]).board,
      isTrue,
    );
    expect(
      const OperatorAccess('owner', false, [
        'operator.access',
        'operator.work',
      ]).allowed,
      isFalse,
    );
  });
  test('Authorization reads nested database RolePermission grants', () {
    final access = OperatorAccess.from({
      'role': 'custom',
      'isActive': true,
      'roleDefinition': {
        'permissions': [
          {
            'permission': {'key': 'operator.access'},
          },
          {
            'permission': {'key': 'operator.support'},
          },
        ],
      },
    });
    expect(access.allowed, isTrue);
    expect(access.has('operator.support'), isTrue);
    expect(access.work, isFalse);
  });
  test(
    'Admin user list unwraps users without changing operator array contract',
    () async {
      server.listen((r) async {
        r.response.write(
          r.uri.path.endsWith('/users')
              ? '{"users":[{"id":"u1"}]}'
              : '[{"id":"bus1"}]',
        );
        await r.response.close();
      });
      expect((await management.list('/admin/users')).first['id'], 'u1');
      expect((await management.list('/operator/buses')).first['id'], 'bus1');
    },
  );
  test(
    'Management create, update and delete preserve JSON types and namespace',
    () async {
      final calls = <String, dynamic>{};
      server.listen((r) async {
        calls['${r.method} ${r.uri.path}'] = r.method == 'DELETE'
            ? null
            : jsonDecode(await utf8.decoder.bind(r).join());
        r.response.write('{}');
        await r.response.close();
      });
      await management.save('/operator/buses', {
        'name': 'Xe 1',
        'type': 'Giường nằm',
        'totalSeats': 36,
      });
      await management.save(
        '/admin/users',
        {
          'roles': ['USER'],
          'fullName': 'Khách',
        },
        id: 'u1',
        method: 'PATCH',
      );
      await management.delete('/admin/news', 'n1');
      expect(calls['POST /api/operator/buses']['totalSeats'], isA<int>());
      expect(calls['PATCH /api/admin/users/u1']['roles'], ['USER']);
      expect(calls.containsKey('DELETE /api/admin/news/n1'), isTrue);
      expect(
        calls['POST /api/operator/buses'].containsKey('companyId'),
        isFalse,
      );
    },
  );
  test(
    'Multipart upload has CRLF boundaries, file field and raw XLSX bytes',
    () async {
      final payload = Uint8List.fromList([80, 75, 3, 4, 0, 255]);
      server.listen((r) async {
        expect(r.method, 'POST');
        expect(r.uri.queryParameters['sheetName'], 'Sheet1');
        final type = r.headers.contentType!;
        expect(type.mimeType, 'multipart/form-data');
        final bytes = await r.fold<List<int>>([], (all, b) => all..addAll(b));
        final wire = latin1.decode(bytes);
        final boundary = type.parameters['boundary']!;
        expect(wire.startsWith('--$boundary\r\n'), isTrue);
        expect(wire, contains('name="file"; filename="trips.xlsx"'));
        expect(wire, contains(latin1.decode(payload)));
        expect(wire.endsWith('\r\n--$boundary--\r\n'), isTrue);
        r.response.write('{"validRows":1}');
        await r.response.close();
      });
      expect(
        (await management.upload(
          '/admin/trips/import/preview',
          payload,
          'trips.xlsx',
          sheet: 'Sheet1',
        ))['validRows'],
        1,
      );
    },
  );
  test('Downloads retain binary PDF bytes instead of trying JSON', () async {
    final pdf = utf8.encode('%PDF-1.4\nfixture');
    server.listen((r) async {
      r.response.headers.contentType = ContentType('application', 'pdf');
      r.response.add(pdf);
      await r.response.close();
    });
    expect(await management.download('/admin/reports/export-pdf'), pdf);
  });
  test(
    'Customer and staff support endpoints use strict create/reply payloads',
    () async {
      final calls = <String, dynamic>{};
      server.listen((r) async {
        calls['${r.method} ${r.uri.path}'] = r.method == 'GET'
            ? null
            : jsonDecode(await utf8.decoder.bind(r).join());
        r.response.write(
          r.method == 'GET' && !r.uri.path.endsWith('/c1') ? '[]' : '{}',
        );
        await r.response.close();
      });
      await support.companies();
      await support.create('company1', 'Xin hỗ trợ');
      await support.conversations(true);
      await support.detail('c1', true);
      await support.reply('c1', true, 'Nhân viên trả lời');
      await support.close('c1', false);
      await support.ask('Cách đặt vé?');
      expect(calls['POST /api/support/conversations'], {
        'companyId': 'company1',
        'content': 'Xin hỗ trợ',
      });
      expect(calls['POST /api/support/staff/conversations/c1/messages'], {
        'content': 'Nhân viên trả lời',
      });
      expect(
        calls.containsKey('PATCH /api/support/conversations/c1/close'),
        isTrue,
      );
      expect(calls['POST /api/support/chat'], {'message': 'Cách đặt vé?'});
    },
  );
}
