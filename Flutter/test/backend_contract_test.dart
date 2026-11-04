import 'dart:convert';
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/customer_service.dart';

void main() {
  const backend = String.fromEnvironment('BACKEND_ROOT');
  test(
    'Flutter HTTP client interoperates with the real Express router',
    () async {
      dotenv.loadFromString(envString: File('.env').readAsStringSync());
      final server = await Process.start('node', [
        'tool/backend_contract_server.cjs',
        backend,
      ]);
      final errors = StringBuffer();
      final log = server.stderr.transform(utf8.decoder).listen(errors.write);
      ApiService? api;
      try {
        final portLine = await server.stdout
            .transform(utf8.decoder)
            .transform(const LineSplitter())
            .firstWhere((s) => s.startsWith('CONTRACT_PORT='))
            .timeout(const Duration(seconds: 60));
        api = ApiService(
          baseUrl: 'http://127.0.0.1:${portLine.split('=').last}/api',
        );
        final customer = CustomerService(api);
        final cap = await customer.capabilities();
        expect(cap['gateway'], 'vnpay');
        expect(cap['vnpay'], isA<bool>());
        await expectLater(
          customer.createBooking({}),
          throwsA(
            isA<ApiException>()
                .having((e) => e.status, 'status', 401)
                .having((e) => e.code, 'code', 'UNAUTHORIZED'),
          ),
        );
        await expectLater(
          customer.search({'date': '2026-02-30'}),
          throwsA(
            isA<ApiException>()
                .having((e) => e.status, 'status', 400)
                .having((e) => e.code, 'code', 'VALIDATION_ERROR'),
          ),
        );
        await expectLater(
          customer.search({
            'departurePeriods': ['unsupported'],
          }),
          throwsA(isA<ApiException>().having((e) => e.status, 'status', 400)),
        );
        await expectLater(
          customer.lookup('', ''),
          throwsA(isA<ApiException>().having((e) => e.status, 'status', 400)),
        );
        await expectLater(
          api.request('/does-not-exist'),
          throwsA(isA<ApiException>().having((e) => e.status, 'status', 404)),
        );
      } catch (e) {
        fail('$e\n${errors.toString()}');
      } finally {
        api?.close();
        server.kill();
        await server.exitCode.timeout(
          const Duration(seconds: 10),
          onTimeout: () {
            server.kill(ProcessSignal.sigkill);
            return -1;
          },
        );
        await log.cancel();
      }
    },
    timeout: const Timeout(Duration(seconds: 90)),
    skip: backend.isEmpty
        ? 'Supply --dart-define=BACKEND_ROOT=<web backend folder> to test the real web router.'
        : false,
  );
}
