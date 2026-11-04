// Read-only smoke check against API_BASE_URL in the current .env.
// Run: flutter test tool/check_api_test.dart
import 'dart:io';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:datvexe/config/config_api.dart';
import 'package:datvexe/services/api_service.dart';
import 'package:datvexe/services/customer_service.dart';

void main() {
  test(
    'Configured API is reachable and returns the web JSON contract',
    () async {
      dotenv.loadFromString(envString: File('.env').readAsStringSync());
      ApiConfig.validate();
      final client = ApiService();
      try {
        final customer = CustomerService(client);
        final cities = await customer.cities();
        expect(cities.every((city) => city is String), isTrue);
        final capabilities = await customer.capabilities();
        expect(capabilities['gateway'], 'vnpay');
        expect(capabilities['vnpay'], isA<bool>());
        // Only a count is printed; no account or payment data.
        // ignore: avoid_print
        print('Connected to ${client.baseUrl}; cities=${cities.length}');
      } finally {
        client.close();
      }
    },
  );
}
